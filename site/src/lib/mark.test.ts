import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { markShapes, tileShapes } from './mark';

// The app's own definition, read independently of mark.ts.
const appMark = createRequire(import.meta.url)(path.resolve(process.cwd(), '../src/renderer/mark.js')) as {
  name: string;
  shapes: Array<{ type: string; role: string }>;
  colourways: Record<string, Record<string, string>>;
  tile: { colour: string; radius: number; inset: number; scale: number };
};

describe('markShapes', () => {
  for (const way of ['dark', 'light', 'tile'] as const) {
    it(`draws every shape of the current mark in the ${way} colours`, () => {
      const shapes = markShapes(way);
      expect(shapes).toHaveLength(appMark.shapes.length);
      shapes.forEach((shape, i) => {
        expect(shape.type).toBe(appMark.shapes[i]?.type);
        expect(shape.fill).toBe(appMark.colourways[way]?.[appMark.shapes[i]?.role ?? '']);
      });
    });
  }

  it('is the final mark, Tracks & fills', () => {
    expect(appMark.name).toBe('Tracks & fills');
  });
});

describe('tileShapes', () => {
  it('is a navy rounded tile with the mark at 70%, inset 2.4', () => {
    const [tile, ...shapes] = tileShapes();
    expect(tile).toEqual({ type: 'rect', x: 0, y: 0, width: 16, height: 16, rx: 3.5, fill: appMark.tile.colour });
    expect(appMark.tile).toMatchObject({ inset: 2.4, scale: 0.7, radius: 3.5 });

    const bare = markShapes('tile');
    expect(shapes).toHaveLength(bare.length);
    const first = shapes[0];
    const original = bare[0];
    if (first?.type === 'rect' && original?.type === 'rect') {
      expect(first.x).toBeCloseTo(2.4 + original.x * 0.7);
      expect(first.width).toBeCloseTo(original.width * 0.7);
      expect(first.rx).toBeCloseTo(original.rx * 0.7);
    } else {
      throw new Error('expected the first shape to be a rectangle');
    }
  });
});
