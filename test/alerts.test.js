const test = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_THRESHOLDS, sanitizeThresholds, parseThresholds, sanitizeSent, check } = require('../src/main/alerts');

const NOW = Date.UTC(2026, 10, 15, 12, 0, 0);
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const card = (key, alerts) => ({ key, provider: key, label: null, enabled: true, alerts, options: {} });

function reading(usedPercent, extra = {}) {
  return {
    key: 'claude',
    name: 'Claude Code',
    windows: [
      { id: 'five_hour', label: 'Session', usedPercent, resetsAt: NOW + 2 * HOUR, rolledOver: false, ...extra },
    ],
  };
}

function run(readings, sent = {}, options = {}) {
  return check({
    readings: Array.isArray(readings) ? readings : [readings],
    instances: options.instances || [card('claude')],
    thresholds: options.thresholds || [80, 95],
    sent,
    now: options.now ?? NOW,
  });
}

test('sanitizeThresholds keeps one or two whole numbers from 1 to 100, sorted', () => {
  assert.deepEqual(DEFAULT_THRESHOLDS, [80, 95]);
  assert.deepEqual(sanitizeThresholds([95, 80]), [80, 95]);
  assert.deepEqual(sanitizeThresholds([90, 90]), [90]);
  assert.deepEqual(sanitizeThresholds([100]), [100]);
  for (const bad of [undefined, null, 'x', [], [0, 50], [50, 101], [50.5], ['80'], [10, 20, 30], {}]) {
    assert.deepEqual(sanitizeThresholds(bad), [80, 95], JSON.stringify(bad));
  }
  assert.notEqual(sanitizeThresholds(undefined), DEFAULT_THRESHOLDS, 'returns a copy');
});

test('parseThresholds accepts form text and explains a bad value', () => {
  assert.deepEqual(parseThresholds(['85', ' 70 ']), { ok: true, thresholds: [70, 85] });
  assert.deepEqual(parseThresholds([60, 60]), { ok: true, thresholds: [60] });
  for (const bad of [
    ['', '90'],
    ['80', '101'],
    ['0', '90'],
    ['8.5', '90'],
    ['abc', '90'],
    [],
    ['1', '2', '3'],
    'nope',
  ]) {
    const result = parseThresholds(bad);
    assert.equal(result.ok, false, JSON.stringify(bad));
    assert.equal(result.error, 'Enter a whole number from 1 to 100');
  }
});

test('sanitizeSent drops malformed entries', () => {
  const clean = sanitizeSent({
    'claude/five_hour': { level: 80, resetsAt: NOW },
    'codex/primary': { level: 95, resetsAt: null },
    'no-slash': { level: 80, resetsAt: NOW },
    'claude/bad-level': { level: 'high', resetsAt: NOW },
    'claude/bad-reset': { level: 80, resetsAt: 'soon' },
    'claude/null': null,
  });
  assert.deepEqual(clean, {
    'claude/five_hour': { level: 80, resetsAt: NOW },
    'codex/primary': { level: 95, resetsAt: null },
  });
  assert.deepEqual(sanitizeSent(null), {});
  assert.deepEqual(sanitizeSent([1, 2]), {});
});

test('a first crossing notifies once, and the next reading does not repeat it', () => {
  const below = run(reading(79.9));
  assert.deepEqual(below.notifications, []);
  assert.deepEqual(below.sent, {});

  const first = run(reading(81.4));
  assert.deepEqual(first.notifications, [
    { key: 'claude', windowId: 'five_hour', title: 'Claude Code · Session at 81%', body: 'Resets in 2h 0m' },
  ]);
  assert.deepEqual(first.sent, { 'claude/five_hour': { level: 80, resetsAt: NOW + 2 * HOUR } });

  const again = run(reading(84), first.sent, { now: NOW + MINUTE });
  assert.deepEqual(again.notifications, []);
  assert.deepEqual(again.sent, first.sent);
});

test('the second threshold notifies after the first, and a jump past both sends one', () => {
  const first = run(reading(82));
  const second = run(reading(96), first.sent);
  assert.equal(second.notifications.length, 1);
  assert.equal(second.notifications[0].title, 'Claude Code · Session at 96%');
  assert.equal(second.sent['claude/five_hour'].level, 95);

  const jump = run(reading(97));
  assert.equal(jump.notifications.length, 1);
  assert.equal(jump.sent['claude/five_hour'].level, 95);
});

test('a small change in the reset time keeps the period; a later reset re-arms', () => {
  const first = run(reading(85));
  const jitter = run(reading(86, { resetsAt: NOW + 2 * HOUR + 40 * 1000 }), first.sent);
  assert.deepEqual(jitter.notifications, []);
  assert.deepEqual(jitter.sent, first.sent, 'keeps the time first recorded, so nothing is saved');

  const next = run(reading(81, { resetsAt: NOW + 7 * HOUR }), first.sent, { now: NOW + 3 * HOUR });
  assert.equal(next.notifications.length, 1);
  assert.deepEqual(next.sent['claude/five_hour'], { level: 80, resetsAt: NOW + 7 * HOUR });
});

test('a rolled-over window never notifies and clears its record', () => {
  const first = run(reading(90));
  const rolled = run(reading(0, { resetsAt: null, rolledOver: true }), first.sent, { now: NOW + 3 * HOUR });
  assert.deepEqual(rolled.notifications, []);
  assert.deepEqual(rolled.sent, {});
  const high = run(reading(99, { resetsAt: null, rolledOver: true }));
  assert.deepEqual(high.notifications, []);
});

test('a window without a reset time re-arms when usage falls below the sent level', () => {
  const open = (used) => reading(used, { resetsAt: null });
  const first = run(open(82));
  assert.equal(first.notifications[0].body, 'Over 80% of this limit');
  assert.deepEqual(run(open(83), first.sent).notifications, []);
  const dropped = run(open(10), first.sent);
  assert.deepEqual(dropped.sent, {});
  assert.equal(run(open(81), dropped.sent).notifications.length, 1);
});

test('a reset time appearing for a window recorded without one starts a new period', () => {
  const first = run(reading(85, { resetsAt: null }));
  const timed = run(reading(86), first.sent);
  assert.equal(timed.notifications.length, 1);
  assert.deepEqual(timed.sent['claude/five_hour'], { level: 80, resetsAt: NOW + 2 * HOUR });
  assert.deepEqual(run(reading(87), timed.sent).notifications, []);
});

test('a card with alerts off sends nothing; one without the field is on', () => {
  const off = run(reading(99), {}, { instances: [card('claude', false)] });
  assert.deepEqual(off.notifications, []);
  const missing = run(reading(99), {}, { instances: [card('claude', undefined)] });
  assert.equal(missing.notifications.length, 1);
});

test('raising a threshold above the sent level can notify again in the same period', () => {
  const first = run(reading(91));
  const raised = run(reading(91), first.sent, { thresholds: [90] });
  assert.equal(raised.notifications.length, 1);
  assert.equal(raised.sent['claude/five_hour'].level, 90);
});

test('records for removed cards and long-past resets are pruned', () => {
  const sent = {
    'claude/five_hour': { level: 80, resetsAt: NOW + HOUR },
    'gone/five_hour': { level: 80, resetsAt: NOW + HOUR },
    'claude/seven_day': { level: 95, resetsAt: NOW - 2 * DAY },
    'claude/open': { level: 80, resetsAt: null },
  };
  const result = run([], sent);
  assert.deepEqual(result.sent, {
    'claude/five_hour': { level: 80, resetsAt: NOW + HOUR },
    'claude/open': { level: 80, resetsAt: null },
  });
});

test('check never changes its inputs', () => {
  const sent = { 'claude/five_hour': { level: 80, resetsAt: NOW + 2 * HOUR } };
  const readings = [reading(96)];
  const before = JSON.stringify({ sent, readings });
  const result = run(readings, sent);
  assert.equal(JSON.stringify({ sent, readings }), before);
  assert.notEqual(result.sent, sent);
});

test('the reset text uses minutes, hours and days', () => {
  const body = (resetsAt) => run(reading(85, { resetsAt })).notifications[0].body;
  assert.equal(body(NOW + 30 * 1000), 'Resets in 1m');
  assert.equal(body(NOW + 45 * MINUTE), 'Resets in 45m');
  assert.equal(body(NOW + 3 * DAY + 5 * HOUR), 'Resets in 3d 5h');
});
