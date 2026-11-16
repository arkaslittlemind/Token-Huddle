const test = require('node:test');
const assert = require('node:assert/strict');
const { SNAP_PX, isVisible, corner, snap, contain } = require('../src/main/placement');

// A 1920x1080 primary with a 40 px taskbar, and a 1280x1024 monitor to its left.
const primary = { x: 0, y: 0, width: 1920, height: 1040 };
const left = { x: -1280, y: 0, width: 1280, height: 984 };
const widget = (x, y, height = 300) => ({ x, y, width: 316, height });

test('isVisible needs 60 px of width and the top strip on some work area', () => {
  assert.equal(isVisible(widget(100, 100), [primary]), true);
  assert.equal(isVisible(widget(-256, 100), [primary]), true, 'exactly 60 px in view on the left');
  assert.equal(isVisible(widget(-257, 100), [primary]), false);
  assert.equal(isVisible(widget(1860, 100), [primary]), true, 'exactly 60 px in view on the right');
  assert.equal(isVisible(widget(1861, 100), [primary]), false);
  assert.equal(isVisible(widget(100, -1), [primary]), false, 'top strip above the work area');
  assert.equal(isVisible(widget(100, 1000), [primary]), true, 'top 40 px still on screen');
  assert.equal(isVisible(widget(100, 1001), [primary]), false);
  assert.equal(isVisible(widget(-900, 200), [primary, left]), true, 'on a monitor left of the primary');
  assert.equal(isVisible(widget(-900, 200), [primary]), false, 'that monitor was removed');
  assert.equal(isVisible(widget(100, 100), []), false);
});

test('corner is bottom-right with a 16 px margin', () => {
  assert.deepEqual(corner(primary, 316, 300), { x: 1588, y: 724 });
  assert.deepEqual(corner(left, 316, 300), { x: -332, y: 668 });
});

test('snap moves an edge within the distance flush to the work area', () => {
  assert.equal(SNAP_PX, 16);
  assert.deepEqual(snap(widget(10, 500), primary), widget(0, 500), 'left');
  assert.deepEqual(snap(widget(500, 16), primary), widget(500, 0), 'top, exactly 16 px away');
  assert.deepEqual(snap(widget(1600, 500), primary), widget(1604, 500), 'right');
  assert.deepEqual(snap(widget(500, 735), primary), widget(500, 740), 'bottom');
  assert.deepEqual(snap(widget(5, 730), primary), widget(0, 740), 'a corner snaps both edges');
  assert.deepEqual(snap(widget(17, 17), primary), widget(17, 17), 'just outside the distance');
  assert.deepEqual(snap(widget(-1272, 500), left), widget(-1280, 500), 'negative coordinates');
  const snapped = snap(widget(10, 500), primary);
  assert.deepEqual(snap(snapped, primary), snapped, 'snapping twice changes nothing');
});

test('contain moves the widget inside without resizing it', () => {
  assert.deepEqual(contain(widget(500, 500), primary), widget(500, 500));
  assert.deepEqual(contain(widget(-50, 500), primary), widget(0, 500));
  assert.deepEqual(contain(widget(1800, 500), primary), widget(1604, 500));
  assert.deepEqual(contain(widget(500, -20), primary), widget(500, 0));
  assert.deepEqual(contain(widget(500, 900), primary), widget(500, 740), 'pushed up above the taskbar');
  // Snapped to the bottom, then the full view makes it taller: it grows upward.
  assert.deepEqual(contain(widget(500, 940, 400), primary), widget(500, 640, 400));
  // Taller than the work area: the top stays on screen so the drag strip can be reached.
  assert.deepEqual(contain(widget(500, 200, 1200), primary), widget(500, 0, 1200));
});

test('a work area that shrinks pushes the widget back inside', () => {
  const placed = widget(1604, 740);
  const taskbarTaller = { ...primary, height: 1000 };
  assert.deepEqual(contain(placed, taskbarTaller), widget(1604, 700));
});
