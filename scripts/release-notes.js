// Prints the release notes for a version tag, taken from CHANGELOG.md.
// The release workflow runs it before building, so a wrong tag or a missing
// changelog section stops the release early.
//
//   node scripts/release-notes.js v0.2.0
const fs = require('node:fs');
const path = require('node:path');

const HEADING = /^## \[([^\]]+)\](?:\s.*)?$/;
const LINK_REFERENCE = /^\[[^\]]+\]:\s/;

/**
 * The CHANGELOG.md section for this release, without its heading.
 * A pre-release (a version with "-", for example 0.1.0-rc.1) uses [Unreleased].
 * Throws with a one-line reason when the tag or the changelog is not ready.
 */
function releaseNotes({ changelog, tag, version }) {
  if (tag !== `v${version}`) throw new Error(`tag ${tag} does not match package.json version ${version}`);
  const name = version.includes('-') ? 'Unreleased' : version;
  const lines = changelog.split(/\r?\n/);
  const start = lines.findIndex((line) => HEADING.exec(line)?.[1] === name);
  if (start === -1) {
    const hint = name === 'Unreleased' ? '' : '; move [Unreleased] to it first';
    throw new Error(`CHANGELOG.md has no [${name}] section${hint}`);
  }
  const body = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('## ')) break;
    body.push(line);
  }
  // The last section runs into the file's link references; drop only those.
  while (body.length && (LINK_REFERENCE.test(body.at(-1)) || !body.at(-1).trim())) body.pop();
  const notes = body.join('\n').trim();
  if (!notes) throw new Error(`the [${name}] section of CHANGELOG.md is empty`);
  return notes;
}

if (require.main === module) {
  const tag = process.argv[2];
  if (!tag) {
    process.stderr.write('Usage: node scripts/release-notes.js <tag>\n');
    process.exit(1);
  }
  const root = path.join(__dirname, '..');
  try {
    const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
    process.stdout.write(`${releaseNotes({ changelog, tag, version })}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

module.exports = { releaseNotes };
