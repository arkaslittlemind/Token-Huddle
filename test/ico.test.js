const test = require('node:test');
const assert = require('node:assert/strict');
const { encodeIco } = require('../scripts/ico');
const { iconPixels } = require('../src/main/icon');

/** One premultiplied BGRA pixel buffer of a single colour. */
function solid(size, [b, g, r, a]) {
  const buffer = Buffer.alloc(size * size * 4);
  for (let i = 0; i < buffer.length; i += 4) buffer.set([b, g, r, a], i);
  return { width: size, height: size, buffer };
}

function entries(ico) {
  const count = ico.readUInt16LE(4);
  return Array.from({ length: count }, (_, n) => {
    const at = 6 + n * 16;
    return {
      width: ico[at] || 256,
      height: ico[at + 1] || 256,
      bitCount: ico.readUInt16LE(at + 6),
      bytes: ico.readUInt32LE(at + 8),
      offset: ico.readUInt32LE(at + 12),
    };
  });
}

test('writes an ICO header and one directory entry per image', () => {
  const ico = encodeIco([solid(16, [0, 0, 0, 0]), solid(256, [0, 0, 0, 0])]);
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1); // icon, not cursor
  const list = entries(ico);
  assert.deepEqual(
    list.map((e) => [e.width, e.height, e.bitCount]),
    [
      [16, 16, 32],
      [256, 256, 32],
    ]
  );
});

test('every image lies inside the file, back to back, with a BMP header of double height', () => {
  const ico = encodeIco([16, 24, 32, 48, 64, 128, 256].map((size) => iconPixels(size, 'tile')));
  let expected = 6 + 7 * 16;
  for (const entry of entries(ico)) {
    assert.equal(entry.offset, expected);
    const header = ico.subarray(entry.offset, entry.offset + 40);
    assert.equal(header.readUInt32LE(0), 40);
    assert.equal(header.readInt32LE(4), entry.width);
    assert.equal(header.readInt32LE(8), entry.height * 2); // colour rows + mask rows
    const maskRow = Math.ceil(entry.width / 32) * 4;
    assert.equal(entry.bytes, 40 + entry.width * entry.height * 4 + maskRow * entry.height);
    expected += entry.bytes;
  }
  assert.equal(ico.length, expected);
});

test('stores rows bottom up with straight (not premultiplied) alpha', () => {
  // Top row half-transparent red, premultiplied; bottom row opaque blue.
  const image = { width: 1, height: 2, buffer: Buffer.from([0, 0, 128, 128, 255, 0, 0, 255]) };
  const ico = encodeIco([image]);
  const pixels = ico.subarray(6 + 16 + 40, 6 + 16 + 40 + 8);
  assert.deepEqual([...pixels], [255, 0, 0, 255, 0, 0, 255, 128]);
});

test('rejects images it cannot store', () => {
  assert.throws(() => encodeIco([]), /at least one/);
  assert.throws(() => encodeIco([solid(512, [0, 0, 0, 0])]), /1 to 256/);
});
