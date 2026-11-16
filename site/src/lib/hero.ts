// The hero's story as data: two agents work in a split terminal and the widget
// pinned over it follows them. Claude Code's session climbs into amber, then
// Codex's week tips into red. Pure and free of Node APIs, so the build computes
// the frames (with the app's own state rule) and the browser only plays them.

export interface HeroState {
  /** Steps shown in the Claude Code pane. */
  left: number;
  /** Steps shown in the Codex pane. */
  right: number;
  /** Claude Code session, percent used. */
  claude: number;
  /** Codex weekly, percent used. */
  codex: number;
}

export interface Beat {
  /** Milliseconds after the previous beat. */
  wait: number;
  set: Partial<HeroState>;
}

export type HeroFrame<L> = HeroState & {
  /** Milliseconds from the start. */
  at: number;
  claudeLevel: L;
  codexLevel: L;
};

export const HERO_START: HeroState = { left: 2, right: 2, claude: 66, codex: 86 };

export const HERO_BEATS: Beat[] = [
  { wait: 1000, set: { left: 3, claude: 71 } },
  { wait: 900, set: { left: 4, claude: 74 } },
  { wait: 1100, set: { right: 3, codex: 93 } },
];

/** The state after every beat: what the page renders without JavaScript. */
export function heroEnd(start: HeroState, beats: Beat[]): HeroState {
  return beats.reduce<HeroState>((s, b) => ({ ...s, ...b.set }), { ...start });
}

/** Every state the hero passes through, with its time and meter levels. */
export function heroFrames<L>(start: HeroState, beats: Beat[], level: (used: number) => L): HeroFrame<L>[] {
  const frame = (at: number, s: HeroState): HeroFrame<L> => ({
    at,
    ...s,
    claudeLevel: level(s.claude),
    codexLevel: level(s.codex),
  });
  const frames = [frame(0, start)];
  let state = { ...start };
  let at = 0;
  for (const beat of beats) {
    at += beat.wait;
    state = { ...state, ...beat.set };
    frames.push(frame(at, state));
  }
  return frames;
}
