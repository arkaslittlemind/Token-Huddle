// The widget's look: theme, card style and size, as saved in settings.json.
// No Electron import, so it stays testable under plain Node.

const APPEARANCE = {
  theme: { values: ['dark', 'light', 'system'], fallback: 'dark' },
  style: { values: ['solid', 'translucent'], fallback: 'solid' },
  size: { values: [100, 115, 130], fallback: 100 },
};

/** Returns { theme, style, size }; anything not exactly an allowed value becomes the default. */
function sanitizeAppearance(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const result = {};
  for (const [key, { values, fallback }] of Object.entries(APPEARANCE)) {
    result[key] = values.includes(source[key]) ? source[key] : fallback;
  }
  return result;
}

module.exports = { APPEARANCE, sanitizeAppearance };
