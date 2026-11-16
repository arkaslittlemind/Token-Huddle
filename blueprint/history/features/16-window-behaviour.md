# Feature: Window behaviour

**From build-plan:** feature 16
**Build attempt:** 1
**Branch:** feature/window-behaviour
**Status:** verified

## Goal

The widget stays where the user can see it and is easy to place. Dragging it
near a screen edge snaps it to that edge. A global hotkey shows or hides it
from anywhere. When monitors are added or removed, the resolution or display
scaling (DPI) changes, or the taskbar moves, the widget keeps its size and is
moved back into view if it would otherwise be off-screen.

## In scope

- An Electron-free placement module, `src/main/placement.js`, with tests: is a
  position visible, the default corner, edge snapping, and keeping the widget
  inside a work area.
- Edge snapping when a drag ends, against the work area of the display the
  widget is on.
- Keeping the widget inside its display's work area when its height changes
  (compact/full toggle, cards added or removed).
- Recovery on `display-added`, `display-removed` and
  `display-metrics-changed`. A widget that is no longer visible goes back to
  the default corner. A widget pinned to the corner follows the corner.
  Width is re-applied after a scaling change.
- A global show/hide hotkey, registered at startup and released on quit, with
  its state shown in the tray menu.
- `CHANGELOG.md` line; README and overview updated where they describe the
  widget's window or options.

## Out of scope

- Error and empty state copy (17a); the full keyboard and screen-reader pass
  (17b).
- A settings field to change the hotkey (the hotkey is fixed by user decision).
- Snapping to other windows, or docking or resizing the widget by hand.
- Saving a separate position per monitor layout.
- Packaging, auto-start changes or the app user model id (step 18).

## Build loop

`workflow.stepReview` is `feature`: build all steps, then stop once for review of
the whole feature. `workflow.checkpointCommits` is `disabled`: no commits during
the build. `/complete` makes the feature commit. Run `npm run verify` after each
step; it must be green before moving on.

## Build steps

- [x] 1. **Placement module + tests** - add `src/main/placement.js` (no Electron
  import). It works on plain `{ x, y, width, height }` rectangles and work
  areas:
  - `isVisible(bounds, workAreas)` - the current rule from `startPosition`:
    at least 60 px of the widget's width and its top 40 px (the drag strip) are
    on some work area.
  - `corner(workArea, width, height)` - bottom-right with the existing 16 px
    margin.
  - `snap(bounds, workArea)` - each edge within `SNAP_PX` (16) of the
    matching work-area edge moves flush to it; other edges are unchanged.
  - `contain(bounds, workArea)` - moves the rectangle (never resizes it) so it
    lies inside the work area; a widget touching the bottom edge stays anchored
    to the bottom.
  Rewrite `startPosition` in `main.js` to use `isVisible` and `corner`, with
  unchanged behaviour. Add `test/placement.test.js`.
  **Done when** `npm run verify` passes with the new tests, and
  `npm run screenshot -- out.png` still places the widget in the bottom-right
  corner.
- [x] 2. **Edge snapping and staying inside the screen** - on the widget's
  `moved` event, take the work area of `screen.getDisplayMatching(bounds)`,
  apply `snap`, then `contain`, call `setPosition` only when the result differs,
  and save `x`, `y`. In the `huddle:resize` handler, when the user has placed
  the widget (`settings.x !== null`), apply `contain` to the new bounds so the
  compact/full toggle never pushes it below the taskbar.
  **Done when** in `npm start`, a drag that ends within 16 px of a screen edge
  leaves the widget flush with that edge (and the saved `x`, `y` match after a
  restart). A widget snapped to the bottom edge that switches from compact to
  full view grows upward and stays fully on screen.
- [x] 3. **Monitors and scaling** - listen to `screen` `display-added`,
  `display-removed` and `display-metrics-changed`, and call one `keepInView()`
  function:
  - pinned (`settings.x === null`): move to `corner` of the primary work area;
  - otherwise, if `isVisible` fails on every display's work area: reset `x`,
    `y` to null (pinned again), save, and move to the corner;
  - otherwise `contain` within its display's work area;
  - always re-apply `width: widgetWidth()` with the current height through
    `setBounds`, because a change in display scaling can leave a frameless
    window at the wrong size.
  Also run `keepInView()` before the widget is shown by the tray, the hotkey or
  a second launch.
  **Done when** `test/placement.test.js` covers a removed display (the widget
  goes back to the corner) and a work area that shrinks (it is pushed inside).
  In the running app, changing Windows display scaling (for example 100% to
  125%) or moving the taskbar keeps the widget at its width and on screen, and
  a saved `x` of -5000 in `settings.json` opens in the corner. If no second
  monitor is available, record the add/remove case as checked only by tests.
- [x] 4. **Global hotkey** - register `HOTKEY` (`CommandOrControl+Alt+H`) with `globalShortcut.register` after `app` is
  ready; it calls the same toggle as a tray click (shown → hide, hidden → show,
  closed → create). Release it in `will-quit` with
  `globalShortcut.unregisterAll()`. Show the state as a disabled first line of
  the tray menu: `Show or hide: Ctrl+Alt+H`, or
  `Hotkey Ctrl+Alt+H is in use by another app` when registration returned
  false. No dialog and no retry loop.
  **Done when** with the app running, pressing the hotkey in another app hides
  the widget and pressing it again shows it on top. The tray menu shows the
  shortcut. When another process already holds the shortcut (for example a
  second Electron script that registers it first), the tray menu shows the
  in-use line and the app otherwise works.
- [x] 5. **Docs** - `CHANGELOG.md` `[Unreleased]` / `Added` line; README where
  it describes the widget or its options menu; overview: the Widget line under
  UI/UX and the note that `x`, `y` go back to null when the widget is
  recovered.
  **Done when** `npm run verify` passes and the docs match the code.

## Files / areas

- `src/main/placement.js` (new), `test/placement.test.js` (new)
- `src/main/main.js` - `startPosition`, `createWindow` (`moved`), `toggleWindow`,
  `huddle:resize`, `buildMenu`, the `second-instance` handler, `whenReady`
  (screen events, hotkey), `will-quit`
- `CHANGELOG.md`, `README.md`, `blueprint/context/project-overview.md`

## Data / contracts

- Settings `x`, `y` keep their meaning: `null` means pinned to the default
  corner, numbers are the user's position. New rule: recovery sets them back to
  `null` when the saved position is no longer visible on any display. No new
  settings fields.
- Rectangles are in Electron DIPs (`screen` work areas and `win.getBounds()`);
  `placement.js` does no scale-factor maths of its own.
- `SNAP_PX = 16`, the same as the default corner margin. Snapping happens when
  a drag ends, never during it.
- `HOTKEY` is one Electron accelerator constant in `main.js`,
  `CommandOrControl+Alt+H` (shown as Ctrl+Alt+H). It is fixed and not stored in
  settings (user decision, 2026-11-15).

## Testing

- `test/placement.test.js` (`node:test`, plain rectangles): `isVisible`
  boundaries (exactly 60 px in view; top strip above the work area);
  `corner`; `snap` on each edge, outside the distance, and at a corner (two
  edges); `contain` on each side and when touching the bottom; a two-display
  layout with negative coordinates (monitor left of the primary); removed
  display.
- The screen events, hotkey and tray line are checked by running the app, not by
  unit tests. Display add/remove needs a second monitor; scaling and taskbar
  changes work on one.
- Baseline before this spec: `npm run verify` passed (lint, format check, 91
  tests).

## Notes for the AI

- No new dependencies; `screen` and `globalShortcut` are Electron built-ins.
- Keep `placement.js` Electron-free like `alerts.js` and `instances.js`, and add
  it to the Project structure list in `coding-standards.md`.
- `moved` can fire after a programmatic `setPosition`; snapping must be
  idempotent so it never loops.
- The screenshot script and the `/check` harness use separate profiles; do not
  test placement against the user's real `settings.json`.
- No em dashes in code, docs or the changelog.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":8429,"specSha256":"84c6b0623c8ca89a37e1f2218a628412d36c64352e7afef83befe216113e42fb","branch":"refs/heads/feature/window-behaviour","head":"81ee65e2f4d9c3a1b9ea6a52ec645eb2bf562128","baseRef":"refs/heads/main","baseCommit":"81ee65e2f4d9c3a1b9ea6a52ec645eb2bf562128","sourceTree":"a6b93d3de06cfc12b1192c022d16c4279616e9bd","landing":"local-merge","absentOptional":[]} -->

## Findings

### 16/F-01 [P3] closed - The "forget a lost position" rule is written twice

**File:** src/main/main.js:135
**Found:** 2026-11-15 by /audit (scope: current; lens: all)
**Why it matters:** `startPosition` and `keepInView` both check `isVisible` against every work area, then set `x`, `y` to null and save. If the rule changes (for example to remember a position per monitor layout), one copy can be missed and startup and recovery would disagree about when a position is lost.
**Suggested fix:** Extract one helper, for example `forgetIfLost(bounds)`, that does the check, reset and save, and call it from both. No requirement is lost.
**Resolution:** 2026-11-15 by /implement. `forgetIfLost(bounds)` now holds the check, reset and save; `startPosition` and `keepInView` both call it. `npm run verify` passed. In the running app, a saved x of -5000 still opens in the corner with x, y reset to null, and a removed display still sends the widget back to the corner. Closed 2026-11-15 by /audit (scope: current): one `forgetIfLost` at src/main/main.js:133, called by `startPosition` (saved rectangle) and `keepInView` (live bounds); it returns early when already pinned, so neither caller saves twice. `npm run verify` passed. No new defect.

## Try it now

1. Run `npm start`. Drag the widget by its title bar and let go just short of the left edge of the screen: it jumps flush to the edge. Restart the app and it opens in the same spot.
2. Drag it to the bottom edge, then switch between compact and full view with the header button: the widget grows upward and stays above the taskbar.
3. Press **Ctrl+Alt+H** in any app: the widget hides. Press it again: it comes back. Right-click the tray icon: the first line reads "Show or hide: Ctrl+Alt+H".
4. In Windows Settings > Display, change Scale (for example 100% to 125%) or move the taskbar: the widget keeps its width and stays on screen. Switch the setting back afterwards.
5. Run `npm run verify` and expect 96 passing tests.
