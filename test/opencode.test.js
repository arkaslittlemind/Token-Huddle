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
  db.exec('begin');
  build({
    v1: (id, at, data) =>
      db.prepare('insert into message values (?, ?, ?, ?, ?)').run(id, 's', at, at, JSON.stringify(data)),
    v2: (id, type, at, data) =>
      db
        .prepare('insert into session_message values (?, ?, ?, 0, ?, ?, ?)')
        .run(id, 's', type, at, at, JSON.stringify(data)),
  });
  db.exec('commit');
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

function makeLargeDatabase(build) {
  return makeDatabase((tables) => {
    build(tables);
    for (let row = 0; row < 300; row++) {
      const data = { role: 'assistant', tokens: tokens(0, 0) };
      tables.v1('padding-' + row, NOW - 29 * DAY, data);
      tables.v2('padding-' + row, 'assistant', NOW - 29 * DAY, data);
    }
  });
}

test('v2 overrides eligible v1 duplicates while preserving the original position for latest-time ties', async () => {
  const home = makeLargeDatabase(({ v1, v2 }) => {
    v1('first', NOW, { role: 'assistant', tokens: tokens(1, 0), modelID: 'old' });
    v1('second', NOW, { role: 'assistant', tokens: tokens(2, 0), modelID: 'second' });
    v2('first', 'assistant', NOW, { tokens: tokens(10, 0), modelID: 'replacement' });
    v2('new', 'assistant', NOW, { tokens: tokens(3, 0), modelID: 'new' });
  });
  const before = fs.readFileSync(path.join(home, 'opencode.db'));
  const reading = await opencode.read({ options: { home }, now: NOW });
  assert.equal(reading.stats[2].value, '15');
  assert.match(reading.message, /^replacement/);
  assert.deepEqual(fs.readFileSync(path.join(home, 'opencode.db')), before, 'read must not modify the database');
});

test('ineligible v2 duplicates never hide eligible v1 usage', async () => {
  const home = makeLargeDatabase(({ v1, v2 }) => {
    v1('user-copy', NOW, { role: 'assistant', tokens: tokens(10, 0) });
    v1('expired-copy', NOW, { role: 'assistant', tokens: tokens(20, 0) });
    v2('user-copy', 'user', NOW, { tokens: tokens(100, 0) });
    v2('expired-copy', 'assistant', NOW - 31 * DAY, { tokens: tokens(100, 0) });
  });
  assert.equal((await opencode.read({ options: { home }, now: NOW })).stats[2].value, '30');
});

test('single-table versions and a malformed table fall back independently', async () => {
  for (const scenario of ['v1-only', 'v2-only', 'broken-v1', 'broken-v2']) {
    const home = makeLargeDatabase(({ v1, v2 }) => {
      v1('old', NOW, { role: 'assistant', tokens: tokens(10, 0), modelID: 'old' });
      v2('new', 'assistant', NOW, { tokens: tokens(20, 0), modelID: 'new' });
    });
    const db = new DatabaseSync(path.join(home, 'opencode.db'));
    if (scenario === 'v1-only') db.exec('drop table session_message');
    if (scenario === 'v2-only') db.exec('drop table message');
    if (scenario === 'broken-v1') db.exec("insert into message values ('bad', 's', " + NOW + ", 0, '{bad')");
    if (scenario === 'broken-v2')
      db.exec("insert into session_message values ('bad', 's', 'assistant', 0, " + NOW + ", 0, '{bad')");
    db.close();
    const reading = await opencode.read({ options: { home }, now: NOW });
    assert.equal(reading.state, 'ok');
    assert.equal(reading.stats[2].value, ['v1-only', 'broken-v2'].includes(scenario) ? '10' : '20');
  }
});

test('rolling boundaries, missing token fields and latest-model fallback stay exact', async () => {
  const midnight = new Date(NOW);
  midnight.setHours(0, 0, 0, 0);
  const home = makeLargeDatabase(({ v1, v2 }) => {
    v1('month', NOW - 30 * DAY, { role: 'assistant', tokens: tokens(1, 0), cost: 0.01 });
    v1('outside', NOW - 30 * DAY - 1, { role: 'assistant', tokens: tokens(100, 0) });
    v1('week', NOW - 7 * DAY, { role: 'assistant', tokens: tokens(2, 0), cost: 0.02 });
    v1('yesterday', midnight.getTime() - 1, { role: 'assistant', tokens: tokens(4, 0) });
    v2('today', 'assistant', midnight.getTime(), { tokens: { output: 8 }, cost: 0.03 });
    v2('missing', 'assistant', NOW, { model: { id: 'latest' } });
  });
  const reading = await opencode.read({ options: { home }, now: NOW });
  assert.deepEqual(reading.stats, [
    { label: 'Today', value: '8' },
    { label: '7 days', value: '14' },
    { label: '30 days', value: '15' },
    { label: '30d cost', value: '$0.06' },
  ]);
  assert.equal(reading.spark[5], 4);
  assert.equal(reading.spark[6], 8);
  assert.match(reading.message, /^latest/);
});

test('large histories return compact seven-column metadata arrays with correct deduplication', async (t) => {
  const home = makeLargeDatabase(({ v1, v2 }) => {
    for (let row = 0; row < 300; row++) {
      v1('same-' + row, NOW, { role: 'assistant', tokens: tokens(3, 1) });
      v2('same-' + row, 'assistant', NOW, { tokens: tokens(7, 1) });
    }
  });
  const prepare = DatabaseSync.prototype.prepare;
  const exported = [];
  t.mock.method(DatabaseSync.prototype, 'prepare', function (sql) {
    const statement = prepare.call(this, sql);
    const all = statement.all;
    statement.all = function (...args) {
      const rows = all.apply(this, args);
      exported.push(...rows);
      return rows;
    };
    return statement;
  });
  assert.equal((await opencode.read({ options: { home }, now: NOW })).stats[2].value, '2.4k');
  assert(exported.length > 0);
  assert(exported.every((row) => Array.isArray(row) && row.length === 7));
});

test('null replacement payload and unusual numeric strings retain existing behavior', async () => {
  const home = makeLargeDatabase(({ v1, v2 }) => {
    v1('replaced', NOW, { role: 'assistant', tokens: tokens(999, 0) });
    v2('replaced', 'assistant', NOW, null);
  });
  const db = new DatabaseSync(path.join(home, 'opencode.db'));
  db.exec('update session_message set data = null');
  db.close();
  assert.equal((await opencode.read({ options: { home }, now: NOW })).stats[2].value, '0');
  const unusual = makeLargeDatabase(({ v2 }) => v2('string', 'assistant', NOW, { tokens: tokens('10', 5) }));
  assert.equal((await opencode.read({ options: { home: unusual }, now: NOW })).stats[2].value, '1.1k');
});

test('spark buckets preserve local-day behavior across daylight saving changes', async (t) => {
  const previous = process.env.TZ;
  process.env.TZ = 'America/New_York';
  t.after(() => {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  });
  for (const now of [new Date(2026, 2, 9, 0, 30).getTime(), new Date(2026, 10, 2, 0, 30).getTime()]) {
    const start = new Date(now - 6 * DAY);
    start.setHours(0, 0, 0, 0);
    const points = Array.from({ length: 8 }, (_, day) => {
      const date = new Date(start);
      date.setDate(date.getDate() + day);
      return date.getTime();
    });
    const home = makeLargeDatabase(({ v2 }) =>
      points.forEach((at, day) => v2('day-' + day, 'assistant', at, { tokens: tokens(day + 1, 0) }))
    );
    const expected = new Array(7).fill(0);
    for (let day = 0; day < points.length; day++) {
      const bucket = Math.min(6, Math.floor((points[day] - start.getTime()) / DAY + 0.5));
      expected[bucket] += day + 1;
    }
    assert.deepEqual((await opencode.read({ options: { home }, now })).spark, expected);
  }
});

test('a supported table without rowid retains its readings', async () => {
  const home = makeLargeDatabase(() => {});
  const db = new DatabaseSync(path.join(home, 'opencode.db'));
  db.exec(
    'alter table message rename to old_message; create table message (id text primary key, session_id text, time_created integer, time_updated integer, data text) without rowid; insert into message select * from old_message; drop table old_message'
  );
  db.prepare('insert into message values (?, ?, ?, ?, ?)').run(
    'unique',
    's',
    NOW,
    NOW,
    JSON.stringify({ role: 'assistant', tokens: tokens(42, 0) })
  );
  db.close();
  assert.equal((await opencode.read({ options: { home }, now: NOW })).stats[2].value, '42');
});

test('preserves JavaScript cost rounding at half-cent boundaries', async () => {
  const home = makeLargeDatabase(({ v2 }) => {
    for (let row = 0; row < 100; row++) v2('cost-' + row, 'assistant', NOW, { tokens: tokens(1, 0), cost: 0.00005 });
  });
  const reading = await opencode.read({ options: { home }, now: NOW });
  assert.equal(reading.stats.find((stat) => stat.label === '30d cost').value, '$0.00');
});

test('unsafe integer fields retain independent table failure behavior', async () => {
  const home = makeLargeDatabase(({ v1 }) => {
    for (const [id, input] of [
      ['huge', 9007199254740992],
      ['negative', -9007199254740992],
      ['normal', 42],
    ])
      v1(id, NOW, { role: 'assistant', tokens: tokens(input, 0) });
  });
  assert.equal((await opencode.read({ options: { home }, now: NOW })).stats[2].value, '0');
});

test('latest-time ties keep the existing indexed scan order after replacements', async () => {
  const home = makeLargeDatabase(({ v1, v2 }) => {
    v1('first', NOW - DAY, { role: 'assistant', tokens: tokens(1, 0) });
    v1('second', NOW - 2 * DAY, { role: 'assistant', tokens: tokens(2, 0) });
    v2('first', 'assistant', NOW, { tokens: tokens(10, 0), modelID: 'first-replacement' });
    v2('second', 'assistant', NOW, { tokens: tokens(20, 0), modelID: 'second-replacement' });
  });
  const db = new DatabaseSync(path.join(home, 'opencode.db'));
  db.exec('create index message_time on message(time_created)');
  db.close();
  assert.match((await opencode.read({ options: { home }, now: NOW })).message, /^second-replacement/);
});

test('non-unique ids in an unsupported schema retain last-record deduplication', async () => {
  const home = makeLargeDatabase(({ v1 }) => v1('same', NOW, { role: 'assistant', tokens: tokens(1, 0) }));
  const db = new DatabaseSync(path.join(home, 'opencode.db'));
  db.exec(
    'alter table message rename to old_message; create table message (id text, session_id text, time_created integer, time_updated integer, data text); insert into message select * from old_message; drop table old_message'
  );
  db.prepare('insert into message values (?, ?, ?, ?, ?)').run(
    'same',
    's',
    NOW,
    NOW,
    JSON.stringify({ role: 'assistant', tokens: tokens(33, 0) })
  );
  db.close();
  assert.equal((await opencode.read({ options: { home }, now: NOW })).stats[2].value, '33');
});

test('reads committed WAL data before the database is checkpointed', async (t) => {
  const home = makeDatabase(() => {});
  const file = path.join(home, 'opencode.db');
  const db = new DatabaseSync(file);
  t.after(() => db.close());
  db.exec('pragma journal_mode = wal; pragma wal_autocheckpoint = 0; begin');
  const insert = db.prepare('insert into session_message values (?, ?, ?, 0, ?, ?, ?)');
  for (let row = 0; row < 500; row++)
    insert.run(
      'wal-' + row,
      's',
      'assistant',
      NOW,
      NOW,
      JSON.stringify({ tokens: tokens(1, 0), syntheticContent: 'sample'.repeat(100) })
    );
  db.exec('commit');
  assert(fs.statSync(file).size <= 64 * 1024);
  const reading = await opencode.read({ options: { home }, now: NOW });
  assert.equal(reading.stats[2].value, '500');
});

test('unsafe source fields reject the original table even when v2 replaces the row', async () => {
  for (const field of ['input', 'output', 'reasoning', 'cost', 'modelID', 'nestedModel', 'timestamp']) {
    const home = makeLargeDatabase(({ v1, v2 }) => {
      const data = { role: 'assistant', tokens: tokens(1, 0) };
      let at = NOW;
      if (['input', 'output', 'reasoning'].includes(field)) data.tokens[field] = 9007199254740992;
      else if (field === 'nestedModel') data.model = { id: 9007199254740992 };
      else if (field === 'timestamp') at = 9007199254740992;
      else data[field] = 9007199254740992;
      v1('huge', at, data);
      v1('valid', NOW, { role: 'assistant', tokens: tokens(42, 0) });
      v2('huge', 'assistant', NOW, { tokens: tokens(5, 0), modelID: 'replacement' });
    });
    const reading = await opencode.read({ options: { home }, now: NOW });
    assert.equal(reading.stats[2].value, '5', field);
    assert.equal(reading.spark[6], 5, field);
  }
});

test('an unsafe non-latest model still rejects its source table', async () => {
  const home = makeLargeDatabase(({ v2 }) => {
    v2('older', 'assistant', NOW - DAY, { tokens: tokens(10, 0), modelID: 9007199254740992 });
    v2('latest', 'assistant', NOW, { tokens: tokens(20, 0), modelID: 'safe-model' });
  });
  assert.equal((await opencode.read({ options: { home }, now: NOW })).stats[2].value, '0');
});
