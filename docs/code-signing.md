# Code signing

Should the Windows builds of Token Huddle be code-signed, and how? This record
compares the options and keeps the decision. Sources were checked on
2026-11-16. Prices and rules change, so check them again before you act on them.

## Summary

| Option                     | Cost                             | Who can use it                                                      | Signs in CI                                          | Name users see                                    | Can start                                     |
| -------------------------- | -------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------- | --------------------------------------------- |
| Unsigned (now)             | Free                             | Anyone                                                              | Nothing to sign                                      | "Unknown publisher"                               | Now                                           |
| Azure Artifact Signing     | From $9.99 a month               | Individuals only in the USA or Canada; organizations in more places | Yes, inside electron-builder                         | Maintainer's verified legal name                  | After identity check (1 to 20 business days)  |
| SignPath Foundation        | Free                             | OSI-licensed open source projects that meet its terms               | Yes, as a step after the build                       | "SignPath Foundation"                             | After go-public and a first release (step 22) |
| Certum Open Source (cloud) | €49 (validity period not stated) | Open source developers, issued to a natural person                  | Unverified: needs the SimplySign app and phone codes | "Open Source Developer" and the maintainer's name | After purchase and identity check             |

No option removes the SmartScreen warning for a new app. Signing only adds a
publisher name to the warning, and lets reputation carry over from one release
to the next.

## Unsigned (current)

When someone runs an unsigned download, SmartScreen shows "Windows protected
your PC". They select **More info**, then **Run anyway**. Company policy can
block that choice. Reputation builds per file, so every new version starts at
zero again. Microsoft: "When a file is not signed, SmartScreen reputation must
build for each new version of your files, starting with zero reputation."
On Windows 11, Smart App Control (when it is on) blocks unsigned files that have
no positive reputation.

The integrity check stays `SHA256SUMS.txt` on each GitHub Release. In-app
updates are checked against the SHA-512 in `latest.yml`.

Source: [SmartScreen reputation for Windows app developers](https://learn.microsoft.com/windows/apps/package-and-deploy/smartscreen-reputation)
(updated 2026-08-17).

## Azure Artifact Signing (formerly Trusted Signing)

Microsoft's managed signing service. The keys stay in Microsoft's HSM, so no
hardware token is needed.

- **Cost:** "Starts at $9.99/month" (Basic: 5,000 signatures a month). The
  pricing page shows the tiers but not the figures; the price comes from the
  SmartScreen page above.
- **Eligibility:** "Individual developers must be located in the United States
  or Canada." Organizations can be in the USA, Canada, the EU, the UK,
  Australia, New Zealand, Japan, South Korea, Singapore, Switzerland, Norway or
  Israel. An individual also needs an Azure billing account of type
  "Individual" whose legal name and address match a government ID.
- **Identity check:** 1 to 20 business days. The certificate shows the
  verified name, city, state and country.
- **CI:** electron-builder 26 (installed: 26.18.0) signs with it through
  `win.azureSignOptions`. It installs the `TrustedSigning` PowerShell module and
  runs `Invoke-TrustedSigning` while it builds
  (`node_modules/app-builder-lib/out/codeSign/windowsSignAzureManager.js`).
  The pipeline needs an Azure app registration's tenant ID, client ID and
  secret as GitHub Actions secrets.

Sources: [Artifact Signing quickstart](https://learn.microsoft.com/azure/artifact-signing/quickstart)
(updated 2026-10-08), [Artifact Signing pricing](https://azure.microsoft.com/pricing/details/artifact-signing/).

## SignPath Foundation

Free signing for open source projects. SignPath Foundation holds the
certificate and is named as the publisher, not the maintainer.

Conditions from its terms that matter here:

- "OSI-approved Open Source license without commercial dual-licensing for all
  components." Token Huddle is MIT.
- The software must be "already released in the form to be signed", and the
  binaries must be built from the repository's source in an automated build.
  Token Huddle has no release yet and its repository is private until step 22.
- A "Code signing policy" must be on the project's home page (team roles,
  privacy policy, and an attribution to SignPath).
- Software that sends user data to systems the user did not choose must
  describe it in a privacy policy shown during installation and let the user
  turn it off. Unverified whether the update check to GitHub counts. It sends
  no personal data and can be turned off, but the installer does not show a
  privacy policy now.
- Every team member needs multi-factor authentication.

The terms do not say how long approval takes or whether the repository must be
public.

**CI:** signing is a separate request after electron-builder has built the
files. Signing changes the `.exe` bytes, so `latest.yml`'s SHA-512, the
blockmap and `SHA256SUMS.txt` must then be made again from the signed files, or
in-app updates fail. A custom electron-builder sign hook that calls SignPath
would keep the hashes right, but adds code.

Sources: [SignPath Foundation terms](https://signpath.org/terms),
[signpath.org](https://signpath.org/).

## Bought certificate (Certum Open Source)

The cheapest bought certificate found. Publicly trusted code-signing keys must
be kept in hardware (an HSM or a token) since June 2023, under the CA/Browser
Forum code signing rules (not checked again on 2026-11-16), so a file-based
certificate in GitHub Secrets is not possible.

- **Cost:** €49 for "Open Source Code Signing on SimplySign" (cloud). The page
  does not state the validity period.
- **Name:** issued to a natural person, prefixed with "Open Source Developer".
- **Key:** kept in Certum's cloud HSM. Using it needs the SimplySign Desktop app
  and a code from a phone app. Unverified whether it can sign unattended on a
  GitHub Actions runner; if it cannot, every release is signed by hand on the
  maintainer's machine, which breaks "never from a local machine" in README
  "Releasing".
- **Where it signs:** a certificate used through signtool would sign inside
  electron-builder (`win.signtoolOptions`), so the update hashes stay right.
  Unverified whether SimplySign works that way on a runner.
- **EV certificates:** Microsoft: "EV certificates no longer bypass
  SmartScreen." They are not worth the higher price for this project.
  Commercial OV and EV prices were not checked.

Source: [Certum shop](https://shop.certum.eu/open-source-code-signing-on-simplysign.html).

## Effect on in-app updates

Read in `node_modules/electron-updater/out/NsisUpdater.js` (electron-updater
6.8.11), `verifySignature`: the downloaded installer is checked only when the
installed app's `app-update.yml` has a `publisherName`. When there is none, the
check returns `null` and the update goes ahead.

electron-builder writes `publisherName` into `app-update.yml` only for a
signed Windows build, and only when it can name the publisher
(`node_modules/app-builder-lib/out/publish/PublishManager.js`). With signtool
it takes the certificate's common name (`windowsSignToolManager.js`). With
Azure it is set only when `azureSignOptions.publisherName` is given
(`windowsSignAzureManager.js`: "For now return null"). A file signed after the
build, as with SignPath, gets none unless `build.win` sets one by hand. So a
signed build checks updates only when `publisherName` ends up set.

- **Unsigned build now:** no `publisherName`, no signature check. Updates are
  checked only against the SHA-512 in `latest.yml`.
- **Unsigned, then signed later:** the running unsigned app does no check, so it
  accepts the first signed update. Moving to signing later is safe.
- **Signed with `publisherName` set, then the publisher name changes** (for example from SignPath
  Foundation to the maintainer's own name): the installed app rejects the update
  with `ERR_UPDATER_INVALID_SIGNATURE`, unless `publisherName` lists both names
  in the release that comes before the change.

## Recommendation

This is a recommendation, not the decision.

Ship `v0.1.0` unsigned, with clear SmartScreen steps in the README and the
checksums. No option removes the first-run warning for a new app, all of them
need an identity check or a public release first, and moving to signing later
does not break updates. Look at SignPath Foundation again after go-public
(step 22): it is free and fits an MIT project built in CI, but needs a release
first, a code signing policy page, and extra pipeline work to remake the update
files. Choose Azure Artifact Signing only if the maintainer is in the USA or
Canada; it is the simplest signed setup with electron-builder.

## Decision

Decided on 2026-11-16 by the maintainer: **ship unsigned for now**, for the
reasons in the recommendation. The README gives the SmartScreen steps and the
checksum check.

Look at SignPath Foundation again after go-public (step 22) and the first
release. Before applying: add a code signing policy page, check whether the
update check needs a privacy notice in the installer, set `publisherName`, and
plan how the pipeline remakes `latest.yml`, the blockmap and `SHA256SUMS.txt`
from the signed files.
