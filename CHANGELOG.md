# Changelog

All notable changes to Token Huddle are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Opt-in local performance profiling with synthetic account histories and a readable baseline report, without changing normal app launches.

### Changed

- OpenCode reads compact SQLite metadata rows and avoids a duplicate result array, reducing refresh allocations and memory use while preserving readings, rounding and per-table failure behavior.

- Landing-page hero and pace meters share rendering and styles; terminal prompts and animation target/state definitions are centralized while preserving the demo story and fallback.

### Fixed

- Landing-page mobile hero shows only the centered widget, without the terminal or its dark backdrop.
- Corrected the public Cloudflare Pages project's build command and output directory to install and verify `site/` and publish `site/dist`.

## [0.1.2] - 2026-11-18

### Added

- A Check for updates button in Settings checks immediately and reports the result, with a separate automatic-check preference and clear retry feedback.

## [0.1.1] - 2026-11-18

### Fixed

- Tray clicks always reveal the widget on the first click. The draggable overlay stays above other apps until explicitly hidden, including for existing profiles that disabled always on top.

- Landing page announces that Token Huddle is available to download, including before JavaScript loads or when the release lookup fails. A lookup returning 404 no longer replaces download links with the repository or shows prelaunch copy.

## [0.1.0] - 2026-11-17

### Fixed

- Landing-page Download buttons use a direct installer link even before the release lookup completes or if it fails. Releases include a stable installer filename with a checksum.

- Reject malformed Claude usage containers instead of reporting zero activity, while retaining valid totals from other records.

- Reject explicit null counters in Claude session usage records instead of treating them as zero.

### Added

- Automatic Claude Code token totals from local session records, with optional subscription limits through the existing status-line bridge.

- Cloudflare Pages deployment guide for the landing page, with reproducible
  build settings, custom-domain setup, live acceptance checks and rollback.
  The site is live at `https://tokenhuddle.arkaslittlemind.com`.

- Landing page in `site/` (Astro and TypeScript, static): what Token Huddle
  shows, the tools it reads, how pace and the amber and red states work, the
  privacy promise, a FAQ, and a Download for Windows button that picks the
  latest published release (or links to the repository until `v0.1.0`). It
  reuses the app's colours, fonts and mark, works on phones, and loads nothing
  from other sites except the release lookup. `npm run verify` now also checks, tests and builds it.

- In-app updates: the installed and portable app check this project's GitHub
  Releases for a newer version 30 seconds after start and every 6 hours. The
  tray menu and a new Updates section in Settings show it; the installed app
  downloads and installs only when you click **Install update**, and the
  portable app links to the release page. **Check for updates** (on by
  default) turns the check off. This is Token Huddle's only network call of
  its own; it sends no personal data.

- Release pipeline: pushing a version tag builds the installer and the
  portable `.exe` in GitHub Actions and attaches them to a draft GitHub
  Release, with `SHA256SUMS.txt`, the files the in-app updater will read,
  and release notes taken from this file. The tag must match the version in
  `package.json`, and this file must have a section for it. `npm run dist`
  never uploads anything.

- Packaging: `npm run dist` builds a Windows installer
  (`Token-Huddle-Setup-<version>.exe`) and a portable `.exe` with the Token
  Huddle icon, drawn from the same code as the tray icon. Uninstalling removes
  the Claude Code status line that Connect added and the "Start with Windows"
  entry; upgrading over an older version keeps Claude Code connected. A
  linked status line of your own is never edited. In the portable build,
  "Start with Windows" now starts the portable `.exe` itself.

- Accessibility: usage bars are now progress bars that a screen reader reads with
  their value, warning or critical level, how much of the window has passed and
  when it resets; each card, the card list and the header buttons have names and
  states (the compact toggle says whether it is on, Refresh says when it is busy).
  Keyboard focus now stays put when the widget or the settings list redraws, so
  toggling a switch or moving a card with the keyboard no longer drops you back
  to the top. The focus ring has a contrast check, and a test keeps motion off
  under reduced motion.

- Error and empty states: a card with no usable reading now shows a state label
  ("no data", "error" or "stale · 2h ago") and one sentence saying what to do
  next, wrapped so none of it is cut off. Messages for Codex or OpenCode not
  found, an unreadable OpenCode database, and a stale Codex reading now include a
  next step. A widget with every card hidden says "No tools shown" with an Open
  Settings button, instead of "Reading usage…" forever. Connection problems in
  Settings also say what to try next.

- Window behaviour: a drag that ends within 16 px of a screen edge snaps the
  widget flush to it, and the widget stays on its screen when the view grows
  (a widget on the bottom edge grows upward). **Ctrl+Alt+H** shows or hides
  it from any app; the tray menu shows the shortcut, or says when another
  app already uses it. When a monitor is added or removed, or the
  resolution, display scaling or taskbar changes, the widget keeps its size,
  and one that would be off-screen goes back to the bottom-right corner.
- Threshold alerts: a Windows notification when a card's session or weekly
  usage passes a level you set in Settings (80% and 95% by default). Each
  level alerts once per limit until it resets, also across restarts, and
  every card has its own **Alerts** switch. Clicking a notification shows the
  widget. Demo mode never alerts.
- First-run welcome: on the very first launch the settings window lists
  every supported tool (found or not), says where each card's numbers come
  from, offers **Connect…** for Claude Code, and says what Token Huddle never
  touches. **Done** or closing the window ends it; it never shows again.
  Existing installs skip it.
- Appearance options in the options menu: **Theme** (System, Light, Dark),
  **Style** (Solid, Translucent) and **Size** (100%, 115%, 130%). The light
  theme also restyles the settings window, and System follows the Windows app
  mode as it changes. Translucent lets the desktop show through the card,
  with stronger secondary text so everything stays readable over any desktop.
  A contrast test checks every text colour in both themes and both styles.
- Claude Code for people with their own status line: Settings copies a
  command prefix that saves the usage and then passes Claude Code's input on
  unchanged to their own command. The card shows **Linked** once the prefix
  is in place. Token Huddle never edits their status line.
- Settings window: show, hide and reorder cards, connect or disconnect
  Claude Code, and add another account of a tool by choosing its data folder.
- Claude Code usage through Claude Code's own status line. **Connect** shows
  the exact change to Claude Code's `settings.json` before making it and keeps
  a backup; **Disconnect** removes it.
- Live Codex limits by asking the installed `codex` program, with Codex's
  session logs as the fallback.
- Every card shows where its numbers came from: `live`, or how long ago the
  tool last reported, with the source name on hover.
- Provider registry with a documented contract, so a new tool is one file.
- Per-user card list saved in settings. Installed tools are detected on start
  and on every refresh.
- Support for more than one account of the same tool.
- Offline test suite (`npm test`) with recorded fixtures.
- Desktop widget for Claude Code, Codex and OpenCode usage: always on top,
  draggable, remembers its position, full and compact views, tray icon, and
  start with Windows.
- Pace marker on each bar showing how much of the window's time has passed,
  and amber and red states at 70% and 90%.
- OpenCode card with tokens used today, in 7 days and in 30 days, read from
  OpenCode's local database.
- Demo mode (`npm run demo`) with sample data.
- MIT license, security policy and README with an unofficial-project
  disclaimer.

### Changed

- The landing page has the new Night shift design. It is dark only, set in
  Geist with Newsreader italic accents, and the hero and closing panel sit
  over a valley photo. The hero shows Claude Code and Codex working in a split
  terminal with the widget pinned over it: Claude Code's session meter moves
  to amber, then Codex's weekly meter moves to red. The animation plays once
  and stays still with reduced motion. Below the hero, a scrolling list shows
  the official Claude Code, Codex and OpenCode marks, with a Pause button.
  Then come a pace explainer, six features, a FAQ and a closing download.
  The page still picks the latest release, works on phones, and keeps its
  strict Content-Security-Policy. The site is styled with Tailwind CSS.
- The widget header is 8px taller (40px), so the logo sits the same distance
  from the top and the side, lined up with the cards below, and the header
  buttons sit the same distance from the top and the right.
- The final logo is Tracks & fills: three tracks with fills, the row ahead of
  pace in cyan. The tray, window and installer icons and the widget header use
  it. `npm run screenshot` takes `--view=compact` for the compact widget.
- Builds stay unsigned for now. The README explains the Windows SmartScreen
  warning (**More info**, then **Run anyway**) and how to check a download
  against `SHA256SUMS.txt`; `docs/code-signing.md` records the options
  compared and why.
- Codex: after a failed live read, the card stays marked stale until the next successful read
  instead of showing the older reading as live for up to five minutes.
- The widget card is fully opaque by default (it was 94%). Choose
  Style > Translucent for a see-through card.
- The smallest text in the widget (status, labels, plan) is 11px instead of
  10px, and tool dots have a thin ring in the light theme.
- New look: Ocean Breeze blues for bars, pace markers and tool dots on a
  neutral dark card, with Geist for text and the name. The font ships with
  the app. The faintest text is brighter so it stays readable.
- New Token Huddle mark in the tray, the widget header and the window icons.
  The tray icon follows the taskbar's light or dark theme. The mark is
  provisional until the landing page.
- Tool colours no longer resemble any vendor's brand colour.
- The options menu entry "Local only (no network calls)" is now "Local files
  only (do not ask Codex for live limits)", because Token Huddle makes no network
  calls of its own except checking this project's GitHub Releases for updates.
  **Check for updates** turns those checks off.
- The Providers submenu is replaced by the settings window.
- The README now says which Claude Code hosts update the Claude Code card:
  a terminal does; the VS Code extension and T3 Code do not run the status
  line.

### Fixed

- Download and restart status stay visible in the tray and Settings when update
  checks are turned off during an install the user already started (#7).

- Claude Code settings are now written through a temporary file and replaced
  only after the write finishes, protecting Connect, Disconnect and uninstall
  cleanup from leaving an empty or partial settings file if the process exits.

- The Copy prefix button's accessible name now starts with its visible label
  and identifies the account, improving speech-input targeting (#4).

- OpenCode added accounts with no database now report that no data was found,
  instead of incorrectly claiming that an existing account folder is missing (#3).

- Landing page declares its Node.js type dependency so clean hosting builds
  can run Astro checks without the desktop app's dependencies installed.

### Removed

- Direct calls to Anthropic's and ChatGPT's usage endpoints.
- The developer `capture` script and the fixtures recorded with it.
- The per-model limit bar on the Claude Code card (for example "Weekly ·
  Fable"), which was only available from Anthropic's usage endpoint.
- The plan badge on the Claude Code card, for the same reason.

### Security

- Token Huddle no longer reads, stores or sends any tool's login token or
  credential file, and makes no network calls of its own except checking this
  project's GitHub Releases for updates. **Check for updates** turns those checks
  off. That check sends no personal data. Earlier development builds read the
  Claude Code and Codex login files to call the vendors' usage endpoints; that is
  outside what Anthropic's terms allow for third-party apps.

[Unreleased]: https://github.com/arkaslittlemind/token-huddle/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/arkaslittlemind/token-huddle/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/arkaslittlemind/token-huddle/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/arkaslittlemind/token-huddle/releases/tag/v0.1.0
