import { describe, expect, it } from 'vitest';
import { demoTools, level, levelWord } from './demo';

describe('the demo widget uses the app state rule', () => {
  it('turns amber at 70% and red at 90%, with the words the app writes', () => {
    expect([level(69), level(70), level(89), level(90)]).toEqual(['', 'warn', 'warn', 'crit']);
    expect([levelWord(12), levelWord(74), levelWord(93)]).toEqual(['', 'warning', 'critical']);
  });

  it('shows one amber and one red window', () => {
    const levels = demoTools.flatMap((t) => t.windows ?? []).map((w) => level(w.used));
    expect(levels.filter((l) => l === 'warn')).toHaveLength(1);
    expect(levels.filter((l) => l === 'crit')).toHaveLength(1);
  });
});
