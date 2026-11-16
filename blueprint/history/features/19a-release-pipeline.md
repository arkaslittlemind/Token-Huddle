# Feature: Release pipeline

**From build-plan:** feature 19a
**Build attempt:** 1
**Branch:** feature/release-pipeline
**Status:** verified

## Goal

Pushing a version tag (`vMAJOR.MINOR.PATCH`) builds the Windows installer and
portable `.exe` in GitHub Actions and attaches them to a **draft** GitHub
Release, with SHA-256 checksums and release notes taken from `CHANGELOG.md`.
The maintainer reviews the draft and publishes it by hand. The release also
carries the update files electron-updater reads, so 19b can update from it.

Proven now with a throwaway pre-release tag. `v0.1.0` itself is published
later, when the repository goes public (step 22): a private repository's
releases need a token the app must never hold.

## In scope

- `scripts/release-notes.js`: given a tag, checks it against `package.json`
  `version` and prints that version's `CHANGELOG.md` section as release notes.
- `.github/workflows/release.yml`: on a pushed `v*` tag, verify, build both
  targets, upload them as a draft release, add `SHA256SUMS.txt`, set the notes.
- `package.json` `build.publish`: GitHub provider for this repository, draft
  releases, so electron-builder uploads the update files (`latest.yml` or the
  pre-release channel file, plus `.blockmap` files) next to the `.exe` files.
- `npm run dist` stays local-only (`--publish never`).
- Docs: a README "Releasing" section, the `dist` command and the release flow
  in `AGENTS.md` Commands (`dist` was missed in step 18), a `CHANGELOG.md` line.
- One test release with a pre-release tag, deleted afterwards.

## Out of scope

- Anything in the app: no updater code, no update notice, no setting, no
  README privacy wording (all 19b).
- Code signing (step 20). Builds stay unsigned.
- Publishing `v0.1.0`, making the repository public (step 22).
- Bumping the version or moving `[Unreleased]` to a version section: that is
  the maintainer's release step, documented here, not done in this feature.
- Changing the Verify workflow.

## Build loop

`workflow.stepReview` is `feature`: build all steps, then one review of the
whole feature. `workflow.checkpointCommits` is `disabled`. Run the narrow
check per step and `npm run verify` once at the end. `/complete` makes the
final commit. Step 4 pushes a branch and a tag and creates and deletes a draft
release on GitHub: each of those needs the maintainer's explicit go-ahead in
the chat at that moment.

## Build steps

- [x] **1. Release notes script, tested.** `scripts/release-notes.js` with a
  pure `releaseNotes({ changelog, tag, version })` and a small CLI
  (`node scripts/release-notes.js <tag>` prints the notes to stdout, exits 1
  with a one-line reason on stderr). Rules:
  - the tag must be `v` + `package.json` `version` exactly, else fail
    ("tag v0.2.0 does not match package.json version 0.1.0");
  - a release version (no `-`) uses its `## [X.Y.Z]` section (heading may
    carry ` - YYYY-MM-DD`); missing or empty section fails ("CHANGELOG.md has
    no [0.2.0] section; move [Unreleased] to it first");
  - a pre-release version (`0.1.0-rc.1`) uses the `## [Unreleased]` section;
  - the section body runs to the next `## ` heading, excludes the heading and
    the link references at the end of the file, and is trimmed.
  `test/release-notes.test.js` covers each rule, using the real
  `CHANGELOG.md` shape (Keep a Changelog headings, `### Added` subsections).
  *Done when:* the tests pass, and `node scripts/release-notes.js v0.1.0`
  run today fails with the "no [0.1.0] section" message.

- [x] **2. Publish config and local build.** In `package.json`: `build.publish`
  = `{ "provider": "github", "owner": "arkaslittlemind", "repo":
  "token-huddle", "releaseType": "draft" }` (replaces `null`); `dist` script
  gets `--publish never`. Update `test/packaging.test.js` if it asserts on
  `publish`. Check the packaged `resources/app-update.yml` holds only
  provider, owner, repo (and electron-builder's own fields), no token.
  *Done when:* `npm run dist` builds both `.exe` files without trying to
  publish, `dist/` also holds the update file and `.blockmap` files, and
  `dist/win-unpacked/resources/app-update.yml` names this repository and no
  token.

- [x] **3. Release workflow and docs.** `.github/workflows/release.yml`:
  - trigger: `push` of tags matching `v*.*.*`; `permissions: contents: write`;
    `runs-on: windows-latest`; `timeout-minutes: 30`; checkout with
    `persist-credentials: false`; Node 22 with npm cache; `npm ci`;
    `npm run verify`;
  - `node scripts/release-notes.js "$GITHUB_REF_NAME" > notes.md` before the
    build, so a wrong tag or missing section fails fast;
  - `node scripts/make-icon.js`, then `npx electron-builder --win --publish
    always` with `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` (Actions' own
    per-run token; never in the app or the repository);
  - `SHA256SUMS.txt` for every `.exe` in `dist/`, one `"<lowercase hash>
    <file name>"` line each (PowerShell `Get-FileHash`), uploaded with
    `gh release upload`;
  - `gh release edit` sets the notes from `notes.md`, and `--prerelease`
    when the version contains `-`. The release stays a draft.
  *As shipped (after the step 4 finding):* the build runs `npm run dist`
  (`--publish never`); `SHA256SUMS.txt` is written to `dist/`; one
  `gh release create --draft --verify-tag` call, the only step with
  `GH_TOKEN`, attaches the `.exe` files, the `.blockmap` files, `latest.yml` and
  `SHA256SUMS.txt`, with the title `X.Y.Z` (`--title`), the notes and, for a
  pre-release, `--prerelease`.
  Docs: README "Releasing" (bump `version`, move `[Unreleased]` to
  `## [X.Y.Z] - date` with its link, commit, push a `vX.Y.Z` tag, review the
  draft, publish), `AGENTS.md` Commands (`npm run dist`, release by tag),
  `CHANGELOG.md` `[Unreleased]` line.
  *Done when:* `npm run verify` passes (Prettier formats the YAML) and the
  workflow file passes `gh workflow view` after push in step 4.

- [x] **4. Test release (chore, maintainer-approved actions).** On a
  throwaway branch, set `version` to `0.1.0-rc.1`, commit, tag
  `v0.1.0-rc.1`, push the tag. Check the draft release; record which update
  file name electron-builder used for the pre-release (for 19b). Download
  both `.exe` files and compare their SHA-256 with `SHA256SUMS.txt`. Then
  delete the draft release, the remote and local tag, and the throwaway
  branch. The version bump never reaches `main`.
  *Done when:* the workflow run passed; the draft release `v0.1.0-rc.1` held
  `Token-Huddle-Setup-0.1.0-rc.1.exe`, `Token-Huddle-0.1.0-rc.1-portable.exe`,
  the installer's `.blockmap` (electron-builder makes none for the portable
  build, observed in step 2), the update file and `SHA256SUMS.txt`, was marked
  pre-release, and showed the `[Unreleased]` notes; the hashes matched; the
  release, tags and branch are gone. Results recorded in this spec.

- [x] **5. Repair F-22 and F-23 (independent review).** F-22 [P1]:
  `test/release-notes.test.js` requires the real `CHANGELOG.md`
  `[Unreleased]` to start with "Nothing has been released yet", so the
  README release steps (which leave an empty `[Unreleased]`) make Verify,
  and so the release workflow, fail. Replace that test with one that holds
  for any valid changelog state (for example: the real file has an
  `[Unreleased]` heading, and the notes for the current `package.json`
  version can be produced once its section exists), and add a test that
  applies the README's release edit to the real changelog and gets notes
  for that version. F-23 [P3]: README step 2 tells the maintainer to drop
  the "Nothing has been released yet" placeholder line. Also bring the
  spec's step 3 and Data / contracts in line with the shipped
  `gh release create` flow (record, not new behaviour).
  *Done when:* following README "Releasing" step 2 on a copy of the real
  `CHANGELOG.md` (with `version` set to `0.1.0`) leaves `npm test`
  passing and `node scripts/release-notes.js v0.1.0` printing the notes;
  `npm run verify` passes on the unchanged repository; F-22 and F-23 are
  marked `fixed` in `findings.md`.

## Files / areas

- `scripts/release-notes.js` (new), `test/release-notes.test.js` (new)
- `.github/workflows/release.yml` (new)
- `package.json` (`build.publish`, `dist` script); `test/packaging.test.js`
  if affected
- `README.md`, `AGENTS.md` (Commands), `CHANGELOG.md`
- Unchanged: `.github/workflows/verify.yml`, everything under `src/`

## Data / contracts

- **Tag:** `v` + `package.json` `version`; release versions `X.Y.Z`,
  pre-releases `X.Y.Z-<id>` (test only).
- **Release:** created as a draft by one `gh release create` call in the
  workflow under the tag name (not by electron-builder's publisher);
  publishing is manual. Assets: installer, portable `.exe`, `.blockmap`
  files, the electron-builder update file, `SHA256SUMS.txt`.
- **SHA256SUMS.txt:** `<64 lowercase hex>  <file name>` per line (two
  spaces), `.exe` files only, checkable with `sha256sum -c` or
  `Get-FileHash`.
- **Notes:** the `CHANGELOG.md` section of that version, verbatim;
  `[Unreleased]` for pre-releases.
- **Tokens:** only Actions' per-run `GITHUB_TOKEN`, scoped to
  `contents: write` in this workflow. No secret is added to the repository,
  the app, or `app-update.yml`. Token Huddle still makes no network calls in
  this feature.

## Testing

- `npm test`: `test/release-notes.test.js` (tag check, release section,
  pre-release section, missing and empty section, link references
  excluded). Baseline at spec time: `npm run verify` passes, 139 tests.
- Manual: step 2 local build check; step 4 test release on GitHub. Record
  observed results; do not claim a published release.

## Notes for the AI

- The repository is private and stays private in this feature. Draft
  releases on a private repository are visible only to its members; that is
  enough to prove the pipeline.
- Keep `.npmrc` (`legacy-peer-deps=false`); CI's `npm ci` depends on it.
- Without `--publish never`, electron-builder can publish on its own when it
  detects CI and a tag; the local `dist` script must never publish.
- If electron-builder's GitHub publisher refuses to upload to a draft it did
  not create, or names the pre-release update file differently, record what
  happened and adapt the workflow; do not change the app.
- Every push, tag and release action in step 4 waits for the maintainer's
  explicit yes in the chat at that moment, as does deleting them.

## Implementation record

Observed on 2026-11-15 on branch `feature/release-pipeline`:

- `npm run verify` passes (148 tests before the review fixes).
- `node scripts/release-notes.js v0.1.0` exits 1: "CHANGELOG.md has no
  [0.1.0] section; move [Unreleased] to it first".
- `npm run dist` (`--publish never`) built both `.exe` files, `latest.yml`
  and the installer's `.blockmap` (none for the portable build), without
  publishing. `dist/win-unpacked/resources/app-update.yml` holds owner,
  repo, `provider: github`, `releaseType: draft`, `updaterCacheDirName`,
  and no token.
- Deviation, deliberate: an existing but empty section fails with "the [X]
  section of CHANGELOG.md is empty" (clearer than the missing-section text);
  a missing `[Unreleased]` omits the "move [Unreleased]" hint.
- Code review fixes: `GH_TOKEN` only on the three steps that write the
  release (not visible to `npm ci` install scripts or Verify);
  `SHA256SUMS.txt` written with LF endings and no BOM; link references are
  dropped only at the end of a section; a comment on why the release
  workflow has no concurrency group; `coding-standards.md` lists
  `release-notes.js` and the workflows.

Step 4, test releases on GitHub (each push and delete approved by the
maintainer in the chat):

- `v0.1.0-rc.1` (run 43733358730): workflow passed, but electron-builder's
  own publishing (`--publish always`) created **two** drafts, one per
  target, because a draft cannot be found by its tag; the installer's
  `.blockmap` landed alone in the second. Checksums of the downloaded
  `.exe` files matched (`sha256sum -c` OK, LF endings). Both drafts, the
  tag and the throwaway branch were deleted.
- Fix (commit `45231f6`): the workflow builds with `npm run dist`
  (`--publish never`) and creates the draft with one `gh release create
  --draft --verify-tag` call that attaches every file, the notes and the
  pre-release flag. `releaseType: draft` was removed from
  `build.publish`: it only steered electron-builder's publisher, which the
  workflow no longer uses, so `app-update.yml` now holds provider, owner
  and repo only.
- `v0.1.0-rc.2` (run 43734130345): every step passed; exactly one draft,
  marked pre-release, titled `0.1.0-rc.2`, holding
  `Token-Huddle-Setup-0.1.0-rc.2.exe`, `Token-Huddle-0.1.0-rc.2-portable.exe`,
  `Token-Huddle-Setup-0.1.0-rc.2.exe.blockmap`, `latest.yml` and
  `SHA256SUMS.txt`; notes from `[Unreleased]`; `sha256sum -c` OK for both
  downloaded `.exe` files. Then the draft, the remote and local tag and the
  throwaway branch were deleted; the repository has no releases and no rc
  tags. The version bump never reached `main`.
- For 19b: the update file is `latest.yml` for a pre-release too (no
  separate channel file).


<!-- blueprint:completion {"schemaVersion":2,"specBytes":13189,"specSha256":"a9e278ee731520589fa0038d635e485e9410dbf9ae1111efc523814bdfa2953c","branch":"refs/heads/feature/release-pipeline","head":"55bcbebcd2fab186a1e14569d9df48029689f680","baseRef":"refs/heads/main","baseCommit":"a786b99cd35408732eb7a209d7f45ca20b84a276","sourceTree":"b0bed3c597aa45db9e7f52ae647a8e25a3966e9c","landing":"local-merge","absentOptional":[]} -->

## Findings

### 19a/F-22 [P1] closed - Following the README release steps makes the release workflow's own Verify step fail

**File:** test/release-notes.test.js:93
**Found:** 2026-11-15 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** The test "the real CHANGELOG.md has an Unreleased section a pre-release can use" reads the real CHANGELOG.md and requires `[Unreleased]` to be non-empty and to start with "Nothing has been released yet". README "Releasing" step 2 (README.md:140) tells the maintainer to rename `[Unreleased]` to `[X.Y.Z]` and add a fresh empty `[Unreleased]`. Simulating that edit on the current CHANGELOG.md, `releaseNotes` throws "the [Unreleased] section of CHANGELOG.md is empty", so this test fails, `npm run verify` fails, and release.yml stops at its Verify step before building. The documented procedure therefore cannot produce the `v0.1.0` release (or any later release) without first breaking the test.
**Suggested fix:** Make the real-file test check something that holds in every documented state (for example that CHANGELOG.md has a `## [Unreleased]` heading and that `releaseNotes` either returns notes or throws the expected empty-section error), or drop it and keep the fixture-based tests. No requirement is lost.
**Resolution:** The real-file test now only requires a `## [Unreleased]` heading; a new test applies README "Releasing" step 2 to the real CHANGELOG.md (removing the placeholder line, then adding a sample entry when [Unreleased] has no entries, so it holds in every changelog state) and gets notes for that version. Verified: with step 2 applied to the real file for 0.1.0, `npm test` passes (150) and `node scripts/release-notes.js v0.1.0` prints the notes. Awaiting re-review. Closed 2026-11-15 by independent re-review at 55bcbeb: the real-file test now needs only a `## [Unreleased]` heading (test/release-notes.test.js:106); README step 2 applied in memory to a temporary copy of the real CHANGELOG.md with version 0.1.0, and again for a later 0.2.0 cut, left test/release-notes.test.js passing (11/11) and `node scripts/release-notes.js v0.1.0` exiting 0 with the notes. No new defect in the repair.

### 19a/F-23 [P3] closed - The release steps leave the "Nothing has been released yet" sentence in the first release's notes

**File:** README.md:140
**Found:** 2026-11-15 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** CHANGELOG.md `[Unreleased]` opens with "Nothing has been released yet. The first release will be `0.1.0`." README step 2 only says to rename the section, so the `v0.1.0` notes would start with that sentence (confirmed by running `releaseNotes` on the renamed section).
**Suggested fix:** Add to README step 2 (or the changelog itself) that this placeholder sentence is removed when the first version section is cut. No requirement is lost.
**Resolution:** README step 2 now says to delete the line that starts with "Nothing has been released yet" for the first release; the new test checks the cut notes do not contain it. Awaiting re-review. Closed 2026-11-15 by independent re-review at 55bcbeb: README.md:140 step 2 tells the maintainer to delete the placeholder line; on the simulated cut the 0.1.0 notes start with `### Added` and do not contain it, and test/release-notes.test.js asserts that.

## Independent review

**Status:** passed
**Target commit:** 55bcbebcd2fab186a1e14569d9df48029689f680
**Base commit:** a786b99cd35408732eb7a209d7f45ca20b84a276
**Base ref:** refs/heads/main
**Spec hash:** a9e278ee731520589fa0038d635e485e9410dbf9ae1111efc523814bdfa2953c
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-11-15T16:28:17Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-11-15T16:29:53Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Handoff

Review the active spec and the complete `a786b99cd35408732eb7a209d7f45ca20b84a276..55bcbebcd2fab186a1e14569d9df48029689f680` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

### Commands

- `git rev-parse HEAD`, `git merge-base refs/heads/main HEAD`, `git status --porcelain`, `sha256sum blueprint/context/current-feature.md`: pass (HEAD, merge base and spec hash match the request; only review.md differs)
- `npm run verify`: pass (lint, format check, 150 tests, 0 failing)
- `node --test test/release-notes.test.js` on a temporary copy outside the repository with README "Releasing" step 2 applied to the real CHANGELOG.md and `version` 0.1.0: pass (11/11)
- `node scripts/release-notes.js v0.1.0` on that copy: pass (exit 0, notes start with `### Added`, no placeholder line)
- Same test file on a later simulated 0.2.0 cut: pass (11/11)

### Evidence

- Reviewed the full delta: `.github/workflows/release.yml`, `scripts/release-notes.js`, `test/release-notes.test.js`, `package.json` (`dist --publish never`, `build.publish` github provider with no token), README "Releasing", AGENTS.md Commands, CHANGELOG.md, and the blueprint planning/context docs.
- `.gitattributes` forces LF (`* text=auto eol=lf`), so the tests' `\n`-based matching of CHANGELOG.md holds on the Windows runner.
- Security: `GH_TOKEN` is set only on the final `gh release create` step; checkout uses `persist-credentials: false`; the tag reaches shell only through the quoted `TAG` env var; `permissions: contents: write` is scoped to the release workflow; Verify stays read-only.
- F-22 and F-23 re-examined against the repaired code and closed (see findings.md).

### Findings

- F-22 [P1] closed
- F-23 [P3] closed
- No new findings

### Remaining risk

- The release workflow itself was not run against this target; its behaviour rests on the recorded `v0.1.0-rc.2` run (43734130345) of the same workflow at commit 45231f6 and on reading the YAML. Read-only `gh` checks were not needed and not run.
- `npm run dist` was not run by the reviewer (out of bounds); the local packaging and `app-update.yml` content rest on the spec's implementation record.
- Third-party actions are pinned by major tag (`@v4`), not commit SHA, matching verify.yml.
- project-overview.md now plans a 19b update-check network call while AGENTS.md still states "no network calls of its own"; that rule text must change with 19b, not in this feature.
- Rerunning a failed release after `gh release create` partially succeeded needs the draft deleted by hand first.

## Try it now

In the project folder, run:

```sh
node scripts/release-notes.js v0.1.0
```

Expected, until `v0.1.0` is cut: exit code 1 and `CHANGELOG.md has no [0.1.0] section; move [Unreleased] to it first`. This is the same check the release workflow runs before it builds anything. The full pipeline (tag, draft release with both `.exe` files, `.blockmap`, `latest.yml` and `SHA256SUMS.txt`) was proven with the deleted `v0.1.0-rc.2` test release; README "Releasing" describes a real release.
