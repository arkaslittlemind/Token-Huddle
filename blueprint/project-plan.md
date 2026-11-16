# Token Huddle - Project Plan

> Unofficial, independent project. Not affiliated with or endorsed by Anthropic,
> OpenAI, or the OpenCode project. No vendor logos in the app, where tool names
> appear only to say which tool a card reads from. The landing page shows the
> official Claude Code, Codex and OpenCode marks only to name the supported
> agents, beside a not-affiliated notice.

## 1. Problem - What problem are we solving?

Developers now work across several AI coding agents at once (Claude Code, Codex,
OpenCode), often inside a harness such as T3 Code. Each subscription has its own
usage limits: a rolling 5-hour session window, a weekly window, sometimes more.

To know where they stand, a developer has to open each tool and find its usage
screen. Nothing shows all of them together, so people hit a limit mid-task
without warning, or under-use a subscription they are paying for.

**Token Huddle** is a small always-on-top desktop widget that shows every AI
subscription's usage in one place: how much of each window is used, when it
resets, and whether usage is running ahead of the clock.

It does this **without ever touching a tool's login**. Vendors reserve
subscription logins for their own apps, and a usage widget is not worth risking
anyone's account. Token Huddle only reads what each tool hands over or writes to
disk.

## 2. Users - Who is this for?

### Developers using several AI coding agents

- See every subscription's limits at a glance, without opening each tool
- Know when each window resets
- See whether they are using a limit faster than its window is running out
- Get warned before hitting a limit (v1)

### Developers with more than one account of a tool

- Show a personal and a work account side by side
- Name, order and hide cards

### Privacy-conscious developers

- Trust that the widget never reads, stores or sends their logins
- See exactly where every number came from
- Inspect and undo any change the widget makes to another tool's settings

### Open-source contributors

- Add a new provider by writing one file against a documented contract
- Run the full test suite offline

## 3. Features - What does v1 need?

### Usage widget

- Frameless, always-on-top card that can be placed anywhere and remembers its
  position
- One card per subscription: progress bar per window, percentage, reset
  countdown, plan name where the tool reports it
- Pace marker: shows how much of the window's time has passed
- Colour states: normal, warning at 70%, critical at 90%
- Full and compact views
- Source on every card: `live` or how long ago the tool last reported
- Tray icon to show, hide and open options; start with Windows

### Providers at launch

- **Claude Code**: automatic local token totals for today, seven days and thirty days (22a); optional session and weekly limits via Claude Code's own status line
- **Codex**: session and weekly limits by asking the installed `codex` program,
  falling back to its session logs
- **OpenCode**: tokens used today, in 7 days and in 30 days from its local
  database (OpenCode has no single quota)

### Registering subscriptions

- Auto-detect installed tools on start and on every refresh
- Connect / Disconnect for tools that need a one-time hand-off (Claude Code),
  with the exact change shown before it is made and a backup kept
- Add another account of a tool by pointing at its data folder; the folder is
  checked before it is saved
- Settings window: show, hide, reorder, connect, add and remove accounts

### UI/UX polish (v1)

- First-run onboarding that lists what was found and what to connect
- Threshold alerts as Windows notifications
- Legible on any background: solid and translucent styles, light, dark and
  system themes, size options
- Edge snapping and a global show/hide hotkey
- Clear error and empty states

### Brand and distribution (v1)

- Free and open source (MIT): no paid tier, no ads, no telemetry; a donation
  link (GitHub Sponsors or similar) on the README and landing page
- Brand basics: name check, logo, app icon, and a palette and type shared by
  the app and the landing page (see `docs/brand.md`); the logo stays
  provisional until the landing page
- Windows installer and portable build
- Auto-update from GitHub Releases for the installed build: a notice when a
  newer version exists, installed only when the user clicks; the portable
  build only points to the download
- Landing page with screenshots, supported tools, privacy promise and download
- Public GitHub repository with changelog and release notes

### Go-to-market (step 22)

Prepare a one-week private beta before public launch. Share Windows builds and
checksums manually with invited testers, explain that private-release automatic
updates are unavailable, and gather voluntary feedback. Keep the repository
private during beta. Public v1 stays completely free and MIT licensed.

After beta and a separate launch decision, complete history/privacy cleanup,
optional noreply email, vulnerability reporting and donation links; publish
`v0.1.0` and launch on GitHub, r/ClaudeAI, r/LocalLLaMA and X with a crisp
15-second sample-data screen recording. Feature 22 prepares this playbook;
it does not publish or change repository visibility.

Optional email signup and opt-in telemetry are future proposals requiring their
own consent, storage and privacy decisions. Beta and free v1 keep no telemetry
and the existing update-only app network rule. Use voluntary feedback to learn
whether Cursor/Windsurf, burn-rate warnings or weekly spend reports matter most.

Revisit a $19 one-time Token Huddle Pro after 500-1,000 active weekly users,
with Dodo Payments or Polar license keys as candidates. Measurement of active
weekly users, paid scope and licensing require a separate spec. No payments or
license enforcement ship in this work; free v1 remains free.

### Bonus

After v1 is stable:

- More providers: Gemini CLI, GitHub Copilot, Cursor, OpenRouter, using
  API-key and vendor sign-in methods where a tool offers them
- macOS and Linux builds
- Usage history and trend charts
- Per-model limits, if a vendor provides a sanctioned source

## 4. Data - What are we reading?

Token Huddle has **no server and no database of its own**. It reads tool data
on the user's machine and keeps only its settings and the snapshots tools hand
it.

### Sources

| Tool | Source | What it gives | Freshness |
|---|---|---|---|
| Claude Code | Status line JSON that Claude Code passes to a command after each response; a small PowerShell script saves the `rate_limits` part | 5-hour and weekly used % and reset times | Each Claude Code response in a terminal; the VS Code extension and T3 Code do not run the status line (checked in step 9, November 2026) |
| Codex | `codex app-server` → `account/rateLimits/read` (Codex makes the call with its own login) | Session and weekly used %, window length, reset time, plan | Live, every 5 minutes |
| Codex (fallback) | `rate_limits` snapshot in `~/.codex/sessions/**/rollout-*.jsonl` | Same as above | Last Codex turn |
| OpenCode | `~/.local/share/opencode/opencode.db` (SQLite, read only) | Tokens and cost per assistant message | Every minute |

Claude local token tracking (22a) reads assistant usage metadata from session JSONL under the account's projects folder. Count input, output, cache creation and cache read tokens once per API message; these totals are not subscription percentages. Keep only derived metadata in memory, never persist conversation content. Cross-interface coverage must be verified before it is advertised.

### Stored by Token Huddle

- `settings.json` (Electron user-data folder): window position, view options,
  appearance (`theme` dark / light / system, `style` solid / translucent,
  `size` 100 / 115 / 130; defaults dark, solid, 100), whether the first-run
  welcome is finished (`onboarded`), and the card list
- Card (instance): `key`, `provider`, `label`, `enabled`, `options.home`
- `bridge/` folder: the Claude Code status line script and one usage snapshot
  per connected Claude account (`captured_at` + `rate_limits` only)

### Reading contract

Every provider returns the same shape, validated before it reaches the UI:

- `state` - ok, stale, error, missing
- `source` - live, local, estimated
- `via` - the named source, e.g. "Codex session logs"
- `windows[]` - id, label, short label, window length, used %, reset time
- `stats[]`, `spark[]` - for tools without a quota (OpenCode)
- `plan`, `updatedAt`, `message`

### Important business rules

- **Never read, store or send a tool's login token or credential file**, and
  never call a vendor service with one
- Token Huddle makes no network calls of its own, except checking this
  project's GitHub Releases for a newer version, which the user can turn off
  ("Check for updates", on by default) and which sends no personal data
- Another tool's settings are changed only on an explicit Connect, after
  showing the exact change, with a backup kept; Disconnect undoes it
- A user's own status line is never replaced
- A window past its reset time reads as 0%, never as the stale value
- Each account keeps its own cache; providers keep no module-level state
- One failing provider never takes down the other cards

## 5. Tech - What stack are we using?

### Desktop app

- Electron 45, `contextIsolation` and `sandbox` on, strict content security
  policy
- Plain HTML, CSS and JavaScript in the renderer; no framework, no build step
- Node built-ins only at runtime (`node:sqlite`, `node:child_process`,
  `node:fs`); no runtime dependencies

### Providers

- One file per provider in `src/main/providers/`, registered in
  `providers/index.js`
- Contract: `id`, `name`, `accent`, `connect` (`auto` or `bridge`), `detect()`,
  `read()`, optional `connection` (`status`, `plan`, `connect`, `disconnect`)
- Card list and validation in `src/main/instances.js`, free of Electron so it
  is testable under plain Node

### Testing

- Node's built-in test runner, no network
- Fixtures recorded from real tools where possible; provenance tracked in
  `test/fixtures/README.md`
- A stand-in `codex app-server` for protocol tests; the real PowerShell status
  line script is executed in tests on Windows

### Tooling

- Blueprint workflow (`blueprint/`) for planning and feature specs
- `CHANGELOG.md` in Keep a Changelog format, Semantic Versioning
- ESLint, Prettier and a Verify command (`npm run verify`: lint, format check,
  tests) run locally and in GitHub Actions on Windows (build step 11)

### Landing page (build step 21b)

- Astro 7 with TypeScript (strictest preset), static output, in `site/` as
  its own npm project so the app's dependencies stay unchanged
- Reuses the app's `src/renderer/tokens.css` (with its fonts) and
  `src/renderer/mark.js` at build time; nothing loads from the network
  except the latest-release lookup
- Vitest for the page's logic, `astro check` for types, Prettier with the
  Astro plugin; run by the root `npm run verify`
- Redesign (build step 21c): the Night shift design replaces the Terminal
  design. Dark only (no light theme), Geist with Newsreader italic accents,
  a valley photo in the hero and closing panel, an animated hero of the
  widget pinned over a split terminal, and an agent marquee with the
  official Claude Code, Codex and OpenCode marks. Built with Astro, Tailwind
  CSS 4 (through its Vite plugin) and a small script; no UI framework

### Distribution (planned, build steps 18-21)

- electron-builder: NSIS installer and portable `.exe`
- electron-updater with GitHub Releases
- Release builds from tagged commits in GitHub Actions; the first public
  release, `v0.1.0`, is published after the one-week private beta (step 22) and a separately authorized public launch,
  because a private repository's releases need a token the app must never
  hold
- Static landing page at `tokenhuddle.arkaslittlemind.com` (host: GitHub
  Pages, Cloudflare Pages or Vercel)

## 6. UI/UX - How should this look and feel?

Token Huddle should feel like a **quiet instrument**: glanceable in a second,
invisible the rest of the time, at home next to an editor.

### Visual system

- Dark card by default; light and system themes in v1
- Neutral surfaces with Ocean Breeze accents (bars, pace marker, one dot per
  tool); colour is reserved for state (amber warning, red critical)
- Geist for text and the wordmark, with tabular numbers for percentages; it
  ships with the app (the landing page adds Newsreader for serif accents)
- Thin bars with a pace marker; no gauges, no charts on the main card
- Restrained motion: bar transitions only, reduced-motion respected

Avoid:

- Vendor logos in the app, vendor brand colours anywhere, or any use of a
  vendor mark that implies affiliation (the landing page names the supported
  agents with their official marks, beside a not-affiliated notice)
- Dense dashboards; the widget answers "where do I stand?" and nothing more
- Text that becomes unreadable over busy windows

### Core screens

1. **Widget** - full and compact views, header with refresh, view toggle,
   options and hide
2. **Settings** - card list (show, order, connect, remove), add account
3. **Onboarding** - first run: what was found, what to connect
4. **Landing page** - hook, screenshot, supported tools, privacy promise,
   download

### Signature interactions

- Pace marker that shows at a glance whether usage is ahead of the clock
- Connect flow that shows the exact settings change before making it
- Source label on every card, with the source name on hover

### Responsive design

- Fixed-width widget with optional sizes; settings window resizable down to
  400 px
- Landing page usable on phones (download is desktop-only, but the page is
  shared on mobile)

### Accessibility

- Keyboard reachable controls with visible focus
- State shown by text and value, not only colour
- Sufficient contrast in both themes and over any background
- Reduced-motion preference respected

## 7. Security and Privacy

- No login tokens are read, stored, sent or logged
- No network calls of Token Huddle's own, except the update check against
  this project's GitHub Releases (can be turned off); no telemetry
- Live Codex data comes from the `codex` program itself; "Local files only"
  turns that off
- Other tools' data is read only; the one write (Claude Code `statusLine`) is
  explicit, previewed, backed up and reversible
- The status line script saves usage percentages and reset times only
- Renderer is sandboxed with a strict content security policy
- `SECURITY.md` with private vulnerability reporting once the repo is public
- Test fixtures never contain tokens, emails or account ids

## 8. MVP Scope

The v1 is focused on a trustworthy, glanceable widget for the three tools the
maintainer uses daily, packaged so anyone on Windows can install it.

It should support:

1. Claude Code, Codex and OpenCode cards from sanctioned, login-free sources
2. Auto-detection, Connect / Disconnect, and multiple accounts per tool
3. Settings window for showing, ordering and managing cards
4. Source and freshness shown on every card
5. Onboarding, threshold alerts, themes and legibility fixes
6. Offline test suite and a Verify command in CI
7. Windows installer, portable build and auto-update
8. Landing page and public repository with changelog

More providers, macOS and Linux, and usage history remain bonus scope.

This document defines the **product scope and technical direction**. Detailed
implementation steps and release notes are captured in the Token Huddle Build
Plan.
