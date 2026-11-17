// In-app updates: the state of an update and what the tray and Settings say
// about it. No Electron here; main.js feeds electron-updater's events through
// reduce() and shows present().
//
// A version comes from the network (latest.yml), so it is checked before it
// is kept, shown or put in a link.

const RELEASES = 'https://github.com/arkaslittlemind/token-huddle/releases/tag/v';
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z][0-9A-Za-z.-]*)?$/;

// The first check waits until start-up is over; then one every 6 hours.
const CHECK_DELAY_MS = 30 * 1000;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

const INITIAL = Object.freeze({ status: 'idle' });

function isValidVersion(text) {
  return typeof text === 'string' && text.length <= 64 && VERSION.test(text);
}

function shouldCheck({ packaged, enabled, demo, manual = false }) {
  return Boolean(packaged && (enabled || manual) && !demo);
}

/** The release page of a version, or null when the version is not valid. */
function releaseUrl(version) {
  return isValidVersion(version) ? `${RELEASES}${version}` : null;
}

/** An install the user started is under way; checks and the switch leave it alone. */
const isBusy = (state) => state.status === 'downloading' || state.status === 'ready';

/**
 * The next state. Events that do not fit the current state return it
 * unchanged, and a background check never interrupts an install the user
 * started.
 */
function reduce(state, event) {
  const manual = state.manual ? { manual: true } : {};
  switch (event?.type) {
    case 'checking':
      return isBusy(state) ? state : { status: 'checking', ...(event.manual ? { manual: true } : {}) };
    case 'not-available':
      return isBusy(state) ? state : { status: 'none', ...manual };
    case 'available':
      if (isBusy(state)) return state;
      return isValidVersion(event.version)
        ? { status: 'available', version: event.version, ...manual }
        : { status: 'error', userStarted: false, ...manual };
    case 'install-clicked':
      return state.version && (state.status === 'available' || state.status === 'error')
        ? { status: 'downloading', version: state.version, percent: 0, ...manual }
        : state;
    case 'progress': {
      if (state.status !== 'downloading') return state;
      const percent = Number.isFinite(event.percent) ? Math.round(Math.min(100, Math.max(0, event.percent))) : 0;
      return percent === state.percent ? state : { ...state, percent };
    }
    case 'downloaded':
      return state.status === 'downloading' ? { status: 'ready', version: state.version, ...manual } : state;
    case 'error':
      // electron-updater reports a failed download twice; keep the retry offer from the first.
      if (state.status === 'error' && state.userStarted) return state;
      return isBusy(state)
        ? { status: 'error', userStarted: true, version: state.version, ...manual }
        : { status: 'error', userStarted: false, ...manual };
    case 'disabled':
      return isBusy(state) ? state : INITIAL;
    default:
      return state;
  }
}

/**
 * What to show: `label` is the tray item (null for none), `clickable` whether
 * it can be clicked, `status` the Settings line, `action` what a click does
 * ('install', 'open-release' or null).
 */
function present(state, { portable, packaged, enabled }) {
  const quiet = (status) => ({ label: null, clickable: false, status, action: null });
  if (!packaged) return quiet('Updates are checked only in the installed and portable app.');
  if (!enabled && !state.manual && !isBusy(state)) return quiet('Update checks are off.');
  const { version } = state;
  const offer = (status) =>
    portable
      ? { label: `Download ${version}`, clickable: true, status, action: 'open-release' }
      : { label: `Install update ${version}`, clickable: true, status, action: 'install' };
  switch (state.status) {
    case 'checking':
      return quiet('Checking for updates.');
    case 'none':
      return quiet('Token Huddle is up to date.');
    case 'available':
      return offer(
        portable
          ? `Version ${version} is available. The portable app cannot update itself: download the new version.`
          : `Version ${version} is available.`
      );
    case 'downloading':
      return {
        label: `Downloading update ${version} (${state.percent}%)`,
        clickable: false,
        // The tray shows the percentage; the announced Settings line changes once.
        status: `Downloading version ${version}.`,
        action: null,
      };
    case 'ready':
      return {
        label: `Restarting to install ${version}`,
        clickable: false,
        status: `Restarting to install version ${version}.`,
        action: null,
      };
    case 'error':
      // A failed background check stays quiet: until the first public release every check fails.
      if (state.userStarted && version) return offer('Update failed. Try again from the tray or Settings.');
      return quiet(state.manual ? 'Could not check for updates. Try again.' : '');
    default:
      return quiet('');
  }
}

module.exports = {
  CHECK_DELAY_MS,
  CHECK_INTERVAL_MS,
  INITIAL,
  isBusy,
  isValidVersion,
  shouldCheck,
  releaseUrl,
  reduce,
  present,
};
