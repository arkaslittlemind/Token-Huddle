const test = require('node:test');
const assert = require('node:assert/strict');
const { HOUR, DAY, describeWindow, rollOver, clampPercent, compactNumber } = require('../src/main/providers/util');

test('describeWindow names windows by their length', () => {
  assert.deepEqual(describeWindow(5 * HOUR), { label: 'Session', short: '5h' });
  assert.deepEqual(describeWindow(7 * DAY), { label: 'Weekly', short: '7d' });
  assert.deepEqual(describeWindow(DAY), { label: 'Daily', short: '24h' });
  assert.deepEqual(describeWindow(30 * DAY), { label: '30-day', short: '30d' });
  assert.deepEqual(describeWindow(null), { label: 'Usage', short: '' });
});

test('rollOver zeroes a window whose reset time has passed', () => {
  const now = 1_000_000;
  const [past, future, unknown] = rollOver(
    [
      { usedPercent: 80, resetsAt: now - 1 },
      { usedPercent: 80, resetsAt: now + 1 },
      { usedPercent: 80, resetsAt: null },
    ],
    now
  );
  assert.deepEqual(past, { usedPercent: 0, resetsAt: null, rolledOver: true });
  assert.deepEqual(future, { usedPercent: 80, resetsAt: now + 1 });
  assert.deepEqual(unknown, { usedPercent: 80, resetsAt: null });
});

test('clampPercent keeps values between 0 and 100', () => {
  assert.equal(clampPercent(-5), 0);
  assert.equal(clampPercent(140), 100);
  assert.equal(clampPercent('42'), 42);
  assert.equal(clampPercent(undefined), 0);
});

test('compactNumber shortens large counts', () => {
  assert.equal(compactNumber(0), '0');
  assert.equal(compactNumber(1500), '1.5k');
  assert.equal(compactNumber(409000), '409k');
  assert.equal(compactNumber(4_800_000), '4.8M');
});
