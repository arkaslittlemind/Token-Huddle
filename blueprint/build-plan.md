# Build Plan

v1 is a Windows desktop widget that shows Claude Code, Codex and OpenCode usage
limits in one place, without ever touching a tool's login. The working
prototype, provider framework and login-free registration are built. Next:
verify the Claude Code bridge in real use and add a Verify command, then polish
the UI, then package and release, then brand, landing page and public launch.
More providers and other platforms are bonus features and should only be
attempted after v1 is stable.

Estimated remaining effort: **~4 weeks at 1.5-2 hours/day (~45 hours)**, a
rough estimate. Steps 1-8 took about two days.

Every step that changes behaviour adds a line to `CHANGELOG.md` under
`[Unreleased]`.

Steps marked *(chore)* are verification, tooling, decision or release tasks
rather than product features. They still go through `/feature`, with done-whens
that are checks or decisions instead of new UI.

- [x] 1. **Repository + project foundation** - Electron app with `src/main` and `src/renderer`, no runtime dependencies; `scripts/launch.js` (clears `ELECTRON_RUN_AS_NODE`), `scripts/screenshot.js` with a separate profile; MIT `LICENSE`, `SECURITY.md`, README with the unofficial-project disclaimer; private GitHub repo
- [x] 2. **Widget shell** - frameless always-on-top window that remembers its position and starts bottom-right; tray icon drawn in code; options menu (always on top, compact, local files only, start with Windows); full and compact views; pace marker and 70% / 90% colour states; demo mode
- [x] 3. **Provider framework** - provider registry and documented contract (`detect`, `read`, optional `connection`); per-user card list saved in settings with auto-discovery; per-account cache; reading validation and repair in `instances.js`; one failing provider never breaks the others
- [x] 4. **Codex provider** - live limits by asking the installed `codex` program (`app-server` → `account/rateLimits/read`), session-log snapshot as fallback, 5-minute cache, process tree cleaned up after each ask; tested with a recorded response and a stand-in `codex`; verified against the real program
- [x] 5. **OpenCode provider** - tokens today / 7 days / 30 days and cost from the local SQLite database (v1 and v2 tables, de-duplicated), 7-day sparkline; tested on generated databases
- [x] 6. **Claude Code provider (status line bridge)** - remove all login-token use; PowerShell status line script saves only `rate_limits`; Connect previews the exact `settings.json` change, keeps a backup, refuses to replace a user's own status line; Disconnect undoes it; tested on temporary folders and with real PowerShell
- [x] 7. **Settings window** - show, hide, reorder cards; Connect / Disconnect; add another account by folder (checked before saving); remove added accounts; source and freshness shown on every card
- [x] 8. **Offline test suite** - 42 tests with Node's runner, no network; fixtures with tracked provenance; a guard test that the Claude provider contains no credential or network code
- [x] 9. **Verify the Claude Code bridge in real use** - *(chore)* click Connect on the maintainer's machine; check which of a terminal, the VS Code extension and T3 Code run the status line; record a real status line input as a fixture; document the result in the README
- [x] 10. **Claude Code for users with their own status line** - offer a copy-paste snippet that adds the Token Huddle save step to an existing status line script, and detect that it is working
- [x] 11. **Verify command + CI** - *(chore)* ESLint and Prettier, `npm run verify` (lint, format check, tests); GitHub Actions on pull requests and `main` on Windows; an empty suite never counts as a pass
- [x] 12. **Design direction + brand basics** - settle the brand and the look before the UI work in 13-17
  - [x] 12a. **Brand basics** - name and domain availability check; logo and app icon; palette and type shared by the widget, settings window and landing page
  - [x] 12b. **UI mockups** - mockups of the widget (full and compact, light and dark), settings window and onboarding, approved before coding steps 13-17
- [x] 13. **Widget legibility + theming** - solid and translucent styles, light / dark / system themes, size options; status text readable over any background; contrast checks in both themes
- [x] 14. **First-run onboarding** - on first launch, list detected tools, explain each source, offer Connect for Claude Code, and say what Token Huddle never touches
- [x] 15. **Threshold alerts** - Windows notifications when a window crosses a user-set threshold (default 80% and 95%), once per window per reset; per-card on/off
- [x] 16. **Window behaviour** - edge snapping, global show/hide hotkey, multi-monitor and DPI changes, recover a widget left off-screen
- [x] 17. **Error, empty and accessibility states** - every state is clear and every control is reachable
  - [x] 17a. **Error and empty states** - clear copy for every `missing`, `stale` and `error` case, each with the next action to take
  - [x] 17b. **Accessibility** - keyboard navigation and visible focus in the widget and settings window; screen-reader labels; reduced motion
- [x] 18. **Packaging** - electron-builder NSIS installer and portable `.exe`, app icon, product metadata, uninstall leaves other tools' settings clean (disconnect on uninstall)
- [x] 19. **Auto-update + release pipeline** - release builds and in-app updates; `v0.1.0` is published at the deferred public launch after the step 22 beta, because a private repository's releases need a token the app must never hold
  - [x] 19a. **Release pipeline** - a version tag builds the installer and portable `.exe` in GitHub Actions and attaches them to a draft GitHub Release with checksums and release notes taken from `CHANGELOG.md`; tested with a draft release
  - [x] 19b. **In-app updates** - electron-updater checks this project's GitHub Releases on start and every few hours; a newer version shows in the tray menu and Settings and installs only on click; the portable build links to the download instead; "Check for updates" on/off, on by default; README privacy promise reworded for the update check
- [x] 20. **Code signing decision** - *(chore)* compare a signing certificate or a signing service against shipping unsigned with SmartScreen guidance; apply the decision to the release pipeline
- [x] 21. **Landing page** - choose the final logo from the 12a concepts (`prototypes/logo-marks.html`) and switch `CURRENT` in `src/renderer/mark.js`; static one-page site: hook, widget screenshot, supported tools, privacy promise, how it works, download button that picks the latest release; deployed on a free static host
  - [x] 21a. **Final logo** - choose the final mark from the 12a candidates (`prototypes/logo-marks.html`), switch `CURRENT` in `src/renderer/mark.js`, rebuild the app icon, drop "provisional" in `docs/brand.md`, refresh the README screenshots
  - [x] 21b. **Landing page** - static one-page site built with Astro and TypeScript in `site/`, Terminal design (`prototypes/landing-d-terminal.html`): hook (says "tokens" means AI model usage), widget screenshot, supported tools, privacy promise, how it works, download button that picks the latest release; usable on phones; same fonts and tokens as the app
  - [x] 21c. **Landing page redesign** - replace the Terminal design with the approved Night shift design (`blueprint/reference/21c-night-shift/`): dark only; Geist with Newsreader italic accents; valley photo in the hero and the closing panel; animated hero of a split terminal (Claude Code, Codex) with the widget pinned in it, the meters moving to amber and red; scrolling agent marquee with the official Claude Code, Codex and OpenCode marks; statement, pace panel, six-card feature grid, FAQ, closing call to action; keeps the latest-release download button, phone layout and the page's security policy
  - [x] 21d. **Landing page deployment** - choose the free static host, deploy the site, point `tokenhuddle.arkaslittlemind.com` at it
- [x] 22. **Private beta + go-to-market playbook** - *(chore)* prepare a one-week private Windows beta with manual build distribution, onboarding and feedback instructions; draft a free-v1 launch on GitHub, r/ClaudeAI, r/LocalLLaMA and X with a crisp 15-second demo using sample data; document the deferred public-launch checklist and later growth/Pro decision gates; keep the repository private and public release deferred
- [x] 22a. **Automatic Claude token usage** - detect local session records; show today, seven-day and thirty-day token totals without setup; prevent duplicate counting; preserve optional subscription-limit tracking through the existing bridge
- [ ] 22b. **Launch video** - *(chore)* a ~30-second on-brand dark launch film made as code (a `seek(t)` web page rendered frame by frame with a headless browser and ffmpeg), built in a separate folder outside this repository and never committed; the real widget renderer with labelled sample data, never real usage or logins; four scenes (hook that states the pain on mute, widget demo with compact view, threshold alert and reset as proof, end card that loops into the first frame); a `LOOK.md` style card from the Night shift brand and three reference films chosen from whatships.com; a licensed music track and sound kit, researched and measured; contact-sheet, phone-width, first-frame, glitch and privacy checks; wide (X) and square versions from one timeline; no claim that a scripted demo proves provider accuracy or that OpenCode has a subscription quota
- [ ] 23. **Bonus: more providers, platforms, history** - do not start until 1-22 are done
  - [ ] 23a. **More providers** - Gemini CLI, GitHub Copilot, Cursor, OpenRouter, with API-key and vendor sign-in registration where a tool offers it; re-check each vendor's terms first
  - [ ] 23b. **macOS and Linux** - bridge scripts for Claude Code and builds for both platforms
  - [ ] 23c. **Usage history** - local history of readings, trends and limit forecasts

- [x] 24. **Performance baseline and comparison report** - *(chore, GitHub issue #9; selected next)* repeatable local Windows profiling with synthetic histories and isolated accounts; packaged startup, refresh and input latency, event-loop delay, renderer work, idle CPU and memory; record variability, rank candidates from evidence, and prepare a plain-language before/after report. Includes the approved focused OpenCode query optimization and matched latency/memory comparisons; further candidates require separate review.

## Suggested schedule

| Week | Steps | Focus |
|---|---|---|
| Done | 1-8 | Prototype, provider framework, login-free registration, tests |
| 1 | 9-12 | Real-world bridge check, own-status-line support, Verify + CI, design direction |
| 2 | 13-17 | Theming, onboarding, alerts, window behaviour, states |
| 3 | 18-20 | Installer, auto-update, release pipeline, signing |
| 4 | 21-22 | Landing page, private-beta preparation and launch playbook |
| Following week | 22 beta | One week of user testing; review feedback before scheduling public launch |

## Costs

| Item | Approach | Rough cost |
|---|---|---|
| Development | Local only; no servers, no API usage | $0 |
| Domain | Optional; the landing page can live on a free subdomain | ~$10-15 / year |
| Code signing | Decided in step 20; check current pricing then | $0 if unsigned, otherwise a recurring fee |
| Landing page hosting | Free static host | $0 |

## Release notes

Decisions settled up front so release does not become a separate architectural
problem at the end:

- **No server** - nothing to deploy except the app and a static landing page
- **No logins** - no provider may read a tool's token or call a vendor service
  with one; this is checked in code review and by tests
- **Windows first** - v1 ships for Windows only; the Claude Code bridge is a
  PowerShell script
- **One source of truth for changes** - `CHANGELOG.md` (Keep a Changelog,
  Semantic Versioning); release notes are copied from it
- **Versioning** - `0.x` until the public launch is stable; tags `vMAJOR.MINOR.PATCH`
- **Updates** - auto-update only from this repository's GitHub Releases
- **Approval** - commits, merges, pushes, tags and releases happen only when the
  maintainer asks
- **Release early** - prove the step 19a pipeline with a draft release right
  away; `v0.1.0` was published when the repository went public on 2026-11-17
  (current: `v0.1.2`), and every later change flows through the same pipeline

## Go-to-market sequence

- **Now (Feature 22):** prepare a one-week private beta. The maintainer shares
  installer/portable builds and checksums manually with invited testers. Private
  GitHub releases are not an in-app update source; testers turn off "Check for
  updates" and receive replacement builds manually. Never embed credentials.
- **After beta, separately authorized:** review feedback and unresolved bugs;
  rewrite or squash history to remove the token-based prototype and personal
  usage numbers; optionally use a GitHub noreply commit email; enable private
  vulnerability reporting; add a chosen donation link to README and landing
  page; make the repository public and publish free `v0.1.0` through 19a (done
  2026-11-17; current release `v0.1.2`). Draft posts for GitHub, r/ClaudeAI,
  r/LocalLLaMA and X, paired with the ~30-second launch film from 22b (optional
  GIF). Posting is a separate action.
- **Learn:** collect voluntary beta feedback and requests for Cursor/Windsurf,
  burn-rate warnings or weekly spend reports. Optional email signup and opt-in
  telemetry are future proposals, not part of beta or free v1; consent, hosting,
  retention and privacy rules need a separate spec before collection. The app's
  current no-telemetry and update-only network rules remain in force.
- **Later Pro proposal:** revisit Token Huddle Pro at $19 one-time after
  500-1,000 active weekly users. Dodo Payments or Polar license keys are
  candidates, not selected integrations. Define how active weekly users are
  measured, paid feature scope, licensing and privacy before implementation;
  downloads and email signups are not active-user counts. Free v1 stays free.

## Later (not v1)

Only if Token Huddle grows beyond the maintainer's own tools. Not scheduled;
revisit after v1 ships.

- More providers and API-key / vendor sign-in registration
- macOS and Linux
- Usage history, trends and "you will hit the limit at…" forecasts
- Per-model limits if a vendor offers a sanctioned source
- Browser-session subscriptions (out of scope while they need session cookies)
- A command-line view of the same data
