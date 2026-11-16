const fs = require('node:fs/promises');
const { createReadStream } = require('node:fs');
const readline = require('node:readline');
const path = require('node:path');
const { DAY, compactNumber } = require('./util');

function metadata(record) {
  if (!record || typeof record !== 'object') return null;
  const message = record.message;
  const time = Date.parse(record.timestamp);
  if (
    record.type !== 'assistant' ||
    typeof message?.id !== 'string' ||
    !message.id ||
    !message.usage ||
    typeof message.usage !== 'object' ||
    Array.isArray(message.usage) ||
    !Number.isFinite(time)
  )
    return null;
  const values = ['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens'].map(
    (key) => (Object.hasOwn(message.usage, key) ? message.usage[key] : 0)
  );
  if (!values.every((value) => Number.isSafeInteger(value) && value >= 0)) return null;
  const tokens = values.reduce((sum, value) => sum + value, 0);
  if (!Number.isSafeInteger(tokens)) return null;
  return {
    id: JSON.stringify([typeof record.requestId === 'string' ? record.requestId : '', message.id]),
    time,
    tokens,
  };
}

async function filesIn(root) {
  const files = [];
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await filesIn(file)));
    else if (entry.isFile() && entry.name.endsWith('.jsonl')) files.push(file);
  }
  return files.sort();
}

async function readFile(file) {
  const records = [];
  let malformed = false;

  const lines = readline.createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line);
      const item = metadata(record);
      if (item) records.push(item);
      else if (record?.type === 'assistant' && record.message && Object.hasOwn(record.message, 'usage'))
        malformed = true;
    } catch {
      malformed = true;
    }
  }
  return { records, malformed };
}

async function readSessions({ home, cache = {}, now = Date.now() }) {
  const root = path.join(home, 'projects');
  let files;
  try {
    if ((await fs.lstat(root)).isSymbolicLink()) throw new Error('Linked projects folder');
    files = await filesIn(root);
  } catch (error) {
    return {
      state: error.code === 'ENOENT' ? 'missing' : 'error',
      message:
        error.code === 'ENOENT'
          ? 'No local token records yet. Run a Claude Code turn'
          : 'Could not read Claude session files. Press Refresh',
    };
  }
  const previous = cache.claudeSessions?.home === home ? cache.claudeSessions.files : new Map();
  const next = new Map();
  const seen = new Map();
  let failed = false;
  for (const file of files) {
    try {
      const stat = await fs.lstat(file);
      if (!stat.isFile() || stat.isSymbolicLink()) continue;
      const signature = `${stat.dev}/${stat.ino}/${stat.size}/${stat.mtimeMs}/${stat.ctimeMs}`;
      const old = previous.get(file);
      const data = old?.signature === signature ? old : { signature, ...(await readFile(file)) };
      next.set(file, data);
      if (data.malformed) failed = true;
      for (const item of data.records) {
        if (item.time > now) continue;
        const existing = seen.get(item.id);
        if (!existing || item.time >= existing.time) seen.set(item.id, item);
      }
    } catch {
      failed = true;
    }
  }
  cache.claudeSessions = { home, files: next };
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const starts = [midnight.getTime(), now - 7 * DAY, now - 30 * DAY];
  const totals = starts.map((start) =>
    [...seen.values()].reduce((sum, item) => sum + (item.time >= start ? item.tokens : 0), 0)
  );
  const updatedAt = [...seen.values()].reduce((latest, item) => Math.max(latest, item.time), 0) || null;
  if (!seen.size && (!files.length || failed))
    return {
      state: failed ? 'error' : 'missing',
      message: failed
        ? 'Could not read Claude usage records. Press Refresh'
        : 'No local token records yet. Run a Claude Code turn',
    };
  return {
    state: failed ? 'stale' : 'ok',
    stats: ['Today', '7 days', '30 days'].map((label, index) => ({ label, value: compactNumber(totals[index]) })),
    updatedAt,
    message: failed
      ? 'Some local records could not be read. Press Refresh'
      : totals[2]
        ? 'Recorded tokens, including cache reads and writes'
        : 'No activity in the last 30 days',
  };
}

module.exports = { readSessions, metadata };
