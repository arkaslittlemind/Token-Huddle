const test = require('node:test');
const assert = require('node:assert/strict');
const { iconPixels, palette } = require('../src/main/icon');
const mark = require('../src/renderer/mark');

const pixel = ({ buffer, width }, x, y) => {
  const i = (y * width + x) * 4;
  return { b: buffer[i], g: buffer[i + 1], r: buffer[i + 2], a: buffer[i + 3] };
};

/** A shape's box in grid units: [left, top, right, bottom]. */
const box = (shape) =>
  shape.type === 'circle'
    ? [shape.cx - shape.r, shape.cy - shape.r, shape.cx + shape.r, shape.cy + shape.r]
    : [shape.x, shape.y, shape.x + shape.width, shape.y + shape.height];

/** True when any two shapes' boxes overlap, so one is painted over another. */
const overlapping = (shapes) =>
  shapes.some((a, i) =>
    shapes.slice(i + 1).some((b) => {
      const [al, at, ar, ab] = box(a);
      const [bl, bt, br, bb] = box(b);
      return al < br && bl < ar && at < bb && bt < ab;
    })
  );

test('only the Tracks & fills candidate paints one shape over another', () => {
  const layered = Object.keys(mark.candidates).filter((id) => overlapping(mark.candidates[id].shapes));
  assert.deepEqual(layered, ['tracksFills']);
});

test('every candidate mark stays inside the 16-unit grid and has a colour for every shape', () => {
  for (const [id, candidate] of Object.entries(mark.candidates)) {
    for (const shape of candidate.shapes) {
      const [left, top, right, bottom] = box(shape);
      assert.ok(left >= 0 && top >= 0 && right <= 16 && bottom <= 16, `${id} shape out of grid`);
      for (const way of ['dark', 'light', 'tile']) {
        assert.match(candidate.colourways[way][shape.role], /^#[0-9a-f]{6}$/, `${id} ${way} ${shape.role}`);
      }
    }
  }
  assert.ok(mark.candidates[Object.keys(mark.candidates).find((k) => mark.candidates[k].name === mark.name)]);
});

for (const size of [16, 32]) {
  for (const way of ['dark', 'light', 'tile']) {
    test(`iconPixels draws the ${way} mark at ${size} px`, () => {
      const image = iconPixels(size, way);
      assert.equal(image.width, size);
      assert.equal(image.height, size);
      assert.equal(image.buffer.length, size * size * 4);

      const colours = palette(way).map(([r, g, b]) => `${r},${g},${b}`);
      let opaque = 0;
      let exact = 0;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const p = pixel(image, x, y);
          assert.ok(p.r <= p.a && p.g <= p.a && p.b <= p.a, 'colour is premultiplied by alpha');
          if (p.a === 255) {
            opaque++;
            if (colours.includes(`${p.r},${p.g},${p.b}`)) exact++;
          }
        }
      }
      assert.ok(opaque > size, 'the mark covers part of the icon');
      // Smoothed edges blend neighbouring colours. Those blends are opaque on the
      // tile, and wherever one shape is drawn over another (a fill over its track).
      if (way === 'tile' || overlapping(mark.shapes)) assert.ok(exact / opaque > 0.6, 'mostly palette colours');
      else assert.equal(exact, opaque, 'opaque pixels are palette colours');
      // Rounded corners (tile) and the grid margin (bare mark) leave the corner clear.
      assert.equal(pixel(image, 0, 0).a, 0);
      assert.equal(pixel(image, size - 1, size - 1).a, 0);
    });
  }
}

test('iconPixels rejects an unknown colourway', () => {
  assert.throws(() => iconPixels(16, 'neon'), /Unknown colourway/);
});
