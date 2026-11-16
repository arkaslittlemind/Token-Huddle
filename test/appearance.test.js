const test = require('node:test');
const assert = require('node:assert/strict');
const { APPEARANCE, sanitizeAppearance } = require('../src/main/appearance');

const DEFAULTS = { theme: 'dark', style: 'solid', size: 100 };

test('defaults are dark, solid and 100%', () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(APPEARANCE).map(([key, { fallback }]) => [key, fallback])),
    DEFAULTS
  );
});

test('sanitizeAppearance fills defaults for missing input', () => {
  assert.deepEqual(sanitizeAppearance({}), DEFAULTS);
  assert.deepEqual(sanitizeAppearance(null), DEFAULTS);
  assert.deepEqual(sanitizeAppearance(undefined), DEFAULTS);
  assert.deepEqual(sanitizeAppearance('dark'), DEFAULTS);
});

test('sanitizeAppearance keeps every allowed value', () => {
  for (const theme of ['dark', 'light', 'system']) {
    assert.equal(sanitizeAppearance({ theme }).theme, theme);
  }
  for (const style of ['solid', 'translucent']) {
    assert.equal(sanitizeAppearance({ style }).style, style);
  }
  for (const size of [100, 115, 130]) {
    assert.equal(sanitizeAppearance({ size }).size, size);
  }
});

test('sanitizeAppearance replaces unknown values and wrong types with defaults', () => {
  assert.deepEqual(sanitizeAppearance({ theme: 'blue', style: 'glass', size: 120 }), DEFAULTS);
  assert.deepEqual(sanitizeAppearance({ theme: 'Dark', style: 'SOLID', size: '115' }), DEFAULTS);
  assert.deepEqual(sanitizeAppearance({ theme: 1, style: true, size: null }), DEFAULTS);
  assert.deepEqual(sanitizeAppearance({ theme: ['light'], style: {}, size: NaN }), DEFAULTS);
});

test('sanitizeAppearance returns only the appearance fields', () => {
  assert.deepEqual(sanitizeAppearance({ theme: 'light', compact: true, x: 4 }), { ...DEFAULTS, theme: 'light' });
});
