const test = require('node:test');
const { after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const opencode = require('../src/main/providers/opencode');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = new Date(2026, 10, 14, 15, 0, 0).getTime(); // 3pm local time

const temporary = [];

/** A new folder in the system temp folder, removed when this file's tests finish. */
function tempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'huddle-opencode-'));
  temporary.push(dir);
  return dir;
}

after(() => {
  for (const dir of temporary) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Could not remove ${dir}: ${error.message}`);
    }
  }
});

function makeDatabase(build) {
  const dir = tempDir();
  const file = path.join(dir, 'opencode.db');
  const db = new DatabaseSync(file);
  db.exec(`
    create table message (id text primary key, session_id text, time_created integer, time_updated integer, data text);
    create table session_message (id text primary key, session_id text, type text, seq integer,
                                  time_created integer, time_updated integer, data text);
  `);
  build({
    v1: (id, at, data) =>
      db.prepare('insert into message values (?, ?, ?, ?, ?)').run(id, 's', at, at, JSON.stringify(data)),
    v2: (id, type, at, data) =>
      db
        .prepare('insert into session_message values (?, ?, ?, 0, ?, ?, ?)')
        .run(id, 's', type, at, at, JSON.stringify(data)),
  });
  db.close();
  return dir;
}

const tokens = (input, output, reasoning = 0) => ({ input, output, reasoning, cache: { read: 9999, write: 0 } });

test('sums tokens for today, 7 days and 30 days', async () => {
  const home = makeDatabase(({ v1, v2 }) => {
    v2('m1', 'assistant', NOW - HOUR, { tokens: tokens(1000, 400, 100), cost: 0, model: { id: 'model-new' } });
    v2('m2', 'user', NOW - HOUR, { tokens: tokens(50000, 0) }); // not an assistant message
    v2('m3', 'assistant', NOW - 3 * DAY, { tokens: tokens(1500, 500), cost: 0.25, model: { id: 'model-mid' } });
    v1('m4', NOW - 20 * DAY, { role: 'assistant', tokens: tokens(9000, 1000), cost: 0.5, modelID: 'model-old' });
    v1('m5', NOW - 40 * DAY, { role: 'assistant', tokens: tokens(70000, 0) }); // older than 30 days
    v1('m6', NOW - 2 * DAY, { role: 'user', tokens: tokens(70000, 0) }); // not an assistant message
    v1('m1', NOW - HOUR, { role: 'assistant', tokens: tokens(1000, 400, 100) }); // same id in both tables
  });

  const reading = await opencode.read({ options: { home }, now: NOW });

  assert.equal(reading.state, 'ok');
  assert.equal(reading.source, 'local');
  assert.equal(reading.via, 'OpenCode database');
  assert.equal(reading.updatedAt, NOW - HOUR);
  assert.deepEqual(reading.stats, [
    { label: 'Today', value: '1.5k' },
    { label: '7 days', value: '3.5k' },
    { label: '30 days', value: '13.5k' },
    { label: '30d cost', value: '$0.75' },
  ]);
  assert.deepEqual(reading.spark, [0, 0, 0, 2000, 0, 0, 1500]);
  assert.match(reading.message, /^model-new/);
});

test('an empty database reads as no activity', async () => {
  const home = makeDatabase(() => {});
  const reading = await opencode.read({ options: { home }, now: NOW });
  assert.equal(reading.state, 'ok');
  assert.equal(reading.stats[0].value, '0');
  assert.match(reading.message, /No activity/);
});

test('reports a missing or unreadable database without throwing', async () => {
  const absent = path.join(os.tmpdir(), 'huddle-opencode-none');
  assert.equal(await opencode.detect({ home: absent }), false);
  assert.equal((await opencode.read({ options: { home: absent } })).state, 'missing');

  const dir = tempDir();
  fs.writeFileSync(path.join(dir, 'opencode.db'), 'this is not a database');
  assert.equal(await opencode.detect({ home: dir }), true);
  const reading = await opencode.read({ options: { home: dir }, now: NOW });
  assert.ok(['error', 'ok'].includes(reading.state));
});

test('an added account whose folder has gone is told to remove it, not to install OpenCode', async () => {
  const absent = path.join(tempDir(), 'absent');
  const reading = await opencode.read({ options: { home: absent } });
  assert.equal(reading.state, 'missing');
  assert.deepEqual(reading.windows, []);
  assert.equal(
    reading.message,
    "No OpenCode data was found in this account's folder. Remove this card in Settings, or add the folder again"
  );
  assert.doesNotMatch(reading.message, /Install/);
});

test('an added account with an existing folder but no database gets accurate missing-data guidance', async () => {
  const home = tempDir();
  assert.equal(await opencode.detect({ home }), false);
  const reading = await opencode.read({ options: { home } });
  assert.equal(reading.state, 'missing');
  assert.deepEqual(reading.windows, []);
  assert.equal(
    reading.message,
    "No OpenCode data was found in this account's folder. Remove this card in Settings, or add the folder again"
  );
  assert.deepEqual(fs.readdirSync(home), []);
});
