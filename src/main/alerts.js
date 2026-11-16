// Threshold alerts: which usage windows just crossed a user-set level.
// No Electron import, so it stays testable under plain Node; main.js shows the notifications.

const duration = require('../renderer/duration.js');

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const DEFAULT_THRESHOLDS = Object.freeze([80, 95]);
// Providers report a slightly different reset time between readings; a bigger change is a new period.
const RESET_TOLERANCE_MS = 60 * 1000;
const THRESHOLD_ERROR = 'Enter a whole number from 1 to 100';

const isLevel = (n) => Number.isInteger(n) && n >= 1 && n <= 100;
const isTime = (n) => n === null || (typeof n === 'number' && Number.isFinite(n));
const tidy = (levels) => [...new Set(levels)].sort((a, b) => a - b);

/** One or two whole numbers from 1 to 100, ascending; anything else becomes the default. */
function sanitizeThresholds(raw) {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 2 || !raw.every(isLevel)) return [...DEFAULT_THRESHOLDS];
  return tidy(raw);
}

/** Validate the settings form's values (text or numbers). */
function parseThresholds(values) {
  if (!Array.isArray(values) || values.length < 1 || values.length > 2) return { ok: false, error: THRESHOLD_ERROR };
  const levels = values.map((value) => {
    const text = String(value ?? '').trim();
    return /^\d{1,3}$/.test(text) ? Number(text) : NaN;
  });
  if (!levels.every(isLevel)) return { ok: false, error: THRESHOLD_ERROR };
  return { ok: true, thresholds: tidy(levels) };
}

/** The saved record of sent alerts, `{ "<cardKey>/<windowId>": { level, resetsAt } }`, minus anything malformed. */
function sanitizeSent(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [id, entry] of Object.entries(raw)) {
    if (!id.includes('/') || !entry || !isLevel(entry.level) || !isTime(entry.resetsAt)) continue;
    out[id] = { level: entry.level, resetsAt: entry.resetsAt };
  }
  return out;
}

function newPeriod(entry, window) {
  if (window.resetsAt === null) return window.usedPercent < entry.level;
  if (entry.resetsAt === null) return true;
  return Math.abs(window.resetsAt - entry.resetsAt) > RESET_TOLERANCE_MS;
}

/**
 * Compare the latest readings with what was already sent. Returns the
 * notifications to show and the new record; never changes its inputs.
 */
function check({ readings = [], instances = [], thresholds = DEFAULT_THRESHOLDS, sent = {}, now }) {
  const alertsOn = new Map(instances.map((instance) => [instance.key, instance.alerts !== false]));
  const next = {};
  for (const [id, entry] of Object.entries(sent)) {
    if (!alertsOn.has(id.slice(0, id.indexOf('/')))) continue;
    if (entry.resetsAt !== null && entry.resetsAt < now - DAY) continue;
    next[id] = { ...entry };
  }

  const notifications = [];
  for (const reading of readings) {
    if (!alertsOn.get(reading.key)) continue;
    for (const window of reading.windows || []) {
      const id = `${reading.key}/${window.id}`;
      if (window.rolledOver || (next[id] && newPeriod(next[id], window))) {
        delete next[id];
        if (window.rolledOver) continue;
      }

      const level = thresholds.filter((t) => t <= window.usedPercent).pop();
      if (level === undefined || (next[id] && next[id].level >= level)) continue;
      next[id] = { level, resetsAt: window.resetsAt };
      notifications.push({
        key: reading.key,
        windowId: window.id,
        title: `${reading.name} · ${window.label} at ${Math.round(window.usedPercent)}%`,
        body:
          window.resetsAt === null ? `Over ${level}% of this limit` : `Resets in ${duration(window.resetsAt - now)}`,
      });
    }
  }
  return { notifications, sent: next };
}

module.exports = { DEFAULT_THRESHOLDS, sanitizeThresholds, parseThresholds, sanitizeSent, check };
