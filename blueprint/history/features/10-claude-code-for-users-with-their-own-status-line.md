# Feature: Claude Code for users with their own status line

**From build-plan:** feature 10
**Build attempt:** 1
**Branch:** feature/claude-code-for-users-with-their-own-status-line
**Status:** verified

## Goal

People who already have their own Claude Code status line can still feed the
Claude Code card. Token Huddle gives them one command prefix to copy. They put
it in front of their own `statusLine.command` in `~/.claude/settings.json`. The
prefix saves the usage numbers, then passes Claude Code's input on unchanged to
their own command, so their status line looks and behaves as before. Token
Huddle detects the prefix and shows whether usage is arriving.

Token Huddle never edits the user's settings or script for this. It only shows
text to copy (the maintainer chose the prefix design over a line inside the
script, 2026-11-15).

## In scope

- A pass-through mode for the existing status line script: it saves
  `rate_limits` exactly as today, then writes the original input to stdout
  unchanged, instead of the `5h …% | 7d …%` summary.
- Exact classification of the user's `statusLine.command`: Token Huddle's own
  bridge, a prefixed (linked) command, or someone else's status line.
- A new connection state `linked`, with readings and Settings text for linked
  (usage arriving), linked (waiting for the first reading) and conflict (own
  status line, not linked yet).
- A **Copy prefix** action in Settings. It writes the script to Token Huddle's
  own data folder, copies the prefix to the clipboard, and shows the copied text
  with three short steps.
- Docs: README "Connecting Claude Code", the provider contract comment in
  `providers/index.js`, the overview data model, CHANGELOG.

## Out of scope

- Token Huddle editing, wrapping or previewing a change to the user's
  `settings.json` or script. The user pastes the prefix by hand.
- Unlinking from Token Huddle. The user removes the prefix by hand, and
  Settings says so.
- A snippet for inside the user's script (the option that was not chosen).
- Status line hosts other than a terminal (feature 9: VS Code and T3 Code do not
  run it). macOS and Linux (23b).
- Better stale-state copy across cards (17a).

## Build loop

`workflow.stepReview` is `feature`: build all steps, then stop for one review.
`workflow.checkpointCommits` is `disabled`: no commits during the build.
`/complete` makes the commit.

## Build steps

- [x] **1. Exact classification, so the user's line is never touched.** In
  `claude.js`, replace the substring test `isOurs` with a classifier over
  `statusLine.command`:
  - **ours:** exactly `bridgeCommand(dataDir, k)` for some key, that is, a
    command with the bridge script name and no `-PassThrough`;
  - **linked:** contains the bridge script name and `-PassThrough`;
  - **other:** anything else.

  `connect()` refuses linked like conflict. `disconnect()` removes
  `statusLine` only when it is *ours*, never linked or other. It still deletes
  this key's snapshot.
  **Done when:** new tests show:
  - a prefixed command is never removed by Disconnect;
  - Connect rejects it;
  - every existing claude test still passes.

- [x] **2. Pass-through script mode.** Add `[switch]$PassThrough` to `SCRIPT`.
  Read stdin as UTF-8. Save `rate_limits` exactly as today: only those fields,
  an atomic write, and an existing reading kept when the input has none. In
  pass-through mode, write the original input bytes to stdout as UTF-8 with no
  BOM, through `[Console]::OpenStandardOutput()`, and print nothing else. The
  pass-through happens even when parsing or saving fails, and the script always
  exits 0. Without the switch, behaviour is unchanged.
  **Done when:** Windows-gated tests pipe the fixture, a non-ASCII input and
  `not json` through `-PassThrough`. For each, stdout equals the input
  byte-for-byte, with no BOM, and the exit code is 0. A valid input also saves a
  snapshot. The existing no-switch test still prints `5h 24% | 7d 41%`.

- [x] **3. `linked` state, prefix and readings.**
  - Add `prefixCommand(dataDir, key)`:
    `powershell -NoProfile -ExecutionPolicy Bypass -File "<script>" "<out>" -PassThrough |`
    using the same forward-slash paths and the same snapshot file
    `claude-<key>.json` as `bridgeCommand`, followed by one space.
  - `connectionStatus` returns:
    - `linked` when the command is linked and contains this key's output path;
    - `conflict` for any other non-ours command, including a prefix for another
      card, with detail "Linked to a different Token Huddle card".
  - Add `connection.link(context)`. It writes the script into `dataDir`, which
    is Token Huddle's own folder, and returns `{ prefix, file }`, where `file`
    is the settings path. It changes no settings.
  - `read()` returns:
    - linked with a snapshot → `ok`;
    - linked with no snapshot → `missing`, "Linked. Send a message in Claude
      Code in a terminal to get the first reading";
    - conflict with no snapshot → `missing`, "You have your own status line.
      Open Settings to add Token Huddle to it";
    - conflict with a snapshot → unchanged (`stale`, reconnect message).
  - Update the "Claude Code" description in `providers/index.js` and the
    overview data model line to list `linked` and optional `link`.

  **Done when:** tests cover:
  - the `linked` status for this key;
  - `conflict` for another key's prefix;
  - the exact prefix string (forward slashes, ends with `| `);
  - `link()` writing the script and leaving `settings.json` byte-identical;
  - all four `read()` outcomes above.

- [x] **4. Settings window.**
  - **Main and preload:** add `settings:link` to `main.js`, using the existing
    `handle()` wrapper and `bridgeContext()`. It calls `connection.link`, then
    Electron `clipboard.writeText(prefix)`, then returns `{ prefix, file }`. Add
    a named `link(key)` to the preload.
  - **Badges** (`settings.js`, `CONNECTION`): conflict → "Own status line",
    linked → "Linked". Add a `.badge.linked` style in `settings.css` using the
    connected colours.
  - **Conflict card:**
    - Text: "You already have your own status line. Put Token Huddle's prefix
      in front of its command, and both will run."
    - A **Copy prefix** button.
    - After a click: the copied prefix in a read-only, selectable code block
      (`textContent` only), "Copied", and three steps:
      1. Open `<file>`.
      2. Paste the prefix at the start of the `statusLine` `"command"` value.
         Inside the JSON string, escape each `"` in the prefix as `\"`.
      3. Send a message in Claude Code in a terminal.
    - The shown prefix survives re-renders: keep it per card key in a
      module-level map in `settings.js`.
  - **Linked card:**
    - With a reading: "Usage arrives through your own status line."
    - While waiting: "Linked. Send a message in Claude Code in a terminal."
    - Always: "To unlink, remove the prefix from your status line command."
    - No Connect or Disconnect button.
  - **Errors:** a failed `link` shows in the existing `#error` alert (`role="alert"`).

  **Done when:** `npm run screenshot -- out.png --settings` (demo data) still
  renders. A real run (step 5) shows each of the three card states.

- [x] **5. Real check and docs.**
  - **Real check:** run this on the maintainer's machine. It needs approval to
    swap `~/.claude/settings.json` temporarily, and the original bytes are
    restored, as in feature 9:
    1. Set a small custom status line. Confirm Settings shows *Own status line*.
    2. Copy the prefix and apply it. Confirm *Linked* and waiting.
    3. Send one terminal message. Confirm the card has bars, and the custom
       status line output still shows in the terminal.
    4. Restore the original settings.

    Record the prefix's added time per response (one `Measure-Command` run of
    the prefixed pipe) as an observation, not a limit.
  - **Docs:**
    - README "Connecting Claude Code": replace "the Claude Code card stays
      empty" with the prefix how-to and how to unlink.
    - CHANGELOG `Added`: one line.

  **Done when:** the real check passes each state, with the observations
  recorded in Notes. `npm test` passes. The README describes the prefix.

## Files / areas

- `src/main/providers/claude.js`: `SCRIPT`, the classifier, `prefixCommand`,
  `connectionStatus`, `link`, `connect`, `disconnect`, `read`
- `src/main/providers/index.js`: contract comment
- `src/main/main.js`: `settings:link` handler, `clipboard` import
- `src/main/preload.js`: `link`
- `src/renderer/settings.js`, `src/renderer/settings.css`
- `test/claude.test.js`
- `README.md`, `CHANGELOG.md`, `blueprint/context/project-overview.md` (Provider
  contract line)
- Unchanged: `src/main/instances.js` passes the status object through
  (line 187). Confirm during step 3 that it does not filter on state values.

## Data / contracts

- **Connection states:** `connected | linked | disconnected | conflict |
  unsupported | error`. `linked` is new. It means the user's own command carries
  this card's prefix.
- **`connection.link(context)`** → `{ prefix: string, file: string }`. Its only
  side effect is writing `token-huddle-statusline.ps1` into `dataDir`. It is
  optional in the provider contract, and only Claude has it.
- **Prefix:**
  `powershell -NoProfile -ExecutionPolicy Bypass -File "<dataDir>/token-huddle-statusline.ps1" "<dataDir>/claude-<key>.json" -PassThrough | `
  It uses forward slashes, because Git Bash eats backslashes (the same reason as
  `bridgeCommand`).
- **Snapshot file:** unchanged. The same `claude-<key>.json`, the same
  `captured_at` + `rate_limits` only. Linked and connected modes write the same
  file. An old snapshot from an earlier Connect shows with its own age until the
  first linked response.
- **Script:** pass-through output is exactly the input bytes, as UTF-8 with no
  BOM. The script always exits 0. It reads nothing else and makes no network
  call.
- **IPC:** `settings:link(key)` → `{ ok: true, prefix, file }` or
  `{ ok: false, error }` via `handle()`. An unknown key gives "This card has
  nothing to connect".

## Testing

- `npm test` (Node runner, offline). The baseline is 42 pass, observed at the
  feature 9 completion today.
- New unit tests are in `test/claude.test.js`: classification, the prefix
  string, `link()` side effects, the `linked` status and readings. The script
  pass-through tests are skipped off Windows like the existing script test.
- The Settings UI is not unit-tested (coding standards: UI is checked by
  screenshot and real run). The screenshot script uses a separate profile with
  demo data, so the three Claude states are shown by the real check in step 5.
  Never claim them from the screenshot.

## Notes for the AI

- **Security boundary:** another tool's settings. Token Huddle must not write
  `~/.claude/settings.json` in this feature. `link()` writes only inside
  `dataDir`. Tests assert that `settings.json` bytes are unchanged after
  `link()` and after Disconnect on a linked or own command. During the step 5
  real check, the agent swaps the maintainer's settings only with the
  maintainer's explicit approval, and restores it byte-for-byte.
- The prefix and the settings path come from `dataDir` and may contain the
  username. Render them with `textContent` only. Never log them.
- The user's command is never displayed or parsed beyond the classification
  substrings.
- Keep one saver: pass-through is a switch on the existing `SCRIPT`, not a
  second script.
- `connect()` rewrites `SCRIPT` and `link()` writes it too. Both write the full
  current script, so an older installed script gains the switch.
- The CSP stays strict. The code block is a `pre`/`code` element styled in
  `settings.css`, with no inline style.

### Changed during the build

- **The copied prefix is already JSON-escaped.** `main.js` escapes each `"` as
  `\"` before copying and showing it, so step 2 tells the user only to paste
  it inside the quotes. The spec's "escape each `"` yourself" step is gone.
- **Linked text comes from the provider.** `describe()` gives the Settings
  card no reading. So `connectionStatus` puts the "Usage arrives…" or
  "Linked. Send a message…" text in `detail`, based on whether the snapshot
  file exists.
- **New conflict message.** The conflict detail and the `read()` message
  changed, as the spec asked. Two existing assertions were updated from
  `/already use a custom/` and `/will not replace/` to the new text.
- **Exact "ours" (after code review).** At first `classify()` counted any
  command with the script name and no `-PassThrough` as ours. A user's own
  `"…ps1" "…" | mycmd` could then be removed by Disconnect or replaced by
  Connect. *Ours* is now a regex match of exactly the `bridgeCommand` shape,
  for any card and any install folder. Anything else is linked (script name
  plus `-PassThrough`) or other. Tests cover a user command without the switch
  (left untouched) and an older install's bridge command (still ours). The
  maintainer's real connected setup still reads `connected`.
- **IPC contract as built:** `settings:link(key)` →
  `{ ok: true, prefix, file }`, where `prefix` is the **JSON-escaped** text
  that was copied. `connection.link()` itself still returns the raw prefix. A
  non-string `key` gives "Unknown card". A provider with no `link` gives "This
  card has nothing to link".
- **Card wording as built:**
  - Conflict detail: "You already have your own status line. Token Huddle will
    not replace it: put Token Huddle's prefix in front of its command, and
    both will run."
  - Linked waiting: "…to get the first reading."
  - Step 2 of the copy steps also says to replace an existing Token Huddle
    prefix (up to the first `|`), not to add a second one.
- **Small additions not in the spec:**
  - `link()` refuses to run off Windows, like `connect`, with a test.
  - The `'auto'` description in `providers/index.js` no longer says "login",
    because no provider reads one since feature 6.
- **Known limit:** "Usage arrives through your own status line" only checks
  that the snapshot file exists. A snapshot left from an earlier Connect makes
  it show before the first linked response. The card's "last turn" time still
  shows its real age. Better stale copy belongs to 17a.

### Observations (step 5)

- **Step 4 screenshot:** `npm run screenshot -- <scratch>/f10.png --settings`
  saved `f10.png` and `f10-settings.png`. The Settings window rendered all
  three cards. In the separate profile, the Claude card read "Not connected",
  connected to a different card, which is expected.
- **`instances.js` check (step 3):** `describe()` passes the `status()` object
  through untouched (line 187). There is no filter on state values, so
  `linked` reaches the renderer.
- **Time added.** One `bash` stand-in for the user's command, 3 runs:
  227-239 ms plain, 740-796 ms with the prefix. That is about 0.5 s more per
  status line run, mostly PowerShell starting up.
- **Real run on the maintainer's machine** (settings swapped with approval, then
  restored and compared byte-for-byte: identical):
  - With a test `bash` status line, Settings showed **Own status line**.
  - **Copy prefix** showed the prefix and the three steps, and rewrote the
    bridge script with `-PassThrough` (01:12:44 local).
  - With the prefix applied, `connection.status` returned `linked`.
  - One terminal message: the test line `my line ok … bytes` still showed. The
    snapshot moved from 1794683719 to 1794685483 (19:44:43 UTC), and the
    maintainer saw the card update and Settings show Linked.
  - **Not observed for real:** the "waiting for the first reading" text. A
    snapshot from feature 9 already existed (the expected old-reading case).
    Unit test `readings for an own status line` covers it.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":15855,"specSha256":"4221e4fc1df4b6f4b4838932853b82131361520d0e1b24a00bb952a197dc4c5d","branch":"refs/heads/feature/claude-code-for-users-with-their-own-status-line","head":"1ded5b41e4dc6480ee6f7cf9ac9e30da1f833dc0","baseRef":"refs/heads/main","baseCommit":"be00f32e9b48bc6cdfa4f191202a7bef7383d047","sourceTree":"5eaae20881edb5a36d94e171dd8b71d765c34d5b","landing":"local-merge","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** 1ded5b41e4dc6480ee6f7cf9ac9e30da1f833dc0
**Base commit:** be00f32e9b48bc6cdfa4f191202a7bef7383d047
**Base ref:** main
**Spec hash:** 4221e4fc1df4b6f4b4838932853b82131361520d0e1b24a00bb952a197dc4c5d
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-11-14T19:59:49Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-11-14T20:02:16Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Handoff

Review the active spec and the complete `be00f32e9b48bc6cdfa4f191202a7bef7383d047..1ded5b41e4dc6480ee6f7cf9ac9e30da1f833dc0` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

### Commands

- `git rev-parse HEAD`, `git merge-base main HEAD`, `sha256sum blueprint/context/current-feature.md`, `git status --porcelain --untracked-files=all`: pass (HEAD, merge base and spec hash match the request; only `blueprint/context/review.md` differed)
- `git diff be00f32..1ded5b4`: pass (11 files reviewed)
- `npm test`: pass (51 tests, 0 fail, 0 skipped)
- Manual script experiment in a temporary scratch folder (deleted afterwards): pass (save failure still passes input through with exit 0; empty input exits 0 with no output; the real prefix piped through `bash -c` into `cat` returned the input byte-for-byte and saved the snapshot)
- Lint, typecheck, build: unavailable (not declared yet; build plan step 11)

### Evidence

- `src/main/providers/claude.js`: `classify()` uses the exact `OURS` regex, `disconnect()` removes only `ours`, `connect()` refuses `linked` and `conflict`, `link()` writes only `dataDir`; `SCRIPT` reads raw stdin bytes, writes them back through `OpenStandardOutput()` in pass-through mode, always `exit 0`.
- `src/main/main.js`: `settings:link` uses `handle()` and `bridgeContext()`, JSON-escapes the prefix before `clipboard.writeText`.
- `src/renderer/settings.js`: prefix and settings path rendered with `textContent` only; no inline style added; errors go through the existing `run()`/`showError()`.
- `test/claude.test.js`: settings bytes asserted unchanged after `link()`, Disconnect on linked and on own commands; Windows-gated pass-through test runs (not skipped) on this machine.
- No network calls or credential reads in the delta (searched the diff).

### Findings

- F-01 [P3] open - Pass-through after a failed save has no test

### Remaining risk

- Lint, typecheck and build commands are unavailable (not declared yet).
- The Settings UI states are not unit-tested; this review relied on code reading and the builder's recorded real run, and did not launch the app.
- The "waiting for the first reading" Settings text was not observed in a real run (covered by unit test only, per spec Notes).
- Known limit, per spec: "Usage arrives" only checks that a snapshot file exists, so an old snapshot can show as current until the first linked response.

## Try it now

1. Start the widget from this version with `npm start` and open **Settings**.
2. In Claude Code's `settings.json`, set your own `statusLine` command (for example `bash ~/.claude/my-line.sh`). The Claude Code card shows **Own status line** and a **Copy prefix** button.
3. Click **Copy prefix**. The prefix and three steps appear. Paste it at the very start of your `"command"` value, inside its quotes, and save. The card shows **Linked**.
4. Send one message in Claude Code in a terminal. Expect: your own status line still shows as before, and the widget card updates with Session and Weekly bars.
5. Watch for: Disconnect never appears on a linked card, and Token Huddle never edits your `settings.json`. To unlink, delete the prefix yourself.
