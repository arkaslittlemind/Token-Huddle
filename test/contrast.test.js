// Contrast checks for both themes, read from the real tokens.css, so a colour
// change that makes text hard to read fails Verify. WCAG 2 contrast ratio from
// relative luminance, the same method as docs/brand.md.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const CSS = fs
  .readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'tokens.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

/** The custom properties declared in the first rule whose selector is exactly `selector`. */
function block(selector) {
  const start = CSS.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `tokens.css has no ${selector} rule`);
  const body = CSS.slice(CSS.indexOf('{', start) + 1, CSS.indexOf('}', start));
  const tokens = {};
  for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) tokens[name] = value.trim();
  return tokens;
}

// Merged in cascade order: tokens.css declares these four rules in this order.
const DARK = block(':root');
const DARK_SEE_THROUGH = block(":root[data-style='translucent']");
const LIGHT = block(":root[data-theme='light']");
const LIGHT_SEE_THROUGH = block(":root[data-theme='light'][data-style='translucent']");
const THEMES = { dark: DARK, light: { ...DARK, ...LIGHT } };
const TRANSLUCENT = {
  dark: { ...DARK, ...DARK_SEE_THROUGH },
  light: { ...DARK, ...DARK_SEE_THROUGH, ...LIGHT, ...LIGHT_SEE_THROUGH },
};

/** Resolves var() references and parses #rrggbb or rgba() into { rgb, alpha }. */
function colour(tokens, name) {
  const value = tokens[name];
  assert.ok(value, `token ${name} is not defined`);
  const ref = value.match(/^var\((--[\w-]+)\)$/);
  if (ref) return colour(tokens, ref[1]);
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) return { rgb: [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)), alpha: 1 };
  const rgba = value.match(/^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)$/);
  assert.ok(rgba, `token ${name} is not a colour this test can read: ${value}`);
  return { rgb: rgba.slice(1, 4).map(Number), alpha: rgba[4] === undefined ? 1 : Number(rgba[4]) };
}

const over = (top, bottom) => top.rgb.map((c, i) => c * top.alpha + bottom[i] * (1 - top.alpha));

function luminance(rgb) {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = ['--text', '--text-muted', '--text-faint', '--warn', '--crit'];

test('tokens.css declares the theme and style rules in cascade order', () => {
  const order = [
    ':root {',
    ":root[data-style='translucent'] {",
    ":root[data-theme='light'] {",
    ":root[data-theme='light'][data-style='translucent'] {",
  ].map((selector) => CSS.indexOf(selector));
  assert.deepEqual(
    order,
    [...order].sort((a, b) => a - b),
    'the light rules must follow the dark ones so they win at equal specificity'
  );
});

for (const [theme, tokens] of Object.entries(THEMES)) {
  const solid = colour(tokens, '--surface-solid').rgb;
  const panel = colour(tokens, '--panel').rgb;

  test(`${theme}: text on the solid surface is at least 4.5:1`, () => {
    for (const name of TEXT) {
      const value = ratio(colour(tokens, name).rgb, solid);
      assert.ok(value >= 4.5, `${name} on --surface-solid is ${value.toFixed(2)}`);
    }
  });

  test(`${theme}: text on settings panels is at least 4.5:1`, () => {
    for (const name of [...TEXT, '--ok']) {
      const value = ratio(colour(tokens, name).rgb, panel);
      assert.ok(value >= 4.5, `${name} on --panel is ${value.toFixed(2)}`);
    }
    const button = ratio(colour(tokens, '--on-primary').rgb, colour(tokens, '--primary').rgb);
    assert.ok(button >= 4.5, `--on-primary on --primary is ${button.toFixed(2)}`);
  });

  // The translucent card (--surface) over the brightest and darkest possible
  // desktop. Text must sit on the same side of both composites (lighter in dark,
  // darker in light), so any desktop colour in between is no worse than these two.
  test(`${theme}: translucent card keeps text readable over a white or black desktop`, () => {
    const tokens = TRANSLUCENT[theme];
    const surface = colour(tokens, '--surface');
    assert.ok(surface.alpha < 1, '--surface should be see-through');
    const composites = { white: over(surface, [255, 255, 255]), black: over(surface, [0, 0, 0]) };
    const side = theme === 'dark' ? 1 : -1;
    for (const [desktop, bg] of Object.entries(composites)) {
      for (const name of TEXT) {
        const fg = colour(tokens, name).rgb;
        const value = ratio(fg, bg);
        assert.ok(value >= 4.5, `${name} on --surface over ${desktop} is ${value.toFixed(2)}`);
        assert.ok(Math.sign(luminance(fg) - luminance(bg)) === side, `${name} flips side over ${desktop}`);
      }
      const bar = ratio(colour(tokens, '--fill').rgb, bg);
      assert.ok(bar >= 3, `--fill on --surface over ${desktop} is ${bar.toFixed(2)}`);
    }
  });

  test(`${theme}: bars and focus rings are at least 3:1 on the solid surface`, () => {
    for (const name of ['--fill', '--focus']) {
      const value = ratio(colour(tokens, name).rgb, solid);
      assert.ok(value >= 3, `${name} on --surface-solid is ${value.toFixed(2)}`);
    }
  });

  // The ring also has to show on the translucent card over any desktop and on the settings panels.
  test(`${theme}: focus ring is at least 3:1 on translucent cards over a white or black desktop and on panels`, () => {
    const tokens = TRANSLUCENT[theme];
    const surface = colour(tokens, '--surface');
    const focus = colour(tokens, '--focus').rgb;
    const side = theme === 'dark' ? 1 : -1;
    for (const [desktop, base] of Object.entries({ white: [255, 255, 255], black: [0, 0, 0] })) {
      const bg = over(surface, base);
      assert.ok(Math.sign(luminance(focus) - luminance(bg)) === side, `--focus flips side over ${desktop}`);
      const value = ratio(focus, bg);
      assert.ok(value >= 3, `--focus on --surface over ${desktop} is ${value.toFixed(2)}`);
    }
    const onPanel = ratio(focus, panel);
    assert.ok(onPanel >= 3, `--focus on --panel is ${onPanel.toFixed(2)}`);
  });
}

// Agent marks (build-plan 22c). Dark theme: marks sit on the card itself, so no
// tile. Light theme: every mark sits on a dark tile, which must stand out from
// the card (solid, and translucent over any desktop), and the white Codex and
// OpenCode marks must stand out from the tile.
test('dark: agent marks have no tile', () => {
  assert.equal(THEMES.dark['--mark-tile'], 'transparent', '--mark-tile should be transparent in the dark theme');
});

test('light: the agent mark tile is at least 3:1 against the card, and white marks on it too', () => {
  const tile = colour(THEMES.light, '--mark-tile');
  assert.equal(tile.alpha, 1, '--mark-tile should be opaque in the light theme');
  const backgrounds = { solid: colour(THEMES.light, '--surface-solid').rgb };
  const surface = colour(TRANSLUCENT.light, '--surface');
  for (const [desktop, base] of Object.entries({ white: [255, 255, 255], black: [0, 0, 0] })) {
    backgrounds[`translucent over ${desktop}`] = over(surface, base);
  }
  for (const [name, bg] of Object.entries(backgrounds)) {
    const value = ratio(tile.rgb, bg);
    assert.ok(value >= 3, `--mark-tile on the ${name} card is ${value.toFixed(2)}`);
  }
  const white = ratio([255, 255, 255], tile.rgb);
  assert.ok(white >= 3, `a white mark on --mark-tile is ${white.toFixed(2)}`);
});
