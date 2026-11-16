# Feature: Widget legibility + theming

**From build-plan:** feature 13
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/widget-legibility-theming`

## Goal

Let people fit the widget to their desktop: a light, dark or system-following
theme, a solid or see-through card, and three sizes. Every text colour must
stay readable in every combination, proven by a contrast test rather than by
eye. This applies the look approved in 12b to the real app.

## Design reference

- Approved 12b screenshots in `blueprint/reference/`: `ui-full-*.png`,
  `ui-states-*.png`, `ui-compact-*.png`, `ui-settings-*.png` (dark and light).
  Onboarding screenshots are for step 14, not this feature.
- `prototypes/ui-mockups.html`: the `[data-theme='light']` token block and the
  scoped widget and settings rules are the source for the light values.
- `docs/brand.md`: light table, new token names, 11px minimum text size.

## Decisions already made

- Sizes: 100% (today), 115%, 130%. The whole widget scales: text, bars,
  buttons, padding and window width. (Maintainer, 2026-11-15.)
- Translucent means a see-through card (CSS alpha on the card colour), no
  blur. Its alpha is chosen so every widget text colour passes 4.5:1 over both
  a pure white and a pure black desktop. (Maintainer, 2026-11-15.)
- Defaults: theme `dark`, style `solid`, size `100`. Existing users see no
  change except that the card becomes fully opaque (today it is 94%), plus the
  11px text and dot-ring changes approved in 12b. (Maintainer, 2026-11-15.)
- Light values, new tokens, the light dot ring and the 11px minimum come from
  12b and `docs/brand.md`.

## In scope

- **Settings**: `theme`, `style` and `size` in `settings.json`, checked on load
  (an unknown or missing value falls back to its default), changed from the
  widget's options menu (and the tray menu, which is the same menu), kept
  across restarts.
- **Theme**: `dark`, `light`, `system`. Applies to the widget and the settings
  window, live, without a restart. `system` follows the Windows app mode
  (Settings > Personalization > Colors > app mode) and changes when it changes.
- **Style**: `solid` (opaque card) and `translucent` (see-through card), widget
  only. The settings window is always solid.
- **Size**: 100 / 115 / 130%, widget only. The window keeps its bottom-right
  pinning and the user's dragged position.
- **Light theme in the app**: the light token values, `--primary`,
  `--primary-hover`, `--on-primary`, `--dot-ring`, `--card-shadow`; the header
  mark in its `light` colourway in the light theme; the settings window
  restyled with the same tokens.
- **11px minimum text**: raise the widget's 10px rules (mode label, plan tag,
  status, stat labels, compact window labels).
- **Contrast test**: `test/contrast.test.js` reads `tokens.css` and checks
  every text token in both themes, solid and translucent.
- Screenshot flags for the new options, docs, changelog, plan and overview text.

## Out of scope

- Onboarding (14), alerts (15), edge snapping, hotkey, multi-monitor/DPI and
  off-screen recovery (16), error-state copy (17a), keyboard and screen-reader
  work beyond keeping today's focus rings (17b).
- Windows acrylic or blur; an opacity slider; sizes other than the three.
- A settings-window section for appearance. The options menu is where the
  widget's view options live today (Always on top, Compact view).
- The tray icon colours: they already follow the taskbar, not the app theme.
- The final logo (21). New dependencies.

## Build loop

`workflow.stepReview` is `feature`: build all steps, then present one review
packet. `workflow.checkpointCommits` is `disabled`; do not offer checkpoint
commits. `/complete` makes the final feature commit. Never accept a review
packet you have not read.

## Build steps

- [x] **Step 1 - Appearance settings and menu** - add
  `src/main/appearance.js` (no Electron import) exporting `APPEARANCE` (allowed
  values and defaults) and `sanitizeAppearance(raw)` that returns
  `{ theme, style, size }` with defaults for anything unknown, and
  `test/appearance.test.js`. In `main.js`, add the three fields to the default
  `settings` and sanitize them in `loadSettings()`. Leave
  `nativeTheme.themeSource` at `system`. *Revised 2026-11-15:* a probe showed
  that forcing `themeSource` also flips
  `shouldUseDarkColorsForSystemIntegratedUI`, so the tray icon would stop
  following the taskbar; the maintainer chose to send the theme instead. Main
  resolves the theme (`system` = `nativeTheme.shouldUseDarkColors`, the Windows
  app mode) and sends it as `theme` in `snapshot()` and in the settings
  window's state, and pushes both again on `nativeTheme` `updated`. Add
  `style` and `size` to `snapshot()`. Add three radio submenus to
  `buildMenu()` after "Compact view": **Theme** (System, Light, Dark),
  **Style** (Solid, Translucent), **Size** (100%, 115%, 130%); each saves and
  pushes. Give the settings window a `backgroundColor` from the resolved theme
  (`#13141a` dark, `#f6fcfe` light). *Done when:* the menu shows the three
  submenus with the current value checked, a choice survives a restart (seen
  in `settings.json`), a hand-edited invalid value loads as its default, and
  `node scripts/test.js test/appearance.test.js` passes.
- [x] **Step 2 - Light theme, 11px and contrast test** - in `tokens.css`, add
  the new tokens to `:root` (dark values = today's look) and a
  `:root[data-theme='light']` block with the light values from the mockup.
  `renderer.js` and `settings.js` set `data-theme` on `<html>` from each
  update.
  Raise the five 10px rules in `styles.css` to 11px; add `--dot-ring` and
  `--card-shadow` to the widget; switch `settings.css` primary button and
  switch accent from `--ob-sky`/`--ob-mist` to `--primary` tokens and add the
  dot ring there. In `renderer.js`, draw the mark with the `light` colourway
  in the light theme and redraw when the theme changes. Add `test/contrast.test.js`: parse the two token blocks from
  `tokens.css`, and assert WCAG 2 ratios (same method as `docs/brand.md`):
  4.5:1 for `--text`, `--text-muted`, `--text-faint`, `--warn`, `--crit` on
  `--surface-solid`, `--ok` and the text tokens on `--panel`, `--on-primary` on
  `--primary`; 3:1 for `--fill` and `--focus` on `--surface-solid`. *Done
  when:* `npm run screenshot` in each theme (Step 4 flags, or a hand-edited
  screenshot-profile `settings.json` until then) matches `ui-full-*.png` and
  `ui-settings-*.png` apart from the 12b-approved differences, switching Theme
  in the menu restyles both open windows live, and the contrast test passes.
- [x] **Step 3 - Translucent style and sizes** - the widget sets
  `data-style` and `data-size` on `<html>` from the snapshot. Solid: the card
  uses `--surface-solid`. Translucent: the card uses `--surface`, which each
  theme defines as its surface colour with the lowest alpha (two decimals) at
  which every widget text token passes 4.5:1 composited over both `#ffffff` and
  `#000000`, and `--fill` passes 3:1 likewise; extend `contrast.test.js` with
  that check, also asserting each text colour is lighter (dark theme) or
  darker (light theme) than both composites, so no desktop colour in between
  can be worse. Sizes: `zoom: 1.15` / `1.3` on `body` for `115` / `130`.
  `main.js` sets the window width to `Math.round(WIDTH * size / 100)`, uses
  that width in `startPosition()` and `huddle:resize`, and raises the height
  clamp to fit the 130% full view. The renderer reports the card's rendered
  height (`getBoundingClientRect().height`, which includes CSS zoom; confirm
  this in the running app) plus the zoomed body padding. *Done when:* each size
  shows the whole card with no clipping or scrollbar in full and compact view,
  the window stays pinned bottom-right until dragged, translucent shows the
  desktop through the card in both themes, and the contrast test passes.
- [x] **Step 4 - Screenshots, docs and changelog** - `scripts/screenshot.js`
  takes `--theme=<v>`, `--style=<v>` and `--size=<v>` and writes them into its
  own temporary profile's `settings.json` before loading the app (never the
  real profile). Capture dark and light (solid) at 100%, translucent in both
  themes, and 130% full view, and compare with the 12b references. Update
  `docs/brand.md` (light theme applied; 11px applied; record the translucent
  alphas and their ratios; note that the mark's light colours come from
  `mark.js` colourways, so the mockup's `--mark-row`/`--mark-dot` are not app
  tokens), the Styling lines in `blueprint/context/coding-standards.md`, the
  README options list if it has one, and `CHANGELOG.md` under `[Unreleased]`
  (Added: theme, style and size options; Changed: light theme, 11px text,
  opaque card by default). Add `theme`, `style` and `size` to the settings data
  model in `blueprint/project-plan.md`, then run `/overview`. *Done when:* the
  screenshots exist and match the references, the docs name no "not applied
  yet" light theme, and `npm run verify` passes.

## Files / areas

- New: `src/main/appearance.js`, `test/appearance.test.js`,
  `test/contrast.test.js`.
- `src/main/main.js`: default `settings`, `loadSettings()`, `snapshot()`,
  `buildMenu()`, `openSettings()` (`backgroundColor`), `createWindow()` and
  `startPosition()` (width), `huddle:resize` handler.
- `src/renderer/tokens.css`, `styles.css`, `settings.css`, `renderer.js`
  (`render()` sets data attributes; `drawLogo()` colourway; resize report).
- `scripts/screenshot.js`; `docs/brand.md`, `README.md`, `CHANGELOG.md`,
  `blueprint/context/coding-standards.md`, `blueprint/project-plan.md`, and
  the overview through `/overview`.
- `src/main/preload.js` needs no change: the snapshot already reaches the
  widget through `huddle:update`.

## Data / contracts

- `settings.json` gains three fields. Saved as JSON with the rest of the
  settings; no migration: a missing field takes its default.

  | Field | Values | Default |
  | --- | --- | --- |
  | `theme` | `"dark"`, `"light"`, `"system"` | `"dark"` |
  | `style` | `"solid"`, `"translucent"` | `"solid"` |
  | `size` | `100`, `115`, `130` (number) | `100` |

- `sanitizeAppearance(raw)` never throws; anything not exactly an allowed value
  (wrong type, other number, other string) becomes the default.
- `snapshot()` adds `theme` (resolved: `"dark"` or `"light"`, never
  `"system"`), `style` and `size`. The settings window's state adds the same
  resolved `theme`. Both reach the pages over the existing `huddle:update` and
  `settings:update` channels; `preload.js` does not change.
  `nativeTheme.themeSource` stays `system`, so the tray icon keeps following
  the taskbar.
- Tokens: names stay as in `tokens.css` and `docs/brand.md`. `--surface` is
  the translucent card colour (its alpha changes per Step 3); `--surface-solid`
  is the solid card and settings background. New: `--primary`,
  `--primary-hover`, `--on-primary`, `--dot-ring`, `--card-shadow`.
- CSP stays `default-src 'none'; style-src 'self'; font-src 'self';
  script-src 'self'` in both pages.

## Testing

- `npm run verify` before (59 tests pass at `e71556c`) and after.
- `test/appearance.test.js`: defaults for an empty object, `null`, wrong types
  and unknown values; each allowed value kept.
- `test/contrast.test.js`: as in Steps 2 and 3. It reads the real
  `tokens.css`, so a later colour change that breaks contrast fails Verify.
- Visual evidence: `npm run screenshot` captures listed in Step 4. Live theme
  switching, the `system` theme following Windows, the tray icon after a forced
  theme, and window sizing are checked by running the app; record what was
  observed and what was not.

## Notes for the AI

- **No logins, no network.** Nothing here reads another tool's files.
- Keep the quiet-instrument direction: Ocean Breeze for bars, pace and dots;
  amber and red only for state, always with text.
- Native dialogs (the Connect confirmation, the folder picker) follow the
  Windows app mode, not the app theme. Accepted with the revision above.
- Renderer DOM stays `textContent`/`createElement`; setting `dataset` and
  `style` from code is allowed by the CSP.
- Respect `prefers-reduced-motion`; add no new animation.
- Every behaviour change gets a `CHANGELOG.md` line under `[Unreleased]`.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":12299,"specSha256":"ebb77ddb850faf29c094a544d425b04968689359f3a3518c5a424d4194e01765","branch":"refs/heads/feature/widget-legibility-theming","head":"e71556cd792361b3bac9167237d508d64b626718","baseRef":"refs/heads/main","baseCommit":"e71556cd792361b3bac9167237d508d64b626718","sourceTree":"8c6e04e90e3d79f9770e406e4e680283b5cb9852","landing":"local-merge","absentOptional":[]} -->

## Try it now

1. Run `npm run demo`, then right-click the tray icon (or click `···`). Under **Theme**, pick **Light**: the widget changes immediately. Open **Settings…** and it is light too.
2. Pick **Theme > System**, then change Windows Settings > Personalization > Colors > **Choose your app mode**. Both windows should follow. Check the tray icon still matches the taskbar.
3. Pick **Style > Translucent** and drag the widget over a bright window and then a dark one. The text should stay readable.
4. Pick **Size > 130%**. The whole widget grows and stays in the bottom-right corner. Try compact view too.
5. Quit and restart: your choices should still be set.
6. Run `npm run verify`: expect 73 passing tests.
