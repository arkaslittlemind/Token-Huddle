# Feature: Performance baseline and comparison report

**From build-plan:** feature 24
**Build attempt:** 1
**Status:** verified (F-28 repaired; automated/runtime checks passed; fresh independent review pending)
**Branch:** feature/performance-baseline-and-comparison-report
**Source:** https://github.com/arkaslittlemind/Token-Huddle/issues/9

## Goal

Establish a reproducible baseline before optimization and a readable report that can compare the same workloads after each measured change. Select the first optimization using evidence, not assumed savings.

## In scope

- Explicitly invoked, local profiling tooling using Node/Electron built-ins and installed dependencies. No new runtime dependency.
- Separate temporary app profiles, synthetic Claude JSONL and OpenCode SQLite histories, a synthetic Codex response/log fixture, and multiple isolated accounts. Never discover real provider homes or launch a real Codex program during profiling.
- Small/demo workload and a large-history workload with recorded file/row/byte counts and deterministic expected totals. Generate large fixtures locally rather than committing databases.
- Windows packaged startup and real Electron orchestration measurements; distinguish installed/portable, unpackaged, cold-provider-cache and warm-provider-cache results. A fresh process is not proof of a cold OS disk cache.
- Time from process launch to visible widget and first usable data, refresh duration by provider, tray reveal/input response during refresh, main event-loop delay, renderer script/layout work and resize IPC count, main/renderer CPU and memory.
- Full/compact views, Settings closed/open, widget visible/hidden, updates disabled, idle, automatic refresh and forced refresh. Collect long enough to include at least one 60-second automatic refresh cycle; report observation duration.
- Record app version and commit, Electron/Node versions, Windows/CPU/RAM, power mode and display scaling, fixture identity, instrumentation overhead and repeated-run count. Unknown metadata must say unknown.
- Human-readable Markdown report with a short findings paragraph, metric glossary, baseline results, ranked candidates and a before/after table ready for later optimization results. Include machine-readable aggregate measurements for reproducibility.

## Out of scope

Provider/cache/renderer optimizations, early menu changes, workers, bundlers, TypeScript migration, changes to refresh frequency, hidden-widget freshness or alerts, telemetry, network profiling, publication and releases. No speedup claim until a comparable after run exists.

## Build loop

Review the complete feature once after all steps (stepReview: feature). No checkpoint commits. Keep all app behavior unchanged outside explicit profiling runs. Final commit and landing require separate authorization.

## Build steps

- [x] 1. Add deterministic synthetic fixture generation and measurement/result helpers under scripts/, plus focused logic tests.
  Done when expected totals, account separation, missing/malformed fixture handling, timing summaries and comparison math pass the configured test command; fixture provenance and exact sizes are recorded.
- [x] 2. Add an opt-in profiling entry point through scripts/launch.js, reusing the isolated-profile patterns in scripts/check-widget-visibility.js and scripts/check-updates.js. Add minimal gated measurement hooks only where needed in main/renderer.
  Done when demo and synthetic provider workloads run without real tool discovery or network access; profiling ends on success/error with a bounded timeout, produces aggregate measurements, and normal launches do not collect or write profiling data. Use a packaged profiling path without weakening sandbox/CSP or shipping developer fixtures by default.
- [x] 3. Run the baseline matrix and write docs/performance-report.md with commands, workload manifest, raw aggregate result locations and limitations.
  Done when at least five independent startup/refresh runs per reported workload provide median, minimum and maximum; idle CPU/memory samples name process scope and duration; automatic/forced refresh and visible/hidden/full/compact/Settings scenarios are represented. First-after-reboot or installer checks that cannot be automated must be explicitly unmeasured, never inferred from source or development runs.
- [x] 4. Rank candidates by measured delay/resource cost and implementation effort, derive practical budgets from the baseline, and prepare the comparison sections for subsequent changes.
  Done when the report explains what affects the user, names the evidence for each ranked candidate, records non-issues/deferred candidates, and marks after values as pending. Run npm run verify plus the real Electron visibility and update checks. Record actual outcomes and any pre-existing blockers without hiding failures.

## Files / areas

- scripts/: new profiling entry point, fixture generation, result summaries; existing launch.js, screenshot.js and Electron checks as patterns.
- src/main/main.js, src/main/instances.js, src/main/providers/: narrowly gated timing/isolation seams if the harness requires them.
- src/renderer/renderer.js and settings.js: opt-in measurement only if tracing cannot provide the metric.
- test/: meaningful coverage for fixture generation, totals, aggregation and comparison helpers; test/fixtures/README.md for provenance.
- docs/performance-report.md and local aggregate results with a documented schema and invocation.
- package.json: profiling command if needed; CHANGELOG.md: Unreleased entry for profiling behavior/tooling added.

## Data / contracts

Only synthetic identifiers and usage metadata. No credentials, raw personal session content, user paths, real account IDs or provider configuration changes. Disable update checks and real Codex execution. Preserve read-only SQLite behavior and source tables. Results identify scenario, fixture, commit/build, repetition, metric, unit and value. Report failures distinctly from missing/unsupported metrics. CPU samples state sampling interval and normalization; memory states working set/RSS/private bytes as available. Main and renderer memory are separate; do not label their sum total app memory without including other Chromium processes.

Comparison pairs must match fixtures, scenario, hardware, build type and method. Show before, after, absolute change and percent change, plus variability. Define lower-is-better explicitly. Zero baseline or mismatched samples yield unavailable percent/comparison with a reason. Use milliseconds, percent and MB with definitions, never unexplained scores. Separate user-visible timings from provider microbenchmarks and instrumented traces from uninstrumented startup.

## Testing

Use npm test for new pure logic; temporary synthetic directories only. Use npm run verify as the final automated gate. Exercise node scripts/launch.js scripts/check-widget-visibility.js and node scripts/launch.js scripts/check-updates.js. Validate packaged Windows startup locally without publishing. Capture demo widget/Settings if any UI behavior changes. No browser harness installation.

## Notes for the AI

Follow coding-standards.md: plain CommonJS, built-ins first, per-account provider cache, strict isolation/CSP, no credential access, safe DOM text rendering, best-effort settings persistence. Preserve data accuracy, rolling windows, table fallback/deduplication, tray first-click reveal, countdowns, ordering, focus, announcements and alerts. Hiding the widget never stops collection. The approved scope revision below authorizes the focused OpenCode optimization in this feature.

Initial source revision: bb61185d287a40704f32beb2ac5bc2b1efc3c88b (v0.1.2). Existing npm run verify stops at format:check on two untracked .playwright-mcp YAML artifacts. Leave unrelated artifacts intact; report the failure until resolved through an authorized, scoped approach. At initial spec authoring, no baseline had been collected; current results are linked below. Scope critique separates measurement from optimization and forbids presenting process restarts as cold OS-cache measurements.

## Implementation evidence

Baseline and comparison report: [docs/performance-report.md](../../docs/performance-report.md). Baseline and all approved implementation steps are complete. Full Verify, focused tests and real Electron visibility/update checks passed on 2026-11-18. The original formatting blocker was repaired with approval. OpenCode is the only production runtime file changed. The original baseline remains unchanged, and the current report records paired latency, CPU, working-set and private-memory comparisons, plus longer background-refresh observations. Independent review is selected by the user-data policy and awaits checkpoint approval. The user approved one local 22-file review checkpoint on 2026-11-18. No merge, push, release or other external action is authorized.

## Approved scope revision (2026-11-18)

The user approved docs/opencode-optimization-plan.md. Its goals, contracts, acceptance and prerequisite repair are incorporated into this active spec. It supersedes the earlier exclusion of OpenCode optimization and the instruction to leave the two specified generated YAML files untouched. Other exclusions remain. The user subsequently approved one local review checkpoint on 2026-11-18; no external action is authorized.

- [x] 5. Format only the two approved YAML artifacts and pass baseline Verify.
- [x] 6. Add OpenCode equivalence/fallback/boundary regression tests before changing query behavior.
- [x] 7. Evaluate SQLite deduplication/aggregation to reduce allocations and blocking; preserve read-only behavior and every tested reading contract.
- [x] 8. Repeat matched packaged small/large runs and longer compact/Settings/hidden scenarios; compare latency, CPU, working set and available private memory. Preserve original baseline results.
- [x] 9. Update the readable report/changelog and retain the candidate only with supporting equivalence and performance evidence; pass Verify and real Electron visibility/update checks.

## Optimization implementation details

The SQL aggregation candidate was discarded after independent review and repair profiling. The retained reader uses the original SELECT statements and whole-table .all() conversion, with StatementSync.setReturnArrays(true) to obtain compact seven-column metadata rows. It deduplicates with the original JavaScript Map and iterates that Map's values directly instead of copying them into another array. Latest time/model are tracked as scalar values. This preserves original field conversion failures before deduplication, including replaced and non-latest unsafe values, without a compatibility scanner or SQL aggregation layer. No cache, worker, dependency, database write or refresh-frequency change was introduced.

- [x] 10. Added the user-requested lean standalone HTML/CSS task status bar in docs/task-status.html; previewed at desktop and phone widths.

## Independent review repair

The fresh automatic review of e74584dd30695d1774384430dc3610db4d1874d6 requested changes for F-28. The optimized query validated only winning rows, missing source-table export failures on replaced rows and non-latest model values. The retained repair preserves the original conversion-before-deduplication sequence by using compact native SQLite row arrays with the original queries and JavaScript aggregation. SQL validation variants were discarded because they added refresh latency.

- [x] 11. Repair F-28, add replaced-input/output/reasoning/cost/model/timestamp and non-latest-model regressions, repeat matched measurements and final gates. A new checkpoint approval and full independent re-review remain required before completion. Mark the finding fixed only after checks pass; a reviewer must close it.

## Repair validation

The compact-row reader passed all 23 focused tests and 24 seeded equivalence cases. Full Verify passed (213 app tests: 212 pass, 1 skip; 25 site tests), and both real Electron checks passed. Five alternating before/after runs and six 65-second background scenarios support retaining it. The report records the fresh results and exact source hash. F-28 is fixed, awaiting independent closure. The first approved checkpoint remains immutable; additional product changes require a new checkpoint approval and full fresh review.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":12412,"specSha256":"1bfe9106a5614936073f8ec4720aa57783f89b5d65f1ec9f82b906c41c1354af","branch":"refs/heads/feature/performance-baseline-and-comparison-report","head":"5fb8b869713f0c5349ba8a533eba3eb98b868cf4","baseRef":"refs/heads/main","baseCommit":"bb61185d287a40704f32beb2ac5bc2b1efc3c88b","sourceTree":"d88bbc3b02482e4a0842c0d575b159835c41fbc7","landing":"local-merge","absentOptional":[]} -->

## Findings

### 24/F-10 [P3] closed - OpenCode added account whose folder exists but has no opencode.db is told its folder was not found

**File:** src/main/providers/opencode.js:62
**Found:** 2026-11-15 by /audit (scope: current; lens: quality)
**Why it matters:** The branch checks existsSync(dbPath), not the folder, so the copy is wrong when the folder is there. Codex checks the folder first. The suggested action still helps, so impact is low.
**Suggested fix:** Word it for both cases ("No OpenCode data was found in this account's folder. Remove this card in Settings, or add the folder again") or check the folder first like Codex. No requirement is lost.
**Resolution:** Fixed on 2026-11-16 for GitHub issue https://github.com/arkaslittlemind/token-huddle/issues/3: missing-data wording covers absent and existing empty folders, with regression tests. `npm run verify` passed. Closed by independent audit on 2026-11-18: the reviewed OpenCode missing-data branch covers absent files and existing empty folders, and both regression cases pass in npm test. GitHub issue remains open.

### 24/F-27 [P3] invalid - The page CSP allows data: images that nothing on the page uses

**File:** site/astro.config.ts:17
**Found:** 2026-11-15 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** The spec asks for `connect-src https://api.github.com` and everything else `'self'`. `img-src 'self' data:` loosens that, yet the built index.html and site CSS contain no data: URI (the mark, bars and favicon are inline SVG or /favicon.svg). The extra source is unneeded attack surface, though small for a static page with no user input.
**Suggested fix:** Delete the `img-src` directive (default-src 'self' already covers images) or set it to `'self'`. No requirement is lost.
**Resolution:** Invalid, re-examined 2026-11-17 by /audit (scope: site/; all lenses). The finding predates the 21c redesign. site/src/components/Marquee.astro now imports the three agent marks with `?url`; they are under Vite's 4 KB inline limit (393, 1304 and 259 bytes), so the build emits 12 `<img src="data:image/svg+xml,...">` tags in site/dist/index.html (3 agents x 2 listings x 2 halves) and the live marquee depends on `img-src 'self' data:`. Removing the directive would block the agent marks. No other source needs it, so the allowance is required, not surplus.

### 24/F-28 [P1] closed - Deduplication hides an unsafe source row before table-failure validation

**File:** src/main/providers/opencode.js:116
**Found:** 2026-11-18 by /audit (scope: current; lenses: quality, security, performance, tests; independent review)
**Why it matters:** The optimized query decodes and validates only the rows left in chosen after v2 replacement. The original reader extracts all eligible rows per table before deduplication; an unsafe SQLite integer in an extracted field rejects that entire table. Reproduced against the exact base and target with a 77,824-byte temporary synthetic database: v1 contains id huge with input 9007199254740992 and a distinct 42-token row, while v2 replaces huge with 5 tokens (500 zero-token v2 padding rows select the SQL path). The base reports 5 for Today, 7 days, 30 days and the spark bucket; the target reports 47 because the superseded unsafe v1 row never reaches unsupported validation. This violates the approved requirement to preserve independent table failure and unsafe-integer behavior. The existing unsafe-integer test does not combine that input with an eligible replacement.
**Suggested fix:** Validate eligible source rows before replacement so any source-table extraction failure selects the existing reader, preserving its per-table failure behavior. Add a regression with an unsafe replaced v1 row plus an independent valid v1 row and compare the complete reading to the base. No current requirement is lost.
**Resolution:** Fixed on 2026-11-18 by restoring the original SELECT and full-table native export before deduplication, using compact SQLite row arrays instead of SQL aggregation. Replaced unsafe input/output/reasoning/cost/model/timestamp and non-latest-model regressions pass. All 23 focused tests, 24 seeded equivalence cases, full Verify (212 app tests passed, 1 skip; 25 site tests), real Electron checks and fresh paired/background measurements passed. Awaiting fresh independent closure against a new approved checkpoint.


**Independent closure (2026-11-18):** Fresh automatic review of 5fb8b869713f0c5349ba8a533eba3eb98b868cf4 against bb61185d287a40704f32beb2ac5bc2b1efc3c88b confirmed that the original SELECT statements fully export each table before deduplication. Compact positional rows preserve conversion failures in replaced rows and non-latest models. The replaced-field and non-latest-model regressions pass in full Verify, and 24 seeded complete-reading equivalence cases pass against the original packaged source. F-28 is closed.

## Independent review

**Status:** passed
**Target commit:** 5fb8b869713f0c5349ba8a533eba3eb98b868cf4
**Base commit:** bb61185d287a40704f32beb2ac5bc2b1efc3c88b
**Base ref:** refs/remotes/origin/main
**Spec hash:** 1bfe9106a5614936073f8ec4720aa57783f89b5d65f1ec9f82b906c41c1354af
**Prepared by:** codex
**Builder model:** gpt-6.1-sol
**Requested reviewer:** codex
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-11-18T09:50:33.405Z
**Workflow:** regular
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-11-18T09:54:58.121Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `git rev-parse HEAD`, `git symbolic-ref refs/remotes/origin/HEAD`, `git merge-base refs/remotes/origin/main HEAD`, raw SHA-256/spec-byte comparison, and `git status --porcelain=v1 --untracked-files=all`: pass before and after review; exact target/base/spec and evidence-only differences.
- `git diff --check bb61185d287a40704f32beb2ac5bc2b1efc3c88b..HEAD`: pass.
- `npm run verify`: pass; lint, root/site formatting, 213 app tests (212 passed, 1 existing Windows symlink-permission skip), zero site diagnostics, 25 site tests and static build.
- `node scripts/launch.js scripts/check-widget-visibility.js`: pass; real Electron tray reveal, visibility, focus and movement.
- `node scripts/launch.js scripts/check-updates.js`: pass; offline real Settings/update IPC, retry and explicit-install checks.
- `node coverage/performance/equivalence-check.js`: pass; 24 seeded complete-reading comparisons against the original reader.
- Read-only Node reconstruction with `buildReport` and `compareReports` over paired before/after and long-scenario raw-run directories: pass; all measurements and calculations match committed aggregates after excluding generated recordedAt and manually appended sourceVariant metadata. An initial whole-object assertion exposed that extra metadata; the corrected measurement comparison passed.
- SHA-256 of baseline JSON and both packaged provider snapshots: pass; hashes match the report and retained provider source.

## Evidence

- Reviewed the complete bb61185d287a40704f32beb2ac5bc2b1efc3c88b..5fb8b869713f0c5349ba8a533eba3eb98b868cf4 delta: all five profiling scripts, package command and release exclusions, production OpenCode reader, both changed test files, fixture provenance, reports, aggregate JSON, status-bar HTML, changelog, plans, overview and verified spec. Request/findings were excluded from product scope. Dependencies, generated builds and unrelated areas were excluded; local raw runs and packaged sources were read only as evidence.
- Quality: compact native rows, direct Map iteration and scalar latest metadata preserve original SQL, scan order, duplicate precedence, JavaScript accumulation/rounding, account separation and independent table failure. F-29 records the fresh-package command gap.
- Security: SQLite remains read-only with fixed SQL identifiers. Profiling replaces discovery with explicit synthetic homes, requires local-only Codex, disables update checks and isolates profiles. Release packaging excludes profiling scripts/fixtures. No credentials or network-backed tools were accessed.
- Performance: five alternating packaged repetitions per workload support improved large-history latency/private memory. Six 65-second exploratory scenarios cover automatic refresh. Raw evidence reproduces aggregate measurements and comparisons exactly. Original/retained provider hashes match the declared sourceVariant metadata. No multi-minute profiling was repeated for confirmation.
- Tests: new cases cover duplicate precedence/ties, independent table failures, read-only/WAL, unsupported schemas, rolling/day/DST boundaries, numeric strings, cost rounding, replaced unsafe fields and non-latest unsafe models. No focused, skipped or placeholder test was introduced. Full Verify and 24 seeded complete-reading equivalence cases pass.
- Freshness: HEAD/base/spec and evidence-only worktree verified before and after inspection. Current spec is tracked and byte-identical to target; no snapshot field is present or required. Baseline JSON hash remains 9d82e7c84791291757096a0dbf61a8fbce43a9108745d488adc3913380de2c42. Provider source hashes are 2b27b128930421885824154813ca709b239602123c8ce71b1a8cdb299e160af3 before and 1aa05e745725560cd4cdb3090eca561a15edabf79a75f7a2d3a25da8b162ccdc after.
- Identity is declared runtime metadata: parent T3 runtime exposes codex / gpt-6.1-sol; native collaboration declares inheritance and this child has no model override. This review began in a fresh isolated child without the builder transcript. Requested runtime-default sentinel permits the exact inherited declared model.

## Findings

- F-28 [P1]: closed after independent repair review and passing regression/equivalence checks.
- F-29 [P3]: open, nonblocking fresh-package reproduction command issue.
- No open or fixed P0/P1 remains. Unrelated existing findings retain their prior statuses.

## Remaining risk

- F-29: the long-scenario command depends on a locally retained executable alias; fresh snapshots need the documented preparation step.
- Existing Shiki/CSP warning remains. One existing Windows symlink-permission test skipped; no new skip was introduced.
- Cold OS-cache, installed NSIS, released portable-extractor, physical input and uninstrumented-startup behavior remain unmeasured. Instrumentation overhead and other desktop activity remain uncontrolled as disclosed.
- Large-history main-thread blocking remains approximately 0.8-0.9 seconds with two accounts. Synthetic savings do not establish reduced real Task Manager app-group memory. Long background cells are exploratory single runs using a reused before baseline.
- Source bindings are manually appended aggregate metadata and were checked separately. After commit metadata names the pre-repair checkpoint; the report explains the working-tree repair and binds exact retained source by providerSha256.
- Check was not required. No unavailable verification command was encountered; lengthy profiling was not repeated solely for confirmation.

## Try it now

Run or do:

Open `docs/performance-report.md` and read the before/after comparison table.

Expected:

The small- and large-history workloads show refresh/input time and memory measurements, with percentage changes and measurement limits.

This proves:

The readable comparison report is available; it does not measure your live Task Manager RAM usage.
