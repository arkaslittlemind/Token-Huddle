# Feature: First-run onboarding

**From build-plan:** feature 14
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/first-run-onboarding`

## Goal

On the very first launch, tell people what Token Huddle found and how it works
before they wonder: which tools are on this computer, where each card's numbers
come from, how to connect Claude Code, and what Token Huddle never touches.
It appears once, in the settings window, and then gets out of the way.

## Design reference

- [ui-onboarding-dark.png](../reference/ui-onboarding-dark.png) and
  [ui-onboarding-light.png](../reference/ui-onboarding-light.png), approved
  in 12b; source in `prototypes/ui-mockups.html` (Onboarding section).
- `docs/brand.md` "UI mockups": onboarding is the settings window's first-run
  view, not a separate window; Done switches to the normal settings view.

## In scope

- **When it shows**: once, on the first launch only, after the first refresh
  has detected the tools. Existing users (a `settings.json` already on disk)
  never see it.
- **What it shows** (in the settings window, both themes):
  - Title and heading "Welcome to Token Huddle" and the lead line from the
    mockup.
  - One row per supported tool (Claude Code, Codex, OpenCode), found or not:
    the tool's dot and name, a badge (**Ready**, **Not connected**,
    **Connected**, **Linked**, **Own status line** or **Not found**), and one
    sentence on where its numbers come from.
  - For Claude Code: the same connection actions as the settings card
    (**Connect…** with its preview dialog, **Copy prefix** for people with
    their own status line, **Disconnect**), plus the promise: Token Huddle
    shows the change first, keeps a backup, and Disconnect undoes it.
  - "What Token Huddle never touches": logins, tokens and credential files;
    the network; another tool's settings unless you click Connect and approve.
  - **Done**, with the hint "You can connect later from Settings."
- **Ending it**: Done, or closing the window, marks onboarding finished and
  saved; Done switches the window to the normal settings view with focus on
  its heading. It never shows again.
- **Errors**: a failed or cancelled Connect behaves as in the settings view
  (the existing error line, `role="alert"`).

## Out of scope

- A menu item to show the welcome again; a multi-page tour; telemetry.
- New providers, changes to Connect itself, or to what detection checks.
- Keyboard/screen-reader work beyond today's focus rings and the one focus
  move above (17b); error-copy rewrites (17a).
- The widget itself: it shows its cards as today while onboarding is open.

## Build loop

`workflow.stepReview` is `feature`: build all steps, then present one review
packet. `workflow.checkpointCommits` is `disabled`; do not offer checkpoint
commits. `/complete` makes the final feature commit. Never accept a review
packet you have not read.

## Build steps

- [x] **Step 1 - First-run state and data** - add an `about` string to each
  provider (`claude.js`, `codex.js`, `opencode.js`) and document it in the
  contract comment in `providers/index.js`. In `instances.js`, add
  `welcome({ providers, detected, cards })` that returns
  `{ tools: [{ id, name, accent, found, about, card }] }` in registry order,
  where `card` is the default card's entry from `describe()` (for its
  `connection`) or `null`; test it in `test/instances.test.js` (found, not
  found, a tool found only through an added account, connection passed
  through). In `main.js`: keep `detected` from `discover()`; in
  `loadSettings()` set `settings.onboarded` to the saved boolean, to `true`
  when the file exists without the field, and to `false` when there is no
  file; `settingsState()` adds `welcome` only while `onboarded` is false; add
  IPC `settings:finish-onboarding` (sets `onboarded`, saves, pushes; returns
  `{ ok }`) and expose it in `preload.js`; after the first `refresh()` on a
  first run, open the settings window; closing the settings window while
  `onboarded` is false finishes onboarding. Add a test that every registered
  provider has a non-empty `about`. *Done when:* with no `settings.json`, the
  app opens the settings window after its first refresh and its state carries
  `welcome`; with an existing `settings.json` it does not; and
  `node scripts/test.js test/instances.test.js` passes.
- [x] **Step 2 - Welcome view** - in `settings.html`, wrap today's content in
  a settings section and add a welcome section (heading, lead, tool list,
  never-touches box, Done), and keep the error line outside both so it shows
  in either. `settings.js` shows the welcome section while `state.welcome` is
  present (and sets `document.title` to "Welcome to Token Huddle"), else the
  settings section. Move the Claude Code connection badge, text and actions
  out of `cardRow()` into a shared function used by both views, so the two
  cannot drift. Build all text with `textContent`. Port the onboarding rules
  (`.never`, `.finish`, `.badge.ready`, `.badge.absent`) from the mockup into
  `settings.css` using tokens. Done calls `finishOnboarding()`, then focuses
  the settings `<h1>` (`tabindex="-1"`). *Done when:* the welcome view
  matches `ui-onboarding-dark.png` and `ui-onboarding-light.png` (with
  real detection results), Connect… opens the preview dialog and the badge
  updates after connecting, a cancelled Connect leaves the view unchanged,
  Done switches to settings, and a restart does not show the welcome again.
- [x] **Step 3 - Screenshots, docs and changelog** - `scripts/screenshot.js`
  gets `--onboarding`, which writes `onboarded: false` into its own profile
  and captures the settings window (implies `--settings`). Capture the welcome
  view in dark and light. Add `onboarded` to the settings data model in
  `blueprint/project-plan.md` and the overview (same targeted edit and
  fingerprint rule as feature 13), a first-run line to the README, and an
  `Added` line to `CHANGELOG.md`. *Done when:* the captures match the 12b
  references apart from real detection results, and `npm run verify` passes.

## Files / areas

- `src/main/providers/claude.js`, `codex.js`, `opencode.js` (`about`),
  `providers/index.js` (contract comment).
- `src/main/instances.js` (`welcome`), `src/main/main.js`
  (`loadSettings`, `refresh`, `settingsState`, `openSettings` close handler,
  new IPC), `src/main/preload.js` (`settings.finishOnboarding`).
- `src/renderer/settings.html`, `settings.js`, `settings.css`.
- `test/instances.test.js`; `scripts/screenshot.js`; `README.md`,
  `CHANGELOG.md`, `blueprint/project-plan.md`,
  `blueprint/context/project-overview.md`.

## Data / contracts

- `settings.json` gains `onboarded` (boolean). Lifecycle: no file at start →
  `false`; file without the field → `true` (existing user); Done or closing
  the window → `true`, saved. Nothing else reads or resets it.
- Provider contract gains `about` (string): one sentence, shown as-is, on
  where the tool's numbers come from. Copy (from the 12b mockup):
  - Claude Code: "Read from Claude Code's status line, once you connect."
  - Codex: "Read from the codex program on this computer, or from its session
    logs when it is not running."
  - OpenCode: "Read from OpenCode's local database."
  A tool that is not found shows "Not found on this computer. You can add its
  folder later in Settings." after its badge.
- Settings state: `{ cards, providers, theme, welcome? }`; `welcome.tools`
  as in Step 1. `found` comes from `discover()`'s `detected` map, which is
  `true` for a provider with any card.
- IPC `settings:finish-onboarding` takes no arguments and returns `{ ok: true }`;
  it is safe to call twice.
- Badges reuse today's `CONNECTION` labels for Claude Code; Codex and OpenCode
  show **Ready** when found (no connection step) and **Not found** otherwise.

## Testing

- `npm run verify` before (73 tests pass at `6aa6c75`) and after.
- `test/instances.test.js`: `welcome()` cases from Step 1; every registered
  provider has a non-empty `about`.
- `onboarded` loading is three lines in `main.js` and is observed by running
  with and without a `settings.json` (screenshot profile), not unit-tested.
- Visual evidence: `npm run screenshot -- <file> --onboarding` in both themes.
  Connect, Done, close-to-finish and restart are checked in the running app;
  record what was observed and what was not.

## Notes for the AI

- **No logins, no network.** Onboarding only shows what detection already
  found and the existing Connect flow; it reads no new files.
- Copy follows `docs/brand.md`: say "AI model usage", not bare "tokens".
- Keep the widget unchanged; onboarding lives only in the settings window.
- Every behaviour change gets a `CHANGELOG.md` line under `[Unreleased]`.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":8778,"specSha256":"1a6f0b2212aabe699a1c6a3ce0647fbdbb62973b8ac1ec1e63e5c7f2c220f67f","branch":"refs/heads/feature/first-run-onboarding","head":"6aa6c75708077587ee27320f3ddcd3d959140270","baseRef":"refs/heads/main","baseCommit":"6aa6c75708077587ee27320f3ddcd3d959140270","sourceTree":"e74d6f8f6b8e3dfe14117ca96e3cd8783c2aa99b","landing":"local-merge","absentOptional":[]} -->

## Try it now

1. Back up your real settings by renaming `%APPDATA%Token Huddlesettings.json`, then run `npm start`. After the first refresh, the settings window opens on **Welcome to Token Huddle** and lists all three tools with their sources.
2. Click **Connect…** on Claude Code: the preview dialog appears. Cancel it and the welcome stays as it was.
3. Click **Done**. The window switches to **Your subscriptions**.
4. Quit and start again. The welcome does not come back. Restore your `settings.json` afterwards.
5. Or, without touching your settings, run `npm run screenshot -- shot.png --onboarding --theme=light` and open `shot-settings.png`.
6. Run `npm run verify` and expect 77 passing tests.
