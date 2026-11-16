# Go-to-market playbook

Status: `v0.1.0` published on 2026-11-17 with maintainer authorization.
Token Huddle is free and MIT licensed, without ads or telemetry. Social posts and
the demo copy below remain drafts; publication of the repository and release did
not send any posts.

## Public launch record

- The maintainer tested the Windows installer with real tools. Claude subscription
  limits matched the terminal status line; compact view, Ctrl+Alt+H and settings
  persistence worked. This was a live smoke test, not a completed one-week beta.
- The old development history remains in the archived private repository
  `arkaslittlemind/token-huddle-private`. A verified recovery bundle also exists
  outside the project. The public `arkaslittlemind/token-huddle` repository starts
  at the reviewed snapshot `3bb1c2914c696f48e646378bad7e1cf499201020`.
- The public snapshot's tracked text was scanned for common secret patterns and
  personal paths. No secret-like values were found; personal user-directory paths
  in two historical records were replaced with placeholders. This scan does not
  establish that the private development history contains no secrets.
- The public snapshot preserves human attribution using the maintainer's GitHub
  noreply email. Private vulnerability reporting is enabled.
- Local Verify and Windows packaging passed. Public GitHub Verify run
  `43972636220` and Release run `43972731386` both passed. The release tag is
  `v0.1.0`, and the release contains installer, portable, stable installer alias,
  checksums, blockmap and updater metadata. Executable checksums match GitHub's
  asset digests; the installer and its stable alias have identical SHA-256 digests.
- The landing page is now Git-connected to the public repository through Pages
  project `token-huddle-public`. Its custom domain is active. The public direct
  installer URL returns HTTP 200 and an attachment download response. See
  [deployment migration](site-deployment.md#public-repository-migration-2026-11-17).
- Future feature and fix branches start from public `main`; local `origin` points
  at the public repository. Push only current public work there. The private
  archive retains the original development history and is not the development
  target for new work.
- A newer-version in-app upgrade has not been tested by this first release.

The planning checklist and launch copy below are retained as reference; social
posting, donations and broader beta coverage are separate work.

## A 15-second demo

Prepare a clean desktop with a neutral editor window and no account names,
notifications, personal paths or real usage visible. From source, use
`npm run demo` for sample readings; do not use `--real` screenshot captures.
Close an existing real-data instance first. Use a screen recorder to capture
the widget and editor together; `npm run screenshot -- out.png` produces a
sample-data still, not a video. Keep the capture local until reviewed.

| Time | Picture | Caption |
| --- | --- | --- |
| 0-3 s | Widget pinned beside the editor | Your coding-agent usage, in one glance |
| 3-7 s | Pause on Claude Code and Codex bars, reset times and pace ticks | Know your limits before the next task |
| 7-11 s | Switch to compact view, then hide/show with Ctrl+Alt+H | Small enough to stay out of the way |
| 11-15 s | Restore full view; show project name and launch URL in the edit | Token Huddle. Free. Windows. No tool logins. |

Label the recording **Sample data**. Review all frames for private information,
trim to 15 seconds and export a video suitable for the chosen posting channel.
An optional GIF can accompany the GitHub README/release. Confirm current upload
limits and community rules at launch. Do not imply a scripted demo verifies real
provider accuracy, and do not imply OpenCode has a subscription quota.

## Deferred public-launch checklist

These tasks need a separate post-beta instruction. Keep this list pending until
each action is actually performed and checked.

- [ ] Review beta feedback and resolve launch-blocking bugs; extend beta if needed.
- [ ] Prepare and review a history rewrite or squash so the token-based prototype
  and personal usage numbers are absent from published history. Preserve a safe
  private recovery copy before changing history. Inspect all refs intended for
  publication, tracked files, fixtures and release assets for private data.
  Do not publish old branches or tags that restore the removed history.
- [ ] Decide whether to use the maintainer's GitHub noreply commit email. Preserve
  genuine human attribution; add no AI attribution to commits or PRs.
- [ ] Review `SECURITY.md` and enable private vulnerability reporting when making
  the repository public, checking GitHub's current availability and settings then.
- [ ] Choose an actual donation destination (GitHub Sponsors or similar) and add
  its reviewed link to README and landing page. No placeholder payment links.
- [ ] Recheck current subreddit rules, self-promotion policy, required flair and
  video limits. Seek moderator permission if those rules require it. For
  r/LocalLLaMA, establish relevance to that community before posting; OpenCode
  support alone does not make Token Huddle a local-model quota monitor.
- [ ] Approve the demo and draft copy below, then make the repository public.
- [ ] Follow [README Releasing](../README.md#releasing) and pipeline 19a:
  `package.json` version `0.1.0`, matching changelog section and `v0.1.0` tag;
  review the draft release, executables, checksums, notes and updater metadata
  before publishing. Inspect existing tags/drafts first rather than blindly
  recreating or moving one. Tags, pushes and publication require authorization.
- [ ] Check public download links and landing-page release lookup, then verify
  the installed app can discover a public release. Never add credentials to
  make private releases work.
- [ ] Publish the approved GitHub, Reddit and X copy only after links work.
  Collect voluntary replies and report reproducible bugs through the published
  project channels; never ask for credentials or raw usage logs.

## Draft launch copy

All copy below is unpublished. Replace bracketed links after the public release
exists, and attach the reviewed 15-second sample-data demo. Review claims against
the shipped version before posting. No email signup or Pro purchase link exists.

### GitHub release introduction

**Token Huddle v0.1.0 - coding-agent usage in one small Windows widget**

Token Huddle puts Claude Code and Codex usage limits, plus OpenCode token totals,
beside your editor. See reset times and a pace marker, switch to compact view,
and get threshold notifications during work.

It is free and MIT licensed. It never reads your tools' login credentials; it
uses data the tools hand over or write locally. Its only app network traffic is
an optional check of this project's GitHub Releases for updates. No telemetry.

Download the installer or portable build below and check `SHA256SUMS.txt`.
Windows builds are unsigned; see [signing guidance link]. Claude's readings
update through its terminal status line; see [setup guide link].

### r/ClaudeAI

**I built a free Windows widget to keep Claude Code usage visible beside my editor**

I use several coding agents and wanted to see usage without opening each tool.
Token Huddle shows Claude Code session/weekly limits alongside Codex limits and
OpenCode token totals. The clip uses sample data.

Claude Code shares its readings through its terminal status line after a response.
The widget previews that setup change, keeps a backup and lets you disconnect.
It does not read login tokens. The VS Code Claude extension and T3 Code do not
run that status line, so those readings wait for the next terminal response.

Free, MIT licensed, Windows only for now. No telemetry; an optional GitHub update
check is the app's only network request. [Public repo / release link]

Would this be useful during your normal Claude Code workflow? What would make it
clearer or easier to set up? Independent project, not affiliated with Anthropic.

### r/LocalLLaMA

**Free Windows usage widget for developers who also use OpenCode**

If your workflow mixes OpenCode with Claude Code or Codex, I built Token Huddle
to keep their usage visible together. OpenCode shows token totals and cost from
its local database; Claude Code and Codex show their reported subscription limits.
It does not infer a quota for local models or benchmark model performance.

The 15-second clip uses sample data. The widget is free, MIT licensed and does
not read login credentials or send telemetry. Its only app network traffic is an
optional GitHub update check. Windows only for now. [Public repo / release link]

For people using this mixed workflow, which usage information would you actually
want visible beside your editor? Post only if the community's current rules and
moderation guidance allow this topic.

### X

Built Token Huddle: a tiny Windows widget for Claude Code + Codex limits and
OpenCode token totals. Free, MIT licensed, no tool login tokens, no telemetry.
15-second demo (sample data). [Release link]

## Learn from users

During beta, use voluntary replies through the privately agreed channel. After
launch, review voluntary issues and comments. Rank recurring requests, including
Cursor/Windsurf, burn-rate warnings and weekly spend reports, by the problems
people describe. These are candidates for future specs, not launch promises.

Email signup and opt-in telemetry are proposals for later work. Before collecting
anything, separately decide the purpose, exact data, consent wording, hosting,
storage, access, retention, withdrawal and deletion process. App telemetry would
also require an explicit revision of the current update-only network/privacy
contract; an opt-in toggle alone does not authorize it. No collection is added
to the app or landing page by this feature.

## Later: Token Huddle Pro proposal

Revisit a **$19 one-time** Pro tier after **500-1,000 active weekly users**.
This is a decision gate, not evidence that the threshold has been reached or a
promise of a release date. Free v1 stays free.

Before implementation, specify:

- What counts as an active weekly user, how the count can be measured with
  consent and how uncertainty will be reported. Downloads and email signups are
  not active weekly users; the current app supplies no telemetry-based count.
- Which requested features justify Pro, while preserving the free-v1 offer.
- License scope, activation/offline behavior, recovery, update entitlement and
  support/refund terms for a one-time purchase.
- Whether Dodo Payments or Polar license keys fit that contract; verify their
  current capabilities, eligibility, pricing and privacy requirements then.

Neither provider is selected. No payment service, license validation, Pro UI or
new app network exception is introduced here.
