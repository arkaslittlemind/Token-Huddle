# Performance optimization: before and after

Measured on 2026-11-18, following GitHub issue #9. The compact-row implementation and automated/runtime verification are complete. F-28 is repaired; fresh independent re-review is pending a new local checkpoint approval.

## What improved

In the large synthetic history, main-process private memory fell from **311.4 MB to 157.4 MB**, about **49% lower**. Forced refresh fell from **1.17 seconds to 0.85 seconds**, about **27% less time**. The input-delay probe fell from **1.11 seconds to 0.78 seconds**, about **30% lower**.

Small-history refresh also improved, from about **6.3 ms to 5.3 ms**. Small-history private memory was similar (73.2 / 74.7 MB), with overlapping observed ranges. **We have not demonstrated a reduction in your actual approximately 75 MB Task Manager app group.** These are synthetic workloads and different memory measures.

These figures supersede the earlier SQL experiment recorded in checkpoint e74584d. The retained implementation uses compact SQLite row arrays and the original JavaScript aggregation. The original queries, table-failure behavior, readings, freshness, account separation and app features are preserved.

## Before and after

Five independent runs per version and history, full widget, packaged profiling directory builds. Launch order alternates AB, BA, AB, BA, AB against the same fixture. Lower is better. Changes compare medians.

| History | Metric | Before | After | Change |
| --- | --- | --- | --- | --- |
| large | Forced refresh | 1,169.3 ms | 853.6 ms | -315.7 ms (-27.0%) |
| large | Input round trip during refresh | 1,115.0 ms | 782.6 ms | -332.4 ms (-29.8%) |
| large | Main private memory | 311.4 MB | 157.4 MB | -154.0 MB (-49.4%) |
| large | Main working set | 351.8 MB | 198.9 MB | -152.9 MB (-43.4%) |
| small | Forced refresh | 6.27 ms | 5.29 ms | -0.98 ms (-15.7%) |
| small | Input round trip during refresh | 3.97 ms | 3.92 ms | -0.04 ms (-1.1%) |
| small | Main private memory | 73.2 MB | 74.7 MB | +1.5 MB (+2.1%) |
| small | Main working set | 113.1 MB | 115.0 MB | +1.9 MB (+1.7%) |

Timing ranges are minimum-maximum across five runs, in milliseconds, not confidence intervals:

| History | Metric | Before range | After range |
| --- | --- | --- | --- |
| large | Forced refresh | 1,159.0-1,173.5 | 851.0-888.5 |
| large | Input round trip during refresh | 1,106.2-1,122.4 | 778.8-809.2 |
| small | Forced refresh | 5.5-6.9 | 5.0-5.8 |
| small | Input round trip during refresh | 3.9-5.0 | 3.3-4.1 |

Large-history timing ranges support a useful improvement. Small RAM differences should be treated as variation, not a demonstrated memory improvement. Resource values pool roughly one-second samples across the five runs; their sample counts and ranges are retained in JSON.

## What changed

The reader uses StatementSync.setReturnArrays(true) to receive the same seven metadata columns as compact positional rows instead of named row objects. It deduplicates with the original JavaScript Map and iterates that Map directly, avoiding a second result-array copy. Latest time and model are tracked as scalar values.

Each table is still fully exported by SQLite before its rows enter the deduplication Map. That preserves original conversion failures even when another table would replace the bad row. This resolves independent-review finding F-28 and also covers unsafe model values on non-latest records. The original SQL statements and JavaScript cost summation remain, including half-cent rounding. There is no custom SQL aggregation, compatibility scanner, new cache, worker, dependency, database write or refresh-frequency change.

## Longer background checks

One 65-second observation per version and scenario, unpackaged profiling entry, updates off. The older long-run baseline is reused; these exploratory cells are not alternating paired trials. Memory is the median of roughly one-second samples; timings are individual observations.

| History | State | Automatic refresh ms, before -> after | Main private MB, before -> after | Input probe ms, before -> after |
| --- | --- | --- | --- | --- |
| large | compact | 1,214.2 -> 913.7 | 305.1 -> 155.7 | 1,095.0 -> 785.0 |
| large | settings | 1,271.7 -> 900.0 | 305.1 -> 158.2 | 1,097.7 -> 788.7 |
| large | hidden | 1,188.1 -> 923.2 | 300.8 -> 156.4 | 1,117.2 -> 786.4 |
| small | compact | 6.8 -> 6.1 | 68.6 -> 68.6 | 3.9 -> 4.1 |
| small | settings | 5.6 -> 5.7 | 71.3 -> 70.0 | 4.7 -> 3.5 |
| small | hidden | 5.5 -> 5.7 | 67.8 -> 67.2 | 9.8 -> 9.7 |

All six optimized runs completed automatic and forced refreshes and preserved fixture totals. Hidden-mode collection continued, then the real tray listener revealed the widget. Individual small-history timings and memory samples varied; the five-run paired full-view comparison above is the stronger latency evidence.

## Reading the metrics

- **Milliseconds:** 1,000 ms is one second. Input round trip is a refresh IPC followed by a renderer query; it is not physical mouse latency.
- **Private memory:** Electron's per-process private-memory measure, reported kB divided by 1,000. Main and renderer values are recorded separately.
- **Working set:** resident pages, using reported kB divided by 1,000. Shared pages mean process working sets must not be added as exclusive app RAM.
- **Task Manager:** the supplied screenshot shows 75.8 MB across four processes (30.3, 22.2, 20.6 and 2.6 MB, rounded). Its exact column definition was not established, so it is not directly compared with these private-memory and working-set figures.
- **CPU:** raw Electron percentCPUUsage sampled about once per second, without additional core normalization. Invalid/negative samples are excluded and counted. Small near-idle percentage differences are not proof of a CPU optimization.

The large fixture has 100,000 messages per Claude/OpenCode account, two accounts per tool, with OpenCode messages duplicated across both supported tables. The small fixture has 100 messages per account. This is why the large-test memory is much higher than your real-use observation. It is not a normal-use RAM requirement.

## Method and reproducibility

AMD Ryzen 5 4600H, 12 logical CPUs, 16.5 GB RAM, Windows 10.0.26300, Electron 45.3.2 / bundled Node 24.22.2. Developer tests also ran on Node 22.23.5. Display scaling: 125% and 100%; observed power scheme: Energy Star. Other desktop activity and instrumentation overhead were not isolated.

Profiles and provider homes were temporary and synthetic. Updates were off; Codex was local-only. Fixtures were generated before timing. Processes started with empty provider caches; OS disk caches were not flushed. CPU/memory observation starts after initial data and ends before the final forced refresh. The long intervals include an automatic refresh. Native event-loop and Chromium script/layout measurements are retained in the aggregate JSON.

Production source base: bb61185d287a40704f32beb2ac5bc2b1efc3c88b (v0.1.2). The repaired reader is a working-tree change after review checkpoint e74584d. The version is unchanged because this work is unreleased. The profiling runner records an explicit baseline commit for the unchanged executable; provider source hashes bind the actual before/after snapshots. Comparisons reject mismatched fixture, environment, scenario or units.

Provider SHA-256:

- Before: 2b27b128930421885824154813ca709b239602123c8ce71b1a8cdb299e160af3
- After: 1aa05e745725560cd4cdb3090eca561a15edabf79a75f7a2d3a25da8b162ccdc

The main fixture has zero OpenCode costs. A separate cost-bearing large-history Electron provider experiment (100,000 nonzero costs/account, three timed reads) recorded a median **616.4 ms before / 434.2 ms after**. This is provider-only evidence, separate from app-level timing. Costs and half-cent rounding are also covered by regression tests.

Reproduce with the prepared local snapshots:

~~~powershell
npm run profile -- --runs=5 --scenarios=full --duration=5 --baseline-commit=bb61185d287a40704f32beb2ac5bc2b1efc3c88b --baseline-executable="coverage/profile-package/Token Huddle Profile.exe" --executable="coverage/profile-package-opencode-arrays/Token Huddle Profile.exe" --out=coverage/performance/opencode-arrays-paired
npm run profile -- --runs=1 --scenarios=compact,settings,hidden --duration=65 --executable=coverage/profile-package-opencode-arrays/electron.exe --out=coverage/performance/opencode-arrays-scenarios
node scripts/performance-report.js coverage/performance/opencode-arrays-paired/before coverage/performance/scenarios --out=docs/performance-before-opencode.json
node scripts/performance-report.js coverage/performance/opencode-arrays-paired/after coverage/performance/opencode-arrays-scenarios --out=docs/performance-after-opencode.json --before=docs/performance-before-opencode.json
~~~

Build fresh snapshots with scripts/profile-package.js using the recorded source version. These are developer profiling directories, not NSIS installations or published portable artifacts. Raw runs remain local under coverage/performance/. Aggregates contain timings, synthetic fixture counts and machine metadata.

## Validation and review

- Full Verify passed: lint, formatting, **213 app tests (212 passed, 1 existing platform skip)**, plus site check/format/tests/build (**25 site tests**). The existing Shiki/CSP build warning remains.
- All **23 focused provider/profiling tests** passed, including replaced unsafe input/output/reasoning/cost/model/timestamp values and non-latest models. The existing duplicate, table fallback, rounding, indexed tie, malformed/missing data, DST, non-unique-ID, read-only and WAL cases also pass.
- **24 seeded large-history cases** matched the original reader's complete output.
- Real Electron visibility/tray/always-on-top/movement checks and Settings/update IPC/retry/explicit-install checks passed through existing offline harnesses.
- The original baseline JSON remains unchanged (SHA-256 9d82e7c84791291757096a0dbf61a8fbce43a9108745d488adc3913380de2c42).
- Independent review of e74584d requested changes for **F-28 [P1]**. The builder marks it **fixed, awaiting independent closure**. F-10 [P3] was closed by that reviewer. The existing receipt remains changes-requested for its original target; it is not rewritten as a pass for this repair.
- The two excluded Playwright snapshots were moved intact, with approval and hash verification, to local coverage/review-artifacts/playwright/. They remain outside commits.
- No merge, push, release or GitHub update has occurred.

**Decision:** retain the compact-row reader based on equivalent readings and the measured latency/RAM results. A new approved immutable checkpoint and complete fresh independent review are required before completion. The status bar is a milestone snapshot and remains at 5/6 while review is pending.

## Remaining limits and deferred work

Large-history refresh still blocks the main process for roughly 0.8-0.9 seconds with two accounts. No cold-OS-cache, installer or released portable-startup improvement is claimed. Startup variation and worker-based responsiveness remain separate candidates. Renderer, layout and resize work was small in the baseline and was left unchanged. Actual reduction of the real-use 75 MB app group remains unproven.

SQL aggregation was investigated and discarded after the review exposed source-conversion differences; correct validation variants also regressed latency. The final native row-format change preserves the existing data flow with much less code. The superseded SQL measurements remain in checkpoint e74584d, and original baseline evidence is retained below.

## Evidence

- [Original baseline report](performance-baseline-report.md) and [original JSON](performance-baseline.json).
- [Matched before JSON](performance-before-opencode.json), [after JSON](performance-after-opencode.json), [comparison JSON](performance-opencode-comparison.json).

## Proposed repair checkpoint

Proposed message: perf: use compact OpenCode metadata rows.

One additional local checkpoint with these 10 changed files. No push, merge or release. The review/findings evidence remains separate as allowed by the review contract.

~~~text
CHANGELOG.md
blueprint/context/current-feature.md
docs/opencode-optimization-plan.md
docs/performance-after-opencode.json
docs/performance-before-opencode.json
docs/performance-opencode-comparison.json
docs/performance-report.md
scripts/profile.js
src/main/providers/opencode.js
test/opencode.test.js
~~~
