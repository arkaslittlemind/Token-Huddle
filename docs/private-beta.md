# One-week private beta

This is a preparation guide, not a record of completed testing. The repository
stays private. The maintainer chooses the start date and invited testers outside
tracked documents. The beta is free; no telemetry or email signup is added.

## Maintainer: prepare the handoff

- [ ] Run `npm run verify` on the chosen source revision.
- [ ] Run `npm run dist` for local-only Windows builds, or use an existing
  reviewed private draft from the [release pipeline](../.github/workflows/release.yml).
  Creating tags or new releases requires a separate instruction.
- [ ] Record the revision and version with the beta package. Share
  `Token-Huddle-Setup-<version>.exe` and
  `Token-Huddle-<version>-portable.exe`, this guide and `SHA256SUMS.txt` through
  the private channel agreed with each tester. Testers need neither source
  repository access nor a GitHub token. Do not share source history.
- [ ] For local builds, generate the checksum file from those exact executables
  using the PowerShell below. Existing pipeline builds already include it.
- [ ] Agree on a private reply channel for voluntary reports. Keep participant
  names, contact details and personal readings out of tracked documents.
- [ ] Explain the unsigned-build warning and manual updates before handoff.

From the repository root, after `npm run dist`:

```powershell
$betaHashes = Get-ChildItem dist -Filter *.exe |
  ForEach-Object { "$((Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLower())  $($_.Name)" }
[IO.File]::WriteAllText("$PWD/dist/SHA256SUMS.txt", ($betaHashes -join "`n") + "`n")
```

Share only the selected build's files and matching hashes. If replacing a build
during beta, record its revision, regenerate hashes and tell testers which version
to use. A checksum detects changed bytes; confirm the sender and delivery channel
as well.

## Tester: install and start

1. Use Windows x64; the app has been tested on Windows 11. Choose the installer
   for a Start menu entry and uninstaller, or the portable executable to run
   without installing. Both use `%APPDATA%\Token Huddle` for settings.
2. Before running, compare the file's SHA-256 with the matching entry in the
   supplied `SHA256SUMS.txt`:

   ```powershell
   Get-FileHash '.\Token-Huddle-Setup-<version>.exe' -Algorithm SHA256
   ```

   Replace `<version>` with the supplied version; use the portable filename if
   you chose that build. If the hashes differ, stop and contact the maintainer.
3. Builds are unsigned. If SmartScreen says **Windows protected your PC**, select
   **More info**, confirm the filename and that it came from the maintainer,
   then **Run anyway** if you choose to proceed. If organizational policy or
   Smart App Control blocks it, report that and stop; do not disable protection.
   The project currently ships unsigned; a matching checksum confirms the supplied
   bytes but does not provide a verified publisher identity.
4. Open Settings or the tray menu and turn **Check for updates** off. The first
   check is scheduled 30 seconds after launch; if it runs before you turn it off,
   it fails quietly while releases are private. Private GitHub releases cannot
   be fetched by the app without credentials, which Token Huddle never holds.
   The maintainer supplies replacement builds manually during beta.
5. Read the first-run welcome and connect only the tools you want. No tool login
   is needed by Token Huddle. A missing tool is expected if you do not use it;
   report a missing card only if the tool is installed and should be detected.

## Tester: check normal use

- **Claude Code:** click **Connect** in Settings, review the exact proposed
  `statusLine` change, then confirm it. A backup is kept. Run a Claude Code turn
  in a terminal and check that percentages and reset times appear. VS Code's
  Claude extension and T3 Code do not run this status line; those readings update
  after the next terminal response. Per-model limits are not supplied.
- **Your own Claude status line:** it is never replaced. Settings offers
  **Copy prefix** instead. If comfortable editing your status-line command,
  copy that prefix and put it at the very start of the `"command"` value under
  `"statusLine"` in Claude Code's `settings.json`, inside the existing quotes.
  The copied prefix is already escaped for JSON. Preserve the rest of your
  command and save. Settings then shows **Linked**; readings arrive after your
  next Claude Code response in a terminal. The prefix passes the input unchanged
  to your original command, which still runs if saving the usage fails. Each turn
  takes a little longer because PowerShell starts first. To unlink, remove only
  the copied prefix. If unsure, skip this setup and report it to the maintainer.
- **Codex:** live readings come from the installed `codex` program, normally
  refreshed every five minutes. Its session-log snapshot is the fallback.
  **Local files only** stops live requests through the program.
- **OpenCode:** shows token totals and cost from its local database, not a
  subscription quota. Local sources refresh every minute.
- **Freshness and failures:** inspect each card's source and age, then try
  Refresh if a value looks stale. A tool that has not reported may have no new
  reading. If an error persists, record the displayed message and reproduction
  steps; do not send raw tool logs or credential files.
- **Daily use:** try full/compact views, moving the widget, themes, tray hide/show,
  **Ctrl+Alt+H**, and Settings. Check that it stays useful without covering work.
  Observe threshold notifications during normal use (defaults 80% and 95%);
  notifications occur once per threshold per reset window. Do not spend tokens
  just to reach a limit. Record anything you could not exercise as untested.
- **Disconnect:** test **Disconnect** for a Claude status line added by Connect;
  verify it is removed and reconnect if desired. For your own linked command,
  remove the copied prefix yourself instead.

## Seven-day schedule

| When | Activity | Feedback |
| --- | --- | --- |
| Day 1 | Install, inspect onboarding, connect tools and compare fresh readings | Installation friction, missing tools, unclear guidance |
| Days 2-3 | Keep the widget open during ordinary work | Accuracy, freshness, readability, window placement |
| Day 4 | Midpoint check-in through the agreed private channel | Biggest annoyance, failures, alerts observed or untested |
| Days 5-6 | Continue normal use; try a replacement build only if supplied | Whether reported issues recur; version used |
| Day 7 | Give final voluntary feedback; maintainer reviews the results | Continued use, top request, unresolved blockers |

Ask testers: Was setup understandable? Did fresh readings match the tool's
reported window? Were missing/stale/error messages actionable? Were alerts useful
or distracting? Would you keep using the widget? What would you change first?
Rank Cursor/Windsurf support, burn-rate warnings and weekly spend reports, or name
a different need. These are requests to evaluate, not promised features.

## Private bug-report template

Copy this to the agreed private channel. Redact usernames, personal paths, account
details and personal usage from text and screenshots. Include only the relevant
window; credential files and raw tool logs are never needed.

```text
Token Huddle version / supplied build identifier:
Installer or portable:
Windows version:
Affected tool and its version (if relevant):
Source/freshness label and displayed error (redacted):
Steps to reproduce:
Expected result:
Actual result:
How often it happens:
Optional cropped, redacted screenshot:
```

## Finish or leave the beta

Close the app before replacing it with a supplied build. Installing a newer
installer over an older one preserves connections. For removal, use Windows
Settings > Apps for the installed build: uninstall undoes the Claude Connect
entry and turns off Start with Windows. For portable, click **Disconnect** before
deleting the executable and turn off Start with Windows if enabled. A custom
linked status line needs its prefix removed manually. The app data folder stays;
delete it manually only once no linked command uses its bridge script.

## Maintainer: pending exit review

Keep actual participant reports privately; record only a redacted summary here
if later authorized. None of the following has been completed by writing this guide.

- [ ] One week of testing has occurred; dates and tested versions are recorded privately.
- [ ] Summarize install success, providers exercised, accuracy/freshness issues,
  usability and alerts, distinguishing failures from untested cases.
- [ ] Triage bugs with reproduction steps; schedule fixes separately.
- [ ] Rank requests and continued-use feedback without treating responses as telemetry.
- [ ] Review unresolved blockers and decide to extend beta or prepare public launch.
- [ ] Explicitly authorize any public-launch actions from the [launch playbook](go-to-market.md).

Seven days passing does not automatically authorize a launch.
