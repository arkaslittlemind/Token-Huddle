# Fix: Correct README landing page deployment status

**Type:** Fix
**Status:** verified
**Branch:** fix/correct-readme-deployment-status
**Fixes:** F-28

## The problem

`README.md` lines 146-150 (section "Landing page deployment") say the site is
"prepared for Cloudflare Pages" and that "Publication and DNS cutover are
pending". Build step 21d is done: the site is deployed, the custom domain
`tokenhuddle.arkaslittlemind.com` is active, and `docs/site-deployment.md`
(Deployment record, Browser acceptance 2026-11-16) and `CHANGELOG.md` say so.
The README, the main project entry point, contradicts them.

## The fix

Rewrite the two README sentences to say the site is deployed on Cloudflare
Pages at `tokenhuddle.arkaslittlemind.com`, and keep the existing link to
`docs/site-deployment.md` for settings, DNS setup, deployment record and
rollback. Do not touch other README sections or `docs/site-deployment.md`.
No `CHANGELOG.md` line: documentation correction only, no behaviour change.

## Build steps

1. [x] **Update the README section** - replace the "prepared for" and
   "pending" wording with the deployed status and the link to the deployment
   record. Done when the section no longer mentions pending publication or DNS
   cutover and matches `docs/site-deployment.md`.

## Verify

- `grep -n -i "pending\|cutover" README.md` returns nothing about the site.
- The linked `docs/site-deployment.md` path resolves.
- `npm run verify` passes (Prettier covers the README).


<!-- blueprint:completion {"schemaVersion":2,"specBytes":1487,"specSha256":"5e5be0e738970ec90e1467ee54618aea3a67343e7cb607ca77206e358dc338ef","branch":"refs/heads/fix/correct-readme-deployment-status","head":"f787f25f5677e2640b9042b1d20ade317ec65ef8","baseRef":"refs/heads/main","baseCommit":"23165c2b093664b0f4df9e4125922299d088205d","sourceTree":"ab93211f830522e8d52f2fdf98c85e5b002200d2","landing":"local-merge","absentOptional":[]} -->

## Findings

### correct-readme-deployment-status/F-28 [P3] closed - README still says publication and DNS cutover are pending

**File:** README.md:144
**Found:** 2026-11-16 by /audit (scope: current; lens: quality; independent review)
**Why it matters:** The new deployment section says publication and DNS cutover are pending, while CHANGELOG.md, the active spec, the overview and docs/site-deployment.md all record the successful production deployment and active custom domain. Readers following the main project entry point get contradictory deployment status.
**Suggested fix:** Update the two README sentences to state the site is deployed and link the existing settings, deployment evidence and rollback guide. No current requirement is lost.
**Resolution:** Fixed on 2026-11-17: the README Landing page deployment section now says the site is deployed on Cloudflare Pages with the custom domain active, and links the deployment record. `npm run verify` passed. Closed 2026-11-17 by /audit (scope: current; all lenses): re-read README.md:146-149 against docs/site-deployment.md (Deployment record: custom domain active, HTTPS 200, browser acceptance passed). The stale pending wording is gone, the link resolves, and the repair introduced no new defect.

## Try it now

No safe direct observation: this is a documentation-only change. Read the "Landing page deployment" section of `README.md` and compare it with `docs/site-deployment.md`.
