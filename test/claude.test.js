const test = require('node:test');
const { after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const claude = require('../src/main/providers/claude');

const INPUT = path.join(__dirname, 'fixtures', 'claude-statusline-input.json');
const NOW = 1794690000 * 1000; // before both reset times in the fixture
const onWindows = process.platform === 'win32';

const temporary = [];

/** A new folder in the system temp folder, removed when this file's tests finish. */
function tempDir(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
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

/** A throwaway Claude config folder and Token Huddle data folder. */
function makeDirs(settings) {
  const home = tempDir('huddle-claude-');
  const dataDir = tempDir('huddle-data-');
  if (settings !== undefined) {
    fs.writeFileSync(
      path.join(home, 'settings.json'),
      typeof settings === 'string' ? settings : JSON.stringify(settings, null, 4)
    );
  }
  const context = { options: { home }, key: 'claude', dataDir, platform: 'win32' };
  return { home, dataDir, context, settingsFile: path.join(home, 'settings.json') };
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeSnapshot = ({ dataDir }, snapshot) =>
  fs.writeFileSync(claude.outputPath(dataDir, 'claude'), JSON.stringify(snapshot));

const SNAPSHOT = {
  captured_at: 1794689000,
  rate_limits: readJson(INPUT).rate_limits,
};

test('connect adds the status line and keeps everything else', async () => {
  const dirs = makeDirs({ model: 'example', permissions: { allow: ['Read'] } });
  assert.deepEqual(await claude.connection.status(dirs.context), { state: 'disconnected', detail: '' });

  await claude.connection.connect(dirs.context);

  const saved = readJson(dirs.settingsFile);
  assert.equal(saved.model, 'example');
  assert.deepEqual(saved.permissions, { allow: ['Read'] });
  assert.deepEqual(saved.statusLine, claude.connection.plan(dirs.context).adds.statusLine);
  assert.equal(saved.statusLine.command, claude.bridgeCommand(dirs.dataDir, 'claude'));
  assert.ok(!saved.statusLine.command.includes('\\'), 'paths use forward slashes');
  assert.match(fs.readFileSync(dirs.settingsFile, 'utf8'), /^\{\n {4}"model"/, 'keeps the file indentation');
  assert.deepEqual(readJson(path.join(dirs.home, 'settings.json.token-huddle-backup')), {
    model: 'example',
    permissions: { allow: ['Read'] },
  });
  assert.ok(fs.existsSync(path.join(dirs.dataDir, 'token-huddle-statusline.ps1')));
  assert.equal((await claude.connection.status(dirs.context)).state, 'connected');
});

test('connect works when Claude Code has no settings file yet', async () => {
  const dirs = makeDirs();
  await claude.connection.connect(dirs.context);
  assert.deepEqual(Object.keys(readJson(dirs.settingsFile)), ['statusLine']);
});

for (const operation of ['connect', 'disconnect']) {
  test(`${operation} keeps original settings until the complete replacement is ready`, async (t) => {
    const dirs = makeDirs({ model: 'example' });
    if (operation === 'disconnect') await claude.connection.connect(dirs.context);
    const original = fs.readFileSync(dirs.settingsFile, 'utf8');
    const rename = fsp.rename;
    let replacements = 0;
    t.mock.method(fsp, 'rename', async (source, destination) => {
      replacements++;
      assert.equal(destination, dirs.settingsFile);
      assert.equal(path.dirname(source), dirs.home);
      assert.notEqual(source, destination);
      assert.equal(fs.readFileSync(destination, 'utf8'), original);
      const staged = readJson(source);
      assert.equal(staged.model, 'example');
      assert.equal(Boolean(staged.statusLine), operation === 'connect');
      assert.ok(fs.readFileSync(source, 'utf8').endsWith('\n'));
      await rename(source, destination);
    });

    await claude.connection[operation](dirs.context);

    assert.equal(replacements, 1);
    assert.equal(Boolean(readJson(dirs.settingsFile).statusLine), operation === 'connect');
    assert.ok(!fs.readdirSync(dirs.home).some((name) => name.endsWith('.tmp')));
  });

  for (const failure of ['open', 'partial write', 'rename']) {
    test(`${operation} preserves settings and reports a failed ${failure}`, async (t) => {
      const dirs = makeDirs({ model: 'example' });
      if (operation === 'disconnect') await claude.connection.connect(dirs.context);
      const original = fs.readFileSync(dirs.settingsFile, 'utf8');
      const error = new Error(`injected ${failure} failure`);
      if (failure === 'rename') {
        t.mock.method(fsp, 'rename', async () => {
          throw error;
        });
      } else {
        const open = fsp.open;
        t.mock.method(fsp, 'open', async (...args) => {
          if (failure === 'open') throw error;
          const handle = await open(...args);
          const writeFile = handle.writeFile.bind(handle);
          t.mock.method(handle, 'writeFile', async () => {
            await writeFile('{ "model":');
            throw error;
          });
          return handle;
        });
      }

      await assert.rejects(claude.connection[operation](dirs.context), (caught) => caught === error);

      assert.equal(fs.readFileSync(dirs.settingsFile, 'utf8'), original);
      assert.ok(!fs.readdirSync(dirs.home).some((name) => name.endsWith('.tmp')));
    });
  }
}

test('disconnect removes only the status line and the saved usage', async () => {
  const dirs = makeDirs({ model: 'example' });
  await claude.connection.connect(dirs.context);
  writeSnapshot(dirs, SNAPSHOT);

  await claude.connection.disconnect(dirs.context);

  assert.deepEqual(readJson(dirs.settingsFile), { model: 'example' });
  assert.ok(!fs.existsSync(claude.outputPath(dirs.dataDir, 'claude')));
  assert.equal((await claude.connection.status(dirs.context)).state, 'disconnected');
});

test("the user's own status line is never replaced or removed", async () => {
  const own = { statusLine: { type: 'command', command: '~/.claude/my-statusline.sh' } };
  const dirs = makeDirs(own);

  assert.equal((await claude.connection.status(dirs.context)).state, 'conflict');
  await assert.rejects(claude.connection.connect(dirs.context), /own status line/);
  await claude.connection.disconnect(dirs.context);
  assert.deepEqual(readJson(dirs.settingsFile), own);
});

test('a settings file that cannot be parsed is left untouched', async () => {
  const dirs = makeDirs('{ "model": "example", // comment\n}');
  assert.equal((await claude.connection.status(dirs.context)).state, 'error');
  await assert.rejects(claude.connection.connect(dirs.context));
  assert.equal(fs.readFileSync(dirs.settingsFile, 'utf8'), '{ "model": "example", // comment\n}');
});

test('a second account connects to its own output file', async () => {
  const dirs = makeDirs({});
  const work = { ...dirs.context, key: 'claude-abc123' };
  await claude.connection.connect(work);
  assert.match(readJson(dirs.settingsFile).statusLine.command, /claude-claude-abc123\.json"$/);
  assert.equal((await claude.connection.status(work)).state, 'connected');
  assert.equal((await claude.connection.status(dirs.context)).state, 'disconnected');
});

test('connecting is offered on Windows only for now', async () => {
  const dirs = makeDirs({});
  const status = await claude.connection.status({ ...dirs.context, platform: 'darwin' });
  assert.equal(status.state, 'unsupported');
});

test('reads the usage Claude Code handed over', async () => {
  const dirs = makeDirs({});
  await claude.connection.connect(dirs.context);
  writeSnapshot(dirs, SNAPSHOT);

  const reading = await claude.read({ ...dirs.context, now: NOW });

  assert.equal(reading.state, 'ok');
  assert.equal(reading.source, 'local');
  assert.equal(reading.via, 'Claude Code status line');
  assert.equal(reading.updatedAt, 1794689000 * 1000);
  assert.deepEqual(
    reading.windows.map((w) => [w.label, w.short, w.usedPercent, w.resetsAt]),
    [
      ['Session', '5h', 23.5, 1794700800 * 1000],
      ['Weekly', '7d', 41.2, 1794960000 * 1000],
    ]
  );
});

test('a window past its reset time reads as empty', async () => {
  const dirs = makeDirs({});
  await claude.connection.connect(dirs.context);
  writeSnapshot(dirs, SNAPSHOT);
  const reading = await claude.read({ ...dirs.context, now: 1794700801 * 1000 });
  assert.equal(reading.windows[0].usedPercent, 0);
  assert.equal(reading.windows[1].usedPercent, 41.2);
});

test('says what to do when there is no reading', async () => {
  const dirs = makeDirs({});
  assert.match((await claude.read({ ...dirs.context, now: NOW })).message, /Open Settings to connect/);

  await claude.connection.connect(dirs.context);
  const waiting = await claude.read({ ...dirs.context, now: NOW });
  assert.equal(waiting.state, 'missing');
  assert.match(waiting.message, /Send a message/);

  const blocked = makeDirs({ statusLine: { type: 'command', command: 'mine' } });
  assert.match((await claude.read({ ...blocked.context, now: NOW })).message, /Open Settings to add Token Huddle/);
});

test('old usage is marked stale after disconnecting by hand', async () => {
  const dirs = makeDirs({});
  await claude.connection.connect(dirs.context);
  writeSnapshot(dirs, SNAPSHOT);
  fs.writeFileSync(dirs.settingsFile, '{}');
  const reading = await claude.read({ ...dirs.context, now: NOW });
  assert.equal(reading.state, 'stale');
  assert.equal(reading.windows.length, 2);
});

test('a partial or damaged snapshot is handled', () => {
  assert.deepEqual(claude.parseSnapshot(null), { windows: [], takenAt: null });
  const { windows } = claude.parseSnapshot({ rate_limits: { seven_day: { used_percentage: 130 }, five_hour: {} } });
  assert.deepEqual(
    windows.map((w) => [w.id, w.usedPercent, w.resetsAt]),
    [['seven_day', 100, null]]
  );
});

// ------------------------------------------------- the user's own status line

/** The user's own command with this card's prefix pasted in front, as the user would save it. */
const linkedSettings = (dirs, key = 'claude') => ({
  statusLine: { type: 'command', command: `${claude.prefixCommand(dirs.dataDir, key)}bash ~/.claude/my-line.sh` },
});

test('the prefix runs the script in pass-through mode and pipes into the user command', () => {
  const dirs = makeDirs();
  const prefix = claude.prefixCommand(dirs.dataDir, 'claude');
  assert.equal(prefix, `${claude.bridgeCommand(dirs.dataDir, 'claude')} -PassThrough | `);
  assert.ok(!prefix.includes('\\'), 'paths use forward slashes');
});

test('a prefixed command of this card reads as linked, and is never replaced or removed', async () => {
  const dirs = makeDirs();
  fs.writeFileSync(dirs.settingsFile, JSON.stringify({ model: 'example', ...linkedSettings(dirs) }, null, 2));
  const before = fs.readFileSync(dirs.settingsFile, 'utf8');

  assert.deepEqual(await claude.connection.status(dirs.context), {
    state: 'linked',
    detail: 'Linked. Send a message in Claude Code in a terminal to get the first reading.',
  });
  writeSnapshot(dirs, SNAPSHOT);
  assert.match((await claude.connection.status(dirs.context)).detail, /^Usage arrives through your own status line/);
  await assert.rejects(claude.connection.connect(dirs.context), /already reaches this card/);
  await claude.connection.disconnect(dirs.context);
  assert.equal(fs.readFileSync(dirs.settingsFile, 'utf8'), before);
});

test('a user command built from the bridge script without the switch is still never touched', async () => {
  const dirs = makeDirs();
  for (const command of [
    `${claude.bridgeCommand(dirs.dataDir, 'claude')} | bash ~/.claude/my-line.sh`,
    `bash ~/.claude/my-line.sh; ${claude.bridgeCommand(dirs.dataDir, 'claude')}`,
  ]) {
    fs.writeFileSync(dirs.settingsFile, JSON.stringify({ statusLine: { type: 'command', command } }));
    const before = fs.readFileSync(dirs.settingsFile, 'utf8');
    assert.equal((await claude.connection.status(dirs.context)).state, 'conflict', command);
    await assert.rejects(claude.connection.connect(dirs.context));
    await claude.connection.disconnect(dirs.context);
    assert.equal(fs.readFileSync(dirs.settingsFile, 'utf8'), before, command);
  }
});

test('an older install of Token Huddle is still recognised as ours', async () => {
  const dirs = makeDirs();
  const old = claude.bridgeCommand('C:/Old Place/Token Huddle/bridge', 'claude');
  fs.writeFileSync(dirs.settingsFile, JSON.stringify({ statusLine: { type: 'command', command: old } }));
  assert.equal((await claude.connection.status(dirs.context)).state, 'disconnected');
  await claude.connection.disconnect(dirs.context);
  assert.deepEqual(readJson(dirs.settingsFile), {});
});

test("another card's prefix is a conflict for this card", async () => {
  const dirs = makeDirs();
  fs.writeFileSync(dirs.settingsFile, JSON.stringify(linkedSettings(dirs, 'claude-abc123')));
  const status = await claude.connection.status(dirs.context);
  assert.equal(status.state, 'conflict');
  assert.match(status.detail, /different Token Huddle card/);
  assert.equal((await claude.connection.status({ ...dirs.context, key: 'claude-abc123' })).state, 'linked');
});

test('link() writes the script into Token Huddle data only and returns the prefix', async () => {
  const own = { statusLine: { type: 'command', command: 'bash ~/.claude/my-line.sh' } };
  const dirs = makeDirs(own);
  const before = fs.readFileSync(dirs.settingsFile, 'utf8');

  const result = await claude.connection.link(dirs.context);

  assert.deepEqual(result, { prefix: claude.prefixCommand(dirs.dataDir, 'claude'), file: dirs.settingsFile });
  assert.equal(fs.readFileSync(path.join(dirs.dataDir, 'token-huddle-statusline.ps1'), 'utf8'), claude.SCRIPT);
  assert.equal(fs.readFileSync(dirs.settingsFile, 'utf8'), before);
  assert.ok(!fs.existsSync(path.join(dirs.home, 'settings.json.token-huddle-backup')));
});

test('link() is offered on Windows only for now', async () => {
  const dirs = makeDirs({});
  await assert.rejects(claude.connection.link({ ...dirs.context, platform: 'darwin' }), /Windows only/);
});

test('readings for an own status line, linked or not', async () => {
  const dirs = makeDirs({ statusLine: { type: 'command', command: 'bash ~/.claude/my-line.sh' } });

  let reading = await claude.read({ ...dirs.context, now: NOW });
  assert.equal(reading.state, 'missing');
  assert.match(reading.message, /own status line\. Open Settings/);

  writeSnapshot(dirs, SNAPSHOT);
  reading = await claude.read({ ...dirs.context, now: NOW });
  assert.equal(reading.state, 'stale', 'an old reading from before is not passed off as current');

  fs.writeFileSync(dirs.settingsFile, JSON.stringify(linkedSettings(dirs)));
  reading = await claude.read({ ...dirs.context, now: NOW });
  assert.equal(reading.state, 'ok');
  assert.equal(reading.windows.length, 2);

  fs.rmSync(claude.outputPath(dirs.dataDir, 'claude'));
  reading = await claude.read({ ...dirs.context, now: NOW });
  assert.equal(reading.state, 'missing');
  assert.match(reading.message, /^Linked\. Send a message in Claude Code in a terminal/);
});

test('this module never touches the login file or the network', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'providers', 'claude.js'), 'utf8');
  assert.ok(!/credentials|accessToken|fetch\(|https?:\/\//.test(source));
});

test(
  'the status line script saves only the usage numbers',
  { skip: !onWindows && 'needs PowerShell on Windows' },
  async () => {
    const dirs = makeDirs({});
    await claude.connection.connect(dirs.context);
    const script = path.join(dirs.dataDir, 'token-huddle-statusline.ps1');
    const out = claude.outputPath(dirs.dataDir, 'claude');
    const run = (input) =>
      spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, out], {
        input,
        encoding: 'utf8',
      });

    const result = run(fs.readFileSync(INPUT, 'utf8'));
    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), '5h 24% | 7d 41%');
    const saved = readJson(out);
    assert.deepEqual(Object.keys(saved).sort(), ['captured_at', 'rate_limits']);
    assert.deepEqual(saved.rate_limits, readJson(INPUT).rate_limits);
    assert.ok(Math.abs(saved.captured_at - Date.now() / 1000) < 120);

    // Input without usage (before the first response, or garbage) must not wipe the last reading.
    assert.equal(run('{"session_id":"x"}').stdout.trim(), '');
    assert.equal(run('not json').status, 0);
    assert.deepEqual(readJson(out).rate_limits, readJson(INPUT).rate_limits);

    const reading = await claude.read({ ...dirs.context, now: NOW });
    assert.equal(reading.state, 'ok');
    assert.equal(reading.windows.length, 2);
  }
);

test(
  'pass-through mode hands the input on byte for byte and still saves usage',
  { skip: !onWindows && 'needs PowerShell on Windows' },
  async () => {
    const dirs = makeDirs({});
    await claude.connection.link(dirs.context);
    const script = path.join(dirs.dataDir, 'token-huddle-statusline.ps1');
    const out = claude.outputPath(dirs.dataDir, 'claude');
    const run = (input, target = out) =>
      spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, target, '-PassThrough'], {
        input,
      });

    const fixture = fs.readFileSync(INPUT);
    let result = run(fixture);
    assert.equal(result.status, 0);
    assert.ok(result.stdout.equals(fixture), 'stdout is exactly the input');
    assert.deepEqual(readJson(out).rate_limits, readJson(INPUT).rate_limits);

    const unicode = Buffer.from(
      '{"cwd":"C:/Users/Ünïcode/项目","rate_limits":{"five_hour":{"used_percentage":5,"resets_at":1}}}',
      'utf8'
    );
    result = run(unicode);
    assert.equal(result.status, 0);
    assert.ok(result.stdout.equals(unicode), 'non-ASCII text passes through unchanged, with no BOM');
    assert.equal(readJson(out).rate_limits.five_hour.used_percentage, 5);

    const garbage = Buffer.from('not json');
    result = run(garbage);
    assert.equal(result.status, 0);
    assert.ok(result.stdout.equals(garbage), 'input that cannot be read still reaches the user command');
    assert.equal(readJson(out).rate_limits.five_hour.used_percentage, 5, 'and the last reading is kept');

    // Saving fails (the output folder does not exist): the user's command must still get its input.
    const unwritable = claude.outputPath(path.join(dirs.dataDir, 'missing-folder'), 'claude');
    result = run(fixture, unwritable);
    assert.equal(result.status, 0);
    assert.ok(result.stdout.equals(fixture), 'input still reaches the user command when saving fails');
    assert.ok(!fs.existsSync(unwritable), 'and nothing is written');
  }
);
