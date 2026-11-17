import { describe, expect, it } from 'vitest';
import { demoTools, level } from './demo';
import { HERO_BEATS, HERO_START, HERO_METERS, HERO_PANES, heroFrames, meterId } from './hero';

describe('the hero timeline', () => {
  const frames = heroFrames(HERO_START, HERO_BEATS, level);

  it('starts at the start state, at time zero', () => {
    expect(frames[0]).toEqual({
      at: 0,
      panes: { left: 2, right: 2 },
      meters: { claude: { used: 66, level: '' }, codex: { used: 86, level: 'warn' } },
    });
  });

  it('runs in time order', () => {
    const times = frames.map((f) => f.at);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(new Set(times).size).toBe(times.length);
  });

  it('ends on the state the page renders without JavaScript', () => {
    const last = frames[frames.length - 1]!;
    expect(last).toEqual({
      at: 3000,
      panes: { left: 4, right: 3 },
      meters: { claude: { used: 74, level: 'warn' }, codex: { used: 93, level: 'crit' } },
    });
    for (const key of Object.keys(HERO_METERS) as (keyof typeof HERO_METERS)[]) {
      const window = demoTools.flatMap((t) => (t.windows ?? []).map((w) => ({ id: meterId(t.id, w.short), ...w })));
      expect(window.find((w) => w.id === HERO_METERS[key])?.used).toBe(last.meters[key].used);
    }
  });

  it("takes each meter's colour from the app's state rule", () => {
    for (const f of frames) {
      for (const meter of Object.values(f.meters)) expect(meter.level).toBe(level(meter.used));
    }
    const at = (n: number) => frames.flatMap((f) => Object.values(f.meters)).find((meter) => meter.used === n);
    expect(at(71)?.level).toBe('warn');
    expect(at(74)?.level).toBe('warn');
    expect(at(93)?.level).toBe('crit');
  });

  it('moves Claude to amber before Codex turns red', () => {
    const amber = frames.findIndex((f) => f.meters.claude.level === 'warn');
    const red = frames.findIndex((f) => f.meters.codex.level === 'crit');
    expect(amber).toBeGreaterThan(0);
    expect(red).toBeGreaterThan(amber);
  });

  it('targets unique meters that actually exist in the widget data', () => {
    const ids = demoTools.flatMap((t) => (t.windows ?? []).map((w) => meterId(t.id, w.short)));
    for (const id of Object.values(HERO_METERS)) expect(ids.filter((candidate) => candidate === id)).toHaveLength(1);
    expect(Object.values(HERO_PANES)).toEqual(Object.keys(HERO_START.panes));
  });

  it('keeps untouched pane and meter values across partial beats', () => {
    expect(frames[1]?.panes).toEqual({ left: 3, right: 2 });
    expect(frames[1]?.meters.codex).toEqual(frames[0]?.meters.codex);
    expect(frames[2]?.meters.claude.used).toBe(74);
    expect(frames[3]?.panes.left).toBe(4);
  });

  it('returns the initial frame when there are no beats and does not mutate its inputs', () => {
    const start = structuredClone(HERO_START);
    const beats = structuredClone(HERO_BEATS);
    expect(heroFrames(start, [], level)).toEqual([frames[0]]);
    heroFrames(start, beats, level);
    expect(start).toEqual(HERO_START);
    expect(beats).toEqual(HERO_BEATS);
  });
});
