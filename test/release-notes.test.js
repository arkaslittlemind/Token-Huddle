const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { releaseNotes } = require('../scripts/release-notes');

// The shape CHANGELOG.md uses: Keep a Changelog headings, subsections, link references.
const CHANGELOG = `# Changelog

All notable changes to Token Huddle are documented in this file.

## [Unreleased]

### Added

- Something new.

## [0.2.0] - 2026-12-01

### Added

- Release pipeline.

### Fixed

- A bug.

## [0.1.0] - 2026-11-30

## [0.0.9]

### Added

- Undated release.

[Unreleased]: https://github.com/arkaslittlemind/token-huddle/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/arkaslittlemind/token-huddle/compare/v0.1.0...v0.2.0
`;

const notes = (tag, version) => releaseNotes({ changelog: CHANGELOG, tag, version });

test('a release uses its own section, up to the next version heading', () => {
  assert.equal(notes('v0.2.0', '0.2.0'), '### Added\n\n- Release pipeline.\n\n### Fixed\n\n- A bug.');
});

test('a heading without a date also counts', () => {
  assert.equal(notes('v0.0.9', '0.0.9'), '### Added\n\n- Undated release.');
});

test('the last section stops before the link references', () => {
  const changelog = '## [Unreleased]\n\n## [1.0.0] - 2027-01-01\n\n- Done.\n\n[1.0.0]: https://example.com/v1.0.0\n';
  assert.equal(releaseNotes({ changelog, tag: 'v1.0.0', version: '1.0.0' }), '- Done.');
});

test('a link reference inside a section is kept', () => {
  const changelog = '## [1.0.0]\n\n- See [docs].\n\n[docs]: https://example.com/docs\n\n- More.\n\n## [0.9.0]\n';
  assert.equal(
    releaseNotes({ changelog, tag: 'v1.0.0', version: '1.0.0' }),
    '- See [docs].\n\n[docs]: https://example.com/docs\n\n- More.'
  );
});

test('a pre-release uses the Unreleased section', () => {
  assert.equal(notes('v0.3.0-rc.1', '0.3.0-rc.1'), '### Added\n\n- Something new.');
});

test('the tag must match package.json exactly', () => {
  assert.throws(() => notes('v0.2.0', '0.1.0'), /^Error: tag v0\.2\.0 does not match package\.json version 0\.1\.0$/);
  assert.throws(() => notes('0.2.0', '0.2.0'), /does not match/);
  assert.throws(() => notes('v0.2.0-rc.1', '0.2.0'), /does not match/);
});

test('a missing or empty section fails with the next step', () => {
  assert.throws(
    () => notes('v0.4.0', '0.4.0'),
    /^Error: CHANGELOG\.md has no \[0\.4\.0\] section; move \[Unreleased\] to it first$/
  );
  assert.throws(() => notes('v0.1.0', '0.1.0'), /^Error: the \[0\.1\.0\] section of CHANGELOG\.md is empty$/);
  const empty = '## [Unreleased]\n\n## [1.0.0]\n\n- x\n';
  assert.throws(
    () => releaseNotes({ changelog: empty, tag: 'v1.1.0-rc.1', version: '1.1.0-rc.1' }),
    /\[Unreleased\] section of CHANGELOG\.md is empty/
  );
});

test('a version is matched exactly, not as a prefix or a pattern', () => {
  const changelog = '## [0.1.0] - 2026-11-30\n\n- ten\n\n## [0.1.00]\n\n- not this\n';
  assert.equal(releaseNotes({ changelog, tag: 'v0.1.0', version: '0.1.0' }), '- ten');
  assert.throws(() => releaseNotes({ changelog, tag: 'v0x1x0', version: '0x1x0' }), /no \[0x1x0\] section/);
});

const realChangelog = () => fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8');

const UNRELEASED = '## [Unreleased]\n';
// The line [Unreleased] carries until the first release; README step 2 deletes it.
const PLACEHOLDER = /^Nothing has been released yet\..*\n\n?/m;

/**
 * README "Releasing" step 2, as a maintainer does it: the placeholder line
 * goes, the [Unreleased] heading becomes the version's heading, and a fresh,
 * empty [Unreleased] goes above it. (Link references do not affect the notes.)
 */
function cutRelease(changelog, version, date) {
  assert.ok(changelog.includes(UNRELEASED), 'CHANGELOG.md has no [Unreleased] heading');
  return changelog.replace(PLACEHOLDER, '').replace(UNRELEASED, `${UNRELEASED}\n## [${version}] - ${date}\n`);
}

test('the real CHANGELOG.md has an [Unreleased] heading for the next release', () => {
  assert.ok(realChangelog().includes(UNRELEASED));
});

test('following the README release steps on the real CHANGELOG.md gives notes for that version', () => {
  // Whatever state the file is in, a release is only cut once [Unreleased]
  // has entries beyond the placeholder; add a sample entry when it has none.
  let current = realChangelog().replace(PLACEHOLDER, '');
  // An entry is any line that is neither a heading nor a link reference.
  if (!/^## \[Unreleased\]\n+(?!## |\[[^\]]+\]:\s)\S/m.test(current)) {
    current = current.replace(UNRELEASED, `${UNRELEASED}\n### Added\n\n- The next change.\n`);
  }
  const changelog = cutRelease(current, '9.9.9', '2026-12-01');
  const notes = releaseNotes({ changelog, tag: 'v9.9.9', version: '9.9.9' });
  assert.match(notes, /^### /);
  assert.doesNotMatch(notes, /Nothing has been released yet/);
  // The fresh [Unreleased] is empty, which only a pre-release would read.
  assert.throws(
    () => releaseNotes({ changelog, tag: 'v9.9.10-rc.1', version: '9.9.10-rc.1' }),
    /\[Unreleased\] section of CHANGELOG\.md is empty/
  );
});

test('the command line prints notes, or a one-line reason and exit code 1', () => {
  const script = path.join(__dirname, '..', 'scripts', 'release-notes.js');
  const version = require('../package.json').version;
  const wrong = spawnSync(process.execPath, [script, 'v9.9.9'], { encoding: 'utf8' });
  assert.equal(wrong.status, 1);
  assert.equal(wrong.stdout, '');
  assert.equal(wrong.stderr, `tag v9.9.9 does not match package.json version ${version}\n`);
  const missing = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /^Usage: node scripts\/release-notes\.js <tag>\n$/);
});
