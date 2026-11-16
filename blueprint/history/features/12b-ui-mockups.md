# Feature: UI mockups

**From build-plan:** feature 12b
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/ui-mockups`

## Goal

Give steps 13-17 an approved picture to build to. One static mockup page shows
the widget (full and compact, dark and light), the settings window and the
first-run onboarding, all in the 12a brand (Instrument direction, Ocean Breeze
accents, Geist). The maintainer approves it before any 13-17 code. This
step also confirms the light palette that 12a left as "starting values".

## Design reference

- [brand-instrument-full.png](../reference/brand-instrument-full.png) and
  [brand-instrument-compact.png](../reference/brand-instrument-compact.png):
  the approved dark Instrument look (header mark in them is a placeholder).
- `docs/brand.md`: dark tokens (in use), light starting values, type scale,
  do / don't.
- `src/renderer/tokens.css`, `styles.css`, `settings.css`, `index.html`,
  `settings.html`: the shipped dark UI. Dark mockups must match it, not
  reinvent it.
- `prototypes/logo-marks.html`: the existing prototype pattern; stays as is.

## In scope

- `prototypes/ui-mockups.html`, one static page, opened from disk in a browser.
- **Widget, full view**, dark and light: header (mark, wordmark, mode badge,
  refresh, compact, options, hide) and three tool cards using demo-style data
  that between them show every card state the renderer has today: normal,
  warning (70%+), critical (90%+), `stale` with age, `error` and `missing`
  with their message, plus the pace marker and one keyboard-focus ring.
- **Widget, compact view**, dark and light, same data.
- **Widget, empty**: the "Reading usage…" state, one theme is enough.
- **Settings window**, dark and light: heading and lead, card list (show,
  order, connect, remove, source), the add-account form, one inline error.
- **Onboarding** (content contract from step 14), dark and light: the
  detected tools, the source each one is read from, Connect for Claude Code
  (with the preview / backup / Disconnect promise), and what Token Huddle never
  touches (logins, credential files, network).
- **Light palette**: the full light token set (every token in `tokens.css`
  that changes), written in the mockup as overrides of the same token names, so
  step 13 can move them into `tokens.css` unchanged. Contrast computed and
  recorded in `docs/brand.md`.
- A "UI mockups" section in `docs/brand.md` with the approval record, and
  approved screenshots in `blueprint/reference/` for steps 13-17.

## Out of scope

- Any change under `src/` or to app behaviour. No theme switching, light theme
  in the app, translucent style, size options or contrast-over-background work
  (13); no onboarding code (14); no alerts (15, native Windows notifications);
  no window behaviour (16); no copy rewrites for error states beyond today's
  messages (17a); no accessibility implementation (17b).
- The final logo (21). The mockup uses the current provisional mark.
- The landing page (21).
- New dependencies.

## Build loop

`workflow.stepReview` is `feature`: build Steps 1-3, then present one review
packet. `workflow.checkpointCommits` is `disabled`; do not offer checkpoint
commits. `/complete` makes the final feature commit.

Step 4 is a maintainer gate regardless of `stepReview`: the maintainer approves
or asks for changes. Revise and re-present until approved. Do not record
approval the maintainer has not given. Never accept a review packet you have
not read.

## Build steps

- [x] **Step 1 - Page and widget mockups** - create
  `prototypes/ui-mockups.html`. Link `../src/renderer/tokens.css` so the
  bundled fonts and dark tokens are the real ones (no Google Fonts, no CDN,
  no network). Copy the widget's markup shape and class names from
  `index.html` / `renderer.js` output and the rules from `styles.css` that the
  frames need, scoped under a frame class so they do not leak. Add a
  `[data-theme='light']` block on each light frame that overrides token names
  only. Lay out the widget frames (full dark, full light, compact dark,
  compact light, empty) at the widget's real width, each labelled. The mark is
  a static SVG copy of the current `mark.js` shapes, marked in a comment as a
  copy. *Done when:* the page opens from disk in a browser with Geist
  rendering, every card state listed in scope is visible with its text, the
  browser shows no network requests, and `npm run format:check` passes.
- [x] **Step 2 - Settings and onboarding mockups** - add settings frames (dark,
  light) from `settings.html` / `settings.css`, and onboarding frames (dark,
  light). Onboarding is drawn as the first-run view of the settings window
  (it already holds Connect and the card list), and the review packet names
  this as the proposal for step 14 to confirm. Copy follows `docs/brand.md`
  (say "AI model usage", not bare "tokens"). *Done when:* both views show in
  both themes with every onboarding item from scope, focus rings are visible
  on one control per frame, and `npm run format:check` passes.
- [x] **Step 3 - Light contrast and guide** - compute WCAG 2 contrast (same
  relative-luminance method as the dark table) for every light text token on
  the light widget surface and the light settings panel, and 3:1 for bar fill,
  pace marker and focus ring against the track or surface. Raise any value
  below its threshold and use the raised value in the mockup. Replace the
  "Light theme (for 12b and step 13, not applied yet)" table in
  `docs/brand.md` with the full light token table and ratios, still marked
  "not applied yet (step 13)". *Done when:* every light token has a ratio at
  or above its threshold in `docs/brand.md`, the mockup uses those exact
  values, and `npm run verify` passes.
- [x] **Step 4 - Maintainer approval** - present the page, the light table and
  the onboarding-placement proposal. Apply requested changes. After approval,
  capture each frame (full, compact, settings, onboarding in each theme) as PNG
  into `blueprint/reference/` named `ui-<view>-<theme>.png`. Check first
  whether the Playwright browser tool can open the `file://` page; if not, ask
  the maintainer for the screenshots. Add a "UI mockups" section to
  `docs/brand.md`: approval date, the screenshot list, the onboarding
  decision, and any change from 12a values. *Done when:* the maintainer has
  approved in this session, the PNGs exist and match the page, and
  `npm run verify` passes.

## Files / areas

- `prototypes/ui-mockups.html` (new; format-checked by Prettier, not linted).
- `docs/brand.md` (light table, new "UI mockups" section; Prettier-ignored).
- `blueprint/reference/ui-*.png` (new).
- Read only: `src/renderer/tokens.css`, `styles.css`, `settings.css`,
  `index.html`, `settings.html`, `renderer.js`, `settings.js`, `mark.js`,
  `src/main/providers/demo.js` (sample numbers and messages).

## Data / contracts

- No persisted data, no external API, no app code change.
- Light values are overrides of existing `tokens.css` names (`--surface`,
  `--surface-solid`, `--panel`, `--control`, `--control-hover`, `--line`,
  `--hover`, `--text`, `--text-muted`, `--text-faint`, `--track`, `--fill`,
  `--pace`, `--spark`, `--focus`, `--ok`, `--warn`, `--crit`). No new token
  name unless a light frame needs one; any new name is listed in the review
  packet. Starting values: surface `#f6fcfe`, text `#03045e`, muted `#2c4a7a`,
  faint `#4d6488`, fill `#0077b6`, pace `#03045e`, warn `#9a6200`, crit
  `#c0322c`.
- State colours keep their meaning in both themes: amber at 70%, red at 90%,
  always with text. Ocean Breeze stays an accent, never a state colour.
- Mockup copy uses today's strings from `renderer.js`, `settings.html` and
  provider messages wherever a view already exists.
- *Decided during review (maintainer, 2026-11-15):* 11px is the smallest text
  size. The mockup raises the widget's 10px labels (mode, plan, status, stat
  labels, compact window labels) to 11px; `docs/brand.md` records the new
  scale; step 13 applies it in the app.

## Testing

- `npm run verify` passes before and after (59 tests on the starting commit).
  No new automated tests: nothing under `src/` changes and there is no browser
  test command.
- Visual evidence is the page in a browser and the approved PNGs. Contrast is
  computed, with the method recorded, not eyeballed.
- Translucency over real backgrounds is not judged here (step 13).

## Notes for the AI

- **No network from the page.** Fonts come from `src/renderer/fonts/` via
  `tokens.css`. Do not copy the Google Fonts link from `logo-marks.html`.
- No vendor logos or vendor brand colours; tool dots use the provider
  `accent` values.
- Keep the quiet-instrument direction: neutral surfaces, Ocean Breeze for bars,
  pace and dots, amber and red only for state.
- Respect `prefers-reduced-motion` if the page animates anything; it need not.
- `CHANGELOG.md`: no line; app behaviour does not change. Say so in the review
  packet.
- Do not edit `blueprint/build-plan.md` beyond what `/complete` does.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":9055,"specSha256":"486c7987e0af9c43aec31d912b5725c03df6ad98ed06e16dc91c3d7f2e7954a6","branch":"refs/heads/feature/ui-mockups","head":"35d5cf7fa4ce51f7014ffc649a01882f0e14db6d","baseRef":"refs/heads/main","baseCommit":"35d5cf7fa4ce51f7014ffc649a01882f0e14db6d","sourceTree":"2391903079250b9c0486718bc67690fe762bb3e5","landing":"local-merge","absentOptional":[]} -->

## Try it now

1. Open `prototypes/ui-mockups.html` from disk in a browser. Each section shows one view in a dark frame and a light frame: widget full view, problem states, compact view, settings window and onboarding.
2. In the light frames, check that every label and status is readable, amber and red still mark 70% and 90%, and each tool dot has a thin navy ring.
3. Compare the page with the approved screenshots `blueprint/reference/ui-*.png`, and the light table and "UI mockups" section in `docs/brand.md`.
4. Run `npm run verify`. Expect lint, format check and 59 passing tests. The app itself is unchanged.
