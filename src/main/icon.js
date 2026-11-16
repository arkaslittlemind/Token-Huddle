// Draws the Token Huddle mark as raw pixels, so the project ships no icon files.
// Pure: no Electron. main.js turns the result into a nativeImage.
const mark = require('../renderer/mark.js');

const SAMPLES = 4; // 4 x 4 samples per pixel smooth the rounded edges

function hex(colour) {
  const n = parseInt(colour.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function insideRoundRect(x, y, rect) {
  const { x: left, y: top, width, height } = rect;
  if (x < left || y < top || x > left + width || y > top + height) return false;
  const radius = Math.min(rect.radius || 0, width / 2, height / 2);
  const cx = Math.min(Math.max(x, left + radius), left + width - radius);
  const cy = Math.min(Math.max(y, top + radius), top + height - radius);
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

function inside(shape, x, y) {
  if (shape.type === 'circle') return (x - shape.cx) ** 2 + (y - shape.cy) ** 2 <= shape.r ** 2;
  return insideRoundRect(x, y, shape);
}

/** Painted layers in grid units: the optional tile, then the mark's shapes. */
function layers(colourway) {
  const colours = mark.colourways[colourway];
  if (!colours) throw new Error(`Unknown colourway: ${colourway}`);
  const out = [];
  let place = (shape) => shape;
  if (colourway === 'tile') {
    const { colour, radius, inset, scale } = mark.tile;
    out.push({ shape: { type: 'rect', x: 0, y: 0, width: 16, height: 16, radius }, rgb: hex(colour) });
    place = (s) =>
      s.type === 'circle'
        ? { ...s, cx: inset + s.cx * scale, cy: inset + s.cy * scale, r: s.r * scale }
        : {
            ...s,
            x: inset + s.x * scale,
            y: inset + s.y * scale,
            width: s.width * scale,
            height: s.height * scale,
            radius: s.radius * scale,
          };
  }
  for (const shape of mark.shapes) out.push({ shape: place(shape), rgb: hex(colours[shape.role]) });
  return out;
}

/**
 * The mark as a size x size bitmap in the BGRA, premultiplied-alpha order that
 * nativeImage.createFromBitmap takes.
 * @param {number} size  pixels per side
 * @param {'dark'|'light'|'tile'} colourway
 */
function iconPixels(size, colourway = 'dark') {
  const painted = layers(colourway);
  const unit = 16 / size;
  const buffer = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let hits = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const x = (px + (sx + 0.5) / SAMPLES) * unit;
          const y = (py + (sy + 0.5) / SAMPLES) * unit;
          let top = null;
          for (const layer of painted) if (inside(layer.shape, x, y)) top = layer.rgb;
          if (!top) continue;
          r += top[0];
          g += top[1];
          b += top[2];
          hits++;
        }
      }
      const total = SAMPLES * SAMPLES;
      const i = (py * size + px) * 4;
      // Sums over all samples are already premultiplied by coverage.
      buffer[i] = Math.round(b / total);
      buffer[i + 1] = Math.round(g / total);
      buffer[i + 2] = Math.round(r / total);
      buffer[i + 3] = Math.round((hits / total) * 255);
    }
  }
  return { width: size, height: size, buffer };
}

/** Every colour a colourway can paint, as [r, g, b]; for tests. */
function palette(colourway) {
  return layers(colourway).map((layer) => layer.rgb);
}

module.exports = { iconPixels, palette };
