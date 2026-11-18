> Archived baseline report, recorded before the OpenCode optimization. Check results and pending values below are historical. See [the current comparison report](performance-report.md).

# Performance baseline and optimization report

Status: baseline collected on 2026-11-18. No optimization has been applied yet.

This report follows GitHub issue #9. It compares the same local synthetic workloads before and after each future optimization. Pending means no after measurement exists, not zero improvement.

## How to read the numbers

- Milliseconds (ms): 1,000 ms is one second. Lower is better for startup, refresh and input delay.
- Median: the middle result across repeated runs. The minimum and maximum show variability. These are not confidence intervals.
- Input round trip: an IPC refresh request followed by a renderer query, including main-thread blocking. It is a useful responsiveness probe, not a physical mouse/keyboard latency measurement.
- Working-set MB: Electron's reported kB divided by 1,000. Main and renderer values are separate. GPU and utility processes are recorded too; do not add working sets as exclusive app RAM because pages can be shared.
- CPU: raw Electron-reported percentCPUUsage sampled about once per second. No additional core normalization is applied. Negative/invalid samples are excluded and counted in the aggregate results, not treated as zero.
- Script/layout time: cumulative Chromium Performance domain durations during the observation interval. They are not individual render-frame latency.

## Method and reproducibility

Production source base: bb61185d287a40704f32beb2ac5bc2b1efc3c88b, v0.1.2, with this branch's developer profiling scripts. The production src/ files are unchanged. Instrumentation is opt-in; normal app launches do not load it.

Measured machine: AMD Ryzen 5 4600H, 12 logical CPUs, 16.5 GB RAM, Windows build 10.0.26300, Electron 45.3.2 / bundled Node 24.22.2, displays at 125% and 100% scaling.

Use Node 22+ and the installed dependencies, from the repository root:

~~~powershell
node scripts/profile-package.js
npm run profile -- --runs=5 --scenarios=full --duration=5 --executable="coverage/profile-package/Token Huddle Profile.exe" --out=coverage/performance/packaged
npm run profile -- --runs=1 --scenarios=compact,settings,hidden --duration=65 --out=coverage/performance/scenarios
node scripts/performance-report.js coverage/performance/repeated coverage/performance/packaged coverage/performance/scenarios
~~~

The optional first argument to profile-package.js selects a fresh output folder for later builds. Rebuild the profiling directory after changing app source; do not benchmark an old snapshot. The runner removes its generated fixtures and profiles after child exit; raw measurements remain.

The package helper assembles a local Electron directory with the profiler as its entry point. It refuses to overwrite an existing package. This is a packaged profiling build, not an NSIS installation or the published portable executable. The original electron.exe-name runs report app.isPackaged=false and are kept as unpackaged results. They are not relabeled as packaged measurements.

The runner generates fixtures before starting the timed child. Launch-to-visible uses the parent timestamp. App-module-to-data-paint begins just before loading production main.js and ends after the renderer sees six cards and two animation frames pass. It is an instrumented paint proxy, not a presentation timestamp from the Windows compositor. No claim of uninstrumented startup is made. Fixture preparation is excluded from these runner measurements.

The harness replaces discovery with an explicit allowlist of six fixture homes, disables updates, forces Codex local-only, and checks every provider reading and token total. Claude bridge checks read only the isolated profile and synthetic home. There is no Connect action, vendor call or real tool discovery. Each new process has an empty provider cache; the OS disk cache is not flushed. Initial runs are not cold-disk runs. The first small run is retained even if slower.

Five independent full-view runs per workload cover initial and forced refresh; five-second resource windows are short settling samples, not steady-state idle evidence. Separate 65-second observations cover compact view, Settings open and hidden widget, including one automatic refresh cycle and a forced refresh at the end. These longer scenarios have one run each and are exploratory. Hidden-mode tray reveal is invoked through the real tray listener, without a physical click.

Generated workloads use two independent accounts per provider. Small has 100 messages per Claude/OpenCode account. Large has 100,000 messages per account in 100 Claude files, with each OpenCode message duplicated across the old/new tables to exercise deduplication. All messages have the same fixed local date (2026-11-18 15:00), stressing history volume rather than age distribution. Codex has one synthetic local rate-limit event per account. Tokens per message are 15 and 16 for the two accounts; large totals must be 1.5 million and 1.6 million. Exact file/row/byte counts and expected totals are in performance-baseline.json.

Hardware, Windows, runtime versions and display scaling are in the aggregate JSON. The observed Windows power scheme was Energy Star (powercfg /getactivescheme). Other desktop activity and power-policy details were not controlled. Instrumentation overhead has not been isolated in an A/B run. Use matching hardware, power mode, build type, fixture and observation method for before/after comparisons.

Raw per-run measurements: coverage/performance/ (local, ignored). Durable aggregate measurements: docs/performance-baseline.json. The JSON records scenario/build/workload, repetition counts, median/min/max, observation duration, sample counts and invalid-sample counts. Provider async elapsed times overlap while collect runs Promise.all; they must not be added or treated as isolated CPU costs. Later long runs additionally record synchronous provider-call duration before awaiting, isolating blocking OpenCode work from promise scheduling.

## Results

The repeatable problem is large-history refresh responsiveness. Across five packaged profiling runs, a forced refresh took a median **1,181 ms (1.18 seconds)**, while the input round trip during that refresh took **1,124 ms (1.12 seconds)**. The small workload refreshed in **5.5 ms** with a **3.8 ms** input round trip. These are different workloads, not before/after improvements.

### Before and after tracker

Five independent runs per workload, packaged profiling directory build, full widget. Lower is better for every timing. Ranges are minimum-maximum, not uncertainty intervals.

| Workload | Metric | Before median (range) | After | Change |
| --- | --- | --- | --- | --- |
| small | Launch to visible widget | 827.0 ms (821.0-13,255.0) | Pending | Pending |
| small | Launch to usable data (paint proxy) | 866.0 ms (846.0-13,599.0) | Pending | Pending |
| small | First refresh (empty provider cache) | 39.2 ms (35.6-1,363.8) | Pending | Pending |
| small | Forced refresh (warm provider cache) | 5.5 ms (5.2-6.5) | Pending | Pending |
| small | Input round trip during refresh | 3.8 ms (3.7-4.2) | Pending | Pending |
| large | Launch to visible widget | 1,623.0 ms (1,583.0-1,744.0) | Pending | Pending |
| large | Launch to usable data (paint proxy) | 2,211.0 ms (2,207.0-2,979.0) | Pending | Pending |
| large | First refresh (empty provider cache) | 1,928.4 ms (1,922.6-2,647.2) | Pending | Pending |
| large | Forced refresh (warm provider cache) | 1,181.2 ms (1,162.5-1,219.9) | Pending | Pending |
| large | Input round trip during refresh | 1,124.1 ms (1,109.2-1,156.5) | Pending | Pending |

**Startup caveat:** the first small packaged launch took 13.3 seconds to become visible; subsequent launches were 821-856 ms. The cause was not isolated. The outlier is retained. These runs do not establish cold OS-cache startup or installed release startup. The analogous first unpackaged launch was also unusually slow (7.1 seconds). Do not use the median alone to promise launch speed.

### Longer idle and automatic-refresh observations

One 65-second run per cell, unpackaged profiling entry, updates off. Each includes one automatic refresh and preserves account totals. CPU/RAM values are medians of one-second samples; this observation interval includes an automatic refresh and is not pure idle-only CPU. Renderer working set is per-process, pooled across both renderers with Settings open. Script/layout columns are cumulative widget work over the entire interval, in milliseconds.

| Workload | View/state | Automatic refresh ms | Main CPU | Main MB | Renderer MB | Widget script/layout ms |
| --- | --- | --- | --- | --- | --- | --- |
| small | compact | 6.8 | 0.076% | 107.2 | 78.6 | 2.0 / 1.2 |
| small | settings | 5.6 | 0.078% | 109.4 | 86.6 | 1.4 / 2.1 |
| small | hidden | 5.5 | 0.075% | 107.0 | 81.8 | 1.3 / 1.7 |
| large | compact | 1,214.2 | 0.077% | 341.1 | 78.4 | 1.5 / 1.5 |
| large | settings | 1,271.7 | 0.076% | 343.5 | 89.9 | 1.5 / 2.4 |
| large | hidden | 1,188.1 | 0.079% | 338.2 | 80.8 | 32.1 / 1.8 |

Forced refresh was also exercised at the end of every run. Hidden-mode automatic refresh still completed (5.5 ms small, 1,188.1 ms large), then the tray listener revealed the widget. These are orchestration checks, not physical-click timing or a new test of alert delivery.

Resize IPC counts were 6 per small run and 8 per large run across each 65-second observation, including startup and the final forced refresh. No high-frequency resize storm was demonstrated. The large hidden run recorded 32.1 ms of widget script work; the other five long runs recorded 1.3-2.0 ms. That isolated increase warrants rechecking only if renderer work becomes a priority. Settings script duration was recorded as zero during the observed interval; do not interpret that as zero cost for opening Settings, which occurred before interval measurement.

Main working-set medians were about 107-109 MB for the small long runs and 338-344 MB for large ones. These are process observations, not evidence that all additional memory is retained Claude cache. The raw JSON retains maximums and other process categories. CPU invalid-sample counts are retained in the aggregate JSON.

### Ranked candidates and measurement budgets

1. **OpenCode synchronous query/materialization/aggregation, first implementation candidate.** Packaged runs recorded a median 567.5 ms inside each synchronous provider call (20 calls across initial/forced passes and two accounts, range 552.9-686.0 ms). This accounts for most of the approximately 1.1-second input delay with two accounts. Next compare the smallest SQL aggregation/materialization change against a worker only if needed. Preserve read-only access, v1/v2 fallback, duplicate precedence, totals and error behavior. Expected effort: medium, with focused SQL/fixture regression coverage. No implementation is included here.
2. **Claude history parsing/cache memory, investigate after OpenCode.** Large initial refresh medians are about 1.9 seconds and the main process uses more RAM with large histories. Async Claude elapsed times overlap blocking SQLite work, so they do not independently prove a Claude bottleneck. Profile standalone cold/warm reads and heap retention before selecting a change. Expected effort: medium.
3. **Startup variation, gather a trace before choosing a change.** The 13.3-second first packaged profiling launch is real in this dataset; its cause and reproducibility are unknown. Trace first and repeated launches of the actual release package before attributing it to module loading or menu setup. Expected effort: low for measurement, unknown for a fix.

For the next change, the primary budget is a repeated large-workload input delay below the current observed 1,109-1,157 ms range, with matching workload/build/method and improved event-loop maximums. Treat small-workload regressions beyond the observed 5.2-6.5 ms refresh and 3.7-4.2 ms input ranges as a reason to rerun and investigate. These are baseline-derived comparison guides, not flaky wall-clock test assertions or a promised speedup. Keep the large main working set within its observed packaged 346.6-350.3 MB range unless a measured responsiveness benefit justifies an explicitly reported tradeoff. Set stronger absolute user-facing targets after the first candidate experiment.

**Deferred:** renderer/resize suppression (little measured work), Settings-row rebuilds (no demonstrated stall), synchronous settings writes (not yet isolated), early menu disable (unmeasured), and bundling/module changes (no dependency-load evidence). Existing lazy SQLite/updater loading and local assets remain intact. No dependency removal, worker or bundler has been adopted.

## Validation and limitations

Validation completed on 2026-11-18:

- App tests: 198 total, 197 passed, 1 existing platform skip, no failures. All three profiling helper/fixture/report tests pass, including account totals, duplicate counting, missing/malformed input, invalid CPU samples, comparison math and incompatible metadata rejection.
- Landing-page Verify: passed check, formatting, tests and build.
- Real Electron checks: visibility/tray/always-on-top/movement passed; Settings/update IPC, retry and explicit install checks passed using the existing offline updater harness.
- Profiling smoke: the scripts/launch.js path completed successfully. Ten packaged repetitions, ten unpackaged repetitions and six longer scenario runs completed; all synthetic reading/token-total assertions passed. No runtime src/ files changed.
- Root npm run verify: lint passed; format:check failed on the two pre-existing untracked .playwright-mcp YAML files named in the active spec. They were left intact. The app and site checks above were run separately after the umbrella gate stopped. This feature is not marked fully verified or ready to land while the root gate fails.
- git diff --check passed. No commit, push, release or GitHub issue update was made.

First-after-reboot, installed NSIS startup, published portable-extractor startup, physical input latency and uninstrumented startup are unmeasured. No traces of personal sessions are collected. No optimization, worker, bundler, refresh-frequency change or dependency removal belongs to this baseline pass.

## User memory observation and next optimization goal

The user supplied a Task Manager screenshot showing approximately 75.8 MB across four Token Huddle processes (30.3, 22.2, 20.6 and 2.6 MB, rounded). This is a real-use observation supplied by the user, not a controlled benchmark. The Task Manager memory-column definition was not established from the screenshot, so it is not directly compared with the profiler working-set figures. The next optimization should reduce temporary allocations and, where measured, retained memory without a responsiveness or feature regression. No claim that the app needs hundreds of MB in normal use is supported by our synthetic-history baseline.
