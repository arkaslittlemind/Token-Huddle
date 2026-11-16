# Feature: In-app updates

**From build-plan:** feature 19b
**Build attempt:** 1
**Branch:** feature/in-app-updates
**Status:** verified

## Goal

The packaged app checks this project's GitHub Releases for a newer version
and says so in the tray menu and the settings window. The installed build
downloads and installs it only when the user clicks; the portable build only
opens the release page. A "Check for updates" switch, on by default, turns
the check off. Every place that promises "no network calls of its own" now
names this one exception.

The repository is private until step 22, so every check fails quietly until
then (GitHub answers 404 without a token, and the app never holds one). The
whole flow is proven now with a local update feed.

## In scope

- `electron-updater` as the app's first runtime dependency (approved in the
  plan), wired in `src/main/main.js`.
- `src/main/updates.js`: pure update state and copy (no Electron), tested.
- Checks: packaged app only, setting on, demo off; 30 s after start, then
  every 6 hours; turning the switch on checks at once, off stops the timer.
- Installed build: "Install update X.Y.Z" downloads, shows progress, then
  quits and installs (`quitAndInstall`). Portable build: "Download X.Y.Z"
  opens the release page in the browser.
- Settings window: an "Updates" section with the running version, the
  "Check for updates" switch and the current update status or action.
  Tray menu: the same switch and, when there is one, the update action.
- Docs: README privacy section and an "Updates" paragraph, `SECURITY.md`,
  `AGENTS.md` and `coding-standards.md` rule wording, `CHANGELOG.md`.

## Out of scope

- A manual "Check now" command (not in the plan).
- Code signing and signature checks of updates (step 20).
- Publishing any release or making the repository public (step 22).
- Pre-release channels: electron-updater's default is kept (a release build
  only sees full releases).
- Any change to "Local files only": it keeps meaning "do not ask Codex";
  updates have their own switch (maintainer decision).
- Showing the release notes inside the app.

## Build loop

`workflow.stepReview` is `feature`: build all steps, then one review of the
whole feature. `workflow.checkpointCommits` is `disabled`. Run the narrow
check per step and `npm run verify` once at the end. `/complete` makes the
final commit. Installing local test builds on the maintainer's machine
(step 4) is done by the maintainer or with their explicit go-ahead.

## Build steps

- [x] **1. Update state and copy, tested.** `src/main/updates.js` (no
  Electron import), with:
  - `isValidVersion(text)`: `X.Y.Z` with an optional `-prerelease`, digits
    and `[0-9A-Za-z.-]` only. A version from the network that fails it is
    treated as an error, never shown or put in a URL.
  - `shouldCheck({ packaged, enabled, demo })`.
  - `reduce(state, event)` over states `idle`, `checking`, `none`,
    `available { version }`, `downloading { version, percent }`,
    `ready { version }`, `error { message, userStarted }`, for events
    `checking`, `available`, `not-available`, `progress`, `downloaded`,
    `error`, `install-clicked`, `disabled`.
  - `present(state, { portable, currentVersion })` returns the tray label,
    whether it is clickable, the settings status sentence, and the action
    (`install`, `open-release`, or none). A background check error shows
    nothing; an error after the user clicked shows "Update failed. Try again
    from the tray or Settings." with the action still offered.
  - `releaseUrl(version)` =
    `https://github.com/arkaslittlemind/token-huddle/releases/tag/v<version>`,
    only for a valid version.
  - `CHECK_DELAY_MS` (30 s) and `CHECK_INTERVAL_MS` (6 h).
  `test/updates.test.js` covers every state transition, the copy for
  installed and portable, the silent background error, the user-started
  error, invalid versions (rejected in `reduce`, never reaching the URL),
  and `shouldCheck`.
  *Done when:* the tests pass.

- [x] **2. Wire electron-updater.** `npm install electron-updater` (a
  `dependency`; record the version). In `main.js`:
  - setting `checkUpdates` (boolean, default `true`, saved in
    `settings.json`; anything not a boolean reads as `true`);
  - require `electron-updater` only when `shouldCheck` passes, set
    `autoDownload = false` and `autoInstallOnAppQuit = false`, feed its
    events through `reduce`, schedule with `CHECK_DELAY_MS` and
    `CHECK_INTERVAL_MS`, and swallow check errors (no dialog, no crash);
  - portable is `process.env.PORTABLE_EXECUTABLE_FILE` being set; its action
    opens `releaseUrl` with `shell.openExternal`;
  - install action: `downloadUpdate()`, then `quitAndInstall()` when
    downloaded;
  - every state change calls `push()`.
  Check the packaged `app.asar` contains `node_modules/electron-updater`
  with its dependencies, and nothing else new.
  *Done when:* `npm start` behaves as before and logs no update errors (no
  check runs unpackaged); `npm run dist` builds and the asar check passes;
  `npm run verify` passes.

- [x] **3. Tray and Settings UI.** Tray menu: a "Check for updates"
  checkbox next to "Start with Windows", and, when `present` gives a label,
  the update item above "Settings…" (disabled while checking or
  downloading). Settings window: an "Updates" section after "Alerts" with
  "Token Huddle <version>", the switch (existing `switchControl`), a status
  line in a polite live region, and an action button when `present` offers
  one. New IPC: `settings:set-check-updates (on)` and `settings:update-action
  ()`, validated, reporting `{ ok, error }`; preload exposes them by name.
  All network-derived text goes in with `textContent`. Keyboard: the button
  is reachable and has a visible focus ring like the others.
  *Done when:* `npm run screenshot -- out.png --settings` shows the Updates
  section in light and dark; toggling the switch in `npm start` is saved
  across a restart; `npm run verify` passes.

- [x] **4. Local update feed test (maintainer machine).** Build
  `0.1.0-rc.1` and `0.1.0-rc.2` with `npm run dist` on a throwaway branch
  (version bumps never reach `main`). Install rc.1; edit its installed
  `resources/app-update.yml` to `provider: generic` with a
  `http://localhost:<port>/` URL; serve rc.2's `latest.yml`, installer and
  `.blockmap` from a scratch folder with a small Node server. Check: the
  tray and Settings show "Install update 0.1.0-rc.2"; clicking downloads
  with progress and restarts into rc.2; Claude Code stays connected (the
  uninstall cleanup is skipped on update). With the server stopped, a check
  shows nothing; turning the switch off stops checks. Uninstall the test
  build afterwards.
  *Done when:* each check above is observed and recorded in this spec, or
  the maintainer reports it.

- [x] **5. Docs and changelog.** Reword the promise in README ("It never
  touches your logins"), `SECURITY.md`, `AGENTS.md` (project rule) and
  `coding-standards.md` (rule and "no runtime dependencies"): no network
  calls of its own except checking this project's GitHub Releases for a
  newer version, which "Check for updates" turns off; it sends no personal
  data (GitHub sees an ordinary download request). README: an "Updates"
  paragraph (installed vs portable, nothing installs without a click,
  checks fail quietly until the first public release). `CHANGELOG.md`
  `[Unreleased]` line.
  *Done when:* no file still says "no network calls" without the
  exception (`grep -ri "network calls"`), and `npm run verify` passes.

- [x] **6. Repair F-22 and F-23 (independent review).** F-22 [P1]: the
  first-run welcome (`src/renderer/settings.html`, "What Token Huddle never
  touches") still says it "makes no calls of its own and sends nothing
  anywhere"; reword it to the same exception as the README, and widen the
  step 5 search to "network" wording, not only "network calls". F-23 [P1]:
  electron-updater reports a failed user-started download twice (the
  `error` event and the rejected `downloadUpdate()`); the second error
  replaces the user-started error and drops the retry offer. In
  `reduce`, a further `error` while a user-started error is shown keeps
  that state; add a test that sends two errors after an install click.
  *Done when:* `test/updates.test.js` has the double-error test and it
  passes (red first on the current code); the welcome text names the update
  check; `grep -rni "network"` over `src/` and the docs finds no
  unqualified promise; `npm run verify` passes; F-22 and F-23 are marked
  `fixed`.

## Files / areas

- `src/main/updates.js` (new), `test/updates.test.js` (new)
- `src/main/main.js` (setting, updater wiring, tray menu, IPC)
- `src/main/preload.js`, `src/renderer/settings.html`,
  `src/renderer/settings.js`, `src/renderer/settings.css` (Updates section)
- `package.json`, `package-lock.json` (`electron-updater`)
- `README.md`, `SECURITY.md`, `AGENTS.md`,
  `blueprint/context/coding-standards.md`, `CHANGELOG.md`

## Data / contracts

- **Setting:** `checkUpdates` in `settings.json`, boolean, default `true`.
- **Feed:** the packaged `resources/app-update.yml` written by
  electron-builder from `build.publish` (GitHub, this repository). The app
  holds no token; a private repository's 404 is a quiet failure.
- **Update files:** `latest.yml` plus the installer and `.blockmap`, as the
  19a pipeline publishes them (also for pre-releases).
- **Trust:** the version and file names in `latest.yml` come from the
  network. The version must pass `isValidVersion` before it is shown or put
  in a URL; text is rendered with `textContent` only. The download's
  integrity is electron-updater's SHA-512 check against `latest.yml` over
  HTTPS; there is no publisher signature check until step 20.
- **Network:** requests go only to GitHub (the release feed and its files),
  only from the packaged app with the switch on, and send nothing beyond an
  ordinary HTTPS request.

## Testing

- `npm test`: `test/updates.test.js`. Baseline at spec time: `npm run
  verify` passes, 150 tests.
- Manual: step 2 asar check, step 3 screenshots and setting persistence,
  step 4 local feed test. Record what was observed; do not claim a real
  GitHub update (impossible until step 22).

## Notes for the AI

- `electron-updater` must not load in unpackaged runs or tests; require it
  inside the guarded code path.
- The uninstall cleanup in `build/installer.nsh` is skipped on update
  (`${isUpdated}`); step 4 confirms Claude Code stays connected.
- `quitAndInstall` quits the app; the `will-quit` handler already
  unregisters the hotkey. Do not add a confirmation dialog: the click is
  the consent.
- Keep the 11 px minimum text size, both themes, and the reduced-motion
  rule for any progress display.
- The portable build cannot replace itself; never call `downloadUpdate` or
  `quitAndInstall` there.

## Implementation record

Observed on 2026-11-15 on branch `feature/in-app-updates`:

- `electron-updater` 6.8.11 installed as the app's first `dependency`.
  `npm run dist` built both `.exe` files; `app.asar` holds `src/`,
  `package.json`, `LICENSE` and `node_modules` with exactly
  `electron-updater` and its 15 dependencies (matching
  `npm ls --omit=dev`). `resources/app-update.yml`: owner, repo,
  `provider: github`, `updaterCacheDirName`; no token.
- Settings screenshots, light and dark (scratch harness that scrolls to the
  section): "You have version 0.1.0. Token Huddle checks this project's
  GitHub Releases for a newer one; nothing is downloaded or installed until
  you click.", the switch, and the status line.
- Temporary profile: `setCheckUpdates(false)` returned `{ ok: true }`, the
  switch showed off and `settings.json` saved `checkUpdates: false`;
  `setCheckUpdates('yes')` returned `{ ok: false, error: 'Expected on or
  off' }`.
- `npm run verify` passes (164 tests before the review fixes).

Deliberate differences from the steps above:

- `present(state, { portable, packaged, enabled })`: the running version
  is added by `main.js` from `package.json` (`app.getVersion()` reported
  Electron's version when run from a script); the error state carries no
  `message`, its copy comes from `present`.
- Settings reads "You have version X" instead of "Token Huddle X"; the
  switch and button are static markup with the existing `switch` class, so
  redraws never drop focus.
- While checking, the tray shows no update item (nothing to offer yet);
  downloading and restarting show a disabled item.
- Two extra status lines: "Update checks are off." and "Updates are
  checked only in the installed and portable app."
- `quitAndInstall(true, true)`: a silent install that reopens the app; the
  click is the consent. Step 4 confirms it.

Code review fixes (Opus reviewers): progress only changes the state when
the rounded percent changes, and the announced Settings line says
"Downloading version X." once (the tray keeps the percentage); the status
line is no longer hidden when empty, so its first message is announced;
turning the switch off stops future checks but no longer drops an install
the user started; `settings:update-action` reports an error when there is
nothing to act on; `isBusy` and one `checksAllowed()` replace duplicated
checks.

Step 4, local update feed test, reported passed by the maintainer on
2026-11-15 (run on their machine, not observed by the agent). Kit built
locally from `37aa27f` on a throwaway branch (deleted; version bumps never
committed): `Token-Huddle-Setup-0.1.0-rc.1.exe` installed, its
`resources/app-update.yml` pointed at a generic feed on
`http://localhost:8765/` serving rc.2's `latest.yml`, installer and
`.blockmap`. Passed: the tray and Settings offered "Install update
0.1.0-rc.2"; clicking downloaded with progress, installed silently and
reopened as 0.1.0-rc.2; Claude Code stayed connected; with the feed
stopped a check showed nothing; turning the switch off showed "Update
checks are off." and stopped checks; the test build was uninstalled.



<!-- blueprint:completion {"schemaVersion":2,"specBytes":14031,"specSha256":"fb23dbf685b5ea07527caad7a49ca4b62be5a58e98a5906b7459725abf68c7c9","branch":"refs/heads/feature/in-app-updates","head":"638a4a61c1094b5f33467bf9e47c7b11d20b8845","baseRef":"refs/heads/main","baseCommit":"dc4eeaab22aec8839ba6b7275d62241864cc8534","sourceTree":"09d6cfd32c9a170b24ee30ac30d00d515f3289ee","landing":"local-merge","absentOptional":[]} -->

## Findings

### 19b/F-22 [P1] closed - First-run welcome still promises the app makes no network calls at all

**File:** src/renderer/settings.html:29
**Found:** 2026-11-15 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** The welcome view's "What Token Huddle never touches" list says "The network: it makes no calls of its own and sends nothing anywhere." With this feature the packaged app checks GitHub Releases by default, 30 s after start. This is the one privacy promise a new user sees inside the app, and it is now false. The spec goal says every place that promises "no network calls of its own" names the exception; the step 5 check (`grep -ri "network calls"`) did not match this wording, so it was missed.
**Suggested fix:** Reword the item to name the exception the same way as README and SECURITY.md (for example: "The network, except a check of this project's GitHub Releases for a newer version, which you can turn off in Settings. It sends nothing about you."). Optionally also update the `localOnly` comment in src/main/providers/index.js:28. No requirement is lost.
**Resolution:** The welcome now reads "The network, except to find updates and fetch one when you click (Settings turns it off)." (naming the click-started download too, from the repair review; "no personal data" stays in README and SECURITY.md so the welcome fits without a scrollbar) A wider search for any "network" wording in src/ and the docs finds no other unqualified promise (the `localOnly` comment describes only the Codex provider flag and stays). The first-run welcome still fits without a scrollbar (`npm run screenshot -- out.png --onboarding`). Closed 2026-11-15 by independent review of 638a4a6: settings.html:29 now names the update check and the click-started download; a repo-wide search for "network", "no calls" and "sends nothing" in src/ and the shipped docs finds no other unqualified in-app promise (main.js:693 is about the Claude status-line script and stays true). Remaining changelog wording is tracked separately as F-24. Welcome fit not re-observed by the reviewer.

### 19b/F-23 [P1] closed - A failed user-started download clears its retry offer and shows nothing

**File:** src/main/main.js:495
**Found:** 2026-11-15 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** electron-updater 6.8.11 reports a failed download twice: `downloadUpdate()` emits `error` from its internal catch (node_modules/electron-updater/out/AppUpdater.js:439-469, `dispatchError`) and then rejects its promise. main.js feeds both into `reduce`: the `error` listener turns `downloading` into `{ status: 'error', userStarted: true, version }`, then `runUpdateAction`'s `.catch(() => setUpdate({ type: 'error' }))` runs on a state that is no longer busy and replaces it with `{ status: 'error', userStarted: false }`. `present` then returns a quiet empty view: the tray item and Settings button disappear and "Update failed. Try again from the tray or Settings." never shows, contrary to the spec (step 1) and the unit test that models a single error. The same double dispatch happens for `checkForUpdates()` (line 271), harmless there. The maintainer's local feed test covered only the success path.
**Suggested fix:** Feed each failure into `reduce` once: drop the duplicate `setUpdate({ type: 'error' })` in the `downloadUpdate().catch` (and in `checkForUpdates().catch`), keeping an empty catch to avoid an unhandled rejection; or make `reduce` keep a `userStarted` error when a second `error` arrives. Add a test that applies two `error` events after `install-clicked` and still expects the retry offer. No requirement is lost.
**Resolution:** In `reduce`, a further `error` while a user-started error is shown keeps that state, so the retry offer survives electron-updater reporting one failure twice (this also covers any other duplicate error). New test "a failed install reported twice keeps its retry offer" failed on the old code and passes now. Closed 2026-11-15 by independent review of 638a4a6: updates.js reduce() returns the same state for any `error` while `{ status: 'error', userStarted: true }`; electron-updater 6.8.11 AppUpdater.downloadUpdate dispatches `error` before rejecting, and either order ends in the user-started error with its version, so present() keeps the install action and the failure line. Background checks still leave that state through `checking` first, so the guard cannot pin a stale offer. Test at test/updates.test.js passes in `npm run verify` (165 tests).

## Independent review

**Status:** passed
**Target commit:** 638a4a61c1094b5f33467bf9e47c7b11d20b8845
**Base commit:** dc4eeaab22aec8839ba6b7275d62241864cc8534
**Base ref:** refs/heads/main
**Spec hash:** fb23dbf685b5ea07527caad7a49ca4b62be5a58e98a5906b7459725abf68c7c9
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-11-15T17:09:34Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-11-15T17:12:02Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Handoff

Review the active spec and the complete `dc4eeaab22aec8839ba6b7275d62241864cc8534..638a4a61c1094b5f33467bf9e47c7b11d20b8845` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

### Commands

- `npm run verify` (lint, format check, 165 tests): pass
- `git rev-parse HEAD`, `git merge-base refs/heads/main HEAD`, `git status --porcelain`, `sha256sum blueprint/context/current-feature.md`: preflight matched the request (only review.md differed)
- `git diff dc4eeaa..638a4a6` and targeted reads/greps of src, test, docs, CHANGELOG, release workflow and node_modules/electron-updater, app-builder-lib: done

### Evidence

- Full delta reviewed: src/main/updates.js, main.js updater wiring, preload, settings.html/js/css, test/updates.test.js, package.json/lock, README, SECURITY.md, AGENTS.md, coding-standards.md, CHANGELOG.md.
- Trust boundary: autoDownload and autoInstallOnAppQuit are false; downloadUpdate runs only from runUpdateAction when present() offers `install`, never in the portable build; quitAndInstall only after a user-started download reaches `ready`; the network version passes isValidVersion before it is kept, shown or put in releaseUrl; renderer uses textContent; shell.openExternal gets only a validated github.com URL.
- No credential leak: electron-updater providerFactory.js reads GH_TOKEN/GITHUB_TOKEN only when the github publish config is `private`; build.publish has no `private` or token.
- electron-updater AppUpdater.downloadUpdate dispatches `error` then rejects; reduce keeps the user-started error (F-23 closed). Welcome wording names the exception (F-22 closed).
- app-builder-lib writes app-update.yml when any target is nsis, so the shared win-unpacked used by portable should carry it (not observed).

### Findings

- F-22 [P1] closed, F-23 [P1] closed
- F-24 [P2] open: CHANGELOG [Unreleased] Changed and Security entries still promise no network calls without the exception
- F-25 [P3] open: turning checks off during an install hides the download, then the app restarts

### Remaining risk

- Step 4 local update-feed test (download, silent install, reopen, Claude Code stays connected) is maintainer-reported only; the reviewer could not run installers, the app or `npm run dist`.
- Portable build update check and "Download" path were not exercised by any run.
- No real GitHub update is possible until the repository is public (step 22); no publisher signature check until step 20 (integrity rests on SHA-512 in latest.yml over HTTPS).
- First-run welcome fit without a scrollbar and the Settings screenshots were not re-observed by the reviewer.
- Earlier P3 `fixed` findings F-16 to F-20 were not re-examined in this pass.

## Try it now

Run `npm start`, open **Settings** from the tray, and scroll to **Updates**.
Expected: "You have version 0.1.0. Token Huddle checks this project's
GitHub Releases for a newer one; nothing is downloaded or installed until you
click.", the **Check for updates** switch (on), and the line "Updates are
checked only in the installed and portable app." Turning the switch off is
remembered after a restart. The tray menu has the same **Check for updates**
switch. A real update can only be observed in a packaged build: the local
update-feed test above shows how, and GitHub updates start with `v0.1.0`
(step 22).
