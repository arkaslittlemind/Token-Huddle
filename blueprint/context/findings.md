# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-16 [P3] fixed - In the welcome view, redraw() can fall back to the hidden settings heading, so focus is lost

**File:** src/renderer/settings.js:254
**Found:** 2026-11-15 by /audit (scope: current; lens: quality)
**Why it matters:** The last fallback is always #settings-heading, which sits inside #settings and is hidden while the welcome shows; focus() on a hidden element does nothing. In the welcome a tool row's only control is its connection button, so a redraw that leaves a focused row with no enabled action (for example Claude moving from conflict to linked, or to error) reaches that fallback. In the settings list this cannot happen because every card keeps Move and the switches.
**Suggested fix:** Pass the fallback into redraw(container, nodes, fallback): the Done button (or the welcome heading with tabindex -1) in the welcome, #settings-heading otherwise. No requirement is lost.
**Resolution:** redraw() takes a fallback element: the Done button in the welcome view, the settings heading otherwise. Verified in the real app: with Connect Claude Code focused, a redraw that removes its action lands focus on Done. Awaiting re-review.

### F-29 [P3] open - Long-scenario reproduction command relies on an executable alias absent from fresh packages

**File:** docs/performance-report.md:89
**Found:** 2026-11-18 by /audit (scope: current; lenses: quality, security, performance, tests; independent review)
**Why it matters:** The report tells contributors to build fresh snapshots with scripts/profile-package.js and then invokes coverage/profile-package-opencode-arrays/electron.exe for the longer unpackaged scenarios. The helper renames electron.exe to Token Huddle Profile.exe and never creates an electron.exe alias. The existing local package retains that additional alias, but a newly generated package cannot run the documented command. This affects repeatability, not the retained measurements, which reproduce from local raw runs.
**Suggested fix:** Add the explicit local PowerShell preparation step: Copy-Item -LiteralPath 'coverage/profile-package-opencode-arrays/Token Huddle Profile.exe' -Destination 'coverage/profile-package-opencode-arrays/electron.exe'. Explain that the electron.exe alias intentionally preserves the original unpackaged classification for the longer scenarios. Alternatively, document the existing unpackaged launcher by omitting --executable while checking out the recorded source. No current requirement is lost. Do not silently substitute the renamed executable without acknowledging the changed build classification.
**Resolution:** Open, nonblocking documentation follow-up. No product or report files were edited by this review.
