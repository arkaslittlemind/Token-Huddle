# Feature: Threshold alerts

**From build-plan:** feature 15
**Build attempt:** 1
**Branch:** feature/threshold-alerts
**Status:** verified

## Goal

Warn the user before they hit a limit. When a usage window on a card crosses a
user-set threshold (default 80% and 95%), Token Huddle shows a Windows
notification. Each threshold fires at most once per window per reset, also across
app restarts. Each card has its own on/off switch for alerts.

## In scope

- A pure, Electron-free module `src/main/alerts.js` that decides which
  notifications to send from the latest readings, the thresholds, the per-card
  switches and the record of what was already sent.
- Two global thresholds saved in `settings.json`, default `[80, 95]`, editable in
  the settings window.
- A per-card **Alerts** switch in the settings card list, default on.
- A persisted record of sent alerts so a restart inside the same window period
  does not repeat a notification.
- Windows notifications through Electron's `Notification`; clicking one shows the
  widget.
- `CHANGELOG.md` line under `[Unreleased]` / `Added`; `project-overview.md` data
  model updated for the new settings and Instance fields.

## Out of scope

- Window behaviour (step 16), error and empty state copy (17a), full keyboard and
  screen-reader pass (17b). New controls still get labels and keyboard access.
- Per-card or per-window thresholds, snoozing, sounds, a notification history.
- Alerts from demo mode (demo data never notifies and never writes the record).
- An app user model id or Start menu shortcut for packaged builds (step 18).
- Forecasts ("you will hit the limit at...", 23c).

## Build loop

`workflow.stepReview` is `feature`: build all steps, then stop once for review of
the whole feature. `workflow.checkpointCommits` is `disabled`: no commits during
the build. `/complete` makes the feature commit. Run `npm run verify` after each
step; it must be green before moving on.

## Build steps

- [x] 1. **Alert logic + tests** - add `src/main/alerts.js` (no Electron import)
  with:
  - `sanitizeThresholds(raw)` → sorted, de-duplicated integers 1 to 100, at most
    two; anything invalid or empty falls back to `[80, 95]`.
  - `parseThresholds(values)` for the settings form → `{ ok, thresholds }` or
    `{ ok: false, error }` with a short user-facing message ("Enter a whole number
    from 1 to 100").
  - `sanitizeSent(raw)` → a clean record (drop malformed entries).
  - `check({ readings, instances, thresholds, sent, now })` →
    `{ notifications, sent }`, following the rules in Data / contracts.
  Add `test/alerts.test.js` covering every rule below.
  **Done when** `npm run verify` passes with the new tests.
- [x] 2. **Settings shape** - `sanitize` in `instances.js` keeps an `alerts`
  boolean on each Instance (`item.alerts !== false`, so existing cards default
  on); `discover` and `addAccount` create cards with `alerts: true`; `describe`
  passes `alerts` to the settings window. `main.js` `loadSettings` runs
  `sanitizeThresholds` and `sanitizeSent` on `thresholds` and `alertsSent`.
  Extend `test/instances.test.js` for the default and for `alerts: false`
  surviving sanitize.
  **Done when** `npm run verify` passes and an existing `settings.json` without
  the fields loads with alerts on and `[80, 95]`.
- [x] 3. **Notify from the refresh loop** - in `main.js`, after `collect` in
  `refresh()` and only when not in demo mode, call `check`, save the new
  `alertsSent` when it changed, and show each notification with
  `new Notification({ title, body, icon: windowIcon() })`. Skip silently when
  `Notification.isSupported()` is false. Clicking a notification shows the
  widget (create it if closed). Wrap the show in `try` so a notification failure
  never breaks the refresh.
  **Done when** with a threshold set below a card's current usage (by editing
  `settings.json` while the app is closed), `npm start` shows one notification
  for that window, a second refresh and a restart show none, and the widget
  still updates. If no toast appears in the unpackaged app, record that as
  unverified until step 18 rather than adding an app id here.
- [x] 4. **Settings UI** - in `settings.html` / `settings.js` / `settings.css`:
  an **Alerts** section below the card list with two labelled number inputs
  ("First alert at", "Second alert at", `%` suffix, `min=1 max=100 step=1`),
  saved on `change` through a new `settings:set-thresholds` IPC that validates
  with `parseThresholds`. An invalid value shows the error in a message element
  tied to the input with `aria-describedby` and `aria-invalid`, announced with
  `role="alert"`, keeps the last saved values, and clears on the next valid
  save. Each card row gets an **Alerts** checkbox beside **Show**, through a new
  `settings:set-alerts` IPC (key validated against the card list, value
  `Boolean`). Add both calls to `preload.js` as named functions. Use existing
  tokens and settings styles in both themes; the welcome view is unchanged.
  **Done when** `npm run verify` passes, both controls work by keyboard, an
  invalid value shows and then clears its error, and
  `npm run screenshot -- out.png --settings` shows the section in the current
  theme.
- [x] 5. **Docs** - `CHANGELOG.md` `[Unreleased]` / `Added` line; update the
  Settings and Instance sections of `blueprint/context/project-overview.md`
  with `thresholds`, `alertsSent` and `alerts`.
  **Done when** `npm run verify` passes and the docs match the code.

## Files / areas

- `src/main/alerts.js` (new), `test/alerts.test.js` (new)
- `src/main/instances.js`, `test/instances.test.js`
- `src/main/main.js` (load, refresh, IPC), `src/main/preload.js`
- `src/renderer/settings.html`, `settings.js`, `settings.css`
- `CHANGELOG.md`, `blueprint/context/project-overview.md`

## Data / contracts

Settings (`<userData>/settings.json`), new fields:

- `thresholds` (number[]) - one or two integers 1 to 100, ascending, unique;
  default `[80, 95]`; anything else falls back to the default.
- `alertsSent` (object) - `{ "<cardKey>/<windowId>": { level, resetsAt } }`.
  `level` is the highest threshold already notified in this period; `resetsAt` is
  the window's `resetsAt` (ms or null) when it was recorded. Written only by
  Token Huddle; malformed entries are dropped on load.

Instance, new field: `alerts` (boolean) - alerts on for this card; default `true`,
including existing cards without the field.

Rules for `check`:

- Only readings whose card has `alerts !== false`. Hidden cards are not read, so
  they never alert. Windows with `rolledOver: true` never alert.
- A window's crossed level is the highest threshold `<= usedPercent`.
- A new period starts, and the entry is reset, when the reading's `resetsAt`
  differs from the recorded one by more than 60 seconds (providers report
  slightly different reset times between readings), or when `rolledOver` is
  true, or, for a window with `resetsAt: null`, when `usedPercent` falls below the
  recorded `level`.
- Notify when the crossed level is higher than the recorded level (or there is no
  record). Crossing both thresholds in one step sends one notification, for the
  higher one. Raising a threshold above the recorded level can alert again in the
  same period; that is intended.
- Entries for cards that no longer exist, or whose `resetsAt` is more than a day
  in the past, are pruned.
- Pure: takes `now`, returns a new `sent` object, never mutates its inputs.

Notification shape (`check` output):
`{ key, windowId, title, body }`. Title: `"<card name> · <window label> at <n>%"`
with `n` the rounded `usedPercent`. Body: `"Resets in <duration>"` from
`resetsAt` and `now` (reuse the duration formatting in `providers/util.js` if it
fits, otherwise a small local helper), or `"Over <level>% of this limit"` when
`resetsAt` is null. Text goes to the OS notification, not the DOM.

IPC (each resolves to `{ ok, error? }` through the existing `handle` wrapper):

- `settings:set-thresholds` (values: unknown[]) → validated by `parseThresholds`.
- `settings:set-alerts` (key: string, on: boolean) → unknown key is an error.

## Testing

- `test/alerts.test.js` (`node:test`, explicit `now`): defaults and sanitize
  edge cases; first crossing; no repeat on the next reading; second threshold
  after the first; jump straight past both sends one; small `resetsAt` jitter
  keeps the period; a later `resetsAt` re-arms; `rolledOver` re-arms and never
  alerts; null `resetsAt` re-arms when usage drops; card switched off sends
  nothing; pruning; inputs not mutated; title and body text.
- `test/instances.test.js`: `alerts` default and preserved `false`.
- Notification display and the settings UI are checked by running the app and
  the settings screenshot, not unit tests.
- Baseline before this spec: `npm run verify` passed (lint, format check, 77
  tests).

## Notes for the AI

- No network, no new dependencies; Electron's `Notification` is the whole
  notification layer.
- Keep `alerts.js` Electron-free like `instances.js` and `appearance.js`.
- `refresh()` already runs every minute and after each settings change; do not add
  another timer.
- Save `alertsSent` through the existing debounced `saveSettings`.
- Card names and labels are user text; they only reach the OS notification and
  `textContent`, never `innerHTML`.
- No em dashes in code, docs or the changelog.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":9395,"specSha256":"807bffe5e27eadc00611c6601b8f629da804c7cdb7aa5aaf59a617f6b0db0f01","branch":"refs/heads/feature/threshold-alerts","head":"66df17b1f28cf9a514fce4898fdbc37952fd21a7","baseRef":"refs/heads/main","baseCommit":"66df17b1f28cf9a514fce4898fdbc37952fd21a7","sourceTree":"5b289563185e2644a286bbaea79ee8c403b0ad95","landing":"local-merge","absentOptional":[]} -->

## Findings

### 15/F-01 [P2] closed - Saving alert levels redraws the fields from stale state

**File:** src/renderer/settings.js:240
**Found:** 2026-11-15 by /audit (scope: current; lens: all)
**Why it matters:** On a successful save, `saveThresholds` calls `render(lastState)`. `lastState` still holds the old `thresholds`: the `settings:set-thresholds` reply comes back before `settings:update`, because `push()` in src/main/main.js:202 does not await `pushSettings()`, which first awaits `describe`. A level field that is not focused is reset to its old value until the update arrives. For example, set the first field to 70, then Tab: the field shows 80 again briefly. If a refresh is already running, `refresh(true)` returns early and the field only corrects at the end of that pass.
**Suggested fix:** Drop `if (lastState) render(lastState);` from the success branch. The fields already show the saved values, and the next `settings:update` redraws them. No requirement is lost.
**Resolution:** 2026-11-15 by /implement. `saveThresholds` no longer redraws on success. In the running app, 12 samples taken every 60 ms after setting the first field to 70 all read `70, 90`; the old value never came back. Closed 2026-11-15 by /audit (scope: current): saveThresholds has no redraw on success; render() still skips the focused and invalid fields, so the next settings:update is the only redraw. No new defect.

### 15/F-02 [P3] closed - The error marks the field that changed, not the invalid one

**File:** src/renderer/settings.js:249
**Found:** 2026-11-15 by /audit (scope: current; lens: all)
**Why it matters:** Both values are sent on every change, but `aria-invalid` goes on `event.target`. If the first field holds 150 and the user then edits the second to 90, the save fails and the valid second field is marked invalid as well. Screen-reader users and sighted users are pointed at the wrong field.
**Suggested fix:** Mark each input by its own value: run the same whole-number 1 to 100 test per field in the renderer, or return the failing index from `parseThresholds` through the IPC result.
**Resolution:** 2026-11-15 by /implement. After every save attempt, each field's `aria-invalid` is set from its own value (renderer check: whole number 1 to 100). Main still validates. In the running app, with the first field at 150, editing the second to 90 left only the first marked. Closed 2026-11-15 by /audit (scope: current): the renderer isLevel matches parseThresholds (trimmed 1 to 3 digits, 1 to 100); each field is marked from its own value. No new defect.

### 15/F-03 [P3] closed - The recorded reset time follows drift, which the spec does not describe

**File:** src/main/alerts.js:78
**Found:** 2026-11-15 by /audit (scope: current; lens: all)
**Why it matters:** The spec says `alertsSent.resetsAt` is "the window's `resetsAt` ... when it was recorded". The code moves it to every new reading that falls within 60 seconds. Small changes can then add up without ever starting a new period. `alertsSent` also changes, and `settings.json` is rewritten, on any refresh where a provider's reset time moves. This is a product rule, so it needs a decision.
**Suggested fix:** Either update the spec's Data / contracts to say the recorded time follows the latest reading (it was meant to tolerate jitter), or delete the line and its "follows the drift" assertion in test/alerts.test.js. Deleting it loses tolerance for slow drift beyond 60 seconds.
**Resolution:** 2026-11-15 by /implement, on the user's "fix all of them": the code now matches the spec. The line that followed drift is gone, and the jitter test now asserts that the record stays exactly as first recorded, so nothing is saved. Closed 2026-11-15 by /audit (scope: current): the code matches the spec. Codex (codex.js:50) and Claude (claude.js:239) both report absolute reset timestamps, so keeping the time first recorded does not drift.

### 15/F-04 [P3] closed - Duplicated helpers and default rule

**File:** src/main/alerts.js:43
**Found:** 2026-11-15 by /audit (scope: current; lens: all)
**Why it matters:** `duration()` is a copy of src/renderer/renderer.js:22. If the two copies drift, the widget and the notifications will show reset times in different formats. "Alerts default to on" (`alerts !== false`) is written in `sanitize`, `describe` (src/main/instances.js) and `check`. `sanitize` already normalizes it, so the other two copies can disagree silently if the default ever changes.
**Suggested fix:** In `describe`, pass `instance.alerts` through, since `sanitize` guarantees a boolean. Keep `check`'s guard, because it takes raw instances in tests. For `duration`, accept the copy (the sandboxed renderer cannot `require`), or move it to a plain-data shared script like `mark.js`. No requirement is lost.
**Resolution:** 2026-11-15 by /implement. `duration` now lives once, in `src/renderer/duration.js`, shared like `mark.js`: `<script>` in index.html and `require()` in alerts.js, with the ESLint override extended to it. The widget screenshot still shows "resets in 2h 12m". The `describe` half of the suggestion was wrong: `loadSettings` does not sanitize `instances` (only the first `refresh()` does), so `describe` can see raw saved cards. Its `!== false` guard stays. Closed 2026-11-15 by /audit (scope: current): duration.js uses the same pattern as mark.js (ESLint override, script tag before renderer.js, require in alerts.js), and the widget screenshot showed reset text. The describe guard was correctly kept.

## Try it now

1. Run `npm run screenshot -- shot.png --settings` and open `shot-settings.png`. Under **Alerts** you see **First alert at 80 %** and **Second alert at 95 %**, and every card has an **Alerts** switch next to **Show**.
2. Run `npm start`, open **Settings**, type `150` in **First alert at** and press Tab. The field turns red and "Enter a whole number from 1 to 100" appears. Type `5` and press Tab: the error clears.
3. With **First alert at** below a card's current usage (the widget shows each percentage), one Windows notification appears, for example "Codex · Weekly at 50%", "Resets in 12h 18m". Choose **Refresh now** in the tray menu: no second notification. Clicking the notification shows the widget. Set the levels back to 80 and 95 afterwards.
4. Run `npm run verify` and expect 91 passing tests.
