// A time span as the widget shows it (45m, 2h 5m, 3d 4h). Shared like mark.js:
// the widget page loads it with <script>, main's alerts require() it, so both
// say "resets in" the same way.
(function (root) {
  function duration(ms) {
    const minutes = Math.max(1, Math.round(ms / 60000));
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${minutes % 60}m`;
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = duration;
  else root.huddleDuration = duration;
})(this);
