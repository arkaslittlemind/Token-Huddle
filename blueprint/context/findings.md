# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-10 [P3] fixed - OpenCode added account whose folder exists but has no opencode.db is told its folder was not found

**File:** src/main/providers/opencode.js:62
**Found:** 2026-11-15 by /audit (scope: current; lens: quality)
**Why it matters:** The branch checks existsSync(dbPath), not the folder, so the copy is wrong when the folder is there. Codex checks the folder first. The suggested action still helps, so impact is low.
**Suggested fix:** Word it for both cases ("No OpenCode data was found in this account's folder. Remove this card in Settings, or add the folder again") or check the folder first like Codex. No requirement is lost.
**Resolution:** Fixed on 2026-11-16 for GitHub issue https://github.com/arkaslittlemind/token-huddle/issues/3: missing-data wording covers absent and existing empty folders, with regression tests. `npm run verify` passed. Awaiting audit closure; GitHub issue remains open.

### F-16 [P3] fixed - In the welcome view, redraw() can fall back to the hidden settings heading, so focus is lost

**File:** src/renderer/settings.js:254
**Found:** 2026-11-15 by /audit (scope: current; lens: quality)
**Why it matters:** The last fallback is always #settings-heading, which sits inside #settings and is hidden while the welcome shows; focus() on a hidden element does nothing. In the welcome a tool row's only control is its connection button, so a redraw that leaves a focused row with no enabled action (for example Claude moving from conflict to linked, or to error) reaches that fallback. In the settings list this cannot happen because every card keeps Move and the switches.
**Suggested fix:** Pass the fallback into redraw(container, nodes, fallback): the Done button (or the welcome heading with tabindex -1) in the welcome, #settings-heading otherwise. No requirement is lost.
**Resolution:** redraw() takes a fallback element: the Done button in the welcome view, the settings heading otherwise. Verified in the real app: with Connect Claude Code focused, a redraw that removes its action lands focus on Done. Awaiting re-review.

### F-17 [P3] fixed - Compact summary says "Usage usage" for a window labelled "Usage"

**File:** src/renderer/renderer.js:98
**Found:** 2026-11-15 by /audit (scope: current; lens: quality)
**Why it matters:** The compact screen-reader text is built as label + " usage", bypassing the naming rule in windowText. A window with no length is labelled "Usage" (src/main/providers/util.js:6), so compact view reads "40% Usage usage".
**Suggested fix:** Use guidance.windowText(w).name for the compact text. No requirement is lost.
**Resolution:** The compact screen-reader text now uses guidance.windowText(w).name. Verified in the real compact widget. Awaiting re-review.

### F-18 [P3] fixed - The focus-ring translucent test does not prove "over any desktop"

**File:** test/contrast.test.js:127
**Found:** 2026-11-15 by /audit (scope: current; lens: tests)
**Why it matters:** It checks --focus over white and black only. The text test above also asserts the colour stays on the same luminance side of both composites, which is what lets two extremes cover every desktop between them. Today's tokens pass; the test cannot prove the claim.
**Suggested fix:** Add the same Math.sign(luminance(focus) - luminance(bg)) === side assertion for both desktops. No requirement is lost.
**Resolution:** The translucent focus test now also asserts --focus stays on the same luminance side of both composites. Awaiting re-review.

### F-19 [P3] fixed - The sparkline's name reads raw token counts

**File:** src/renderer/renderer.js:78
**Found:** 2026-11-15 by /audit (scope: current; lens: quality)
**Why it matters:** The label joins provider.spark as raw integers, so a screen reader speaks seven long numbers such as "1523442", while the visible stats use short forms like 1.3M. It also does not say the order is oldest first.
**Suggested fix:** Format each value short with a small renderer-side formatter and say "oldest first". No requirement is lost.
**Resolution:** guidance.sparkText() speaks short numbers, oldest first. Verified in the real widget: "Tokens per day, last 7 days, oldest first: 120, 340, ...". Test added. Awaiting re-review.

### F-20 [P3] fixed - Moved comment no longer describes the rule below it

**File:** src/renderer/styles.css:291
**Found:** 2026-11-15 by /audit (scope: current; lens: quality)
**Why it matters:** .sr-only was inserted between the comment "A problem's next action wraps in full view" and .note.action, so that comment now sits on top of the wrong rule.
**Suggested fix:** Move the .sr-only block (with its own comment) above that comment or below the .note.action rule. No requirement is lost.
**Resolution:** The .sr-only block moved below .note.action, each comment above its own rule. Awaiting re-review.

### F-24 [P2] fixed - CHANGELOG [Unreleased] still says, without the exception, that Token Huddle makes no network calls of its own

**File:** CHANGELOG.md:121
**Found:** 2026-11-15 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** Nothing is released yet, so the whole [Unreleased] section becomes the 0.1.0 notes, and scripts/release-notes.js puts it in the GitHub release body. Its Changed entry (lines 121-123, "because Token Huddle no longer makes network calls of its own") and Security entry (lines 139-140, "and makes no network calls of its own") make the unqualified promise this feature's goal and step 5 say no file should still make, beside the new Added entry that names the update check. A reader of the Security section gets the wrong privacy statement. The Added entry in the same section discloses the check, so this is not P1.
**Suggested fix:** Add the same exception to both entries (for example "makes no network calls of its own except the update check, which Check for updates turns off"). No requirement is lost.
**Resolution:** Fixed on 2026-11-17 for GitHub issue https://github.com/arkaslittlemind/token-huddle/issues/6: both Changed and Security entries now name this project's GitHub Releases update checks and the Check for updates switch. Security retains the login/credential promise and states that the check sends no personal data. Assertions against extracted prerelease notes and `npm run verify` passed (180 desktop tests, 22 site tests and remaining gates). Awaiting audit re-review; GitHub issue remains open.

### F-27 [P3] invalid - The page CSP allows data: images that nothing on the page uses

**File:** site/astro.config.ts:17
**Found:** 2026-11-15 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** The spec asks for `connect-src https://api.github.com` and everything else `'self'`. `img-src 'self' data:` loosens that, yet the built index.html and site CSS contain no data: URI (the mark, bars and favicon are inline SVG or /favicon.svg). The extra source is unneeded attack surface, though small for a static page with no user input.
**Suggested fix:** Delete the `img-src` directive (default-src 'self' already covers images) or set it to `'self'`. No requirement is lost.
**Resolution:** Invalid, re-examined 2026-11-17 by /audit (scope: site/; all lenses). The finding predates the 21c redesign. site/src/components/Marquee.astro now imports the three agent marks with `?url`; they are under Vite's 4 KB inline limit (393, 1304 and 259 bytes), so the build emits 12 `<img src="data:image/svg+xml,...">` tags in site/dist/index.html (3 agents x 2 listings x 2 halves) and the live marquee depends on `img-src 'self' data:`. Removing the directive would block the agent marks. No other source needs it, so the allowance is required, not surplus.
