// What a card without a usable reading tells the user: a short state label (text,
// never colour alone) and one next-action sentence. Shared like duration.js: the
// widget page loads it with <script>, tests require() it. Pure and total.
(function (root) {
  const duration = typeof module !== 'undefined' && module.exports ? module.require('./duration') : root.huddleDuration;

  // A message that already says what to do is shown as written.
  const DIRECTIVE =
    /\b(open settings|in settings|options menu|press refresh|try again|restart|install|reconnect|send a message|run a|update token)\b/i;

  function ago(timestamp, now) {
    const ms = now - timestamp;
    return ms < 90 * 1000 ? 'just now' : `${duration(ms)} ago`;
  }

  function guidance(provider, now = Date.now()) {
    const p = provider && typeof provider === 'object' ? provider : {};
    const message = typeof p.message === 'string' ? p.message.trim().replace(/\.$/, '') : '';

    if (p.state === 'ok') return { label: '', action: '' };

    if (p.state === 'stale') {
      const label = Number.isFinite(p.updatedAt) ? `stale · ${ago(p.updatedAt, now)}` : 'stale';
      return { label, action: message || 'Showing the last reading. Press Refresh to try again' };
    }

    if (p.state === 'missing') {
      return {
        label: 'no data',
        action: message || 'Nothing to show yet. Press Refresh, or check this tool in Settings',
      };
    }

    // `error`, and anything unrecognised.
    if (!message) return { label: 'error', action: 'Something went wrong reading this tool. Press Refresh' };
    return { label: 'error', action: DIRECTIVE.test(message) ? message : `${message}. Press Refresh to try again` };
  }

  /** The colour state of a usage percentage: '' (normal), 'warn' from 70, 'crit' from 90. */
  function level(percent) {
    if (percent >= 90) return 'crit';
    if (percent >= 70) return 'warn';
    return '';
  }

  const LEVEL_WORD = { warn: 'warning', crit: 'critical' };

  /** How much of a window's time has passed, 0 to 1, or null when it has no known length or reset time. */
  function elapsed(window, now = Date.now()) {
    const w = window && typeof window === 'object' ? window : {};
    if (w.rolledOver || !Number.isFinite(w.resetsAt) || !Number.isFinite(w.windowMs) || w.windowMs <= 0) return null;
    return Math.max(0, Math.min(1, 1 - (w.resetsAt - now) / w.windowMs));
  }

  /** A usage window in words for assistive tech: { name, valueText }. Pure and total. */
  function windowText(window, now = Date.now()) {
    const w = window && typeof window === 'object' ? window : {};
    const percent = Number.isFinite(w.usedPercent) ? Math.round(w.usedPercent) : 0;
    const parts = [`${percent}% used`];
    if (LEVEL_WORD[level(percent)]) parts.push(LEVEL_WORD[level(percent)]);
    const share = elapsed(w, now);
    if (share !== null) parts.push(`${Math.round(share * 100)}% of the window elapsed`);
    if (w.rolledOver) parts.push('window reset');
    else if (Number.isFinite(w.resetsAt)) parts.push(`resets in ${duration(w.resetsAt - now)}`);
    const label = typeof w.label === 'string' ? w.label.trim() : '';
    const name = !label ? 'Usage' : /usage$/i.test(label) ? label : `${label} usage`;
    return { name, valueText: parts.join(', ') };
  }

  /** The level as a word for screen readers ('warning', 'critical') or ''. */
  const levelWord = (percent) => LEVEL_WORD[level(percent)] || '';

  /** A token count as short text: 41.2k, 1.3M. */
  function short(n) {
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1)}k`;
    return String(Math.round(n));
  }

  /** The sparkline in words for assistive tech: short numbers, oldest day first. */
  function sparkText(values) {
    const list = (Array.isArray(values) ? values : []).map((n) => short(Number.isFinite(n) ? n : 0));
    return `Tokens per day, last 7 days, oldest first: ${list.join(', ')}`;
  }

  guidance.ago = ago;
  guidance.sparkText = sparkText;
  guidance.levelWord = levelWord;
  guidance.elapsed = elapsed;
  guidance.level = level;
  guidance.windowText = windowText;

  if (typeof module !== 'undefined' && module.exports) module.exports = guidance;
  else root.huddleGuidance = guidance;
})(this);
