const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { fixtures, summarize, summarizeSamples, compare, NOW } = require('../scripts/performance-data');
const { readSessions } = require('../src/main/providers/claude-sessions');
const opencode = require('../src/main/providers/opencode');
const { buildReport, compareReports } = require('../scripts/performance-report');

test('report keeps independent runs, rejects incompatible metadata and records invalid CPU samples', () => {
  const run = {
    schemaVersion: 1,
    workload: 'small',
    scenario: 'full',
    duration: 5,
    fixture: [],
    build: 'test',
    version: 'test',
    commit: 'test',
    environment: {},
    observationMs: 5000,
    resources: [
      { processes: [{ type: 'Browser', cpuPercent: -1, workingSetMB: 50 }] },
      { processes: [{ type: 'Browser', cpuPercent: 2, workingSetMB: 60, privateMB: 40 }] },
    ],
    providers: [],
    renderer: [],
    refreshes: [
      { ms: 10, force: false },
      { ms: 4, force: true },
    ],
    eventLoop: { maxMs: 12 },
  };
  const report = buildReport([run, run]);
  assert.equal(report.summary[0].runs, 2);
  assert.equal(report.summary[0].measurements.forcedRefresh.median, 4);
  assert.equal(report.summary[0].measurements.BrowserCPU.invalidSamples, 2);
  assert.equal(report.summary[0].measurements.BrowserPrivate.median, 40);
  assert.throws(() => buildReport([]));
  assert.throws(() => buildReport([run, { ...run, commit: 'different' }]));
  assert.throws(() => buildReport([run, { ...run, fixture: ['different'] }]));
  const after = structuredClone(report);
  after.summary[0].measurements.forcedRefresh.median = 2;
  assert.equal(compareReports(report, after)[0].measurements.forcedRefresh.percent, -50);
  after.fixtures.small = ['different'];
  assert(compareReports(report, after)[0].measurements.forcedRefresh.unavailable);
});

test('measurement summaries preserve variability and reject missing or invalid samples', () => {
  assert.deepEqual(summarize([9, 1, 5, 3]), { count: 4, median: 4, min: 1, max: 9 });
  for (const values of [[], [NaN], [-1], [Infinity]]) assert.throws(() => summarize(values));
  assert.equal(compare({ context: 'a', value: 10 }, { context: 'a', value: 8 }).percent, -20);
  assert.equal(compare({ context: 'a', value: 0 }, { context: 'a', value: 8 }).percent, null);
  assert(compare({ context: 'a', value: 10 }, { context: 'b', value: 8 }).unavailable);
  assert(compare({ value: 10 }, { value: 8 }).unavailable);
  assert(compare({ context: 'a', value: NaN }, { context: 'a', value: 8 }).unavailable);
  assert.deepEqual(summarizeSamples([-1, null, 2, 4]), { count: 2, median: 3, min: 2, max: 4, invalidSamples: 2 });
  assert.equal(summarizeSamples([null, -1]), null);
});

test('generated accounts have independent totals and SQLite duplicates count once', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'huddle-fixture-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.throws(() => fixtures(root, 'invalid'));
  const dataset = fixtures(root);
  assert.equal(dataset.manifest.length, 6);
  const cache = {};
  for (let account = 0; account < 2; account++) {
    const home = path.join(root, `claude-${account}`);
    const cold = await readSessions({ home, now: NOW, cache });
    assert.equal(cold.state, 'ok');
    assert.equal(cold.stats[2].value, account ? '1.6k' : '1.5k');
    assert.deepEqual(await readSessions({ home, now: NOW, cache }), cold);
    const reading = await opencode.read({ options: { home: path.join(root, `opencode-${account}`) }, now: NOW });
    assert.equal(reading.stats[2].value, cold.stats[2].value);
  }
  assert.equal((await readSessions({ home: path.join(root, 'missing'), now: NOW })).state, 'missing');
  fs.writeFileSync(path.join(root, 'claude-0', 'projects', 'bad.jsonl'), '{bad json');
  assert.equal((await readSessions({ home: path.join(root, 'claude-0'), now: NOW })).state, 'stale');
  fs.unlinkSync(path.join(root, 'opencode-0', 'opencode.db'));
  fs.mkdirSync(path.join(root, 'opencode-0', 'opencode.db'));
  assert.equal((await opencode.read({ options: { home: path.join(root, 'opencode-0') }, now: NOW })).state, 'error');
});
