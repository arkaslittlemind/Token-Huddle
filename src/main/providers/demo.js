// Fixed sample data for `npm run demo` and screenshots. Touches nothing on disk.

const { HOUR, DAY } = require('./util');

function read() {
  const now = Date.now();
  return [
    {
      id: 'claude',
      name: 'Claude Code',
      accent: '#caf0f8',
      state: 'ok',
      source: 'local',
      via: 'Claude Code session files',
      quotaState: 'ok',
      quotaUpdatedAt: now - 4 * 60 * 1000,
      stats: [
        { label: 'Today', value: '412k' },
        { label: '7 days', value: '2.1M' },
        { label: '30 days', value: '8.4M' },
      ],
      message: 'Recorded tokens, including cache reads and writes',
      updatedAt: now - 2 * 60 * 1000,
      windows: [
        {
          id: 'five_hour',
          label: 'Session',
          short: '5h',
          windowMs: 5 * HOUR,
          usedPercent: 74,
          resetsAt: now + 2.2 * HOUR,
        },
        {
          id: 'seven_day',
          label: 'Weekly',
          short: '7d',
          windowMs: 7 * DAY,
          usedPercent: 38,
          resetsAt: now + 3.4 * DAY,
        },
      ],
    },
    {
      id: 'codex',
      name: 'Codex',
      accent: '#00b4d8',
      plan: 'Plus',
      state: 'ok',
      source: 'live',
      via: 'Codex',
      updatedAt: now,
      windows: [
        {
          id: 'primary',
          label: 'Session',
          short: '5h',
          windowMs: 5 * HOUR,
          usedPercent: 12,
          resetsAt: now + 4.1 * HOUR,
        },
        {
          id: 'secondary',
          label: 'Weekly',
          short: '7d',
          windowMs: 7 * DAY,
          usedPercent: 93,
          resetsAt: now + 1.2 * DAY,
        },
      ],
    },
    {
      id: 'opencode',
      name: 'OpenCode',
      accent: '#3d9bd1',
      state: 'ok',
      source: 'local',
      via: 'OpenCode database',
      updatedAt: now - 3 * HOUR,
      windows: [],
      stats: [
        { label: 'Today', value: '41.2k' },
        { label: '7 days', value: '1.3M' },
        { label: '30 days', value: '4.8M' },
      ],
      spark: [120, 340, 80, 0, 510, 260, 41],
      message: 'deepseek-flash-free · tokens used, no quota to read',
    },
  ];
}

module.exports = { read };
