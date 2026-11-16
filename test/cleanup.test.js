const test = require('node:test');
const { after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const registry = require('../src/main/providers');
const claude = require('../src/main/providers/claude');
const { disconnectAll } = require('../src/main/cleanup');

const temporary = [];

function tempDir(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  temporary.push(dir);
  return dir;
}

after(() => {
  for (const dir of temporary) fs.rmSync(dir, { recursive: true, force: true });
});

const OURS = (dataDir, key) => claude.bridgeCommand(dataDir, key);

/** A throwaway Claude config folder holding `settings` (or none). */
function claudeHome(settings) {
  const home = tempDir('huddle-cleanup-claude-');
  if (settings !== undefined) fs.writeFileSync(path.join(home, 'settings.json'), JSON.stringify(settings, null, 2));
  return home;
}

const readSettings = (home) => fs.readFileSync(path.join(home, 'settings.json'), 'utf8');

test('removes Token Huddle status lines and keeps every other setting', async () => {
  const dataDir = tempDir('huddle-cleanup-data-');
  const home = claudeHome({ theme: 'dark', statusLine: { type: 'command', command: OURS(dataDir, 'claude') } });
  fs.writeFileSync(path.join(dataDir, 'claude-claude.json'), '{}');

  const results = await disconnectAll({
    instances: [{ key: 'claude', provider: 'claude', options: { home } }],
    registry,
    dataDir,
  });

  assert.deepEqual(results, [{ key: 'claude', ok: true }]);
  assert.deepEqual(JSON.parse(readSettings(home)), { theme: 'dark' });
  assert.equal(fs.existsSync(path.join(dataDir, 'claude-claude.json')), false);
});

test("leaves a user's own and a linked status line byte for byte", async () => {
  const dataDir = tempDir('huddle-cleanup-data-');
  const linked = claudeHome({
    statusLine: { type: 'command', command: `${OURS(dataDir, 'claude')} -PassThrough | my-script.sh` },
  });
  const other = claudeHome({ statusLine: { type: 'command', command: 'my-own-status-line.sh' } });
  const before = [readSettings(linked), readSettings(other)];

  const results = await disconnectAll({
    instances: [
      { key: 'claude', provider: 'claude', options: { home: linked } },
      { key: 'claude-2', provider: 'claude', options: { home: other } },
    ],
    registry,
    dataDir,
  });

  assert.ok(results.every((r) => r.ok));
  assert.deepEqual([readSettings(linked), readSettings(other)], before);
});

test('a missing settings.json is fine and is not created', async () => {
  const dataDir = tempDir('huddle-cleanup-data-');
  const home = claudeHome();
  const results = await disconnectAll({
    instances: [{ key: 'claude', provider: 'claude', options: { home } }],
    registry,
    dataDir,
  });
  assert.deepEqual(results, [{ key: 'claude', ok: true }]);
  assert.equal(fs.existsSync(path.join(home, 'settings.json')), false);
});

test('skips providers without a connection and keeps going after a failure', async () => {
  const calls = [];
  const byId = {
    broken: {
      connection: {
        disconnect: async () => {
          throw new Error('boom');
        },
      },
    },
    fine: { connection: { disconnect: async (context) => calls.push(context) } },
    auto: {},
  };
  const fake = {
    providers: ['broken', 'fine', 'auto'].map((id) => ({ id, ...byId[id] })),
    get: (id) => byId[id],
  };

  const results = await disconnectAll({
    instances: [
      { key: 'broken', provider: 'broken', options: {} },
      { key: 'auto', provider: 'auto', options: {} },
      { key: 'gone', provider: 'unknown', options: {} },
      { key: 'fine-2', provider: 'fine', options: { home: 'x' } },
    ],
    registry: fake,
    dataDir: 'D',
  });

  assert.deepEqual(results, [
    { key: 'broken', ok: false, error: 'boom' },
    { key: 'fine-2', ok: true },
  ]);
  assert.deepEqual(calls, [{ options: { home: 'x' }, key: 'fine-2', dataDir: 'D' }]);
});

test('tolerates a missing or malformed instance list', async () => {
  assert.deepEqual(await disconnectAll({ instances: undefined, registry, dataDir: 'D' }), []);
  assert.deepEqual(await disconnectAll({ instances: [null, 'x'], registry, dataDir: 'D' }), []);
});

test('checks saved card keys before any of them becomes a file name', async () => {
  const dataDir = tempDir('huddle-cleanup-data-');
  const outside = path.join(path.dirname(dataDir), `${path.basename(dataDir)}-victim.json`);
  fs.writeFileSync(outside, 'keep me');
  temporary.push(outside);
  const home = claudeHome();
  const results = await disconnectAll({
    // Unchecked, claude-<key>.json would resolve to the file next to dataDir.
    instances: [{ key: `x/../../${path.basename(outside, '.json')}`, provider: 'claude', options: { home } }],
    registry,
    dataDir,
  });
  // An invalid key falls back to the provider id, as on a normal start.
  assert.deepEqual(results, [{ key: 'claude', ok: true }]);
  assert.equal(fs.readFileSync(outside, 'utf8'), 'keep me');
});
