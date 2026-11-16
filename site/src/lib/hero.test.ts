import { describe, expect, it } from 'vitest';
import { level } from './demo';
import { HERO_BEATS, HERO_START, heroEnd, heroFrames } from './hero';

describe('the hero timeline', () => {
  const frames = heroFrames(HERO_START, HERO_BEATS, level);

  it('starts at the start state, at time zero', () => {
    expect(frames[0]).toMatchObject({ at: 0, ...HERO_START });
  });

  it('runs in time order', () => {
    const times = frames.map((f) => f.at);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(new Set(times).size).toBe(times.length);
  });

  it('ends on the state the page renders without JavaScript', () => {
    const { at: _at, claudeLevel: _cl, codexLevel: _xl, ...last } = frames[frames.length - 1]!;
    expect(last).toEqual(heroEnd(HERO_START, HERO_BEATS));
    expect(last).toEqual({ left: 4, right: 3, claude: 74, codex: 93 });
  });

  it("takes each meter's colour from the app's state rule", () => {
    for (const f of frames) {
      expect(f.claudeLevel).toBe(level(f.claude));
      expect(f.codexLevel).toBe(level(f.codex));
    }
    const at = (n: number) => frames.find((f) => f.claude === n || f.codex === n);
    expect(at(71)?.claudeLevel).toBe('warn');
    expect(at(74)?.claudeLevel).toBe('warn');
    expect(at(93)?.codexLevel).toBe('crit');
  });

  it('moves Claude to amber before Codex turns red', () => {
    const amber = frames.findIndex((f) => f.claudeLevel === 'warn');
    const red = frames.findIndex((f) => f.codexLevel === 'crit');
    expect(amber).toBeGreaterThan(0);
    expect(red).toBeGreaterThan(amber);
  });
});
