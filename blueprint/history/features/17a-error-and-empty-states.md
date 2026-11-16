# Feature: Error and empty states

**From build-plan:** feature 17a
**Build attempt:** 1
**Branch:** feature/error-and-empty-states
**Status:** verified

## Goal

Every card that has no usable reading says why in plain words and what the user
can do next. Today the copy is uneven: some `missing` messages have a next action
("Open Settings to connect"), others do not ("Codex not found", "OpenCode not
found", "Could not read the OpenCode database"). An `error` card shows only a faint
one-line note that is cut off at the card edge, a stale Codex reading has no
explanation, and an empty widget says "Reading usage…" forever. After this
feature each `missing`, `stale` and `error` case, and the empty widget, shows
a state label (text, not colour alone) and a next action that fits the card.

## In scope

- A shared, Electron-free renderer module `src/renderer/guidance.js` (same
  pattern as `duration.js`: `<script>` in the widget, `require()` in tests) with one
  pure function, `guidance(provider)`, returning `{ label, action }` for a card:
  - `label`: short state text for the header badge. `error` → "error",
    `missing` → "no data", `stale` → the existing "stale · 2h ago" text.
  - `action`: one next-action sentence, or `''` when nothing is needed.
  Cases covered: Claude not connected / linked / connected-no-reading / own status
  line (conflict) / no longer connected (stale) / unsupported / settings unreadable;
  Codex not found / installed-but-unused / live read failed so the older reading
  is shown (stale); OpenCode not found / no SQLite support / database unreadable /
  no activity in 30 days; any added account whose folder has gone; an
  unexpected provider error (`Provider returned nothing` or a thrown message);
  a missing, unknown or empty-message state falls back to "Try Refresh".
- Provider message strings reworded where they lack a next action, keeping the
  existing wording where it already has one. Messages stay a single plain sentence
  with no raw stack text or file paths of the user's login or credential files.
- Codex: a `stale` reading (older live reading kept because it is newer than the
  last turn) gets a message that says the live read did not answer and what to do.
- The widget shows the label as the badge text for `error` and `missing`
  cards (full view), and the action as a wrapped note under the header (no
  single-line ellipsis in full view; the full text is also the `title`). Compact view
  keeps one line but its row shows the label ("no data", "error") with the action
  as the `title`, instead of the raw message alone.
- Widget empty states, driven by a new `ready` flag in `snapshot()` in
  `src/main/main.js` (false until the first refresh finishes):
  - not ready → "Reading usage…" (as today);
  - ready with no cards shown → "No tools shown. Open Settings to show one." with a
    way to open Settings, using the existing options menu path (no new IPC if the
    existing `menu` or settings call can be reused).
- Settings window: the connection `error` and `unsupported` states get the same
  next-action sentence where the panel currently shows only the raw `detail`.
- Tests in `test/guidance.test.js` for every case above, plus an
  `instances` test that an unexpected provider error normalizes to an `error` card
  with a usable message.
- `CHANGELOG.md` line under `[Unreleased]`; README and overview wording updated
  only where they describe these messages.

## Out of scope

- Keyboard navigation, focus rings, screen-reader labels and reduced motion
  (17b). Add `role`/`aria` attributes only where the new note itself needs them
  to be announced; the full pass is 17b.
- New provider features, new readings, retry or backoff changes, or changing when
  a card is `stale` versus `error`.
- Toasts, notifications or a log viewer for errors; no network calls.
- Translating the copy or making it configurable.
- Redesigning the card; only the badge text and note area change. Colour for
  states stays as built (amber for stale); `error` gets text, with a colour only
  if an existing token already fits.

## Build loop

`workflow.stepReview` is `feature`: build all steps, then stop for one review of
the whole feature. `workflow.checkpointCommits` is `disabled`: no commits during
the build; `/complete` makes the single feature commit.

Implementation runs on the session model. Audit and review run as Opus 5.5
medium agents, as the user specified for features 17-20.

## Build steps

- [ ] 1. **Guidance module and tests.** Add `src/renderer/guidance.js` and
      `test/guidance.test.js` covering every case listed in scope, plus the
      fallback. *Done when* `npm test` passes with the new tests and the module
      has no DOM or Electron use.
- [ ] 2. **Provider copy.** Reword the Claude, Codex and OpenCode messages that lack
      a next action; add the Codex stale message; keep existing tests green,
      updating assertions that check changed strings. *Done when* `npm test`
      passes and a grep of the provider files shows no `missing` or `error` message
      without a next action or a reason the user can act on.
- [ ] 3. **Widget display.** Load `guidance.js` in `index.html` (CSP unchanged),
      show the label badge and wrapped action note in full view, and the label and
      `title` in compact view; allow the note to wrap in `styles.css`. *Done when*
      `npm run demo` and `npm run screenshot -- out.png` show a missing card, an
      error card and a stale card readable in light and dark, with no clipped
      text, in both full and compact views.
- [ ] 4. **Empty widget and snapshot flag.** Add `ready` to `snapshot()`, set after
      the first refresh; render the not-ready and no-cards states with the Settings
      action. *Done when* hiding every card in Settings shows the no-tools message
      and a working way into Settings, and a fresh start still shows "Reading
      usage…" first.
- [ ] 5. **Settings panel.** Show the next-action sentence for connection `error` and
      `unsupported`. *Done when* the settings screenshot (`--settings`) shows it for
      a forced error card.
- [ ] 6. **Docs and gate.** Add the changelog line and any README or overview
      wording. *Done when* `npm run verify` passes.

## Files / areas

- `src/renderer/guidance.js` (new), `src/renderer/index.html`,
  `src/renderer/renderer.js`, `src/renderer/styles.css`
- `src/renderer/settings.js` (connection error copy)
- `src/main/providers/claude.js`, `codex.js`, `opencode.js` (message copy only)
- `src/main/main.js` (`snapshot()` gains `ready`)
- `test/guidance.test.js` (new); `test/claude.test.js`, `test/codex.test.js`,
  `test/opencode.test.js`, `test/instances.test.js` as strings change
- `CHANGELOG.md`; README or `blueprint/context/project-overview.md` where they
  quote the messages

## Data / contracts

- Reading contract unchanged: `state` stays `ok | stale | error | missing`;
  `message` stays one string. `guidance(provider)` is derived in the renderer
  from `state`, `message`, `windows`, `id` and `updatedAt`; nothing new is stored.
- `guidance` is pure and total: any input, including a partial object, returns
  `{ label, action }` of strings, never throws.
- Snapshot gains `ready` (boolean). Settings file format is unchanged.
- Message text from providers is rendered with `textContent` only.

## Testing

- Unit: `npm test` (Node runner, no network). Every state and provider case above
  has a `guidance` assertion; `ok` cards return an empty label and action.
- Normalization: a provider that throws or returns nothing gives an `error` card
  with a non-empty message.
- Visual: `npm run screenshot` and `npm run demo` for missing, error and stale
  cards, full and compact, light and dark. Report what was actually captured; if a
  state cannot be forced in demo mode, say so rather than claim it.
- Gate: `npm run verify`. Current baseline: 96 tests passing.

## Notes for the AI

- Project rules: no logins (never read a tool's credential file), no network
  calls, changelog line for every behaviour change.
- Keep the change small: one shared module, copy edits, one snapshot flag. No
  i18n layer, no message-code registry, no new settings.
- Existing messages that already say what to do ("Not connected yet. Open
  Settings to connect") keep their wording; only fill gaps.
- Check `main.js` for the existing way to open Settings from the widget before
  adding any IPC.
- State must be readable by text, not colour alone, in both themes.

## Open questions

None that block the build. One assumption to confirm at review: the
no-cards empty state links to Settings through the existing options menu path
rather than a new button style.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":8718,"specSha256":"68c0dd68d2944c56604c4f16ef599f53f673024804330aa849e9931987fe3553","branch":"refs/heads/feature/error-and-empty-states","head":"ffb991aa2022fcbe175a62b85ce6648227e3bcb2","baseRef":"refs/heads/main","baseCommit":"ffb991aa2022fcbe175a62b85ce6648227e3bcb2","sourceTree":"27f139573711e54edac6188c9d46f3a77709b5f1","landing":"local-merge","absentOptional":[]} -->

## Findings

### 17a/F-01 [P2] closed - "Remove this card in Settings" points at a control default cards do not have

**File:** src/main/providers/codex.js:272
**Found:** 2026-11-15 by /audit (scope: current; lens: quality)
**Why it matters:** Remove exists only for removable (added) cards (src/renderer/settings.js:79, src/main/instances.js:100). The default card is the common case for Codex not found (codex.js:272), OpenCode not found (opencode.js:65) and Claude unsupported (claude.js:145); those cards only have the Show switch, so the next step does not exist. test/guidance.test.js:101,105,123 lock the wording in.
**Suggested fix:** Reword to "..., or hide this card in Settings" in all three providers and update the tests.
**Resolution:** Re-reviewed 2026-11-15 by /audit (scope: current): no "Remove this card" text is left; all three providers say "hide this card in Settings", which matches the Show switch on every card; tests updated. Closed.

### 17a/F-02 [P2] closed - Codex stale reading turns back into "live" on the next refresh

**File:** src/main/providers/codex.js:234
**Found:** 2026-11-15 by /audit (scope: current; lens: quality)
**Why it matters:** A failed ask sets lastAskAt (line 239) and shows the new stale message. The next refresh within CACHE_MS (or a Refresh within FORCE_MIN_MS) hits line 234 and returns the old lastLive as state ok, source live, for up to 5 min. This predates the feature, but the new copy sends the user to Refresh.
**Suggested fix:** Serve the cache only when the last ask succeeded; otherwise fall through to the local/stale path. Retry changes are out of spec scope, so this needs the user's decision (fix now, or accept and track as a follow-up fix).
**Resolution:** Re-reviewed 2026-11-15 by /audit (scope: current): the cache serves lastLive only when !cache.lastAskFailed (codex.js:235); the flag is set before an ask and cleared only on a live result; first ask, force, failure, recovery and localOnly paths traced; tests at test/codex.test.js cover fail, still stale, then live again. The case in F-08 existed before and is now its own entry. Closed.

### 17a/F-03 [P2] closed - Codex stale messages are never produced by a test; the known-message list is a hand copy

**File:** test/guidance.test.js:93
**Found:** 2026-11-15 by /audit (scope: current; lens: tests)
**Why it matters:** codex.js:259-261 (both stale branches) are not exercised by any test, and the known-message test checks copied strings, so later provider drift passes.
**Suggested fix:** Add a codex.read test with a session-log fixture and a newer cache.lastLive, for localOnly true and false, asserting state stale and a next-step action.
**Resolution:** Re-reviewed 2026-11-15 by /audit (scope: current): test/codex.test.js runs both stale branches through codex.read and asserts state and next step. Closed. The hand-copied list in test/guidance.test.js remains as a weaker extra check.

### 17a/F-04 [P3] closed - ago() duplicated between renderer.js and guidance.js

**File:** src/renderer/renderer.js:25
**Found:** 2026-11-15 by /audit (scope: current; lens: quality)
**Why it matters:** The same rule is in renderer.js:25-28 and guidance.js:11-14, and the two copies feed different badges.
**Suggested fix:** Keep one copy (export it from guidance.js or move it into duration.js). No requirement is lost.
**Resolution:** Re-reviewed 2026-11-15 by /audit (scope: current): ago() exists only in guidance.js and is exported as guidance.ago; renderer.js wraps it; script order in index.html is right; test added. Closed.

### 17a/F-05 [P3] closed - Unreachable unsupported fallback in Settings; guidance.js missing from the coding standards

**File:** src/renderer/settings.js:118
**Found:** 2026-11-15 by /audit (scope: current; lens: quality)
**Why it matters:** Claude always supplies a detail for unsupported (claude.js:143-146), so the fallback at line 119 never shows. coding-standards.md:58 omits the shared guidance.js.
**Suggested fix:** Remove the unsupported branch (no requirement is lost) and add a guidance.js entry to the standards.
**Resolution:** Re-reviewed 2026-11-15 by /audit (scope: current): the unsupported branch is gone from connectionText; coding-standards.md lists guidance.js. Closed.

### 17a/F-06 [P2] closed - An added account whose folder has gone is told to "Install Codex" or "Install OpenCode"

**File:** src/main/providers/codex.js:270
**Found:** 2026-11-15 by /audit (scope: current; lens: quality, tests)
**Why it matters:** The spec lists "any added account whose folder has gone" as its own case. An added Codex or OpenCode account whose options.home was moved or deleted takes the same branch as "tool not installed" (also src/main/providers/opencode.js:62-67), so the card says "Install Codex, or hide this card in Settings" although the tool is installed. guidance() never looks at id or key, and no test covers the case.
**Suggested fix:** In the provider, when options.home was set by the user (an added account), return "This account's folder was not found. Remove this card in Settings, or add the folder again". Keep "Install ..." for the default card. Add one test per provider. No requirement is lost.
**Resolution:** Re-reviewed 2026-11-15 by /audit (scope: current): codex.js and opencode.js return the added-account message when options.home is set; default cards keep "Install ..."; per-provider tests exist. Gaps are tracked as F-09 and F-10. Closed.

### 17a/F-07 [P3] closed - Claude "unsupported" detail reads wrong in the Settings panel

**File:** src/main/providers/claude.js:144
**Found:** 2026-11-15 by /audit (scope: current; lens: quality)
**Why it matters:** The same detail feeds the widget and the Settings panel. In Settings it is the only connection detail with no final period, and it tells the user to hide the card in Settings while they are already there.
**Suggested fix:** End the detail with a period (guidance() strips a trailing period, so the widget text is unchanged); optionally drop the "in Settings" self-reference for unsupported in connectionText. No requirement is lost.
**Resolution:** Re-reviewed 2026-11-15 by /audit (scope: current): the Claude unsupported detail ends with a period; guidance() strips it, so widget text is unchanged. Closed.
