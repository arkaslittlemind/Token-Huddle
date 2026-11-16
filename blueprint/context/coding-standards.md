# Coding Standards

Conventions for Token Huddle: an Electron desktop widget written in plain
JavaScript, with no framework, no build step and one runtime dependency,
`electron-updater` (in-app updates, step 19b).

## Project rules

These two rules override every other convention.

- **No logins.** Never read, store, log or send a tool's login token or
  credential file (for example `~/.claude/.credentials.json`,
  `~/.codex/auth.json`), and never call a vendor service with one. Use only
  data a tool hands over (Claude Code's status line, the `codex` program) or
  writes to disk. Token Huddle makes no network calls of its own, except
  checking this project's GitHub Releases for a newer version (`electron-updater`,
  packaged app only, "Check for updates" turns it off). It sends no personal data.
- **Another tool's settings are changed only on an explicit user action**, after
  showing the exact change, with a backup kept, and with a way to undo it. Never
  replace a user's own configuration (for example their own status line).
  One accepted exception: uninstalling undoes what Connect added (the same
  change as Disconnect) without a preview, because the uninstall is itself
  the explicit action and the README documents it. It never touches a
  user's own configuration either.

## Runtime and language

- Electron (main process) and Node.js 22+; CommonJS (`require`,
  `module.exports`)
- Plain JavaScript, no TypeScript and no transpiler. Use JSDoc one-liners only
  where a shape is not obvious
- Node built-ins first (`node:fs/promises`, `node:path`, `node:sqlite`,
  `node:child_process`). Add an npm dependency only for a current requirement
  and only as a `devDependency` unless it must ship
- Async I/O with `async`/`await`; no synchronous file I/O in hot paths except
  small startup reads

## Project structure

- `src/main/main.js` - windows, tray, menus, settings persistence, IPC handlers,
  refresh loop. The only file that wires Electron together
- `src/main/instances.js` - the user's card list (sanitize, discover, add,
  remove, move), reading validation (`normalize`), and `collect`. Must not
  import Electron, so it stays testable under plain Node
- `src/main/providers/<id>.js` - one file per tool, registered in
  `providers/index.js`, which documents the provider contract
- `src/main/providers/util.js` - small shared helpers (window names, roll-over,
  clamping, number formatting)
- `src/main/preload.js` - the only bridge to the renderer, via
  `contextBridge`
- `src/renderer/` - one HTML, CSS and JS file per window (`index.*` for the
  widget, `settings.*` for the settings window), plus files both windows share:
  `tokens.css` (brand colours and fonts), `fonts/` (bundled Geist)
  and `mark.js` (the logo as data)
- `src/renderer/mark.js` - the one place the logo is defined. The widget page
  loads it with `<script>`; `src/main/icon.js` `require()`s it to draw the tray
  and window icons as pixels. Keep it plain data with no imports
- `src/main/icon.js` - draws the mark as raw pixels; must not import Electron
- `src/main/alerts.js` - threshold alert rules (which windows crossed a level,
  what was already sent); must not import Electron. `main.js` shows the
  notifications
- `src/main/placement.js` - where the widget may sit (visibility, default
  corner, edge snapping, staying inside a work area) on plain rectangles; must
  not import Electron. `main.js` applies it to the window
- `src/renderer/duration.js` - time spans as the widget writes them, shared
  the same way as `mark.js` (`<script>` in the widget, `require()` in main)
- `src/renderer/guidance.js` - what a card without a usable reading says (state label and
  next action), plus the shared `ago()` wording; same sharing as `duration.js`
- `src/main/updates.js` - in-app update state and its tray and Settings copy;
  must not import Electron. `main.js` feeds it `electron-updater`'s events
- `src/main/cleanup.js` - what the uninstaller undoes (disconnect every card,
  through each provider's own `disconnect`); must not import Electron.
  `main.js` runs it for `--uninstall-cleanup`
- `scripts/` - developer scripts (launch, screenshot, status line capture,
  `make-icon.js` with `ico.js` for the build icon, `release-notes.js` for the
  release workflow)
- `.github/workflows/` - `verify.yml` (pull requests and `main`) and
  `release.yml` (version tags, draft GitHub Release)
- `build/` - electron-builder resources: `installer.nsh` (tracked) and the
  generated, ignored `icon.ico`
- `test/` - tests and `test/fixtures/` with sample tool data

## Providers

- Export `id`, `name`, `accent`, `connect` (`auto` or `bridge`),
  `detect(options)` and `read(context)`; a bridge provider also exports
  `connection` (`status`, `plan`, `connect`, `disconnect`)
- `read()` returns a Reading (`state`, `source`, `via`, `windows`, ...) and
  never throws for expected conditions such as a missing tool or file; it
  returns `state: 'missing'` or `'error'` with a short user-facing `message`
- Keep per-account state in the `cache` object passed to `read()`, never in
  module variables, so two accounts of one tool do not share it
- Every path comes from `options.home` (one account's folder) or the tool's
  default; never hard-code a user's path
- Take `now` and `platform` from the context so tests can control them
- A window past its reset time reads as 0% (`rollOver`), never as the old value

## Electron and security

- `contextIsolation: true` and `sandbox: true` on every window; no
  `nodeIntegration`
- Each HTML file keeps the strict content security policy
  (`default-src 'none'; style-src 'self'; font-src 'self'; script-src 'self'`); no inline
  scripts or styles, no remote content
- Renderer code builds DOM with `textContent` and `createElement`, never
  `innerHTML` with data
- The preload exposes named functions only, never `ipcRenderer` itself
- IPC handlers in `main.js` validate their arguments and report
  `{ ok, error }` to the settings window rather than throwing across IPC

## Naming

- Files: lowercase, kebab-case where needed (`fake-codex.js`)
- Functions and variables: camelCase
- Constants: SCREAMING_SNAKE_CASE for fixed values (`CACHE_MS`, `SCRIPT_NAME`)
- Provider ids and card keys: lowercase `[a-z0-9-]`; card keys become file
  names, so `sanitize` enforces the pattern

## Styling

- Plain CSS per window on top of the shared `tokens.css`; use its custom
  properties instead of literal colours (see `docs/brand.md`)
- Light and dark themes: main resolves the theme (`system` follows the
  Windows app mode) and each window sets `data-theme` on `<html>`. Do not set
  `nativeTheme.themeSource`: it would also flip the taskbar value the tray
  icon follows
- `test/contrast.test.js` checks every text token in both themes and in the
  translucent style; change a colour only with that test passing
- Geist for text and the wordmark, bundled; tabular numbers for percentages.
  The landing page adds Newsreader (bundled in `site/src/fonts`) for serif
  accents only. Never load fonts from the network
- State is shown by text and value as well as colour (amber 70%, red 90%)
- Respect `prefers-reduced-motion`

## Error handling

- Expected failures (tool not installed, file missing, program does not answer)
  become a Reading with a clear next step, not an exception
- One failing provider never breaks the other cards: `collect` isolates each
  read, and `normalize` repairs whatever a provider returns
- Settings writes are best-effort and never crash the app
- When parsing another tool's file fails, leave that file untouched

## Testing

The blueprint installs no test runner; testing is opt-in at the project level,
because the overlay can't know your stack. Adding unit testing is an explicit
setup task the AI can do through the normal workflow, either as a build-plan item
or with `/tests`. The setup should choose the stack-native runner, wire the
scripts or commands, add a small example test, and update the Commands section
of `AGENTS.md`.

When `AGENTS.md` declares a `Verify` command, treat it as the umbrella automated
gate. It combines only the checks this project actually has, in this order when
available: typecheck, tests, then build. The command does not enable an absent
test runner or replace focused evidence. It gives local work and optional CI one
exact command to run. `/ci` owns Verify and CI setup. `/tests` adds the real test
command to Verify when it already exists, but never creates CI only because
testing was configured.

**The opt-in switch is one signal: a `test` command in the Commands section of
`AGENTS.md`.** Declare one and **tests become a gate for logic-bearing steps**,
not an optional extra; leave it out and the loop verifies logic with the evidence
it already uses (run it, a screenshot, the build). Adding the runner is itself a
deliberate step, never a silent mid-step install. This is the single definition
of the switch; the skills and `ai-interaction.md` only point back here.

- **What to test (the scope rule):** pure logic where a wrong answer is possible -
  parsers, formatters, validators, id/slug builders, server actions. These have
  assertable inputs and outputs and real edge cases (empty, missing, malformed).
- **What not to test:** UI components and integration-level surfaces (render or
  export routes, anything driving a real browser or external service). Verify those
  with a screenshot and the build, not brittle unit tests.
- **The gate (when a runner is configured):** a build step that adds in-scope logic
  must ship a passing test in the same reviewable diff. The project's test command
  must be green before the step is approved, before any checkpoint commit, and
  before `/complete` merges. UI and integration-only steps are exempt and ride on
  screenshot plus build evidence.
- **When it's named:** the `/feature` spec's Testing section predicts the coverage,
  `/implement` writes the test with the step, and if a step surfaces logic the spec
  didn't foresee, add a focused test then.
- An empty suite should fail, not pass, so "no tests ran" never looks like "passed".
- Test files live in `test/`, one per module (for example `test/codex.test.js`),
  with sample tool data in `test/fixtures/`. Record each fixture's provenance in
  `test/fixtures/README.md`, and never commit tokens, emails or account ids.
- The landing page (`site/`) is its own stack: Vitest, with tests beside the code
  (`site/src/**/*.test.ts`), run by `npm --prefix site test` and the root Verify.
- Run them via the project's test command (see Commands in `AGENTS.md`), not a
  hardcoded tool name.

Stack binding: Node's built-in runner (`node:test`, `node:assert/strict`).
Use temporary folders (`fs.mkdtempSync` in `os.tmpdir()`) instead of real tool
folders, `t.mock.method` for globals, a stand-in program for external tools
(see `test/fixtures/fake-codex.js`), and an explicit `now` for time-dependent
logic. Tests never touch the network or the developer's real tool data.

## Browser Verification

Token Huddle is a desktop app, so "browser evidence" means a capture of the real
Electron windows: `npm run screenshot -- out.png` (demo data), with `--real`
for real tool data and `--settings` for the settings window. It runs in a
separate profile and never touches the user's settings. Capture the widget for
every UI change.

For UI and integration behavior, prefer real evidence over reading the code and
assuming it works.

- Browser automation is separately opt-in through `/tests browser`. That setup
  reuses a compatible runner or prefers Playwright for supported projects, then
  documents the exact command as `Browser tests` in `AGENTS.md`.
- When `Browser tests` is declared, add focused coverage for stable behavioral
  done-whens when it is proportionate, and run the documented command during
  `/check`. Do not assume it proves visual fidelity, real authenticated-profile
  behavior, browser chrome, or another claim the test does not observe.
- If no Browser tests command is declared, do not add a runner silently in the
  middle of an unrelated feature. Use the available dev server, browser
  screenshots, build output, API output, or manual evidence instead.
- Browser tests are not part of the default Verify command or CI unless the user
  separately chooses that slower gate.
- Browser evidence is especially important for flows that click, type, submit,
  navigate, download files, render complex layouts, or depend on client-side
  state.

## Code Quality

- No commented-out code unless specified
- No unused imports or variables
- Keep functions under 50 lines when possible

## Comments

Write code that explains itself; comment only what the code cannot say.
Over-commenting is a common AI tell, so resist it.

- Comment the **why**, not the **what**. Delete any comment that restates the code.
- No banner/header blocks, section dividers, or step-by-step narration of obvious
  code. A file does not need a comment announcing each region.
- A comment earns its place only when it captures something the code can't: a
  non-obvious decision, a gotcha or workaround, why a value is what it is, or a
  link to a spec or issue.
- Prefer self-documenting names and small functions over explanatory comments.
- Keep doc comments minimal: a one-line purpose on an exported type or function is
  plenty; don't write JSDoc that just repeats the signature.
- When in doubt, leave the comment out.

## Writing

- No em dashes (U+2014) in generated content: docs, comments, commit messages,
  READMEs, specs. They read as AI-generated.
- Use a hyphen for `term - description` separators; rephrase prose with commas,
  parentheses, or a colon. Avoid en dashes and the ellipsis character too.
