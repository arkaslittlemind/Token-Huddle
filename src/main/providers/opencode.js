// OpenCode usage.
//
// OpenCode is a harness over many model providers, so there is no single quota
// to report. What it does keep is a local SQLite database with the tokens and
// cost of every assistant message. This reads that database (read only) and
// reports token use for today, the last 7 days and the last 30 days.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DAY, compactNumber } = require('./util');

// Old (v1) and current (v2) message tables. Both are read, de-duplicated by id.
const TABLES = [
  { name: 'message', where: "json_extract(data,'$.role') = 'assistant'" },
  { name: 'session_message', where: "type = 'assistant'" },
];

function dbPath(options = {}) {
  if (options.home) return path.join(options.home, 'opencode.db');
  const dataHome = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(dataHome, 'opencode', 'opencode.db');
}

function startOfDay(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function readRows(db, since) {
  const seen = new Map();
  for (const table of TABLES) {
    let rows;
    try {
      rows = db
        .prepare(
          `select id, time_created as t,
                  json_extract(data,'$.tokens.input') as input,
                  json_extract(data,'$.tokens.output') as output,
                  json_extract(data,'$.tokens.reasoning') as reasoning,
                  json_extract(data,'$.cost') as cost,
                  coalesce(json_extract(data,'$.modelID'), json_extract(data,'$.model.id')) as model
             from ${table.name}
            where time_created >= ? and ${table.where}`
        )
        .all(since);
    } catch {
      continue; // table missing in this OpenCode version
    }
    for (const row of rows) seen.set(row.id, row);
  }
  return [...seen.values()];
}

async function detect(options) {
  return fs.existsSync(dbPath(options));
}

async function read({ options = {}, now = Date.now() } = {}) {
  const file = dbPath(options);
  if (!fs.existsSync(file))
    return {
      state: 'missing',
      message: options.home
        ? "No OpenCode data was found in this account's folder. Remove this card in Settings, or add the folder again"
        : 'OpenCode not found. Install OpenCode, or hide this card in Settings',
      windows: [],
    };

  let DatabaseSync;
  try {
    ({ DatabaseSync } = require('node:sqlite'));
  } catch {
    return {
      state: 'error',
      message: 'This build of Token Huddle cannot read OpenCode data. Update Token Huddle',
      windows: [],
    };
  }

  const today = startOfDay(now);
  const sparkStart = startOfDay(now - 6 * DAY);

  let rows;
  let db;
  try {
    db = new DatabaseSync(file, { readOnly: true });
    rows = readRows(db, now - 30 * DAY);
  } catch {
    return {
      state: 'error',
      message: 'Could not read the OpenCode database. Press Refresh, or restart OpenCode if it keeps failing',
      windows: [],
    };
  } finally {
    try {
      db?.close();
    } catch {
      /* already closed */
    }
  }

  const totals = { today: 0, week: 0, month: 0, cost: 0 };
  const spark = new Array(7).fill(0);
  let latest = null;

  for (const row of rows) {
    const tokens = (row.input || 0) + (row.output || 0) + (row.reasoning || 0);
    totals.month += tokens;
    totals.cost += row.cost || 0;
    if (row.t >= now - 7 * DAY) totals.week += tokens;
    if (row.t >= today) totals.today += tokens;
    if (row.t >= sparkStart) {
      const day = Math.min(6, Math.floor((startOfDay(row.t) - sparkStart) / DAY + 0.5));
      spark[day] += tokens;
    }
    if (!latest || row.t > latest.t) latest = row;
  }

  const stats = [
    { label: 'Today', value: compactNumber(totals.today) },
    { label: '7 days', value: compactNumber(totals.week) },
    { label: '30 days', value: compactNumber(totals.month) },
  ];
  if (totals.cost > 0) stats.push({ label: '30d cost', value: `$${totals.cost.toFixed(2)}` });

  return {
    state: 'ok',
    source: 'local',
    via: 'OpenCode database',
    updatedAt: latest?.t || null,
    windows: [],
    stats,
    spark,
    message: latest?.model ? `${latest.model} · tokens used, no quota to read` : 'No activity in the last 30 days',
  };
}

module.exports = {
  id: 'opencode',
  name: 'OpenCode',
  accent: '#3d9bd1',
  about: "Read from OpenCode's local database.",
  connect: 'auto',
  detect,
  read,
};
