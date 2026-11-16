# Feature: Packaging

**From build-plan:** feature 18
**Build attempt:** 1
**Branch:** feature/packaging
**Status:** verified

## Goal

Turn Token Huddle into something a user can install and run without Node or
npm: an electron-builder NSIS installer and a portable `.exe` for Windows, with
the app icon and product metadata. Uninstalling must leave other tools'
settings clean: Token Huddle's own Claude Code status line is removed, and
nothing a user wrote is touched.

## In scope

- `electron-builder` as a dev dependency, configured in `package.json`
  (`build` field): NSIS installer and portable targets for Windows x64, output
  to `dist/` (already gitignored).
- `npm run dist`: generates the icon, then runs electron-builder.
- App icon `.ico` generated from the code-drawn mark (`src/main/icon.js`,
  `tile` colourway), so the project still ships no icon image files and the
  icon follows `CURRENT` in `src/renderer/mark.js` (switched in step 21).
- Product metadata: `appId`, `productName`, version, copyright, publisher,
  artifact names.
- `app.setAppUserModelId(APP_ID)` in the packaged app, so threshold-alert
  toasts are attributed to Token Huddle (see the step 15 note: toasts already
  work unpackaged without one).
- Disconnect on uninstall: the NSIS uninstaller runs the app once with
  `--uninstall-cleanup`, which disconnects every bridge card and turns off
  "Start with Windows", then exits. Skipped when the uninstall is part of an
  upgrade.
- Portable build: "Start with Windows" registers the real portable `.exe`, not
  the temporary unpacked copy.
- README: install, portable, uninstall, and what uninstall leaves behind.
- `CHANGELOG.md` line under `[Unreleased]`.

## Out of scope

- Auto-update, release workflow, checksums, GitHub Releases (step 19).
- Code signing and SmartScreen guidance beyond one line saying builds are
  unsigned for now (step 20).
- Choosing the final logo (step 21).
- Deleting Token Huddle's own data folder on uninstall (kept, see Notes).
- Editing a user's own status line on uninstall (never; project rule).
- Running electron-builder in CI or in `npm run verify`.

## Build loop

`workflow.stepReview` is `feature`: build all steps, then stop once for review
of the whole feature. `workflow.checkpointCommits` is `disabled`: no commits
between steps. Run `npm run verify` after each step that changes code.
`/complete` makes the final commit.

## Build steps

- [x] **1. Uninstall cleanup logic, tested.** Add `src/main/cleanup.js` with a
  pure-ish `disconnectAll({ instances, registry, dataDir })`: for every saved
  instance whose provider has `connection`, call `connection.disconnect` with
  the same context `main.js` builds (`options`, `key`, `dataDir`), including
  the built-in default card; one failure never stops the others; returns a
  per-card result list. Add `test/cleanup.test.js` using temporary Claude
  homes: an `ours` status line is removed and other settings keep their
  values; a `linked` and an `other` status line are left byte-for-byte; a
  missing `settings.json` is fine; a throwing provider does not block the
  next card.
  *Done when:* the new tests pass and `npm run verify` passes.

- [x] **2. Cleanup mode and app id in `main.js`.** Add `APP_ID =
  'com.arkaslittlemind.tokenhuddle'`. When `process.argv` contains
  `--uninstall-cleanup`: skip the single-instance lock, windows, tray and
  hotkey; after `app.whenReady()`, load settings, run `disconnectAll`, call
  `app.setLoginItemSettings({ ...loginItemOptions(), openAtLogin: false })`,
  then `app.exit(0)`. Guard the whole run with a timeout (about 10 s) that
  exits anyway, and exit 0 on any error, so cleanup never blocks or fails an
  uninstall. In normal runs, call `app.setAppUserModelId(APP_ID)` only when
  `app.isPackaged`. In `loginItemOptions()`, when
  `process.env.PORTABLE_EXECUTABLE_FILE` is set, return `{ path: <that file> }`.
  Add a test that `APP_ID` (exported or read from source, simplest option)
  equals `package.json` `build.appId` once step 3 adds it; keep the test in
  this step only if it can pass, otherwise add it in step 3.
  *Done when:* `npm start` still runs normally; running unpackaged with
  `--uninstall-cleanup` against a temporary `CLAUDE_CONFIG_DIR` holding an
  `ours` status line removes it and the process exits without showing a
  window; `npm run verify` passes.

- [x] **3. Icon generation.** Add `scripts/make-icon.js`: renders
  `iconPixels(size, 'tile')` at 16, 24, 32, 48, 64, 128 and 256 and writes a
  multi-size `build/icon.ico` (PNG or 32-bit BMP entries, standard library
  only). Gitignore `build/icon.ico` (generated). Keep any byte-level ICO
  encoding in a small pure function with a test (`test/ico.test.js`: header
  count, entry sizes, offsets inside the file). Check first that
  `iconPixels` returns RGBA at any requested size; if not, record what it
  returns and adapt the writer, not `icon.js`.
  *Done when:* `node scripts/make-icon.js` writes an `.ico` that Windows
  Explorer previews as the navy tile mark; the test passes; `npm run verify`
  passes.

- [x] **4. electron-builder config and `npm run dist`.** Install
  `electron-builder` as a dev dependency (record the exact version installed).
  In `package.json` add `"dist": "node scripts/make-icon.js && electron-builder
  --win"` and a `build` field: `appId` (same as `APP_ID`), `productName`
  `Token Huddle`, `copyright` `Copyright © 2026 Arkadipta Mojumder`,
  `directories.output` `dist`, `directories.buildResources` `build`, `files`
  limited to `src/**`, `package.json`, `LICENSE`; `win.target` `nsis` and
  `portable` (x64), `win.icon` `build/icon.ico`; `nsis` per-user (defaults),
  `include: build/installer.nsh` (added in step 5, empty macro file is fine
  for now), `artifactName` `Token-Huddle-Setup-${version}.${ext}`;
  `portable.artifactName` `Token-Huddle-${version}-portable.${ext}`. No
  signing configuration. Check that no runtime code reads app files outside
  `src/` or needs to be unpacked from asar (current evidence: only
  `preload.js` and renderer HTML, both under `src/`).
  *Done when:* `npm run dist` produces both `.exe` files in `dist/`; the
  installed app and the portable `.exe` start, show the widget with live
  cards, show the app icon in the taskbar, Start menu and Explorer, and a
  threshold-alert toast appears from each (lower a threshold to trigger it);
  record the toast result per build, and if the portable build loses toasts
  with the app id set, skip `setAppUserModelId` when
  `PORTABLE_EXECUTABLE_FILE` is set and recheck. `npm run verify` passes.

- [x] **5. Disconnect on uninstall.** Write `build/installer.nsh` with the
  electron-builder uninstall hook that runs
  `"$INSTDIR\${APP_EXECUTABLE_FILENAME}" --uninstall-cleanup` with
  `ExecWait`, skipped when `${isUpdated}` is true. Check in electron-builder's
  bundled `uninstaller.nsh` which macro (`customUnInstall`,
  `customRemoveFiles` or `customUnInit`) runs while the executable still
  exists and after the running app is closed; use that one and note it in a
  comment.
  *Done when:* with the installed build, Connect Claude Code, then uninstall
  from Windows Settings: `~/.claude/settings.json` no longer has Token
  Huddle's `statusLine`, its other keys are unchanged, and the "Start with
  Windows" Run entry is gone. With a `linked` status line the user's command
  is unchanged and keeps working. Installing the same build over itself (the
  upgrade path) leaves Claude Code connected.

- [x] **6. Docs and changelog.** README: an Install section (installer,
  portable, unsigned for now so Windows may warn), and an Uninstall section:
  the installer removes Token Huddle's status line; the portable build has no
  uninstaller, so click Disconnect before deleting it; a user who linked
  their own status line removes the prefix themselves; Token Huddle's own
  data folder (`%APPDATA%\Token Huddle`) stays and can be deleted by hand.
  Add the `[Unreleased]` changelog line(s).
  *Done when:* README and CHANGELOG describe the behaviour above;
  `npm run verify` passes.

## Files / areas

- `src/main/cleanup.js` (new), `test/cleanup.test.js` (new)
- `src/main/main.js`: `APP_ID`, cleanup mode, `setAppUserModelId`,
  `loginItemOptions()`
- `scripts/make-icon.js` (new), ICO encoder plus `test/ico.test.js` (new)
- `build/installer.nsh` (new, tracked); `build/icon.ico` (generated, ignored)
- `package.json`, `package-lock.json`, `.gitignore`
- `README.md`, `CHANGELOG.md`
- Reused: `src/main/icon.js` `iconPixels`, `src/main/providers/claude.js`
  `connection.disconnect` and `classify`, `src/main/providers/index.js`
  registry

## Data / contracts

- **App id:** `com.arkaslittlemind.tokenhuddle`, confirmed by the maintainer
  at spec review (2026-11-15) after a rename to "tokends." was considered and
  dropped. It matches the decided domain `tokenhuddle.arkaslittlemind.com`
  (`docs/brand.md`). It is persistent
  identity: Windows toast attribution, the NSIS uninstall registry key and
  later auto-update all depend on it, so it must not change after the first
  release. `main.js` and `package.json` must agree (tested).
- **Data folder:** unchanged, `app.getPath('userData')` =
  `%APPDATA%\Token Huddle` for npm, installed and portable runs alike (name
  from `app.setName('Token Huddle')`). Check this in step 4: an existing
  `settings.json` from `npm start` must be picked up by the installed build.
- **`--uninstall-cleanup`:** internal command-line flag. Effect: disconnect
  every bridge card (existing `disconnect`: removes only a status line that is
  exactly Token Huddle's command, deletes that card's snapshot file), turn off
  the login item, exit 0. Never edits a `linked` or `other` status line, never
  restores or deletes the `settings.json.token-huddle-backup`, never deletes
  the data folder. Shows no window.
- **Artifacts:** `dist/Token-Huddle-Setup-<version>.exe`,
  `dist/Token-Huddle-<version>-portable.exe`. Version comes from
  `package.json` (`0.1.0`).
- **No-network rule:** the app still makes no network calls. electron-builder
  downloads Electron, NSIS and resource-editing tools at build time; that is
  build tooling, not the app.

## Testing

- Automated (`npm test`): `test/cleanup.test.js` (status line classes,
  missing file, one failure not blocking others), `test/ico.test.js` (ICO
  structure), app id agreement with `package.json`. Existing 126 tests keep
  passing; observed baseline at spec time: `npm run verify` passes, 126 tests.
- Manual (no installer test harness exists): steps 4 and 5 done-whens on the
  maintainer's machine: install, run, icon, toast per build, Connect,
  uninstall cleanup, `linked` untouched, upgrade-over keeps the connection,
  portable start and "Start with Windows" path. Record observed results in
  the review handoff; do not claim any that were not run.

## Notes for the AI

- Never read or send any credential; cleanup only uses the existing
  `disconnect`, which edits only Token Huddle's own status line.
- Why the data folder stays: a `linked` user's own status line calls
  `token-huddle-statusline.ps1` in that folder; deleting it would break their
  status line, which Token Huddle must never do. electron-builder keeps
  `AppData` by default (`deleteAppDataOnUninstall: false`); do not change it.
- Cleanup must run while `Token Huddle.exe` still exists and must be skipped
  on upgrade (`${isUpdated}`), or every update in step 19 would silently
  disconnect Claude Code.
- `setAppUserModelId` unpackaged could stop dev toasts (no shortcut carries
  the id), hence the `app.isPackaged` guard.
- Do not call `electron` directly; electron-builder is run through
  `npm run dist`. If a VS Code terminal sets `ELECTRON_RUN_AS_NODE=1`, the
  packaged exe also inherits it when started from that terminal; start
  manual checks from the Start menu or Explorer.
- Keep `scripts/` and new files under ESLint and Prettier; `.nsh` is not
  formatted by Prettier.

## Implementation record

Observed on 2026-11-15 on branch `feature/packaging`:

- `electron-builder` 26.18.0 installed (`package.json` `^26.18.0`, lockfile
  pins 26.18.0). `npm audit` reports 5 moderate advisories, all in its
  build-time dependency tree; nothing ships in the app.
- `npm run verify`: lint and format clean, 139 tests pass.
- Cleanup mode, unpackaged, through a harness with a temporary userData
  profile and Claude folder: exit 0 in about 6 s, no window; Token Huddle's
  `statusLine` removed, other keys kept, snapshot file deleted.
- Card keys are sanitized before cleanup (code review finding); a test shows
  a traversal key cannot reach a file outside the data folder.
- Uninstall hook: `customUnInstall`, confirmed in electron-builder's
  `uninstaller.nsh` to run after the running-app check and before `$INSTDIR`
  is deleted.
- `npm run dist`: exit 0; `Token-Huddle-Setup-0.1.0.exe` and
  `Token-Huddle-0.1.0-portable.exe`; version info shows product name,
  copyright and 0.1.0; `app.asar` holds only `src/`, `package.json`,
  `LICENSE`. The unpacked packaged exe started and showed its window.
- `build/icon.ico` rendered (128 and 32 px) as the navy tile mark with
  transparent corners.
- Deviation, deliberate: `setAppUserModelId` also runs in cleanup mode,
  because Windows names the "Start with Windows" entry after it.
- Addition: `"publish": null` keeps electron-builder from adding GitHub
  update config before step 19.

Manual done-whens for steps 4 and 5, reported passed by the maintainer on
2026-11-15 (run on their machine, not observed by the agent): install with
existing cards and settings picked up and the icon in the taskbar and Start
menu; a threshold-alert toast from both the installed and the portable build
(so the app id stays set in the portable build); the portable "Start with
Windows" entry pointing at the portable `.exe`; installing over an existing
install keeps Claude Code connected; uninstall from Windows Settings removes
Token Huddle's `statusLine`, keeps the other settings and turns off "Start
with Windows"; a linked status line is left unchanged.

Maintainer decision, 2026-11-15: uninstall removing Token Huddle's own
status line without a preview is accepted as an exception to the "show the
exact change first" rule; recorded in `coding-standards.md`.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":14303,"specSha256":"d6d188476473417fffc4d92fbaa9d35f683b0ed88fca2e9041cae261b35161ef","branch":"refs/heads/feature/packaging","head":"ee826dc5793b7f8df89e8b66bed2351e18de0a15","baseRef":"refs/heads/main","baseCommit":"e267b145b65e9da163991de08cc82c399fb36279","sourceTree":"2f110f1769205d92f31efe897497dc2fcfc985f7","landing":"local-merge","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** ee826dc5793b7f8df89e8b66bed2351e18de0a15
**Base commit:** e267b145b65e9da163991de08cc82c399fb36279
**Base ref:** refs/heads/main
**Spec hash:** d6d188476473417fffc4d92fbaa9d35f683b0ed88fca2e9041cae261b35161ef
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-11-15T15:20:42Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-11-15T15:22:29Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Handoff

Review the active spec and the complete `e267b145b65e9da163991de08cc82c399fb36279..ee826dc5793b7f8df89e8b66bed2351e18de0a15` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

### Commands

- `git rev-parse HEAD`, `git merge-base refs/heads/main HEAD`, `sha256sum blueprint/context/current-feature.md`, `git status --porcelain`: pass (HEAD, merge base and spec hash match the request; only review.md differs)
- `npm run verify`: pass (ESLint clean, Prettier clean, 139 tests pass, 0 fail, 0 skipped)

### Evidence

- Reviewed the full delta: build/installer.nsh, package.json build config and dist script, scripts/ico.js, scripts/make-icon.js, src/main/cleanup.js, src/main/main.js (APP_ID, cleanup mode, portable login item), test/cleanup.test.js, test/ico.test.js, test/packaging.test.js, README, CHANGELOG, coding-standards, .gitignore, spec. package-lock.json excluded except the added dev dependency electron-builder ^26.18.0.
- node_modules/app-builder-lib/templates/nsis/uninstaller.nsh runs customUnInstall (line 156) before RMDir $INSTDIR (line 187), so the .exe still exists when ExecWait starts it.
- cleanup.js sanitizes saved keys before they become file names and calls each provider's own disconnect, which removes only an exact Token Huddle status line (claude.js classify).
- Packaged `files` covers every runtime path: src files resolve only within src/.

### Findings

- F-21 [P3] unverified: cleanup's hard exit timer can cut a non-atomic write to Claude Code's settings.json

### Remaining risk

- Manual install, icon, toast, Connect, uninstall cleanup, linked status line untouched, upgrade-over and portable "Start with Windows" checks were reported passed by the maintainer; this reviewer did not observe them (installers and `npm run dist` not run).
- runCleanup in main.js (login item off, exit 0, 10 s limit) has no automated test; it depends on Electron and is covered only by the manual checks above.
- F-21 data-loss window on uninstall is unverified.
- `/check` not run (not required).

## Try it now

Build both Windows packages from this checkout (takes a few minutes; Node 22+):

```sh
npm run dist
```

Expected: the command ends without errors, prints `Wrote buildicon.ico (16, 24, 32, 48, 64, 128, 256 px)` at the start, and `dist/` holds `Token-Huddle-Setup-0.1.0.exe` and `Token-Huddle-0.1.0-portable.exe`. Right-click either file > Properties > Details: product name Token Huddle, version 0.1.0, copyright Arkadipta Mojumder. Explorer shows both with the navy tile icon.
