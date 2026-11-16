# Fix: Copy prefix accessible name

**Type:** Fix
**Status:** verified
**Branch:** fix/copy-prefix-accessible-name
**Issue:** https://github.com/arkaslittlemind/token-huddle/issues/4

## The problem

In `src/renderer/settings.js`, `connectionControls()` renders a visible
"Copy prefix" button with the title "Copy the <name> status line prefix".
The `button()` helper also uses that title as the accessible name. The visible
words are not contiguous in the name, which can hinder speech-input activation.
The same control is shared by Settings and the first-run welcome view.

## The fix

Change this control's title argument to `Copy prefix for ${card.name}` so both
its tooltip and accessible name start with the visible label and identify the
account. Keep the visible text, conflict-state visibility, copy action and
shared button helper unchanged. No new dependencies or abstractions are needed.
Issue #4 is not a findings-ledger entry; do not invent a finding ID.

## Build steps

- [x] Update the Copy prefix title in `connectionControls()` and add a Fixed
  entry under `[Unreleased]` in `CHANGELOG.md`.
  **Done when:** the shared conflict-state control has visible text "Copy prefix"
  and title/accessible name "Copy prefix for <account name>", its existing click
  handler is preserved, and `npm run verify` passes. Present the complete diff
  for feature-level review; checkpoint commits are disabled.

## Verify

- Inspect the call site and shared helper to confirm the same label reaches
  `title` and `aria-label` in both Settings and welcome.
- Run `npm run verify` for lint, formatting, app tests and landing-page checks.
  This is a UI copy change, so no new unit test or browser harness is required.
- When a conflict-state Claude Code card is already available, run `npm start`
  and inspect its Copy prefix tooltip and accessible name in Settings. Do not
  modify another tool's status line or credentials to manufacture this state.
  Record runtime inspection only if actually performed; source inspection does
  not establish speech-tool compatibility.

## Verification results

- Source inspection confirms `button()` assigns the same title argument to
  `title` and `aria-label`, and both Settings and welcome use
  `connectionControls()`. The visible label and click handler are preserved.
- Initial Verify stopped on formatting; Prettier formatted the changed call.
  The subsequent `npm run verify` passed: lint, formatting, 169 app tests,
  Astro diagnostics (zero errors/warnings/hints), site formatting, 22 site tests
  and static build. The build emitted the existing Shiki inline-style/CSP warning.
- No runtime or speech-tool inspection was performed. Automatic try guide was
  skipped because no existing conflict-state card was confirmed; manufacturing
  that state would require changing another tool's configuration.
- Audit and runtime Check remain manual; this copy-only change does not select
  independent review. No independent review is pending and no P0/P1 finding
  blocks completion. Existing unrelated findings remain unchanged.

No commit, merge or push has been made. Next workflow command: `/complete`.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":3155,"specSha256":"95eab913ca7b185180cdcfad12d9e2e37c8fb50f392d9af4ddf89ec98af124c5","branch":"refs/heads/fix/copy-prefix-accessible-name","head":"8bf4c1d07bad5782b8bf2ce213fe6e625a48a77e","baseRef":"refs/heads/main","baseCommit":"8bf4c1d07bad5782b8bf2ce213fe6e625a48a77e","sourceTree":"27ed24adb60a76e8c10778893afc0c71dc63e753","landing":"local-merge","absentOptional":[]} -->
