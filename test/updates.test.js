const test = require('node:test');
const assert = require('node:assert/strict');
const updates = require('../src/main/updates');

const { INITIAL, reduce, present, isValidVersion, shouldCheck, releaseUrl } = updates;

/** Runs a list of events from the initial state. */
const run = (...events) => events.reduce(reduce, INITIAL);
const installed = { portable: false, packaged: true, enabled: true };
const portable = { portable: true, packaged: true, enabled: true };

test('isValidVersion accepts plain and pre-release versions only', () => {
  for (const ok of ['0.1.0', '1.20.300', '0.1.0-rc.2', '2.0.0-beta-1']) assert.equal(isValidVersion(ok), true, ok);
  for (const bad of [
    '',
    'v0.1.0',
    '0.1',
    '0.1.0.4',
    '0.1.0-',
    '0.1.0-rc 2',
    '0.1.0/../x',
    '0.1.0<script>',
    `0.1.0-${'a'.repeat(80)}`,
    null,
    12,
  ]) {
    assert.equal(isValidVersion(bad), false, String(bad));
  }
});

test('shouldCheck needs the packaged app, the switch on and no demo', () => {
  assert.equal(shouldCheck({ packaged: true, enabled: true, demo: false }), true);
  assert.equal(shouldCheck({ packaged: false, enabled: true, demo: false }), false);
  assert.equal(shouldCheck({ packaged: true, enabled: false, demo: false }), false);
  assert.equal(shouldCheck({ packaged: true, enabled: true, demo: true }), false);
});

test('a check moves through checking to none or available', () => {
  assert.deepEqual(run({ type: 'checking' }), { status: 'checking' });
  assert.deepEqual(run({ type: 'checking' }, { type: 'not-available' }), { status: 'none' });
  assert.deepEqual(run({ type: 'checking' }, { type: 'available', version: '0.2.0' }), {
    status: 'available',
    version: '0.2.0',
  });
});

test('a version that fails the check is a quiet error and is never kept', () => {
  const state = run({ type: 'available', version: '0.2.0"><img>' });
  assert.deepEqual(state, { status: 'error', userStarted: false });
  assert.equal(JSON.stringify(state).includes('img'), false);
  assert.deepEqual(present(state, installed).action, null);
});

test('install runs from available through downloading to ready', () => {
  const available = run({ type: 'available', version: '0.2.0' });
  const downloading = reduce(available, { type: 'install-clicked' });
  assert.deepEqual(downloading, { status: 'downloading', version: '0.2.0', percent: 0 });
  assert.deepEqual(reduce(downloading, { type: 'progress', percent: 41.6 }), {
    status: 'downloading',
    version: '0.2.0',
    percent: 42,
  });
  assert.equal(reduce(downloading, { type: 'progress', percent: 140 }).percent, 100);
  assert.equal(reduce(downloading, { type: 'progress', percent: Number.NaN }).percent, 0);
  assert.deepEqual(reduce(downloading, { type: 'downloaded' }), { status: 'ready', version: '0.2.0' });
});

test('events that do not fit the current state change nothing', () => {
  const none = run({ type: 'not-available' });
  assert.equal(reduce(none, { type: 'install-clicked' }), none);
  assert.equal(reduce(none, { type: 'progress', percent: 50 }), none);
  assert.equal(reduce(none, { type: 'downloaded' }), none);
  assert.equal(reduce(none, { type: 'nonsense' }), none);
  // A background check never interrupts an install the user started.
  const downloading = run({ type: 'available', version: '0.2.0' }, { type: 'install-clicked' });
  for (const type of ['checking', 'not-available']) assert.equal(reduce(downloading, { type }), downloading);
  assert.equal(reduce(downloading, { type: 'available', version: '0.3.0' }), downloading);
});

test('an error during an install the user started is remembered with its version', () => {
  const downloading = run({ type: 'available', version: '0.2.0' }, { type: 'install-clicked' });
  const failed = reduce(downloading, { type: 'error' });
  assert.deepEqual(failed, { status: 'error', userStarted: true, version: '0.2.0' });
  // The user can try again from the failed state.
  assert.deepEqual(reduce(failed, { type: 'install-clicked' }), {
    status: 'downloading',
    version: '0.2.0',
    percent: 0,
  });
  assert.deepEqual(run({ type: 'checking' }, { type: 'error' }), { status: 'error', userStarted: false });
});

test('a failed install reported twice keeps its retry offer', () => {
  // electron-updater sends an 'error' event and also rejects downloadUpdate().
  const failed = run({ type: 'available', version: '0.2.0' }, { type: 'install-clicked' }, { type: 'error' });
  const twice = reduce(failed, { type: 'error' });
  assert.equal(twice, failed);
  assert.equal(present(twice, installed).action, 'install');
  assert.equal(present(twice, installed).status, 'Update failed. Try again from the tray or Settings.');
});

test('turning checks off resets the state, but not an install the user started', () => {
  const available = run({ type: 'available', version: '0.2.0' });
  assert.deepEqual(reduce(available, { type: 'disabled' }), INITIAL);
  const downloading = reduce(available, { type: 'install-clicked' });
  assert.equal(reduce(downloading, { type: 'disabled' }), downloading);
  assert.equal(updates.isBusy(downloading), true);
  assert.equal(updates.isBusy(available), false);
});

test('progress that rounds to the same percent changes nothing', () => {
  const downloading = reduce(run({ type: 'available', version: '0.2.0' }, { type: 'install-clicked' }), {
    type: 'progress',
    percent: 42,
  });
  assert.equal(reduce(downloading, { type: 'progress', percent: 42.3 }), downloading);
});

test('installed build: the tray and Settings offer the install, then show progress', () => {
  const available = run({ type: 'available', version: '0.2.0' });
  assert.deepEqual(present(available, installed), {
    label: 'Install update 0.2.0',
    clickable: true,
    status: 'Version 0.2.0 is available.',
    action: 'install',
  });
  const downloading = reduce(reduce(available, { type: 'install-clicked' }), { type: 'progress', percent: 42 });
  assert.deepEqual(present(downloading, installed), {
    label: 'Downloading update 0.2.0 (42%)',
    clickable: false,
    status: 'Downloading version 0.2.0.',
    action: null,
  });
  assert.deepEqual(present(reduce(downloading, { type: 'downloaded' }), installed), {
    label: 'Restarting to install 0.2.0',
    clickable: false,
    status: 'Restarting to install version 0.2.0.',
    action: null,
  });
});

test('turning checks off keeps download progress and restart status visible', () => {
  const disabled = { ...installed, enabled: false };
  let state = run(
    { type: 'available', version: '0.2.0' },
    { type: 'install-clicked' },
    { type: 'progress', percent: 42 },
    { type: 'disabled' }
  );
  assert.deepEqual(present(state, disabled), {
    label: 'Downloading update 0.2.0 (42%)',
    clickable: false,
    status: 'Downloading version 0.2.0.',
    action: null,
  });
  state = reduce(state, { type: 'progress', percent: 73 });
  assert.equal(present(state, disabled).label, 'Downloading update 0.2.0 (73%)');
  state = reduce(state, { type: 'downloaded' });
  state = reduce(state, { type: 'disabled' });
  assert.deepEqual(present(state, disabled), {
    label: 'Restarting to install 0.2.0',
    clickable: false,
    status: 'Restarting to install version 0.2.0.',
    action: null,
  });
});

test('disabled checks keep every non-busy state quiet', () => {
  for (const state of [
    INITIAL,
    run({ type: 'checking' }),
    run({ type: 'not-available' }),
    run({ type: 'available', version: '0.2.0' }),
    run({ type: 'checking' }, { type: 'error' }),
    run({ type: 'available', version: '0.2.0' }, { type: 'install-clicked' }, { type: 'error' }),
  ]) {
    for (const options of [installed, portable]) {
      assert.deepEqual(present(state, { ...options, enabled: false }), {
        label: null,
        clickable: false,
        status: 'Update checks are off.',
        action: null,
      });
    }
  }
});

test('an unpackaged app keeps its explanation even with a busy update state', () => {
  const downloading = run({ type: 'available', version: '0.2.0' }, { type: 'install-clicked' });
  for (const state of [downloading, reduce(downloading, { type: 'downloaded' })]) {
    assert.deepEqual(present(state, { ...installed, packaged: false, enabled: false }), {
      label: null,
      clickable: false,
      status: 'Updates are checked only in the installed and portable app.',
      action: null,
    });
  }
});

test('portable build: it links to the download and never installs', () => {
  const available = run({ type: 'available', version: '0.2.0' });
  assert.deepEqual(present(available, portable), {
    label: 'Download 0.2.0',
    clickable: true,
    status: 'Version 0.2.0 is available. The portable app cannot update itself: download the new version.',
    action: 'open-release',
  });
});

test('a background check error shows nothing; a failed install offers a retry', () => {
  const quiet = present(run({ type: 'checking' }, { type: 'error' }), installed);
  assert.deepEqual(quiet, { label: null, clickable: false, status: '', action: null });
  const failed = run({ type: 'available', version: '0.2.0' }, { type: 'install-clicked' }, { type: 'error' });
  assert.deepEqual(present(failed, installed), {
    label: 'Install update 0.2.0',
    clickable: true,
    status: 'Update failed. Try again from the tray or Settings.',
    action: 'install',
  });
});

test('quiet states have a status line but no tray item', () => {
  assert.deepEqual(present(run({ type: 'checking' }), installed), {
    label: null,
    clickable: false,
    status: 'Checking for updates.',
    action: null,
  });
  assert.equal(present(run({ type: 'not-available' }), installed).status, 'Token Huddle is up to date.');
  assert.equal(present(INITIAL, installed).status, '');
  assert.equal(present(INITIAL, { ...installed, enabled: false }).status, 'Update checks are off.');
  assert.equal(
    present(INITIAL, { ...installed, packaged: false }).status,
    'Updates are checked only in the installed and portable app.'
  );
});

test('releaseUrl points at this project, and only for a valid version', () => {
  assert.equal(releaseUrl('0.2.0'), 'https://github.com/arkaslittlemind/token-huddle/releases/tag/v0.2.0');
  assert.equal(releaseUrl('0.2.0/../../evil'), null);
});
