// Developer-only entry point; all provider paths are synthetic and explicit.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { performance, monitorEventLoopDelay } = require('node:perf_hooks');
const { app, Tray, ipcMain, screen } = require('electron');
const { fixtures } = require('./performance-data');

const flag = (name, fallback) =>
  process.argv
    .find((arg) => arg.startsWith(`--${name}=`))
    ?.split('=')
    .slice(1)
    .join('=') ?? fallback;
const output = path.resolve(flag('out', 'coverage/performance/run.json'));
const workload = flag('workload', 'small');
const duration = Number(flag('duration', '65'));
if (!Number.isFinite(duration) || duration < 5 || duration > 180) throw new Error('Duration must be 5..180 seconds');
const root = process.env.HUDDLE_PROFILE_ROOT || fs.mkdtempSync(path.join(os.tmpdir(), 'huddle-performance-'));
app.setPath('userData', path.join(root, 'profile'));
fs.mkdirSync(app.getPath('userData'));
delete process.env.TOKEN_HUDDLE_DEMO;
process.env.TOKEN_HUDDLE_LOCAL_ONLY = '1';
const dataset = process.env.HUDDLE_PROFILE_FIXTURE
  ? JSON.parse(fs.readFileSync(process.env.HUDDLE_PROFILE_FIXTURE, 'utf8'))
  : fixtures(path.join(root, 'fixtures'), workload);
const scenario = flag('scenario', 'full');
if (!['full', 'compact', 'settings', 'hidden'].includes(scenario)) throw new Error('Unknown scenario');
fs.writeFileSync(
  path.join(app.getPath('userData'), 'settings.json'),
  JSON.stringify({
    onboarded: true,
    checkUpdates: false,
    localOnly: true,
    compact: scenario === 'compact',
    instances: dataset.instances,
  })
);
const started = performance.now();
const result = {
  schemaVersion: 1,
  workload,
  scenario,
  duration,
  fixture: dataset.manifest,
  build: app.isPackaged ? 'packaged profiling build' : 'unpackaged profiling entry',
  version: require('../package.json').version,
  commit: process.env.HUDDLE_PROFILE_COMMIT || 'unknown',
  environment: {
    platform: os.platform(),
    release: os.release(),
    cpu: os.cpus()[0]?.model,
    logicalCpus: os.cpus().length,
    ramMB: os.totalmem() / 1e6,
    electron: process.versions.electron,
    node: process.versions.node,
    powerMode: 'unknown (record externally)',
    scaling: null,
  },
  refreshes: [],
  providers: [],
  resources: [],
  renderer: [],
  resizeIPC: 0,
};
const delay = monitorEventLoopDelay({ resolution: 10 });
delay.enable();
const instances = require('../src/main/instances');
const registry = require('../src/main/providers');
const allowed = new Set(dataset.instances.map((item) => item.options.home));
instances.discover = async (saved) => {
  assert.deepEqual(
    saved.map((item) => item.options.home),
    dataset.instances.map((item) => item.options.home)
  );
  return { instances: saved, detected: { claude: true, codex: true, opencode: true } };
};
for (const provider of registry.providers) {
  const read = provider.read;
  provider.read = async (context) => {
    assert(allowed.has(context.options.home), 'Only generated provider folders may be read');
    assert(context.localOnly, 'Real Codex execution must stay disabled');
    const start = performance.now();
    const pending = read({ ...context, now: dataset.now });
    const synchronousMs = performance.now() - start;
    const reading = await pending;
    result.providers.push({
      key: context.key,
      force: context.force,
      ms: performance.now() - start,
      state: reading.state,
      synchronousMs,
    });
    assert.equal(reading.state, 'ok', `${context.key} fixture must be readable`);
    if (provider.id !== 'codex') {
      const expected = dataset.manifest.find((item) => item.key === context.key).expectedTokens;
      const { compactNumber } = require('../src/main/providers/util');
      assert.equal(reading.stats.find((item) => item.label === '30 days').value, compactNumber(expected));
    }
    return reading;
  };
}
const collect = instances.collect;
instances.collect = async (context) => {
  const start = performance.now();
  const readings = await collect(context);
  assert(
    readings.every((reading) => reading.state === 'ok'),
    'All synthetic readings must pass validation'
  );
  result.refreshes.push({ force: context.force, ms: performance.now() - start });
  return readings;
};
let trayClick;
const on = Tray.prototype.on;
Tray.prototype.on = function (event, listener) {
  if (event === 'click') trayClick = listener;
  return on.call(this, event, listener);
};
const windows = [];
app.on('browser-window-created', (_event, win) => {
  windows.push(win);
  win.once('show', () => {
    if (result.visibleMs === undefined) {
      result.visibleMs = performance.now() - started;
      result.launchToVisibleMs = process.env.HUDDLE_PROFILE_LAUNCH
        ? Date.now() - Number(process.env.HUDDLE_PROFILE_LAUNCH)
        : null;
    }
  });
  const send = win.webContents.send.bind(win.webContents);
  if (windows.length === 1)
    win.webContents.once('did-finish-load', async () => {
      try {
        await win.webContents.executeJavaScript(`new Promise(resolve => {
        const check = async () => {
          const current = await window.huddle.get();
          if (current.ready && document.querySelectorAll('#providers > *').length === 6)
            requestAnimationFrame(() => requestAnimationFrame(resolve));
          else setTimeout(check, 10);
        }; check();
      })`);
        result.firstDataPaintMs = performance.now() - started;
        result.launchToDataPaintMs = process.env.HUDDLE_PROFILE_LAUNCH
          ? Date.now() - Number(process.env.HUDDLE_PROFILE_LAUNCH)
          : null;
      } catch (error) {
        result.firstDataPaintError = error.message;
      }
    });
  win.webContents.send = (channel, ...args) => {
    if (channel === 'huddle:update' && args[0]?.ready && result.firstDataDispatchMs === undefined)
      result.firstDataDispatchMs = performance.now() - started;
    return send(channel, ...args);
  };
});
ipcMain.on('huddle:resize', () => result.resizeIPC++);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const timeout = setTimeout(
  () => {
    console.error('Profiling timed out');
    app.exit(1);
  },
  (duration + 45) * 1000
);
require('../src/main/main');

async function metrics(win) {
  if (!win.webContents.debugger.isAttached()) {
    win.webContents.debugger.attach('1.3');
    await win.webContents.debugger.sendCommand('Performance.enable');
  }
  const response = await win.webContents.debugger.sendCommand('Performance.getMetrics');
  return Object.fromEntries(response.metrics.map((item) => [item.name, item.value]));
}

app.whenReady().then(async () => {
  try {
    result.environment.scaling = screen.getAllDisplays().map((display) => display.scaleFactor);
    while (!result.refreshes.length || !windows[0]?.isVisible() || !result.firstDataPaintMs) await wait(20);
    const widget = windows[0];
    if (scenario === 'settings') {
      ipcMain.emit('huddle:open-settings');
      await wait(500);
    }
    if (scenario === 'hidden') ipcMain.emit('huddle:hide');
    await wait(500);
    for (const win of windows) await metrics(win);
    for (const win of windows)
      result.renderer.push({ phase: 'start', type: win === widget ? 'widget' : 'settings', ...(await metrics(win)) });
    const observationStart = performance.now();
    // Prime per-process CPU sampling; subsequent values cover the intervals below.
    app.getAppMetrics();
    while (performance.now() - observationStart < duration * 1000) {
      await wait(1000);
      result.resources.push({
        elapsedMs: performance.now() - observationStart,
        processes: app.getAppMetrics().map(({ type, cpu, memory }) => ({
          type,
          cpuPercent: cpu.percentCPUUsage,
          workingSetMB: memory.workingSetSize / 1000,
          privateMB: memory.privateBytes / 1000,
        })),
      });
    }
    for (const win of windows)
      result.renderer.push({ phase: 'end', type: win === widget ? 'widget' : 'settings', ...(await metrics(win)) });
    result.observationMs = performance.now() - observationStart;
    if (duration >= 65) assert(result.refreshes.length >= 2, 'An automatic refresh must complete during observation');
    const refreshCount = result.refreshes.length;
    const inputStart = performance.now();
    ipcMain.emit('huddle:refresh');
    if (scenario === 'hidden') trayClick();
    await widget.webContents.executeJavaScript('document.getElementById("refresh").getBoundingClientRect().width');
    result.refreshInputRoundTripMs = performance.now() - inputStart;
    while (result.refreshes.length === refreshCount) await wait(10);
    assert(widget.isVisible(), 'The widget must be visible after the input/reveal probe');
    result.eventLoop = { meanMs: delay.mean / 1e6, maxMs: delay.max / 1e6, p99Ms: delay.percentile(99) / 1e6 };
    result.elapsedMs = performance.now() - started;
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
    console.log(`Saved ${output}`);
    clearTimeout(timeout);
    delay.disable();
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
