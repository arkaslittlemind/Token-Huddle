// Capture the widget to a PNG, then quit.
//   npm run screenshot -- out.png                 (demo data)
//   npm run screenshot -- out.png --real          (your real data)
//   npm run screenshot -- out.png --settings      (also saves out-settings.png)
//   npm run screenshot -- out.png --theme=light --style=translucent --size=130
//                                                 (appearance; defaults: dark, solid, 100)
//   npm run screenshot -- out.png --view=compact  (compact widget; default: full)
//   npm run screenshot -- out.png --onboarding    (first-run welcome in out-settings.png)
const fs = require('node:fs');
const path = require('node:path');
const { app, ipcMain } = require('electron');
const { sanitizeAppearance } = require('../src/main/appearance');

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const out = path.resolve(args[args.length - 1] || 'screenshot.png');
const onboarding = process.argv.includes('--onboarding');
const withSettings = onboarding || process.argv.includes('--settings');
if (!process.argv.includes('--real')) process.env.TOKEN_HUDDLE_DEMO = '1';

/** The value of a --name=value flag, or undefined. */
const flag = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

// A separate profile: never touches your real settings, and works while the app is running.
const profile = path.join(app.getPath('temp'), 'token-huddle-screenshot');
app.setPath('userData', profile);

// Every run sets the appearance fields and the welcome flag, so one run's choice never leaks into the next.
const file = path.join(profile, 'settings.json');
let saved = {};
try {
  saved = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch {
  /* first run */
}
const size = flag('size');
const appearance = sanitizeAppearance({ theme: flag('theme'), style: flag('style'), size: size && Number(size) });
fs.mkdirSync(profile, { recursive: true });
const compact = flag('view') === 'compact';
fs.writeFileSync(file, JSON.stringify({ ...saved, ...appearance, compact, onboarded: !onboarding }, null, 2));

require('../src/main/main.js');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const windows = [];
app.on('browser-window-created', (_event, win) => windows.push(win));

app.whenReady().then(async () => {
  await wait(4500); // time for the first reading
  if (withSettings) {
    ipcMain.emit('huddle:open-settings');
    await wait(2000);
  }
  for (const [index, win] of windows.entries()) {
    const file = index === 0 ? out : out.replace(/\.png$/i, '') + '-settings.png';
    fs.writeFileSync(file, (await win.webContents.capturePage()).toPNG());
    console.log(`saved ${file} ${JSON.stringify(win.getBounds())}`);
  }
  app.quit();
});
