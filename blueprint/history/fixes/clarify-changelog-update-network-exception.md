# Fix: Clarify changelog update network exception

**Type:** Fix
**Status:** verified
**Branch:** fix/clarify-changelog-update-network-exception
**Fixes:** F-24
**Issue:** https://github.com/arkaslittlemind/token-huddle/issues/6

## The problem

The Changed and Security entries under `[Unreleased]` in `CHANGELOG.md` still
say Token Huddle makes no network calls of its own, without mentioning the
GitHub Releases update check. This contradicts the current Added update entry
and the desktop app's documented privacy policy. These entries will become
public release notes through `scripts/release-notes.js`.

## The fix

Correct both statements to describe the existing exception: Token Huddle checks
this project's GitHub Releases for updates, and **Check for updates** turns
those checks off. Retain the no-login, no-credential and no-personal-data
promises and the explanation of the Local files only option. Describe update
checks accurately without implying that turning checks off cancels an install
the user already started. Keep the correction limited to the desktop app's
changelog; the landing page has its own release lookup.

## Build steps

- [x] Amend the two existing Changed and Security entries in `CHANGELOG.md`.
  **Done when:** both entries name the update-check exception and the switch,
  agree with the current Added update entry and README, and no contradictory
  unqualified desktop network promise remains in the changelog. Formatting and
  `npm run verify` pass. Review the full documentation diff together, with no
  checkpoint commits. No runtime code, dependency or build-plan change is needed.

## Verify

- Read both amended entries in context and search the full changelog for
  network/privacy claims. Preserve the historical option label as quoted text.
- Use the exported `releaseNotes()` function with the current changelog and a
  synthetic prerelease version to inspect the `[Unreleased]` output without
  editing package metadata or publishing. Confirm both corrected statements
  survive extraction. Keep the existing release-notes tests unchanged unless
  inspection reveals an in-scope defect.
- Run `npm run verify`. No new tests are needed for a prose-only correction.
- Apply configured review gates proportionately. A direct try guide is not
  needed for documentation-only wording; record the skip during implementation.

## Verification results

- Both entries now identify this project's GitHub Releases update checks and
  **Check for updates** as the switch that turns checks off. The Security entry
  retains the login/credential promise and states that the check sends no
  personal data. The historical option label remains quoted.
- Called the exported `releaseNotes()` with the actual changelog and synthetic
  version/tag `0.1.0-rc.1` / `v0.1.0-rc.1`. Assertions confirmed that both amended
  entries survive extraction, retain the switch wording, and contain no
  unqualified current desktop network promise. No package metadata changed and
  no release was published.
- `npm run verify` passed lint, formatting, 180 desktop tests, Astro check,
  site formatting, 22 site tests and the static build. The existing Astro
  Shiki/CSP warning remains.
- `git diff --check` and focused Prettier checks passed.
- Audit and Check are manual. Independent review was not selected: this is a
  prose-only correction with no change to data access, network behavior,
  permissions or security boundaries. F-24 is fixed, awaiting audit re-review.
- Try guide skipped because this is documentation-only wording. No UI changed,
  so no screenshot is needed. Changes are uncommitted on the recorded fix branch.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":3655,"specSha256":"735e2c12a8b1d685fda6341bf32f2bc7fc77a3e4321b5bb5de9fb86049d20413","branch":"refs/heads/fix/clarify-changelog-update-network-exception","head":"de15f64d141e44bf6daadad18bde6bbdfdbb6dc2","baseRef":"refs/heads/main","baseCommit":"de15f64d141e44bf6daadad18bde6bbdfdbb6dc2","sourceTree":"bc1d7ef1be41bd276372e5769cef9c0ddf74a953","landing":"local-merge","absentOptional":[]} -->

## Findings

No resolved findings to archive. F-24 remains fixed in the live ledger pending
audit re-review; all other unresolved entries remain unchanged.
