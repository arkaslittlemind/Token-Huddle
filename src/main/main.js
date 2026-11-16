const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  nativeImage,
  nativeTheme,
  screen,
  dialog,
  clipboard,
  Notification,
  globalShortcut,
  shell,
} = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { iconPixels } = require('./icon');
const registry = require('./providers');
const { discover, collect, describe, welcome, addAccount, removeAccount, move } = require('./instances');
const { sanitizeAppearance } = require('./appearance');
const alerts = require('./alerts');
const { isVisible, corner, snap, contain } = require('./placement');
const { disconnectAll } = require('./cleanup');
const updates = require('./updates');
// package.json ships in the app; app.getVersion() can report Electron's own version when run from a script.
const { version: VERSION } = require('../../package.json');

// Permanent identity: Windows ties toasts, the uninstall entry and the
// "Start with Windows" entry to it. Must equal `build.appId` in package.json.
const APP_ID = 'com.arkaslittlemind.tokenhuddle';
// The uninstaller starts the app with this flag to undo Connect, then it exits.
const CLEANUP = process.argv.includes('--uninstall-cleanup');
const CLEANUP_TIMEOUT_MS = 10 * 1000;
// The widget's width at 100%; the Size option scales it with the page zoom.
const WIDTH = 316;
const REFRESH_MS = 60 * 1000;
const HOTKEY = 'CommandOrControl+Alt+H';
const HOTKEY_LABEL = 'Ctrl+Alt+H';
const DEMO = process.argv.includes('--demo') || process.env.TOKEN_HUDDLE_DEMO === '1';
// Forces local-only for one run without touching the saved setting.
const FORCE_LOCAL = process.env.TOKEN_HUDDLE_LOCAL_ONLY === '1';

app.setName('Token Huddle');
// Only the packaged app has a Start menu shortcut carrying this id; unpackaged,
// setting it could stop toasts. Cleanup mode sets it too: the login item's
// registry entry is named after it.
if (app.isPackaged) app.setAppUserModelId(APP_ID);

let win = null;
let settingsWin = null;
let tray = null;
let settings = {
  x: null,
  y: null,
  alwaysOnTop: true,
  compact: false,
  localOnly: false,
  checkUpdates: true,
  ...sanitizeAppearance({}),
  thresholds: alerts.sanitizeThresholds(),
  alertsSent: {},
  instances: [],
};
let providers = [];
// False until the first refresh has finished, so "loading" and "no cards shown" differ.
let ready = false;
// Which tools discover() found on this machine, by provider id (for the first-run welcome).
let detected = {};
let refreshing = false;
// False when another app already holds HOTKEY; the tray menu says so.
let hotkeyReady = false;
let saveTimer = null;

// ---------------------------------------------------------------- settings

function settingsFile() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function loadSettings() {
  let saved = null;
  let firstRun = false;
  try {
    saved = JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
  } catch (error) {
    // Only a missing file is a first run; an unreadable one belongs to an existing user.
    firstRun = error?.code === 'ENOENT';
  }
  if (saved && typeof saved === 'object') settings = { ...settings, ...saved };
  Object.assign(settings, sanitizeAppearance(settings));
  settings.thresholds = alerts.sanitizeThresholds(settings.thresholds);
  // On unless the user turned it off; anything else in the file reads as on.
  settings.checkUpdates = typeof settings.checkUpdates === 'boolean' ? settings.checkUpdates : true;
  settings.alertsSent = alerts.sanitizeSent(settings.alertsSent);
  // The first-run welcome shows once. A settings file without the field is an existing user.
  settings.onboarded = typeof saved?.onboarded === 'boolean' ? saved.onboarded : !firstRun;
}

/** Ends the first-run welcome for good. Safe to call more than once. */
function finishOnboarding() {
  if (settings.onboarded) return;
  settings.onboarded = true;
  saveSettings();
  pushSettings();
}

/**
 * The theme the windows draw: 'dark' or 'light'. 'system' follows the Windows app mode.
 * nativeTheme.themeSource stays 'system' on purpose: forcing it would also change
 * shouldUseDarkColorsForSystemIntegratedUI, and the tray icon must follow the taskbar.
 */
function resolvedTheme() {
  if (settings.theme !== 'system') return settings.theme;
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

const settingsBackground = () => (resolvedTheme() === 'dark' ? '#13141a' : '#f6fcfe');

function setAppearance(key, value) {
  settings[key] = value;
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.setBackgroundColor(settingsBackground());
  saveSettings();
  push();
}

/** Where Token Huddle keeps what the tools hand it (for example Claude Code's usage snapshot). */
function dataDir() {
  return path.join(app.getPath('userData'), 'bridge');
}

function saveSettings() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
      fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2));
    } catch {
      /* settings are a convenience; never crash over them */
    }
  }, 300);
}

// ------------------------------------------------------------------ window

const widgetWidth = () => Math.round((WIDTH * settings.size) / 100);

const workAreas = () => screen.getAllDisplays().map((display) => display.workArea);
const workAreaOf = (bounds) => screen.getDisplayMatching(bounds).workArea;
const homeCorner = (height) => corner(screen.getPrimaryDisplay().workArea, widgetWidth(), height);

/** A user-placed widget that is no longer on any screen is forgotten, so it pins to the corner again. */
function forgetIfLost(bounds) {
  if (settings.x === null || isVisible(bounds, workAreas())) return;
  [settings.x, settings.y] = [null, null];
  saveSettings();
}

/** Where the widget opens: the saved spot if it is still on a screen, otherwise the corner. */
function startPosition(height) {
  forgetIfLost({ x: settings.x, y: settings.y, width: widgetWidth(), height });
  return settings.x === null ? homeCorner(height) : { x: settings.x, y: settings.y };
}

function savePosition({ x, y }) {
  if (settings.x === x && settings.y === y) return;
  [settings.x, settings.y] = [x, y];
  saveSettings();
}

/**
 * After a monitor, resolution, scaling or taskbar change, and before the widget
 * is shown: pinned widgets follow the corner, lost ones go back to it, others
 * stay inside their screen. Width is re-applied because a scaling change can
 * leave a frameless window at the wrong size.
 */
function keepInView() {
  if (!win || win.isDestroyed()) return;
  const bounds = { ...win.getBounds(), width: widgetWidth() };
  let next;
  forgetIfLost(bounds);
  if (settings.x === null) {
    next = { ...bounds, ...homeCorner(bounds.height) };
  } else {
    next = contain(bounds, workAreaOf(bounds));
    savePosition(next);
  }
  win.setBounds(next);
}

function createWindow() {
  const height = 320;
  win = new BrowserWindow({
    ...startPosition(height),
    width: widgetWidth(),
    height,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    alwaysOnTop: settings.alwaysOnTop,
    icon: windowIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
    },
  });
  if (settings.alwaysOnTop) win.setAlwaysOnTop(true, 'floating');
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.once('ready-to-show', () => win.show());
  // Fires when a drag ends: snap to a nearby edge and keep the widget on its screen.
  win.on('moved', () => {
    const bounds = { ...win.getBounds(), width: widgetWidth() };
    const area = workAreaOf(bounds);
    const placed = contain(snap(bounds, area), area);
    if (placed.x !== bounds.x || placed.y !== bounds.y) win.setBounds(placed);
    savePosition(placed);
  });
  win.on('closed', () => {
    win = null;
  });
}

function showWidget() {
  if (!win) return createWindow();
  keepInView();
  win.show();
}

function toggleWindow() {
  if (win?.isVisible()) win.hide();
  else showWidget();
}

// -------------------------------------------------------------------- data

function snapshot() {
  return {
    ready,
    providers,
    compact: settings.compact,
    theme: resolvedTheme(),
    style: settings.style,
    size: settings.size,
    demo: DEMO,
    localOnly: settings.localOnly || FORCE_LOCAL,
  };
}

function push() {
  if (win && !win.isDestroyed()) win.webContents.send('huddle:update', snapshot());
  if (tray) tray.setToolTip(tooltip());
  pushSettings();
}

async function settingsState() {
  const state = {
    ...(await describe({ instances: settings.instances, dataDir: dataDir() })),
    theme: resolvedTheme(),
    thresholds: settings.thresholds,
    updates: { version: VERSION, enabled: settings.checkUpdates, ...updateView() },
  };
  if (!settings.onboarded) state.welcome = welcome({ detected, cards: state.cards });
  return state;
}

async function pushSettings() {
  if (!settingsWin || settingsWin.isDestroyed()) return;
  settingsWin.webContents.send('settings:update', await settingsState());
}

async function refresh(force = false) {
  if (refreshing) return;
  refreshing = true;
  try {
    // Probing on every pass lets a newly installed tool show up without a restart.
    const found = await discover(settings.instances);
    detected = found.detected;
    if (JSON.stringify(found.instances) !== JSON.stringify(settings.instances)) {
      settings.instances = found.instances;
      saveSettings();
    }
    providers = await collect({
      instances: settings.instances,
      dataDir: dataDir(),
      demoMode: DEMO,
      localOnly: settings.localOnly || FORCE_LOCAL,
      force,
    });
    ready = true;
    if (!DEMO) notify();
  } finally {
    refreshing = false;
  }
  push();
}

// Held until closed: a notification that is garbage-collected loses its click handler.
const shown = new Set();

function notify() {
  // Without notifications nothing is recorded as sent, so alerts still fire once they work.
  if (!Notification.isSupported()) return;
  const result = alerts.check({
    readings: providers,
    instances: settings.instances,
    thresholds: settings.thresholds,
    sent: settings.alertsSent,
    now: Date.now(),
  });
  if (JSON.stringify(result.sent) !== JSON.stringify(settings.alertsSent)) {
    settings.alertsSent = result.sent;
    saveSettings();
  }
  for (const { title, body } of result.notifications) {
    try {
      const note = new Notification({ title, body, icon: windowIcon() });
      shown.add(note);
      note.on('click', showWidget);
      note.on('close', () => shown.delete(note));
      note.show();
    } catch {
      /* an alert that cannot be shown must not stop the widget updating */
    }
  }
}

function tooltip() {
  const parts = providers
    .filter((p) => p.windows?.length)
    .map((p) => `${p.name} ${p.windows.map((w) => `${Math.round(w.usedPercent)}%`).join(' / ')}`);
  return ['Token Huddle', ...parts].join('\n').slice(0, 127);
}

// -------------------------------------------------------------------- tray

/**
 * The mark (src/renderer/mark.js) as an image with 1x and 2x pixels. Icons are
 * drawn in code, so the project ships no icon files.
 */
function markImage(size, colourway) {
  const image = nativeImage.createEmpty();
  for (const scaleFactor of [1, 2]) {
    const { width, height, buffer } = iconPixels(size * scaleFactor, colourway);
    image.addRepresentation({ scaleFactor, width, height, buffer });
  }
  return image;
}

/** The tray sits on the taskbar, so it follows the taskbar's light or dark theme. */
function trayIcon() {
  const dark = nativeTheme.shouldUseDarkColorsForSystemIntegratedUI ?? nativeTheme.shouldUseDarkColors;
  return markImage(16, dark ? 'dark' : 'light');
}

const windowIcon = () => markImage(32, 'tile');

function loginItemOptions() {
  // The portable build runs from a temporary unpacked copy; register the real .exe.
  if (process.env.PORTABLE_EXECUTABLE_FILE) return { path: process.env.PORTABLE_EXECUTABLE_FILE };
  // Unpackaged, the executable is electron.exe and needs the app path as an argument.
  return app.isPackaged ? {} : { path: process.execPath, args: [app.getAppPath()] };
}

function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) return settingsWin.focus();
  settingsWin = new BrowserWindow({
    width: 480,
    height: 700,
    minWidth: 400,
    minHeight: 420,
    title: 'Token Huddle settings',
    backgroundColor: settingsBackground(),
    icon: windowIcon(),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
    },
  });
  settingsWin.removeMenu();
  settingsWin.loadFile(path.join(__dirname, '..', 'renderer', 'settings.html'));
  settingsWin.once('ready-to-show', () => settingsWin.show());
  settingsWin.on('closed', () => {
    settingsWin = null;
    // Closing the window during the first-run welcome counts as finishing it.
    finishOnboarding();
  });
}

/** A radio submenu for one appearance setting; `choices` are [value, label] pairs. */
function appearanceMenu(label, key, choices) {
  return {
    label,
    submenu: choices.map(([value, text]) => ({
      label: text,
      type: 'radio',
      checked: settings[key] === value,
      click: () => setAppearance(key, value),
    })),
  };
}

// ----------------------------------------------------------------- updates

// The portable build runs from a temporary copy and cannot replace itself.
const PORTABLE = Boolean(process.env.PORTABLE_EXECUTABLE_FILE);
let update = updates.INITIAL;
// electron-updater's autoUpdater, loaded only when a check may run.
let updater = null;
let updateTimers = [];

const checksAllowed = () =>
  updates.shouldCheck({ packaged: app.isPackaged, enabled: settings.checkUpdates, demo: DEMO });

function updateView() {
  return updates.present(update, { portable: PORTABLE, packaged: app.isPackaged, enabled: settings.checkUpdates });
}

function setUpdate(event) {
  const next = updates.reduce(update, event);
  if (next === update) return;
  update = next;
  push();
}

function loadUpdater() {
  if (updater) return updater;
  const { autoUpdater } = require('electron-updater');
  // Nothing downloads or installs without a click; failures are shown by state, not logged.
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.logger = null;
  autoUpdater.on('checking-for-update', () => setUpdate({ type: 'checking' }));
  autoUpdater.on('update-available', (info) => setUpdate({ type: 'available', version: info?.version }));
  autoUpdater.on('update-not-available', () => setUpdate({ type: 'not-available' }));
  autoUpdater.on('download-progress', (progress) => setUpdate({ type: 'progress', percent: progress?.percent }));
  autoUpdater.on('update-downloaded', () => {
    setUpdate({ type: 'downloaded' });
    // Only an install the user started, still wanted, goes ahead: silent, then reopen the app.
    if (update.status === 'ready' && !PORTABLE) setImmediate(() => autoUpdater.quitAndInstall(true, true));
  });
  autoUpdater.on('error', () => setUpdate({ type: 'error' }));
  updater = autoUpdater;
  return updater;
}

function checkForUpdates() {
  if (!checksAllowed() || updates.isBusy(update)) return;
  try {
    loadUpdater()
      .checkForUpdates()
      .catch(() => setUpdate({ type: 'error' }));
  } catch {
    setUpdate({ type: 'error' });
  }
}

/** Checks after `delay` ms, then every CHECK_INTERVAL_MS; none when checks are off. */
function scheduleUpdateChecks(delay) {
  for (const timer of updateTimers) clearTimeout(timer);
  updateTimers = [];
  if (!checksAllowed()) return;
  updateTimers = [setTimeout(checkForUpdates, delay), setInterval(checkForUpdates, updates.CHECK_INTERVAL_MS)];
}

function setCheckUpdates(on) {
  settings.checkUpdates = Boolean(on);
  saveSettings();
  if (!settings.checkUpdates) setUpdate({ type: 'disabled' });
  // Turning checks on checks at once.
  scheduleUpdateChecks(0);
  push();
}

/** What the tray item or the Settings button does: install, or open the release page. Returns false when there is nothing to do. */
function runUpdateAction() {
  const { action } = updateView();
  if (action === 'open-release') {
    const url = updates.releaseUrl(update.version);
    if (!url) return false;
    shell.openExternal(url);
    return true;
  }
  if (action === 'install' && !PORTABLE && updater) {
    setUpdate({ type: 'install-clicked' });
    updater.downloadUpdate().catch(() => setUpdate({ type: 'error' }));
    return true;
  }
  return false;
}

function updateMenuItems() {
  const { label, clickable } = updateView();
  return label ? [{ label, enabled: clickable, click: runUpdateAction }] : [];
}

function buildMenu() {
  const openAtLogin = app.getLoginItemSettings(loginItemOptions()).openAtLogin;
  return Menu.buildFromTemplate([
    {
      label: hotkeyReady ? `Show or hide: ${HOTKEY_LABEL}` : `Hotkey ${HOTKEY_LABEL} is in use by another app`,
      enabled: false,
    },
    { label: win?.isVisible() ? 'Hide widget' : 'Show widget', click: toggleWindow },
    { label: 'Refresh now', click: () => refresh(true) },
    ...updateMenuItems(),
    { label: 'Settings…', click: openSettings },
    { type: 'separator' },
    {
      label: 'Always on top',
      type: 'checkbox',
      checked: settings.alwaysOnTop,
      click: (item) => {
        settings.alwaysOnTop = item.checked;
        win?.setAlwaysOnTop(item.checked, 'floating');
        saveSettings();
      },
    },
    {
      label: 'Compact view',
      type: 'checkbox',
      checked: settings.compact,
      click: (item) => {
        settings.compact = item.checked;
        saveSettings();
        push();
      },
    },
    appearanceMenu('Theme', 'theme', [
      ['system', 'System'],
      ['light', 'Light'],
      ['dark', 'Dark'],
    ]),
    appearanceMenu('Style', 'style', [
      ['solid', 'Solid'],
      ['translucent', 'Translucent'],
    ]),
    appearanceMenu('Size', 'size', [
      [100, '100%'],
      [115, '115%'],
      [130, '130%'],
    ]),
    {
      label: 'Local files only (do not ask Codex for live limits)',
      type: 'checkbox',
      checked: settings.localOnly,
      click: (item) => {
        settings.localOnly = item.checked;
        saveSettings();
        refresh(true);
      },
    },
    {
      label: 'Start with Windows',
      type: 'checkbox',
      checked: openAtLogin,
      click: (item) => app.setLoginItemSettings({ ...loginItemOptions(), openAtLogin: item.checked }),
    },
    {
      label: 'Check for updates',
      type: 'checkbox',
      checked: settings.checkUpdates,
      click: (item) => setCheckUpdates(item.checked),
    },
    { type: 'separator' },
    { label: 'Quit Token Huddle', click: () => app.quit() },
  ]);
}

function createTray() {
  tray = new Tray(trayIcon());
  nativeTheme.on('updated', () => tray && !tray.isDestroyed() && tray.setImage(trayIcon()));
  tray.setToolTip('Token Huddle');
  tray.on('click', toggleWindow);
  tray.on('right-click', () => tray.popUpContextMenu(buildMenu()));
}

// --------------------------------------------------------------------- ipc

ipcMain.handle('huddle:get', () => snapshot());
ipcMain.on('huddle:refresh', () => refresh(true));
ipcMain.on('huddle:hide', () => win?.hide());
ipcMain.on('huddle:menu', () => buildMenu().popup({ window: win }));
ipcMain.on('huddle:toggle-compact', () => {
  settings.compact = !settings.compact;
  saveSettings();
  push();
});
ipcMain.on('huddle:resize', (_event, height) => {
  if (!win || !Number.isFinite(height)) return;
  const size = Math.max(60, Math.min(1200, Math.ceil(height)));
  const [x, y] = win.getPosition();
  let bounds = { x, y, width: widgetWidth(), height: size };
  // Until the user drags it somewhere, keep the widget pinned to the bottom-right corner.
  if (settings.x === null) bounds = { ...bounds, ...homeCorner(size) };
  else {
    // A taller view grows upward from the bottom edge instead of going under the taskbar.
    bounds = contain(bounds, workAreaOf(bounds));
    savePosition(bounds);
  }
  win.setBounds(bounds);
});

// ---------------------------------------------------------------- settings ipc

ipcMain.on('huddle:open-settings', openSettings);
ipcMain.handle('settings:get', () => settingsState());
ipcMain.handle('settings:finish-onboarding', () => {
  finishOnboarding();
  return { ok: true };
});

/** Run a settings change, save, refresh the widget, and report { ok, error }. */
function handle(channel, action) {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      const result = await action(...args);
      saveSettings();
      await refresh(true);
      return { ok: true, ...result };
    } catch (error) {
      return { ok: false, error: String(error?.message || error) };
    }
  });
}

function bridgeContext(key) {
  const instance = settings.instances.find((i) => i.key === key);
  const provider = instance && registry.get(instance.provider);
  if (!provider?.connection) throw new Error('This card has nothing to connect');
  return { provider, context: { options: instance.options, key: instance.key, dataDir: dataDir() } };
}

handle('settings:set-enabled', (key, enabled) => {
  const instance = settings.instances.find((i) => i.key === key);
  if (instance) instance.enabled = Boolean(enabled);
});
handle('settings:set-alerts', (key, on) => {
  const instance = settings.instances.find((i) => i.key === key);
  if (!instance) throw new Error('Unknown card');
  instance.alerts = Boolean(on);
});
handle('settings:set-thresholds', (values) => {
  const result = alerts.parseThresholds(values);
  if (!result.ok) throw new Error(result.error);
  settings.thresholds = result.thresholds;
});
handle('settings:move', (key, direction) => {
  settings.instances = move(settings.instances, key, direction);
});
handle('settings:remove', async (key) => {
  const instance = settings.instances.find((i) => i.key === key);
  const provider = instance && registry.get(instance.provider);
  // Leave the tool's own settings clean before forgetting the account.
  if (provider?.connection && key !== instance.provider) {
    await provider.connection.disconnect({ options: instance.options, key, dataDir: dataDir() }).catch(() => {});
  }
  settings.instances = removeAccount(settings.instances, key);
});
handle('settings:add', async (account) => {
  settings.instances = await addAccount(settings.instances, account || {});
});
handle('settings:disconnect', async (key) => {
  const { provider, context } = bridgeContext(key);
  await provider.connection.disconnect(context);
});
handle('settings:connect', async (key) => {
  const { provider, context } = bridgeContext(key);
  const plan = provider.connection.plan(context);
  // The change is made in another program's settings, so it is shown in full first.
  const { response } = await dialog.showMessageBox(settingsWin, {
    type: 'question',
    buttons: ['Connect', 'Cancel'],
    defaultId: 0,
    cancelId: 1,
    title: 'Token Huddle',
    message: `Connect ${provider.name}?`,
    detail: [
      `Token Huddle will add a status line to ${provider.name}'s own settings file:`,
      plan.file,
      '',
      JSON.stringify(plan.adds, null, 2),
      '',
      `After each response, ${provider.name} runs that script. It saves your session and weekly usage percentages to a file for the widget. It reads nothing else and sends nothing anywhere.`,
      '',
      'A copy of your current settings is kept at:',
      plan.backup,
      '',
      'Disconnect undoes this.',
    ].join('\n'),
  });
  if (response !== 0) return { cancelled: true };
  await provider.connection.connect(context);
});

handle('settings:link', async (key) => {
  if (typeof key !== 'string') throw new Error('Unknown card');
  const { provider, context } = bridgeContext(key);
  if (!provider.connection.link) throw new Error('This card has nothing to link');
  const { prefix, file } = await provider.connection.link(context);
  // The user pastes it inside a JSON string in settings.json, so copy it already escaped.
  const text = JSON.stringify(prefix).slice(1, -1);
  clipboard.writeText(text);
  return { prefix: text, file };
});

ipcMain.handle('settings:set-check-updates', (_event, on) => {
  if (typeof on !== 'boolean') return { ok: false, error: 'Expected on or off' };
  setCheckUpdates(on);
  return { ok: true };
});
ipcMain.handle('settings:update-action', () =>
  runUpdateAction() ? { ok: true } : { ok: false, error: 'There is no update to install right now.' }
);
ipcMain.handle('settings:pick-folder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(settingsWin, {
    title: 'Choose the folder this account keeps its data in',
    properties: ['openDirectory', 'showHiddenFiles'],
  });
  return canceled ? null : filePaths[0];
});

// --------------------------------------------------------------- lifecycle

/**
 * Uninstall: disconnect every card and turn off "Start with Windows", then exit.
 * No window, tray or hotkey. Always exits 0 and within a time limit, so it can
 * never block or fail the uninstaller.
 */
function runCleanup() {
  setTimeout(() => app.exit(0), CLEANUP_TIMEOUT_MS);
  app.whenReady().then(async () => {
    try {
      loadSettings();
      await disconnectAll({ instances: settings.instances, registry, dataDir: dataDir() });
    } catch {
      /* unreadable settings: still turn off the login item below */
    }
    try {
      app.setLoginItemSettings({ ...loginItemOptions(), openAtLogin: false });
    } catch {
      /* best effort */
    }
    app.exit(0);
  });
}

if (CLEANUP) {
  runCleanup();
} else if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showWidget);
  app.whenReady().then(() => {
    loadSettings();
    createWindow();
    createTray();
    scheduleUpdateChecks(updates.CHECK_DELAY_MS);
    try {
      hotkeyReady = globalShortcut.register(HOTKEY, toggleWindow);
    } catch {
      hotkeyReady = false;
    }
    for (const event of ['display-added', 'display-removed', 'display-metrics-changed']) {
      screen.on(event, keepInView);
    }
    // Windows app mode changed: the 'system' theme follows it.
    nativeTheme.on('updated', () => {
      if (settings.theme !== 'system') return;
      if (settingsWin && !settingsWin.isDestroyed()) settingsWin.setBackgroundColor(settingsBackground());
      push();
    });
    // On a first run, the settings window opens with the welcome once tools are detected.
    refresh().then(() => {
      if (!settings.onboarded) openSettings();
    });
    setInterval(refresh, REFRESH_MS);
  });
  // The widget lives in the tray; closing or hiding the window does not quit.
  app.on('window-all-closed', () => {});
  app.on('will-quit', () => globalShortcut.unregisterAll());
}
