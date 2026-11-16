const test = require('node:test');
const assert = require('node:assert/strict');
const {
  sanitize,
  discover,
  addAccount,
  removeAccount,
  move,
  normalize,
  collect,
  describe,
  welcome,
} = require('../src/main/instances');
const registry = require('../src/main/providers');

const fake = (id, extra = {}) => ({
  id,
  name: id.toUpperCase(),
  accent: '#123456',
  connect: 'auto',
  detect: async () => true,
  read: async () => ({ state: 'ok', source: 'local', windows: [] }),
  ...extra,
});

test('every registered provider meets the contract', () => {
  const ids = new Set();
  for (const provider of registry.providers) {
    assert.match(provider.id, /^[a-z][a-z0-9-]*$/);
    assert.ok(!ids.has(provider.id), `duplicate id ${provider.id}`);
    ids.add(provider.id);
    assert.equal(typeof provider.name, 'string');
    assert.match(provider.accent, /^#[0-9a-f]{6}$/i);
    assert.equal(typeof provider.about, 'string');
    assert.ok(provider.about.trim().length > 0, `${provider.id} has no about text`);
    assert.equal(typeof provider.detect, 'function');
    assert.equal(typeof provider.read, 'function');
    assert.equal(registry.get(provider.id), provider);
  }
});

test('sanitize drops unknown providers and duplicate keys, and fills defaults', () => {
  const providers = [fake('a'), fake('b')];
  const result = sanitize(
    [
      { provider: 'b', enabled: false, alerts: false },
      { provider: 'gone' },
      { key: 'a-work', provider: 'a', label: 'Work', options: { home: '/work' } },
      { key: 'a-work', provider: 'a' },
      null,
    ],
    providers
  );
  assert.deepEqual(result, [
    { key: 'b', provider: 'b', label: null, enabled: false, alerts: false, options: {} },
    { key: 'a-work', provider: 'a', label: 'Work', enabled: true, alerts: true, options: { home: '/work' } },
  ]);
  assert.deepEqual(sanitize(undefined, providers), []);
});

test('discover adds a card for each tool found, once', async () => {
  const providers = [
    fake('a'),
    fake('b', { detect: async () => false }),
    fake('c', {
      detect: async () => {
        throw new Error('probe failed');
      },
    }),
    fake('d'),
  ];
  const first = await discover([{ provider: 'd', enabled: false }], providers);
  assert.deepEqual(
    first.instances.map((i) => [i.key, i.enabled, i.alerts]),
    [
      ['d', false, true],
      ['a', true, true],
    ]
  );
  assert.deepEqual(first.detected, { a: true, b: false, c: false, d: true });

  const second = await discover(first.instances, providers);
  assert.deepEqual(second.instances, first.instances);
});

test('a second account of a provider keeps its own card and state', async () => {
  const provider = fake('a', {
    read: async ({ options, cache }) => {
      cache.reads = (cache.reads || 0) + 1;
      return { state: 'ok', source: 'local', plan: `${options.home}#${cache.reads}`, windows: [] };
    },
  });
  const instances = [
    { key: 'multi-1', provider: 'a', label: null, enabled: true, options: { home: 'one' } },
    { key: 'multi-2', provider: 'a', label: 'Work', enabled: true, options: { home: 'two' } },
  ];
  const lookup = () => provider;
  await collect({ instances, lookup });
  await collect({ instances: [instances[1]], lookup });
  const cards = await collect({ instances, lookup });
  assert.deepEqual(
    cards.map((c) => [c.key, c.name, c.plan]),
    [
      ['multi-1', 'A', 'one#2'],
      ['multi-2', 'A · Work', 'two#3'],
    ]
  );
});

test('collect skips disabled cards and isolates a failing provider', async () => {
  const providers = {
    good: fake('good'),
    bad: fake('bad', {
      read: async () => {
        throw new Error('boom');
      },
    }),
    off: fake('off'),
  };
  const cards = await collect({
    instances: [
      { key: 'bad', provider: 'bad', enabled: true, options: {} },
      { key: 'off', provider: 'off', enabled: false, options: {} },
      { key: 'good', provider: 'good', enabled: true, options: {} },
      { key: 'removed', provider: 'removed', enabled: true, options: {} },
    ],
    lookup: (id) => providers[id],
  });
  assert.deepEqual(
    cards.map((c) => [c.key, c.state, c.message]),
    [
      ['bad', 'error', 'boom'],
      ['good', 'ok', ''],
    ]
  );
});

test('normalize repairs whatever a provider returns', () => {
  const provider = fake('a');
  const instance = { key: 'a', provider: 'a', label: null };

  const messy = normalize(
    {
      state: 'fine',
      source: 'guess',
      updatedAt: 'yesterday',
      windows: [
        { usedPercent: 250, resetsAt: 'soon' },
        { usedPercent: 'lots' },
        null,
        { id: 'w', label: 'Weekly', short: '7d', usedPercent: 40, resetsAt: 5, windowMs: 10 },
      ],
      stats: [{ label: 'Today', value: 12 }, { label: 'x' }, 7],
      spark: [1, -2, 'a'],
    },
    provider,
    instance
  );
  assert.equal(messy.state, 'error');
  assert.equal(messy.source, null);
  assert.equal(messy.updatedAt, null);
  assert.deepEqual(messy.windows, [
    { id: '0', label: 'Usage', short: '', windowMs: null, usedPercent: 100, resetsAt: null, rolledOver: false },
    { id: 'w', label: 'Weekly', short: '7d', windowMs: 10, usedPercent: 40, resetsAt: 5, rolledOver: false },
  ]);
  assert.deepEqual(messy.stats, [{ label: 'Today', value: '12' }]);
  assert.deepEqual(messy.spark, [1, 0, 0]);

  const nothing = normalize(undefined, provider, instance);
  assert.equal(nothing.state, 'error');
  assert.ok(nothing.message.length > 0);
  assert.deepEqual(nothing.windows, []);
  assert.equal(nothing.name, 'A');
  assert.equal(nothing.accent, '#123456');
});

test('the card key and data folder reach the provider', async () => {
  let seen;
  const provider = fake('a', {
    read: async (context) => {
      seen = context;
      return { state: 'ok', source: 'local', via: 'A files', windows: [] };
    },
  });
  const [card] = await collect({
    instances: [{ key: 'a-1f2e3d', provider: 'a', label: 'Work', enabled: true, options: { home: '/work' } }],
    dataDir: '/data',
    lookup: () => provider,
  });
  assert.equal(seen.key, 'a-1f2e3d');
  assert.equal(seen.dataDir, '/data');
  assert.deepEqual(seen.options, { home: '/work' });
  assert.equal(card.via, 'A files');
});

test('a key that is unsafe for a file name is replaced', () => {
  const [item] = sanitize([{ key: '../../evil', provider: 'a' }], [fake('a')]);
  assert.equal(item.key, 'a');
});

test('addAccount checks the folder before saving anything', async () => {
  const provider = fake('a', { detect: async ({ home }) => home === '/good' });
  const lookup = (id) => (id === 'a' ? provider : undefined);
  const start = [{ key: 'a', provider: 'a', label: null, enabled: true, options: {} }];

  await assert.rejects(addAccount(start, { provider: 'nope', label: 'x', home: '/good' }, lookup), /Unknown provider/);
  await assert.rejects(addAccount(start, { provider: 'a', label: ' ', home: '/good' }, lookup), /name/);
  await assert.rejects(addAccount(start, { provider: 'a', label: 'Work' }, lookup), /folder/);
  await assert.rejects(addAccount(start, { provider: 'a', label: 'Work', home: '/bad' }, lookup), /No A data found/);

  const added = await addAccount(start, { provider: 'a', label: '  Work  ', home: '/good' }, lookup);
  assert.equal(added.length, 2);
  assert.match(added[1].key, /^a-[0-9a-f]{6}$/);
  assert.deepEqual(
    { ...added[1], key: 'k' },
    { key: 'k', provider: 'a', label: 'Work', enabled: true, alerts: true, options: { home: '/good' } }
  );
  assert.equal(start.length, 1, 'the original list is not changed');

  await assert.rejects(
    addAccount(added, { provider: 'a', label: 'Again', home: '/good' }, lookup),
    /already on the list/
  );
});

test('only added accounts can be removed', () => {
  const list = [
    { key: 'a', provider: 'a' },
    { key: 'a-123abc', provider: 'a' },
  ];
  assert.deepEqual(removeAccount(list, 'a-123abc'), [list[0]]);
  assert.deepEqual(removeAccount(list, 'a'), list);
});

test('move reorders within the list and ignores impossible moves', () => {
  const list = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];
  const keys = (items) => items.map((i) => i.key).join('');
  assert.equal(keys(move(list, 'c', -1)), 'acb');
  assert.equal(keys(move(list, 'a', 1)), 'bac');
  assert.equal(keys(move(list, 'a', -1)), 'abc');
  assert.equal(keys(move(list, 'c', 1)), 'abc');
  assert.equal(keys(move(list, 'zzz', 1)), 'abc');
});

test('describe lists every card with its connection state', async () => {
  const plain = fake('plain');
  const bridged = fake('bridged', {
    connection: {
      status: async ({ key, dataDir }) => ({
        state: key === 'bridged' ? 'connected' : 'disconnected',
        detail: dataDir,
      }),
    },
  });
  const broken = fake('broken', {
    connection: {
      status: async () => {
        throw new Error('cannot look');
      },
    },
  });
  const providers = [plain, bridged, broken];
  const lookup = (id) => providers.find((p) => p.id === id);
  const state = await describe({
    instances: [
      { key: 'bridged', provider: 'bridged', label: null, enabled: true, options: {} },
      {
        key: 'bridged-0a0a0a',
        provider: 'bridged',
        label: 'Work',
        enabled: false,
        alerts: false,
        options: { home: '/work' },
      },
      { key: 'plain', provider: 'plain', label: null, enabled: true, options: {} },
      { key: 'broken', provider: 'broken', label: null, enabled: true, options: {} },
    ],
    dataDir: '/data',
    lookup,
    providers,
  });
  assert.deepEqual(
    state.cards.map((c) => [c.key, c.name, c.enabled, c.alerts, c.removable, c.home, c.connection?.state ?? null]),
    [
      ['bridged', 'BRIDGED', true, true, false, '', 'connected'],
      ['bridged-0a0a0a', 'BRIDGED · Work', false, false, true, '/work', 'disconnected'],
      ['plain', 'PLAIN', true, true, false, '', null],
      ['broken', 'BROKEN', true, true, false, '', 'error'],
    ]
  );
  assert.deepEqual(state.providers, [
    { id: 'plain', name: 'PLAIN' },
    { id: 'bridged', name: 'BRIDGED' },
    { id: 'broken', name: 'BROKEN' },
  ]);
});

test('welcome lists every provider in registry order, found or not', () => {
  const providers = [fake('a', { about: 'From A.' }), fake('b', { about: 'From B.' })];
  const { tools } = welcome({ providers, detected: { a: true }, cards: [] });
  assert.deepEqual(
    tools.map(({ id, name, accent, found, about, card }) => ({ id, name, accent, found, about, card })),
    [
      { id: 'a', name: 'A', accent: '#123456', found: true, about: 'From A.', card: null },
      { id: 'b', name: 'B', accent: '#123456', found: false, about: 'From B.', card: null },
    ]
  );
});

test('welcome passes the default card through for its connection', () => {
  const providers = [fake('a')];
  const card = { key: 'a', provider: 'a', connection: { state: 'disconnected', detail: '' } };
  const added = { key: 'a-1f2e3d', provider: 'a', connection: { state: 'connected', detail: '' } };
  const { tools } = welcome({ providers, detected: { a: true }, cards: [added, card] });
  assert.equal(tools[0].card, card);
});

test('welcome counts a tool found only through an added account', () => {
  const providers = [fake('a')];
  const added = { key: 'a-1f2e3d', provider: 'a', connection: null };
  const { tools } = welcome({ providers, detected: { a: true }, cards: [added] });
  assert.equal(tools[0].found, true);
  assert.equal(tools[0].card, null);
});

test('welcome treats missing detection as not found and missing about as empty', () => {
  const { tools } = welcome({ providers: [fake('a')] });
  assert.equal(tools[0].found, false);
  assert.equal(tools[0].about, '');
});
