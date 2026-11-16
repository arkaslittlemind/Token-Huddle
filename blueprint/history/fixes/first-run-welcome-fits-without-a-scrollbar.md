# Fix: First-run welcome fits without a scrollbar

**Type:** Fix
**Status:** verified
**Branch:** `fix/first-run-welcome-fits-without-a-scrollbar`

## The problem

The first-run welcome (feature 14) is slightly taller than the settings
window's content area (window 480×700, about 661px of page inside the frame),
so a vertical scrollbar appears on the first thing a new user sees. It shows in
both themes in the `--onboarding` screenshots, with all three tools found and
Claude Code not connected (the common first-run case). The normal settings
view does not scroll.

## The fix

Tighten the welcome's own vertical spacing so its common first-run layout fits
the existing window. Change only welcome rules in
`src/renderer/settings.css` (for example `.never` and `.finish` top margins,
`.never` padding, and the welcome's tool-row spacing), not the window size:
700px already nearly fills a 768px-high screen, so a taller window is not the
fix. Keep the 12b layout and order, the 11px minimum text size, and focus
rings.

Must not break:

- The normal settings view's spacing (shared rules such as `main`, `.lead`,
  `.card`, `h2` stay unchanged, or change only under `#welcome`).
- Scrolling when the content really is longer (for example after **Copy
  prefix** expands its steps). Overflow stays allowed; it just should not
  happen in the common case.

No `CHANGELOG.md` line: the welcome is unreleased, and its `Added` entry under
`[Unreleased]` still describes it correctly.

## Build steps

- [x] **Step 1 - Fit the welcome** - adjust the welcome-only spacing in
  `settings.css`. Measure the result in the real app: run the welcome in a
  throwaway profile (as the screenshot script does with `--onboarding`) and
  read `document.scrollingElement.scrollHeight` against `clientHeight` in the
  settings window, dark and light. *Done when:* `scrollHeight <= clientHeight`
  in both themes with Claude Code not connected, the `--onboarding`
  screenshots show no scrollbar and still match `ui-onboarding-*.png` apart
  from spacing, the normal settings screenshot is unchanged, and
  `npm run verify` passes.

## Verify

- `npm run screenshot -- shot.png --onboarding` and `--onboarding
  --theme=light`: no scrollbar in `shot-settings.png`.
- `npm run screenshot -- shot.png --settings`: the settings view looks the
  same as before.
- `npm run verify` passes (77 tests at `9abcb2e`).


<!-- blueprint:completion {"schemaVersion":2,"specBytes":2394,"specSha256":"d8eb6a2677d7c8d96f2fb2edc743e8142f3aa2a982604328611eb75db6a1203e","branch":"refs/heads/fix/first-run-welcome-fits-without-a-scrollbar","head":"9abcb2e6424960adca114079c72bcfa52154b2d2","baseRef":"refs/heads/main","baseCommit":"9abcb2e6424960adca114079c72bcfa52154b2d2","sourceTree":"9fbbcc80afc0d2e7be7a0313bcf9c7e41ec3dcf0","landing":"local-merge","absentOptional":[]} -->

## Try it now

1. Run `npm run screenshot -- shot.png --onboarding` and open `shot-settings.png`. There is no scrollbar.
2. Repeat with `--theme=light`: also no scrollbar.
3. Run `npm run screenshot -- shot.png --settings`. The settings view looks the same as before.
4. Run `npm run verify` and expect 77 passing tests.
