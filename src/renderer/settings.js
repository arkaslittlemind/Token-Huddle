const api = window.huddle.settings;
const list = document.getElementById('cards');
const errorBox = document.getElementById('error');
const form = document.getElementById('add');
const providerSelect = document.getElementById('provider');
const labelInput = document.getElementById('label');
const homeInput = document.getElementById('home');
const welcomeView = document.getElementById('welcome');
const settingsView = document.getElementById('settings');
const toolList = document.getElementById('tools');
const thresholdInputs = [document.getElementById('threshold-1'), document.getElementById('threshold-2')];
const thresholdError = document.getElementById('threshold-error');
const updateVersion = document.getElementById('update-version');
const checkUpdates = document.getElementById('check-updates');
const updateAction = document.getElementById('update-action');
const updateStatus = document.getElementById('update-status');

const CONNECTION = {
  connected: 'Connected',
  linked: 'Linked',
  disconnected: 'Limits not enabled',
  conflict: 'Own status line',
  unsupported: 'Not available',
  error: 'Problem',
};

/** Prefixes the user copied, by card key, so they stay on screen when the list redraws. */
const copied = new Map();
let lastState = null;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(text, title, onClick, className = '') {
  const node = el('button', className, text);
  node.type = 'button';
  node.title = title;
  node.setAttribute('aria-label', title);
  node.addEventListener('click', onClick);
  return node;
}

function switchControl(text, title, checked, onChange) {
  const toggle = el('label', 'switch');
  const box = el('input');
  box.type = 'checkbox';
  box.checked = checked;
  box.setAttribute('aria-label', title);
  box.addEventListener('change', () => run(() => onChange(box.checked)));
  toggle.append(box, text);
  return toggle;
}

function showError(message) {
  errorBox.textContent = message || '';
  errorBox.hidden = !message;
}

/** Run a change in the main process; the list redraws from its update event. */
async function run(action) {
  showError('');
  const result = await action();
  if (result && result.ok === false) showError(result.error);
  return result;
}

function cardRow(card, index, total) {
  const row = el('li', 'card');
  row.dataset.key = card.key;
  const top = el('div', 'top');
  const dot = el('span', 'dot');
  dot.style.background = card.accent;

  const tools = el('div', 'tools');
  const up = button('↑', `Move ${card.name} up`, () => run(() => api.move(card.key, -1)), 'icon');
  const down = button('↓', `Move ${card.name} down`, () => run(() => api.move(card.key, 1)), 'icon');
  up.disabled = index === 0;
  down.disabled = index === total - 1;
  tools.append(up, down);
  if (card.removable) {
    tools.append(button('Remove', `Remove ${card.name}`, () => run(() => api.remove(card.key)), 'danger'));
  }
  tools.append(
    switchControl('Show', `Show ${card.name} on the widget`, card.enabled, (on) => api.setEnabled(card.key, on)),
    switchControl('Alerts', `Alerts for ${card.name}`, card.alerts, (on) => api.setAlerts(card.key, on))
  );

  top.append(dot, el('span', 'name', card.name), tools);
  row.append(top);

  if (card.home) {
    const detail = el('p', 'detail');
    detail.append(el('span', 'path', card.home));
    row.append(detail);
  }

  if (card.connection) {
    const { state } = card.connection;
    const text = connectionText(card.connection);
    const detail = el('p', 'detail');
    detail.append(
      connectionBadge(state),
      text ||
        (state === 'connected'
          ? 'Subscription limits arrive after each Claude Code response in a terminal. Local token totals work automatically.'
          : 'Local token totals work automatically. Enable subscription limits to add quota percentages.')
    );
    row.append(detail, ...connectionControls(card));
  }
  return row;
}

/** A connection problem always says what to do next; other states show the provider's own detail. */
function connectionText({ state, detail }) {
  if (state === 'error') {
    const base = (detail || 'Could not check the connection').replace(/\.$/, '');
    return /try again/i.test(base) ? `${base}.` : `${base}. Close and reopen Settings to try again.`;
  }
  return detail;
}

function connectionBadge(state) {
  return el('span', `badge ${state}`, CONNECTION[state] || state);
}

/**
 * The connect, disconnect and copy-prefix controls for a bridge card. Shared by
 * the settings list and the first-run welcome, so the two cannot drift.
 */
function connectionControls(card) {
  const { state } = card.connection;
  const nodes = [];
  if (state === 'linked') {
    nodes.push(el('p', 'detail', 'To unlink, remove the prefix from your status line command.'));
  }
  const actions = el('div', 'actions');
  if (state === 'connected') {
    actions.append(button('Disconnect', `Disconnect ${card.name}`, () => run(() => api.disconnect(card.key))));
  } else if (state === 'disconnected') {
    actions.append(
      button(
        'Enable subscription limits',
        `Enable subscription limits for ${card.name}`,
        () => run(() => api.connect(card.key)),
        'primary'
      )
    );
  } else if (state === 'conflict') {
    actions.append(button('Copy prefix', `Copy prefix for ${card.name}`, () => copyPrefix(card.key), 'primary'));
  }
  if (actions.childElementCount) nodes.push(actions);
  if (state === 'conflict' && copied.has(card.key)) nodes.push(prefixSteps(copied.get(card.key)));
  return nodes;
}

const CONNECT_PROMISE = 'Token Huddle shows you the change first, keeps a backup, and Disconnect undoes it.';

/** One row of the first-run welcome: a supported tool, found or not, and where its numbers come from. */
function toolRow(tool) {
  const row = el('li', 'card');
  row.dataset.key = tool.card?.key || tool.id || tool.name;
  const top = el('div', 'top');
  const dot = el('span', 'dot');
  dot.style.background = tool.accent;
  top.append(dot, el('span', 'name', tool.name));
  row.append(top);

  const detail = el('p', 'detail');
  const connection = tool.found && tool.card?.connection;
  if (!tool.found) {
    detail.append(
      el('span', 'badge absent', 'Not found'),
      'Not found on this computer. You can add its folder later in Settings.'
    );
  } else if (connection) {
    detail.append(connectionBadge(connection.state), tool.about);
  } else {
    detail.append(el('span', 'badge ready', 'Ready'), tool.about);
  }
  row.append(detail);

  if (connection) {
    const note =
      connection.detail ||
      (connection.state === 'disconnected'
        ? CONNECT_PROMISE
        : connection.state === 'connected'
          ? 'Subscription limits arrive after each Claude Code response in a terminal. Local token totals work automatically.'
          : '');
    if (note) row.append(el('p', 'detail', note));
    row.append(...connectionControls(tool.card));
  }
  return row;
}

/** The copied prefix and the three steps to apply it. Text only: the paths can hold the user name. */
function prefixSteps({ prefix, file }) {
  const box = el('div', 'prefix');
  box.append(el('p', 'detail', 'Copied. Now:'));
  const steps = el('ol', 'steps');
  const open = el('li', '', 'Open ');
  open.append(el('span', 'path', file));
  steps.append(
    open,
    el(
      'li',
      '',
      'Paste at the very start of the "command" value under "statusLine", inside its quotes, and save. If it already starts with a Token Huddle prefix (everything up to the first |), replace that part instead of adding a second one.'
    ),
    el('li', '', 'Send a message in Claude Code in a terminal.')
  );
  const code = el('pre', 'code');
  code.append(el('code', '', prefix));
  box.append(code, steps);
  return box;
}

async function copyPrefix(key) {
  const result = await run(() => api.link(key));
  if (!result?.ok) return;
  copied.set(key, { prefix: result.prefix, file: result.file });
  if (lastState) render(lastState);
}

/**
 * Rebuilds a list and puts keyboard focus back where it was, so a change does not drop a
 * keyboard user to the top. The same control is found by its accessible name inside the
 * same card. When that control is gone or disabled the nearest equivalent takes focus: the
 * card's action button (Connect becomes Disconnect), any enabled control in the card, the
 * card now at the same position (after Remove), and last `fallback` (the visible view's heading or Done button).
 */
function redraw(container, nodes, fallback = document.getElementById('settings-heading')) {
  const active = document.activeElement;
  const inside = container.contains(active) && active !== container;
  const rowOf = (node) => node.closest('[data-key]');
  const before = inside ? [...container.querySelectorAll('[data-key]')] : [];
  const row = inside ? rowOf(active) : null;
  const label = inside ? active.getAttribute('aria-label') : null;
  const key = row?.dataset.key;
  const index = before.indexOf(row);
  const wasAction = inside && Boolean(active.closest('.actions'));
  container.replaceChildren(...nodes);
  if (!inside) return;

  const enabled = (scope, selector = 'button:not(:disabled), input:not(:disabled)') => scope?.querySelector(selector);
  const rows = [...container.querySelectorAll('[data-key]')];
  const sameCard = rows.find((n) => n.dataset.key === key);
  const named =
    sameCard && label
      ? [...sameCard.querySelectorAll('[aria-label]')].find(
          (n) => n.getAttribute('aria-label') === label && !n.disabled
        )
      : null;
  const target =
    named ||
    (wasAction && enabled(sameCard, '.actions button:not(:disabled)')) ||
    enabled(sameCard) ||
    (!sameCard && enabled(rows[Math.min(index, rows.length - 1)])) ||
    fallback;
  target?.focus();
}

/** The Updates section. The version and labels come from main, already checked; text only. */
function renderUpdates(view) {
  updateVersion.textContent = view.version;
  checkUpdates.checked = view.enabled;
  // Only a real change is written, so the live region announces it once.
  if (updateStatus.textContent !== view.status) updateStatus.textContent = view.status;
  const offered = Boolean(view.action);
  if (!offered && document.activeElement === updateAction) checkUpdates.focus();
  updateAction.hidden = !offered;
  updateAction.textContent = offered ? view.label : '';
}

function render(state) {
  const wasWelcome = !welcomeView.hidden;
  lastState = state;
  document.documentElement.dataset.theme = state.theme === 'light' ? 'light' : 'dark';

  // The first-run welcome replaces the settings view until it is finished.
  const showWelcome = Boolean(state.welcome);
  welcomeView.hidden = !showWelcome;
  settingsView.hidden = showWelcome;
  document.title = showWelcome ? 'Welcome to Token Huddle' : 'Token Huddle settings';
  if (showWelcome) redraw(toolList, state.welcome.tools.map(toolRow), document.getElementById('done'));
  // Leaving the welcome: move focus to the settings heading so keyboard users are not lost.
  if (wasWelcome && !showWelcome) document.getElementById('settings-heading').focus();

  const rows = state.cards.map((card, index) => cardRow(card, index, state.cards.length));
  redraw(list, rows.length ? rows : [el('li', 'empty', 'No supported tools found on this computer yet.')]);

  // Leave a field alone while it is being edited or still shows a rejected value.
  thresholdInputs.forEach((input, index) => {
    if (input === document.activeElement || input.getAttribute('aria-invalid') === 'true') return;
    input.value = String(state.thresholds[index] ?? state.thresholds[0]);
  });

  renderUpdates(state.updates);

  if (!providerSelect.childElementCount) {
    for (const provider of state.providers) {
      const option = el('option', '', provider.name);
      option.value = provider.id;
      providerSelect.append(option);
    }
  }
}

const isLevel = (value) => /^\s*\d{1,3}\s*$/.test(value) && Number(value) >= 1 && Number(value) <= 100;

/** Saves both levels. Main validates them; each field is marked by its own value so the error points at the right one. */
async function saveThresholds() {
  const result = await api.setThresholds(thresholdInputs.map((input) => input.value));
  for (const input of thresholdInputs) {
    if (result?.ok || isLevel(input.value)) input.removeAttribute('aria-invalid');
    else input.setAttribute('aria-invalid', 'true');
  }
  // On success the fields already show what was saved; the settings update that follows redraws them.
  thresholdError.textContent = result?.ok ? '' : result?.error || 'Could not save the alert levels';
  thresholdError.hidden = Boolean(result?.ok);
}

for (const input of thresholdInputs) input.addEventListener('change', saveThresholds);

document.getElementById('done').addEventListener('click', () => run(() => api.finishOnboarding()));
checkUpdates.addEventListener('change', () => run(() => api.setCheckUpdates(checkUpdates.checked)));
updateAction.addEventListener('click', () => run(() => api.updateAction()));

document.getElementById('browse').addEventListener('click', async () => {
  const folder = await api.pickFolder();
  if (folder) homeInput.value = folder;
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const result = await run(() =>
    api.add({ provider: providerSelect.value, label: labelInput.value, home: homeInput.value })
  );
  if (result?.ok) {
    labelInput.value = '';
    homeInput.value = '';
  }
});

api.onUpdate(render);
api.get().then(render);
