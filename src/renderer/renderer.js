const api = window.huddle;
const card = document.getElementById('card');
const list = document.getElementById('providers');
const mode = document.getElementById('mode');
const refreshButton = document.getElementById('refresh');

let state = { providers: [], compact: false };
let emptyNode = null;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const duration = window.huddleDuration;
const guidance = window.huddleGuidance;
const level = guidance.level;
const compactButton = document.getElementById('compact');

const ago = (timestamp) => guidance.ago(timestamp, Date.now());

function statusText(provider) {
  if (provider.state !== 'ok') return guidance(provider).label;
  if (!provider.updatedAt) return '';
  if (provider.source === 'live') return 'live';
  return provider.quotaState || !provider.windows.length
    ? `active ${ago(provider.updatedAt)}`
    : `last turn ${ago(provider.updatedAt)}`;
}

function windowBlock(w) {
  const now = Date.now();
  const percent = Math.round(w.usedPercent);
  const block = el('div', `window ${level(percent)}`);

  const row = el('div', 'row');
  row.append(el('span', 'label', w.label));
  const reset = w.rolledOver ? 'window reset' : w.resetsAt ? `resets in ${duration(w.resetsAt - now)}` : '';
  if (reset) row.append(el('span', 'reset', reset));
  row.append(el('span', 'percent', `${percent}%`));

  // The bar is a progressbar so assistive tech reads the value, level, pace and reset time.
  const track = el('div', 'track');
  const text = guidance.windowText(w, now);
  track.setAttribute('role', 'progressbar');
  track.setAttribute('aria-label', text.name);
  track.setAttribute('aria-valuemin', '0');
  track.setAttribute('aria-valuemax', '100');
  track.setAttribute('aria-valuenow', String(percent));
  track.setAttribute('aria-valuetext', text.valueText);
  const fill = el('div', 'fill');
  fill.style.width = `${percent}%`;
  track.append(fill);

  const elapsed = guidance.elapsed(w, now);
  if (elapsed !== null) {
    const pace = el('div', 'pace');
    pace.style.left = `calc(${(elapsed * 100).toFixed(1)}% - 1px)`;
    track.append(pace);
    block.title = text.valueText;
  }

  block.append(row, track);
  return block;
}

function statsBlock(provider) {
  const stats = el('div', 'stats');
  for (const { label, value } of provider.stats) {
    const stat = el('div', 'stat');
    stat.append(el('span', 'k', label), el('span', 'v', value));
    stats.append(stat);
  }
  if (provider.spark?.length) {
    const spark = el('div', 'spark');
    spark.title = 'Tokens per day, last 7 days';
    spark.setAttribute('role', 'img');
    spark.setAttribute('aria-label', guidance.sparkText(provider.spark));
    const max = Math.max(...provider.spark, 1);
    for (const value of provider.spark) {
      const bar = el('i', value > 0 ? 'on' : '');
      bar.style.height = `${Math.max(8, (value / max) * 100)}%`;
      spark.append(bar);
    }
    stats.append(spark);
  }
  return stats;
}

function summary(provider) {
  const box = el('div', 'summary');
  if (provider.windows.length) {
    for (const w of provider.windows.slice(0, 2)) {
      const percent = Math.round(w.usedPercent);
      const item = el('span', `sum ${level(percent)}`);
      item.append(el('small', '', w.short), `${percent}%`);
      const word = guidance.levelWord(percent);
      item.append(el('span', 'sr-only', ` ${guidance.windowText(w).name}${word ? `, ${word}` : ''}`));
      box.append(item);
    }
  }
  if (provider.stats?.length && !provider.quotaState) {
    const item = el('span', 'sum');
    item.append(el('small', '', provider.stats[0].label.toLowerCase()), provider.stats[0].value);
    box.append(item);
  } else if (!provider.windows.length && !provider.stats?.length) {
    box.append(
      el('span', 'sum muted', provider.state === 'ok' ? provider.message || 'no data' : guidance(provider).label)
    );
  }
  return box;
}

/**
 * The tool's official mark (agent-marks.js), unaltered and decorative: the name
 * beside it names the card. A provider without a mark keeps its accent dot.
 */
function agentMark(provider) {
  const mark = window.huddleAgentMarks?.[provider.id];
  if (!mark) {
    const dot = el('span', 'dot');
    dot.setAttribute('aria-hidden', 'true');
    dot.style.background = provider.accent || '#888';
    return dot;
  }
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', mark.viewBox);
  for (const p of mark.paths) {
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', p.d);
    path.setAttribute('fill', p.fill);
    if (p.fillRule) path.setAttribute('fill-rule', p.fillRule);
    if (p.clipRule) path.setAttribute('clip-rule', p.clipRule);
    svg.append(path);
  }
  const box = el('span', 'mark-agent');
  box.setAttribute('aria-hidden', 'true');
  box.append(svg);
  return box;
}

function providerBlock(provider, index) {
  const block = el('article', 'provider');
  const head = el('div', 'head');
  const name = el('span', 'name', provider.name);
  name.id = `provider-${index}`;
  block.setAttribute('aria-labelledby', name.id);
  head.append(agentMark(provider), name);

  if (state.compact) {
    head.append(summary(provider));
    block.append(head);
    if (provider.quotaState && provider.stats?.length) block.append(statsBlock(provider));
    const ages = provider.quotaState
      ? `Local records: ${provider.updatedAt ? ago(provider.updatedAt) : 'age unknown'}. Subscription limits: ${provider.windows.length ? `${provider.quotaState}, ${provider.quotaUpdatedAt ? ago(provider.quotaUpdatedAt) : 'age unknown'}` : 'not available'}`
      : '';
    const action = [guidance(provider).action || provider.message, ages].filter(Boolean).join('. ');
    if (action) {
      block.title = action;
      block.append(el('p', 'sr-only', action));
    }
    return block;
  }

  if (provider.plan) head.append(el('span', 'plan', provider.plan));
  const status = statusText(provider);
  if (status) {
    const badge = el('span', `status ${provider.state === 'ok' ? '' : provider.state}`, status);
    if (provider.via) {
      badge.title = `From ${provider.via}`;
      badge.append(el('span', 'sr-only', `, from ${provider.via}`));
    }
    head.append(badge);
  }
  block.append(head);

  if (provider.quotaState && provider.windows.length) {
    block.append(
      el(
        'div',
        'note',
        `Subscription limits: ${provider.quotaState === 'ok' ? '' : 'stale, '}status line ${provider.quotaUpdatedAt ? ago(provider.quotaUpdatedAt) : 'age unknown'}`
      )
    );
  }
  for (const w of provider.windows) block.append(windowBlock(w));
  if (provider.stats?.length) block.append(statsBlock(provider));
  // A card with a problem says what to do about it, wrapped so none of it is cut off.
  const problem = provider.state !== 'ok';
  const text = problem ? guidance(provider).action : provider.message;
  if (text) {
    const note = el('div', problem ? 'note action' : 'note', text);
    note.title = text;
    block.append(note);
  }
  return block;
}

/** One node per empty state, reused across renders so the Open Settings button keeps keyboard focus. */
function emptyState() {
  const kind = state.ready ? 'none' : 'loading';
  if (emptyNode?.dataset.kind === kind) return emptyNode;
  emptyNode = el('div', 'empty');
  emptyNode.dataset.kind = kind;
  if (kind === 'loading') {
    emptyNode.textContent = 'Reading usage…';
  } else {
    const open = el('button', 'link', 'Open Settings');
    open.addEventListener('click', () => api.openSettings());
    emptyNode.append(el('p', '', 'No tools shown. Open Settings to show one.'), open);
  }
  return emptyNode;
}

function render() {
  const root = document.documentElement.dataset;
  const theme = state.theme === 'light' ? 'light' : 'dark';
  if (root.theme !== theme) {
    root.theme = theme;
    drawLogo(theme);
  }
  root.style = state.style || 'solid';
  root.size = String(state.size || 100);
  card.classList.toggle('compact', Boolean(state.compact));
  mode.textContent = state.demo ? 'demo' : state.localOnly ? 'local only' : '';
  compactButton.setAttribute('aria-pressed', String(Boolean(state.compact)));
  const blocks = state.providers.map((provider, index) => providerBlock(provider, index));
  const next = blocks.length ? blocks : [emptyState()];
  // Leave an unchanged empty state in place: replacing it would drop focus from its button.
  if (!(next.length === 1 && list.childNodes.length === 1 && list.firstChild === next[0]))
    list.replaceChildren(...next);
  // A size change zooms the page without changing the card's CSS size, so report it here too.
  reportHeight();
}

/** The window is sized to the card. The body (card plus 8px padding) is measured as drawn, zoom included. */
function reportHeight() {
  api.resize(document.body.getBoundingClientRect().height);
}

/** Draws the mark from mark.js, the same data the tray icon uses, in the theme's colourway. */
function drawLogo(theme) {
  const mark = window.huddleMark;
  if (!mark) return;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  for (const shape of mark.shapes) {
    const node = document.createElementNS(ns, shape.type);
    const attrs =
      shape.type === 'circle'
        ? { cx: shape.cx, cy: shape.cy, r: shape.r }
        : { x: shape.x, y: shape.y, width: shape.width, height: shape.height, rx: shape.radius };
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    node.setAttribute('fill', mark.colourways[theme][shape.role]);
    svg.append(node);
  }
  document.getElementById('logo').replaceChildren(svg);
}

api.onUpdate((next) => {
  state = next;
  refreshButton.classList.remove('spinning');
  refreshButton.removeAttribute('aria-busy');
  render();
});
api.get().then((initial) => {
  state = initial;
  render();
});

// Countdown text ages even when no new data arrives.
setInterval(render, 30 * 1000);

new ResizeObserver(reportHeight).observe(card);

refreshButton.addEventListener('click', () => {
  refreshButton.classList.add('spinning');
  refreshButton.setAttribute('aria-busy', 'true');
  setTimeout(() => {
    refreshButton.classList.remove('spinning');
    refreshButton.removeAttribute('aria-busy');
  }, 12000);
  api.refresh();
});
compactButton.addEventListener('click', () => api.toggleCompact());
document.getElementById('menu').addEventListener('click', () => api.menu());
document.getElementById('hide').addEventListener('click', () => api.hide());
