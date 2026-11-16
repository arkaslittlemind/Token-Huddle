# Feature: Accessibility

**From build-plan:** feature 17b
**Build attempt:** 1
**Branch:** feature/accessibility
**Status:** verified

## Goal

Everyone can use the widget and the settings window with the keyboard alone and
with a screen reader, and motion respects the system setting. The project's
accessibility rule (overview, UI/UX) is: keyboard reachable controls with visible
focus, state shown by text as well as colour, contrast in both themes and over any
background, reduced motion respected. Contrast for text is done (step 13). This
feature closes the rest: a visible focus ring that meets contrast, names and
roles that a screen reader can read (the usage bars are plain `div`s today, and
facts such as "54% of the window elapsed" exist only in mouse tooltips),
focus that survives the widget's and settings window's redraws, and a check that
reduced motion really stops the remaining animation.

## In scope

- **Focus contrast.** A test that the `--focus` ring colour reaches at least 3:1
  (WCAG 2.2 non-text contrast) against the card and window backgrounds, in both
  themes and in both solid and translucent styles, read from the real
  `tokens.css` with the same method as `test/contrast.test.js`. Adjust the
  `--focus` token only if the test fails.
- **Usage in words.** Two pure functions added to `src/renderer/guidance.js` (the
  shared, Electron-free module from 17a): `level(percent)` (the 70% / 90%
  thresholds, `''` | `'warn'` | `'crit'`, now the single source used by
  `renderer.js` too) and `windowText(window, now)` returning
  `{ name, valueText }`, for example `Session usage` and
  `74% used, warning, 54% of the window elapsed, resets in 2h 12m`. A window past
  its reset says `window reset`. The level word ("warning", "critical") is
  spoken, so state is carried by text as well as colour.
- **Widget semantics** (`index.html`, `renderer.js`):
  - each usage bar exposes `role="progressbar"` with `aria-valuemin/max/now`,
    an `aria-label` and the `aria-valuetext` above;
  - each provider card is an `article` named by its provider name
    (`aria-labelledby`), and the card list has an accessible name;
  - toggles and menus say what they are: `aria-pressed` on the compact toggle,
    `aria-haspopup="menu"` on Options, `aria-busy` on Refresh while it spins;
  - decorative parts (the accent dot, SVG icons, the sparkline's bars) are
    hidden from assistive tech; the sparkline gets one `role="img"` label from
    its existing tooltip text;
  - information that is only in a `title` tooltip today (pace, source, the
    action text) is also available as text or an accessible name.
- **Widget keyboard and focus.** Every header button and the empty-state "Open
  Settings" button is reachable by Tab, shows the focus ring, and keeps focus
  across the 30 second re-render and across data updates (the empty-state button
  is rebuilt on every render today, so it loses focus; reuse the node when its
  content has not changed).
- **Settings window.** Every control is reachable in a logical order and has an
  accessible name; the Show and Alerts switches, Move, Remove, Connect,
  Disconnect, Copy prefix, the threshold fields, Browse and Add account all work
  from the keyboard; and focus survives the list redraw that follows every change
  (the list is rebuilt on each update, so a keyboard user who toggles a switch is
  currently dropped back to the top; restore focus to the same control after a
  redraw, by its accessible name). Any control found without a name or out of
  order during the real-app check is fixed in this feature.
- **Reduced motion.** Confirm the existing `prefers-reduced-motion` rule in
  `styles.css` removes the bar-width transition, the Refresh spin and the hover
  transitions, and that `settings.css` has no animation or transition outside such
  a rule. A source test keeps both true.
- `CHANGELOG.md` line under `[Unreleased]`; README or overview wording only where
  they describe accessibility.

## Out of scope

- Windows High Contrast (`forced-colors`) styling. The bars' fills are
  backgrounds and would be replaced by system colours; supporting it is a
  separate piece of design work (see Open questions).
- Live-region announcements of changing usage, an Escape-to-hide key, changing
  the global hotkey, and any new setting.
- The tray icon menu and the native Options menu (the operating system owns their
  accessibility).
- Re-checking text contrast already covered by step 13; no new colours except a
  `--focus` token fix if the new test fails.
- Testing with a real screen reader such as NVDA. The check reads the
  accessibility properties the app exposes; it does not claim a screen reader
  was used.

## Build loop

`workflow.stepReview` is `feature`: build all steps, then stop for one review of
the whole feature. `workflow.checkpointCommits` is `disabled`: no commits during
the build; `/complete` makes the single feature commit.

Implementation runs on the session model (Sonnet 5.5, medium). Audit and review
run as Opus 5.5 medium agents, as the user specified for features 17-20.

## Build steps

- [x] 1. **Focus ring contrast.** Add the focus-contrast test to
      `test/contrast.test.js` for both themes and both styles. *Done when*
      `npm test` passes with it, or the `--focus` token is adjusted and the
      test then passes, with the change noted in `docs/brand.md` if a brand
      colour moved.
- [x] 2. **Words for usage.** Add `level()` and `windowText()` to `guidance.js` with
      tests (each level, rolled-over window, no reset time, no pace); switch
      `renderer.js` to the shared `level()`. *Done when* `npm test` passes and the
      widget renders the same colours as before (screenshot of the demo widget).
- [x] 3. **Widget semantics.** Apply the roles, names, states and hidden
      decoration in `index.html` and `renderer.js` as listed in scope. *Done
      when* a scripted dump of the real widget's accessibility properties (the
      check described under Testing) lists a named progressbar with value and
      text per window, a named article per card, and the three button states.
- [x] 4. **Widget focus.** Make the 30 second re-render and data updates keep
      focus (reuse the empty-state node when unchanged). *Done when* the scripted
      run Tabs to each widget control, finds a visible focus ring on each, and
      focus is still on the same control after a forced re-render.
- [x] 5. **Settings keyboard pass.** Walk the settings window by keyboard in the
      real app, list every focusable element with its accessible name and order,
      and fix gaps; restore focus after a list redraw. *Done when* the scripted
      run shows no unnamed focusable element, every control above is reachable,
      and toggling a switch by keyboard leaves focus on that switch.
- [x] 6. **Reduced motion.** Add the source test for both stylesheets and, in the
      scripted run, emulate `prefers-reduced-motion: reduce` and read the computed
      transition and animation of the bar fill and the spinning Refresh icon.
      *Done when* the test passes and the computed values are `none` under
      emulation (and the transition is present without it).
- [x] 7. **Docs and gate.** Changelog line and wording updates. *Done when*
      `npm run verify` passes.

## Files / areas

- `src/renderer/guidance.js` (`level`, `windowText`), `test/guidance.test.js`
- `src/renderer/index.html`, `src/renderer/renderer.js`, `src/renderer/styles.css`
- `src/renderer/settings.html`, `src/renderer/settings.js`,
  `src/renderer/settings.css`
- `src/renderer/tokens.css` (only if the focus test fails), `docs/brand.md`
  (only then), `test/contrast.test.js`
- a new `test/reduced-motion.test.js` (source check of both stylesheets)
- `CHANGELOG.md`; README or overview where they describe accessibility

## Data / contracts

- No stored data, IPC or provider contract changes.
- `level(percent)` returns `''` below 70, `'warn'` from 70, `'crit'` from 90,
  matching the existing colours. `windowText(w, now)` returns
  `{ name: string, valueText: string }`, is pure and total, and never throws on a
  partial window.
- All text still goes into the DOM with `textContent` or attribute setters, never
  `innerHTML`; provider text in labels is plain text.
- ARIA is added only where HTML does not already give the meaning (native
  `button`, `input`, `ul`, `label` stay as they are).

## Testing

- Unit: `npm test` (Node runner, no network). New tests cover focus contrast,
  `level`, `windowText`, and the reduced-motion source check. Baseline: 114 tests
  passing.
- Real app evidence, run by `/check` with a throwaway script in the scratchpad
  that reuses the screenshot profile and window handles (not committed): send Tab
  key events with `webContents.sendInputEvent`, read `document.activeElement`
  and its accessible name, take screenshots to see the focus ring in both themes,
  read ARIA attributes with `executeJavaScript`, and emulate reduced motion with
  the DevTools protocol (`Emulation.setEmulatedMedia`) to read computed styles.
  This reads accessibility properties; it does not replace a screen reader test,
  and the report will say so.
- Gate: `npm run verify`.

## Notes for the AI

- Project rules: no logins, no network calls, changelog line for every behaviour
  change.
- Native elements first. Add a role or `aria-*` only for the usage bars, the
  card grouping, button states and the sparkline image.
- Keep the visual design unchanged: colours, sizes and layout stay as they are
  apart from the focus ring if its contrast test fails.
- Do not add a dependency or a new settings option.
- Redraw fixes should be small: reuse nodes or restore focus by the control's
  accessible name; no virtual-DOM layer.

## Open questions

None that block the build. One decision to confirm at review: Windows High
Contrast (`forced-colors`) support is left out because it needs a separate
design for the usage bars. Say if it should be added to this feature or to the
build plan as its own step.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":10056,"specSha256":"a4f1a9cd3db4530d4928ad289378849d0aa1a28c2ad9e945c452235800bff262","branch":"refs/heads/feature/accessibility","head":"74ba1ff932f60316147be9856797581f789434b9","baseRef":"refs/heads/main","baseCommit":"74ba1ff932f60316147be9856797581f789434b9","sourceTree":"a4c417edc400de6e5eaf40d369a7fae9fa2954b3","landing":"local-merge","absentOptional":[]} -->

## Findings

### 17b/F-08 [P3] closed - Codex card says "No usage recorded yet" for the whole backoff window after a failed ask when there is no session-log snapshot

**File:** src/main/providers/codex.js:255
**Found:** 2026-11-15 by /audit (scope: current; lens: quality)
**Why it matters:** The stale branch only runs when readLocal returns a snapshot. With cache.lastLive held, no rate_limits in the newest rollouts and a failed ask, the card falls through to missing with "No usage recorded yet. Run a Codex turn", which is untrue. Before the F-02 repair this lasted one refresh; now cache.lastAskFailed keeps it for up to 5 minutes (20 s on Refresh).
**Suggested fix:** Return the stale lastLive when cache.lastLive exists and either there is no local snapshot or lastLive.updatedAt is newer. Add a codex.read test: a home with no rollouts, a successful fake ask, then a failing ask after CACHE_MS, asserting stale. No requirement is lost.
**Resolution:** codex.js now returns the held live reading as stale when there is no local snapshot or it is newer. Test added in test/codex.test.js. Re-reviewed 2026-11-15 by /audit (scope: current; all lenses): defect gone, no new defect. Closed.

### 17b/F-11 [P2] closed - Settings redraw can put focus on another card that has the same name

**File:** src/renderer/settings.js:233
**Found:** 2026-11-15 by /audit (scope: current; lens: quality)
**Why it matters:** redraw() looked the control up by aria-label across the whole list before using the card key. addAccount only rejects a duplicate folder, so two "Codex - Work" cards are possible; toggling the second card's switch sent focus to the first card's switch.
**Suggested fix:** Find the card by key first, then the label inside it.
**Resolution:** redraw() now looks inside the same card first. Verified in the real settings window with two cards named "Codex - Work": focus stayed on the second card. Re-reviewed 2026-11-15 by /audit (scope: current; all lenses): defect gone, no new defect. Closed.

### 17b/F-12 [P2] closed - Remove drops keyboard focus to the top of the document

**File:** src/renderer/settings.js:232
**Found:** 2026-11-15 by /audit (scope: current; lens: quality)
**Why it matters:** After Remove, the card and its button are gone, so redraw() had no target and focus fell to the body, which is the case the spec set out to fix.
**Suggested fix:** Record the active card position; focus the card now at that position, else the heading.
**Resolution:** redraw() falls back to the action button, any enabled control in the card, the card now at the same position, then the settings heading. Verified in the real window: Remove lands on the next card; removing the last card lands on the previous one. The same change makes Connect hand focus to Disconnect. Re-reviewed 2026-11-15 by /audit (scope: current; all lenses): defect gone, no new defect. The welcome-view fallback gap is tracked as F-16. Closed.

### 17b/F-13 [P3] closed - Reduced-motion test does not check what the rule covers

**File:** test/reduced-motion.test.js:35
**Found:** 2026-11-15 by /audit (scope: current; lens: tests)
**Why it matters:** Narrowing the rule from * to .fill would still pass while the Refresh spin and hover transitions kept running.
**Suggested fix:** Also assert the selector is *.
**Resolution:** The test now requires the reduced-motion block to start with a * rule. Re-reviewed 2026-11-15 by /audit (scope: current; all lenses): defect gone, no new defect. Closed.

### 17b/F-14 [P3] closed - Elapsed share is computed twice in the widget

**File:** src/renderer/renderer.js:55
**Found:** 2026-11-15 by /audit (scope: current; lens: quality)
**Why it matters:** windowBlock recomputed the elapsed share with a different guard than windowText, and built a title that repeated part of the spoken text.
**Suggested fix:** Export one elapsed(w, now) from guidance.js and use it in both places.
**Resolution:** guidance.elapsed() added and used by windowText and the pace marker; the bar title now reuses valueText. Tests added. Re-reviewed 2026-11-15 by /audit (scope: current; all lenses): defect gone, no new defect. Closed.

### 17b/F-15 [P3] closed - Edge cases in the windowText tests are weak

**File:** test/guidance.test.js:153
**Found:** 2026-11-15 by /audit (scope: current; lens: tests)
**Why it matters:** The partial-input loop only checked for strings, so wrong text such as "NaN% used" would pass. NaN, windowMs 0 and a past resetsAt had no test.
**Suggested fix:** Assert exact values and add those cases.
**Resolution:** Exact-value tests added for {}, undefined, NaN, a non-number, windowMs 0 and a past reset time. The default name is "Usage" (the audit suggested "Usage usage"; a prior review had flagged that as a bug). Re-reviewed 2026-11-15 by /audit (scope: current; all lenses): defect gone, no new defect. Closed.
