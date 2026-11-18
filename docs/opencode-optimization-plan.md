# Approved scope revision: OpenCode refresh and memory

Approved by the user on 2026-11-18. This revision extends our current work item on feature/performance-baseline-and-comparison-report, retaining feature 24's baseline, report and verification requirements. It does not replace or archive the active spec. Approval of this revision authorizes the local implementation below; it does not authorize commits, merges, pushes or publication.

## Goal

Reduce OpenCode refresh blocking and temporary memory use without sacrificing responsiveness, data accuracy, freshness or app features. The user's Task Manager screenshot shows approximately 75.8 MB for the four-process app group. Treat that as a user observation, not as the synthetic benchmark's memory baseline. No promised RAM target is set.

## Prerequisite repair

Format only the two pre-existing generated YAML files reported by Verify:

- .playwright-mcp/page-2026-11-18T06-34-14-290Z.yml
- .playwright-mcp/page-2026-11-18T06-36-03-231Z.yml

Preserve their content and untracked status. Do not delete them, stage them, add ignore rules to waive the check, or change any other generated artifacts. Rerun Verify. This is an explicit revision to the earlier instruction to leave these two files untouched.

## Implementation

1. Add meaningful OpenCode regression cases before changing the query: only v1 table, only v2 table, both tables, conflicting duplicate IDs (v2 wins only when it is eligible), non-assistant and expired duplicates, missing fields, costs, latest-model selection including equal timestamps, empty/error cases and exact rolling/local-day boundaries. Preserve current behavior on unsupported or failing tables. Keep read-only access and independent accounts.
2. Evaluate moving deduplication and summary aggregation into SQLite to avoid exporting whole 30-day row sets into JavaScript arrays and Maps. Return only the totals, seven daily buckets and latest model needed by the existing reading contract. Preserve fallback independently for each table, including malformed data behavior. Keep the smallest candidate only if measured evidence supports it; a failed experiment is reverted. Do not add a worker, cache, dependency or database write in this pass.
3. Create a fresh packaged profiling snapshot and repeat the same small/large workloads, five independent full-view runs each, plus longer compact/Settings/hidden automatic-refresh observations. Retain the original baseline unchanged. Collect latency, event-loop delay, CPU, main/renderer working set and available private-memory measurements using the same definitions on both sides. Reuse the existing fixtures and measurement method; if instrumentation must change, collect a matched before run with that method before making comparisons.
4. Update docs/performance-report.md with before, after, absolute and percentage changes and variability. Separate process working set, process-private memory and the user's grouped Task Manager observation. Report unchanged or worse metrics candidly. Do not equate synthetic-history memory savings with a guaranteed reduction in the user's approximately 75 MB real-data app group.
5. Add an Unreleased changelog entry. Run npm run verify, focused provider tests and the existing real Electron visibility/update checks. Preserve all UI, alerts, hidden-widget refreshes, account separation, totals and error behavior.

## Acceptance and decision

Large-workload refresh and input blocking must improve beyond the observed baseline variation. Small-workload responsiveness and CPU/memory must show no repeatable regression; investigate variation with matched repeat runs rather than adding timing assertions to unit tests. Retain the candidate only when data equivalence and the performance/resource comparison support it. If SQL work cannot deliver useful improvement safely, report that result and propose the next approach separately.

No renderer redesign, refresh-frequency change, memory trimming, forced garbage collection, telemetry, real provider data, credential access, network calls, packaging migration or release is included.

## Implementation decision after independent review

SQL aggregation was evaluated and discarded: preserving source conversion failures required validation that regressed refresh latency. The smaller native SQLite row-array implementation retains the original queries and JavaScript aggregation, addresses the same memory/refresh goal, and preserves table failure before duplicate replacement. It adds no worker, cache, dependency or external contract. Fresh comparisons and independent re-review are required for this replacement.
