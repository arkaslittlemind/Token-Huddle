# Fix: CI lock file missing peer dependencies

**Type:** Fix
**Status:** verified
**Branch:** `fix/ci-lock-file-missing-peer-dependencies`

## The problem

The Verify workflow fails on `main` since `954eec5 feat: packaging` (run
43729934067, Windows, Node 22.23.4, npm 10.9.9): `npm ci` stops with
`EUSAGE ... package.json and package-lock.json ... are in sync` and 13
`Missing: ... from lock file` lines, starting with
`electron-builder-squirrel-windows@26.18.0`, `electron-winstaller@5.4.0` and
`@electron/windows-sign@1.2.2`.

Root cause, reproduced: `app-builder-lib` (part of electron-builder) declares
`electron-builder-squirrel-windows` as a required peer dependency. The
maintainer's user-level npm config sets `legacy-peer-deps = true`, so the
`npm install --save-dev electron-builder` in feature 18 wrote a lock file
without peer dependencies. CI uses npm's default (`false`) and requires them.
In a scratch copy, `npm_config_legacy_peer_deps=false npx npm@10.9.9 ci`
fails with the same errors; regenerating the lock file with
`legacy-peer-deps=false` adds 195 lines (no removals) and `npm ci` then
passes (350 packages).

## The fix

1. Regenerate `package-lock.json` with `legacy-peer-deps=false`, so it lists
   the peer dependencies npm 10 and 11 install by default. Additions only;
   no version of an existing entry changes.
2. Add a project `.npmrc` with `legacy-peer-deps=false`. A project `.npmrc`
   overrides the user-level setting, so every install in this repo matches
   CI regardless of a contributor's global config. This repairs the layer
   the defect came from; the maintainer's global setting for other projects
   is untouched.

Must not break:

- `npm run verify` (lint, format check, 139 tests).
- `npm run dist`: the added packages are build-time electron-builder
  dependencies; nothing new ships in the app (`files` stays `src/**`,
  `package.json`, `LICENSE`).
- `.npmrc` holds no tokens or registry credentials (no-logins rule); only
  the one setting.

No `CHANGELOG.md` line: no app behaviour changes, and nothing is released.

## Build steps

- [x] **Step 1 - Lock file and `.npmrc`** - add `.npmrc`
  (`legacy-peer-deps=false`), run `npm install` so the lock file gains the
  peer dependencies, and check the lock diff is additions only.
  _Done when:_ in a scratch copy of `package.json`, `package-lock.json` and
  `.npmrc`, `npx npm@10.9.9 ci --ignore-scripts` with
  `ELECTRON_SKIP_BINARY_DOWNLOAD=1` passes; with `npm_config_legacy_peer_deps`
  unset, `npm config get legacy-peer-deps` run in the repo prints `false`;
  `npm run verify` passes.

## Verify

- Locally: the done-when above (it reproduces CI's `npm ci` with CI's npm
  version and peer setting).
- On GitHub: after the fix lands and is pushed, the Verify workflow run on
  `main` passes. This needs push approval at `/complete`.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":2840,"specSha256":"971df9c49b96ab3c4b76b56061952154d51d56e0304537a6bda8e271684cffab","branch":"refs/heads/fix/ci-lock-file-missing-peer-dependencies","head":"c150b392afc50fa7ddeed43ee16385ea9d60d887","baseRef":"refs/heads/main","baseCommit":"2d1a25acd76f8719be5b0a21dc31fcc16a45e0d9","sourceTree":"c09aa5ca403486d150222cf0c4f6472e9d484bd6","landing":"local-merge","absentOptional":[]} -->

## Try it now

In the project folder, run:

```sh
npm config get legacy-peer-deps
```

Expected: `false`, even when your user-level npm config sets it to `true`; the project `.npmrc` wins. After the fix is pushed, the Verify run on `main` in GitHub Actions passes its `npm ci` step.
