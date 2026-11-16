// The Token Huddle mark, read from the app's own definition at build time
// (src/renderer/mark.js), so the site never keeps a copy that can drift.
import { appModule } from './app';

type AppShape =
  | { type: 'rect'; x: number; y: number; width: number; height: number; radius: number; role: string }
  | { type: 'circle'; cx: number; cy: number; r: number; role: string };
interface AppMark {
  name: string;
  shapes: AppShape[];
  colourways: Record<Colourway, Record<string, string>>;
  tile: { colour: string; radius: number; inset: number; scale: number };
}

export type Colourway = 'dark' | 'light' | 'tile';
export type Shape =
  | { type: 'rect'; x: number; y: number; width: number; height: number; rx: number; fill: string }
  | { type: 'circle'; cx: number; cy: number; r: number; fill: string };

const mark = appModule<AppMark>('mark.js');

/** The current mark's shapes in one colourway, on the 16-unit grid. */
export function markShapes(colourway: Colourway): Shape[] {
  const colours = mark.colourways[colourway];
  return mark.shapes.map((s): Shape => {
    const fill = colours[s.role] ?? '#000000';
    return s.type === 'circle'
      ? { type: 'circle', cx: s.cx, cy: s.cy, r: s.r, fill }
      : { type: 'rect', x: s.x, y: s.y, width: s.width, height: s.height, rx: s.radius, fill };
  });
}

/** The app icon: a navy rounded tile with the mark scaled into it (tile colours). */
export function tileShapes(): Shape[] {
  const { colour, radius, inset, scale } = mark.tile;
  const placed = markShapes('tile').map((s): Shape =>
    s.type === 'circle'
      ? { ...s, cx: inset + s.cx * scale, cy: inset + s.cy * scale, r: s.r * scale }
      : {
          ...s,
          x: inset + s.x * scale,
          y: inset + s.y * scale,
          width: s.width * scale,
          height: s.height * scale,
          rx: s.rx * scale,
        }
  );
  return [{ type: 'rect', x: 0, y: 0, width: 16, height: 16, rx: radius, fill: colour }, ...placed];
}

/** An SVG document for the favicon. */
export function tileSvg(): string {
  const body = tileShapes()
    .map((s) =>
      s.type === 'circle'
        ? `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="${s.fill}"/>`
        : `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" rx="${s.rx}" fill="${s.fill}"/>`
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">${body}</svg>`;
}
