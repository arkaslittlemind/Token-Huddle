// Instances: the user's own list of cards.
//
// An instance is one account of one provider:
//   { key, provider, label, enabled, alerts, options }
// The list is saved in settings and its order is the order of the cards.
// The first card of a provider has key === provider id and uses the tool's
// default folder; further accounts get their own key and an options.home.
// Nothing here imports Electron, so all of it runs under plain `node --test`.

const crypto = require('node:crypto');
const registry = require('./providers');
const demo = require('./providers/demo');
const { clampPercent } = require('./providers/util');

const STATES = new Set(['ok', 'stale', 'error', 'missing']);
const SOURCES = new Set(['live', 'local', 'estimated']);
const KEY = /^[a-z0-9][a-z0-9-]{0,40}$/;

/** One cache object per instance key, kept for the life of the process. */
const caches = new Map();

function cacheFor(key) {
  if (!caches.has(key)) caches.set(key, {});
  return caches.get(key);
}

const displayName = (provider, instance) => (instance.label ? `${provider.name} · ${instance.label}` : provider.name);

/** Drop saved entries that no longer make sense; keep the user's order. */
function sanitize(saved, providers = registry.providers) {
  const known = new Set(providers.map((p) => p.id));
  const keys = new Set();
  const out = [];
  for (const item of Array.isArray(saved) ? saved : []) {
    if (!item || !known.has(item.provider)) continue;
    const key = typeof item.key === 'string' && KEY.test(item.key) ? item.key : item.provider;
    if (keys.has(key)) continue;
    keys.add(key);
    out.push({
      key,
      provider: item.provider,
      label: typeof item.label === 'string' && item.label ? item.label : null,
      enabled: item.enabled !== false,
      alerts: item.alerts !== false,
      options: item.options && typeof item.options === 'object' ? item.options : {},
    });
  }
  return out;
}

/**
 * Bring the saved list up to date with this machine: every provider that has
 * no card yet is probed, and gets a default card if its tool is found.
 */
async function discover(saved, providers = registry.providers) {
  const instances = sanitize(saved, providers);
  const detected = {};
  for (const provider of providers) {
    const has = instances.some((i) => i.provider === provider.id);
    try {
      detected[provider.id] = has || Boolean(await provider.detect({}));
    } catch {
      detected[provider.id] = has;
    }
    if (!has && detected[provider.id]) {
      instances.push({
        key: provider.id,
        provider: provider.id,
        label: null,
        enabled: true,
        alerts: true,
        options: {},
      });
    }
  }
  return { instances, detected };
}

/**
 * Add another account of a provider, kept in its own folder. The folder is
 * checked first: nothing is saved unless the provider finds its data there.
 */
async function addAccount(instances, { provider: id, label, home }, lookup = registry.get) {
  const provider = lookup(id);
  if (!provider) throw new Error('Unknown provider');
  const name = String(label || '')
    .trim()
    .slice(0, 30);
  if (!name) throw new Error('Give this account a name');
  if (!home) throw new Error('Choose the folder this account keeps its data in');
  if (instances.some((i) => i.provider === id && i.options.home === home)) {
    throw new Error('That folder is already on the list');
  }
  if (!(await provider.detect({ home }))) throw new Error(`No ${provider.name} data found in that folder`);
  const key = `${id}-${crypto.randomBytes(3).toString('hex')}`;
  return [...instances, { key, provider: id, label: name, enabled: true, alerts: true, options: { home } }];
}

/** Only added accounts can be removed; a default card would just be found again. */
function removeAccount(instances, key) {
  return instances.filter((i) => i.key !== key || i.key === i.provider);
}

function move(instances, key, direction) {
  const from = instances.findIndex((i) => i.key === key);
  const to = from + (direction < 0 ? -1 : 1);
  if (from < 0 || to < 0 || to >= instances.length) return instances;
  const next = [...instances];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Make any provider output safe for the widget to draw. */
function normalize(reading, provider, instance) {
  const r = reading && typeof reading === 'object' ? reading : { state: 'error', message: 'Provider returned nothing' };
  const windows = (Array.isArray(r.windows) ? r.windows : [])
    .filter((w) => w && finite(w.usedPercent) !== null)
    .map((w, index) => ({
      id: String(w.id ?? index),
      label: String(w.label || 'Usage'),
      short: String(w.short || ''),
      windowMs: finite(w.windowMs),
      usedPercent: clampPercent(w.usedPercent),
      resetsAt: finite(w.resetsAt),
      rolledOver: Boolean(w.rolledOver),
    }));
  const stats = (Array.isArray(r.stats) ? r.stats : [])
    .filter((s) => s && s.label != null && s.value != null)
    .map((s) => ({ label: String(s.label), value: String(s.value) }));
  const spark = Array.isArray(r.spark) ? r.spark.map((n) => Math.max(0, finite(n) || 0)) : [];

  return {
    key: instance.key,
    id: provider.id,
    name: displayName(provider, instance),
    accent: provider.accent || '#888888',
    state: STATES.has(r.state) ? r.state : 'error',
    source: SOURCES.has(r.source) ? r.source : null,
    via: r.via ? String(r.via) : '',
    plan: r.plan ? String(r.plan) : '',
    updatedAt: finite(r.updatedAt),
    quotaUpdatedAt: finite(r.quotaUpdatedAt),
    quotaState: STATES.has(r.quotaState) ? r.quotaState : null,
    message: r.message ? String(r.message) : '',
    windows,
    stats,
    spark,
  };
}

/** Read every enabled card. One failing never takes the others down. */
async function collect({
  instances = [],
  dataDir,
  demoMode = false,
  localOnly = false,
  force = false,
  now = Date.now(),
  lookup = registry.get,
} = {}) {
  if (demoMode) return demo.read();
  const enabled = instances.filter((instance) => instance.enabled && lookup(instance.provider));
  return Promise.all(
    enabled.map(async (instance) => {
      const provider = lookup(instance.provider);
      let reading;
      try {
        reading = await provider.read({
          options: instance.options,
          key: instance.key,
          dataDir,
          cache: cacheFor(instance.key),
          localOnly,
          force,
          now,
        });
      } catch (error) {
        reading = { state: 'error', message: String(error?.message || error) };
      }
      return normalize(reading, provider, instance);
    })
  );
}

/** Everything the settings window needs to draw the list. */
async function describe({ instances = [], dataDir, lookup = registry.get, providers = registry.providers } = {}) {
  const cards = await Promise.all(
    instances
      .filter((instance) => lookup(instance.provider))
      .map(async (instance) => {
        const provider = lookup(instance.provider);
        let connection = null;
        if (provider.connection) {
          try {
            connection = await provider.connection.status({ options: instance.options, key: instance.key, dataDir });
          } catch (error) {
            connection = { state: 'error', detail: String(error?.message || error) };
          }
        }
        return {
          key: instance.key,
          provider: provider.id,
          name: displayName(provider, instance),
          accent: provider.accent || '#888888',
          enabled: instance.enabled,
          alerts: instance.alerts !== false,
          removable: instance.key !== instance.provider,
          home: instance.options.home || '',
          connection,
        };
      })
  );
  return { cards, providers: providers.map((p) => ({ id: p.id, name: p.name })) };
}

/**
 * The first-run summary: every supported tool, found or not, with where its
 * numbers come from. `detected` is discover()'s map; `cards` is describe()'s
 * list, and each tool's default card is passed through for its connection.
 */
function welcome({ providers = registry.providers, detected = {}, cards = [] } = {}) {
  return {
    tools: providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      accent: provider.accent || '#888888',
      found: detected[provider.id] === true,
      about: typeof provider.about === 'string' ? provider.about : '',
      card: cards.find((card) => card.key === provider.id) || null,
    })),
  };
}

module.exports = { sanitize, discover, addAccount, removeAccount, move, normalize, collect, describe, welcome };
