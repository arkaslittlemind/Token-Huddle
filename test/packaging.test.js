// Guards for values that the app, package.json and the NSIS script must share.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const main = read('src/main/main.js');
const pkg = JSON.parse(read('package.json'));
const nsh = read('build/installer.nsh');

test('main.js uses the same app id as electron-builder', () => {
  const appId = main.match(/^const APP_ID = '([^']+)';$/m)?.[1];
  assert.equal(appId, 'com.arkaslittlemind.tokenhuddle');
  assert.equal(pkg.build.appId, appId);
});

test('the uninstaller passes the flag main.js listens for, and never during an upgrade', () => {
  assert.ok(main.includes("process.argv.includes('--uninstall-cleanup')"), 'main.js has no cleanup flag');
  assert.match(
    nsh,
    /!macro customUnInstall\s+\$\{ifNot\} \$\{isUpdated\}\s+ExecWait '"\$INSTDIR\\\$\{APP_EXECUTABLE_FILENAME\}" --uninstall-cleanup'/
  );
  assert.equal(pkg.build.nsis.include, 'build/installer.nsh');
});

test('Token Huddle keeps its data folder on uninstall', () => {
  // A linked user's own status line calls the script in that folder.
  assert.notEqual(pkg.build.nsis.deleteAppDataOnUninstall, true);
});
