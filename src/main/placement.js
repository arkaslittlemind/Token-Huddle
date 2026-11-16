// Where the widget may sit: visibility, the default corner, edge snapping and
// keeping it on screen. Plain rectangles in Electron DIPs ({ x, y, width, height });
// no Electron import, so it stays testable under plain Node.

const SNAP_PX = 16;
const MARGIN = 16;
// The widget counts as visible while this much of it can still be grabbed.
const MIN_VISIBLE_WIDTH = 60;
const DRAG_STRIP = 40;

/** True when the widget's drag strip and at least 60 px of its width are on some work area. */
function isVisible(bounds, workAreas) {
  return workAreas.some(
    (a) =>
      bounds.x >= a.x - bounds.width + MIN_VISIBLE_WIDTH &&
      bounds.x <= a.x + a.width - MIN_VISIBLE_WIDTH &&
      bounds.y >= a.y &&
      bounds.y <= a.y + a.height - DRAG_STRIP
  );
}

/** The default spot: bottom-right of the work area, inside a 16 px margin. */
function corner(workArea, width, height) {
  return {
    x: workArea.x + workArea.width - width - MARGIN,
    y: workArea.y + workArea.height - height - MARGIN,
  };
}

/** Each edge within SNAP_PX of the matching work-area edge moves flush to it. Left and top win a tie. */
function snap(bounds, workArea) {
  const near = (a, b) => Math.abs(a - b) <= SNAP_PX;
  const right = workArea.x + workArea.width;
  const bottom = workArea.y + workArea.height;
  let { x, y } = bounds;
  if (near(x, workArea.x)) x = workArea.x;
  else if (near(x + bounds.width, right)) x = right - bounds.width;
  if (near(y, workArea.y)) y = workArea.y;
  else if (near(y + bounds.height, bottom)) y = bottom - bounds.height;
  return { ...bounds, x, y };
}

/** Moves the widget inside the work area without resizing it; if it is too tall, the top stays on screen. */
function contain(bounds, workArea) {
  const clamp = (value, low, high) => Math.max(low, Math.min(value, high));
  return {
    ...bounds,
    x: clamp(bounds.x, workArea.x, workArea.x + workArea.width - bounds.width),
    y: clamp(bounds.y, workArea.y, workArea.y + workArea.height - bounds.height),
  };
}

module.exports = { SNAP_PX, isVisible, corner, snap, contain };
