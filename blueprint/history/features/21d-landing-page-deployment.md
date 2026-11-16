# Feature: Landing page deployment

**From build-plan:** feature 21d
**Build attempt:** 1
**Status:** verified
**Branch:** feature/landing-page-deployment

## Goal

Serve the existing static landing page over HTTPS at
`tokenhuddle.arkaslittlemind.com` using Cloudflare Pages, selected by the
maintainer during spec preparation.

## In scope

- Configure a free Cloudflare Pages project for the existing repository and static output.
- Document a repeatable deployment and rollback procedure, including custom-domain setup.
- Verify the deployed assets, page security policy and existing download behavior.
- Update the overview's undecided-host note and add the behavior change under
  `[Unreleased]` in `CHANGELOG.md`.

## Out of scope

- Redesign, new site features, analytics, Pages Functions, server rendering or paid services.
- Making the repository public, publishing releases, donations and launch work (22).
- Desktop app behavior changes or reading any AI tool's credentials.

## Build loop

Review the whole feature after the steps are implemented (`stepReview: feature`).
Checkpoint commits are disabled; `/complete` creates the final feature commit.
Prepare local configuration and exact external settings for review before asking
for deployment approval. Commits, pushes and publication require the maintainer's
instruction. Spec approval alone does not authorize external publication or DNS changes.

## Build steps

- [x] 1. Prepare and document the Pages deployment settings.
  Use the existing static Astro output without an adapter or new runtime dependency.
  Prefer Pages' native Git integration with production branch `main`. Keep the build
  root at the repository root because `site/astro.config.ts` imports assets from
  `src/renderer`. Use `npm ci --prefix site && npm --prefix site run verify` as the
  build command and `site/dist` as the output directory. Pin a supported Node
  version at least 22.23.4 in the host settings. Confirm repository access and
  account availability without publishing source or requesting AI tool credentials.
  Document these exact settings, redeployment, failed-build diagnosis and rollback
  in `docs/site-deployment.md`; link it from README. Update the overview and changelog.
  Done when: the documented build succeeds locally, `npm run verify` passes, and
  the maintainer can review the exact Pages configuration and domain change.

- [x] 2. Deploy the reviewed site after publication approval.
  Create/configure the Pages project only in the intended maintainer account.
  Confirm the deploy source includes the reviewed work; do not push or merge as
  an incidental prerequisite. Check the Pages URL before domain cutover. If access
  is denied, a build fails or configuration is missing, report the concrete blocker
  and leave the existing domain intact. Record deployment URL, source revision and
  observed result without secrets.
  Done when: the reviewed static page and its assets are served over HTTPS from
  the Pages deployment and a failed deploy has a documented recovery path.

- [x] 3. Connect and verify the custom subdomain after DNS approval.
  First identify the authoritative DNS provider and inspect only relevant existing
  records. Add the custom domain through Pages before setting its required DNS
  target; preserve unrelated records and do not migrate the parent zone. If an
  existing record conflicts, present the exact replacement for approval. Confirm
  certificate issuance and DNS resolution before recording success. Check desktop
  and phone layouts, fonts, photo, marks, hero motion and reduced-motion behavior;
  check that the built CSP survives hosting and scripts/assets run without CSP
  failures. Check existing latest-release loading, success and unavailable/error
  behavior without publishing a release or adding a token to the browser. Record
  what cannot yet be verified while the repository has no public release.
  Done when: `https://tokenhuddle.arkaslittlemind.com` serves the reviewed page with
  valid HTTPS, local assets load, download fallback works when release lookup is
  unavailable, and live observations plus rollback instructions are documented.

## Files / areas

- `docs/site-deployment.md` (new), `README.md`, `CHANGELOG.md`.
- `blueprint/context/project-overview.md`: selected host and deployment instructions.
- `site/astro.config.ts`, `site/package.json`, `site/package-lock.json` and
  `site/dist/`: existing configuration, reproducible install and generated output.
- Cloudflare Pages project settings and the single custom-subdomain DNS record.
  Generated output remains untracked; do not commit it.

## Data / contracts

- Public canonical origin remains `https://tokenhuddle.arkaslittlemind.com`.
- Static files only; preserve bundled fonts/brand assets and Astro's generated
  hash-based meta CSP, including the existing GitHub API connection allowance.
- Preserve the existing download contract and fallback. Deployment must not depend
  on a public release existing before step 22 or expose repository credentials.
- Cloudflare/GitHub hosting authorization belongs to deployment administration;
  never place secrets in source, public assets, logs or the client bundle.
- Record host-assigned project URL and actual DNS target after creation, not guessed
  identifiers. Keep a record of the previous relevant DNS value for rollback.

## Testing

Implementation progress: local preparation is complete on
`feature/landing-page-deployment`. The documented clean site install and site
Verify passed, followed by `npm run verify` (166 app tests, 22 site tests,
formatting, lint, Astro check and static build). The existing Shiki/CSP warning
remains. GitHub CLI confirmed administrator access to the private repository;
the Cloudflare connection is authenticated. Pages account and native Git integration were subsequently confirmed. Initial
DNS preflight showed Cloudflare nameservers and NXDOMAIN for the subdomain. Exact settings and recovery steps
are in `docs/site-deployment.md`.

Publication was explicitly approved on 2026-11-16. OAuth reconnection restored
Pages Write, Zone Read and DNS Write access. Created Pages project `token-huddle`
in the active domain's account, using the documented native Git integration,
production `main`, disabled previews and the two build environment variables.
Deployment `e44bf72d-8d5c-4720-be4e-400d74272a1c` cloned reviewed main SHA
`176ff0cbd33a71828b32d9d1916028f3be09a591`, then failed Astro checks with seven
missing Node type errors. The local root dependency tree had masked the site's
missing direct `@types/node` development dependency. Added that dependency to
`site/package.json` and its lockfile; root Verify passed (166 app tests, 22 site tests), and isolated site Verify
passed with no root dependencies installed. The existing Shiki/CSP warning
remains.
With maintainer approval, committed dependency fix and changelog entry as
`f6874164b83518eb4fb711ff7c33d0ce86a74649`, fast-forwarded main and pushed.
Production deployment `f97203b7-fbca-4d29-bbbf-215931f6bfd2` succeeded.
Pages URL returns HTTPS 200; CSS, favicon, photo and three fonts return 200.
CSP meta is present and the served inline module hash matches its policy.
Original release-page download links are present. Browser evidence follows below.
DNS cutover was explicitly approved and completed on 2026-11-16. Confirmed no
existing record, added Pages custom domain `tokenhuddle.arkaslittlemind.com`, then
created CNAME targeting `token-huddle.pages.dev`, automatic TTL. Record ID:
`3d4edaaf763c3cd280222407f22ace9e`. Domain ID:
`3ab01b8b-c81c-45fb-b549-03f0ab7036c1`. Changed only that record to DNS-only after
initial proxied responses injected zone analytics/challenge scripts blocked by
the site's CSP. Subsequent custom-domain HTML has only the original inline
module, with a matching CSP hash; no zone-wide settings were changed.
Pages domain, verification and validation are active. Custom-domain HTTPS returns
200 with a trusted certificate; CSS, favicon, photo and three fonts return 200.
Public DNS resolves; local negative DNS caching initially required an explicit
public DNS lookup for HTTPS checks (certificate verification remained enabled).
Browser acceptance passed at 1280 x 800 and 390 x 844 CSS viewports: no page
horizontal overflow, loaded images/fonts, FAQ opens and marquee Pause/Resume
updates aria-pressed and animation state. Hero reaches 74% warning and 93%
critical. Live no-release state points downloads at the repo. Page-local
simulated 200 release data, replaying the exact served module, updated all three
installer links, chip, note and portable/release links. Simulated network
rejection retained initial releases/latest targets. No CSP violations observed
during these simulations; no release published or executable downloaded.
Page-local reduced-motion simulation enabled the existing CSS media rules and
provided a matching media-query result: zero animations, hidden marquee toggle,
static hero, no overflow. This is not an OS preference or real-device test.
Final `npm run verify` passed after restoring LF line endings in the changelog:
lint, formatting, all 166 app tests, Astro check, 22 site tests and static build.
The two intermediate release-note test failures were caused by a documentation
edit writing CRLF; targeted tests and final Verify passed after restoring LF.
Independent review remains pending against the approved documentation/evidence
checkpoint. All implementation steps and final verification are complete.

Baseline `npm run verify` passed during spec preparation: lint, formatting,
166 Node tests, Astro check (zero diagnostics), 22 Vitest tests and static build.
Astro emitted a Shiki inline-style/CSP compatibility warning; do not weaken CSP to
silence it. Check actual hosted behavior and report any observed violation.

Run `npm run verify` for local changes. No new logic tests are needed for settings
and deployment documentation; if implementation adds logic, add focused tests in
its existing runner. No Browser tests command is configured; do not install one.
Live HTTPS, DNS, visual and download checks are implementation evidence, not claims
established by the local build. Keep external verification separate from offline tests.

## Notes for the AI

Use the smallest static deployment. No new CI workflow is needed when native Pages
Git integration suffices. Confirm provider settings against current official docs:
[Astro on Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/)
and [custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/).
DNS ownership is an implementation preflight, not permission to alter the parent
zone. If native repository integration is unavailable, stop for the deployment
method decision rather than silently adding a token-based pipeline.

History lookup found no archived spec for feature 21d. The archive destination is
`blueprint/history/features/21d-landing-page-deployment.md`; its leaf was absent
and parents were ordinary directories. The branch name is valid and has no local
namespace collision. Freeze this identity for implementation and completion.

## Try it now

Run or do:

Open https://tokenhuddle.arkaslittlemind.com and expand a FAQ question.

Expected:

The page opens over HTTPS without a certificate warning, the answer expands,
and the download note says the first release is coming soon.

This proves:

The deployed custom origin and its basic page interaction are reachable.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":11541,"specSha256":"f2aacacbbf8ed3f4830b667be8507e7dc5938808f952b7313db392d8da9be7a5","branch":"refs/heads/feature/landing-page-deployment","head":"4b8352e5ee5a0178327a735fbb40c5c9c510e451","baseRef":"refs/heads/main","baseCommit":"f6874164b83518eb4fb711ff7c33d0ce86a74649","sourceTree":"4eebf19d19b3a90a0764fc570c51cd0ce88ba8f2","landing":"local-merge","absentOptional":[]} -->

## Findings

### 21d/F-26 [P3] closed - The release state of the Download wiring is not exercised by any test or browser run

**File:** site/src/scripts/download-client.ts:24
**Found:** 2026-11-15 by /audit (scope: current; lens: quality, security, performance, tests; independent review)
**Why it matters:** download.test.ts covers pickDownload, but nothing runs apply() for a `release` pick: rewriting all three data-download links to the installer, the chip text, un-hiding the portable and release-page links and data-release-extra, and the live note. The implementation record saw only the `none` path in the browser, so the path visitors get from v0.1.0 onward ships unseen until step 22. `apply` is exported but has no caller outside the file.
**Suggested fix:** In the existing Playwright MCP pass against `astro preview`, route `https://api.github.com/repos/arkaslittlemind/token-huddle/releases/latest` to a 200 sample release (the body from download.test.ts) and record the link targets, chip, extra links and note; repeat with an aborted route for `fallback`. No new dependency and no requirement is lost.
**Resolution:** 2026-11-16: Browser acceptance against the deployed custom origin replayed the exact served CSP-hashed module with simulated release data. All three installer targets, version chip, Windows note, portable visibility/target and release-page target passed. A simulated network rejection retained initial fallback links. No CSP violation was observed. Evidence: docs/site-deployment.md, Browser acceptance. Closed by independent audit on 2026-11-16: inspected download-client.ts, its page integration and pickDownload tests against the recorded successful-release and network-rejection browser observations. The previously missing browser exercise is now documented, including all installer links, chip, note and extra links. This reviewer inspected the reported evidence and code; did not rerun the external browser simulation.


## Independent review

# Independent Review

**Status:** passed
**Target commit:** 4b8352e5ee5a0178327a735fbb40c5c9c510e451
**Base commit:** f6874164b83518eb4fb711ff7c33d0ce86a74649
**Base ref:** origin/main
**Spec hash:** f2aacacbbf8ed3f4830b667be8507e7dc5938808f952b7313db392d8da9be7a5
**Prepared by:** codex
**Builder model:** gpt-6.1-sol
**Requested reviewer:** codex
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-11-16T11:50:30.393697+00:00
**Workflow:** regular
**Check required:** no

**Reviewer adapter:** codex
**Reviewer model:** gpt-6.1-sol
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-11-16T11:52:35.335Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `git rev-parse HEAD`: pass; equals the recorded target.
- `git symbolic-ref refs/remotes/origin/HEAD` and `git merge-base origin/main HEAD`: pass; origin/main is the recorded remote default and the merge base equals the recorded base.
- `Get-FileHash blueprint/context/current-feature.md -Algorithm SHA256`: pass; exact spec bytes match the recorded hash. The spec is tracked; no snapshot field is present or needed.
- `git status --porcelain=v1 --untracked-files=all`: pass; only permitted review evidence differs from the target.
- `git diff --check f6874164b83518eb4fb711ff7c33d0ce86a74649 HEAD`: pass.
- `npm run verify`: pass; lint, both formatting checks, 166 app tests (zero skipped), Astro checks (zero diagnostics), 22 site tests and static build.
- Targeted source/test searches: pass; no skipped, focused or placeholder site tests found.

## Evidence

- Reviewed the complete six-file base-to-target delta and the whole verified feature 21d spec: deployment guide, README, changelog, overview and spec changes; findings/review records were evidence rather than product code scope.
- Inspected nearby contracts in site/package.json, site/astro.config.ts, site/src/pages/index.astro, download-client.ts, lib/download.ts and its tests, hero-client.ts, marquee-client.ts and reduced-motion CSS. Confirmed the documented build command/output, local asset reuse, static output, canonical origin, CSP and token-free release fallback agree with the existing implementation. No product logic or runtime dependency changes occur in this review range.
- Reviewed docs/site-deployment.md's production SHA/deployment IDs, prior DNS absence, DNS-only CNAME, HTTPS/CSP/assets observations, desktop/phone viewport results and simulated release/reduced-motion evidence as reported observations. No external action was taken by the reviewer.
- F-26 closed after reviewing the documented browser exercise against the relevant code and contracts; F-28 added. Other carried findings are outside this feature's changed behavior and retain their statuses.
- Runtime model identity is gpt-6.1-sol from parent runtime metadata supplied to this fresh reviewer and the native spawn's inherited default; no model override was selected. The reviewer received the project handoff without the builder transcript.
- Applied project rules on no tool credentials, changelog entries, proportional engineering, explicit deployment approval, static hosting, bundled assets, strict CSP and simulation disclosure. Generated site/dist and dependency trees were excluded from source review. No dedicated security or performance command is declared; no new runtime work is introduced by this delta.

## Findings

- F-28 [P3] open: README.md:144 inaccurately says publication and DNS cutover are pending. Nonblocking documentation correction.
- F-26 [P3] closed: previously missing successful-release browser exercise is now documented; code and reported observations reviewed.
- No new P0 or P1 finding. Existing unrelated ledger findings retain their statuses.

## Remaining risk

- Hosted settings, DNS, TLS and live browser observations were inspected as implementation reports and were not independently rerun; external verification/actions were excluded by the handoff. Local Verify does not establish current deployed state.
- No Browser tests command is configured. Reduced-motion evidence uses page-local simulation and phone checks use a CSS viewport; neither proves OS-preference or real-device behavior. Release success uses simulated data because no public release exists.
- The reported transient Firefox nssBadCert could not be reproduced by the builder's subsequent TLS checks; its exact Firefox detail was not captured.
- Existing Astro Shiki/CSP build warning persists; this review did not weaken CSP or observe an additional local build failure.
- The clean isolated-site install is reported implementation evidence; this review ran Verify against existing dependencies and performed no installation.
