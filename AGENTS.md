# AGENTS.md

Instructions for AI coding agents working in this project. This is the cross-tool
entry point. Codex, Google Antigravity, and OpenCode read `AGENTS.md`. Other
compatible tools do too. Claude Code reads `CLAUDE.md`, which imports this file,
so there is a single source of truth.

Claude Code, Codex, and every other AI tool must not add AI attribution to
commits or pull requests, including AI `Co-Authored-By` trailers or generated-by
signatures. Preserve genuine human attribution. See
[Commit and PR attribution](blueprint/context/ai-interaction.md#commit-and-pr-attribution)
for optional tool settings.

## What this is

Token Huddle is a small always-on-top Windows desktop widget (Electron) that shows
the usage limits of several AI coding agents in one place: Claude Code, Codex and
OpenCode. Developers otherwise have to open each tool to see where they stand.

Two project rules override convenience everywhere:

- **No logins.** Never read, store or send a tool's login token or credential
  file, and never call a vendor service with one. Use only data a tool hands over
  or writes to disk. Token Huddle makes no network calls of its own, except
  checking this project's GitHub Releases for a newer version, which "Check for
  updates" turns off.
- **Changelog.** Every behaviour change adds a line under `[Unreleased]` in
  `CHANGELOG.md` (Keep a Changelog, Semantic Versioning).

This project is built with the **AI Blueprint**, a workflow layer, not an
app skeleton. To start a new project, scaffold the app first in an empty folder
(create-next-app, Vite, etc.), then overlay these files on top. Never run a
framework scaffolder inside a directory that already holds the blueprint files
(`AGENTS.md`, `CLAUDE.md`, `.agents/`, `.claude/`, `blueprint/`); it fails
because the directory isn't empty.

The workflow is defined by the local skills and context files below.

## Proportional engineering

Build for established requirements, not hypothetical scale, threats, or future
flexibility. Reuse existing code, the standard library, native platform features,
and installed dependencies before adding machinery.

- Unknown scale or extensibility defaults to the smaller reversible design. Do
  not infer enterprise, multi-tenant, hostile-user, or compliance requirements.
- Derive trust and data-integrity boundaries from actual reachability: untrusted
  input, auth/session/ownership, shared persisted data, destructive operations,
  payments, secrets, and sensitive data.
- Ask only when an unknown materially changes behavior, architecture, persisted
  data, interoperability, a real security boundary, or cost. Otherwise choose the
  simplest repository-native implementation.
- Add an abstraction, dependency, service, configuration surface, compatibility
  layer, or security mechanism only for a current requirement.
- Simplicity never removes real trust-boundary validation, data-loss prevention,
  accessibility, explicit security requirements, configured tests, or project rules.
- Stack-specific template standards apply only when the project uses that stack.

## Read these when relevant

- `blueprint/config.json` - deterministic project workflow settings
- `blueprint/workflow.md` - workflow reference for configuration, skills, dashboard activity, and checks
- `blueprint/context/project-overview.md` - the project's source of truth
- `blueprint/context/coding-standards.md` - read before changing code
- `blueprint/context/ai-interaction.md` - read when running the Blueprint workflow
- `blueprint/context/current-feature.md` - the one feature or fix being built in this checkout

Reuse relevant context already loaded in the session. Claude Code imports only
this file; its Blueprint skills load the other files on demand.

## Workflow

Build one feature or fix at a time, behind review gates. The feature
loop is `/feature` -> `/implement` -> `/check` -> `/audit current` ->
`/complete`; approve the Feature spec before Implement. Each command is a local
skill at `.agents/skills/<skill>/SKILL.md` or `.claude/skills/<skill>/SKILL.md`
that carries its own instructions. Claude Code and Google Antigravity use slash
commands such as `/feature`, Codex uses `$feature`, and other tools can follow
the matching `SKILL.md` when asked.

Skills: `adopt`, `audit`, `blueprint-doctor`, `blueprint-status`, `brief`,
`check`, `ci`, `complete`, `debug`, `discovery`, `explore`, `feature`, `fix`,
`implement`, `onboard`, `overview`, `prototype`, and `tests`, plus the
explicit-only `autopilot` and `continuous`.

- Keep one active work item per checkout. Parallel work needs its own clone or
  Git worktree and branch; never replace another worker's active spec.
- `blueprint/config.json` can make review or verification stricter and tune
  local workflow settings. It never grants permission to commit, merge, push,
  deploy, publish, send, delete data, waive a failing check, or accept a finding.
- Never create or edit `blueprint/.state/run.json` directly. Tracked skills
  record dashboard activity through the managed helper.

## Commands

Node.js 22 or newer, npm. There is no build step: Electron loads the source
directly.

- Run the app: `npm start`
- Run with sample data: `npm run demo`
- Test: `npm test` (Node's built-in runner, `test/*.test.js`, no network;
  `scripts/test.js` fails the run when the pattern matches no test file. A
  file with zero tests still counts as one test in Node's report)
- Lint: `npm run lint` (ESLint, `eslint.config.js`)
- Format: `npm run format` to rewrite, `npm run format:check` to check
  (Prettier, `.prettierrc.json`)
- Verify: `npm run verify` (lint, format check, tests, then the landing page's
  own verify; the one automated gate, also run by `.github/workflows/verify.yml`
  on Windows for pull requests and pushes to `main`)
- Landing page (`site/`, Astro 7 + TypeScript, its own npm project; needs
  Node.js 22.23.4 or newer): install once with `npm ci --prefix site`, then
  `npm run site:dev` (dev server; the CSP is not applied in dev),
  `npm run site:build` (static build in `site/dist/`), or inside `site/`:
  `npm run preview`, `npm run check` (astro check), `npm test` (Vitest),
  `npm run format`, `npm run verify` (check, format check, tests, build)
- Build the Windows packages: `npm run dist` (installer and portable `.exe` in
  `dist/`; local only, never publishes)
- Release: push a `vX.Y.Z` tag matching `package.json` `version`, with a
  matching `CHANGELOG.md` section; `.github/workflows/release.yml` builds a
  draft GitHub Release (see README "Releasing")
- Screenshot the widget: `npm run screenshot -- out.png` (add `--real` for real
  data, `--settings` to also capture the settings window, `--view=compact` for
  the compact widget; uses a separate
  profile)

The Blueprint skill folders (`.agents/`, `.claude/skills/`) are not tracked in
git. On a fresh clone, restore them with
`npx create-ai-blueprint@1.16.1 update`.

The app has no typecheck or build step: the code is plain JavaScript and
Electron loads the source directly. Only the landing page in `site/` is
TypeScript and has a build.

Electron launched from a VS Code terminal can inherit `ELECTRON_RUN_AS_NODE=1`
and fail to open a window. The npm scripts go through `scripts/launch.js`,
which clears it; do not call `electron` directly.

Browser testing is also opt-in. Run `/tests browser` or `$tests browser` to add
or normalize a browser harness and document its exact command as `Browser
tests`. Check and Continuous Mode can then reuse it without installing tooling
mid-feature.
