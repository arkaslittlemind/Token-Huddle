// The hero's story as data: two agents work in a split terminal and the widget
// pinned over it follows them. Claude Code's session climbs into amber, then
// Codex's week tips into red. Pure and free of Node APIs, so the build computes
// the frames (with the app's own state rule) and the browser only plays them.

import type { DemoTool, DemoWindow } from './demo';

export const meterId = (tool: DemoTool['id'], window: DemoWindow['short']): string => `${tool}-${window}`;
export const HERO_METERS = { claude: meterId('claude', '5h'), codex: meterId('codex', '7d') } as const;
export const HERO_PANES = { left: 'left', right: 'right' } as const;
type PaneId = (typeof HERO_PANES)[keyof typeof HERO_PANES];
type MeterKey = keyof typeof HERO_METERS;

export interface HeroState {
  panes: Record<PaneId, number>;
  meters: Record<MeterKey, number>;
}

export interface Beat {
  /** Milliseconds after the previous beat. */
  wait: number;
  set: { panes?: Partial<HeroState['panes']>; meters?: Partial<HeroState['meters']> };
}

export interface HeroFrame<L> {
  /** Milliseconds from the start. */
  at: number;
  panes: HeroState['panes'];
  meters: Record<MeterKey, { used: number; level: L }>;
}

export const HERO_START: HeroState = { panes: { left: 2, right: 2 }, meters: { claude: 66, codex: 86 } };

export const HERO_BEATS: Beat[] = [
  { wait: 1000, set: { panes: { left: 3 }, meters: { claude: 71 } } },
  { wait: 900, set: { panes: { left: 4 }, meters: { claude: 74 } } },
  { wait: 1100, set: { panes: { right: 3 }, meters: { codex: 93 } } },
];

/** Every state the hero passes through, with its time and meter levels. */
export function heroFrames<L>(start: HeroState, beats: Beat[], level: (used: number) => L): HeroFrame<L>[] {
  const frame = (at: number, s: HeroState): HeroFrame<L> => ({
    at,
    panes: { ...s.panes },
    meters: {
      claude: { used: s.meters.claude, level: level(s.meters.claude) },
      codex: { used: s.meters.codex, level: level(s.meters.codex) },
    },
  });
  const frames = [frame(0, start)];
  let state = { ...start };
  let at = 0;
  for (const beat of beats) {
    at += beat.wait;
    state = { panes: { ...state.panes, ...beat.set.panes }, meters: { ...state.meters, ...beat.set.meters } };
    frames.push(frame(at, state));
  }
  return frames;
}
