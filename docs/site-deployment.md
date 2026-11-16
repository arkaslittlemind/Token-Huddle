# Landing page deployment

## Public repository migration (2026-11-17)

The development repository was renamed to `arkaslittlemind/token-huddle-private`
and archived privately. The public repository `arkaslittlemind/token-huddle`
starts at the reviewed release snapshot `3bb1c2914c696f48e646378bad7e1cf499201020`.
The local `main` branch now tracks the public repository through `origin`.
The private archive is retained as the `private-archive` remote.

Cloudflare kept the old repository ID when its project source was patched.
A new Git-connected Pages project, `token-huddle-public`, therefore replaces
`token-huddle` for production. It uses the same build settings below and the
public repository ID `1460652770`; previews remain disabled. Its first deployment,
`0e1ef7f7-bbcf-4122-a85b-d31022329775`, passed and serves the reviewed snapshot.
Automatic production deployments on the old project are disabled.

The custom domain remains `tokenhuddle.arkaslittlemind.com`. Its CNAME now targets
`token-huddle-public.pages.dev`, still DNS-only with automatic TTL. Domain
verification and validation are active. The custom origin returns HTTPS 200,
contains five direct-installer links and retains its CSP with no remote scripts.
The permanent installer URL returns HTTP 200 after redirects, with
`Content-Disposition: attachment; filename=Token-Huddle-Setup.exe` and the expected
121,966,398-byte content length. Anonymous GitHub release lookup returns `v0.1.0`.

The original deployment record below is historical and describes the private
repository deployment before this migration.

The Cloudflare Pages project `token-huddle` is configured with native GitHub
integration. Its first deployment failed Astro checks because the site did not
declare `@types/node`; the dependency fix was committed and pushed to `main` as
`f6874164b83518eb4fb711ff7c33d0ce86a74649` with maintainer approval.
Production deployment `f97203b7-fbca-4d29-bbbf-215931f6bfd2` succeeded.
`https://token-huddle.pages.dev` returns HTTPS 200. CSS, favicon, valley photo
and all three font files return 200. The generated CSP meta policy is present
and the served inline module matches its declared SHA-256 hash. Original
release-page download links are present. Browser visual/interaction checks are recorded below.
Root Verify passed (166 app tests and 22 site tests). An isolated clean site
install and Verify also passed with no root dependencies installed.
DNS cutover was explicitly approved and completed on 2026-11-16. Added the
Pages custom domain, then created CNAME `tokenhuddle.arkaslittlemind.com` targeting
`token-huddle.pages.dev` (automatic TTL). There was no prior record. The record
uses DNS-only mode: the initial proxied mode injected zone analytics and
challenge scripts outside the site's CSP; DNS-only removed those injections
without changing global zone settings or weakening the site's CSP. Pages remains
the Cloudflare-hosted HTTPS endpoint.

Pages reports domain, verification and validation all active. The custom origin
returns HTTPS 200 with a trusted certificate. CSS, favicon, photo and all three
font files return 200. The generated CSP is present and the sole served inline
module matches its policy hash; no injected scripts remain. Browser acceptance results are recorded below.

## Pages settings

In Workers & Pages, create a **Pages** application by importing the existing
`arkaslittlemind/token-huddle` GitHub repository. Authorize access to this repository
only. It can remain private; making it public belongs to the launch work.

| Setting | Value |
| --- | --- |
| Project name | Request `token-huddle`; record the actual assigned name below |
| Production branch | `main` |
| Framework preset | Astro, with the overrides below |
| Root directory | Repository root (leave blank), **not** `site` |
| Build command | `npm ci --prefix site && npm --prefix site run verify` |
| Build output directory | `site/dist` |
| Build environment | Current Pages build image |
| Environment variable | `NODE_VERSION=22.23.4` |
| Environment variable | `SKIP_DEPENDENCY_INSTALL=1` |

Set these variables for production and previews. Skipping automatic dependency
installation avoids installing the root Electron project; the build command
installs the site's locked dependencies explicitly. Keep the repository root as
the build root because the site imports shared fonts, tokens and the mark from
`src/renderer`. The verify command runs Astro checks, formatting, Vitest and the
static build. Publish only `site/dist`, never the repository or root `dist`.

Use native Git integration; no deployment token, extra workflow, Astro adapter,
Functions, analytics or paid service is needed. Disable automatic preview branch
deployments initially so connecting the repository does not publish unrelated
branches. Production pushes to `main` will deploy automatically once connected;
include that ongoing publication behavior in the deployment approval.

Before selecting **Save and Deploy**, confirm the intended Cloudflare account,
repository authorization and the source revision on `main`. The local work must
be reviewed and landed separately if it needs to be in that revision. Do not
switch to direct upload or introduce a token-based pipeline if Git integration
is unavailable; resolve that deployment-method decision with the maintainer.

## Local checks

From the repository root, with Node 22.23.4 or newer:

```sh
npm ci --prefix site
npm --prefix site run verify
npm run verify
```

The last command also requires the root dependencies to be installed. Keep
`site/dist` untracked. A passing build proves the static artifact, not hosted
behavior. Astro currently warns about Shiki inline styles and CSP; do not loosen
the policy to silence the warning. Verify actual browser behavior after deployment.

## First deployment and custom domain

1. Obtain approval for the reviewed Pages settings and publication. Connect and
   deploy the project, then record its assigned `pages.dev` URL, revision and
   deployment ID. Check that URL before changing DNS.
2. Confirm the authoritative DNS provider and inspect the existing record for
   `tokenhuddle.arkaslittlemind.com` in its dashboard. Public DNS preflight on
   2026-11-16 returned Cloudflare nameservers (`mckinley.ns.cloudflare.com` and
   `sam.ns.cloudflare.com`) and NXDOMAIN for the subdomain. This is an observation,
   not proof of account access or an empty zone configuration. Recheck before use.
3. Prepare the exact DNS change for approval. In the Pages project's **Custom
   domains**, add `tokenhuddle.arkaslittlemind.com` first. The required CNAME name
   is `tokenhuddle`, targeting the project's **actual** assigned `<name>.pages.dev`
   hostname. Record any previous value before changing it. A Cloudflare-managed
   zone may offer to add the record as part of domain setup; review that change
   before confirming. If the zone is in another account/provider, use its DNS
   dashboard. Do not migrate nameservers or change unrelated records.
4. After DNS approval, apply only that reviewed change. An existing conflicting
   record needs explicit replacement approval. Wait for Pages to show the domain
   and certificate as active; inspect CAA restrictions if certificate issuance
   stalls. Do not add a CNAME without first associating the domain in Pages.
5. Confirm DNS resolution and valid HTTPS at the custom origin. Record pending
   propagation or certificate errors accurately; do not mark the feature done
   until the live checks below pass.

## Live acceptance checks

- Check the Pages URL and custom origin: page, favicon, bundled fonts, photos,
  agent marks, CSS and JavaScript return successfully. Check desktop and phone
  layouts, hero motion and the reduced-motion preference.
- Inspect the served HTML's generated CSP meta policy and browser console. Keep
  Astro's script/style hashes and the existing GitHub API connection allowance;
  assets and scripts must run without CSP violations. Do not inject a second
  policy or enable host script injection that breaks the existing policy.
- Before JavaScript finishes, download links should point to the repository's
  `releases/latest/download/Token-Huddle-Setup.exe` installer. On a GitHub API 404,
  they should retain that direct download target and the available-now copy.
  A failed release lookup must not restore prelaunch messaging.
- With a published release, links should select its Windows installer, show the
  version and reveal available portable/release-page links. Until a public
  release exists, check that path with an explicitly intercepted sample response
  in browser testing, recording it as simulated rather than live release evidence.
- Block the release API request to check network failure: the original
  direct installer links remain usable. Existing code also retains those links
  on timeout, malformed JSON, HTTP errors and unusable release data. Do not add
  a token to work around private-release lookup.

## Redeploy, failures and rollback

After initial approval, reviewed pushes to `main` trigger native Pages builds.
Use the project's deployment history to inspect the source SHA and build log or
retry a failed deployment. A failed build must not be treated as a successful
release; check that the last successful production deployment remains served.

For build failures, check the Node pin, dependency-install override, repository
root, locked site install and `site/dist` output setting first. Reproduce the
documented build locally. For authorization errors, restore repository integration
in the intended account without copying credentials into logs or source. For
missing assets or CSP failures, inspect the served artifact and console before
changing security settings.

To undo a bad production deployment, select a known-good production deployment
in Pages and use its rollback action, then verify the custom origin. Pause
automatic production deployments while investigating so a new push does not
replace the rollback. Review the repair before deploying again.

For the first deployment there may be no prior Pages version. Before DNS cutover,
leave the custom domain untouched if checks fail. After cutover, restore the
recorded previous subdomain record, or remove only the newly created record if
there was none, then remove the Pages custom-domain association when appropriate.
Obtain approval for rollback DNS changes too; preserve every unrelated record.

## Deployment record

| Item | Observed state |
| --- | --- |
| GitHub access | Private repository; local GitHub CLI reports administrator access |
| Cloudflare connection | Pages Write, Zone Read and DNS Write work after OAuth reconnection |
| Pages project, deployment ID and URL | `token-huddle`; successful deployment `f97203b7-fbca-4d29-bbbf-215931f6bfd2`; `https://token-huddle.pages.dev` |
| Deployed source SHA | `f6874164b83518eb4fb711ff7c33d0ce86a74649` on `main` |
| Build result | Initial deployment failed with seven missing Node type errors; committed dependency fix passed the production build and deploy |
| Previous DNS value and actual target | Authoritative API returned no record for `tokenhuddle.arkaslittlemind.com`; created DNS-only CNAME target `token-huddle.pages.dev`, TTL automatic, record ID `3d4edaaf763c3cd280222407f22ace9e` |
| Custom-domain HTTPS and live acceptance | Custom domain active; trusted HTTPS 200, assets and CSP hash checks passed; browser acceptance passed with the simulation limits noted below |

Update this record with nonsecret results after each external step. Never record
authorization tokens or claim simulated responses as a real published release.

Provider references: [Astro on Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/),
[build image and dependency installation](https://developers.cloudflare.com/pages/configuration/build-image/),
[custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/),
and [rollbacks](https://developers.cloudflare.com/pages/configuration/rollbacks/).

Custom domain ID: `3ab01b8b-c81c-45fb-b549-03f0ab7036c1`. During initialization,
Pages briefly reported `CNAME record not set` and HTTPS returned 522; both cleared.
The domain is active. Rollback of this first cutover means removing only DNS
record `3d4edaaf763c3cd280222407f22ace9e` and the Pages domain association after
approval, because there was no previous subdomain record.

Post-cutover Firefox report: the maintainer saw `nssBadCert` at 11:43:08 UTC
on 2026-11-16. Subsequent checks at 11:43:46 UTC and later could not reproduce
it: normal HTTPS returned 200, both current Pages IPv4 endpoints and all four
previously cached zone IPv4/IPv6 endpoints passed TLS hostname/trust validation.
The served Google Trust Services WE1 certificate names exactly
`tokenhuddle.arkaslittlemind.com` and expires 2027-02-14. DNS answers were still
mixed during propagation. A transient certificate/edge rollout is plausible,
but the exact Firefox certificate error detail was not captured. No certificate
validation was disabled and no browser exception was added.

## Browser acceptance (2026-11-16)

Checked the actual custom origin in the shared browser at 1280 x 800 and
390 x 844 CSS pixels. Hero, widget, photo, agent marks and closing panel render;
there is no horizontal page overflow. Geist and Newsreader italic loaded, and
all image elements completed successfully. FAQ opens, and the marquee Pause
button toggles both aria-pressed and the animation state. The hero settles at
Claude session 74% (warning) and Codex weekly 93% (critical).

The live anonymous release lookup shows the first-release-coming-soon note and
points all three Download links at the repository, as expected before launch.
In this browser tab only, replayed the exact served CSP-hashed module with a
simulated successful GitHub response: all three links selected the installer,
the version chip and Windows note changed, and portable/release links appeared
with the expected targets. Replayed it with a simulated network rejection after
restoring initial link targets: all three retained releases/latest. No release
was published and no executable was downloaded. These are simulations, not
proof that a real public release exists. No CSP violations were observed during
these simulations.

Reduced motion was simulated within the page by enabling its existing reduced
motion CSS rules and supplying a matching media-query result to the exact served
module. All animations stopped, the marquee toggle disappeared, and the hero
remained static, with no horizontal overflow. This verifies the page's reduced
motion branches; it is not an OS-level preference or a real-device test. Phone
checks use a CSS viewport, not a physical phone. The temporary tab was closed.
