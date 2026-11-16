# Fix: Default provider installation guidance coverage

**Type:** Fix
**Status:** verified
**Branch:** fix/default-provider-installation-guidance-coverage
**Fixes:** F-09
**GitHub issue:** https://github.com/arkaslittlemind/token-huddle/issues/2

## The problem

Existing provider reads in the guidance tests pass `options.home`, so they
exercise added-account messages instead of the default-card Install Codex and
Install OpenCode branches. A hand-copied message list cannot detect regressions
in those real read paths.

## The fix

Add one real-read regression test per provider using empty options and a missing
default location inside a temporary test directory. Redirect `CODEX_HOME` for
Codex and `XDG_DATA_HOME` for OpenCode, restoring their prior values (including
absence) after each test. Use Codex local-only mode so no subprocess or live
request runs. Assert missing state, the provider-specific installation advice,
and that guidance exposes that advice as the next action. Keep existing added
account coverage. No runtime changes, dependencies or personal tool data access.

## Build steps

- [x] 1. Add isolated tests in `test/guidance.test.js` for the Codex and OpenCode
  default-card read paths, using existing temporary-folder and cleanup patterns.
  **Done when:** both real reads with `options: {}` return missing state and
  Install advice; guidance preserves that advice; environment variables and temp
  data are restored even on assertion failure; the focused guidance tests and
  `npm run verify` pass without network or real user data access.

## Verify

Run `node scripts/test.js test/guidance.test.js` for the focused suite. Run `npm run verify` for the final gate. Confirm each
new assertion fails if its default-provider Install message is removed or changed
to added-account wording. No UI changes or new tests beyond this coverage gap.

This test-only fix changes no behavior, so no changelog entry is required.
Mark F-09 fixed after implementation; audit closes it after re-review. Keep
GitHub issue closure for the completed fix, after landing, with explicit approval.

## Verification result

- `node scripts/test.js test/guidance.test.js`: 22 tests passed.
- Four mutation checks passed: each provider's new test fails when the Install
  advice is removed or replaced with added-account wording. Provider source bytes
  were restored after every check; no runtime source changes remain.
- `npm run verify`: lint, format check, 168 app tests, Astro check, 22 site tests
  and build passed. The existing Astro Shiki/CSP build warning remains.
- `git diff --check` passed. F-09 is fixed pending audit re-review.
- Check and audit are manual. Independent review is not selected for this
  test-only change. Try guide skipped because runtime behavior is unchanged.
- No commit, merge, push or GitHub issue closure performed.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":2914,"specSha256":"3ca7b4314f4d7c3a0e64d01abb9451ccfd1e4d630d515bc9126e1956f8c89ad2","branch":"refs/heads/fix/default-provider-installation-guidance-coverage","head":"dc0cabf8c7e1c93cf089a60a428c8167d8e97998","baseRef":"refs/heads/main","baseCommit":"dc0cabf8c7e1c93cf089a60a428c8167d8e97998","sourceTree":"85b992823743d067012ad1397ac4a7c65a8590f4","landing":"local-merge","absentOptional":[]} -->

## Findings

### default-provider-installation-guidance-coverage/F-09 [P3] closed - The default-card "Install Codex" and "Install OpenCode" branches are no longer run by any test

**File:** test/guidance.test.js:75
**Found:** 2026-11-15 by /audit (scope: current; lens: tests)
**Why it matters:** After F-06, any read that passes options.home takes the added-account branch. guidance.test.js:75-76 and codex.test.js:89-92 pass options.home, and their loose regexes still pass. Only the hand-copied message list checks the "Install" wording.
**Suggested fix:** One test per provider that reads with empty options and points the default location at a missing temp path (CODEX_HOME for Codex, XDG_DATA_HOME for OpenCode, saved and restored), asserting /Install/. No requirement is lost.
**Resolution:** Implemented 2026-11-16 for GitHub issue https://github.com/arkaslittlemind/token-huddle/issues/2: two real-read tests use empty options and isolated default paths, assert provider-specific Install advice and guidance output, and restore environment variables through teardown. Focused suite (22 tests), four mutation checks and npm run verify (168 app tests, 22 site tests) pass. Re-reviewed 2026-11-16 by /audit current: both real reads use empty options and isolated environment defaults; Codex is local-only, teardown restores prior environment values or absence, and existing added-account coverage remains. Focused suite rerun: 22 passed, none skipped; post-implementation Verify evidence: 168 app tests and 22 site tests passed. No new defect found in the repair. Closed in the ledger; GitHub issue remains open.
