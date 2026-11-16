# Fix: Keep update progress visible

**Type:** Fix
**Status:** verified
**Branch:** fix/keep-update-progress-visible
**Fixes:** F-25
**Issue:** https://github.com/arkaslittlemind/token-huddle/issues/7

## The problem

In `src/main/updates.js`, `reduce()` deliberately preserves an install already
started by the user when update checks are disabled. `present()` hides every
update state when checks are off, including downloading and ready. Both the
tray and Settings therefore lose the ongoing install status, even though
`main.js` still restarts the app when the download finishes.

## The fix

Make the checks-disabled early return apply only when the update is not busy,
using the existing `isBusy()` predicate. Keep the current downloading percentage
in the tray, downloading status in Settings, and restarting status visible with
checks off. Keep these states non-clickable with no action.

Preserve the unpackaged-app guard, disabled behavior for every non-busy state,
portable download links, and the existing install consent and state transitions.
No new download, network call, setting, dependency or renderer change is needed.
Issue #6's privacy wording is a separate work item.

## Build steps

- [x] Adjust `present()` in `src/main/updates.js`, add focused regression
  coverage in `test/updates.test.js`, and record the behavior change under
  `[Unreleased]` / Fixed in `CHANGELOG.md`.
  **Done when:** disabling checks after starting an install preserves its tray
  and Settings status through download progress and ready; no install action
  appears in either busy state; disabled non-busy states remain quiet; unpackaged
  behavior and portable links are unchanged; configured tests and
  `npm run verify` pass. Review the complete diff together with no checkpoint
  commits except a separately approved checkpoint if independent review requires it.

## Verify

- Drive `reduce()` through available, install-clicked, progress, disabled,
  further progress and downloaded events. Assert exact `present()` results
  with `enabled: false` for downloading and ready.
- Cover disabled non-busy states, including an available update and a failed
  install, to prove this fix does not expose a new action when checks are off.
- Check the unpackaged guard with a busy state, and retain portable link tests.
- Run the configured tests and `npm run verify`. Use synthetic update state only;
  never fetch or install a release to reproduce this bug. Capture isolated
  Electron UI evidence when available, and distinguish presenter test evidence
  from any actual tray or Settings observation.
- Apply the configured review and try-guide policies. Preserve the no-login
  rule and existing update-only network policy.

## Verification results

- `node scripts/test.js test/updates.test.js`: 18 tests passed, including three
  new regression tests for busy status, disabled non-busy states and unpackaged
  behavior.
- `npm run verify`: lint, formatting, 180 desktop tests, Astro check, site
  formatting, 22 site tests and static build passed on Windows.
- An isolated Electron profile with demo data and synthetic presenter output
  showed downloading and restarting status in the real Settings renderer with
  checks unchecked and the action button hidden. No release was downloaded or
  installed. Tray labels were verified through presenter assertions, not a
  native tray-menu observation.
- Evidence: `C:/Users/<user>/AppData/Local/Temp/huddle-issue7-ObeBxv/` contains
  `widget.png`, `downloading.png` and `ready.png`. Captures were visually inspected.
  The first capture failed with `UnknownVizError`; disabling hardware acceleration
  in the temporary capture harness allowed the retry to pass.
- `git diff --check` passed. Astro's existing Shiki/CSP warning remains.
- Check and Audit are manual. Independent review is selected because this affects
  install progress visibility; it awaits approval for the verified checkpoint.

## Try it now

Run or do:

```powershell
node -e "const u=require('./src/main/updates'); console.log(u.present({status:'downloading',version:'0.2.0',percent:42},{packaged:true,portable:false,enabled:false}).label)"
```

Expected:

```text
Downloading update 0.2.0 (42%)
```

This proves:

The presenter keeps the tray label for a synthetic active download when checks
are disabled, without fetching or installing a release.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":4369,"specSha256":"995a5c3188f4eb1465a465d50bbb3c0703aec0c7fd4497e6c7693f063cec1a5a","branch":"refs/heads/fix/keep-update-progress-visible","head":"6e61bda9c98d4f084722aa799d6e102e861ed1d6","baseRef":"refs/heads/main","baseCommit":"5669283df28eb1d94587be552cad9f8fe3294058","sourceTree":"bcee72993db5ea75b1250d556b590bf9d054d5a8","landing":"local-merge","absentOptional":[]} -->

## Findings

### keep-update-progress-visible/F-25 [P3] closed - Turning checks off during an install hides the download, then the app restarts anyway

**File:** src/main/updates.js:80
**Found:** 2026-11-15 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** By design, `disabled` keeps a busy install (reduce) and `update-downloaded` still calls quitAndInstall (main.js). But present() returns the quiet "Update checks are off." view whenever `enabled` is false, so after a user clicks Install and then unticks Check for updates, the tray item and Settings progress disappear and the app later restarts into the new version with no visible cue. The click was consent, so the impact is a confusing UI, not an unwanted install.
**Suggested fix:** In present(), return the downloading and ready views before the `!enabled` early return (only for busy states). No requirement is lost.
**Resolution:** Fixed on 2026-11-17 for GitHub issue https://github.com/arkaslittlemind/token-huddle/issues/7. Closed by fresh independent Codex review on 2026-11-16 UTC against `6e61bda9c98d4f084722aa799d6e102e861ed1d6`. Re-examined the complete delta, reducer/presenter and main/Settings callers; no new defect found. Independently reran `npm run verify`: 180 desktop tests and 22 site tests passed, including busy/non-busy/unpackaged regressions. Inspected existing isolated Electron Settings captures: downloading and restarting status remain visible with checks unchecked and no action button. Tray labels are supported by presenter assertions and menu wiring inspection, not a native tray observation. GitHub issue remains open; no release was downloaded or installed.


## Independent review

# Independent Review

**Status:** passed
**Target commit:** 6e61bda9c98d4f084722aa799d6e102e861ed1d6
**Base commit:** 5669283df28eb1d94587be552cad9f8fe3294058
**Base ref:** main
**Spec hash:** 995a5c3188f4eb1465a465d50bbb3c0703aec0c7fd4497e6c7693f063cec1a5a
**Prepared by:** codex
**Builder model:** gpt-6.1-sol
**Requested reviewer:** codex
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-11-16T18:38:26.2415636Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-11-16T18:40:08Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and the complete
`5669283df28eb1d94587be552cad9f8fe3294058..6e61bda9c98d4f084722aa799d6e102e861ed1d6`
delta in a fresh isolated subagent without the builder conversation. Run all
Audit lenses from scratch. Do not edit product code, accept findings, or reuse
the existing findings as the review scope.

## Commands

- `git rev-parse HEAD`, `git merge-base main HEAD`, `git symbolic-ref --short HEAD`: pass; target and base match the request on `fix/keep-update-progress-visible`.
- `Get-FileHash blueprint/context/current-feature.md -Algorithm SHA256`: pass; exact hash matches the request. The spec is tracked, so no local snapshot is required.
- `git status --porcelain=v1 --untracked-files=all`, `git diff --name-only HEAD`: pass; only permitted review evidence differs from target.
- `git diff 5669283df28eb1d94587be552cad9f8fe3294058 HEAD`: pass; reviewed the complete target delta, excluding the findings ledger as a code-review checklist.
- `npm run verify`: pass; lint, formatting, 180 desktop tests (zero skipped), Astro check, site formatting, 22 site tests and static build.
- `git diff --check 5669283df28eb1d94587be552cad9f8fe3294058 HEAD`: pass.
- Active spec's synthetic presenter try-guide: pass; printed `Downloading update 0.2.0 (42%)` with checks disabled.

## Evidence

- Fresh isolated reviewer received the handoff and project instructions, without the builder conversation. Model identity provenance: parent runtime metadata reports `gpt-6.1-sol`, and the native spawn contract specifies model inheritance with no override. This isolated child does not separately expose a runtime-info tool. Identity is declared metadata under the project contract.
- Reviewed `src/main/updates.js`, `test/updates.test.js`, `CHANGELOG.md`, the full spec delta and relevant `src/main/main.js` / `src/renderer/settings.js` callers against the coding standards, no-login rule and changelog requirement. No credential access, networking, dependencies or persistence behavior was added. The busy predicate adds constant work and reuses the existing state contract.
- Tests drive a real reducer sequence through available, install-clicked, progress, disabled, further progress and downloaded. Exact presenter results prove both busy states have no action or clickability; disabled non-busy states, unpackaged precedence and existing portable behavior remain covered. No focused, skipped or placeholder tests found in the affected suite.
- Inspected `C:/Users/<user>/AppData/Local/Temp/huddle-issue7-ObeBxv/downloading.png` and `ready.png`: existing real Settings-renderer captures with synthetic state show checks unchecked, the respective status text and no action button. These are builder-captured evidence independently inspected here, not a fresh reviewer-run Electron interaction.
- Main wiring passes current settings to the presenter, pushes Settings after toggling, and builds tray menus on opening using the current label/clickability. Existing download consent and updater events remain unchanged. No real release download or installation was attempted.
- Scope excludes generated output, dependencies and unrelated project areas. Review writes are limited to this receipt and the findings ledger; dashboard state and product code were not changed.

## Findings

- No new findings across quality, security, performance and tests. F-25 closed after independent re-review. Other ledger findings remain unchanged and outside this fix's scope.

## Remaining risk

- Native tray-menu appearance and the real updater download/install/restart flow were not exercised. Presenter tests, caller inspection and existing synthetic Settings captures cover this small presentation-only change without downloading a release.
- Existing Astro Shiki/CSP build warning remains; static build passes. No verification command was unavailable. Check was not required by the pending request and was not separately run.
