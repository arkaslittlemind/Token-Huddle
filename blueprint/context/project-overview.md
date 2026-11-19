# Token Huddle - Project Overview

<!-- blueprint:source-hash a94842edd696a347e0a3c3b81ebdf09289d11181cd1eb72c84c282a6924594ab -->

> An always-on-top Windows desktop widget that shows the usage limits of several AI coding agents in one place, without ever touching a tool's login.

## Problem

Developers use several AI coding agents at once (Claude Code, Codex, OpenCode), often inside a harness such as T3 Code. Each subscription has its own limits (a rolling 5-hour window, a weekly window), and checking them means opening each tool. Nothing shows them together, so people hit a limit mid-task or under-use a paid plan.

Token Huddle shows every subscription's usage in one small widget: how much of each window is used, when it resets, and whether usage is running ahead of the clock. It reads only what each tool hands over or writes to disk, because vendors reserve subscription logins for their own apps.

## Users

- **Developers using several AI coding agents** - see all limits and reset times at a glance; know when usage runs ahead of the window; get warned before a limit (v1).
- **Developers with more than one account of a tool** - personal and work accounts side by side; name, order and hide cards.
- **Privacy-conscious developers** - trust that logins are never read, stored or sent; see where every number came from; inspect and undo any change made to another tool's settings.
- **Open-source contributors** - add a provider as one file against a documented contract; run the test suite offline.

No accounts or access tiers: a single local user per machine.

## Features

In build-plan order. Steps 1 to 22a are done; 24 (performance baseline and report) is selected next; 22b remains pending; 23 (bonus) is not scheduled. Steps marked (chore) are verification, tooling, decision or release tasks that still run through `/feature`. **Headline: the widget with login-free provider cards (2 to 7).**

1. **Repository + project foundation** (done) - Electron app, launch and screenshot scripts, license, security policy, README.
2. **Widget shell** (done) - frameless always-on-top window, tray, options menu, full and compact views, pace marker, warning and critical states, demo mode.
3. **Provider framework** (done) - registry and contract, saved card list with auto-discovery, per-account cache, reading validation, failure isolation.
4. **Codex provider** (done) - live limits from the `codex` program, session-log fallback.
5. **OpenCode provider** (done) - tokens today, 7 days, 30 days and cost from the local database.
6. **Claude Code provider** (done) - status line bridge with previewed, backed-up, reversible Connect.
7. **Settings window** (done) - show, hide, reorder, connect, add and remove accounts; source shown on every card.
8. **Offline test suite** (done) - Node runner, fixtures with provenance, no network.
9. **Verify the Claude Code bridge in real use** (chore, done) - which of terminal, VS Code extension and T3 Code run the status line; record a real fixture.
10. **Claude Code for users with their own status line** (done) - copy-paste snippet and detection.
11. **Verify command + CI** (chore, done) - lint, format check, tests; GitHub Actions on Windows.
12. **Design direction + brand basics** (done) - split into:
    - **12a. Brand basics** - name check, logo candidates and app icon, Ocean Breeze palette, Geist type for app and landing page.
    - **12b. UI mockups** - widget (full, compact, light, dark), settings and onboarding, approved before 13 to 17.
13. **Widget legibility + theming** (done) - solid and translucent styles, light, dark and system themes, sizes, contrast.
14. **First-run onboarding** (done) - detected tools, sources, Connect, what is never touched.
15. **Threshold alerts** (done) - Windows notifications at user-set thresholds, once per window per reset.
16. **Window behaviour** (done) - edge snapping, global hotkey, multi-monitor and DPI, off-screen recovery.
17. **Error, empty and accessibility states** (done) - split into:
    - **17a. Error and empty states** - next-action copy for every `missing`, `stale` and `error` case.
    - **17b. Accessibility** - keyboard and focus, screen-reader labels, reduced motion.
18. **Packaging** (done) - NSIS installer and portable build, icon, disconnect on uninstall.
19. **Auto-update + release pipeline** (done) - split into (`v0.1.0` is published at the deferred public launch after the step 22 beta: a private repository's releases need a token the app must never hold):
    - **19a. Release pipeline** - version tag → GitHub Actions build of installer and portable `.exe` → draft GitHub Release with checksums and notes from `CHANGELOG.md`; tested with a draft release.
    - **19b. In-app updates** - electron-updater checks GitHub Releases on start and every few hours; newer version shown in tray and Settings, installed only on click; portable links to the download; "Check for updates" on by default; README privacy promise reworded.
20. **Code signing decision** (chore, done) - certificate or service versus unsigned with SmartScreen guidance.
21. **Landing page** - split into:
    - **21a. Final logo** (done) - final mark from the 12a candidates; `CURRENT` in `src/renderer/mark.js`, app icon, brand doc, README screenshots.
    - **21b. Landing page** (done) - static one-pager in `site/` (Astro + TypeScript, Terminal design): hook, screenshot, supported tools, privacy promise, how it works, download of the latest release; usable on phones.
    - **21c. Landing page redesign** (done) - replaces the Terminal design with Night shift (`blueprint/reference/21c-night-shift/`): dark only, Geist with Newsreader italic accents, valley photo in hero and closing panel, animated split-terminal hero with the widget (meters to amber and red), agent marquee with official marks, statement, pace panel, six-card feature grid, FAQ, closing call to action; keeps the latest-release download, phone layout and the page's CSP. Astro, Tailwind CSS and a small script; no UI framework.
    - **21d. Landing page deployment** (done) - Cloudflare Pages selected, `tokenhuddle.arkaslittlemind.com`; deployed with active custom domain; browser acceptance recorded.
22. **Private beta + go-to-market playbook** (chore, done) - prepare one week of private Windows testing, manual distribution and feedback prompts; draft the free launch and 15-second sample-data demo; defer repository visibility, history rewrite and publication until a separate post-beta launch decision.
22a. **Automatic Claude token usage** (done) - detect local session records without setup; show today, seven-day and thirty-day totals; deduplicate API messages; retain optional subscription limits through the bridge. Cross-interface coverage requires verification.
22b. **Launch video** (chore) - ~30-second on-brand dark film made as code (`seek(t)` page, headless browser, ffmpeg) in a folder outside this repository, never committed; the real widget renderer with labelled sample data, never real usage or logins; four scenes (hook, demo with compact view, threshold alert and reset as proof, looping end card); `LOOK.md` from the Night shift brand and three whatships.com reference films; researched licensed music and sound kit; contact-sheet, phone-width, first-frame, glitch and privacy checks; wide and square versions; no claim of provider accuracy or an OpenCode quota.
22c. **Provider logos in the widget** - each supported agent's official mark (Claude Code, Codex, OpenCode) replaces its tool dot in the full and compact views, unaltered and beside the tool's name; readable in dark and light themes; bundled with the app, nothing from the network; brand rules and the not-affiliated notice updated; 22b waits for this release.
23. **Bonus** (not before 1 to 22) - split into:
    - **23a. More providers** - Gemini CLI, GitHub Copilot, Cursor, OpenRouter; API-key and sign-in registration; terms re-checked.
    - **23b. macOS and Linux** - bridge scripts and builds.
    - **23c. Usage history** - local history, trends, limit forecasts.

24. **Performance baseline and comparison report** (chore, selected next; issue #9) - repeatable local Windows measurements using synthetic histories and isolated accounts; packaged startup, refresh/input latency, main event-loop delay, renderer work, idle CPU and memory. Record variability, rank optimization candidates from observed evidence, and prepare a readable before/after report. Includes the approved focused OpenCode query optimization and matched latency/memory comparisons; further candidates require separate review.

## Data model

No server and no database of Token Huddle's own. Everything below is local JSON or in-memory.

### Settings (`<userData>/settings.json`)

- `x`, `y` (number | null) - widget position; null (pinned to the bottom-right corner of the primary display) until the user drags it, and null again when the saved spot is no longer on any screen
- `alwaysOnTop` (boolean), `compact` (boolean), `localOnly` (boolean)
- `theme` (`dark` | `light` | `system`), `style` (`solid` | `translucent`), `size` (100 | 115 | 130) - appearance; defaults dark, solid, 100; unknown values fall back to the default
- `onboarded` (boolean) - first-run welcome finished; `false` when there was no settings file, `true` for an existing file without the field; set by Done or closing the window
- `thresholds` (number[]) - alert levels: one or two whole numbers 1 to 100, ascending; default `[80, 95]`; anything else falls back to the default
- `alertsSent` (object) - `{ "<cardKey>/<windowId>": { level, resetsAt } }`, the highest level already notified in the current period of each window; written only by Token Huddle, malformed entries dropped on load
- `instances` (Instance[]) - the card list; order is display order

### Instance (one card = one account of one provider)

- `key` (string, `[a-z0-9][a-z0-9-]{0,40}`) - equals the provider id for the default account, `<provider>-<6 hex>` for added accounts; used in file names
- `provider` (string) - provider id
- `label` (string | null) - account name shown as `Name · Label`
- `enabled` (boolean) - shown on the widget
- `alerts` (boolean) - threshold alerts on for this card; default `true`, also for cards saved without the field
- `options.home` (string, optional) - the account's data folder; absent means the tool's default

> Locked: `key` format and the rule that only added accounts (key ≠ provider) can be removed.

### Provider (code contract, `src/main/providers/index.js`)

- `id`, `name`, `accent` (hex colour), `about` (one sentence on where the numbers come from), `connect` (`auto` | `bridge`)
- `detect(options)` → boolean
- `read({ options, key, dataDir, cache, localOnly, force, now })` → Reading
- `connection` (bridge only): `status`, `plan`, `connect`, `disconnect`, optional `link` (→ `{ prefix, file }`, writes only to Token Huddle's data folder); status is `connected` | `linked` | `disconnected` | `conflict` | `unsupported` | `error`

### Reading (validated by `normalize` before the UI sees it)

- `state` (`ok` | `stale` | `error` | `missing`)
- `source` (`live` | `local` | `estimated` | null), `via` (string) - named source, e.g. "Codex session logs"
- `plan` (string), `updatedAt` (ms | null), `message` (string)
- `windows` (Window[]), `stats` ({ label, value }[]), `spark` (number[])

### Window

- `id`, `label` (e.g. "Session"), `short` (e.g. "5h")
- `windowMs` (ms | null), `usedPercent` (0 to 100), `resetsAt` (ms | null)
- `rolledOver` (boolean) - reset time passed, so usage reads 0%

### Claude bridge snapshot (`<userData>/bridge/claude-<key>.json`)

- `captured_at` (unix seconds)
- `rate_limits.five_hour` / `seven_day`: `used_percentage` (number), `resets_at` (unix seconds)
- Written only by the status line script (`bridge/token-huddle-statusline.ps1`); nothing else is saved

### External sources (read only)

| Tool | Source | Freshness |
| --- | --- | --- |
| Claude Code | status line JSON → bridge snapshot | each Claude Code response in a terminal; the VS Code extension and T3 Code do not run the status line (checked in step 9, November 2026) |
| Codex | `codex app-server` → `account/rateLimits/read` | live, cached 5 min (20 s on manual refresh) |
| Codex fallback | `~/.codex/sessions/**/rollout-*.jsonl` | last Codex turn |
| OpenCode | `~/.local/share/opencode/opencode.db` (SQLite) | every minute |

### Claude local token totals (22a, done)

Read assistant usage metadata from account-local projects/**/*.jsonl, including subagent records. Aggregate input, output, cache creation and cache read counts once per API message. Keep derived metadata in the per-account memory cache only; never persist conversation content. Token totals and optional quota snapshots have separate sources and freshness.

### Business rules

- Never read, store or send a tool's login or credential file; no network calls of Token Huddle's own, except checking this project's GitHub Releases for a newer version ("Check for updates", on by default, can be turned off; sends no personal data).
- Another tool's settings change only on explicit Connect, after previewing the change, with a backup; Disconnect undoes it. A user's own status line is never replaced.
- A window past its reset reads 0%. One failing provider never breaks the others. No module-level provider state.

## Tech stack

- **Electron 45** - desktop shell; `contextIsolation` and `sandbox` on, strict CSP
- **Plain HTML, CSS, JavaScript** - renderer; no framework, no build step
- **Node built-ins** - `node:sqlite`, `node:child_process`, `node:fs`; no runtime dependencies
- **Node test runner** - offline tests with recorded fixtures and a stand-in `codex`
- **Blueprint** - planning and feature workflow in `blueprint/`
- **CHANGELOG.md** - Keep a Changelog, Semantic Versioning
- **ESLint, Prettier, Verify command** (step 11) - lint, format check and tests in one command
- **Geist** - the one font bundled in the app, for text and the wordmark; the landing page adds **Newsreader** for serif accents (both SIL OFL); nothing loads from the network
- **electron-builder + electron-updater** (steps 18 to 19) - installer, portable build, GitHub Releases updates
- **Astro 7 + TypeScript** (step 21b) - the landing page in `site/`, static build, its own npm project; reuses `tokens.css` and `mark.js`; Vitest, `astro check`, Prettier, run by the root Verify; redesigned in 21c with Tailwind CSS 4, without a UI framework
- **GitHub Actions** - Verify on pull requests and `main` (step 11); tagged release builds (step 19)

## Monetization

Free and open source (MIT): no paid tier, no ads, no telemetry. A donation link (GitHub Sponsors or similar) goes on the README and landing page once one is chosen.

The public launch happened on 2026-11-17 (`v0.1.0`; current release `v0.1.2`).
Launch posts for GitHub, r/ClaudeAI, r/LocalLLaMA and X are still drafts and
pair with the ~30-second sample-data launch film (22b). Gather
voluntary feedback on Cursor/Windsurf, burn-rate warnings and weekly spend
reports. Optional email signup and opt-in telemetry remain future proposals
requiring consent, storage, retention and privacy decisions; current beta/v1
has no telemetry. Revisit $19 one-time Pro at 500-1,000 active weekly users;
Dodo Payments/Polar license keys are candidates only. Measurement of active
weekly users, paid scope and licensing require a separate spec. Free v1 stays free.

## UI/UX

A quiet instrument: glanceable in a second, invisible the rest of the time. Dark card by default, neutral surfaces with Ocean Breeze accents (bars, pace marker), one official mark per tool (light theme: on a small dark tile; until 22c ships the widget still shows one dot per tool), colour reserved for state (amber 70%, red 90%), Geist with tabular numbers, for text and the wordmark, thin bars with a pace marker, restrained motion. The widget and the landing page show each supported agent's official mark, unaltered and beside its name, only to say which tool a card reads from, beside a not-affiliated notice. No vendor brand colours except inside a vendor's own unaltered mark; no altered marks; nothing that implies affiliation.

Brand basics are recorded in `docs/brand.md` and shared by the app and the landing page. The final logo is Tracks & fills (step 21a).

Windows and pages:

- **Widget** (`src/renderer/index.html`) - full and compact views; header with refresh, view toggle, options, hide; snaps to screen edges, shown or hidden with Ctrl+Alt+H, kept on screen across monitor and scaling changes
- **Settings** (`src/renderer/settings.html`) - card list (show, order, connect, remove) and add account
- **Onboarding** (step 14) - the settings window's first-run view: every supported tool found or not, its source, Connect for Claude Code, what is never touched; shown once
- **Landing page** (`site/`, step 21b; redesign 21c) - hook, animated widget hero, supported agents, pace explainer, features, privacy promise, FAQ, download of the latest release; usable on phones; dark only after 21c

Accessibility: keyboard reachable controls with visible focus, state shown by text as well as colour, contrast in both themes and over any background, reduced motion respected.

## Deployment

No server. Two deliverables:

- **Desktop app** - Windows only in v1. NSIS installer and portable `.exe` from tagged commits (`vMAJOR.MINOR.PATCH`, `0.x` until stable) built in GitHub Actions, published to this repo's GitHub Releases with checksums; auto-update only from those releases (installed build; the portable build links to the download). Builds are not code-signed (decided in step 20, see `docs/code-signing.md`; SignPath Foundation to be looked at again after step 22). Release notes come from `CHANGELOG.md`. The first public release, `v0.1.0`, was published on 2026-11-17 at a separately authorized public launch; the current release is `v0.1.2`.
- **Landing page** - static site deployed on Cloudflare Pages' free hosting at `tokenhuddle.arkaslittlemind.com`. Build from the repository root, publish `site/dist`; see `docs/site-deployment.md` for settings and the deployment record.

Commits, merges, pushes, tags and releases happen only when the maintainer asks.

During the private beta, the maintainer shares installer/portable builds and
checksums manually. Testers turn off "Check for updates"; private releases cannot
be fetched by the app without forbidden credentials. Posting and donation links
remain separate actions that need the maintainer's authorization.
