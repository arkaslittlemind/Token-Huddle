// Codex usage.
//
// Token Huddle never reads or uses Codex's login. Two sources, tried in order:
//   1. Live: ask the installed `codex` program. Its app-server mode answers a
//      "read rate limits" request, so Codex makes the call with its own login.
//   2. Local: Codex records a rate-limit snapshot in its session logs after
//      every turn. The newest one is read from <home>/sessions. No network,
//      but only as fresh as the last Codex turn.

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { describeWindow, rollOver, clampPercent } = require('./util');

const CACHE_MS = 5 * 60 * 1000;
const FORCE_MIN_MS = 20 * 1000;
const ASK_TIMEOUT_MS = 15 * 1000;
const TAIL_BYTES = 512 * 1024;
const FILES_TO_CHECK = 8;

function codexHome(options = {}) {
  return options.home || process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
}

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function planLabel(plan) {
  if (!plan) return '';
  const text = String(plan).replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Accepts the session-log shape (used_percent) and the app-server shape (usedPercent). */
function parseRateLimits(limits) {
  const windows = [];
  for (const id of ['primary', 'secondary']) {
    const w = limits?.[id];
    const used = w?.used_percent ?? w?.usedPercent;
    if (typeof used !== 'number') continue;
    const minutes = w.window_minutes ?? w.windowDurationMins;
    const windowMs = minutes ? minutes * 60 * 1000 : null;
    const resetSeconds = w.resets_at ?? w.resetsAt;
    windows.push({
      id,
      ...describeWindow(windowMs),
      windowMs,
      usedPercent: clampPercent(used),
      resetsAt: resetSeconds ? resetSeconds * 1000 : null,
    });
  }
  return windows;
}

// --------------------------------------------------------- live, via codex

function stop(child) {
  try {
    child.stdin.end(); // app-server exits when its input closes
  } catch {
    /* already closed */
  }
  setTimeout(() => {
    if (child.exitCode !== null) return;
    // The command runs through a shell, so the whole process tree has to go.
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    } else {
      child.kill();
    }
  }, 1500).unref();
}

/** Start `codex app-server`, ask for the rate limits, and shut it down again. */
function askCodex(options = {}, timeoutMs = ASK_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    if (options.home) env.CODEX_HOME = options.home;
    const child = spawn(options.command || 'codex app-server', {
      shell: true,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'ignore'],
      env,
    });
    const send = (message) => child.stdin.write(`${JSON.stringify(message)}\n`);

    let settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      stop(child);
      if (error) reject(error);
      else resolve(result);
    };
    const timer = setTimeout(() => finish(new Error('Codex did not answer in time')), timeoutMs);

    let buffer = '';
    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      let end;
      while ((end = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, end).trim();
        buffer = buffer.slice(end + 1);
        if (!line) continue;
        let message;
        try {
          message = JSON.parse(line);
        } catch {
          continue;
        }
        if (message.id === 0 && message.result) {
          send({ method: 'initialized' });
          // Background poll: skip the extra reset-credit lookup.
          send({ method: 'account/rateLimits/read', id: 1, params: { excludeResetCreditDetails: true } });
        } else if (message.id === 1) {
          if (message.result) finish(null, message.result);
          else finish(new Error(message.error?.message || 'Codex refused the request'));
        } else if (message.id === 0) {
          finish(new Error(message.error?.message || 'Codex refused to start'));
        }
      }
    });
    child.stdin.on('error', () => {});
    child.on('error', (error) => finish(error));
    child.on('exit', () => finish(new Error('Codex exited before answering')));

    send({
      method: 'initialize',
      id: 0,
      params: { clientInfo: { name: 'token-huddle', title: 'Token Huddle', version: '0.1.0' } },
    });
  });
}

async function readLive(options, now) {
  const result = await askCodex(options);
  const limits = result?.rateLimits;
  const windows = parseRateLimits(limits);
  if (!windows.length) return null;
  return { plan: planLabel(limits.planType), state: 'ok', source: 'live', via: 'Codex', updatedAt: now, windows };
}

// ------------------------------------------------------ local, from logs

async function listRollouts(dir, out = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await listRollouts(full, out);
    } else if (entry.name.startsWith('rollout-') && entry.name.endsWith('.jsonl')) {
      try {
        out.push({ file: full, mtime: (await fs.stat(full)).mtimeMs });
      } catch {
        /* file vanished mid-scan */
      }
    }
  }
  return out;
}

async function readTail(file) {
  const handle = await fs.open(file, 'r');
  try {
    const { size } = await handle.stat();
    const length = Math.min(size, TAIL_BYTES);
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, size - length);
    return buffer.toString('utf8');
  } finally {
    await handle.close();
  }
}

/** Newest rate-limit snapshot in the session logs, or null. */
async function readLocal(home, now = Date.now()) {
  const files = await listRollouts(path.join(home, 'sessions'));
  files.sort((a, b) => b.mtime - a.mtime);

  for (const { file, mtime } of files.slice(0, FILES_TO_CHECK)) {
    let lines;
    try {
      lines = (await readTail(file)).split('\n');
    } catch {
      continue;
    }
    for (let i = lines.length - 1; i >= 0; i--) {
      if (!lines[i].includes('"rate_limits"')) continue;
      let entry;
      try {
        entry = JSON.parse(lines[i]);
      } catch {
        continue; // first line of the tail may be cut mid-record
      }
      const limits = entry?.payload?.rate_limits || entry?.rate_limits;
      const windows = parseRateLimits(limits);
      if (!windows.length) continue;
      return {
        plan: planLabel(limits.plan_type),
        state: 'ok',
        source: 'local',
        via: 'Codex session logs',
        updatedAt: Date.parse(entry.timestamp) || mtime,
        windows: rollOver(windows, now),
      };
    }
  }
  return null;
}

// -------------------------------------------------------------- provider

async function detect(options) {
  return exists(codexHome(options));
}

async function read({ options = {}, cache = {}, localOnly = false, force = false, now = Date.now() } = {}) {
  const home = codexHome(options);

  if (!localOnly) {
    // Only an answered ask is served from the cache; after a failed one the stale path below says so.
    if (cache.lastLive && !cache.lastAskFailed && now - cache.lastAskAt < (force ? FORCE_MIN_MS : CACHE_MS)) {
      return { ...cache.lastLive, windows: rollOver(cache.lastLive.windows, now) };
    }
    // A failed ask is not retried until the cache time has passed either.
    if (!cache.lastAskAt || now - cache.lastAskAt >= (force ? FORCE_MIN_MS : CACHE_MS)) {
      cache.lastAskAt = now;
      cache.lastAskFailed = true;
      try {
        const live = await readLive(options, now);
        if (live) {
          cache.lastLive = live;
          cache.lastAskFailed = false;
          return live;
        }
      } catch {
        /* fall through to the local snapshot */
      }
    }
  }

  const local = await readLocal(home, now);
  // A live reading newer than the last Codex turn (or with no turn to compare) is still the better one.
  if (cache.lastLive && (!local || cache.lastLive.updatedAt > local.updatedAt)) {
    return {
      ...cache.lastLive,
      state: 'stale',
      message: localOnly
        ? 'Local files only is on. Showing the last live reading. Turn it off in the options menu to ask Codex again'
        : 'Codex did not answer just now. Showing the last live reading. Press Refresh to try again',
      windows: rollOver(cache.lastLive.windows, now),
    };
  }
  if (local) return local;

  return {
    state: 'missing',
    message: (await exists(home))
      ? 'No usage recorded yet. Run a Codex turn'
      : options.home
        ? "This account's folder was not found. Remove this card in Settings, or add the folder again"
        : 'Codex not found. Install Codex, or hide this card in Settings',
    windows: [],
  };
}

module.exports = {
  id: 'codex',
  name: 'Codex',
  accent: '#00b4d8',
  about: 'Read from the codex program on this computer, or from its session logs when it is not running.',
  connect: 'auto',
  detect,
  read,
  parseRateLimits,
  readLocal,
  askCodex,
};
