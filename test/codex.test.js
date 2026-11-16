const test = require('node:test');
const { after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const codex = require('../src/main/providers/codex');

const FIXTURES = path.join(__dirname, 'fixtures');
const PRIMARY_RESET = 1794696202 * 1000;
const SECONDARY_RESET = 1794780664 * 1000;
const NOW = Date.parse('2026-11-14T18:00:00.000Z');

const temporary = [];

after(() => {
  for (const dir of temporary) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Could not remove ${dir}: ${error.message}`);
    }
  }
});

/** A throwaway Codex home containing the given session files, oldest first. Removed when this file's tests finish. */
function makeHome(files = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'huddle-codex-'));
  temporary.push(home);
  const day = path.join(home, 'sessions', '2026', '11', '14');
  fs.mkdirSync(day, { recursive: true });
  let age = Object.keys(files).length;
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(day, name);
    fs.writeFileSync(file, content);
    const time = new Date(NOW - age-- * 60000);
    fs.utimesSync(file, time, time);
  }
  return home;
}

const rollout = fs.readFileSync(path.join(FIXTURES, 'codex-rollout.jsonl'), 'utf8');

test('reads the newest rate-limit snapshot from a session log', async () => {
  const home = makeHome({ 'rollout-a.jsonl': rollout });
  const reading = await codex.read({ options: { home }, localOnly: true, now: NOW });

  assert.equal(reading.state, 'ok');
  assert.equal(reading.source, 'local');
  assert.equal(reading.plan, 'Plus');
  assert.equal(reading.updatedAt, Date.parse('2026-11-14T17:58:51.224Z'));
  assert.deepEqual(
    reading.windows.map((w) => [w.label, w.short, w.usedPercent, w.resetsAt]),
    [
      ['Session', '5h', 8, PRIMARY_RESET],
      ['Weekly', '7d', 42, SECONDARY_RESET],
    ]
  );
});

test('skips a newer session that has no snapshot yet', async () => {
  const home = makeHome({
    'rollout-a.jsonl': rollout,
    'rollout-b.jsonl': '{"timestamp":"2026-11-14T17:59:30.000Z","type":"session_meta","payload":{}}\n',
  });
  const reading = await codex.read({ options: { home }, localOnly: true, now: NOW });
  assert.equal(reading.windows[0].usedPercent, 8);
});

test('a window past its reset time reads as empty', async () => {
  const home = makeHome({ 'rollout-a.jsonl': rollout });
  const reading = await codex.read({ options: { home }, localOnly: true, now: PRIMARY_RESET + 1000 });
  assert.equal(reading.windows[0].usedPercent, 0);
  assert.equal(reading.windows[0].rolledOver, true);
  assert.equal(reading.windows[1].usedPercent, 42);
});

test('survives a damaged log line', async () => {
  const home = makeHome({ 'rollout-a.jsonl': `${rollout}{"payload":{"rate_limits":{"primary":\n` });
  const reading = await codex.read({ options: { home }, localOnly: true, now: NOW });
  assert.equal(reading.windows[0].usedPercent, 8);
});

test('reports missing data without throwing', async () => {
  const empty = await codex.read({ options: { home: makeHome() }, localOnly: true, now: NOW });
  assert.equal(empty.state, 'missing');
  assert.match(empty.message, /No usage recorded/);

  const absent = path.join(os.tmpdir(), 'huddle-codex-does-not-exist');
  const none = await codex.read({ options: { home: absent }, localOnly: true, now: NOW });
  assert.equal(none.state, 'missing');
  assert.match(none.message, /not found/);
  assert.equal(await codex.detect({ home: absent }), false);
});

// A stand-in for `codex app-server` that answers with a recorded response.
const fakeCodex = (mode = '') => `node "${path.join(FIXTURES, 'fake-codex.js')}" ${mode}`;

test('asks the codex program for live limits', async () => {
  const home = makeHome({ 'rollout-a.jsonl': rollout });
  const cache = {};
  const reading = await codex.read({ options: { home, command: fakeCodex() }, cache, now: NOW });

  assert.equal(reading.state, 'ok');
  assert.equal(reading.source, 'live');
  assert.equal(reading.via, 'Codex');
  assert.equal(reading.plan, 'Plus');
  assert.equal(reading.updatedAt, NOW);
  assert.deepEqual(
    reading.windows.map((w) => [w.short, w.usedPercent, w.resetsAt]),
    [
      ['5h', 21, 1794696203 * 1000],
      ['7d', 44, SECONDARY_RESET],
    ]
  );

  // Inside the cache time the program is not started again: a broken command goes unnoticed.
  const again = await codex.read({ options: { home, command: fakeCodex('fail') }, cache, now: NOW + 60000 });
  assert.equal(again.source, 'live');
});

test('falls back to the session logs when codex cannot answer', async () => {
  const home = makeHome({ 'rollout-a.jsonl': rollout });
  for (const command of [fakeCodex('fail'), fakeCodex('error'), 'token-huddle-no-such-program app-server']) {
    const reading = await codex.read({ options: { home, command }, cache: {}, now: NOW });
    assert.equal(reading.source, 'local', command);
    assert.equal(reading.via, 'Codex session logs');
    assert.equal(reading.windows[0].usedPercent, 8);
  }
});

test('local-only mode never starts the codex program', async () => {
  const home = makeHome({ 'rollout-a.jsonl': rollout });
  const reading = await codex.read({ options: { home, command: fakeCodex() }, cache: {}, localOnly: true, now: NOW });
  assert.equal(reading.source, 'local');
});

test('a plan with a single window yields a single bar', () => {
  const windows = codex.parseRateLimits({
    primary: { used_percent: 30, window_minutes: 10080, resets_at: 1794780664 },
  });
  assert.equal(windows.length, 1);
  assert.equal(windows[0].label, 'Weekly');
});

test('a live reading newer than the last turn is shown as stale, with a next step, when a later ask fails', async () => {
  const home = makeHome({ 'rollout-a.jsonl': rollout });
  const cache = {};
  const first = await codex.read({ options: { home, command: fakeCodex() }, cache, now: NOW });
  assert.equal(first.state, 'ok');

  // Past the 5 minute cache, the program fails: the older live reading is kept but marked stale.
  const later = await codex.read({ options: { home, command: fakeCodex('fail') }, cache, now: NOW + 6 * 60000 });
  assert.equal(later.state, 'stale');
  assert.match(later.message, /Press Refresh to try again/);
});

test('in local-only mode a kept live reading says so instead of asking for a refresh', async () => {
  const home = makeHome({ 'rollout-a.jsonl': rollout });
  const cache = {};
  await codex.read({ options: { home, command: fakeCodex() }, cache, now: NOW });

  const later = await codex.read({ options: { home }, cache, localOnly: true, now: NOW + 60000 });
  assert.equal(later.state, 'stale');
  assert.match(later.message, /Local files only is on/);
  assert.doesNotMatch(later.message, /Press Refresh/);
});

test('an added account whose folder has gone is told to remove it, not to install Codex', async () => {
  const absent = path.join(os.tmpdir(), 'huddle-codex-added-gone');
  const reading = await codex.read({ options: { home: absent }, localOnly: true, now: NOW });
  assert.equal(reading.state, 'missing');
  assert.match(reading.message, /folder was not found.*Remove this card in Settings/);
  assert.doesNotMatch(reading.message, /Install/);
});

test('after a failed ask the next refresh stays stale instead of calling the old reading live', async () => {
  const home = makeHome({ 'rollout-a.jsonl': rollout });
  const cache = {};
  await codex.read({ options: { home, command: fakeCodex() }, cache, now: NOW });

  const failed = await codex.read({ options: { home, command: fakeCodex('fail') }, cache, now: NOW + 6 * 60000 });
  assert.equal(failed.state, 'stale');

  // Inside the cache time the program is not asked again, and the old reading is still marked stale, not ok.
  const again = await codex.read({ options: { home, command: fakeCodex() }, cache, now: NOW + 7 * 60000 });
  assert.equal(again.state, 'stale');

  // Once the cache time has passed, a working program makes it live again.
  const recovered = await codex.read({ options: { home, command: fakeCodex() }, cache, now: NOW + 12 * 60000 });
  assert.equal(recovered.state, 'ok');
  assert.equal(recovered.source, 'live');
});

test('a failed ask with no session log still shows the held live reading as stale, not "no usage"', async () => {
  const home = makeHome();
  const cache = {};
  const first = await codex.read({ options: { home, command: fakeCodex() }, cache, now: NOW });
  assert.equal(first.state, 'ok');

  const failed = await codex.read({ options: { home, command: fakeCodex('fail') }, cache, now: NOW + 6 * 60000 });
  assert.equal(failed.state, 'stale');
  assert.match(failed.message, /last live reading/);
  assert.doesNotMatch(failed.message, /No usage recorded/);
});
