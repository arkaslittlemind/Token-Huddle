const fs = require('node:fs');
const path = require('node:path');

const NOW = new Date(2026, 10, 18, 15).getTime();

function summarize(values) {
  if (!values.length || values.some((value) => !Number.isFinite(value) || value < 0))
    throw new Error('Expected nonempty finite nonnegative measurements');
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return {
    count: sorted.length,
    median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
    min: sorted[0],
    max: sorted.at(-1),
  };
}

function compare(before, after) {
  if (!before.context || !after.context) return { unavailable: 'Missing measurement context' };
  if (JSON.stringify(before.context) !== JSON.stringify(after.context))
    return { unavailable: 'Measurement contexts differ' };
  if (!Number.isFinite(before.value) || !Number.isFinite(after.value) || before.value < 0 || after.value < 0)
    return { unavailable: 'Missing or invalid measurement' };
  return {
    delta: after.value - before.value,
    percent: before.value === 0 ? null : ((after.value - before.value) / before.value) * 100,
  };
}

function summarizeSamples(values) {
  const valid = values.filter((value) => Number.isFinite(value) && value >= 0);
  return valid.length ? { ...summarize(valid), invalidSamples: values.length - valid.length } : null;
}

function fixtures(root, workload = 'small') {
  if (!['small', 'large'].includes(workload)) throw new Error('Unknown workload');
  const { DatabaseSync } = require('node:sqlite');
  const count = workload === 'large' ? 100000 : 100;
  const files = workload === 'large' ? 100 : 1;
  const instances = [];
  const manifest = [];
  for (let account = 0; account < 2; account++) {
    for (const provider of ['claude', 'opencode', 'codex']) {
      const home = path.join(root, `${provider}-${account}`);
      fs.mkdirSync(home, { recursive: true });
      const key = `${provider}-${account}`;
      instances.push({
        key,
        provider,
        label: `Sample ${account + 1}`,
        enabled: true,
        alerts: false,
        options: { home },
      });
      if (provider === 'claude') {
        fs.mkdirSync(path.join(home, 'projects'));
        for (let file = 0; file < files; file++) {
          const lines = [];
          for (let row = 0; row < count / files; row++) {
            lines.push(
              JSON.stringify({
                type: 'assistant',
                timestamp: new Date(NOW).toISOString(),
                message: { id: `sample-${file}-${row}`, usage: { input_tokens: 10 + account, output_tokens: 5 } },
              })
            );
          }
          fs.writeFileSync(path.join(home, 'projects', `${file}.jsonl`), lines.join('\n') + '\n');
        }
      } else if (provider === 'opencode') {
        const db = new DatabaseSync(path.join(home, 'opencode.db'));
        try {
          db.exec(
            'create table message (id text primary key, time_created integer, data text); create table session_message (id text primary key, time_created integer, type text, data text); begin'
          );
          const first = db.prepare('insert into message values (?, ?, ?)');
          const second = db.prepare('insert into session_message values (?, ?, ?, ?)');
          const data = JSON.stringify({
            role: 'assistant',
            tokens: { input: 10 + account, output: 5 },
            modelID: 'synthetic',
          });
          for (let row = 0; row < count; row++) {
            first.run(`sample-${row}`, NOW, data);
            second.run(`sample-${row}`, NOW, 'assistant', data);
          }
          db.exec('commit');
        } finally {
          db.close();
        }
      } else {
        fs.mkdirSync(path.join(home, 'sessions'));
        fs.writeFileSync(
          path.join(home, 'sessions', 'rollout-sample.jsonl'),
          JSON.stringify({
            timestamp: new Date(NOW).toISOString(),
            type: 'event_msg',
            payload: {
              type: 'token_count',
              rate_limits: {
                primary: { used_percent: 25 + account, window_minutes: 300, resets_at: NOW / 1000 + 3600 },
              },
            },
          }) + '\n'
        );
      }
      const sizes = [];
      function walk(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const file = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(file);
          else sizes.push(fs.statSync(file).size);
        }
      }
      walk(home);
      manifest.push({
        key,
        files: sizes.length,
        bytes: sizes.reduce((a, b) => a + b, 0),
        rows: provider === 'opencode' ? count * 2 : provider === 'claude' ? count : 1,
        expectedTokens: provider === 'codex' ? null : count * (15 + account),
      });
    }
  }
  return { instances, manifest, now: NOW, workload };
}

module.exports = { fixtures, summarize, summarizeSamples, compare, NOW };
