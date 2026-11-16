# Fix: Accurate OpenCode missing-data guidance

**Type:** Fix
**Status:** verified
**Branch:** fix/accurate-opencode-missing-data-guidance
**Fixes:** F-10
**Issue:** https://github.com/arkaslittlemind/token-huddle/issues/3

## The problem

The OpenCode provider checks for `opencode.db`, but tells an added account that
its folder was not found whenever that database is absent. An existing empty
folder therefore gets an inaccurate explanation.

## The fix

Use wording valid for both an absent folder and an existing folder without a
database: "No OpenCode data was found in this account's folder. Remove this card
in Settings, or add the folder again". Keep the existing `missing` state, empty
windows, default-account guidance, detection and read-only database behavior.
This needs only a copy change and focused regression coverage.

## Build steps

- [x] Update the added-account message in `src/main/providers/opencode.js`,
  revise the absent-folder assertion in `test/opencode.test.js`, and cover an
  existing temporary folder without `opencode.db`. Add a Fixed entry under
  `[Unreleased]` in `CHANGELOG.md` and mark F-10 fixed after verification.
  **Done when:** both missing-data cases return `missing`, empty windows and the
  accurate next-action message, default-account guidance still passes, and
  `npm run verify` passes. Present the complete diff for feature-level review;
  checkpoint commits are disabled.

## Verify

- Run the focused OpenCode and guidance tests through the project's test command.
- Run `npm run verify` for lint, formatting, app tests and landing-page checks.
- Use temporary test folders only; do not inspect credentials, call provider
  services or modify another tool's data.

## Verification results

- `npm test -- --test-name-pattern="OpenCode|added account|sums tokens|empty database|missing or unreadable"`
  passed; the runner executed all 169 app tests rather than filtering them.
- `npm run verify` passed: lint, formatting, 169 app tests, Astro diagnostics
  (zero errors/warnings/hints), site formatting, 22 site tests and static build.
  The build emitted a Shiki inline-style/CSP warning unrelated to this change.
- Self-review found no scope or contract gaps. Independent review is not selected
  for this copy-only repair; audit and runtime Check remain manual.

A later audit closes F-10; closing the GitHub issue belongs to the completion
workflow. No commit, merge or push has been made.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":2451,"specSha256":"633658a7f8876fd311b82a35d8971c32c628159134ed999cd497e1d4f10442d5","branch":"refs/heads/fix/accurate-opencode-missing-data-guidance","head":"5833b08e2e1c92e89aa066fe239927b2fcae8cf6","baseRef":"refs/heads/main","baseCommit":"5833b08e2e1c92e89aa066fe239927b2fcae8cf6","sourceTree":"72b98e6fa3434b49ea8277ae59be5b6c15606e09","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

Run `npm start`, then add an OpenCode account pointing to an empty folder in Settings.

Expected:

"No OpenCode data was found in this account's folder. Remove this card in Settings, or add the folder again".

This proves:

An existing empty folder gets an accurate explanation.
