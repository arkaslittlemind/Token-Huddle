# Feature: Verify the Claude Code bridge in real use

**From build-plan:** feature 9
**Build attempt:** 1
**Branch:** feature/verify-the-claude-code-bridge-in-real-use
**Status:** verified

## Goal

Find out how the Claude Code status line bridge (built in step 6) behaves on the
maintainer's real machine. Record which hosts run it: a terminal, the VS Code
extension and T3 Code. Replace the documentation-based fixture with a redacted
recording of real status line input. Then make the README, the provider comment
and the project overview say what was observed instead of what was assumed.

This is a *(chore)*. The output is evidence and documentation, not new product
behaviour.

## In scope

- One run of Connect from the Settings window on the maintainer's machine, or
  a confirmation that the existing connection is current (see Notes).
- For each host (terminal, VS Code extension, T3 Code): send one message, then
  check whether the bridge snapshot `%APPDATA%\Token Huddle\bridge\claude-claude.json`
  was written or its `captured_at` advanced, and whether the widget card shows
  the reading. Record one of: *runs*, *does not run*, *not tested (host not
  available)*.
- A small capture script, `scripts/capture-statusline.ps1`, that saves the raw
  status line input to a path given as its argument. It is used once to record
  the fixture and kept so the fixture can be recorded again when Claude Code
  changes its format.
- Replace `test/fixtures/claude-statusline-input.json` with the recorded
  structure, redacted (see Data / contracts), and update its provenance row in
  `test/fixtures/README.md`, including how to record it again.
- README "Connecting Claude Code" → "Limits of this source": state which hosts
  update the card, based on the observations.
- The header comment in `src/main/providers/claude.js` ("it updates only while
  Claude Code runs in a terminal") and the Claude Code row in
  `blueprint/context/project-overview.md` External sources table ("VS Code
  extension and T3 Code unconfirmed until step 9"): replace them with the
  observed result.
- One `CHANGELOG.md` line under `[Unreleased]` → `Changed` saying the README now
  lists which Claude Code hosts update the card.

## Out of scope

- Any change to bridge behaviour, the status line script (`SCRIPT` in
  `claude.js`), Connect/Disconnect, or reading logic. If real use shows a defect,
  for example a missing snapshot in a host that should run it, a wrong path,
  Git Bash quoting, or a field shape that `parseSnapshot` does not accept, stop
  and record it. Then route it to `/fix "<defect>"`. Do not repair it here.
- Support for users who have their own status line (feature 10).
- Lint, format and the Verify command (feature 11).
- Workarounds that make the VS Code extension or T3 Code report usage when they
  do not run the status line.

## Build loop

`workflow.stepReview` is `feature`, so build all steps, then stop for one review
at the end. `workflow.checkpointCommits` is `disabled`, so make no commits
during the build. `/complete` creates the final commit. Steps 1 and 3 need the
maintainer to act. The agent prepares the exact instructions, waits for the
maintainer's report, and then checks the evidence on disk.

## Build steps

- [x] **1. Confirm the connection and test each host.** Open Settings
  (`npm start`) and check that the Claude Code card shows *Connected*. If it
  does not, the maintainer clicks Connect and accepts the preview. Note the
  `captured_at` of `claude-claude.json`, or that the file does not exist. Then,
  one host at a time with the others idle, the maintainer sends one message in
  (a) Claude Code in a Windows terminal, (b) the VS Code extension, (c) T3 Code
  if installed. After each one, the agent reads the snapshot file's existence,
  `captured_at` and modified time, and the maintainer reports what the card
  shows. Keep the results as a table in the spec's Notes.
  **Done when:** each of the three hosts has a recorded result (*runs*, *does
  not run*, or *not tested* with the reason), backed by the snapshot
  timestamps observed before and after.

- [x] **2. Add the capture script.** Add `scripts/capture-statusline.ps1`. It
  takes `param([string]$Out)`, reads all of stdin with
  `[Console]::In.ReadToEnd()`, writes it unchanged to `$Out` as UTF-8, and
  prints `recording` so the host shows that it ran. It changes no settings, has
  no network code, and saves nothing else.
  **Done when:** piping `test/fixtures/claude-statusline-input.json` into
  `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/capture-statusline.ps1 <tmp>`
  exits 0, prints `recording`, and `<tmp>` equals the input after JSON parsing.
  `npm test` still passes (42).

- [x] **3. Record and redact the real input.** The agent gives the maintainer
  the exact temporary `statusLine` command. It uses the same
  `powershell -NoProfile -ExecutionPolicy Bypass -File "<forward-slash path>" "<out>"`
  form as `bridgeCommand`, with `<out>` under `%TEMP%`, outside the repository.
  The maintainer: Disconnect in Settings → sets that command in
  `~/.claude/settings.json` → sends one message in a terminal Claude Code
  session → restores by removing it and clicking Connect again. The agent then
  writes the redacted fixture (rules under Data / contracts). Then it deletes
  the raw file in `%TEMP%`.
  **Done when:** the new fixture has the real recording's keys and value
  types, contains no real id, path, username, cost or usage number, and the
  Claude Code card is *Connected* again. `npm test` passes with no test
  expectation changed. If the recording's `rate_limits` shape is different from
  `parseSnapshot`'s contract, stop with a `/fix` instead.

- [x] **4. Document the result.** Update the README limits list, the
  `claude.js` header comment (comment only), the overview External sources row,
  the provenance row and re-record steps in `test/fixtures/README.md`, and the
  CHANGELOG line. Mention `scripts/capture-statusline.ps1` in the README project
  layout block.
  **Done when:** none of those files still says "unconfirmed" or "only while
  Claude Code runs in a terminal" unless that is what step 1 observed. Every
  host claim matches the step 1 table. `npm test` passes.

## Files / areas

- `scripts/capture-statusline.ps1` (new)
- `test/fixtures/claude-statusline-input.json` (replaced)
- `test/fixtures/README.md`
- `README.md` (Connecting Claude Code → Limits of this source; Project layout)
- `src/main/providers/claude.js` (header comment only)
- `blueprint/context/project-overview.md` (External sources table, Claude Code row)
- `CHANGELOG.md`
- Read only during the build: `~/.claude/settings.json` (`statusLine` key) and
  `%APPDATA%\Token Huddle\bridge\`. Never read `~/.claude/.credentials.json` or
  any other login file.

## Data / contracts

- **Fixture redaction.** Keep every key and the JSON type of every value from
  the real recording, in the same nesting. Replace values as follows:
  `session_id` → all-zero UUID; every path (`cwd`, `workspace.*`,
  `transcript_path` and any other path) → `/work/project...`-style
  placeholders; model id/name → `claude-example` / `Example`; `cost.*` and token
  counts → small sample numbers; `rate_limits.five_hour` / `seven_day` →
  `used_percentage` 23.5 / 41.2 and `resets_at` 1794700800 / 1794960000, so the
  existing test expectations and `NOW` stay valid. Keep `version` as recorded:
  it is not personal, and it dates the format. If a real field holds other
  personal text, such as an output style name or a git branch, replace it with a
  neutral placeholder. Build plan step 22 requires that personal usage numbers
  are not published. That is why the recorded usage numbers are not kept.
- **Snapshot contract** (unchanged): `captured_at` unix seconds;
  `rate_limits.{five_hour,seven_day}.{used_percentage:number, resets_at:unix seconds}`.
  If the real `resets_at` is not unix seconds, or `used_percentage` is not a
  number, that is a defect → `/fix`.

## Testing

- `npm test` (Node runner, offline) before and after. The baseline is 42 pass,
  0 fail (observed while writing this spec). The fixture swap must keep all 42
  passing with no assertion edits. That shows the real format matches what the
  tests assumed.
- Step 2's manual pipe check covers the capture script. It has no logic worth a
  unit test and is not run by the app.
- Host results are manual evidence from the maintainer's machine. Record them
  as observed, with timestamps. Do not claim a host result that was not run.

## Notes for the AI

- **Observed while writing this spec:** `~/.claude/settings.json` already has
  the Token Huddle `statusLine`, pointing at
  `C:/Users/<user>/AppData/Roaming/Token Huddle/bridge/claude-claude.json`. That
  folder holds only `token-huddle-statusline.ps1`. No snapshot exists, although
  this session runs in the VS Code extension. This suggests, without
  confirming, that the extension does not run the status line. Possible
  alternatives are that no terminal session has run since Connect, or that the
  script fails silently. Step 1 separates these causes: the terminal test runs
  first, and if it also writes nothing, that is a defect → `/fix`.
- The agent must not edit `~/.claude/settings.json` itself. Connect,
  Disconnect and the temporary capture command are the maintainer's actions on
  their own settings. The agent only supplies exact text and reads the result.
  **Changed during the build:** for step 3 the maintainer asked the agent to
  make the change for them. The agent copied `settings.json` to its scratchpad,
  swapped only the `statusLine`, and after the maintainer's one terminal message
  wrote the copy back. A string comparison of the restored file and the copy
  showed they were identical. Disconnect and Connect were not used, so the
  connection stayed in place. The re-record steps in `test/fixtures/README.md`
  follow this copy-and-restore flow.
- After the code review: `project-plan.md` (Claude Code sources row) was updated
  with the maintainer's approval, and the overview's `source-hash` was
  recalculated with the `/overview` rule. The README states the version only
  for the terminal, because the VS Code extension's and T3 Code's Claude Code
  versions were not recorded. The widget card itself was not viewed during the
  build: the evidence is the provider's `read()` result (`ok`, 5h and 7d).
- The raw recording can hold the username in paths and a real session id. Never
  commit it, never copy it into the spec or chat unredacted, and delete it after
  step 3.
- No logins: nothing in this chore reads credential files or makes a network
  call.
- Host results table (fill in during step 1):

  | Host | Before `captured_at` | After `captured_at` | Card | Result |
  | --- | --- | --- | --- | --- |
  | Terminal | no snapshot file | 1794683377 (2026-11-14 19:09:37 UTC) | maintainer saw the 5h / 7d status line in the terminal; provider `read()` on the real snapshot returns `ok` with 5h and 7d | **runs** |
  | VS Code extension | no snapshot file across the whole /feature and /implement session | unchanged after more responses, 1794683377 | n/a | **does not run** |
  | T3 Code | 1794683377 | 1794683377 after one T3 Code message with the terminal idle | n/a | **does not run** |

  Bridge script run by hand through bash with the fixture: printed
  `5h 24% | 7d 41%` and wrote a correct snapshot to a test folder. Recording
  (step 3): at the maintainer's request the agent swapped the `statusLine` and
  restored `settings.json` byte-for-byte from a copy. Raw recording deleted
  after redaction. Real `rate_limits` shape: `used_percentage` number,
  `resets_at` 10-digit unix seconds, so no defect.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":11755,"specSha256":"eeae7e6d1f88c6c83100256b6ab28a4d34166a68df2e1a3cb5a932a98cd239f0","branch":"refs/heads/feature/verify-the-claude-code-bridge-in-real-use","head":"410ae4b21b418e4d737dc50a22cf39b824f23579","baseRef":"refs/heads/main","baseCommit":"410ae4b21b418e4d737dc50a22cf39b824f23579","sourceTree":"4f79d0d29c6c888c95440dc56132f92ff283583b","landing":"local-merge","absentOptional":[]} -->

## Try it now

1. Start the widget with `npm start` and note the Claude Code card's percentages and its "last turn" time.
2. In a Windows terminal, run `claude` and send one short message.
3. Expect: within a minute, the card's "last turn" time resets to just now and the Session and Weekly bars match Claude's own usage page.
4. Watch for: a message sent from the VS Code extension or T3 Code does **not** move the card. That is the recorded result, not a fault.
