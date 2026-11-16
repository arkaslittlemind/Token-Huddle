# Fix: Remove temporary folders after tests

**Type:** Fix
**Status:** verified
**Branch:** fix/remove-temporary-folders-after-tests
**Fixes:** F-02

## The problem

The provider tests create temporary folders with `fs.mkdtempSync` and never
delete them:

- `test/claude.test.js:15-16`: `makeDirs()` creates `huddle-claude-*` and
  `huddle-data-*` on every call. This is the place F-02 names.
- `test/codex.test.js:15`: `huddle-codex-*`. Same cause, found while writing
  this spec.
- `test/opencode.test.js:14` and `:74`: `huddle-opencode-*`. Same cause.

This machine's `%TEMP%` already holds 1,572 of the Claude folders alone, and
every `npm test` adds more. A CI runner that keeps its disk would collect them
too (build plan step 11). No test result depends on the leak.

## The fix

In each of the three test files, record every folder the file creates and remove
them all in one module-level `after()` hook from `node:test`, which Node 22
provides:
`fs.rmSync(dir, { recursive: true, force: true })`.

- No product code changes, and no new dependency or helper module. Each file
  gets its own few lines, matching how each already makes its folders.
- Tests that use a folder after creating it must keep working. That is why the
  folders go in `after()` at the end of the file, not in per-test cleanup.
- OpenCode tests open SQLite databases inside their folder. Check that those
  handles are closed before `after()` runs. On Windows an open database blocks
  deletion, so the hook must not fail the run if a folder is still locked.
  Report the error rather than hide it, and do not add retries.
- The 1,572 folders already in `%TEMP%` are out of scope. They are not in the
  repository. Deleting them is a separate one-off step, done only on the
  maintainer's say-so.

## Build steps

- [x] **1. Clean up after each test file.** Add the `after()` cleanup to
  `test/claude.test.js`, `test/codex.test.js` and `test/opencode.test.js`.
  **Done when:**
  - `npm test` passes, 51 of 51 and 0 skipped.
  - Counting `huddle-claude-*`, `huddle-data-*`, `huddle-codex-*` and
    `huddle-opencode-*` folders in `%TEMP%` before and after one `npm test` run
    gives the same number.
  - F-02 is marked `fixed` in `blueprint/context/findings.md`.

## Verify

- Run `npm test` and compare the temporary-folder counts before and after. They
  should match.
- Read the three hooks. Each removes only folders its own file created, with
  `recursive` and `force`, and nothing outside `os.tmpdir()`.

## Notes

- Built 2026-11-15.
  - `claude.test.js` and `opencode.test.js` have a small `tempDir()` that
    creates and registers a folder.
  - `codex.test.js` registers its one `makeHome()` folder inline.
  - Every file has one `after()` hook that removes its own folders and logs
    `Could not remove <dir>: <reason>` instead of throwing.
- **Handles:** the OpenCode test closes its database (`db.close()`), and the
  provider closes its read-only handle (`opencode.js:83`). Nothing blocked
  removal: no warning appeared.
- **Before the fix:** one `npm test` run added 55 `huddle-*` folders to
  `%TEMP%` (1901 → 1956).
- **After the fix:** one run added 0 (1956 → 1956).
- **Tests:** `claude` 23, `codex` 9 and `opencode` 3 pass when run one file at a
  time. `npm test` passes 51 of 51, 0 skipped.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":3304,"specSha256":"9c4d14ceb565a706c7dbc6474605ecbb5b18ddf9e9199fcc3f2d6b2b9b13063c","branch":"refs/heads/fix/remove-temporary-folders-after-tests","head":"7437a934ad683f9a9913b08a09d2af53d91e13af","baseRef":"refs/heads/main","baseCommit":"7437a934ad683f9a9913b08a09d2af53d91e13af","sourceTree":"2b2ecd4c1ff3d4c01de6139b29b601db85738604","landing":"local-merge","absentOptional":[]} -->

## Findings

### remove-temporary-folders-after-tests/F-01 [P3] closed - Pass-through after a failed save has no test

**File:** test/claude.test.js:299
**Found:** 2026-11-14 by /audit independent (scope: current; lens: tests)
**Why it matters:** The spec (step 2) requires that the user's command still gets its input when saving fails, not only when parsing fails. The Windows-gated pass-through test covers valid input, non-ASCII input and `not json`, but no case where the snapshot write fails (for example an output path in a folder that does not exist). The reviewer ran that case by hand in a temporary folder: exit 0 and stdout equal to the input, so the behaviour is correct today, but a later script change could break it unnoticed.
**Suggested fix:** Add one more `run()` in the pass-through test with `out` pointing into a missing folder, and assert exit code 0 and stdout byte-equal to the input.
**Resolution:** Fixed 2026-11-15 on fix/test-pass-through-after-a-failed-save: the pass-through test now runs the fixture with an output path in a missing folder and asserts exit 0, stdout byte-equal to the input, and no file written. A temporary mutation (exit early when saving fails after a successful parse) made exactly this assertion fail; reverted. Awaiting /audit to close.
Closed 2026-11-15 by /audit (scope: last landed item 399ae6b..7437a93; all lenses).
- **Checked:** `test/claude.test.js:325-330` on `main` (7437a93) asserts exit 0,
  stdout byte-equal to the fixture, and no file at
  `claude.outputPath(<dataDir>/missing-folder, 'claude')`.
- **Runs:** `npm test` passes 51 of 51, 0 skipped, so the Windows-gated case
  ran.
- **Product code:** `SCRIPT` is unchanged. The pass-through write sits outside
  the save `try`.
- **No new defect** in the repaired lines. The temp-folder cleanup gap in the
  shared helper predates this fix (F-02).

### remove-temporary-folders-after-tests/F-02 [P3] closed - Claude tests never delete their temporary folders

**File:** test/claude.test.js:15
**Found:** 2026-11-15 by /audit (scope: last landed item 399ae6b..7437a93; lens: tests)
**Why it matters:**
- **Leak:** `makeDirs()` creates two `mkdtempSync` folders (`huddle-claude-*`,
  `huddle-data-*`) on every call. No test or hook removes them.
- **Scale:** this machine's `%TEMP%` holds 1,572 of these folders from earlier
  runs. Every `npm test` adds more, and so would every CI run on a persistent
  runner (build plan step 11).
- **Contents:** each `huddle-data-*` folder gets a copy of the status line
  script and test snapshots.
- **Correctness:** no test result depends on the leak. This is hygiene, not a
  correctness bug.

**Suggested fix:**
- Register each created folder for removal in `makeDirs()`, for example with
  `test.after(() => fs.rmSync(dir, { recursive: true, force: true }))` per
  folder, or a module-level list cleaned in one `after` hook.
- Nothing else changes. No current requirement is lost.
**Resolution:** Fixed 2026-11-15 on fix/remove-temporary-folders-after-tests.
- **Change:** `test/claude.test.js`, `test/codex.test.js` and
  `test/opencode.test.js` record every folder they create. Each removes them in
  one module-level `after()` hook (`rmSync`, recursive and force). The hook
  logs, and does not throw, when a folder cannot be removed.
- **Scope:** codex and opencode had the same leak and are fixed too.
- **Measured:** one `npm test` run added 55 temp folders before the fix and 0
  after (1956 before, 1956 after). 51 of 51 tests pass, with no
  "Could not remove" warnings. Awaiting /audit to close.

Closed 2026-11-15 by /audit (scope: current, fix/remove-temporary-folders-after-tests
at merge base 7437a93 plus the working tree; all lenses).
- **Every `mkdtempSync` is covered.** The only calls under `test/`
  (`claude.test.js:18`, `codex.test.js:28`, `opencode.test.js:18`) register
  their folder for the file's `after()` hook.
- **Every test write stays inside those folders.** The two "absent" paths
  (`huddle-codex-does-not-exist`, `huddle-opencode-none`) are never created.
- **Signals:** `npm test` passes 51 of 51, 0 skipped, 0 todo, with no
  "Could not remove" warnings. `huddle-*` in `%TEMP%` stayed at 1956 before
  and after the run.
- **No new defect.** The hooks delete only paths returned by `mkdtempSync`
  under `os.tmpdir()`. A failure is logged, which the spec requires, and does
  not fail the run.

## Try it now

Skipped: this fix changes test files only, with nothing to observe in the app. Run `npm test` and compare the count of `huddle-*` folders in `%TEMP%` before and after: it stays the same.
