# Feature: Landing page redesign

**From build-plan:** feature 21c
**Build attempt:** 1
**Branch:** feature/landing-page-redesign
**Status:** verified

## Goal

Replace the 21b Terminal design of the landing page in `site/` with the approved
Night shift design. The page is dark only. It keeps everything 21b made work: the
download button that picks the latest release, the phone layout, and the page's
Content-Security-Policy with no `'unsafe-inline'`.

## Design reference

- Tracked, authoritative: `blueprint/reference/21c-night-shift/`
  (`page-1440.jpg`, `hero-1440.jpg`, `page-390.jpg`, `hero-390.jpg`).
- Port source, local only: `prototypes/landing/` is a git-ignored React and Vite
  prototype. It is never shipped. Night shift is its `dusk` variant
  (`#dusk`): `src/shared/Page.tsx` (copy, sections, marquee),
  `src/shared/demos.tsx` (`RowHero`, the split terminal and its beats),
  `src/shared/Widget.tsx` and `widget.css` (widget copy), `src/shared/page.css`
  (`.pv-dusk` palette from line 57, marquee from line 942, photo from line 1016).
  Copy text, sizes and colours from these files. Port the markup to Astro and
  CSS. Do not copy the `kit/` folder, React or `lucide-react`. When a detail is
  missing from this checkout, the screenshots govern.
- Assets to copy into `site/`:
  - `prototypes/landing/public/images/valley.webp`: made by the maintainer
    (answered 2026-11-16). Record it in `docs/brand.md` as project artwork.
  - `prototypes/landing/public/brands/claude-code.svg`, `codex.svg`,
    `opencode.svg`: the official marks, from SVGL (svgl.app). The marks are
    the vendors' trademarks. Remove the inline `style` attribute and the
    `width`/`height="1em"` from `codex.svg`. Record the source in
    `docs/brand.md`.

## In scope

- Dark only. Delete `site/src/scripts/theme.js` and its CSP hash in
  `site/astro.config.ts`. Remove the light-theme rules and the
  `mark-light`/`mark-dark` swap. Set `<meta name="color-scheme" content="dark">`.
- Type: Geist (from `src/renderer/tokens.css`) with Newsreader italic for `<em>`
  accents (fonts already bundled in `site/src/fonts`). The Cascadia Mono stack
  remains for terminal text only.
- The page sections, in order, with the prototype's copy:
  1. Nav: mark and wordmark, links Features, Tools, FAQ, GitHub, and a Download
     pill. Keep the "Skip to content" link.
  2. Hero over the valley photo: release chip, "Every AI limit. / *One quiet
     glance.*", lead sentence, "Download for Windows" and "View on GitHub".
  3. Animated hero stage: one terminal window titled "Terminal" split into two
     panes (Claude Code in `~/my-app`, Codex in `~/queue-service`). The Token
     Huddle widget is pinned over the right side. The beats (from `scriptC`):
     Claude's pane gets two more steps and its session meter goes 66 → 71 → 74
     (amber). Then Codex's third step lands and its weekly meter goes 86 → 93
     (red). It plays once.
  4. Agent marquee "Reads from the agents you already run": Claude Code, Codex,
     OpenCode with their marks, plus "More agents planned". It loops and pauses
     on hover.
  5. Statement paragraph.
  6. Pace panel "Ahead of the clock, *or behind it.*": a large meter with the
     two notes, and three state meters (12, 74, 93).
  7. "Small details, *quietly* done right.": the six-card grid with the
     prototype's icons, titles and copy.
  8. FAQ "Questions, *answered.*": the prototype's four questions, as
     `<details>`.
  9. Closing panel over the valley photo: "Let them *work.* / Keep one eye on
     the meter.", the download button and the not-code-signed note.
  10. Footer: mark, the not-affiliated line, GitHub, Releases, Changelog, MIT
      licence. Keep the Security link and the trademark sentence from the 21b
      footer (see Notes).
- The latest-release download works as in 21b (`site/src/lib/download.ts` and
  `site/src/scripts/download-client.ts` unchanged): every Download link has
  `data-download` and points at `FALLBACK_URL`. The hero chip has
  `data-release-chip`. Below the hero buttons, the `data-release-extra`
  (portable `.exe` and the checksums page) and `data-release-note`
  (`aria-live="polite"`) stay hidden or empty until the script fills them.
- Phone layout from `page-390.jpg`: no horizontal scroll at 390 px. The stage
  shows the terminal's left pane with the widget over it. The grid becomes one
  column. The FAQ goes below its heading.
- Reduced motion (`prefers-reduced-motion: reduce`): the hero shows its end
  state with no animation. The marquee stands still and shows one run of the
  agent list that wraps.
- `docs/brand.md` "Landing page" section rewritten for Night shift. A
  `CHANGELOG.md` `[Unreleased]` line.

## Out of scope

- Deployment, host and domain (21d). The donation link (22).
- A light theme, a theme switch, or any UI framework (React, Preact, lucide
  packages).
- The prototype's other variants (Daybreak, Paper), its cursor, and the
  compact-view animation.
- Changes to the app (`src/`), `download.ts` logic, or the release pipeline.
- New network calls. `connect-src` stays `https://api.github.com` only.

## Build loop

`workflow.stepReview` is `feature`, so do all the build steps, then stop once for
review at the end of the feature. `workflow.checkpointCommits` is `disabled`, so
make no commits during the build. `/complete` makes the feature commit. After each
step, run `npm run verify` from the root. Tick the step in this file only when its
Done when is true.

## Build steps

- [x] **1. Dark-only base and assets.** Delete `theme.js` and remove it from
  `Base.astro` and `astro.config.ts` (keep the other CSP directives exactly,
  and drop `scriptDirective` only if nothing else needs it). Set color-scheme to
  dark. Copy `valley.webp` to `site/src/assets/` and the three marks to
  `site/src/assets/agents/`, so Vite fingerprints them. Start a new
  `site/src/styles/site.css` from the Night shift palette (`--bg #060a1f`,
  `--ink #eef3fb`, `--ink-2 #8d97b5`, `--ink-3 #5f6a8a`, `--line`, `--panel`,
  `--em #90e0ef`), on top of `tokens.css`. Keep the Newsreader `@font-face` and
  the reduced-motion block. Put the six icons as inline SVG paths from Lucide
  (ISC) in one `site/src/components/Icon.astro`, with the Lucide licence text
  in `site/src/components/LICENSE-lucide.txt`. Add the nav and footer.
  **Done when:** `npm run verify` passes. The built `dist/index.html` has a CSP
  `<meta>` with no `'unsafe-inline'` and no theme script. The page renders dark
  when the system theme is light.

- [x] **2. Static sections.** Hero copy over the photo, marquee markup (static
  for now), statement, pace panel, feature grid, FAQ, closing panel, all with
  the prototype copy and layout at 1440 px and 390 px. Port `MeterRow` as an
  Astro component that uses the existing `Bar.astro` (SVG widths, not inline
  styles) and `level()`/`levelWord()` from `site/src/lib/demo.ts`, so the
  amber and red thresholds come from the app's `guidance.js`. Keep the
  `data-download*` and `data-release-*` hooks as listed in In scope. Mark images
  get `alt=""` inside a region labelled "Supported agents: Claude Code, Codex
  and OpenCode, with more planned". The photo is decorative.
  **Done when:** verify passes. `npm run preview` matches `page-1440.jpg` and
  `page-390.jpg` section by section (apart from the hero stage) with no
  horizontal scroll at 390 px. With JavaScript off, every Download link points
  at `…/releases/latest`.

- [x] **3. Hero stage, end state.** Port the widget copy from
  `Widget.tsx`/`widget.css` into `site/src/components/WidgetDemo.astro`
  (replace the 21b version; keep `Bar.astro` for the bars, and the `demoTools`
  data). Add `site/src/components/HeroStage.astro`: the split terminal (two
  panes, history, task, steps, "thinking", prompt) with the widget pinned. It
  renders the end state in HTML (Claude 4 steps, session 74; Codex 3 steps,
  weekly 93). The stage is `role="img"` with an `aria-label` that describes
  the end state in words, and its inner content is `aria-hidden`. The phone
  layout is the one from `hero-390.jpg`.
  **Done when:** verify passes. With JavaScript off, the hero matches
  `hero-1440.jpg` and `hero-390.jpg`. The amber 74% and red 93% show text and
  colour.

- [x] **4. Hero animation.** Add `site/src/lib/hero.ts`, a pure function that
  turns the beats (start `{left 2, right 2, claude 66, codex 86}`, then the
  `scriptC` steps and waits) into an ordered list of frames. Each frame has
  the shown-step counts, the two percentages and their levels. Pass `level` in
  as an argument, so the module stays free of Node APIs. `HeroStage.astro`
  computes the frames at build time with `level()` from `demo.ts` and writes
  them to a `data-frames` attribute as JSON. Add
  `site/src/scripts/hero-client.ts`: when reduced motion is off and the stage is
  in view (IntersectionObserver), it sets the first frame, then applies each
  frame on its delay. It plays once. It changes only `hidden`/classes, the SVG
  `width` attribute, and `textContent`. It never sets `innerHTML` or inline
  styles. With JavaScript off, a parse error, or reduced motion, the end state
  stays. The two percentages count up as in the prototype (about 420 ms), or
  step without the count when that is simpler.
  **Done when:** Vitest covers `hero.ts`: the last frame equals the end state
  rendered in HTML, the frames are in time order, and the levels at 71, 74 and
  93 match `level()`. Verify passes. In `npm run preview`, the meters move to
  amber and red once, and the console shows no CSP errors. With reduced motion
  emulated, the page loads straight into the end state.

- [x] **5. Marquee motion, cleanup and docs.** Port the marquee animation
  (two identical runs, the second `aria-hidden`, slide one run's width, pause
  on hover and on `:focus-within`). Add a small labelled Pause/Play toggle,
  because the loop never ends (WCAG 2.2.2). Reduced motion: a still,
  single, wrapped run, with no toggle. Delete the 21b-only components and CSS
  that are no longer used (for example `Meter.astro` if `MeterRow` replaces it,
  and the light-theme mark rules), and keep `mark.ts` and its test. Rewrite the
  `docs/brand.md` Landing page section: Night shift, dark only, Geist with
  Newsreader italic accents, the valley photo as maintainer-made artwork, and
  the agent marks from SVGL shown only to name the supported agents beside the
  not-affiliated notice. Add the `CHANGELOG.md` `[Unreleased]` line.
  **Done when:** verify passes. In preview, the marquee loops without a visible
  seam, pauses on hover, focus and the toggle, and stands still with reduced
  motion. No unused component remains in `site/src/components/`. Keyboard tab
  order runs skip link, nav, hero buttons, marquee toggle, FAQ summaries,
  closing button, footer, with visible focus throughout.

## Files / areas

- `site/src/layouts/Base.astro`, `site/astro.config.ts`: dark only, theme
  script removed, CSP kept.
- `site/src/pages/index.astro`: rewritten sections.
- `site/src/styles/site.css`: rewritten for Night shift.
- `site/src/components/`: `HeroStage.astro`, `WidgetDemo.astro` (replaced),
  `MeterRow.astro` (or the reworked `Meter.astro`), `Marquee.astro`,
  `Icon.astro` and `LICENSE-lucide.txt`. `Bar.astro` and `Mark.astro` are
  kept.
- `site/src/lib/hero.ts`, `site/src/lib/hero.test.ts` (new).
  `demo.ts`, `download.ts`, `mark.ts` and their tests are kept.
- `site/src/scripts/hero-client.ts` (new), `download-client.ts` (unchanged),
  `theme.js` (deleted).
- `site/src/assets/valley.webp`, `site/src/assets/agents/*.svg` (new).
- `docs/brand.md`, `CHANGELOG.md`.

## Data / contracts

- The release lookup contract is unchanged: `pickDownload` in `download.ts`, and
  the DOM hooks `a[data-download]`, `a[data-download-portable]`,
  `a[data-release-page]`, `[data-release-extra]`, `[data-release-note]` and
  `[data-release-chip]`. Each hook appears once, except `data-download`. The
  hero chip reads "v0.1.0 is coming · free and open source" until a release
  exists. The script rewrites it.
- The CSP directives stay exactly as in `astro.config.ts`: `default-src
  'self'`, `img-src 'self' data:`, `font-src 'self'`, `connect-src
  https://api.github.com`, `base-uri 'self'`, `form-action 'none'`. Astro
  hashes the bundled scripts and styles. Add no `'unsafe-inline'` and no
  external origin.
- `hero.ts` frame shape (internal):
  `{ at: number /* ms */, left: number, right: number, claude: number, codex: number, claudeLevel: Level, codexLevel: Level }`.
  It goes to the client only as build-time JSON in `data-frames`.

## Testing

- `npm run verify` (root): lint, format check, the app tests, then the site's
  `astro check`, Prettier, Vitest and build. The baseline on 2026-11-16 passed:
  166/166 app tests, 17/17 site tests, 0 check errors, build complete. The
  existing Shiki CSP warning in the build is not related to this feature.
- New Vitest: `site/src/lib/hero.test.ts`, as in step 4.
- Visual and motion checks run in `npm run preview` (the CSP applies only in
  build and preview). Use the Playwright browser tools when they are available:
  1440 and 390 px screenshots against the reference, reduced-motion emulation,
  JavaScript off, and the console checked for CSP violations. Record only the
  checks that were run.

## Notes for the AI

- Styling (user decision at `/implement`, 2026-11-16): Astro plus Tailwind CSS 4
  through `@tailwindcss/vite`. `site.css` imports Tailwind, maps the page palette
  in `@theme`, and keeps the widget copy, terminal, hero stage, marquee and photo
  styles in `@layer components`. Layout uses utilities in the markup.
- Page background (found at review): it is `#0b0d12`, not `#060a1f`. The
  prototype sets `#060a1f` on `.pv-dusk` and then overrides it with `#0b0d12`
  in its "valley photo" block (`page.css` line 1017), and the screenshots show
  `#0b0d12`. The widget copy uses the app's default dark style, so every
  colour comes from `tokens.css`. The translucent values exist only under
  `data-style='translucent'`.
- Photo (user decision, 2026-11-16): `site/src/assets/valley.webp` was replaced
  by a newer maintainer-made image: a mountain lake at dawn, with a halo, mist
  and a lone pine (1672 x 941). It differs from the reference screenshots. In
  the hero, the photo stops above the stage and fades out (`.hero-photo`), so
  the peaks sit just above the terminal.
- Hero timing: `hero-client.ts` rewinds the stage to the first frame at load,
  so the end state never flashes. It plays the frames when the stage comes
  into view.

- Safe rendering: all copy is static and written in the Astro source. The client
  scripts write only to `href`, `textContent`, `hidden`, classes and SVG
  `width` attributes. Never write to `innerHTML`.
- Legal text: the design footer has only "Not affiliated with Anthropic, OpenAI
  or the OpenCode project." Keep the 21b sentence "Claude and Claude Code are
  trademarks of Anthropic; Codex is a trademark of OpenAI." as well, because the
  page now shows their marks. Keep the Security link.
- The 21b requirement that the page says "tokens" means AI model usage is met by
  the first FAQ answer. Keep that FAQ entry first.
- Tool dots inside the widget copy use the brand dot colours from
  `docs/brand.md`, never vendor colours. Vendor marks appear only in the
  marquee.
- The photo is large (166 KB). Use it as a CSS background from
  `site/src/assets/` (Vite fingerprints `url()` references), not as a `public/`
  file. One file serves both the hero and the closing panel.
- `appModule` (`site/src/lib/app.ts`) uses Node APIs and runs at build time
  only. Never import `demo.ts` into a client script.
- Do not run `electron` directly, and do not start a dev server to check the
  CSP. Use `npm run site:build` and then preview inside `site/`.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":15863,"specSha256":"8604077a6c0540c4ab8779f03c319383f9db0d0ac399d29b61727dbf88301b6a","branch":"refs/heads/feature/landing-page-redesign","head":"a07b682bbeee3ce865eff05433ee4929701f1ce9","baseRef":"refs/heads/main","baseCommit":"a07b682bbeee3ce865eff05433ee4929701f1ce9","sourceTree":"5c71dd959eeb1f1706770324f6fade23aa3c003b","landing":"local-merge","absentOptional":[]} -->

## Try it now

1. From the project root, run `npm run site:build`, then `npm run preview` inside
   `site/`, and open the address it prints. The security policy only applies in
   build and preview, not in `npm run site:dev`.
2. Watch the hero. The terminal steps land, Claude Code's session counts up to
   74% and turns amber, then Codex's weekly limit turns red at 93%. This happens
   once.
3. Under the hero, hover over the agent list or press **Pause scrolling**. The
   list stops.
4. Switch your system to reduced motion and reload. The hero opens already at
   74% and 93%, and the agent list stands still as one wrapped row.
5. Narrow the window to phone width (about 390 px). The page does not scroll
   sideways, and the hero shows the Claude Code pane with the widget over it.
6. Press Tab from the top of the page. "Skip to content" appears first, and
   every link and button shows a cyan focus ring.
