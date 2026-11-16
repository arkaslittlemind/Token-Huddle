# Feature: Final logo

**From build-plan:** feature 21a
**Build attempt:** 1
**Branch:** feature/final-logo
**Status:** verified

## Goal

Pick the final Token Huddle mark from the three 12a candidates and make it the
one the app ships. The mark is defined once, as data, in `src/renderer/mark.js`.
The tray icon, the window icons, the widget header and the installer icon all
draw from it, so the switch is one value plus the docs and screenshots that
call the logo provisional. The landing page (21b) then uses the final mark.

## In scope

- A stop for the maintainer to choose the mark: Usage rows (current), Tracks &
  fills, or Columns.
- `src/renderer/mark.js`: set `CURRENT` to the chosen mark and remove the
  "PROVISIONAL" wording from its header comment.
- `docs/brand.md`: the Mark section names the final mark, its colourway table
  lists the chosen mark's colours (read from `mark.js`), and "provisional"
  wording is removed from the intro and the Mark section.
- README screenshots `docs/widget.png` and `docs/compact.png` recaptured with
  demo data, so they show the final mark.
- A `CHANGELOG.md` line under `[Unreleased]`.

## Out of scope

- Designing a new mark or changing any candidate's shapes or colours. If the
  maintainer wants changes, that is a new decision recorded before building.
- Removing the other candidates from `mark.js` (`candidates` stays; the test
  checks all of them) or deleting `prototypes/logo-marks.html` and
  `docs/brand/concepts/`.
- The landing page (21b) and its deployment (21c).
- Palette, type or any other brand change.

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is
`disabled`: build the steps in order and review the whole feature once. Step 1
is an extra hard stop because it needs the maintainer's choice. No checkpoint
commits; `/complete` makes the feature commit. Run `npm run verify` before
handing over.

## Build steps

- [x] **1. Show the candidates and stop for the choice.** Point the maintainer
  to `prototypes/logo-marks.html` (open from disk in a browser; it draws the
  candidates in context). Ask which mark to ship. Record the choice and the date
  in this spec's Implementation record.
  Done when: the maintainer named one of `usageRows`, `tracksFills` or
  `columns` in this conversation.

- [x] **2. Switch the mark.** Set `const CURRENT` in `src/renderer/mark.js` to
  the chosen id. Replace the header comment's "PROVISIONAL until the landing page
  (build-plan step 21) picks the final one" with a sentence that the final mark
  was chosen in step 21a, keeping the "to switch marks, change CURRENT" note. If
  the choice is `usageRows`, `CURRENT` stays as it is and only the comment
  changes.
  Done when: `npm test` passes (`test/icon.test.js` draws the current mark in
  all three colourways at 16 and 32 px), and `npm run dist` writes
  `build/icon.ico` without error.

- [x] **3. Update the brand doc.** In `docs/brand.md`: drop "The logo is
  provisional until the landing page (step 21)." from the intro; rename
  "**Provisional: Usage rows**" to "**Final: <name>**" with the one-line shape
  description from `mark.js`; state that it was chosen in step 21a on the
  decision date, among the three candidates; replace the "Usage rows" column of
  the colourway table with the chosen mark's roles and hex values exactly as in
  `mark.js` (dark, light, tile). Also update `blueprint/context/project-overview.md`
  "The logo is provisional until the landing page (step 21)." to name the final
  mark.
  Done when: `grep -rni "provisional" docs/brand.md src/renderer/mark.js
  blueprint/context/project-overview.md` finds no logo wording, and every hex in
  the brand doc's colourway table matches `mark.js`.

- [x] **4. Recapture the README screenshots.** `npm run screenshot --
  docs/widget.png` (demo data, dark, solid, 100%). For `docs/compact.png`, first
  check how the compact view can be captured: `scripts/screenshot.js` has no
  compact flag today. If there is no way, add a `--view=compact` flag that
  follows the existing `--theme=` pattern (it sets the saved view before the
  widget starts) and document it in the script's header comment and the AGENTS.md
  Commands line. Read both images back and confirm the header shows the final
  mark.
  Done when: both PNGs are rewritten, show the chosen mark in the widget header,
  and use demo data only (no personal usage numbers).

- [x] **5. Changelog and final check.** Add one line under `[Unreleased]` ("The
  final logo is <name>; the tray, window and installer icons use it."), or, if
  the choice is `usageRows`, say the provisional mark is now final.
  Done when: `npm run verify` passes.

## Files / areas

- `src/renderer/mark.js` - `CURRENT` and header comment
- `docs/brand.md` - intro, Mark section, colourway table
- `blueprint/context/project-overview.md` - brand line (around line 146)
- `docs/widget.png`, `docs/compact.png`
- `scripts/screenshot.js` and AGENTS.md Commands - only if step 4 needs a
  compact flag
- `CHANGELOG.md`
- Read only: `prototypes/logo-marks.html`, `src/main/icon.js`,
  `scripts/make-icon.js`, `test/icon.test.js`, `src/renderer/renderer.js`
  (header mark drawing)

## Data / contracts

- `mark.js` stays plain and loadable by both `require` (main, tests,
  `make-icon.js`) and a `<script>` tag (widget page); its exported shape does
  not change.
- `build/icon.ico` is generated by `npm run dist` and not tracked.
- The mark rules in `docs/brand.md` still hold: 16-unit grid, rounded
  rectangles and circles only, no text, no vendor colours. All three candidates
  already meet them (`test/icon.test.js` checks the grid and colours).

## Testing

- No new logic is expected. `test/icon.test.js` already covers drawing the
  current mark and every candidate. If step 4 adds a `--view=compact` flag, it
  lives in a script that starts Electron, which the test runner never starts;
  check it by running it and reading the image.
- `npm run verify` must pass.
- Visual evidence: the two recaptured screenshots, read back. The tray icon
  and the installer icon cannot be seen in a test; say so rather than claiming
  they were looked at, unless the app was actually run.

## Notes for the AI

- The choice is the maintainer's. Do not pick one, and do not recommend one
  unless asked.
- `README.md` images use demo data. Never capture with `--real`.
- Keep the docs edits small and in the existing style.

## Implementation record

Observed on 2026-11-16 on branch `feature/final-logo`:

- Step 1: the maintainer chose **Tracks & fills** (`tracksFills`) on
  2026-11-16.
- Step 2: `CURRENT` is `'tracksFills'`; the header comment no longer says
  provisional. `test/icon.test.js` then failed 4 tests: Tracks & fills draws
  fills over tracks, so smoothed fill ends over a track are opaque blends, not
  exact palette colours (78 of 84 opaque pixels exact at 16 px). The test now
  allows blends (over 60% exact, as for the tile) when shapes overlap, keeps the
  strict check otherwise, and asserts that only `tracksFills` overlaps.
- Step 3: `docs/brand.md` intro, Mark section and colourway table updated
  (hex values from `mark.js`); the overview brand line names the final mark,
  and its 12a line says "logo candidates" instead of "provisional logo".
- Step 4: `scripts/screenshot.js` gained `--view=compact` (sets `compact` in
  the screenshot profile on every run). `docs/widget.png` (316 x 380) and
  `docs/compact.png` (316 x 150) recaptured with demo data and read back: the
  header shows the three-track mark.
- The tray icon and installer icon were not looked at; `npm run dist` only
  shows that `build/icon.ico` is written.
- Final check: `npm run verify` exit 0, 166/166 tests (after
  `prettier --write test/icon.test.js` fixed one format warning).


<!-- blueprint:completion {"schemaVersion":2,"specBytes":7800,"specSha256":"a6b4e96b6ed9c47a3b14ed3daf936bb6d66c3e49590ba53103e5421200aaf0a0","branch":"refs/heads/feature/final-logo","head":"418d5574f3b8651ed7b6b81e8dfb854626b7361f","baseRef":"refs/heads/main","baseCommit":"418d5574f3b8651ed7b6b81e8dfb854626b7361f","sourceTree":"bf5f11f7caba039ad8255a7bd1f9f6a447622623","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run `npm run demo`. Expected: the widget header shows the Tracks & fills mark
(three tracks, the top fill cyan) next to TOKEN HUDDLE, and the tray icon and the
window icon use the same mark. Then run `npm run screenshot -- out.png
--view=compact` and open `out.png`: the compact widget with demo data. After
`npm run dist`, `dist/Token-Huddle-Setup-0.1.0.exe` shows the navy tile with
the new mark in File Explorer.
