# Feature: Code signing decision

**From build-plan:** feature 20
**Build attempt:** 1
**Branch:** feature/code-signing-decision
**Status:** verified

## Goal

Decide whether Token Huddle's Windows builds are code-signed, and how. Compare
a signing certificate and a signing service against shipping unsigned with
SmartScreen guidance. Then apply the maintainer's decision to the release
pipeline and to the docs that promise "not code-signed yet". This is a chore:
the comparison is the main output, and the decision belongs to the maintainer.

## In scope

- A short decision record, `docs/code-signing.md`. It compares the options with
  current costs, eligibility, CI fit and SmartScreen effect, cites its sources
  with the date checked, and records the decision and the reasons for it.
- A stop after the comparison so the maintainer can choose. The build does not
  go on until the choice is recorded.
- Applying the choice:
  - **Unsigned:** clear SmartScreen guidance in the README, and the "yet"
    wording in README and SECURITY.md changed to a final statement.
  - **Signed:** signing wired into `.github/workflows/release.yml` and the
    electron-builder `build` config, so the tag build signs both `.exe` files.
    Local `npm run dist` keeps working with no secrets and builds unsigned.
- `project-overview.md`: replace `> TODO: code signing undecided (step 20).`
  with the decision, in one line under Deployment.
- A `CHANGELOG.md` line under `[Unreleased]`.

## Out of scope

- Buying a certificate, opening a signing account, verifying an identity, or
  adding repository secrets. These are maintainer actions. The spec can only
  document them.
- Publishing any release, or pushing a tag. Go-public and `v0.1.0` are step 22.
- The landing page's download wording (step 21). It reuses this decision.
- macOS or Linux signing (step 23b).
- Changes to the in-app updater's behaviour beyond the signature settings
  that the decision requires.

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is
`disabled`: build the steps in order, then review the whole feature once.
Step 2 is an extra hard stop because it needs the maintainer's choice. No
checkpoint commits; `/complete` makes the feature commit. Run `npm run verify`
before handing over.

## Build steps

- [x] **1. Write the comparison.** Create `docs/code-signing.md` with one
  section per option and a short table. Check every cost, limit and
  eligibility rule against the vendor's own page on the day, and cite it with
  that date. Cover at least:
  - **Unsigned (current).** What SmartScreen shows ("Windows protected your
    PC", then **More info** → **Run anyway**), that reputation builds per file
    hash so each release starts again, and that the checksums in
    `SHA256SUMS.txt` stay the integrity check.
  - **Cloud signing service: Azure Artifact Signing** (formerly Trusted
    Signing). Monthly cost, which countries and whether individual developers
    are eligible, identity validation, and electron-builder's built-in
    `win.azureSignOptions` support.
  - **Free signing for open source: SignPath Foundation.** Its conditions
    (OSI licence; this project is MIT), that it needs a public repository
    (Token Huddle goes public only at step 22), and that the certificate names
    SignPath Foundation, not the maintainer.
  - **A bought OV or EV certificate** (for example, Certum's open-source
    certificate or a commercial OV/EV). Yearly cost, the hardware-key rule
    that makes CI signing need a cloud HSM or a token on a machine, and
    whether EV still gives immediate SmartScreen reputation.
  - **Effect on in-app updates.** Read `node_modules/electron-updater` (the
    NSIS updater's signature check) and state what happens when the running
    build is unsigned, when it is signed, and when the publisher name changes
    between releases. Cite the file you read.
  - **Effect of signing after the build.** Signing changes the `.exe` bytes,
    so `latest.yml`'s SHA-512 and the blockmap must come from the signed file.
    Say which options sign inside electron-builder (hashes stay correct) and
    which sign afterwards (the pipeline must then rebuild the update files).
  - A recommendation, marked as a recommendation, with its reasons.
  Done when: `docs/code-signing.md` exists, every price and eligibility claim
  has a source and date, the updater claim cites the file read, anything not
  confirmed is labelled unverified, and `npm run format:check` passes.

- [x] **2. Stop for the maintainer's decision.** Present the table and the
  recommendation and ask which option to take. Record the choice and its
  reasons in the decision record's "Decision" section. If the choice needs a
  maintainer action first (an account, an identity check, secrets, or the
  public repository), list those actions in the record.
  Done when: the Decision section names one option, and the maintainer chose
  it in this conversation.

- [x] **3. Apply the decision.**
  - **If unsigned:** in README "Download" (around line 32), replace "not
    code-signed yet" with the exact SmartScreen steps and a pointer to
    checking `SHA256SUMS.txt`. In SECURITY.md line 14, replace "Builds are not
    code-signed yet." with the final statement. Leave `release.yml` unchanged.
  - **If signed:** add the signing configuration to `package.json` `build.win`
    and the signing inputs to `release.yml`. Secrets are read only from GitHub
    Actions secrets and given only to the Build step through `env`, never to
    `npm ci`, Verify or the release step. With no signing secrets present
    (local `npm run dist`, forks), the build still succeeds unsigned. Do not
    break the single `gh release create` draft or `SHA256SUMS.txt`; checksums
    must be taken from the signed files. If the chosen option signs after the
    build, regenerate `latest.yml` and the blockmap from the signed files, or
    choose a way that signs inside electron-builder. Update README "Download"
    and "Releasing" (the secrets to add and how to check the signature with
    `Get-AuthenticodeSignature`) and SECURITY.md. If signing can start only
    after go-public, keep the pipeline unsigned, write the deferred steps in
    the record, and propose a one-line note for build-plan step 22 for the
    maintainer to approve. Do not edit the build plan without approval.
  - Both: replace the overview TODO and add the CHANGELOG line.
  Done when: no "not code-signed yet" wording is left in README.md or
  SECURITY.md (`grep -rn "code-signed yet"` is empty); `npm run dist` builds
  both `.exe` files locally with no signing secrets set; `npm run verify`
  passes; and, for a signed choice, the workflow file shows the secrets
  scoped to the Build step only.

## Files / areas

- `docs/code-signing.md` (new decision record)
- `README.md` - "Download" section (line 32) and "Releasing" (line 139 on)
- `SECURITY.md` - line 14
- `blueprint/context/project-overview.md` - Deployment TODO (line 167)
- `CHANGELOG.md` - `[Unreleased]`
- Signed choice only: `.github/workflows/release.yml`, `package.json` `build.win`
- Read only: `node_modules/electron-updater` (signature check),
  `src/main/main.js` around line 439 (updater setup)

## Data / contracts

- Release assets stay the same names and set: `Token-Huddle-Setup-<version>.exe`,
  `Token-Huddle-<version>-portable.exe`, `*.blockmap`, `latest.yml`,
  `SHA256SUMS.txt`, in one draft release per tag.
- `latest.yml` SHA-512 must match the published installer byte for byte, or
  in-app updates fail.
- Signing secrets (signed choice only) live in GitHub Actions secrets. They are
  never committed, never printed, never given to `npm ci` or the app. They are
  vendor signing credentials, not an AI tool's login, so the "No logins" rule is
  not affected, but they get the same care.

## Testing

- No new logic is expected, so no new unit tests. `npm run verify` must pass.
- `npm run dist` locally with no signing secrets: both `.exe` files are built.
- A signed choice can be proved only by a tag build with real secrets. That is a
  maintainer action (a pre-release tag such as `v0.1.0-rc.N`, as in README
  "Releasing"). Do not claim a signed build was tested unless that run
  happened and its result was read.

## Notes for the AI

- Vendor prices, country rules and SmartScreen behaviour change often and may
  be newer than your training. Read the vendor pages; do not write figures from
  memory.
- Do not recommend an option the maintainer cannot use. Eligibility can depend
  on the maintainer's country and on being an individual rather than a company;
  ask in step 2 if the sources make it matter.
- Keep the decision record short (one screen of table plus short sections). It
  is a record, not a guide to every vendor.
- Write in the README's existing style: plain, short sentences.

## Open questions

- **Which option to take** is the maintainer's choice at step 2. It may cost
  money and may need an identity check, so the build stops there.
- **Maintainer's country and whether signing as an individual** affect which
  services are open. Step 1 states each option's rule; the maintainer answers
  at step 2.

## Implementation record

Observed on 2026-11-16 on branch `feature/code-signing-decision`:

- Step 1: `docs/code-signing.md` compares unsigned, Azure Artifact Signing,
  SignPath Foundation and Certum Open Source, with vendor sources checked on
  2026-11-16. Updater claims read from `electron-updater` 6.8.11
  `NsisUpdater.js` and `app-builder-lib` 26.18.0 `PublishManager.js`,
  `windowsSignAzureManager.js` and `windowsSignToolManager.js`.
- Step 2: the maintainer chose "Unsigned for now" in this conversation.
- Step 3: README "Download", SECURITY.md, the overview Deployment line and
  CHANGELOG updated; `release.yml` and `package.json` unchanged.
- `npm run dist` built `Token-Huddle-Setup-0.1.0.exe` and
  `Token-Huddle-0.1.0-portable.exe` with "no code signing certificate
  configured, signing is skipped". `npm run verify` exit 0, 165/165 tests.
  `grep -rn "code-signed yet" README.md SECURITY.md` is empty.
- `.prettierignore` skips `*.md` and `docs/`, so `format:check` does not
  cover these files; the table was aligned by hand.
- Code review (Standards and Spec agents): no blocking findings. Fixed: the
  `publisherName` claim (signed builds check updates only when it is set),
  repeated wording, table alignment, Certum signing point. Left labelled:
  commercial OV/EV prices not checked; hardware-key rule not re-checked;
  SignPath terms do not say a public repository is required.
- Try it now: skipped, docs-only change with no runtime behaviour to observe.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":10692,"specSha256":"cee0e2b229ad5fb1cbecd4b627c4f409b371d8e662d9c743bada4efd07d8685f","branch":"refs/heads/feature/code-signing-decision","head":"e833b1fac4e4dfb2f83b9315ec1f4d3f5cc5180a","baseRef":"refs/heads/main","baseCommit":"e833b1fac4e4dfb2f83b9315ec1f4d3f5cc5180a","sourceTree":"70f2085982d9ed519f4b7e81ef706d66a54355cb","landing":"local-merge","absentOptional":[]} -->
