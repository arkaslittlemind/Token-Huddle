const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Name a usage window from its length: 5h -> Session, 7d -> Weekly. */
function describeWindow(windowMs) {
  if (!windowMs) return { label: 'Usage', short: '' };
  if (windowMs <= 6 * HOUR) return { label: 'Session', short: `${Math.round(windowMs / HOUR)}h` };
  if (Math.abs(windowMs - 7 * DAY) < DAY) return { label: 'Weekly', short: '7d' };
  if (windowMs < 2 * DAY) return { label: 'Daily', short: `${Math.round(windowMs / HOUR)}h` };
  const days = Math.round(windowMs / DAY);
  return { label: `${days}-day`, short: `${days}d` };
}

/**
 * A snapshot taken before a window's reset time says nothing about the new
 * window. Once the reset has passed, the usage in that window is zero.
 */
function rollOver(windows, now = Date.now()) {
  return windows.map((w) =>
    w.resetsAt && w.resetsAt <= now ? { ...w, usedPercent: 0, resetsAt: null, rolledOver: true } : w
  );
}

function clampPercent(n) {
  return Math.max(0, Math.min(100, Number(n) || 0));
}

function compactNumber(n) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1)}k`;
  return String(Math.round(n));
}

module.exports = { HOUR, DAY, describeWindow, rollOver, clampPercent, compactNumber };
