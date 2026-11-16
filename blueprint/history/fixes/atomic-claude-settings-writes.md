# Fix: Atomic Claude settings writes

**Type:** Fix
**Status:** verified
**Branch:** fix/atomic-claude-settings-writes
**Fixes:** F-21
**Issue:** https://github.com/arkaslittlemind/token-huddle/issues/5

## The problem

`saveSettings` in `src/main/providers/claude.js` writes directly over Claude
Code's `settings.json`. Both Connect and Disconnect use it. Uninstall cleanup
arms an unconditional 10-second exit timer before Electron is ready, so it can
terminate a disconnect between truncating the settings file and finishing its
write. Code inspection confirms the unsafe write path; actual corruption from
this timing window has not been reproduced.

## The fix

Write the complete serialized settings to a uniquely named temporary file in
the same directory, close it, then rename it over `settings.json`. Never remove
or truncate the destination as a fallback if replacement fails. Propagate write
and rename errors through the existing callers and clean up this operation's
temporary file on ordinary failure without masking the original error. A forced
exit may leave a temporary file, but must leave the original settings intact
until the complete replacement is ready.

Keep the existing indentation, trailing newline, Connect backup, missing-file
behavior, and protection of user-owned status lines and unrelated settings.
Keep uninstall's bounded, best-effort cleanup behavior. Use Node built-ins and
keep the change local to the Claude settings writer; power-loss durability and
coordination with concurrent external editors are outside this fix.

## Build steps

- [x] Replace the direct settings write, add focused regression coverage in
  `test/claude.test.js` (and cleanup coverage if needed), and add a Fixed entry
  under `[Unreleased]` in `CHANGELOG.md`.
  **Done when:** Connect and Disconnect successfully replace settings on Windows;
  failed or interrupted staging writes and failed renames preserve the original
  settings bytes; normal failures leave no temporary files; existing backup,
  formatting, missing-file and user-status-line tests pass; `npm run verify`
  passes. Review the complete diff together, with no checkpoint commits.

## Verify

- Exercise the public connection methods against temporary tool folders only.
  Inject staging-write and rename failures, including a partial temporary write,
  and assert that destination bytes remain unchanged and errors reach callers.
- Pause before replacement and observe the original destination unchanged, then
  allow replacement and assert the complete new JSON. Use a deterministic seam
  rather than racing the uninstall timer. Do not claim this reproduces the
  original Electron timing window.
- Cover a successful replacement of an existing file and creation when settings
  are missing, preserving the existing backup and indentation assertions.
- Run the configured tests and `npm run verify`. No real Claude configuration,
  credentials, network calls, UI changes, or new dependencies are needed.

## Verification results

- `npm test -- --test-name-pattern="connect|disconnect" test/claude.test.js`
  passed all 177 desktop tests (the configured script retained its full glob).
- `npm run verify` passed lint, formatting, 177 desktop tests, Astro check,
  site formatting, 22 site tests and the static build on Windows.
- Eight new regression cases cover replacement boundaries and open, partial-write
  and rename failures for both Connect and Disconnect.
- `git diff --check` passed. The build emitted an Astro Shiki/CSP warning.
- Try guide skipped: this defensive write change has no safe direct user-visible
  signal. The original Electron timeout race was not reproduced.
- Independent review is required for this external settings change and awaits
  explicit approval to commit the verified checkpoint.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":3805,"specSha256":"9ece59177d9440a9e2892501b50d135099bcd55a5fec089eff94a21f2cced812","branch":"refs/heads/fix/atomic-claude-settings-writes","head":"ca2295edacc53c91688a4a84b8474731daf1a88e","baseRef":"refs/heads/main","baseCommit":"c59ce68d4f627a5aca29fabdaad9a39100f42c9a","sourceTree":"242764a8412adb3b918fa8cb812b7e8d0c0f37e2","landing":"local-merge","absentOptional":[]} -->

## Findings

### atomic-claude-settings-writes/F-21 [P3] closed - Cleanup's hard exit timer can cut a non-atomic write to Claude Code's settings.json

**File:** src/main/main.js:623
**Found:** 2026-11-15 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** runCleanup arms `app.exit(0)` 10 s after process start. The Claude disconnect it awaits rewrites settings.json with `fs.writeFile` (src/main/providers/claude.js:127), which truncates the file and then writes it. If Electron start-up on a slow machine pushes the disconnect to the moment the timer fires, the process can exit between truncate and write and leave the user's Claude Code settings empty or partial. The window is milliseconds and no run has shown it, so this is a lead, not a confirmed defect.
**Suggested fix:** Write settings.json through a temporary file in the same folder and rename it over the original, so an interrupted write leaves the old file. No requirement is lost.
**Resolution:** Fixed on 2026-11-16 for GitHub issue https://github.com/arkaslittlemind/token-huddle/issues/5: settings writes use an exclusive temporary file in the same directory, close it, then rename over the destination. Closed by independent review of ca2295edacc53c91688a4a84b8474731daf1a88e on 2026-11-16: both public connection methods preserve the original bytes until replacement, reject staging and rename errors, and clean their temporary files on ordinary failures. Eight regression cases and all 177 desktop tests passed on Windows through `npm run verify`; the full verification command passed. The original Electron timeout race was not reproduced, and forced exit can leave a temporary file. GitHub issue remains open.


## Independent review

# Independent Review

**Status:** passed
**Target commit:** ca2295edacc53c91688a4a84b8474731daf1a88e
**Base commit:** c59ce68d4f627a5aca29fabdaad9a39100f42c9a
**Base ref:** main
**Spec hash:** 9ece59177d9440a9e2892501b50d135099bcd55a5fec089eff94a21f2cced812
**Prepared by:** codex
**Builder model:** gpt-6.1-sol
**Requested reviewer:** codex
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-11-16T18:20:19.0339430Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-11-16T18:22:04Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and the complete `c59ce68d4f627a5aca29fabdaad9a39100f42c9a..ca2295edacc53c91688a4a84b8474731daf1a88e`
delta in an isolated subagent without the builder conversation. Run all Audit
lenses from scratch. Do not edit product code, accept findings, or reuse the
existing findings as the review scope.

## Commands

- `git rev-parse HEAD`: pass, matches Target commit.
- `git merge-base main HEAD`: pass, matches Base commit.
- `Get-FileHash blueprint/context/current-feature.md -Algorithm SHA256`: pass,
  matches Spec hash; the spec is tracked.
- `git status --porcelain=v1 --untracked-files=all`: pass, only the two permitted
  evidence paths differ after review.
- `git diff --check main...HEAD`: pass.
- `npm run verify`: pass on Windows with Node v22.23.5. Lint, formatting,
  177 desktop tests (zero skipped), Astro check, site formatting, 22 site tests
  and static build passed.

## Evidence

- Reviewed the complete recorded base-to-target delta: Claude provider, regression
  tests, changelog and active spec. Request and findings files were excluded from
  product-code scope; existing findings were context only.
- Read the provider's settings loader and public connection methods, their IPC
  callers, uninstall cleanup and cleanup tests, plus the applicable standards and
  overview privacy/data rules. No generated or third-party code was reviewed.
- Quality: the change stays local and uses Node built-ins, preserving formatting,
  backup, missing-file and user-owned status-line behavior. The changelog records
  the behavior change under Unreleased.
- Security: exclusive same-directory staging, close before replacement and no
  destination deletion fallback preserve original bytes on ordinary failure.
  No credential or network access was added.
- Performance: bounded asynchronous file operations occur only on settings
  changes; no new polling, collections or dependencies were introduced.
- Tests: eight new cases exercise both public methods at the replacement boundary
  and with open, partial-write and rename failures. They check original bytes,
  error identity and temporary-file cleanup. Existing Windows bridge and uninstall
  cleanup tests passed; no focused, skipped or placeholder tests were added.
- Reviewer started without the builder transcript. Exact model identity comes
  from parent runtime metadata reporting gpt-6.1-sol and the spawn contract that
  a child without a model override inherits that model.

## Findings

- No new findings across the four lenses.
- F-21 closed after reviewing the repaired writer and passing Windows regression
  evidence. Other ledger entries remain unchanged and outside this fix's scope.

## Remaining risk

- The original Electron timeout race was not reproduced. Replacement-boundary
  and partial-write tests provide deterministic evidence instead of a timed
  process-termination experiment. Forced exit may leave a temporary file.
- Power-loss durability and concurrent external edits are outside the approved
  scope. No UI changed, so no screenshot was needed; Check was not required.
- Astro emitted its existing Shiki inline-style/CSP warning during the successful
  site build. No verification command was unavailable.
