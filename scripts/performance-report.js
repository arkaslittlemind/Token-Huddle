const fs = require('node:fs');
const path = require('node:path');
const { summarizeSamples, compare } = require('./performance-data');

function buildReport(runs) {
  if (!runs.length || runs.some((run) => run.schemaVersion !== 1 || !run.resources?.length))
    throw new Error('No complete profiling runs found');
  if (
    runs.some(
      (run) =>
        run.version !== runs[0].version ||
        run.commit !== runs[0].commit ||
        JSON.stringify(run.environment) !== JSON.stringify(runs[0].environment)
    )
  )
    throw new Error('Mixed source versions or measurement environments');
  const fixtures = new Map();
  for (const run of runs) {
    const previous = fixtures.get(run.workload);
    if (previous && previous !== JSON.stringify(run.fixture)) throw new Error('Mixed fixtures for a workload');
    fixtures.set(run.workload, JSON.stringify(run.fixture));
  }
  const groups = new Map();
  for (const run of runs) {
    const key = `${run.build}/${run.workload}/${run.scenario}/${run.duration}s`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(run);
  }
  const summary = [];
  for (const [scenario, items] of groups) {
    const measurements = {};
    const add = (name, unit, values) => {
      const summary = summarizeSamples(values);
      if (summary) measurements[name] = { unit, ...summary };
    };
    for (const name of [
      'launchToVisibleMs',
      'launchToDataPaintMs',
      'visibleMs',
      'firstDataPaintMs',
      'refreshInputRoundTripMs',
      'resizeIPC',
    ])
      add(name, name === 'resizeIPC' ? 'count' : 'ms', items.map((item) => item[name]).filter(Number.isFinite));
    add(
      'initialRefresh',
      'ms',
      items.map((item) => item.refreshes[0].ms)
    );
    add(
      'forcedRefresh',
      'ms',
      items.flatMap((item) => item.refreshes.filter((refresh) => refresh.force).map((refresh) => refresh.ms))
    );
    add(
      'automaticWarmRefresh',
      'ms',
      items.flatMap((item) =>
        item.refreshes
          .slice(1)
          .filter((refresh) => !refresh.force)
          .map((refresh) => refresh.ms)
      )
    );
    add(
      'eventLoopMax',
      'ms',
      items.map((item) => item.eventLoop.maxMs)
    );
    for (const provider of ['claude', 'opencode', 'codex']) {
      add(
        `${provider}Initial`,
        'ms',
        items.flatMap((item) =>
          item.providers
            .filter((reading) => reading.key.startsWith(provider))
            .slice(0, 2)
            .map((reading) => reading.ms)
        )
      );
      add(
        `${provider}Forced`,
        'ms',
        items.flatMap((item) =>
          item.providers
            .filter((reading) => reading.key.startsWith(provider) && reading.force)
            .map((reading) => reading.ms)
        )
      );
    }
    for (const provider of ['claude', 'opencode', 'codex']) {
      add(
        provider + 'Synchronous',
        'ms',
        items
          .flatMap((item) =>
            item.providers.filter((reading) => reading.key.startsWith(provider)).map((reading) => reading.synchronousMs)
          )
          .filter(Number.isFinite)
      );
    }
    for (const type of ['Browser', 'Tab', 'GPU', 'Utility']) {
      const samples = items.flatMap((item) =>
        item.resources.flatMap((sample) => sample.processes.filter((process) => process.type === type))
      );
      add(
        `${type}CPU`,
        '%',
        samples.map((process) => process.cpuPercent)
      );
      add(
        `${type}WorkingSet`,
        'MB',
        samples.map((process) => process.workingSetMB)
      );
      add(
        `${type}Private`,
        'MB',
        samples.map((process) => process.privateMB)
      );
    }
    for (const type of ['widget', 'settings']) {
      for (const metric of ['ScriptDuration', 'LayoutDuration', 'TaskDuration']) {
        const values = items.flatMap((item) => {
          const start = item.renderer.find((entry) => entry.type === type && entry.phase === 'start');
          const end = item.renderer.find((entry) => entry.type === type && entry.phase === 'end');
          return start && end ? [Math.max(0, (end[metric] - start[metric]) * 1000)] : [];
        });
        add(`${type}${metric}`, 'ms', values);
      }
    }
    summary.push({
      scenario,
      runs: items.length,
      observationMs: items.map((item) => item.observationMs),
      measurements,
    });
  }
  const report = {
    schemaVersion: 1,
    recordedAt: new Date().toISOString(),
    environment: runs[0].environment,
    version: runs[0].version,
    commit: runs[0].commit,
    instrumented: true,
    fixtures: Object.fromEntries(runs.map((run) => [run.workload, run.fixture])),
    summary,
  };
  return report;
}

function compareReports(before, after) {
  return before.summary.map((previous) => {
    const current = after.summary.find((item) => item.scenario === previous.scenario);
    const workload = previous.scenario.split('/')[1];
    const context = (report, metric) =>
      report.environment && report.fixtures[workload]
        ? {
            scenario: previous.scenario,
            environment: report.environment,
            fixture: report.fixtures[workload],
            unit: metric?.unit,
          }
        : null;
    const measurements = {};
    for (const [name, oldMetric] of Object.entries(previous.measurements)) {
      const nextMetric = current?.measurements[name];
      measurements[name] = {
        before: oldMetric,
        after: nextMetric || null,
        ...compare(
          { context: context(before, oldMetric), value: oldMetric.median },
          { context: context(after, nextMetric), value: nextMetric?.median }
        ),
      };
    }
    return { scenario: previous.scenario, beforeRuns: previous.runs, afterRuns: current?.runs || 0, measurements };
  });
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const output = args.find((arg) => arg.startsWith('--out='))?.slice(6) || 'docs/performance-baseline.json';
  const before = args.find((arg) => arg.startsWith('--before='))?.slice(9);
  const comparisonOutput =
    args.find((arg) => arg.startsWith('--comparison-out='))?.slice(17) || 'docs/performance-opencode-comparison.json';
  const directories = args.filter((arg) => !arg.startsWith('--'));
  if (!directories.length) throw new Error('Pass directories containing profile run JSON files');
  const runs = directories.flatMap((directory) =>
    fs
      .readdirSync(directory)
      .filter((file) => file.endsWith('.json'))
      .map((file) => JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')))
  );
  const report = buildReport(runs);
  fs.writeFileSync(path.resolve(output), JSON.stringify(report, null, 2) + '\n');
  console.log(`Saved ${output}`);
  if (before) {
    const comparison = compareReports(JSON.parse(fs.readFileSync(before, 'utf8')), report);
    fs.writeFileSync(path.resolve(comparisonOutput), JSON.stringify(comparison, null, 2) + '\n');
    console.log(`Saved ${comparisonOutput}`);
  }
}
module.exports = { buildReport, compareReports };
