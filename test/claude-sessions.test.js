const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { readSessions, metadata } = require('../src/main/providers/claude-sessions');
const claude = require('../src/main/providers/claude');
const now = Date.parse('2026-11-17T12:00:00Z');
const record = (
  id,
  time = now,
  usage = { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 20, cache_read_input_tokens: 30 }
) => ({ type: 'assistant', timestamp: new Date(time).toISOString(), requestId: 'request', message: { id, usage } });
async function setup(t) {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'huddle-sessions-'));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const dir = path.join(home, 'projects', 'project');
  await fs.mkdir(dir, { recursive: true });
  return { home, dir };
}
const write = (file, rows) => fs.writeFile(file, rows.map((row) => JSON.stringify(row)).join('\n') + '\n');

test('metadata counts cache fields once and rejects invalid values and missing identity', () => {
  assert.equal(metadata(record('m')).tokens, 65);
  assert.equal(metadata(record('m', now, { input_tokens: -1 })), null);
  assert.equal(metadata(record('m', now, { input_tokens: '2' })), null);
  assert.equal(metadata(record('m', now, { output_tokens: 5 })).tokens, 5);
  for (const key of ['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens']) {
    assert.equal(metadata(record('m', now, { [key]: null })), null);
  }
  assert.equal(metadata(record('')), null);
});

test('deduplicates copies and subagent content blocks, then handles replacement and deletion', async (t) => {
  const { home, dir } = await setup(t);
  const file = path.join(dir, 'session.jsonl');
  const sub = path.join(dir, 'subagents');
  await fs.mkdir(sub);
  await write(file, [record('m'), record('m')]);
  await write(path.join(sub, 'agent.jsonl'), [record('m'), record('n')]);
  const cache = {};
  let result = await readSessions({ home, cache, now });
  assert.equal(result.stats[0].value, '130');
  await write(file, [record('new', now, { input_tokens: 7 })]);
  await fs.unlink(path.join(sub, 'agent.jsonl'));
  result = await readSessions({ home, cache, now });
  assert.equal(result.stats[0].value, '7');
  assert.equal((await readSessions({ home, cache, now })).stats[0].value, '7');
});

test('malformed usage containers are rejected without hiding valid records', async (t) => {
  const { home, dir } = await setup(t);
  const file = path.join(dir, 'session.jsonl');
  for (const usage of [true, false, 1, 0, 'invalid', '', [], [1], null]) {
    assert.equal(metadata(record('bad', now, usage)), null);
    await write(file, [record('bad', now, usage)]);
    const invalid = await readSessions({ home, now });
    assert.equal(invalid.state, 'error');
    assert.equal(invalid.stats, undefined);
    await write(file, [record('bad', now, usage), record('good')]);
    const mixed = await readSessions({ home, now });
    assert.equal(mixed.state, 'stale');
    assert.equal(mixed.stats[0].value, '65');
  }
  assert.equal(metadata(record('empty', now, {})).tokens, 0);
  await write(file, [record('empty', now, {})]);
  const empty = await readSessions({ home, now });
  assert.equal(empty.state, 'ok');
  assert.equal(empty.stats[0].value, '0');
});

test('date windows exclude future records and older activity; account caches stay isolated', async (t) => {
  const { home, dir } = await setup(t);
  await write(path.join(dir, 'session.jsonl'), [record('old', now - 8 * 86400000), record('future', now + 1000)]);
  const cache = {};
  const result = await readSessions({ home, cache, now });
  assert.deepEqual(
    result.stats.map((s) => s.value),
    ['0', '0', '65']
  );
  const other = await setup(t);
  await write(path.join(other.dir, 'session.jsonl'), [record('m')]);
  assert.equal((await readSessions({ home: other.home, cache, now })).stats[0].value, '65');
});

test('partial writes preserve valid records; malformed files never become zero usage', async (t) => {
  const { home, dir } = await setup(t);
  const file = path.join(dir, 'session.jsonl');
  await write(file, [record('m')]);
  await fs.appendFile(file, '{incomplete');
  const result = await readSessions({ home, now });
  assert.equal(result.stats[0].value, '65');
  assert.equal(result.state, 'stale');
  await fs.writeFile(file, '{broken');
  assert.equal((await readSessions({ home, now })).state, 'error');
});

test('automatic totals work without a bridge, including local-only mode', async (t) => {
  const { home, dir } = await setup(t);
  await write(path.join(dir, 'session.jsonl'), [record('m')]);
  const result = await claude.read({ options: { home }, dataDir: home, now, localOnly: true });
  assert.equal(result.state, 'ok');
  assert.equal(result.stats[0].value, '65');
  assert.deepEqual(result.windows, []);
});

test('invalid usage does not look like zero activity and latest duplicate wins', async (t) => {
  const { home, dir } = await setup(t);
  const file = path.join(dir, 'session.jsonl');
  await write(file, [record('m', now, { input_tokens: -1 })]);
  assert.equal((await readSessions({ home, now })).state, 'error');
  await write(file, [record('m', now, { input_tokens: null, output_tokens: 5 })]);
  assert.equal((await readSessions({ home, now })).state, 'error');
  await write(file, [record('m', now - 1000), record('m', now, { output_tokens: 12 })]);
  assert.equal((await readSessions({ home, now })).stats[0].value, '12');
});

test('empty files report no activity, missing folders offer guidance, and invalid roots report errors', async (t) => {
  const { home, dir } = await setup(t);
  await fs.writeFile(path.join(dir, 'empty.jsonl'), '');
  assert.equal((await readSessions({ home, now })).stats[0].value, '0');
  assert.equal((await readSessions({ home: path.join(home, 'missing'), now })).state, 'missing');
  await fs.rm(path.join(home, 'projects'), { recursive: true });
  await fs.writeFile(path.join(home, 'projects'), 'invalid directory');
  assert.equal((await readSessions({ home, now })).state, 'error');
});

test('local midnight and rolling window boundaries are inclusive', async (t) => {
  const { home, dir } = await setup(t);
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  await write(path.join(dir, 'session.jsonl'), [
    record('today', midnight.getTime()),
    record('week', now - 7 * 86400000),
    record('month', now - 30 * 86400000),
    record('expired', now - 31 * 86400000),
  ]);
  assert.deepEqual(
    (await readSessions({ home, now })).stats.map((s) => s.value),
    ['65', '130', '195']
  );
});

test('file links are ignored', async (t) => {
  const { home, dir } = await setup(t);
  const outside = path.join(home, 'outside.jsonl');
  await write(outside, [record('outside')]);
  try {
    await fs.symlink(outside, path.join(dir, 'link.jsonl'));
  } catch (error) {
    if (error.code === 'EPERM') return t.skip('Windows does not permit creating symlinks');
    throw error;
  }
  assert.equal((await readSessions({ home, now })).stats, undefined);
});

test('quota windows and local totals retain independent ages and survive each other failing', async (t) => {
  const { home, dir } = await setup(t);
  await write(path.join(dir, 'session.jsonl'), [record('m')]);
  const snapshot = {
    captured_at: (now - 60000) / 1000,
    rate_limits: { five_hour: { used_percentage: 25, resets_at: (now + 3600000) / 1000 } },
  };
  await fs.writeFile(claude.outputPath(home, 'claude'), JSON.stringify(snapshot));
  let result = await claude.read({ options: { home }, dataDir: home, now });
  assert.equal(result.stats[0].value, '65');
  assert.equal(result.updatedAt, now);
  assert.equal(result.quotaUpdatedAt, now - 60000);
  assert.equal(result.quotaState, 'stale');
  assert.equal(result.windows[0].usedPercent, 25);
  await fs.writeFile(path.join(dir, 'session.jsonl'), '{bad');
  result = await claude.read({ options: { home }, dataDir: home, now });
  assert.equal(result.windows[0].usedPercent, 25);
  assert.match(result.message, /Could not read Claude usage/);
  await write(path.join(dir, 'session.jsonl'), [record('m')]);
  await fs.writeFile(path.join(home, 'settings.json'), '{bad');
  result = await claude.read({ options: { home }, dataDir: home, now });
  assert.equal(result.stats[0].value, '65');
});

test('unreadable session roots give an actionable error', async (t) => {
  const { home } = await setup(t);
  t.mock.method(fs, 'readdir', async () => {
    const error = new Error('denied');
    error.code = 'EACCES';
    throw error;
  });
  const result = await readSessions({ home, now });
  assert.equal(result.state, 'error');
  assert.match(result.message, /Press Refresh/);
});
