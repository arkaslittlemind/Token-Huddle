// Motion must stop when the system asks for reduced motion. The widget has one
// rule that turns off every animation and transition; the settings window has
// none to turn off. This reads the real stylesheets so a new animation added
// outside such a rule fails Verify.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (name) =>
  fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', name), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** The CSS with each @media (prefers-reduced-motion: reduce) { ... } block removed, and the blocks themselves. */
function split(css) {
  const blocks = [];
  let rest = css;
  for (;;) {
    const start = rest.indexOf('@media (prefers-reduced-motion: reduce)');
    if (start === -1) break;
    let depth = 0;
    let end = rest.indexOf('{', start);
    for (let i = end; i < rest.length; i++) {
      if (rest[i] === '{') depth++;
      if (rest[i] === '}' && --depth === 0) {
        end = i;
        break;
      }
    }
    blocks.push(rest.slice(start, end + 1));
    rest = rest.slice(0, start) + rest.slice(end + 1);
  }
  return { outside: rest, blocks };
}

test('the widget turns off animation and transition under reduced motion', () => {
  const { blocks } = split(read('styles.css'));
  assert.equal(blocks.length, 1, 'styles.css should have one reduced-motion rule');
  assert.match(blocks[0], /@media[^{]*\{\s*\*\s*\{/, 'the rule must cover every element, not a few selectors');
  assert.match(blocks[0], /animation:\s*none\s*!important/);
  assert.match(blocks[0], /transition:\s*none\s*!important/);
});

test('the settings window and tokens have no motion outside a reduced-motion rule', () => {
  for (const name of ['settings.css', 'tokens.css']) {
    const { outside } = split(read(name));
    assert.doesNotMatch(outside, /(^|[\s;{])(animation|transition)(-[a-z]+)?\s*:/, `${name} declares motion`);
    assert.doesNotMatch(outside, /@keyframes/, `${name} declares keyframes`);
  }
});
