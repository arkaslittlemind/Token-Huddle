# Fix: Test pass-through after a failed save

**Type:** Fix
**Status:** verified
**Branch:** fix/test-pass-through-after-a-failed-save
**Fixes:** F-01

## The problem

The status line script's pass-through mode (feature 10) has to hand Claude
Code's input to the user's own command even when saving the usage fails. The
spec for feature 10, step 2, says "The pass-through happens even when parsing
or saving fails". The Windows-gated test
`pass-through mode hands the input on byte for byte and still saves usage`
(`test/claude.test.js:299`) covers valid input, non-ASCII input and a parse
failure (`not json`). It has no case where the snapshot write itself fails. The
behaviour is correct today, because the independent reviewer ran it by hand.
But a later change to `SCRIPT` could break a user's status line without any
test failing.

## The fix

Test only, with no product change. In the existing pass-through test, add one
run of the script with valid input (the fixture) and an output path inside a
folder that does not exist, so the write fails. Assert:

- the exit code is 0;
- stdout equals the input byte for byte;
- no file is created at that path.

It must not break the existing assertions in that test, or the no-switch
summary test. It must not touch `~/.claude` or the real Token Huddle data
folder: use the test's temporary `dataDir`.

## Build steps

- [x] **1. Add the failed-save case.** Add the run described above to the
  pass-through test in `test/claude.test.js`.
  **Done when:**
  - `node --test test/claude.test.js` passes on Windows, with the case not
    skipped.
  - A temporary local mutation shows that the new case catches a real
    regression: moving the pass-through write inside the save `try` makes it
    fail. Revert the mutation; it is never committed.
  - `npm test` passes.
  - F-01 is marked `fixed` in `blueprint/context/findings.md`.

## Verify

- `npm test`: every test passes, 0 skipped on Windows.
- Read the new assertions. A missing-folder output path gives exit 0, stdout
  identical to the input, and no output file.
- Record the mutation check result (fails with the mutation, passes without it)
  in the step's notes during `/implement`.

## Notes

- Built 2026-11-15. The `run()` helper in the pass-through test now takes an
  optional target path. The new case uses
  `<dataDir>/missing-folder/claude-claude.json`.
- **Mutation check.** The save step's `catch {}` was changed temporarily to
  `catch { if ($limits) { exit 0 } }`. That skips the pass-through only when
  saving fails after a successful parse. Test 23 then failed on exactly one
  assertion, "input still reaches the user command when saving fails". The
  change was reverted: `git diff -- src/main/providers/claude.js` is empty,
  and all 23 claude tests pass again.
- **Why that mutation and not the one step 1 named.** Moving the write inside
  the save `try` would also break the existing `not json` case, because parsing
  throws before the write. That would not show that the new case catches
  anything on its own. The mutation used fails only when parsing succeeds and
  saving then fails. That is exactly the case under test.
- **Output path.** The new case builds its path with `claude.outputPath()`, so
  the file name cannot drift from the real one (code review suggestion).


<!-- blueprint:completion {"schemaVersion":2,"specBytes":3310,"specSha256":"0e7d418991be1b9488f822e9ce9184ff6be37ab4fbdf5e9b39ca3ae963575781","branch":"refs/heads/fix/test-pass-through-after-a-failed-save","head":"399ae6b79899a45188c8c7042c04fe52b813b24e","baseRef":"refs/heads/main","baseCommit":"399ae6b79899a45188c8c7042c04fe52b813b24e","sourceTree":"eab672bc5ddeb8b1da32a214b98d171ebbc7da9b","landing":"local-merge","absentOptional":[]} -->

## Try it now

Skipped: this fix adds a test only and changes nothing a person can observe in the app. Run `npm test` to see the new case pass.
