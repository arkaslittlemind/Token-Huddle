// Exercise the real Electron window with demo data and an isolated profile.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app, BrowserWindow, Tray, ipcMain } = require('electron');

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'token-huddle-visibility-'));
app.setPath('userData', profile);
process.env.TOKEN_HUDDLE_DEMO = '1';
fs.writeFileSync(path.join(profile, 'settings.json'), JSON.stringify({ onboarded: true, alwaysOnTop: false }));
let trayClick;
const on = Tray.prototype.on;
Tray.prototype.on = function (event, listener) {
  if (event === 'click') trayClick = listener;
  return on.call(this, event, listener);
};
require('../src/main/main');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const timeout = setTimeout(() => app.exit(1), 20000);
app.whenReady().then(async () => {
  try {
    const widget = BrowserWindow.getAllWindows()[0];
    if (!widget.isVisible()) await new Promise((resolve) => widget.once('ready-to-show', resolve));
    trayClick();
    assert.equal(widget.isVisible(), true, 'Tray click must reveal an already open widget');
    assert.equal(widget.isAlwaysOnTop(), true, 'Legacy disabled setting must not let other apps cover the widget');
    ipcMain.emit('huddle:hide');
    assert.equal(widget.isVisible(), false, 'Explicit hide must dismiss the widget');
    trayClick();
    assert.equal(widget.isVisible(), true, 'One tray click must reopen a hidden widget');
    trayClick();
    assert.equal(widget.isVisible(), true, 'Repeated tray clicks must keep the widget open');
    const other = new BrowserWindow({ width: 500, height: 400 });
    other.show();
    other.focus();
    await wait(300);
    assert.equal(widget.isVisible(), true, 'Switching focus must keep the widget visible');
    assert.equal(widget.isAlwaysOnTop(), true, 'Switching focus must preserve always on top');
    const bounds = widget.getBounds();
    widget.setPosition(bounds.x - 50, bounds.y - 50);
    assert.notDeepEqual(widget.getBounds(), bounds, 'Widget must remain movable');
    console.log('PASS: tray reveal, legacy settings, explicit hide, focus changes, and window movement');
    clearTimeout(timeout);
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
