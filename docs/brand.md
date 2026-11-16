# Token Huddle brand

The brand shared by the widget, the settings window and the landing page.
Settled in build-plan step 12a (2026-11-15). The final logo was chosen in step
21a (2026-11-16).

Direction: a **quiet instrument**. Neutral dark surfaces, Ocean Breeze as the
accent, colour reserved for state. The look was chosen from a three-way
prototype; the reference is
[`blueprint/reference/brand-instrument-full.png`](../blueprint/reference/brand-instrument-full.png).

## Name check

Checked on 2026-11-15. A result holds only for that date. This is a search for
clashes, not a trademark search.

| Lookup | Query | Result | Source |
| --- | --- | --- | --- |
| Web search | `"Token Huddle"` | Available: no product, app or service with this name | Web search results; nearest names below |
| Web search | `"TokenHuddle" app` | Available: no app with this name | Web search results |
| GitHub repositories | name contains `token-huddle` / `tokenhuddle` | Available: only this project (`arkaslittlemind/token-huddle`); two unrelated Huddle01 / API token repositories match on words | `api.github.com/search/repositories` |
| npm package | `token-huddle`, `tokenhuddle` | Available: both return 404 (unpublished) | `npm view` |
| Domain | `tokenhuddle.arkaslittlemind.com` | Decided: a subdomain the maintainer controls; nothing to buy | Maintainer decision |

Nearest names, all in other markets:

- **Huddle01** - video meetings with token-gated rooms and its own `HUDL`
  crypto token.
- **Huddle.is / $Huddle** - a crypto community token and dashboard for Pudgy
  Penguins holders.
- **Huddle** - several team-collaboration products use the single word.

None uses "Token Huddle". Because "token" plus "huddle" can read as a crypto
project, the landing page and README should say early that "tokens" means AI
model usage, not cryptocurrency.

## Mark

**Final: Tracks & fills** - three full tracks with fills; the row ahead of
pace is cyan. Chosen by the maintainer in step 21a (2026-11-16) from three
candidates (Usage rows, Tracks & fills, Columns), compared in context in
[`prototypes/logo-marks.html`](../prototypes/logo-marks.html); early concepts are
in [`brand/concepts/`](brand/concepts/README.md). The other candidates stay in
`mark.js` for comparison only.

The mark is defined once, as data, in
[`src/renderer/mark.js`](../src/renderer/mark.js). The tray icon, the window
icons and the widget header all draw from it. **To switch marks, change
`CURRENT` in that file.** No icon image files exist; icons are drawn in code.

| Colourway | Use | Tracks & fills |
| --- | --- | --- |
| `dark` | Widget header, dark taskbar tray | Tracks blue `#0077B6`, lead fill cyan `#00B4D8`, fills sky `#90E0EF` |
| `light` | Light taskbar tray, white pages | Tracks mist `#CAF0F8`, lead fill cyan `#00B4D8`, fills navy `#03045E` |
| `tile` | App and window icon | Navy tile (radius 3.5 / 16), mark at 70%, `dark` colours |

Rules for any mark:

- Built on a 16-unit grid from rounded rectangles and circles only, so it can be
  drawn as pixels; edges land on whole pixels at 16 px.
- No text inside the mark.
- Minimum size 16 px. Clear space around the mark: at least 2 grid units
  (one eighth of its size).
- The tray follows the taskbar theme (`dark` or `light`); the window icon always
  uses the `tile`.

## Palette

Ocean Breeze is the accent. It marks the brand, bars and pace; it never carries
state. Tokens live in [`src/renderer/tokens.css`](../src/renderer/tokens.css).

### Ocean Breeze

| Name | Hex | Used for |
| --- | --- | --- |
| Navy | `#03045E` | App-icon tile, light-theme text and marks |
| Blue | `#0077B6` | Light-theme bar fill |
| Cyan | `#00B4D8` | Sparkline, Codex dot, mark dot |
| Sky | `#90E0EF` | Bar fill, focus ring, primary button, mark rows (dark) |
| Mist | `#CAF0F8` | Pace marker, Claude Code dot |

Tool dots: Claude Code `#CAF0F8`, Codex `#00B4D8`, OpenCode `#3D9BD1`. No dot
uses a vendor's brand colour.

### Dark theme (in use)

Contrast is the WCAG 2 ratio against `--surface-solid` `#13141A` (widget) and
`--panel` `#1B1C24` (settings cards), computed from relative luminance. Normal
text needs 4.5:1.

| Token | Value | On `#13141A` | On `#1B1C24` |
| --- | --- | --- | --- |
| `--text` | `#F1F2F4` | 16.41 | 15.14 |
| `--text-muted` | `#9A9CA8` | 6.73 | 6.21 |
| `--text-faint` | `#84868F` | 5.07 | 4.67 |
| `--ok` | `#5EC98F` | 8.95 | 8.26 |
| `--warn` | `#F0B545` | 9.98 | 9.21 |
| `--crit` | `#F0605A` | 5.71 | 5.27 |
| `--fill` (bars) | `#90E0EF` | 12.33 | 11.38 |

`--text-faint` was raised from the prototype's `#767884` (4.19:1, below 4.5).
Other surfaces: `--surface-solid` `#13141A` (the solid widget card and the
settings background), `--control` `#262731`, `--control-hover` `#30313B`,
`--line` `rgba(255, 255, 255, 0.08)`, `--track` `rgba(255, 255, 255, 0.09)`.
`--surface` is the translucent card (see "Translucent style").

### Light theme (in use)

Set in 12b, applied in step 13 as `:root[data-theme='light']` in `tokens.css`.
The windows set `data-theme` from the theme the app resolves (Light, Dark, or
System, which follows the Windows app mode). Same method as the dark table:
WCAG 2 ratio from relative luminance; translucent colours are blended over
`#F6FCFE` first. `test/contrast.test.js` checks these on every Verify.

Text (needs 4.5:1):

| Token | Value | On surface `#F6FCFE` | On panel `#FFFFFF` |
| --- | --- | --- | --- |
| `--text` | `#03045E` | 17.14 | 17.75 |
| `--text-muted` | `#2C4A7A` | 8.56 | 8.87 |
| `--text-faint` | `#4D6488` | 5.80 | 6.01 |
| `--ok` | `#1D7A4A` | 5.15 | 5.34 |
| `--warn` | `#9A6200` | 4.92 | 5.10 |
| `--crit` | `#C0322C` | 5.43 | 5.62 |
| `--on-primary` on `--primary` | `#FFFFFF` on `#0077B6` | 4.87 | - |

`--text` on `--control` `#E4F1F6` is 15.40. State colours are used as text on
the surface and the panel only (on `--control`, `--warn` would be 4.42).

Graphics (needs 3:1):

| Token | Value | On surface | On track (`#DEE3EE` blended) |
| --- | --- | --- | --- |
| `--fill`, `--spark`, `--focus` | `#0077B6` | 4.70 | 3.78 |
| `--pace` | `#03045E` | 17.14 | 13.80 |
| `--warn` bar fill | `#9A6200` | 4.92 | 3.96 |
| `--crit` bar fill | `#C0322C` | 5.43 | 4.37 |

`--pace` against `--fill` is 3.65, so the marker reads where it sits on the
bar. Other light values: `--surface-solid` `#F6FCFE`, `--panel` `#FFFFFF`, `--control` `#E4F1F6`,
`--control-hover` `#D3E8F0`, `--line` `rgba(3, 4, 94, 0.12)`, `--hover`
`rgba(3, 4, 94, 0.07)`, `--track` `rgba(3, 4, 94, 0.1)`.

Tokens added in step 13 (both themes):

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| `--primary` | `--ob-sky` | `#0077B6` | primary button, switch accent |
| `--primary-hover` | `--ob-mist` | `#03045E` | primary button hover |
| `--on-primary` | `--surface-solid` | `#FFFFFF` | primary button text |
| `--dot-ring` | `transparent` | `rgba(3, 4, 94, 0.45)` (3.12 on surface) | ring around tool dots |
| `--card-shadow` | `0 4px 10px rgba(0, 0, 0, 0.35)` | `0 4px 12px rgba(3, 4, 94, 0.14)` | widget card shadow |

The tool accents are pale on light surfaces (Claude Code `#CAF0F8` 1.17, Codex
`#00B4D8` 2.38, OpenCode `#3D9BD1` 2.98), so light dots get `--dot-ring`. The
tool name beside each dot is what identifies it.

The header mark's colours are not tokens: the widget draws the mark from
`src/renderer/mark.js` in its `dark` or `light` colourway, so the mark stays
defined in one place. (The 12b mockup used `--mark-row` and `--mark-dot` to
stand in for those colourways.)

### Translucent style

The widget's Translucent style lets the desktop show through the card. Over
the worst desktops, pure white and pure black, every text colour must still
pass 4.5:1 and the bar fill 3:1. With the solid-style colours that holds only
down to 96% opacity, so the translucent style uses 83% opacity and stronger
secondary text. Solid keeps the colours above. Each text colour stays lighter
(dark theme) or darker (light theme) than both blends, so no desktop colour in
between is worse. `test/contrast.test.js` checks this.

| Theme | `--surface` | Changed tokens |
| --- | --- | --- |
| Dark | `rgba(19, 20, 26, 0.83)` | `--text-muted` `#C0C2CA`, `--text-faint` `#AAACB2`, `--crit` `#F5908C` |
| Light | `rgba(246, 252, 254, 0.83)` | `--text-faint` `#425682`, `--warn` `#784C00`, `--crit` `#A12A25` |

Lowest ratio of each colour over a white or black desktop:

| Token | Dark | Light |
| --- | --- | --- |
| `--text` | 9.82 | 11.54 |
| `--text-muted` | 6.19 | 5.76 |
| `--text-faint` | 4.85 | 4.73 |
| `--warn` | 5.97 | 4.82 |
| `--crit` | 4.85 | 4.75 |
| `--fill` (3:1) | 7.39 | 3.16 |

## Type

| Role | Font | Notes |
| --- | --- | --- |
| UI text and numbers | Geist (variable) | `font-variant-numeric: tabular-nums` for every number |
| Wordmark | Geist Bold | `TOKEN HUDDLE`, uppercase, 11 px in the widget, `letter-spacing: 0.08em`, `--text-muted` |
| Serif accents (site only) | Newsreader (variable, with italic) | Landing page only, for italic accent words; never in the app |
| Fallback | `'Segoe UI', system-ui, sans-serif` | Used only if a font file fails |

Scale: 11 px (labels, status, reset times, wordmark), 12 px (body), 13 px
(tool names, settings body), 14 px (stat values), 17 px (settings heading).
11 px is the smallest size for any text (decided in 12b, applied in step 13).
The widget's Size option (100, 115 or 130%) scales all of these together.

Geist ships inside the app (`src/renderer/fonts/`, Latin subset from
Fontsource 5.3.0, SIL Open Font License 1.1, licence alongside). The app loads
nothing from the network; the pages allow fonts only from their own files
(`font-src 'self'`). The landing page uses Geist too, plus its own Newsreader
(`site/src/fonts/`).

## Do and don't

- Do keep Ocean Breeze for brand, bars and pace. Amber and red mean state.
- Do show every state in text as well as colour.
- Don't use vendor brand colours anywhere, and no vendor logos in the app.
  The landing page may show the official Claude Code, Codex and OpenCode marks
  to name the supported agents, unaltered and beside the tool's name.
- Don't put the mark on a busy background without the tile.
- Don't stretch, outline, add shadows or gradients to the mark.
- Don't call usage "tokens" without saying it means AI model usage.

## UI mockups

Approved by the maintainer on 2026-11-15 (build-plan step 12b). Steps 13 to 17
build to these. Source: `prototypes/ui-mockups.html` (open from disk in a
browser). Screenshots in `blueprint/reference/`:

| View | Dark | Light |
| --- | --- | --- |
| Widget, full | `ui-full-dark.png` | `ui-full-light.png` |
| Widget, problem states (stale, missing, error; empty in dark) | `ui-states-dark.png` | `ui-states-light.png` |
| Widget, compact (not set up in dark) | `ui-compact-dark.png` | `ui-compact-light.png` |
| Settings window | `ui-settings-dark.png` | `ui-settings-light.png` |
| Onboarding | `ui-onboarding-dark.png` | `ui-onboarding-light.png` |

Decisions:

- Light theme values and contrast as in "Light theme" above.
- New tokens `--primary`, `--primary-hover`, `--on-primary`, `--mark-row`,
  `--mark-dot`, `--dot-ring` and `--card-shadow`; dark values equal what ships.
  (Step 13 did not add `--mark-row` and `--mark-dot`; see "Light theme".)
- In light, tool dots get a thin navy ring (`--dot-ring`), because the tool
  accents are too pale on a light surface.
- 11 px is the smallest text size (was 10 px for widget labels and status).
- Onboarding (step 14) is the settings window's first-run view, not a separate
  window: detected tools with their source, Connect for Claude Code, what
  Token Huddle never touches, and Done to switch to the normal settings view.

Changes from 12a: the light values were completed and confirmed, and the
smallest text size went from 10 px to 11 px. The dark values are unchanged.

## Landing page

`tokenhuddle.arkaslittlemind.com` (host chosen in step 21d).

Built in step 21b with Astro and TypeScript in `site/`, and redesigned in step
21c to the approved Night shift design (`blueprint/reference/21c-night-shift/`),
styled with Tailwind CSS 4. The page imports `src/renderer/tokens.css` (with
Geist) and reads `src/renderer/mark.js` and `guidance.js` at build time, so the
colours, type, mark and the amber and red thresholds stay defined once.

- **Dark only.** The page has no light theme. Its own palette sits on the app's
  tokens: page `#0b0d12`, ink `#eef3fb`, secondary ink `#8d97b5`, faint ink
  `#5f6a8a`, italic accents in Ocean Breeze sky (`#90e0ef`). Over the pale sky
  of the photo, text uses dark navy ink (`#0b1230`).
- **Type.** Geist for everything, with Newsreader italic (`<em>`) for accent
  words. The site bundles Newsreader (`site/src/fonts`, SIL OFL). Terminal
  text in the hero uses system monospace fonts only: Cascadia Mono, then
  Consolas, then `ui-monospace`. Nothing is downloaded.
- **Valley photo** (`site/src/assets/valley.webp`, 1672 x 941), in the hero
  and the closing panel: a mountain lake at dawn under a pale halo, with mist
  and a lone pine. The maintainer made it. It is project artwork, with no
  third-party licence. In the hero it stops above the terminal and fades into
  the page.
- **Agent marks** (`site/src/assets/agents/`). These are the official Claude
  Code, Codex and OpenCode marks, copied from SVGL (svgl.app) with their
  colours unchanged. The Codex file had its sizing and inline style removed.
  The marks belong to their owners. They appear only in the "Reads from the
  agents you already run" list, to name the supported agents, and the footer
  says the project is not affiliated. The app shows no vendor marks.
- **Icons.** The six feature icons are Lucide path data (ISC,
  `site/src/components/LICENSE-lucide.txt`).
- **Widget copies** on the page use the brand tool dots, never vendor colours.
