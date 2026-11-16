// Packs images from src/main/icon.js into a Windows .ico file. Pure: no I/O.
// Each image is stored as a 32-bit BMP (with alpha), which every Windows icon
// reader accepts, NSIS's included.

/** Premultiplied to straight alpha: the colour channels BMP icons expect. */
function unpremultiply(value, alpha) {
  return alpha === 0 ? 0 : Math.min(255, Math.round((value * 255) / alpha));
}

/**
 * One icon image: a BITMAPINFOHEADER, the colour rows bottom up, then the
 * 1-bit AND mask (all zero: the alpha channel decides transparency).
 */
function bmpEntry({ width, height, buffer }) {
  const maskRow = Math.ceil(width / 32) * 4;
  const out = Buffer.alloc(40 + width * height * 4 + maskRow * height);
  out.writeUInt32LE(40, 0); // header size
  out.writeInt32LE(width, 4);
  out.writeInt32LE(height * 2, 8); // colour and mask together
  out.writeUInt16LE(1, 12); // planes
  out.writeUInt16LE(32, 14); // bits per pixel
  out.writeUInt32LE(width * height * 4, 20); // image size
  for (let y = 0; y < height; y++) {
    const from = y * width * 4;
    const to = 40 + (height - 1 - y) * width * 4;
    for (let x = 0; x < width * 4; x += 4) {
      const a = buffer[from + x + 3];
      out[to + x] = unpremultiply(buffer[from + x], a);
      out[to + x + 1] = unpremultiply(buffer[from + x + 1], a);
      out[to + x + 2] = unpremultiply(buffer[from + x + 2], a);
      out[to + x + 3] = a;
    }
  }
  return out;
}

/**
 * @param {Array<{ width: number, height: number, buffer: Buffer }>} images
 *   premultiplied BGRA, rows top down (what iconPixels returns)
 * @returns {Buffer} the .ico file
 */
function encodeIco(images) {
  if (!images.length) throw new Error('An icon needs at least one image');
  for (const { width, height } of images) {
    if (!(width >= 1 && width <= 256 && height >= 1 && height <= 256)) {
      throw new Error(`Icon images must be 1 to 256 px, not ${width} x ${height}`);
    }
  }
  const bodies = images.map(bmpEntry);
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ width, height }, n) => {
    const at = 6 + n * 16;
    header[at] = width % 256; // 0 means 256
    header[at + 1] = height % 256;
    header.writeUInt16LE(1, at + 4); // planes
    header.writeUInt16LE(32, at + 6); // bits per pixel
    header.writeUInt32LE(bodies[n].length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += bodies[n].length;
  });
  return Buffer.concat([header, ...bodies]);
}

module.exports = { encodeIco };
