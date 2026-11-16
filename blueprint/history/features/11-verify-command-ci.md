# Feature: Verify command + CI

**From build-plan:** feature 11
**Build attempt:** 1
**Branch:** feature/verify-command-ci
**Status:** verified

## Goal

Give the project one automated gate, `npm run verify` (lint, then format check,
then tests), and run it in GitHub Actions on Windows for every pull request and
every push to `main`. An empty test suite must never count as a pass. This is a
*(chore)*: the app itself does not change.

## In scope

- **Prettier:** config matching the current style, an ignore file, `format` and
  `format:check` scripts, and one formatting-only pass over the project's
  JS/CSS/HTML.
- **ESLint:** flat config (`eslint.config.js`) with the recommended rules and
  per-area globals (Node for main, preload, scripts and tests; browser for the
  renderer), a `lint` script, and fixes for whatever it reports.
- **`npm run verify`:** lint, then `format:check`, then `npm test`, stopping at
  the first failure. Add a guard only if Node's runner passes when no test runs.
- **CI:** `.github/workflows/verify.yml` runs `npm ci` then `npm run verify` on
  `windows-latest` with Node 22, for `pull_request` and `push` to `main`.
- **Docs:** AGENTS.md Commands (add Lint, Format, Verify; drop the note that
  none of them exists yet) and the README "Tests" section.

## Out of scope

- A typecheck or build step. Neither exists (no TypeScript, no build); the
  standards' Verify order lists them only "when available".
- Release builds, tags, packaging or auto-update (steps 18-19).
- Browser tests (opt-in only, never in default Verify).
- Linting or formatting Markdown, `blueprint/`, `.agents/`, `.claude/`,
  `test/fixtures/` or `package-lock.json`. Blueprint and agent files are managed
  by their own tooling, and fixtures keep their recorded bytes.
- Pre-commit hooks.

## Build loop

`workflow.stepReview` is `feature`: build all steps, then one review.
`workflow.checkpointCommits` is `disabled`: no commits during the build;
`/complete` makes the commit. Step 4's real CI run needs the branch on GitHub.
Pushing is an outward action, so ask the maintainer first. Without approval,
step 4 records the run as not observed.

## Build steps

- [x] **1. Prettier and one formatting pass.**
  - Add `prettier` as a devDependency.
  - Add `.prettierrc.json` matching today's style: `printWidth` 120,
    `singleQuote`, semicolons, `trailingComma` "es5", `arrowParens` "always".
    The repo already uses LF line endings through `.gitattributes`.
  - Add a `.prettierignore` for the out-of-scope paths above, plus `docs/`.
  - Add the scripts `"format": "prettier --write ."` and
    `"format:check": "prettier --check ."`.
  - Run `npm run format` once. The diff must contain formatting changes only.

  **Done when:**
  - `npm run format:check` passes.
  - `npm test` still passes 51 of 51.
  - `npm run screenshot -- <scratch>/f11.png --settings` still renders both
    windows.
  - The reformat touches only `src/`, `test/` (not fixtures), `scripts/` and
    root JS/JSON config. Check with `git diff --stat`.

- [x] **2. ESLint.**
  - Add `eslint`, `@eslint/js` and `globals` as devDependencies.
  - Add `eslint.config.js` (CommonJS): `js.configs.recommended`.
    - **Node globals:** `src/main/**`, `scripts/**`, `test/**`,
      `eslint.config.js`.
    - **Browser globals:** `src/renderer/**`.
    - **Ignore:** the same paths as `.prettierignore`.
    - No stylistic rules: Prettier owns style.
  - Add the script `"lint": "eslint ."` and fix every reported problem in code.
    No `eslint-disable` unless the Notes record why.

  **Done when:**
  - `npm run lint` exits 0.
  - Every fix is listed in Notes with its file and rule.
  - `npm test` passes 51 of 51.

- [x] **3. `npm run verify` and the empty-suite rule.**
  - Add `"verify": "npm run lint && npm run format:check && npm test"`.
  - Test whether `node --test` fails when the glob matches no files, or when
    the files hold zero tests.
    - If it already fails, record that and add nothing.
    - If it passes, make `npm test` fail on zero tests with the smallest change.
      For example, a small `scripts/test.js` that runs the same `node --test`
      and fails when the reported test count is 0. Keep the same output and
      exit code otherwise.

  **Done when:**
  - `npm run verify` passes.
  - A deliberate lint error makes it fail at lint.
  - A deliberate format error makes it fail at the format check.
  - A failing test makes it fail at tests.
  - Pointing the test command at an empty glob makes it fail.
  - Each case is reverted afterwards and recorded in Notes.

- [x] **4. GitHub Actions workflow.** Add `.github/workflows/verify.yml`:
  - `on: pull_request`, and `push` to branch `main`;
  - `runs-on: windows-latest`, so the PowerShell status line tests run instead
    of being skipped;
  - `actions/checkout@v4`, then `actions/setup-node@v4` with `node-version: 22`
    and `cache: npm`;
  - `env: ELECTRON_SKIP_BINARY_DOWNLOAD: 1`, because the tests never start
    Electron;
  - `npm ci`, then `npm run verify`;
  - `permissions: contents: read`.

  **Done when:**
  - The YAML parses.
  - The steps match the list above.
  - With the maintainer's approval to push the branch, a real Actions run
    passes, with its URL and the 0-skipped test count recorded. Without
    approval, it is recorded as "not observed".

- [x] **5. Docs.**
  - AGENTS.md Commands: add `Lint: npm run lint`,
    `Format: npm run format` (and `format:check`), and
    `Verify: npm run verify`. Remove the paragraph saying none exists yet.
  - README "Tests": mention `npm run verify` and the CI workflow.

  **Done when:**
  - AGENTS.md declares the exact Verify command.
  - `npm run verify` passes on the final tree.

## Files / areas

- `package.json` (scripts, devDependencies) and `package-lock.json` (from
  `npm install`)
- `.prettierrc.json`, `.prettierignore`, `eslint.config.js` (new)
- `.github/workflows/verify.yml` (new)
- `scripts/test.js` (new, only if step 3 shows a guard is needed)
- Formatting-only edits under `src/`, `test/` and `scripts/`, and lint fixes
  where reported
- `AGENTS.md` (Commands), `README.md` (Tests)

## Data / contracts

- **Verify:** `npm run verify` exits 0 only when lint, the format check and
  tests all pass, and Node reported at least one test. It is the exact command
  AGENTS.md declares, and the command CI runs.
  - **Caught:** a test pattern that matches no files (`tests 0`).
  - **Not catchable:** a test file that contains zero tests. Node itself
    reports that as one passing test, so the count cannot show it.
- **CI triggers:** `pull_request` (any base) and `push` to `main`. One job on
  `windows-latest`, Node 22, with read-only `contents` permission.
- **No app behaviour change and no runtime dependency.** Every new package is a
  devDependency.

## Testing

- `npm test` (51 tests) is the regression check after the formatting and lint
  fixes. The screenshot run guards against a formatting change that breaks the
  renderer, which has no unit tests.
- Step 3's deliberate-failure checks prove Verify fails at each stage. They are
  manual, recorded and reverted, not committed tests.
- The CI run is real evidence only if it was observed (step 4). Never claim it
  otherwise.

## Notes for the AI

- **No network rule.** Token Huddle's no-network rule covers the app at
  runtime, not dev tooling. `npm install` and GitHub Actions are expected here.
  Nothing new may enter `dependencies`.
- **Formatting.** Keep the formatting pass separate in review: do step 1's
  reformat before any lint fix, so lint fixes are easy to read. If Prettier
  wants to change something because of a config choice, prefer adjusting
  `.prettierrc.json` to match the existing code, as long as the change is
  formatting only.
- **Lint fixes.** Lint fixes must not change behaviour. If a fix would, for
  example removing an "unused" variable that has a side effect, record it and
  keep the behaviour.
- **CHANGELOG.** No line: nothing in the app changes. This follows the fixes
  for F-01 and F-02.
- **CI cost.** The repository is private, so Windows Actions minutes count
  double against the free monthly allowance. A run is expected to take a few
  minutes. Record the observed duration in step 4.
- **Plan wording.** The build plan says "GitHub Actions on pull requests and
  `main`", and the spec follows it exactly.

### Build record

- **Step 1 (Prettier 3.10.1).**
  - `.prettierrc.json` as specified. `.prettierignore` covers `*.md`,
    `blueprint/`, `.agents/`, `.claude/`, `.impeccable/`, `docs/`,
    `test/fixtures/`, `package-lock.json`, `node_modules/`, `dist/` and
    `coverage/`.
  - The one `npm run format` pass changed 11 files under `src/` and `test/`
    (177 insertions, 83 deletions). All of it wraps lines longer than 120
    characters, mostly the demo windows and long test calls.
  - Afterwards: `format:check` passed, 51 of 51 tests passed, and the demo
    screenshot (`f11.png`, `f11-settings.png`) rendered both windows.
- **Step 2 (ESLint 10.15, @eslint/js 10.0.1, globals 17.14).** The first lint
  run reported 3 errors, all in `src/main/providers/claude.js`. All were fixed
  without changing behaviour:
  - `no-irregular-whitespace` at 122 and 261: the BOM-stripping regexes held a
    literal U+FEFF character. It is now the escape `﻿`.
    - By hand: a `settings.json` with a BOM still parses (status `conflict`, not
      `error`), and a snapshot with a BOM still gives a reading.
    - No unit test covers BOM stripping.
  - `no-unused-vars` at 222: `const { statusLine, ...rest }` is the
    drop-one-key idiom. It is allowed by `ignoreRestSiblings: true` in
    `eslint.config.js`, a rule option rather than an `eslint-disable`.
  - Afterwards: `npm run lint` exits 0, and 51 of 51 tests pass.
- **Step 3.** `node --test` exits 0 with `tests 0` when its pattern matches no
  files.
  - **Zero-test files.** A file with zero tests reports `tests 1` (the file
    itself), so no guard can see that case. That is Node's behaviour, recorded
    here.
  - **The guard.** `scripts/test.js` runs the same `node --test` and passes its
    output through. It uses the spec reporter in a terminal and TAP otherwise,
    and fails when the reported count is 0. `npm test` now calls it.
  - **Deliberate-failure checks**, each reverted:

    | Change | `npm run verify` result |
    | --- | --- |
    | Unused variable in `util.js` | exit 1 at `lint` |
    | Mis-spaced line in `util.js` | exit 1 at `format:check` |
    | Failing test file | exit 1 at `test` |
    | `test` pattern matching no files | exit 1 at `test`, with "No tests ran" |

  - Clean tree: exit 0.
- **Step 4.**
  - The YAML parses. PyYAML reads the `on` key as boolean `true`, a YAML 1.1
    quirk; GitHub reads it correctly.
  - The maintainer approved pushing and a draft PR. The branch was pushed with
    checkpoint commit `fdd0f5b`, and draft PR
    https://github.com/arkaslittlemind/token-huddle/pull/1 was opened.
  - Run https://github.com/arkaslittlemind/token-huddle/actions/runs/43639958763
    (event `pull_request`) finished with **success** in 47 s (20:54:31Z to
    20:55:18Z). The log shows `eslint .`, then `prettier --check .`, then
    51 tests: 51 pass, 0 fail, **0 skipped**, so the Windows PowerShell tests
    ran.
  - **To do at /complete:** the PR is not merged. Close it after the local
    squash merge.
- **Step 5.** AGENTS.md Commands now lists Test (with the guard), Lint, Format
  and Verify. The "none exists yet" paragraph is replaced by "no typecheck or
  build step". The README "Tests" section describes `npm run verify` and the
  workflow. The new text has no em dashes, en dashes or ellipses. Final
  `npm run verify`: exit 0, 51 of 51 tests.

### After code review (fixes approved by the maintainer)

- **Renderer globals.** `eslint.config.js` gave Node globals to every `.js`
  file, and flat config merges `globals`, so renderer files also got
  `require`. A `src/renderer` probe calling `require('fs')` passed lint.
  - **Fix:** Node globals are now limited to `src/main/**`, `scripts/**`,
    `test/**` and `eslint.config.js`. `--print-config` shows settings.js with
    `require: false, window: true`, and main, preload, scripts, tests and the
    config with `require: true`.
  - **Check:** the probe now fails with `no-undef`. Full lint passes.
- **`scripts/test.js`.**
  - It sets `process.exitCode` instead of calling `process.exit()`, so piped
    output finishes writing first.
  - It passes `FORCE_COLOR=1` to the child when stdout is a terminal, so
    colours survive the pipe, and strips colour codes before reading the
    count. That uses a constructed regex, not an `eslint-disable`.
  - **Checked:** an empty pattern gives exit 1 with "No tests ran". A failing
    test gives exit 1. Coloured spec output parses to the right count (4 for
    `util.test.js`).
- **Workflow.**
  - Added `concurrency` (group `verify-${{ github.ref }}`,
    `cancel-in-progress`), `timeout-minutes: 15`, and
    `persist-credentials: false` on checkout.
  - Actions stay pinned to `@v4` tags, not SHAs. With a read-only token, SHA
    upkeep is not worth it yet.
- **Wording.**
  - The Verify contract and AGENTS.md now state that a file with zero tests
    cannot be caught.
  - The ellipsis in the In scope list is gone.
- **Left as they are:**
  - `.impeccable/` in both ignore lists. It is a local design-plugin cache,
    ignored in `.gitignore` too.
  - The BOM `.replace` appearing twice in `claude.js`, which is out of scope.
- `npm run verify`: exit 0, 51 of 51 tests, 0 skipped.
- **Second CI run**, on the final workflow at review-fix commit `9845bcf`:
  https://github.com/arkaslittlemind/token-huddle/actions/runs/43640440335
  (event `pull_request`) finished with **success** in 53 s (21:00:13Z to
  21:01:06Z). 51 tests: 51 pass, 0 fail, 0 skipped.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":13867,"specSha256":"bbea78f53116865a8851e184f5ad0765654e2f1072f843cc08b9c8e0d66df56d","branch":"refs/heads/feature/verify-command-ci","head":"9845bcfb77cede4d5a5997f16220b47dbee95bcc","baseRef":"refs/heads/main","baseCommit":"4f8b103e38fd4b6be2ac6b060d59281c188e07fe","sourceTree":"f4cbed35974287fdaba119a01a56ab28d71525a5","landing":"local-merge","absentOptional":[]} -->

## Try it now

1. Run `npm run verify`. Expect ESLint, then "All matched files use Prettier code style!", then the tests with 51 passing and 0 skipped, and exit code 0.
2. Add a line such as `const unused = 1;` to any file under `src/main/` and run it again. Expect it to stop at the lint step with `no-unused-vars`. Remove the line.
3. Run `npm run format` after editing code to fix formatting automatically.
4. Open any pull request on GitHub. The **Verify** check runs on Windows and must pass.
