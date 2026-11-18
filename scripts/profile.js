const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const os = require('node:os');
const { fixtures } = require('./performance-data');

const flag = (name, fallback) =>
  process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const runs = Number(flag('runs', '5'));
if (!Number.isInteger(runs) || runs < 1 || runs > 20) throw new Error('Runs must be 1..20');
const executable = flag('executable', '');
const baseline = flag('baseline-executable', '');
const baselineCommit = flag('baseline-commit', '');
if (baseline && !executable) throw new Error('A baseline comparison also needs --executable');
const out = path.resolve(flag('out', 'coverage/performance'));
fs.mkdirSync(out, { recursive: true });
const revision = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true });
const env = { ...process.env, HUDDLE_PROFILE_COMMIT: revision.stdout?.trim() || 'unknown' };
delete env.ELECTRON_RUN_AS_NODE;

function removeTemporary(directory) {
  const resolved = path.resolve(directory);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('huddle-profile-'))
    throw new Error('Refusing to remove a directory outside profiling temporary folders');
  fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

for (const workload of flag('workloads', 'small,large').split(',')) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'huddle-profile-fixtures-'));
  const fixtureFile = path.join(fixtureRoot, 'manifest.json');
  fs.writeFileSync(fixtureFile, JSON.stringify(fixtures(fixtureRoot, workload)));
  try {
    for (const scenario of flag('scenarios', 'full,compact,settings,hidden').split(',')) {
      for (let run = 1; run <= runs; run++) {
        const targets = baseline
          ? [
              { label: 'before', executable: baseline },
              { label: 'after', executable },
            ]
          : [{ label: '', executable }];
        if (baseline && run % 2 === 0) targets.reverse();
        for (const target of targets) {
          const destination = target.label ? path.join(out, target.label) : out;
          fs.mkdirSync(destination, { recursive: true });
          const args = [
            `--workload=${workload}`,
            `--scenario=${scenario}`,
            `--duration=${flag('duration', '65')}`,
            `--out=${path.join(destination, `${workload}-${scenario}-${run}.json`)}`,
          ];
          console.log(`${workload}/${scenario} ${target.label} repetition ${run}/${runs}`);
          const profileRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'huddle-profile-run-'));
          try {
            const child = spawnSync(
              target.executable || process.execPath,
              target.executable
                ? args
                : [path.join(__dirname, 'launch.js'), path.join(__dirname, 'profile-electron.js'), ...args],
              {
                env: {
                  ...env,
                  HUDDLE_PROFILE_COMMIT:
                    target.label === 'before' && baselineCommit ? baselineCommit : env.HUDDLE_PROFILE_COMMIT,
                  HUDDLE_PROFILE_ROOT: profileRoot,
                  HUDDLE_PROFILE_FIXTURE: fixtureFile,
                  HUDDLE_PROFILE_LAUNCH: String(Date.now()),
                },
                stdio: 'inherit',
                windowsHide: true,
                timeout: 240000,
              }
            );
            if (child.error) throw child.error;
            if (child.status !== 0) throw new Error(`Profiling failed: ${child.status}`);
          } finally {
            removeTemporary(profileRoot);
          }
        }
      }
    }
  } finally {
    removeTemporary(fixtureRoot);
  }
}
