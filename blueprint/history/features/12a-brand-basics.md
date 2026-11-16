# Feature: Brand basics

**From build-plan:** feature 12a
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/brand-basics`

## Goal

Settle Token Huddle's brand before the UI work in 12b and 13-17: confirm the
name is free to use, choose a logo and app icon, and apply one palette and type
system (Ocean Breeze colours, Geist) that the widget, the settings
window and the future landing page all share. Without this, the mockups in 12b
and the theming in 13 would each invent their own look.

## Design reference

- [brand-instrument-full.png](../reference/brand-instrument-full.png) and
  [brand-instrument-compact.png](../reference/brand-instrument-compact.png):
  the **Instrument** direction, chosen by the maintainer on 2026-11-15 from a
  three-way prototype (Deep Water, Instrument, Shoreline). Neutral dark card;
  Ocean Breeze only in the bar fills, pace markers, sparkline and tool dots;
  Geist for all text and numbers, and for the uppercase wordmark.
- **The mark in those screenshots (three stacked bars) is a placeholder, not
  the chosen logo.** The logo is not settled; Step 2 decides it.
- Ocean Breeze source swatches: `#03045E` navy, `#0077B6` blue, `#00B4D8` cyan,
  `#90E0EF` sky, `#CAF0F8` mist.

## Decisions already made

- Online name lookups are approved by the maintainer.
- The landing page will live at `tokenhuddle.arkaslittlemind.com`, a subdomain
  the maintainer controls. No domain is bought or checked.
- Palette: Ocean Breeze, applied as in the Instrument reference. The old tool
  accents (`#d97757`, `#19c39c`, `#8f8cf7`) are replaced, so no accent
  resembles a vendor's brand colour.
- Type: Geist for UI text and numbers (tabular figures), and for the
  wordmark. This replaces Segoe UI Variable. The app makes no network calls,
  so the font files ship inside the app.

## In scope

- **Name check** - web search for products with the same or a confusingly
  similar name, the GitHub repository name, and the npm package name
  `token-huddle`, recorded with date, result and source.
- **Logo** - two or three geometric concepts as hand-written SVG, one chosen by
  the maintainer, then the final mark and a wordmark lockup.
- **App icon** - the chosen mark tuned for 16, 24 and 32 px. The tray icon is
  redrawn in code from it, and both windows use it as their window icon.
- **Palette and type tokens** - `src/renderer/tokens.css` with the Instrument
  dark values and font faces, loaded by both windows; the widget and settings
  window restyled to match the reference.
- **Bundled fonts** - Geist `.woff2` file with its licence under
  `src/renderer/fonts/`.
- **Light palette values** - documented in the brand guide for 12b and step 13;
  not applied in the app.
- **Brand guide** - `docs/brand.md`: name check, mark usage, palette (dark and
  light, with contrast ratios), type stack and scale, do / don't notes.
- Tool accent colours in the providers and demo data.
- README logo, `CHANGELOG.md` line, and the plan / overview text that still
  names Segoe UI Variable or an unchosen domain.

## Out of scope

- Renaming the project. If the check finds the name unusable, stop and ask.
- Building the landing page or choosing its host (step 21).
- UI mockups (12b); light theme, translucent style, theme switching and size
  options (13); layout or copy changes beyond what the reference shows.
- The installer `.ico` and product metadata (step 18).
- Any npm dependency. Font files are copied in, not installed.

## Build loop

`workflow.stepReview` is `feature`: build all steps, then present one review
packet. `workflow.checkpointCommits` is `disabled`; do not offer checkpoint
commits. `/complete` makes the final feature commit.

Two maintainer gates interrupt the loop regardless of `stepReview`:

1. After Step 1, if any lookup shows the name is unusable, stop.
2. After Step 2, stop for the maintainer to name a provisional mark. Do not
   pick one. The final logo is chosen in step 21 (landing page).

Steps 3 and 4 may be built in either order after Step 2, but Step 4 needs the
chosen concept. Never accept a review packet you have not read.

## Build steps

- [x] **Step 1 - Name check** - run the lookups in scope and record each one
  (date, query, result, source URL) in a "Name check" section of
  `docs/brand.md`. Record the landing page address as decided. *Done when:*
  every lookup is marked available, taken or unclear, and the maintainer has
  seen the summary.
- [x] **Step 2 - Logo concepts** - draw two or three distinct geometric marks as
  SVG in `docs/brand/concepts/`, with a page
  (`docs/brand/concepts/README.md`) that shows each at 16, 32 and 128 px on
  the Instrument dark surface and on white. Each mark uses only Ocean Breeze
  colours, has no text inside the mark, and is built from rectangles and
  circles so it can be drawn as pixels at 16 px. *Revised 2026-11-15:* the
  maintainer drew their own marks (Columns, Usage rows, Tracks & fills; working
  files in the git-ignored `docs/brand/concepts/Token Huddle logo mark/`) and
  asked to keep the choice open until the landing page (step 21).
  `prototypes/logo-marks.html` compares those three in the widget header, the
  tray (dark and light taskbar), the app icon and the landing page header, and
  stays in the repo for step 21. *Done when:* the prototype runs and the
  maintainer has named a **provisional** mark for the app.
- [x] **Step 3 - Tokens, fonts and restyle** - copy the Geist (variable,
  Latin subset) `.woff2` file and its OFL
  licence texts into `src/renderer/fonts/`, taken from the npm packages
  `@fontsource-variable/geist` (fetch with `npm pack`
  into a scratch folder; do not add them to `package.json`). Create
  `src/renderer/tokens.css` with the `@font-face` rules and the tokens under
  Data / contracts; link it before the window stylesheet in `index.html` and
  `settings.html` and add `font-src 'self'` to both CSPs. Restyle `styles.css`
  and `settings.css` to use the tokens. Update tool `accent` values in
  `claude.js`, `codex.js`, `opencode.js` and `demo.js`, and the settings
  window's `backgroundColor` in `main.js`. Compute WCAG contrast for every
  text token on its surface and raise any text colour below 4.5:1 (expect
  `--text-faint` to need it), recording the result in `docs/brand.md`.
  *Done when:* `npm run screenshot -- after.png --settings` matches the
  reference apart from the header mark, the settings window uses the same
  tokens, DevTools shows no CSP font errors, and `npm run verify` passes.
- [x] **Step 4 - Provisional mark, app icon and tray** - put the provisional
  mark in one place so step 21 can swap it: `src/main/mark.js` exports the
  mark as data (shapes on a 16-unit grid, colourways `dark`, `light`, `tile`).
  `src/main/icon.js` draws BGRA pixels from that data; `main.js` wraps it with
  `nativeImage.createFromBitmap` for the tray (dark or light colourway from
  `nativeTheme.shouldUseDarkColors`, redrawn on theme change) and as the
  `icon` of both windows (tile colourway). Add the mark to the widget header
  as inline SVG before the wordmark. Add `test/icon.test.js`, including a
  check that the header SVG in `index.html` matches `mark.js`. No final
  `logo.svg` or wordmark file yet. *Done when:* the tray and the settings
  window's taskbar button show the provisional mark in `npm run demo`, the
  tray follows a Windows theme change, the test passes, and `npm run verify`
  passes. *As built:* `mark.js` lives in `src/renderer/` so the page can load
  it too, and `renderer.js` draws the header SVG from it at runtime, so there
  is no second copy to keep in sync and no header-match test is needed.
- [x] **Step 5 - Guide, docs and changelog** - complete `docs/brand.md` (mark
  usage, clear space, minimum size, palette tables, light values, type scale,
  do / don't), marking the mark as provisional until step 21. Refresh
  `docs/widget.png` and `docs/compact.png` with `npm run screenshot`. The
  README logo waits for the final mark in step 21.
  In `blueprint/project-plan.md`, replace the Segoe UI Variable line with the
  Geist decision and record the landing page address; then run
  `/overview` so the overview's UI/UX passage and deployment TODO follow.
  Add a line under `[Unreleased]` in `CHANGELOG.md` (Changed: new look, fonts,
  tool colours, icon). *Done when:* the overview no longer names Segoe UI
  Variable or an unchosen domain, and `npm run verify` passes.

## Files / areas

- `docs/brand.md`, `docs/brand/` (new; `docs/` is Prettier-ignored).
- `src/renderer/tokens.css`, `src/renderer/fonts/` (new);
  `src/renderer/index.html`, `settings.html`, `styles.css`, `settings.css`.
- `src/main/icon.js` (new), `src/main/main.js` (`trayIcon()` at
  [main.js:166-187](../../src/main/main.js#L166-L187), both
  `new BrowserWindow` calls).
- `src/main/providers/claude.js`, `codex.js`, `opencode.js`, `demo.js`
  (`accent` only).
- `test/icon.test.js` (new), `README.md`, `docs/widget.png`,
  `docs/compact.png`, `CHANGELOG.md`, `blueprint/project-plan.md`, and
  `blueprint/context/project-overview.md` through `/overview`.

## Data / contracts

- No persisted data and no external API. Settings files are untouched.
- Tokens on `:root` in `tokens.css` (dark, from the reference). Later features
  keep these names and add light values by overriding them:

  | Token | Value |
  | --- | --- |
  | `--surface` | `rgba(19, 20, 26, 0.94)` (widget card) |
  | `--surface-solid` | `#13141a` (settings background, pace-marker halo) |
  | `--line` | `rgba(255, 255, 255, 0.08)` |
  | `--text` | `#f1f2f4` |
  | `--text-muted` | `#9a9ca8` |
  | `--text-faint` | `#767884`, raised if below 4.5:1 |
  | `--track` | `rgba(255, 255, 255, 0.09)` |
  | `--fill` | `#90e0ef` |
  | `--pace` | `#caf0f8` |
  | `--spark` | `#00b4d8` |
  | `--focus` | `#90e0ef` |
  | `--ok` | `#5ec98f` (settings, unchanged) |
  | `--warn` | `#f0b545` (unchanged) |
  | `--crit` | `#f0605a` (unchanged) |
  | `--font-ui` | `'Geist', 'Segoe UI', system-ui, sans-serif` |
  | `--font-brand` | `'Geist', 'Segoe UI', system-ui, sans-serif` |

- Widget card radius 12px. Wordmark: Geist 700, 11px, `letter-spacing: 0.08em`,
  uppercase, `--text-muted`. Numbers use `font-variant-numeric: tabular-nums`.
- The settings window's panel colour is not in the reference: derive it from
  `--surface-solid` (a step lighter, as today's `#1f1f25` is to `#17171b`) and
  name it in the review packet.
- Tool accents: Claude Code `#caf0f8`, Codex `#00b4d8`, OpenCode `#3d9bd1`.
  Provider `accent` stays a hex string
  ([index.js:7](../../src/main/providers/index.js#L7)).
- Light values for the guide (starting point from the Shoreline prototype, for
  12b to confirm): surface `#f6fcfe`, text `#03045e`, muted `#2c4a7a`, faint
  `#4d6488`, fill `#0077b6`, pace `#03045e`, warn text `#9a6200`, crit text
  `#c0322c`.
- `mark.js` exports `{ name, shapes, colourways }`: each shape is
  `{ type: 'rect', x, y, width, height, radius, role }` or
  `{ type: 'circle', cx, cy, r, role }` on a 16-unit grid, and each colourway
  maps `role` to a hex colour. Changing the mark in step 21 changes this file
  and the header SVG only.
- `icon.js` exports `iconPixels(size, colourway)` returning `{ width, height, buffer }`,
  a BGRA buffer of `size * size * 4` bytes, with no Electron import.
- CSP becomes `default-src 'none'; style-src 'self'; font-src 'self';
  script-src 'self'` in both pages. Nothing else is loosened.

## Testing

- `npm run verify` after each code step (51 tests pass on the starting commit).
- `test/icon.test.js`: for sizes 16 and 32 the buffer length is
  `size * size * 4`; every pixel is fully transparent or an Ocean Breeze
  colour; the mark covers some pixels and leaves a transparent margin.
- Visual evidence: `npm run screenshot -- <file> --settings` after Step 3 and
  Step 4, compared with the design reference; `npm run demo` for the tray.
  Contrast ratios are computed (record the method), not eyeballed.
- Name lookups are evidence only for the date they were taken.

## Notes for the AI

- **No logins, no network from the app.** Fonts load from local files only;
  never link Google Fonts or a CDN from the app. Online lookups in Step 1 and
  `npm pack` in Step 3 are development actions, not app behaviour.
- The tray icon and window icon are still drawn in code; only the font files
  are new binary files. Keep the `trayIcon` comment accurate.
- Keep the "quiet instrument" direction: Ocean Breeze is an accent, not a
  surface. It must never compete with amber and red, which carry state.
- Confirm the Geist package carries the SIL Open Font License before
  copying; keep each licence file next to its fonts.
- No vendor logos or vendor brand colours in the mark, palette or icon.
- Every behaviour change adds a line under `[Unreleased]` in `CHANGELOG.md`.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":12911,"specSha256":"2f206b84e78dbae481b1757a124c0bebf621ce9e6f8a6f111142783724329d3f","branch":"refs/heads/feature/brand-basics","head":"e4d17d7cb98a6ecd3fe021998386891593c3e519","baseRef":"refs/heads/main","baseCommit":"e4d17d7cb98a6ecd3fe021998386891593c3e519","sourceTree":"c3212ef58824ec6fd93da6354c63f4a26f269f43","landing":"local-merge","absentOptional":[]} -->

## Try it now

1. Run `npm run demo`. The widget shows the Usage rows mark before the uppercase **TOKEN HUDDLE** name and text in Geist, sky-blue bars, mist pace markers and Ocean Breeze tool dots. Amber and red still mark 70% and 90%.
2. Look in the tray (open the **^** overflow if needed): sky rows with a cyan dot on a dark taskbar. Switch Windows Settings → Personalization → Colors → **Choose your mode** to Light: the tray icon turns navy. Switch it back.
3. Open **Settings** from the options menu. Its taskbar button shows the navy tile icon; cards use the same colours and fonts.
4. To try another mark, change `CURRENT` in `src/renderer/mark.js` to `'columns'` or `'tracksFills'` and restart. The tray, window icons and header all change. Compare all three in context by opening `prototypes/logo-marks.html` in a browser.
5. Run `npm run verify`. Expect lint, format check and 59 passing tests.
