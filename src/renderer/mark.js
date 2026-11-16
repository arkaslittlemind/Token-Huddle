// The Token Huddle mark, as data: the one place the logo is defined.
//
// The final mark, Tracks & fills, was chosen in build-plan step 21a from the
// three candidates below. To switch marks, change CURRENT below; the tray icon,
// the window icons, the widget header and the installer icon all draw from this
// file.
//
// Each mark sits on a 16-unit grid and uses only rounded rectangles and circles,
// so the tray can draw it pixel by pixel. Each shape names a colour `role`; a
// colourway maps roles to colours:
//   dark  - on dark surfaces (the widget, a dark taskbar)
//   light - on light surfaces (a light taskbar, white pages)
//   tile  - on the navy app-icon tile
//
// Loaded by main (require) and by the widget page (<script>), so it stays plain.

(function (root) {
  const navy = '#03045e';
  const blue = '#0077b6';
  const cyan = '#00b4d8';
  const sky = '#90e0ef';
  const mist = '#caf0f8';

  const rect = (x, y, width, height, role) => ({ type: 'rect', x, y, width, height, radius: 1.5, role });
  const circle = (cx, cy, r, role) => ({ type: 'circle', cx, cy, r, role });

  const marks = {
    // Three usage rows of falling length and a pace dot.
    usageRows: {
      name: 'Usage rows',
      shapes: [
        rect(2, 2, 12, 3, 'row'),
        rect(2, 6.5, 8, 3, 'row'),
        rect(2, 11, 5, 3, 'row'),
        circle(12.5, 8, 1.5, 'dot'),
      ],
      colourways: {
        dark: { row: sky, dot: cyan },
        light: { row: navy, dot: cyan },
        tile: { row: sky, dot: cyan },
      },
    },

    // Three full tracks with fills; the row ahead of pace is cyan.
    tracksFills: {
      name: 'Tracks & fills',
      shapes: [
        rect(2, 2, 12, 3, 'track'),
        rect(2, 6.5, 12, 3, 'track'),
        rect(2, 11, 12, 3, 'track'),
        rect(2, 2, 10, 3, 'lead'),
        rect(2, 6.5, 6, 3, 'fill'),
        rect(2, 11, 8, 3, 'fill'),
      ],
      colourways: {
        dark: { track: blue, lead: cyan, fill: sky },
        light: { track: mist, lead: cyan, fill: navy },
        tile: { track: blue, lead: cyan, fill: sky },
      },
    },

    // Three columns of different heights and a dot.
    columns: {
      name: 'Columns',
      shapes: [
        rect(2.5, 4, 3, 10, 'side'),
        rect(6.5, 2, 3, 12, 'middle'),
        rect(10.5, 6.5, 3, 7.5, 'side'),
        circle(12, 3.6, 1.75, 'dot'),
      ],
      colourways: {
        dark: { side: blue, middle: cyan, dot: sky },
        light: { side: blue, middle: cyan, dot: sky },
        tile: { side: blue, middle: cyan, dot: sky },
      },
    },
  };

  const CURRENT = 'tracksFills';

  const mark = {
    ...marks[CURRENT],
    // The app-icon tile: a navy rounded square with the mark scaled to 70%.
    tile: { colour: navy, radius: 3.5, inset: 2.4, scale: 0.7 },
    candidates: marks,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = mark;
  else root.huddleMark = mark;
})(this);
