// The official agent marks the widget draws (build-plan 22c). They must cover
// every registered provider, match the landing page's SVG files exactly (the
// marks are used unaltered), and stay plain data with nothing external.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const marks = require('../src/renderer/agent-marks.js');
const registry = require('../src/main/providers');

const SITE = path.join(__dirname, '..', 'site', 'src', 'assets', 'agents');
const SITE_FILES = { claude: 'claude-code.svg', codex: 'codex.svg', opencode: 'opencode.svg' };

/** #rgb or #rrggbb to lowercase #rrggbb. */
function hex(value) {
  const v = String(value).toLowerCase();
  return /^#[0-9a-f]{3}$/.test(v) ? `#${[...v.slice(1)].map((c) => c + c).join('')}` : v;
}

// Both quote styles, as XML allows: a single-quoted attribute must not slip past the checks.
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w-]+)=(["'])(.*?)\2/g)].map(([, k, , v]) => [k, v]));

/** viewBox and paths of an SVG file, with fill and fill-rule inherited from the root as SVG does. */
function readSvg(file) {
  return parseSvg(fs.readFileSync(path.join(SITE, file), 'utf8'));
}

// Only what the comparison below covers. Anything else (a group, a shape, a
// transform, opacity, a gradient) would change how the mark draws without
// changing its paths, so the test refuses it instead of passing silently.
const ELEMENTS = new Set(['svg', 'title', 'path']);
const ROOT_ATTRS = new Set(['xmlns', 'viewBox', 'fill', 'fill-rule', 'clip-rule']);
const PATH_ATTRS = new Set(['d', 'fill', 'fill-rule', 'clip-rule']);

function parseSvg(text) {
  for (const [, name] of text.matchAll(/<([a-zA-Z][\w:-]*)/g)) {
    if (!ELEMENTS.has(name)) throw new Error(`cannot compare <${name}>`);
  }
  const root = attrs(text.match(/<svg\b[^>]*>/)[0]);
  for (const key of Object.keys(root)) {
    if (!ROOT_ATTRS.has(key)) throw new Error(`cannot compare <svg ${key}>`);
  }
  for (const [tag] of text.matchAll(/<path\b[^>]*>/g)) {
    for (const key of Object.keys(attrs(tag))) {
      if (!PATH_ATTRS.has(key)) throw new Error(`cannot compare <path ${key}>`);
    }
  }
  const paths = [...text.matchAll(/<path\b[^>]*>/g)].map(([tag]) => {
    const a = attrs(tag);
    const fillRule = a['fill-rule'] ?? root['fill-rule'];
    const clipRule = a['clip-rule'] ?? root['clip-rule'];
    return {
      d: a.d,
      fill: hex(a.fill ?? root.fill ?? '#000000'),
      ...(fillRule ? { fillRule } : {}),
      ...(clipRule ? { clipRule } : {}),
    };
  });
  return { viewBox: root.viewBox, paths };
}

test('the unaltered check rejects SVG drawing it does not compare', () => {
  const svg = (inner, root = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"${root}>${inner}</svg>`;
  assert.doesNotThrow(() => parseSvg(svg('<title>Ok</title><path d="M0 0h1v1z" fill="#fff"/>')));
  for (const [what, text] of Object.entries({
    group: svg('<g transform="scale(2)"><path d="M0 0h1v1z"/></g>'),
    rect: svg('<rect width="4" height="4"/>'),
    'path transform': svg('<path d="M0 0h1v1z" transform="rotate(45)"/>'),
    'path opacity': svg('<path d="M0 0h1v1z" opacity="0.5"/>'),
    'root transform': svg('<path d="M0 0h1v1z"/>', ' transform="scale(2)"'),
    'single-quoted path transform': svg(`<path d="M0 0h1v1z" transform='rotate(45)'/>`),
    'single-quoted root opacity': svg('<path d="M0 0h1v1z"/>', ` opacity='0.5'`),
  })) {
    assert.throws(() => parseSvg(text), /cannot compare/, `${what} should be rejected`);
  }
});

test('every registered provider has a mark', () => {
  for (const provider of registry.providers) {
    assert.ok(marks[provider.id], `no mark for provider ${provider.id}`);
  }
});

test('each mark is the landing page SVG, unaltered', () => {
  for (const [id, file] of Object.entries(SITE_FILES)) {
    const mark = marks[id];
    assert.ok(mark, `no mark for ${id}`);
    const normalised = { viewBox: mark.viewBox, paths: mark.paths.map((p) => ({ ...p, fill: hex(p.fill) })) };
    assert.deepEqual(normalised, readSvg(file), `${id} differs from site/src/assets/agents/${file}`);
  }
});

test('marks are plain data: #rrggbb fills and nothing that could load or run anything', () => {
  for (const [id, mark] of Object.entries(marks)) {
    assert.match(mark.viewBox, /^[\d. -]+$/, `${id} viewBox`);
    assert.ok(Array.isArray(mark.paths) && mark.paths.length > 0, `${id} has no paths`);
    for (const p of mark.paths) {
      assert.match(p.fill, /^#[0-9a-f]{6}$/, `${id} fill ${p.fill}`);
      for (const value of Object.values(p)) {
        assert.ok(!/url\(|<|:/.test(value), `${id} has an unsafe value: ${value}`);
      }
      for (const key of Object.keys(p)) {
        assert.ok(['d', 'fill', 'fillRule', 'clipRule'].includes(key), `${id} has an unexpected key ${key}`);
      }
    }
  }
});
