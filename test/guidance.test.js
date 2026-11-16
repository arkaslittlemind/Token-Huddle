const test = require('node:test');
const assert = require('node:assert/strict');
const guidance = require('../src/renderer/guidance');
const claude = require('../src/main/providers/claude');
const codex = require('../src/main/providers/codex');
const opencode = require('../src/main/providers/opencode');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const NOW = Date.UTC(2026, 10, 15, 12);

test('an ok card needs no label or action', () => {
  assert.deepEqual(guidance({ state: 'ok', message: 'ignored' }, NOW), { label: '', action: '' });
});

test('stale shows its age and keeps the provider message as the action', () => {
  const g = guidance(
    { state: 'stale', updatedAt: NOW - 2 * 3600 * 1000, message: 'No longer connected. Reconnect in Settings' },
    NOW
  );
  assert.equal(g.label, 'stale · 2h 0m ago');
  assert.equal(g.action, 'No longer connected. Reconnect in Settings');
});

test('stale without a time or message still says what to do', () => {
  assert.deepEqual(guidance({ state: 'stale' }, NOW), {
    label: 'stale',
    action: 'Showing the last reading. Press Refresh to try again',
  });
});

test('missing is labelled no data and keeps an actionable message', () => {
  const g = guidance({ state: 'missing', message: 'Not connected yet. Open Settings to connect' }, NOW);
  assert.deepEqual(g, { label: 'no data', action: 'Not connected yet. Open Settings to connect' });
});

test('missing without a message falls back to Refresh or Settings', () => {
  assert.match(guidance({ state: 'missing' }, NOW).action, /Refresh.*Settings/);
});

test('an error without a next step gets one; one with a step is left alone', () => {
  assert.equal(
    guidance({ state: 'error', message: 'Codex refused the request' }, NOW).action,
    'Codex refused the request. Press Refresh to try again'
  );
  assert.equal(guidance({ state: 'error', message: 'Reconnect in Settings.' }, NOW).action, 'Reconnect in Settings');
  assert.equal(guidance({ state: 'error' }, NOW).label, 'error');
  assert.match(guidance({ state: 'error' }, NOW).action, /Refresh/);
});

test('any input yields strings and never throws', () => {
  for (const input of [
    undefined,
    null,
    5,
    'x',
    {},
    { state: 'weird', message: 7 },
    { state: 'stale', updatedAt: 'no' },
  ]) {
    const g = guidance(input, NOW);
    assert.equal(typeof g.label, 'string');
    assert.equal(typeof g.action, 'string');
  }
});

test('every missing or error message the providers produce has a next step', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'huddle-guidance-'));
  try {
    const empty = path.join(dir, 'none');
    const reads = [
      await claude.read({ options: { home: empty }, key: 'claude', dataDir: dir, platform: 'win32' }),
      await claude.read({ options: { home: empty }, key: 'claude', dataDir: null, platform: 'win32' }),
      await codex.read({ options: { home: empty }, key: 'codex', dataDir: dir, cache: {}, localOnly: true, now: NOW }),
      await opencode.read({ options: { home: empty }, now: NOW }),
    ];
    for (const reading of reads) {
      assert.notEqual(reading.state, 'ok');
      const { action } = guidance(reading, NOW);
      assert.match(
        action,
        /Settings|Refresh|Restart|Install|Update|Send|Run|Connect/i,
        `no next step: ${reading.message}`
      );
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a missing default Codex card advises installing Codex', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'huddle-guidance-'));
  const previous = process.env.CODEX_HOME;
  t.after(() => {
    if (previous === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previous;
    fs.rmSync(dir, { recursive: true, force: true });
  });
  process.env.CODEX_HOME = path.join(dir, 'missing');

  const reading = await codex.read({ options: {}, localOnly: true, now: NOW });
  assert.equal(reading.state, 'missing');
  assert.match(reading.message, /Install Codex/);
  assert.deepEqual(guidance(reading, NOW), { label: 'no data', action: reading.message });
});

test('a missing default OpenCode card advises installing OpenCode', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'huddle-guidance-'));
  const previous = process.env.XDG_DATA_HOME;
  t.after(() => {
    if (previous === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = previous;
    fs.rmSync(dir, { recursive: true, force: true });
  });
  process.env.XDG_DATA_HOME = path.join(dir, 'missing');

  const reading = await opencode.read({ options: {}, now: NOW });
  assert.equal(reading.state, 'missing');
  assert.match(reading.message, /Install OpenCode/);
  assert.deepEqual(guidance(reading, NOW), { label: 'no data', action: reading.message });
});

test('every known provider message already carries its next step', () => {
  const known = [
    'Not connected yet. Open Settings to connect',
    'Linked. Send a message in Claude Code in a terminal to get the first reading',
    'Connected. Send a message in Claude Code to get the first reading',
    'You have your own status line. Open Settings to add Token Huddle to it',
    'No longer connected. Reconnect in Settings',
    'Token Huddle has no data folder. Restart the app',
    'Claude Code settings.json could not be read. Check it is valid JSON, then try again.',
    'Codex not found. Install Codex, or hide this card in Settings',
    'No usage recorded yet. Run a Codex turn',
    'Codex did not answer just now. Showing the last live reading. Press Refresh to try again',
    'Local files only is on. Showing the last live reading. Turn it off in the options menu to ask Codex again',
    'OpenCode not found. Install OpenCode, or hide this card in Settings',
    'This build of Token Huddle cannot read OpenCode data. Update Token Huddle',
    'Could not read the OpenCode database. Press Refresh, or restart OpenCode if it keeps failing',
  ];
  for (const message of known) {
    assert.equal(guidance({ state: 'error', message }, NOW).action, message.replace(/\.$/, ''), message);
  }
});

test('a raw thrown message gets a next step even when it contains a common word', () => {
  const g = guidance({ state: 'error', message: "Cannot read properties of undefined (reading 'run')" }, NOW);
  assert.match(g.action, /Press Refresh to try again$/);
});

test('an unsupported system tells the user what to do with the card', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'huddle-guidance-'));
  try {
    const reading = await claude.read({ options: { home: dir }, key: 'claude', dataDir: dir, platform: 'linux' });
    assert.match(guidance(reading, NOW).action, /Hide this card in Settings/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('ago is shared: just now inside 90 seconds, then a duration', () => {
  assert.equal(guidance.ago(NOW - 30 * 1000, NOW), 'just now');
  assert.equal(guidance.ago(NOW - 2 * 3600 * 1000, NOW), '2h 0m ago');
});

test('level matches the widget colour states', () => {
  assert.equal(guidance.level(0), '');
  assert.equal(guidance.level(69.9), '');
  assert.equal(guidance.level(70), 'warn');
  assert.equal(guidance.level(89), 'warn');
  assert.equal(guidance.level(90), 'crit');
  assert.equal(guidance.level(100), 'crit');
});

test('windowText says usage, level, pace and reset in words', () => {
  const w = { label: 'Session', usedPercent: 74.2, windowMs: 5 * 3600 * 1000, resetsAt: NOW + 2 * 3600 * 1000 };
  assert.deepEqual(guidance.windowText(w, NOW), {
    name: 'Session usage',
    valueText: '74% used, warning, 60% of the window elapsed, resets in 2h 0m',
  });
  assert.match(guidance.windowText({ ...w, usedPercent: 95 }, NOW).valueText, /^95% used, critical,/);
  assert.match(guidance.windowText({ ...w, usedPercent: 10 }, NOW).valueText, /^10% used, 60%/);
});

test('windowText handles a rolled-over window, no reset time and partial input', () => {
  assert.equal(
    guidance.windowText({ label: 'Weekly', usedPercent: 0, rolledOver: true }, NOW).valueText,
    '0% used, window reset'
  );
  assert.equal(guidance.windowText({ label: 'Weekly', usedPercent: 40 }, NOW).valueText, '40% used');
});

test('windowText names a window by its label, once', () => {
  assert.equal(guidance.windowText({}, NOW).name, 'Usage');
  assert.equal(guidance.windowText({ label: 'Usage', usedPercent: 5 }, NOW).name, 'Usage');
  assert.equal(guidance.windowText({ label: 'Weekly', usedPercent: 5 }, NOW).name, 'Weekly usage');
});

test('levelWord speaks the colour state', () => {
  assert.equal(guidance.levelWord(10), '');
  assert.equal(guidance.levelWord(70), 'warning');
  assert.equal(guidance.levelWord(95), 'critical');
});

test('windowText gives exact words for partial and odd input', () => {
  assert.deepEqual(guidance.windowText({}, NOW), { name: 'Usage', valueText: '0% used' });
  assert.deepEqual(guidance.windowText(undefined, NOW), { name: 'Usage', valueText: '0% used' });
  assert.equal(guidance.windowText({ label: 'Weekly', usedPercent: NaN }, NOW).valueText, '0% used');
  assert.equal(guidance.windowText({ usedPercent: 'x' }, NOW).valueText, '0% used');
  // No window length: no pace clause, but the reset time still shows.
  assert.equal(
    guidance.windowText({ usedPercent: 10, windowMs: 0, resetsAt: NOW + 3600 * 1000 }, NOW).valueText,
    '10% used, resets in 1h 0m'
  );
  // A reset time already past, without rolledOver: the window is all elapsed and the reset reads 1m (the shortest span).
  assert.equal(
    guidance.windowText({ usedPercent: 100, windowMs: 3600 * 1000, resetsAt: NOW - 60 * 1000 }, NOW).valueText,
    '100% used, critical, 100% of the window elapsed, resets in 1m'
  );
});

test('elapsed is the share of the window already passed, or null without a length or reset time', () => {
  const hour = 3600 * 1000;
  assert.equal(guidance.elapsed({ windowMs: 5 * hour, resetsAt: NOW + hour }, NOW), 0.8);
  assert.equal(guidance.elapsed({ windowMs: hour, resetsAt: NOW - hour }, NOW), 1);
  assert.equal(guidance.elapsed({ windowMs: hour, resetsAt: NOW + 2 * hour }, NOW), 0);
  assert.equal(guidance.elapsed({ windowMs: 0, resetsAt: NOW + hour }, NOW), null);
  assert.equal(guidance.elapsed({ windowMs: hour }, NOW), null);
  assert.equal(guidance.elapsed({ windowMs: hour, resetsAt: NOW + hour, rolledOver: true }, NOW), null);
  assert.equal(guidance.elapsed(undefined, NOW), null);
});

test('sparkText speaks short numbers, oldest first', () => {
  assert.equal(
    guidance.sparkText([120, 1523442, 41200, 0]),
    'Tokens per day, last 7 days, oldest first: 120, 1.5M, 41.2k, 0'
  );
  assert.equal(guidance.sparkText(undefined), 'Tokens per day, last 7 days, oldest first: ');
  assert.match(guidance.sparkText([NaN, 5]), /: 0, 5$/);
});
