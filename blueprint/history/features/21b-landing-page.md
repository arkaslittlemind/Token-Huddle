# Feature: Landing page

**From build-plan:** feature 21b
**Build attempt:** 1
**Branch:** feature/landing-page
**Status:** verified

## Goal

A static one-page site for Token Huddle, built with Astro and TypeScript in
`site/`, following the approved Terminal design, and ready for a free static
host (21c). In a few seconds a visitor learns what it is, sees the widget,
knows which tools it reads and that it never touches their logins, and can
download the latest Windows release. The page works on phones, because links
to it are shared on mobile even though the download is desktop-only.

## Design reference

- **Approved variant:** `prototypes/landing-d-terminal.html` (D · Terminal,
  chosen by the maintainer on 2026-11-16), with `prototypes/theme.css` and
  `prototypes/landing.js` for the shared pieces (mark, widget copy, theme).
  Open in Edge or Chrome. Port its layout, sections and copy; the prototype's
  top bar and phone frame are not part of the site.
- `docs/brand.md`: Ocean Breeze palette, Geist for text and for the
  wordmark, the mark rules, "Do and don't".

## In scope

- **Project:** `site/` is its own npm project (own `package.json` and
  `package-lock.json`), so the Electron app's dependencies and electron-builder
  `files` are unchanged.
  - `package.json`: `"private": true`, `"type": "module"`, `"engines":
    { "node": ">=22.23.4" }`. Dev dependencies: `astro` ^7.4.12,
    `@astrojs/check` ^0.9.12, `typescript` ^6.0.3, `vitest` ^5.1.0,
    `prettier` (same range as the root), `prettier-plugin-astro` ^1.1.2.
    Scripts: `dev`, `build` (`astro build`), `preview`, `check`
    (`astro check`), `test` (`vitest run`), `format`, `format:check`, and
    `verify` (check, format check, test, build).
  - `astro.config.ts`: `site: 'https://tokenhuddle.arkaslittlemind.com'`,
    static output, `security.csp` on with `connect-src
    https://api.github.com` and everything else `'self'`, and
    `vite.server.fs.allow` including the repository root so the dev server can
    read `../src/renderer/`.
  - `tsconfig.json` extends `astro/tsconfigs/strictest`.
  - `.prettierrc.json` in `site/` with the root's options plus
    `prettier-plugin-astro`.
- **One source for the brand (no copies):**
  - `src/styles/global.css` imports `../../../src/renderer/tokens.css`; Vite
    bundles its two fonts with hashed names. Nothing loads from the network.
  - `src/lib/mark.ts`: reads `src/renderer/mark.js` with Node's
    `createRequire` at build time and returns the current mark's shapes for a
    colourway (`dark`, `light`, `tile`), including the tile placement (inset
    2.4, scale 0.7). `Mark.astro` and `Tile.astro` render it as inline SVG; the
    favicon is the tile.
- **Components** ported from the prototype: `Base.astro` layout (head, meta,
  theme, skip link), `Nav`, `Hero`, `TerminalWindow` (rail, agent log, usage
  box, pinned widget), `WidgetDemo` (full and compact, demo data from one
  typed object), `ToolCells`, `Feature` (eyebrow, title, text, visual slot),
  `Faq`, `Closing`, `Footer`.
- **Sections, in the prototype's order:** nav (Features, Tools, FAQ, GitHub,
  Download); hero (announcement chip, "Every AI coding limit, one glance.",
  subline naming the three tools and saying "tokens" means AI model usage, not
  crypto, then Download for Windows and GitHub); terminal window with the
  pinned widget; "Glance from the corner" with the compact widget; "Reads from
  the tools you already run" cells; Pace, States and No logins features; split
  FAQ; "Know where you stand." closing with the SmartScreen line (step 20
  decision); footer with the disclaimer (independent, not affiliated with
  Anthropic, OpenAI or the OpenCode project; trademarks), MIT licence, GitHub.
- **Download area**, the same rules for every Download link (nav, hero,
  closing), logic in `src/lib/download.ts`, wiring in a client script:
  - Without JavaScript, or before the request returns: a plain link to
    `https://github.com/arkaslittlemind/token-huddle/releases/latest`.
  - On load, one request to
    `https://api.github.com/repos/arkaslittlemind/token-huddle/releases/latest`
    (the latest published release, never a draft or pre-release), 8 s timeout.
  - **Release found with an installer:** links go straight to the
    `Token-Huddle-Setup-<version>.exe` asset; the hero also offers the portable
    `.exe` and the release page; the chip says "v<version> is out".
  - **No release yet** (HTTP 404, true until `v0.1.0` in step 22): links go to
    the repository; the chip keeps "v0.1.0 is coming"; a polite live note says
    the first release is coming soon.
  - **Any other failure** (network, rate limit, timeout, unexpected JSON, no
    matching asset): keep the `releases/latest` links; nothing shown.
- **Theme:** follows `prefers-color-scheme` by setting `data-theme` on
  `<html>` before first paint, so `tokens.css` light and dark values apply;
  dark without JavaScript.
- **Root wiring:**
  - `package.json` scripts: `site:dev` and `site:build`
    (`npm --prefix site run ...`), and `verify` ends with
    `npm --prefix site run verify`.
  - `.prettierignore` and `eslint.config.js` ignores add `site/`; the site
    formats and checks itself.
  - `.gitignore` adds `.astro/` (`node_modules/` and `dist/` already match in
    `site/`).
  - `.github/workflows/verify.yml` and `release.yml` add
    `npm ci --prefix site` before Verify.
- **Docs:** AGENTS.md Commands (site commands, Node 22.23.4 or newer for the
  site, `npm ci --prefix site` once after cloning); README "Project layout"
  (`site/`); `docs/brand.md` "Landing page" (where it lives; mono accents use
  system fonts: Cascadia Mono, Consolas, `ui-monospace`); `CHANGELOG.md`
  `[Unreleased]` "Added".

## Out of scope

- Hosting, DNS and the deploy workflow (21c).
- Donation link and launch post (step 22).
- Analytics, cookies, forms, third-party scripts or fonts, testimonials, logo
  walls, vendor logos.
- More pages, a blog, translations, a sitemap.
- Changing the app, its tokens or fonts.
- Deleting `prototypes/logo-marks.html` and `prototypes/ui-mockups.html`
  (`docs/brand.md` links them).

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is
`disabled`: build the steps in order and review the whole feature once. No
checkpoint commits; `/complete` makes the feature commit. Run `npm run verify`
before handing over.

## Build steps

- [x] **0. Prerequisite: Node 22.23.4 or newer.** Astro 7.4 requires it
  (`engines`); this machine had 22.21.1 on 2026-11-16 (current 22 LTS:
  22.23.5). The maintainer updates Node; check with `node --version`.
  Done when: `node --version` prints 22.23.4 or newer.

- [x] **1. Scaffold `site/`.** Create the project by hand (not
  `create-astro`, which expects an empty folder and adds a template): the
  files above, `src/pages/index.astro` with a placeholder heading, and the
  root wiring (scripts, ignores, `.gitignore`, both workflows). `npm install
  --prefix site` writes `site/package-lock.json`.
  Done when: `npm --prefix site run build` writes `site/dist/index.html`,
  `npm --prefix site run check` reports 0 errors, and root `npm run verify`
  passes (now including the site).

- [x] **2. Release picking, test first.** Vitest cases in
  `src/lib/download.test.ts`, then `src/lib/download.ts`.
  `pickDownload(status: number, body: unknown): Pick` where `Pick` is
  `{ kind: 'release'; version; installer; portable; page }`,
  `{ kind: 'none' }` or `{ kind: 'fallback' }`. Cases: a sample release
  (installer, portable, `.blockmap`, `latest.yml`, `SHA256SUMS.txt`); 404; 403
  (rate limit); 200 with no installer; `null` or malformed body; an asset URL
  outside `https://github.com/arkaslittlemind/token-huddle/releases/`
  (`fallback`). The `.blockmap` is never picked; `version` is `tag_name`
  without a leading `v`.
  Done when: `npm --prefix site test` passes.

- [x] **3. Brand plumbing, test first.** `src/lib/mark.test.ts`: the shapes for
  each colourway match `mark.js` `CURRENT` (count, roles, colours) and the tile
  placement is inset 2.4, scale 0.7 on a navy tile with radius 3.5. Then
  `src/lib/mark.ts`, `Mark.astro`, `Tile.astro`, `global.css` with the
  `tokens.css` import, the favicon, and `Base.astro` with the theme script.
  Done when: tests pass; the built page shows the mark in Geist with
  no font request outside the site (read the built HTML and `dist/_astro/`).

- [x] **4. Sections.** Port the prototype into the components and
  `index.astro`. Demo numbers live in one typed object used by both widget
  copies. Only one `h1`; headings in order; the terminal window and widget
  copies are `role="img"` with one descriptive label (as in the prototype).
  Done when: `astro check` passes and the built page, read side by side with
  the prototype at 1280 px in both themes, has the same sections and copy.

- [x] **5. Download wiring and CSP.** Client script: request, timeout
  (`AbortController`), `pickDownload`, then update every Download link, the
  chip and the live note. Values from the response go only into `href` and
  `textContent` after `pickDownload` checked them, never `innerHTML`. Check the
  built `dist/index.html`: one CSP `<meta>` with `connect-src
  https://api.github.com`; the theme script and the client script are allowed
  by it (if `is:inline` scripts are not hashed by Astro, add the theme script's
  hash through the CSP config).
  Done when: with `npm --prefix site run preview`, the browser console shows
  no CSP errors; with the repository private (today), the Download links point
  to the repository and the coming-soon note shows (the API answers 404); with
  the network blocked, they keep the `releases/latest` link.

- [x] **6. Layout, phones and accessibility.** One column at 360 px with no
  horizontal scroll (the terminal pane and rail hide; the widget stays);
  visible focus (`--focus`) on every link, button and FAQ row; a skip link;
  state never by colour alone; smallest text 11 px; `prefers-reduced-motion`
  respected; the sticky nav does not cover focused elements.
  Done when: Playwright MCP against `npm --prefix site run preview`: screenshots
  at 390 px and 1280 px in both themes, `scrollWidth` equal to `clientWidth` at
  390 px, and a Tab pass through skip link, nav, Download links, FAQ and
  footer in order with a visible ring. Report only the captures taken.

- [x] **7. Docs, prototypes and final check.** AGENTS.md, README, brand doc
  and CHANGELOG as listed. Delete the landing prototypes (`landing-*.html`,
  `theme.css`, `landing.js` in `prototypes/`), keeping `logo-marks.html` and
  `ui-mockups.html`.
  Done when: `npm run verify` passes.

## Files / areas

- New: `site/` (`package.json`, `package-lock.json`, `astro.config.ts`,
  `tsconfig.json`, `.prettierrc.json`, `src/pages/index.astro`,
  `src/layouts/Base.astro`, `src/components/*.astro`,
  `src/lib/download.ts`, `src/lib/mark.ts`, their `*.test.ts`,
  `src/scripts/download-client.ts`, `src/styles/global.css`)
- Changed: root `package.json` (scripts), `.prettierignore`,
  `eslint.config.js` (ignores), `.gitignore`, `.github/workflows/verify.yml`,
  `.github/workflows/release.yml`, `AGENTS.md`, `README.md`, `docs/brand.md`,
  `CHANGELOG.md`
- Deleted: `prototypes/landing-a-spotlight.html`, `landing-b-desk.html`,
  `landing-c-quiet.html`, `landing-d-terminal.html`, `theme.css`,
  `landing.js`
- Read only: `src/renderer/tokens.css`, `src/renderer/fonts/`,
  `src/renderer/mark.js`, README sections used for copy

## Data / contracts

- GitHub REST `GET /repos/arkaslittlemind/token-huddle/releases/latest`,
  unauthenticated (60 requests an hour per visitor IP). Fields read:
  `tag_name`, `html_url`, `assets[].name`, `assets[].browser_download_url`.
  No token, no cookie, nothing else sent.
- Asset names from `package.json` `build`: `Token-Huddle-Setup-${version}.exe`
  and `Token-Huddle-${version}-portable.exe`; match the full pattern so
  `.exe.blockmap` never matches.
- Only URLs starting `https://github.com/arkaslittlemind/token-huddle/` are used
  as links.
- `mark.js` stays plain CommonJS-or-global; the site only reads it at build
  time and never changes it.

## Testing

- Vitest in `site/` (no network): release picking and the mark shapes.
- `astro check` for types; Prettier with the Astro plugin; `astro build`.
- Root `npm run verify` runs the app's lint, format check and tests, then the
  site's verify; CI runs the same after `npm ci --prefix site`.
- No Browser tests command is declared; visual, CSP and keyboard evidence
  comes from Playwright MCP against `astro preview` (steps 5 and 6).
- The "release found" path cannot be seen live until `v0.1.0` (step 22); only
  the unit test covers it. Do not claim it was seen in a browser.

## Notes for the AI

- Copy comes from the prototype and the README; keep it plain, in the README's
  style. Say early that "tokens" means AI model usage.
- No vendor logos or colours, no fonts or scripts from the network
  (`docs/brand.md`, coding standards "Styling").
- No em dashes, en dashes or ellipsis characters (coding standards
  "Writing"); the prototype's terminal text already follows this.
- Windows only; macOS and Linux are planned (23b), never claimed.
- Check Astro behaviour against its docs for the installed version (CSP,
  `is:inline` hashing, `vite.server.fs.allow`) rather than from memory.

## Implementation record

Observed on 2026-11-16 on branch `feature/landing-page`:

- Step 0: Node updated with winget (`OpenJS.NodeJS.22`) from 22.21.1 to
  22.23.5; root `npm run verify` passed on it (166 tests).
- Step 1: `site/` scaffolded by hand; installed `astro` 7.4.12,
  `@astrojs/check` 0.9.12, `typescript` 6.0.3, `vitest` 5.1.0,
  `prettier` 3.10.1, `prettier-plugin-astro` 1.1.2 (0 vulnerabilities).
  Root `verify` ends with `npm --prefix site run verify`; both workflows run
  `npm ci --prefix site` and cache both lock files.
- Steps 2-3: tests first. `download.test.ts` (10) and `mark.test.ts` (5)
  failed before the modules existed, then passed.
- Step 4: components are `Mark`, `Bar`, `Meter`, `WidgetDemo` and the
  `Base` layout; the sections live in `index.astro` (fewer components than
  listed in In scope; same sections and copy). Demo numbers in `src/lib/demo.ts`.
- Step 5, CSP findings and fixes:
  - Inline `style="width: N%"` attributes would be blocked (Astro hashes
    `<style>` and `<script>` elements, not style attributes), so bars and the
    sparkline are SVG with percentage `width`/`x` attributes.
  - Astro places its CSP `<meta>` at the end of `<head>`; the theme script
    moved to the start of `<body>` so the policy covers it.
  - Astro does not hash `is:inline` scripts: the browser blocked the theme
    script. Its source is now `src/scripts/theme.js`, rendered with
    `set:html`, and `astro.config.ts` adds that file's SHA-256 through
    `security.csp.scriptDirective.hashes`.
  - With `astro preview` and the repository private: all three Download
    links pointed to the repository, the coming-soon note showed, the chip kept
    "v0.1.0 is coming", Geist loaded from `/_astro/`. The only
    console error was the expected 404 from the GitHub API. The network-blocked
    case was not observed in a browser; the unit tests cover `fallback`.
- Step 6, Playwright MCP against `astro preview`: screenshots at 1280 px
  (dark viewport, light full page) and 390 px (dark full page, light
  viewport). At 390 px `scrollWidth` = `clientWidth` = 375 in both themes;
  smallest text 11 px; one `h1`, then `h2`s. Tab order follows reading order
  (skip link, brand, nav, chip, hero buttons, five FAQ rows, closing buttons,
  footer); the skip link and FAQ rows show the 2 px focus ring; a focused FAQ
  row scrolled to 455-525 px, clear of the 66 px sticky nav.
- Step 7: AGENTS.md, README, `docs/brand.md` and CHANGELOG updated; the four
  landing prototypes, `theme.css` and `landing.js` deleted.
- Final: root `npm run verify` exit 0 (166 app tests; site: 0 type errors,
  15 tests, build complete).
- Code review (Standards and Spec agents), fixed: banner section comments
  removed from `site.css` (coding standards "Comments"); tool-dot colours use
  `--ob-mist` and `--ob-cyan` (OpenCode's `#3d9bd1` has no token); the site
  reuses `level` and `levelWord` from `src/renderer/guidance.js` through one
  loader (`site/src/lib/app.ts`) instead of repeating them, with
  `demo.test.ts` (2 tests); unused `markName`, `Role` alias and `doc`
  parameter removed; one repository slug constant; `coding-standards.md`
  notes the site's Vitest tests live beside the code. Verify exit 0 (166 app
  tests; site 17 tests, 0 type errors, build complete).
- Review notes left as they are: no `Tile.astro` (the favicon route renders
  the tile from `tileSvg()`); `site.css` instead of `global.css`; the theme
  script runs at the start of `<body>`; the release state also writes
  "Version X for Windows 10 and 11." in the live note; footer adds Releases,
  Changelog and Security links; `frame-ancestors` cannot be set from a
  `<meta>` CSP and needs host headers in 21c.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":17123,"specSha256":"a05d23b03ec5d4faf1610e8bd5d9144132c98fec6e3d2d4c368d8958028391c2","branch":"refs/heads/feature/landing-page","head":"ba58025be46b027aa1fa0cc6f411aac0e0d42e91","baseRef":"refs/heads/main","baseCommit":"a1bd2c0c606a3590f60442a01d7ef0027be2cabc","sourceTree":"dc8b1b4713e614cf747f9a60dcbd06925bd9a809","landing":"local-merge","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** ba58025be46b027aa1fa0cc6f411aac0e0d42e91
**Base commit:** a1bd2c0c606a3590f60442a01d7ef0027be2cabc
**Base ref:** refs/heads/main
**Spec hash:** a05d23b03ec5d4faf1610e8bd5d9144132c98fec6e3d2d4c368d8958028391c2
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-11-15T21:47:43Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-11-15T21:51:16Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required


### Commands

- `git rev-parse HEAD`, `git merge-base refs/heads/main HEAD`, `git status --porcelain --untracked-files=all`, `sha256sum blueprint/context/current-feature.md`: pass (HEAD, merge base and spec hash match the request; only review.md differed)
- `npm run verify` (root lint, format check, 166 app tests, then site astro check, format check, Vitest 17 tests in 3 files, astro build): pass, exit 0

### Evidence

- Full delta reviewed (38 files): site/ sources, astro.config.ts, package.json scripts, ignores, both workflows, docs and CHANGELOG; site/package-lock.json inspected only as a lock file
- Built site/dist/index.html: one CSP meta with connect-src https://api.github.com; SHA-256 of both inline scripts (theme and module) recomputed and present in script-src; no inline style attributes or style elements
- site/dist/_astro holds the bundled Geist woff2 file; no external URLs in the built CSS; all page links point at the site itself or github.com/arkaslittlemind/token-huddle
- pickDownload validates status, tag, asset names and the releases/ URL prefix; the client writes values only to href and textContent
- No em dash, en dash or ellipsis characters added by the delta; no skipped or focused tests

### Findings

- F-26 [P3] open: the release state of the Download wiring is not exercised by any test or browser run
- F-27 [P3] open: the page CSP allows data: images that nothing uses

### Remaining risk

- Browser behaviour (layout at 390 px and 1280 px, CSP console, keyboard order) was not re-observed in this review; it relies on the builder's recorded Playwright evidence
- The release-found and network-failure paths have not been seen in a browser (F-26)
- frame-ancestors cannot be set from a meta CSP; host headers are deferred to 21c

## Try it now

Once after cloning: `npm ci --prefix site` (Node 22.23.4 or newer). Then
`npm run site:build` and `npm --prefix site run preview`, and open
http://localhost:4321. Expected: the Terminal landing page in your system
theme (switch Windows between light and dark and reload). While the repository
is private, every Download button points at the GitHub repository and the hero
says "The first release is coming soon." Narrow the window to phone width: one
column, no sideways scrolling, the widget copy stays. Press Tab from the top:
"Skip to content" appears first. `npm run site:dev` gives live reload, but
the Content-Security-Policy is only applied in build and preview.
