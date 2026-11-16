// Local session metadata supplies token totals; the optional status line supplies subscription limits.

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { readSessions } = require('./claude-sessions');
const { randomUUID } = require('node:crypto');
const { HOUR, DAY, rollOver, clampPercent } = require('./util');

const SCRIPT_NAME = 'token-huddle-statusline.ps1';
const BACKUP_NAME = 'settings.json.token-huddle-backup';

const WINDOWS = [
  { id: 'five_hour', label: 'Session', short: '5h', windowMs: 5 * HOUR },
  { id: 'seven_day', label: 'Weekly', short: '7d', windowMs: 7 * DAY },
];

// Saves only the usage numbers and the time. Normally it prints a short line for
// Claude Code to show. With -PassThrough (the prefix in front of a user's own
// status line) it prints the input exactly as received instead, so the user's
// command gets the same bytes; that happens even if saving fails.
const SCRIPT = `param([string]$Out, [switch]$PassThrough)
$ErrorActionPreference = 'Stop'
$bytes = [byte[]]@()
try {
  $buffer = New-Object IO.MemoryStream
  [Console]::OpenStandardInput().CopyTo($buffer)
  $bytes = $buffer.ToArray()
} catch {}
$summary = ''
try {
  $data = [Text.Encoding]::UTF8.GetString($bytes).TrimStart([char]0xFEFF) | ConvertFrom-Json
  $limits = $data.rate_limits
  if ($limits) {
    $payload = @{ captured_at = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds(); rate_limits = $limits }
    $tmp = "$Out.$PID.tmp"
    [IO.File]::WriteAllText($tmp, ($payload | ConvertTo-Json -Depth 6 -Compress))
    Move-Item -Force $tmp $Out
    $parts = @()
    if ($limits.five_hour) { $parts += "5h $([math]::Round($limits.five_hour.used_percentage))%" }
    if ($limits.seven_day) { $parts += "7d $([math]::Round($limits.seven_day.used_percentage))%" }
    $summary = $parts -join ' | '
  }
} catch {}
if ($PassThrough) {
  try {
    $stdout = [Console]::OpenStandardOutput()
    $stdout.Write($bytes, 0, $bytes.Length)
    $stdout.Flush()
  } catch {}
} elseif ($summary) {
  Write-Output $summary
}
exit 0
`;

function claudeHome(options = {}) {
  return options.home || process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

const forward = (file) => file.replace(/\\/g, '/');
const scriptPath = (dataDir) => path.join(dataDir, SCRIPT_NAME);
const outputPath = (dataDir, key) => path.join(dataDir, `claude-${key}.json`);

/** Forward slashes: Claude Code may run this through Git Bash, which eats backslashes. */
function bridgeCommand(dataDir, key) {
  return `powershell -NoProfile -ExecutionPolicy Bypass -File "${forward(scriptPath(dataDir))}" "${forward(outputPath(dataDir, key))}"`;
}

const PASS_THROUGH = '-PassThrough';

/**
 * The prefix a user puts in front of their own status line command: it saves
 * the usage, then pipes Claude Code's input on to their command unchanged.
 */
function prefixCommand(dataDir, key) {
  return `${bridgeCommand(dataDir, key)} ${PASS_THROUGH} | `;
}

// Exactly what bridgeCommand() writes, for any card and any install folder, and nothing more.
const OURS =
  /^powershell -NoProfile -ExecutionPolicy Bypass -File "[^"]*\/token-huddle-statusline\.ps1" "[^"]*\.json"$/;

/**
 * Whose status line this is:
 *   ours   - exactly a Token Huddle bridge command (Connect put it there;
 *            Disconnect may remove it)
 *   linked - the user's own command with a Token Huddle prefix (never touched)
 *   other  - anything else, including a user's own command that happens to
 *            call the script some other way (never touched)
 */
function classify(statusLine) {
  const command = statusLine?.command;
  if (typeof command !== 'string') return 'other';
  if (OURS.test(command)) return 'ours';
  if (command.includes(SCRIPT_NAME) && command.includes(PASS_THROUGH)) return 'linked';
  return 'other';
}

/** Claude Code's settings file, as { file, text, json }. A missing file is an empty object. */
async function loadSettings(home) {
  const file = path.join(home, 'settings.json');
  let text;
  try {
    text = await fs.readFile(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return { file, text: null, json: {} };
    throw error;
  }
  const json = JSON.parse(text.replace(/^\uFEFF/, ''));
  if (!json || typeof json !== 'object' || Array.isArray(json)) throw new Error('settings.json is not an object');
  return { file, text, json };
}

async function saveSettings({ file, text }, json) {
  const indent = text?.match(/^([ \t]+)"/m)?.[1] ?? '  ';
  const temporary = `${file}.${randomUUID()}.tmp`;
  const handle = await fs.open(temporary, 'wx');
  try {
    await handle.writeFile(`${JSON.stringify(json, null, indent)}\n`);
    await handle.close();
    await fs.rename(temporary, file);
  } catch (error) {
    await handle.close().catch(() => {});
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

// ------------------------------------------------------------- connection

/**
 * Where the link to Claude Code stands:
 *   connected (Token Huddle's own status line) | linked (the user's own status
 *   line with this card's prefix) | disconnected | conflict (the user's own
 *   status line, not linked to this card) | unsupported | error
 */
async function connectionStatus({ options = {}, key, dataDir, platform = process.platform }) {
  if (platform !== 'win32') {
    return {
      state: 'unsupported',
      detail: 'Connecting Claude Code works on Windows only for now. Hide this card in Settings if you do not need it.',
    };
  }
  let settings;
  try {
    settings = await loadSettings(claudeHome(options));
  } catch {
    return {
      state: 'error',
      detail: 'Claude Code settings.json could not be read. Check it is valid JSON, then try again.',
    };
  }
  const { statusLine } = settings.json;
  if (!statusLine) return { state: 'disconnected', detail: '' };
  const kind = classify(statusLine);
  if (kind === 'linked') {
    if (statusLine.command.includes(`"${forward(outputPath(dataDir, key))}"`)) {
      const arrived = await fs.access(outputPath(dataDir, key)).then(
        () => true,
        () => false
      );
      return {
        state: 'linked',
        detail: arrived
          ? 'Usage arrives through your own status line.'
          : 'Linked. Send a message in Claude Code in a terminal to get the first reading.',
      };
    }
    return {
      state: 'conflict',
      detail:
        "Your status line is linked to a different Token Huddle card. Copy this card's prefix to link this one instead.",
    };
  }
  if (kind === 'other') {
    return {
      state: 'conflict',
      detail:
        "You already have your own status line. Token Huddle will not replace it: put Token Huddle's prefix in front of its command, and both will run.",
    };
  }
  if (statusLine.command !== bridgeCommand(dataDir, key)) {
    return { state: 'disconnected', detail: 'Connected to a different Token Huddle card or an older install.' };
  }
  return { state: 'connected', detail: '' };
}

/** What connect() will do, for showing to the user before they agree. */
function connectionPlan({ options = {}, key, dataDir }) {
  return {
    file: path.join(claudeHome(options), 'settings.json'),
    adds: { statusLine: { type: 'command', command: bridgeCommand(dataDir, key) } },
    backup: path.join(claudeHome(options), BACKUP_NAME),
  };
}

async function connect(context) {
  const { options = {}, dataDir } = context;
  const status = await connectionStatus(context);
  if (status.state === 'linked') throw new Error('Claude Code already reaches this card through your own status line.');
  if (['unsupported', 'error', 'conflict'].includes(status.state)) throw new Error(status.detail);

  const home = claudeHome(options);
  const settings = await loadSettings(home);
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(scriptPath(dataDir), SCRIPT);
  if (settings.text !== null) await fs.writeFile(path.join(home, BACKUP_NAME), settings.text);
  await saveSettings(settings, { ...settings.json, ...connectionPlan(context).adds });
}

/**
 * For a user with their own status line: puts the script in Token Huddle's own
 * data folder and returns the prefix to copy. Changes nothing of Claude Code's.
 */
async function link({ options = {}, key, dataDir, platform = process.platform }) {
  if (platform !== 'win32') throw new Error('Linking Claude Code works on Windows only for now.');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(scriptPath(dataDir), SCRIPT);
  return { prefix: prefixCommand(dataDir, key), file: path.join(claudeHome(options), 'settings.json') };
}

async function disconnect({ options = {}, key, dataDir }) {
  const settings = await loadSettings(claudeHome(options));
  if (classify(settings.json.statusLine) === 'ours') {
    const { statusLine, ...rest } = settings.json;
    await saveSettings(settings, rest);
  }
  await fs.rm(outputPath(dataDir, key), { force: true });
}

// ------------------------------------------------------------------ usage

function parseSnapshot(snapshot) {
  const limits = snapshot?.rate_limits;
  const windows = [];
  for (const window of WINDOWS) {
    const value = limits?.[window.id];
    if (!value || typeof value.used_percentage !== 'number') continue;
    windows.push({
      ...window,
      usedPercent: clampPercent(value.used_percentage),
      resetsAt: typeof value.resets_at === 'number' ? value.resets_at * 1000 : null,
    });
  }
  const takenAt = typeof snapshot?.captured_at === 'number' ? snapshot.captured_at * 1000 : null;
  return { windows, takenAt };
}

async function detect(options) {
  try {
    await fs.access(claudeHome(options));
    return true;
  } catch {
    return false;
  }
}

async function readLimits({
  options = {},
  key = 'claude',
  dataDir,
  now = Date.now(),
  platform = process.platform,
} = {}) {
  if (!dataDir) return { state: 'error', message: 'Token Huddle has no data folder. Restart the app', windows: [] };
  const via = 'Claude Code status line';

  let snapshot = null;
  try {
    snapshot = JSON.parse((await fs.readFile(outputPath(dataDir, key), 'utf8')).replace(/^\uFEFF/, ''));
  } catch {
    /* no snapshot yet */
  }
  const { windows, takenAt } = parseSnapshot(snapshot);
  const status = await connectionStatus({ options, key, dataDir, platform });
  const live = status.state === 'connected' || status.state === 'linked';

  if (windows.length) {
    return {
      state: live ? 'ok' : 'stale',
      source: 'local',
      via,
      updatedAt: takenAt,
      windows: rollOver(windows, now),
      message: live ? '' : 'No longer connected. Reconnect in Settings',
    };
  }
  if (status.state === 'connected') {
    return {
      state: 'missing',
      via,
      message: 'Connected. Send a message in Claude Code to get the first reading',
      windows: [],
    };
  }
  if (status.state === 'linked') {
    return {
      state: 'missing',
      via,
      message: 'Linked. Send a message in Claude Code in a terminal to get the first reading',
      windows: [],
    };
  }
  if (status.state === 'disconnected') {
    return { state: 'missing', via, message: 'Not connected yet. Open Settings to connect', windows: [] };
  }
  if (status.state === 'conflict') {
    return {
      state: 'missing',
      via,
      message: 'You have your own status line. Open Settings to add Token Huddle to it',
      windows: [],
    };
  }
  return { state: 'missing', via, message: status.detail, windows: [] };
}

async function read(context = {}) {
  const local = await readSessions({ home: claudeHome(context.options), cache: context.cache, now: context.now });
  const limits = await readLimits(context).catch(() => ({
    state: 'error',
    windows: [],
    message: 'Could not read subscription limits. Open Settings',
  }));
  if (!local.stats) {
    if (limits.windows.length)
      return { ...limits, message: [limits.message, local.message].filter(Boolean).join('. ') };
    return {
      ...limits,
      state: local.state === 'error' ? 'error' : limits.state,
      message: `${limits.message}. ${local.message}`,
    };
  }
  return {
    ...local,
    source: 'local',
    via: 'Claude Code session files',
    windows: limits.windows,
    quotaUpdatedAt: limits.updatedAt || null,
    quotaState: limits.state,
    message: [local.message, limits.windows.length ? limits.message : 'Subscription limits are optional in Settings']
      .filter(Boolean)
      .join('. '),
  };
}

module.exports = {
  id: 'claude',
  name: 'Claude Code',
  accent: '#caf0f8',
  about: 'Token totals from local sessions; subscription limits through an optional status line.',
  connect: 'bridge',
  detect,
  read,
  connection: { status: connectionStatus, plan: connectionPlan, connect, disconnect, link },
  parseSnapshot,
  bridgeCommand,
  prefixCommand,
  outputPath,
  SCRIPT,
};
