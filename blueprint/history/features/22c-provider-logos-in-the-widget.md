# Feature: Provider logos in the widget

**From build-plan:** feature 22c
**Build attempt:** 1
**Branch:** feature/provider-logos-in-the-widget
**Status:** verified

## Goal

Each card in the widget shows its agent's official mark (Claude Code, Codex,
OpenCode) where the coloured tool dot is today, in the full and the compact
view, unaltered and beside the tool's name. The marks are bundled with the app
and drawn from data, so nothing loads from the network and the window's content
security policy stays as it is. In the light theme every mark sits on a small
dark tile, so the white Codex and OpenCode marks stay visible. The brand rules
and the not-affiliated notice say the same thing as the updated plans. The
launch film (22b) waits for this release.

## In scope

- One shared data file with the three official marks, copied unaltered from
  the landing page's `site/src/assets/agents/*.svg` (SVGL source, already
  recorded in `docs/brand.md`): view box plus each path's `d`, `fill`,
  `fill-rule` and `clip-rule`. No titles, no styles, no external references.
- The widget card header draws the mark for the card's provider `id` in place
  of the dot, in both views (the header is built once, before the compact
  branch in `providerBlock`).
- Fallback: a card whose provider has no mark (a future provider, bad data)
  keeps today's accent dot, unchanged.
- The mark is decorative (`aria-hidden="true"`); the tool name stays the text
  that names the card, so screen readers hear what they hear today.
- Light theme: a small dark rounded tile behind every mark (all three, for one
  consistent look), from a new token. Dark theme: no tile.
- Both card styles (solid, translucent) and all three sizes (100, 115, 130):
  the mark scales with the existing `zoom`.
- Docs: `docs/brand.md` (tool marks replace tool dots in the widget, light-tile
  rule, provenance, the "app shows no vendor marks" sentence), the README
  not-affiliated notice (names *and marks* are used only to say which tools the
  widget reads from; marks belong to their owners), README widget screenshots
  that show dots, and a `CHANGELOG.md` `[Unreleased]` line.

## Out of scope

- The settings window and first-run welcome keep their accent dots
  (`settings.js` lines 76 and 168); the plan line names the widget only.
- The tray icon, window icons and alert notifications (they show the Token
  Huddle mark, not a tool).
- The landing page's widget copies, which still use the brand tool dots
  (`docs/brand.md` "Widget copies"); a later site change.
- Marks for providers that don't exist yet (23a).
- Removing the provider `accent` field: settings and the fallback still use it.

## Build loop

- `workflow.stepReview` is `feature`: build all steps, then one review of the
  whole feature. `workflow.checkpointCommits` is `disabled`: no commits between
  steps. `/complete` makes the feature commit.
- After each step run `npm test`; after the last step run `npm run verify`.
- Launch the app only through the npm scripts (`npm run demo`,
  `npm run screenshot`), never `electron` directly.

## Build steps

- [x] **1. Mark data and its tests.** Add `src/renderer/agent-marks.js`, plain
  data with no imports, shared the same way as `mark.js`: `<script>` in the
  widget page sets `window.huddleAgentMarks`, `require()` returns the same
  object for tests. Shape: `{ <providerId>: { viewBox, paths: [{ d, fill,
  fillRule?, clipRule? }] } }` for `claude`, `codex`, `opencode`. Copy each
  path's values from `site/src/assets/agents/claude-code.svg`, `codex.svg`,
  `opencode.svg`. Add `test/agent-marks.test.js`.
  **Done when:** `npm test` passes, including tests that (a) every provider in
  `src/main/providers/index.js` has a mark, (b) each mark's `viewBox`, path
  `d`, `fill`, `fill-rule` and `clip-rule` equal the site's SVG file (the
  "unaltered" contract), and (c) every fill is a `#rrggbb` colour and no value
  contains `url(`, `<` or `:` (plain data, nothing external).

- [x] **2. Draw the marks in the widget.** In `src/renderer/index.html` load
  `agent-marks.js` before `renderer.js`. In `renderer.js` `providerBlock`, build
  the mark with `createElementNS` (no `innerHTML`), class `mark-agent`,
  `aria-hidden="true"`, from `huddleAgentMarks[provider.id]`; fall back to
  today's dot when there is no mark. In `styles.css` size the mark to 13 px
  (the dot's slot in the `.head` row, same 7 px gap) and add the light-theme
  tile: 15 px box, 3 px radius, background `var(--mark-tile)`, mark inset to
  11 px. In `tokens.css` add `--mark-tile`: `transparent` in `:root`, a dark
  surface value in `:root[data-theme='light']`. Extend
  `test/contrast.test.js`: in the light theme (solid and translucent)
  `--mark-tile` against `--surface` is at least 3:1, and `#ffffff` (the white
  Codex and OpenCode marks) against `--mark-tile` is at least 3:1.
  **Done when:** `npm test` passes, and `npm run screenshot` captures show the
  three marks beside their names in: dark full, dark compact
  (`--view=compact`), light full and light compact (`--theme=light`), and
  translucent (`--style=translucent`) at size 130 (`--size=130`), with every
  mark visible and the name text unchanged.

- [x] **3. Docs, screenshots, changelog.** Update `docs/brand.md`: the tool
  dots table becomes the tool marks rule (official, unaltered, beside the
  name, light theme on the `--mark-tile` tile, dots remain in settings and as
  the fallback); remove "The app shows no vendor marks" and "no vendor logos in
  the app" from "Do and don't"; say the widget reads the marks from
  `src/renderer/agent-marks.js`, copied from the site files. Update the README
  notice as in "In scope". Find README images that show the widget (check the
  `README.md` image links) and regenerate the ones that show dots with
  `npm run screenshot`. Add under `[Unreleased]` in `CHANGELOG.md`: "Changed:
  the widget shows each tool's official mark beside its name instead of a
  coloured dot."
  **Done when:** `npm run verify` passes; `docs/brand.md` and `README.md` no
  longer say the app shows no vendor marks; the regenerated README screenshots
  show the marks.

## Files / areas

- New: `src/renderer/agent-marks.js`, `test/agent-marks.test.js`
- Changed: `src/renderer/index.html` (one `<script>`), `src/renderer/renderer.js`
  (`providerBlock` header), `src/renderer/styles.css` (`.mark-agent`, tile),
  `src/renderer/tokens.css` (`--mark-tile`), `test/contrast.test.js`,
  `docs/brand.md`, `README.md` (+ the widget screenshots it links),
  `CHANGELOG.md`
- Read-only sources: `site/src/assets/agents/*.svg`
- Packaging: `src/**/*` is already in electron-builder `files`, so the new
  renderer file ships without config changes.

## Data / contracts

- Lookup key: the reading's `id` (set from `provider.id` in
  `src/main/instances.js` `normalize`): `claude`, `codex`, `opencode`. The demo
  provider uses the same ids, so `npm run demo` and screenshots show the marks.
- `agent-marks.js` is data only; nothing is persisted, sent or read from disk
  at run time. No IPC or preload change.
- Content security policy unchanged (`default-src 'none'; style-src 'self';
  font-src 'self'; script-src 'self'`): the marks are SVG elements built in
  script, not `<img>` or remote files.

## Testing

- Logic tests (Node runner, `npm test`): `test/agent-marks.test.js` (coverage
  of every registered provider, unaltered against the site files, plain data)
  and the new contrast checks in `test/contrast.test.js`.
- UI: no DOM unit tests (project rule); evidence is the `npm run screenshot`
  captures listed in step 2, which use the demo data and a separate profile.
- Final gate: `npm run verify`. Observed on `main` before this feature: lint 0
  errors, Prettier clean, 213 tests, 0 failed (212 reported passing). The
  landing page part of Verify was not separately observed in that run.

## Notes for the AI

- "Unaltered" means the paths and colours from the site files exactly: never
  recolour, recrop, outline or simplify a mark. The tile is behind the mark,
  not part of it. If a mark looks wrong at 13 px, report it rather than edit it.
- Keep building DOM with `createElementNS`/`setAttribute`, as `drawLogo` does
  in `renderer.js`; do not use `innerHTML` for the SVG.
- Add `src/renderer/agent-marks.js` to the "Project structure" list in
  `blueprint/context/coding-standards.md` in the same style as `mark.js`.
- The launch film studio (`F:\Projects 2026\token-huddle-launch-video`, outside
  this repo) currently fakes this feature at 13 px; it is never edited from here.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":8565,"specSha256":"73f54bc2e490981d8a9e7e3ce045bde1c3347bd5bb4a666f67e6036a5ec03e29","branch":"refs/heads/feature/provider-logos-in-the-widget","head":"5cc11d1918cbcb70821194692897aef70d0029b7","baseRef":"refs/heads/main","baseCommit":"f87bd5bd68fb8e71fe1a51d4d394e73f07239ae6","sourceTree":"3e505f491acd64508c8695ab5e364362c05358cd","landing":"local-merge","absentOptional":[]} -->

## Findings

### 22c/F-17 [P3] closed - Compact summary says "Usage usage" for a window labelled "Usage"

**File:** src/renderer/renderer.js:98
**Found:** 2026-11-15 by /audit (scope: current; lens: quality)
**Why it matters:** The compact screen-reader text is built as label + " usage", bypassing the naming rule in windowText. A window with no length is labelled "Usage" (src/main/providers/util.js:6), so compact view reads "40% Usage usage".
**Suggested fix:** Use guidance.windowText(w).name for the compact text. No requirement is lost.
**Resolution:** The compact screen-reader text now uses guidance.windowText(w).name. Verified in the real compact widget. Awaiting re-review. Closed 2026-11-19 by /audit (scope: current, 22c): renderer.js:100 builds the compact screen-reader text from guidance.windowText(w).name; the 22c change to providerBlock leaves summary() untouched.

### 22c/F-18 [P3] closed - The focus-ring translucent test does not prove "over any desktop"

**File:** test/contrast.test.js:127
**Found:** 2026-11-15 by /audit (scope: current; lens: tests)
**Why it matters:** It checks --focus over white and black only. The text test above also asserts the colour stays on the same luminance side of both composites, which is what lets two extremes cover every desktop between them. Today's tokens pass; the test cannot prove the claim.
**Suggested fix:** Add the same Math.sign(luminance(focus) - luminance(bg)) === side assertion for both desktops. No requirement is lost.
**Resolution:** The translucent focus test now also asserts --focus stays on the same luminance side of both composites. Awaiting re-review. Closed 2026-11-19 by /audit (scope: current, 22c): contrast.test.js:134 asserts --focus stays on the same luminance side over both desktops; the 22c tile tests appended below do not change it.

### 22c/F-19 [P3] closed - The sparkline's name reads raw token counts

**File:** src/renderer/renderer.js:78
**Found:** 2026-11-15 by /audit (scope: current; lens: quality)
**Why it matters:** The label joins provider.spark as raw integers, so a screen reader speaks seven long numbers such as "1523442", while the visible stats use short forms like 1.3M. It also does not say the order is oldest first.
**Suggested fix:** Format each value short with a small renderer-side formatter and say "oldest first". No requirement is lost.
**Resolution:** guidance.sparkText() speaks short numbers, oldest first. Verified in the real widget: "Tokens per day, last 7 days, oldest first: 120, 340, ...". Test added. Awaiting re-review. Closed 2026-11-19 by /audit (scope: current, 22c): renderer.js:80 uses guidance.sparkText, which says "oldest first" with short numbers (guidance.js:84), covered by test/guidance.test.js:233.

### 22c/F-20 [P3] closed - Moved comment no longer describes the rule below it

**File:** src/renderer/styles.css:291
**Found:** 2026-11-15 by /audit (scope: current; lens: quality)
**Why it matters:** .sr-only was inserted between the comment "A problem's next action wraps in full view" and .note.action, so that comment now sits on top of the wrong rule.
**Suggested fix:** Move the .sr-only block (with its own comment) above that comment or below the .note.action rule. No requirement is lost.
**Resolution:** The .sr-only block moved below .note.action, each comment above its own rule. Awaiting re-review. Closed 2026-11-19 by /audit (scope: current, 22c): styles.css:323 comment sits on .note.action and .sr-only has its own comment below it (line 331); the 22c .mark-agent block (lines 153-180) is separate.

### 22c/F-24 [P2] closed - CHANGELOG [Unreleased] still says, without the exception, that Token Huddle makes no network calls of its own

**File:** CHANGELOG.md:121
**Found:** 2026-11-15 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** Nothing is released yet, so the whole [Unreleased] section becomes the 0.1.0 notes, and scripts/release-notes.js puts it in the GitHub release body. Its Changed entry (lines 121-123, "because Token Huddle no longer makes network calls of its own") and Security entry (lines 139-140, "and makes no network calls of its own") make the unqualified promise this feature's goal and step 5 say no file should still make, beside the new Added entry that names the update check. A reader of the Security section gets the wrong privacy statement. The Added entry in the same section discloses the check, so this is not P1.
**Suggested fix:** Add the same exception to both entries (for example "makes no network calls of its own except the update check, which Check for updates turns off"). No requirement is lost.
**Resolution:** Fixed on 2026-11-17 for GitHub issue https://github.com/arkaslittlemind/token-huddle/issues/6: both Changed and Security entries now name this project's GitHub Releases update checks and the Check for updates switch. Security retains the login/credential promise and states that the check sends no personal data. Assertions against extracted prerelease notes and `npm run verify` passed (180 desktop tests, 22 site tests and remaining gates). Awaiting audit re-review; GitHub issue remains open. Closed 2026-11-19 by /audit (scope: current, 22c): CHANGELOG.md no longer has an unqualified "no network calls of its own" claim; lines 75 and 235 both name the update check exception.

### 22c/F-30 [P3] closed - The "unaltered" mark test only compares <path> elements

**File:** test/agent-marks.test.js:24
**Found:** 2026-11-19 by /audit (scope: current; lenses: quality, security, performance, tests)
**Why it matters:** readSvg() collects only `<path>` tags and root fill/fill-rule/clip-rule. If a site mark later gains a `<g transform>`, `<rect>`, `<circle>`, gradient or a path-level `transform`/`opacity`, the test still passes while the widget draws a different, altered mark, so the "unaltered" contract in the 22c spec is not fully guarded. Today's three files contain only `<svg>`, `<title>` and `<path>`, so nothing is wrong now.
**Suggested fix:** In readSvg(), fail when the file contains any element other than svg, title and path, or any path attribute other than d, fill, fill-rule and clip-rule. A few lines; no requirement is lost.
**Resolution:** parseSvg() in test/agent-marks.test.js now throws on any element other than svg, title and path, any root attribute other than xmlns, viewBox, fill, fill-rule and clip-rule, and any path attribute other than d, fill, fill-rule and clip-rule. A new test feeds it a group with a transform, a rect, a path transform, path opacity and a root transform, and expects each to be rejected; the three site files still pass. `npm test`: 219 tests, 0 failed. Awaiting re-review. Closed 2026-11-19 by /audit (scope: current, 22c): re-examined test/agent-marks.test.js; parseSvg() now rejects any element other than svg, title and path and any unlisted root or path attribute, the new rejection test covers a group, rect, path transform, path opacity and root transform, and `node --test test/agent-marks.test.js` passes 4 of 4. A remaining gap for single-quoted attributes is a separate parsing issue, recorded as F-31.

### 22c/F-31 [P3] closed - The mark comparison does not see single-quoted SVG attributes

**File:** test/agent-marks.test.js:21
**Found:** 2026-11-19 by /audit (scope: current; lenses: quality, security, performance, tests)
**Why it matters:** attrs() matches only `name="value"`. XML also allows `name='value'`, so a site file with `transform='rotate(45)'` on a path (or `opacity='0.5'`) is invisible to both the new attribute guard and the comparison, and the "unaltered" test passes while the widget draws a different mark. A single-quoted `d` would still fail loudly (the paths would differ). Confirmed with a sample string; today's three site files use no single quotes, so nothing is wrong now.
**Suggested fix:** Match both quote styles in attrs(), for example `/([\w-]+)=(["'])(.*?)\2/g` taking the third group as the value, and add a single-quoted case to the rejection test. No requirement is lost.
**Resolution:** attrs() in test/agent-marks.test.js now matches both quote styles (`/([\w-]+)=(["'])(.*?)\2/g`). The rejection test gained a single-quoted path transform and a single-quoted root opacity; both are rejected, and the three site files still pass. `npm test`: 219 tests, 0 failed. Awaiting re-review. Closed 2026-11-19 by /audit (scope: current, 22c): re-examined test/agent-marks.test.js; attrs() reads both quote styles (a probe returned fill and an apostrophe-containing value correctly, and a namespaced `xmlns:xlink` surfaces as an unlisted key that the guard rejects), the rejection test covers both single-quoted cases, and `node --test test/agent-marks.test.js` passes 4 of 4.

## Try it now

Run or do:

`npm run demo` (sample data; touches nothing on disk), then pick Theme > Light from the widget's options menu (the `...` button).

Expected:

Each card shows its tool's official mark left of the name: the orange Claude Code mark, the white Codex mark and the OpenCode mark. In the light theme each mark sits on a small dark rounded tile. The compact view (the `=` button) shows the same marks.

This proves: build-plan 22c, official agent marks in the widget's full and compact views in both themes.
