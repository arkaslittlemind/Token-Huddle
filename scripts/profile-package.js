// Assemble a local directory build with a profiling entry point, never a release artifact.
const fs = require('node:fs');
const path = require('node:path');
const destination = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, '../coverage/profile-package');
if (fs.existsSync(destination))
  throw new Error('Profiling package already exists; choose a fresh workspace to rebuild');
const electronDir = path.dirname(require('electron'));
fs.cpSync(electronDir, destination, { recursive: true });
fs.renameSync(path.join(destination, 'electron.exe'), path.join(destination, 'Token Huddle Profile.exe'));
const appDir = path.join(destination, 'resources', 'app');
fs.mkdirSync(path.join(appDir, 'scripts'), { recursive: true });
fs.cpSync(path.join(__dirname, '../src'), path.join(appDir, 'src'), { recursive: true });
for (const file of ['profile-electron.js', 'performance-data.js'])
  fs.copyFileSync(path.join(__dirname, file), path.join(appDir, 'scripts', file));
const { version } = require('../package.json');
fs.writeFileSync(
  path.join(appDir, 'package.json'),
  JSON.stringify({ name: 'token-huddle-profile', version, main: 'scripts/profile-electron.js' })
);
console.log(path.join(destination, 'Token Huddle Profile.exe'));
