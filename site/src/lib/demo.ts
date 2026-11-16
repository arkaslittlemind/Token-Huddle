// Demo numbers for the widget copies on the page: the same story as the
// app's demo mode and the README screenshots. One card amber, one red.
import { appModule } from './app';

export interface DemoWindow {
  label: 'Session' | 'Weekly';
  short: '5h' | '7d';
  reset: string;
  used: number;
  /** How much of the window's time has passed, in percent. */
  pace: number;
}

export interface DemoTool {
  id: 'claude' | 'codex' | 'opencode';
  name: string;
  source: string;
  plan?: string;
  windows?: DemoWindow[];
  totals?: { today: string; week: string; month: string };
}

export const demoTools: DemoTool[] = [
  {
    id: 'claude',
    name: 'Claude Code',
    source: 'last turn 2m ago',
    windows: [
      { label: 'Session', short: '5h', reset: '2h 12m', used: 74, pace: 56 },
      { label: 'Weekly', short: '7d', reset: '3d 9h', used: 38, pace: 52 },
    ],
  },
  {
    id: 'codex',
    name: 'Codex',
    source: 'live',
    plan: 'Plus',
    windows: [
      { label: 'Session', short: '5h', reset: '4h 6m', used: 12, pace: 18 },
      { label: 'Weekly', short: '7d', reset: '1d 4h', used: 93, pace: 85 },
    ],
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    source: 'active 3h ago',
    totals: { today: '41.2k', week: '1.3M', month: '4.8M' },
  },
];

interface Guidance {
  level(percent: number): Level;
  levelWord(percent: number): string;
}
export type Level = '' | 'warn' | 'crit';

const guidance = appModule<Guidance>('guidance.js');

/** The app's own state rule (src/renderer/guidance.js): amber from 70%, red from 90%. */
export const level = (used: number): Level => guidance.level(used);
/** 'warning', 'critical' or '' for a percentage, as the app writes it. */
export const levelWord = (used: number): string => guidance.levelWord(used);
