# Feature: Automatic Claude token usage

**From build-plan:** feature 22a
**Build attempt:** 1
**Status:** verified
**Branch:** feature/automatic-claude-token-usage

## Goal

A fresh user sees recorded Claude token totals without connecting the status-line bridge. Keep subscription limits as an optional enhancement, with honest source and freshness labels.

## In scope

- Read local assistant usage metadata from Claude session JSONL, including nested subagent session files, under the selected account's projects folder.
- Show Today, 7 days and 30 days token totals automatically in full and compact views using existing stats patterns.
- Preserve existing bridge connections, quota windows, reset handling and alerts. Offer the connection as Enable subscription limits in onboarding and Settings.
- Update README and first-run explanations; add an Unreleased changelog entry during implementation.

## Out of scope

Credentials, vendor requests, launching Claude, automatic settings edits, cost estimates, quota estimates, historical storage, new dependencies, other providers and platform expansion. Do not promise coverage of an interface until verified.

## Build loop

Review this spec before implementation. Review the feature as a whole after its steps; checkpoint commits are disabled. Completion, commits and external actions require their existing authorization gates.

## Build steps

- [x] 1. Implement and test a local-session metadata reader.
  Read allowlisted session JSONL only, stream lines, discard message content immediately, and cache derived records per account and file metadata. Do not follow directory symlinks outside the selected projects tree. Re-read changed files and drop deleted files; handle a partially written trailing line without corrupting previous totals.
  Done when offline fixtures verify usage arithmetic, repeated records, changed files, deletion, subagents, account isolation, malformed and incomplete records, and date boundaries, and npm test passes.
- [x] 2. Integrate automatic totals with the Claude provider.
  Preserve the claude provider ID and saved cards. Respect options.home and the current default account path. Detect local session data without requiring a bridge. Return usable totals even if optional bridge setup is missing or conflicted. A bridge failure must not suppress valid local totals, and a local-file failure must not suppress valid quota windows.
  Done when tests cover fresh discovery, local-only mode, empty and unreadable sources, existing bridge regression cases and independent source freshness, and npm test passes.
- [x] 3. Expose automatic usage and optional limits clearly.
  Reuse existing stat presentation and design tokens. Show totals in both views; keep quota windows visible when connected. Explain that cached tokens are included and these are recorded tokens, not subscription consumption. Display local-record age separately from quota-snapshot age. Preserve keyboard access and safe text rendering.
  Done when demo screenshots show full, compact and Settings states with and without quota data, onboarding no longer implies Connect is needed for token totals, documentation and changelog agree, and npm run verify passes.
- [x] 4. Verify real interface coverage with the maintainer.
  Compare usage metadata before and after one short conversation in terminal Claude Code, VS Code and T3 Code where installed. Use metadata only; never copy raw conversation logs into the repo. Record tested versions and whether records appear; unsupported or unverified interfaces remain explicitly qualified.
  Done when available interfaces have observed evidence, unavailable interfaces are identified, totals change once per recorded API message, and the maintainer receives a short try guide.

- [x] 5. Repair independent findings F-29 and F-30.
  Reject explicitly supplied null counters, retain zero defaults for absent counters, cover malformed-source classification, and restore the four corrupted changelog strings. Done when focused reader tests and Verify pass.

- [x] 6. Repair independent finding F-31.
  Require usage to be an object excluding arrays. Treat explicitly supplied malformed containers as read failures, including falsy values. Preserve valid totals in mixed sources and zero defaults for absent fields in valid objects. Done when focused reader regressions and Verify pass.

## Files / areas

- src/main/providers/claude.js and a focused local-session reader in src/main/providers/.
- src/main/providers/index.js only if the existing provider contract needs clarification for automatic stats plus optional connection.
- src/main/instances.js normalization and src/renderer/ widget, Settings and guidance code where required by mixed stats and quota readings.
- test/claude.test.js, focused reader tests, sanitized fixtures and test/fixtures/README.md.
- README.md and CHANGELOG.md; update any landing-page setup claim that directly contradicts automatic Claude totals.

## Data / contracts

Input is assistant records with a valid timestamp, message.id and message.usage. Use requestId when present with message.id as the deduplication identity across files in one account; message.id alone is the fallback. Ignore records lacking a reliable identity rather than risk double counting. Repeated records for one identity are one API message; select the latest complete usage record, using deterministic file/line order for ties, rather than summing content blocks. Test that observed repeated records agree with this rule before shipping.

Total tokens = input_tokens + output_tokens + cache_creation_input_tokens + cache_read_input_tokens. Missing component fields count as zero; supplied values must be finite nonnegative integers. Do not add nested cache_creation, iterations or thinking details again. Invalid records are skipped. Future timestamps are excluded. Today begins at local midnight; 7 and 30 days are rolling windows ending at injected now, matching OpenCode. No activity in the window reports zero with an explicit no-activity message; unreadable or wholly malformed sources do not masquerade as zero activity.

Use existing stats [{ label, value }] and windows shapes. Token totals never produce usedPercent or quota threshold alerts. A single reading timestamp must not imply both sources are equally fresh: retain distinct local-record and quota-snapshot ages in the display using the smallest necessary contract extension. Preserve existing snapshot staleness and rollover semantics.

Persist no new settings or usage database. Cache only IDs, timestamps, numeric counters and file metadata in the context cache; do not retain prompts, responses, tool arguments or raw lines. Missing data gives an actionable instruction to run Claude; permission and parse failures give clear guidance without leaking file content. One provider failure remains isolated.

## Testing

Baseline npm run verify passed before planning: 180 app tests and 22 site tests, lint, formatting and site build. Existing Astro build emits a Shiki/CSP warning.

Use Node tests with temporary folders, explicit now and sanitized metadata fixtures. Cover duplicate content blocks, copies across files, subagent records, cache components, malformed counters, missing identity, empty data, truncated writes, file replacement, date rollover, account isolation and optional bridge behavior. Run the configured Verify gate after implementation. Capture Electron windows using the existing screenshot command, without installing a browser harness. Real interface coverage is a separate manual check and cannot be inferred from unit tests.

## Notes for the AI

Observed local records contain usage fields, timestamps, request IDs and message IDs; repeated records with identical usage were observed. Fixtures cover repeated records and latest complete metadata selection. The maintainer confirmed local token refresh in terminal Claude Code, the VS Code extension and T3 Code. These checks establish refresh behavior on this machine, not universal version compatibility or exact reconciliation of every counter. Do not read credential files or dump session content. No automatic changes to another tool's settings.


## Implementation evidence

Implemented on feature/automatic-claude-token-usage. Baseline and implementation verification passed; latest full gate records 190 passing app tests, one Windows symlink-creation test skipped, and 22 passing site tests. The existing Astro Shiki/CSP warning remains. Real local metadata read succeeded, without printing conversation content. Demo full, compact, Settings and local-only screenshots are in blueprint/reference/22a-*.png. Synthetic local-only screenshots temporarily replace demo quota fields through a temporary screenshot wrapper, not production behavior.

Manual acceptance: the maintainer confirmed Today increased after activity in terminal Claude Code, then separately in the VS Code extension with terminal idle, then in T3 Code using Claude with the other interfaces idle. All three local token refresh paths are confirmed on this machine. Interface versions were not captured, so no minimum-version or universal compatibility claim is made. Numeric deduplication and cache arithmetic are covered by offline tests; manual checks confirm refresh rather than exact token reconciliation.

Quota limitation: VS Code showed 19% session and 43% weekly while the widget retained the terminal snapshot at 18% and 42%, labelled 12 minutes old. This is expected for the optional bridge. Local token freshness is independent of quota freshness; VS Code and T3 Code do not gain live quota sync from this feature.

Application-code checkpoint: 0c3fb05ac475363f5cbd7e81cbeb17d9018c3027. No merge, push or publication has occurred. Independent review remains required because this reads user session data. This verification update changes only the tracked spec; the reviewer must use a checkpoint that includes these exact verified bytes.

## Review repair evidence

F-29: counter validation now distinguishes absent fields from explicit null. Tests cover all four null components, absent components, and null-only malformed sources. F-30: restored four original UTF-8 changelog strings and recorded the behavior fix under Unreleased. No new dependencies or UI changes. Focused reader tests passed (10 passed, one Windows symlink test skipped). The previous independent receipt targets ca7b0da and is stale after these repairs; a new approved checkpoint and full independent review are required. For this repair, the automatic try guide is skipped because the defensive validation has no safe public observation path without artificial session data.

F-31: reject primitive, array and null usage containers. Focused temporary-file regressions cover malformed-only errors, mixed-source stale totals, and valid empty usage objects. Focused reader suite passed (11 passed, one Windows symlink skip). Final npm run verify passed: 191 app tests and 22 site tests, one Windows symlink skip, lint, formatting, Astro check and build. Existing Shiki/CSP warning remains. The c07d823 independent receipt is stale after these repairs. No UI changes or dependencies; Check remains manual and the defensive repair has no safe direct public try-guide path.

## Try it now

Run or do:

Run `npm start` from the project folder. In Claude Code in a terminal, send one short message, wait for the response, then click Refresh in Token Huddle.

Expected:

The Claude card shows Today, 7 days and 30 days totals without enabling subscription limits. Today increases after a newly recorded API message. Existing quota windows remain available if the bridge is connected.

This proves:

The terminal session writes usage records the widget can detect and refresh. It does not establish VS Code or T3 Code coverage; repeat separately in each interface and report which ones update.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":11904,"specSha256":"c5e262f413e329d4dad1216dad5ec576a712016e5812c804a8a471955bac12e7","branch":"refs/heads/feature/automatic-claude-token-usage","head":"12d245e65352b6179f349b6460c05b5d2030ada9","baseRef":"refs/heads/main","baseCommit":"e3c5f9296eaf1fff8577f9db25cbb1c5d6d033b6","sourceTree":"8f49d4141ad5ff33172fce0e35b6e3276ff696dd","landing":"local-merge","absentOptional":[]} -->

## Findings

### 22a/F-29 [P2] closed - Null token counters are silently counted as zero

**File:** src/main/providers/claude-sessions.js:20
**Found:** 2026-11-17 by /audit (scope: current; lens: quality, tests; independent review)
**Why it matters:** The spec permits missing components but requires supplied values to be nonnegative integers. The nullish fallback also accepts explicit null. A synthetic assistant record with input_tokens: null and output_tokens: 5 returns tokens: 5 instead of being rejected, so malformed usage can be presented as a healthy partial total. Existing invalid-counter tests cover negative numbers and strings but miss null.
**Suggested fix:** Default only absent component fields to zero, reject explicit null, and add a regression assertion for malformed supplied counters.
**Resolution:** Closed by independent review on 2026-11-17 at c07d8234926485c0598edc31a332bfe657d211d9. Own-field presence checking preserves defaults only for absent counters; tests reject null in all four components and classify a null-counter-only source as error. Full Verify passed. The distinct malformed usage-container issue is recorded separately as F-31.

### 22a/F-30 [P3] closed - Changelog edits corrupt existing Unicode text

**File:** CHANGELOG.md:60
**Found:** 2026-11-17 by /audit (scope: current; lens: quality; independent review)
**Why it matters:** The committed delta introduces mojibake in four existing entries at lines 60, 64, 81 and 185. Those strings flow into release notes and visibly corrupt punctuation and quoted UI copy.
**Suggested fix:** Restore the original UTF-8 strings at those four locations without re-encoding the file.
**Resolution:** Closed by independent review on 2026-11-17 at c07d8234926485c0598edc31a332bfe657d211d9. Compared the complete CHANGELOG.md delta against the main merge base: the four original strings are unchanged from base, and only the intended six added lines remain. Full Verify passed.

### 22a/F-31 [P2] closed - Malformed usage containers become healthy zero totals

**File:** src/main/providers/claude-sessions.js:15
**Found:** 2026-11-17 by /audit (scope: current; lens: quality, tests; independent review)
**Why it matters:** The truthiness guard accepts boolean true, nonempty strings and arrays as message.usage. Object.hasOwn then treats all counters as absent and supplies four zero defaults. A synthetic assistant record with valid identity/timestamp and usage: true returns tokens: 0; a source containing only that record returns state: ok and "No activity in the last 30 days". This violates the spec's requirement that wholly malformed sources must not masquerade as zero activity. Current invalid-counter coverage does not test the usage container's type.
**Suggested fix:** Require message.usage to be a non-null object excluding arrays before defaulting absent counters. Add metadata and source-classification regressions for primitive and array containers, preserving valid object records with absent counters. No current requirement is lost.
**Resolution:** Closed by independent review on 2026-11-17 at 12d245e65352b6179f349b6460c05b5d2030ada9. Re-examined the complete feature delta and confirmed metadata rejects primitive, array and null usage containers before applying absent-field defaults. Explicitly supplied falsy containers flag malformed sources; valid records remain usable in mixed sources, and empty usage objects retain zero defaults. Independently ran the focused reader suite (11 passed, one Windows symlink skip) and npm run verify (191 app tests and 22 site tests passed, one Windows symlink skip). No new finding in the repair.

## Independent review

# Independent Review

**Status:** passed
**Target commit:** 12d245e65352b6179f349b6460c05b5d2030ada9
**Base commit:** e3c5f9296eaf1fff8577f9db25cbb1c5d6d033b6
**Base ref:** main
**Spec hash:** c5e262f413e329d4dad1216dad5ec576a712016e5812c804a8a471955bac12e7
**Prepared by:** codex
**Builder model:** gpt-6.1-sol
**Requested reviewer:** codex
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-11-16T21:42:11.469Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-11-16T21:44:16.260Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `git rev-parse HEAD`, `git merge-base main HEAD`, `git status --short`, and `Get-FileHash blueprint/context/current-feature.md -Algorithm SHA256`: passed; target, permitted base and exact spec hash match the request, with only review evidence dirty.
- `git diff e3c5f9296eaf1fff8577f9db25cbb1c5d6d033b6 HEAD -- src test README.md CHANGELOG.md blueprint/project-plan.md blueprint/build-plan.md blueprint/context/project-overview.md`: passed; inspected the complete feature delta and active spec, following normalization, collection, refresh, guidance and alert contracts as needed.
- `git diff --check e3c5f929 HEAD`: passed.
- `node scripts/test.js test/claude-sessions.test.js`: passed, 11 passed and one Windows symlink-creation test skipped.
- `npm run verify`: passed, lint, root formatting, 191 app tests, Astro check, site formatting, 22 site tests and static build; one app test skipped.

## Evidence

- Fresh isolated automatic Codex subagent received the project-local handoff without the builder conversation. Exact model identity is gpt-6.1-sol from authoritative parent runtime metadata and the native spawn contract's inherited model, with no override supplied.
- Reviewed all project-owned changes in the recorded base-to-target range across quality, security, performance and tests; excluded review/findings evidence from code scope, and dependencies, generated output and unrelated source from review scope.
- Session reading is restricted to projects-tree JSONL regular files, skips stable directory/file links, streams raw lines, caches only derived IDs/times/counts and file metadata per account, and adds no credential or network access. Inspected duplicate selection, cache invalidation, partial records, date windows, failure isolation and optional quota freshness.
- Inspected all five 22a screenshots in blueprint/reference: full and compact totals, quota ages, local-only presentation, onboarding and Settings. The full-settings capture predates the final button wording; current source uses Enable subscription limits. Safe text construction and existing keyboard/focus paths are preserved.
- F-31 repair independently confirmed and closed; F-29 and F-30 remain closed, with supplied null counters rejected and only intended changelog additions in the delta. Existing unrelated ledger entries were not accepted or closed.

## Findings

- None newly identified. F-31 closed by this pass.

## Remaining risk

- Windows does not permit creating the test symlink, so the file-link regression is skipped; link exclusion was inspected statically. No focused or placeholder tests found in the changed suite.
- Real terminal, VS Code and T3 Code refresh behavior relies on recorded maintainer observations in the verified spec; this review did not read real session content or repeat those manual conversations. Interface versions were not captured and universal compatibility is not claimed.
- No live Electron interaction was rerun; reviewed stored screenshot evidence and current renderer source. Check is not required by this request and no browser-test harness is declared.
- Existing Astro Shiki/CSP inline-style warning remains; build succeeds. No standalone security scanner or performance command is declared, and no current vulnerability scan or runtime performance measurement is claimed.
