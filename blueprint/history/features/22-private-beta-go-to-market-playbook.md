# Feature: Private beta + go-to-market playbook

**From build-plan:** feature 22
**Status:** verified
**Build attempt:** 1
**Branch:** feature/private-beta-go-to-market-playbook

## Goal

Prepare a one-week private Windows beta and a reviewable playbook for a later
free public launch. Keep the repository private throughout this work.

## In scope

- A maintainer beta checklist and tester guide in `docs/private-beta.md`.
- A seven-day testing schedule, voluntary feedback prompts and beta exit review.
- A launch playbook in `docs/go-to-market.md`: sample-data demo storyboard,
  channel-specific draft posts and deferred launch checklist.
- Record optional email/telemetry and $19 Pro as later proposals with decision
  gates, preserving the current beta/v1 privacy contract.

## Out of scope

- Running or claiming completion of the testing week; inviting or messaging users.
- History rewrite, commit-email changes, repository visibility, publishing,
  tagging, donation integration, deployments or posting launch messages.
- Email collection, analytics, payment integration, license keys, new providers,
  burn-rate warnings or spend reports. No app or landing-page behavior changes.
- Producing a recording in this documentation pass; prepare a 15-second
  storyboard and capture instructions using demo mode, never personal readings.

## Build loop

Implement after spec review. Review the whole feature once; no checkpoint
commits. Completion uses the configured Verify gate and the separate completion
workflow. External actions require the maintainer's explicit instruction.

## Build steps

- [x] 1. Write private-beta instructions using the existing Windows packaging,
  README and code-signing guidance. Explain manual distribution of installer,
  portable executable and SHA-256 checksums; private releases cannot supply
  automatic updates. Tell testers to turn off "Check for updates" and obtain
  replacement builds manually. Include install/uninstall, Claude Connect and
  Disconnect, source/freshness limitations, missing tools and reporting failures.
  **Done when:** a tester can follow the guide without repository access or
  credentials; commands and limitations match README, `package.json`,
  `docs/code-signing.md` and `.github/workflows/release.yml`.
- [x] 2. Add a one-week schedule: onboarding on day 1, normal usage during the
  week, midpoint feedback and a day-7 review. Ask about installation, provider
  accuracy, stale/missing readings, alerts, usability and continued use; rank
  Cursor/Windsurf support, burn-rate warnings and weekly spend reports. Include
  a bug-report template requesting version, Windows version and reproduction,
  with instructions to redact personal paths, usage and account details. Do
  not request credential files or raw tool logs. Dates and participant details
  are filled by the maintainer outside tracked docs.
  **Done when:** the guide distinguishes observed results from pending testing,
  includes an empty review checklist, and treats unresolved blockers as a reason
  to extend beta rather than automatically launch after seven days.
- [x] 3. Draft the free-v1 launch playbook: a crisp 15-second demo-mode recording
  storyboard and draft copy for GitHub, r/ClaudeAI, r/LocalLLaMA and X. Add the
  deferred checklist for safe history cleanup, optional noreply commit email,
  private vulnerability reporting, a chosen donation link, making the repo
  public and publishing `v0.1.0` through 19a. Flag community posting rules for
  rechecking at launch. Preserve the original privacy/history requirements.
  **Done when:** all four channels have reviewable drafts and publication is
  explicitly pending a post-beta decision; no external action has been taken.
- [x] 4. Document later growth decisions: voluntary feedback now; optional email
  signup/opt-in telemetry only after a separate consent, hosting, retention and
  privacy spec. Revisit $19 one-time Pro after 500-1,000 active weekly users;
  Dodo Payments and Polar license keys remain candidates. Define the active-user
  measurement method and paid scope in later work; downloads/signups do not
  establish active weekly users. Link both guides from README.
  **Done when:** no current analytics/payment capability is implied, free v1
  remains free, links resolve, and `npm run verify` passes.

- [x] 5. Repair F-29 by including custom status-line setup and signing guidance
  directly in the tester guide, without depending on private-repository links.
  **Done when:** the tester sections contain complete setup/removal guidance and
  no links to documents absent from the beta handoff.
- [x] 6. Repair F-30 by restoring `500-1,000` across the authored planning packet
  and refreshing the overview and fingerprint from the corrected plans.
  **Done when:** the plans, spec, overview and playbook agree on the range,
  the overview fingerprint matches, and `npm run verify` passes.

## Files / areas

- New: `docs/private-beta.md`, `docs/go-to-market.md`.
- README: links to the guides only.
- Reference: `docs/code-signing.md`, `.github/workflows/release.yml`,
  `package.json`, `scripts/screenshot.js` and existing privacy instructions.
- Planning: `blueprint/project-plan.md`, `blueprint/build-plan.md` and the
  generated overview now reflect the private-beta-first sequence.

## Data / contracts

Documentation only: no new settings, network requests, accounts, storage or
services. The app reads no credentials and makes only the existing optional
GitHub update checks. Feedback is voluntary and handled by the maintainer;
no participant contact details or personal readings belong in tracked docs.

## Testing

- Run `npm run verify`; review Markdown links and command accuracy manually.
- No new automated tests for documentation. No browser harness or server needed.
- Baseline verification passed during planning: 166 app tests, 22 site tests,
  lint, formatting, Astro check and build. Beta outcomes and launch results remain unverified until run.

## Notes for the AI

Preserve Feature ID 22 despite its new title. Do not implement future growth
features or weaken the no-telemetry/update-only network rules. This spec prepares
materials; the maintainer runs the beta and later authorizes public launch.
A documentation-only change needs no behavior changelog entry. Add an Unreleased
entry if implementation expands into an approved behavior change.

## Verification result

Status: verified. `npm run verify` passed: lint, format check, 166 app tests,
Astro check (zero errors/warnings), 22 site tests and static build. Local
Markdown link targets exist; `git diff --check` passed. Astro build retains its
existing Shiki/CSP warning. No beta sessions or launch actions were performed.

Check passed before these repairs. Audit recorded F-29 and F-30; repairs need
re-review. Independent review is not selected:
this change is documentation only and adds no data collection, payments, external
side effects or security-boundary changes. Try guide skipped for documentation-only
work. Existing findings contain no P0/P1 blockers; unrelated findings remain as-is.

Repair verification: F-29/F-30 focused checks passed; tester instructions are
self-contained, the active-user range agrees across five documents, and the
overview fingerprint matches. `npm run verify` passed after repairs (166 app
tests, 22 site tests, lint, format check, Astro check and build). `git diff --check`
passed. F-29/F-30 are fixed pending audit re-review. No runtime behavior changed;
Try guide remains skipped for documentation-only work.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":7705,"specSha256":"043d27bc0226511dc8abc50b1bf37aafa17735d475c6f4ca0df9da76c670bab4","branch":"refs/heads/feature/private-beta-go-to-market-playbook","head":"8d49411b30543f762d028599d09074786fe55bad","baseRef":"refs/heads/main","baseCommit":"8d49411b30543f762d028599d09074786fe55bad","sourceTree":"1e7fb7cf2987a8d040dac5b86ac7da62c61b719b","landing":"local-merge","absentOptional":[]} -->

## Findings

### 22/F-29 [P2] closed - Private beta handoff omits linked tester instructions

**File:** docs/private-beta.md:15
**Found:** 2026-11-16 by /audit (scope: current; lens: quality)
**Why it matters:** The handoff lists the executables, this guide and SHA256SUMS.txt, while promising testers need no repository access. The guide links to code-signing.md at line 55 and ../README.md#if-you-already-have-your-own-status-line at line 73. Neither document is included in the listed handoff. A tester receiving only the listed files cannot follow those links; in particular, the custom Claude status-line setup instructions are unavailable while the repository is private. The earlier local-link check proved repository existence only, not accessibility in the distributed beta packet.
**Suggested fix:** Include the needed setup instructions directly in the tester guide, or explicitly package the linked documents with the required relative folder layout. Keep distribution limited to reviewed documentation and binaries, without sharing source history. No current requirement is lost.
**Resolution:** Implemented 2026-11-16: signing guidance and full custom status-line setup/unlinking instructions are inline. A focused check confirmed the tester sections contain no external document links. Re-reviewed 2026-11-16 by /audit current: the full tester sections include signing, custom-command setup and unlinking without document links; compared with README guidance, with no new repair defect found. Closed.

### 22/F-30 [P3] closed - Pro active-user range is corrupted in the planning packet

**File:** blueprint/build-plan.md:117
**Found:** 2026-11-16 by /audit (scope: current; lens: quality)
**Why it matters:** The saved files contain the literal text 500?1,000 rather than the approved 500-1,000 active weekly users. The same corruption appears in blueprint/project-plan.md:125, blueprint/context/current-feature.md:70 and blueprint/context/project-overview.md:152. The launch playbook has the correct range, but the durable planning packet has an ambiguous decision gate.
**Suggested fix:** Restore the ASCII range 500-1,000 in the authored plans and active spec, then refresh the generated overview and source fingerprint from the corrected plans. No current requirement is lost.
**Resolution:** Implemented 2026-11-16: restored ASCII 500-1,000 in plans, active spec and generated overview, and refreshed the source hash. A focused check confirmed agreement with the playbook and a matching fingerprint. Re-reviewed 2026-11-16 by /audit current: all five documents use 500-1,000 and the overview fingerprint matches the saved plans; no new repair defect found. Closed.
