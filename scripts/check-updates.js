// Real Settings UI and IPC, with an isolated profile and an offline updater.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { app, BrowserWindow, ipcMain } = require('electron');

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'token-huddle-updates-'));
app.setPath('userData', profile);
Object.defineProperty(app, 'isPackaged', { value: true });
fs.writeFileSync(path.join(profile, 'settings.json'), JSON.stringify({ onboarded: true, checkUpdates: false }));
delete process.env.TOKEN_HUDDLE_DEMO;
const instances = require('../src/main/instances');
instances.discover = async (saved) => ({ instances: saved, detected: {} });
instances.collect = async () => [];
instances.describe = async () => ({ cards: [], providers: [] });

let checks = 0;
let downloads = 0;
let installs = 0;
const updater = new EventEmitter();
updater.checkForUpdates = async () => {
  checks++;
  updater.emit('checking-for-update');
};
updater.downloadUpdate = async () => {
  downloads++;
  updater.emit('download-progress', { percent: 42 });
};
updater.quitAndInstall = () => installs++;
require.cache[require.resolve('electron-updater')] = { exports: { autoUpdater: updater } };
require('../src/main/main');

const output = path.join(__dirname, '..', 'coverage', 'manual-updates');
fs.mkdirSync(output, { recursive: true });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(predicate) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await predicate()) return;
    await wait(50);
  }
  throw new Error('Settings did not reach the expected state');
}
const timeout = setTimeout(() => app.exit(1), 20000);
app.whenReady().then(async () => {
  try {
    ipcMain.emit('huddle:open-settings');
    const settings = BrowserWindow.getAllWindows().find((win) => win.getTitle() === 'Token Huddle settings');
    await new Promise((resolve) => settings.once('ready-to-show', resolve));
    const js = (code) => settings.webContents.executeJavaScript(code);
    const click = () => js("document.getElementById('check-updates').click()");
    const status = () => js("document.getElementById('update-status').textContent");
    const hasStatus = (text) => until(async () => (await status()) === text);
    const capture = async (name) => {
      await js("document.getElementById('check-updates').scrollIntoView({block: 'center'})");
      await wait(100);
      fs.writeFileSync(path.join(output, `${name}.png`), (await settings.webContents.capturePage()).toPNG());
    };
    await until(() => js("!document.getElementById('check-updates').disabled"));
    await capture('idle');
    await click();
    await hasStatus('Checking for updates.');
    assert.equal(await js("document.getElementById('check-updates').disabled"), true);
    await js('window.huddle.settings.checkForUpdates()');
    assert.equal(checks, 1, 'Repeated requests must not start concurrent checks');
    updater.emit('update-not-available');
    await hasStatus('Token Huddle is up to date.');
    await capture('up-to-date');
    await click();
    await hasStatus('Checking for updates.');
    updater.emit('error', new Error('offline'));
    await hasStatus('Could not check for updates. Try again.');
    await click();
    await hasStatus('Checking for updates.');
    updater.emit('update-available', { version: '0.1.2' });
    await hasStatus('Version 0.1.2 is available.');
    await until(() => js("!document.getElementById('update-action').hidden"));
    assert.equal(downloads, 0, 'Checking must never download an update');
    await capture('available');
    await js("document.getElementById('update-action').click()");
    await hasStatus('Downloading version 0.1.2.');
    assert.equal(downloads, 1);
    updater.emit('update-downloaded');
    await until(() => installs === 1);
    assert.equal(await js("document.getElementById('auto-check-updates').checked"), false);
    console.log(
      'PASS: real Settings buttons, IPC, duplicate checks, current version, retry, explicit install, and unchanged automatic preference'
    );
    clearTimeout(timeout);
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
