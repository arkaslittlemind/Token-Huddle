// Plays the hero once: rewinds the stage to the first frame the build wrote
// into data-frames, then applies each frame on time. The HTML already shows
// the last frame, so without JavaScript, with reduced motion, or if anything
// here fails, the page simply stays on it. Writes only hidden, class names,
// an SVG width attribute and textContent.
import type { Level } from '../lib/demo';
import type { HeroFrame } from '../lib/hero';

type Frame = HeroFrame<Level>;

const COUNT_MS = 420;
const LEVELS: Level[] = ['warn', 'crit'];

function setLevel(el: Element, lvl: Level): void {
  el.classList.remove(...LEVELS);
  if (lvl) el.classList.add(lvl);
}

/** Moves one widget window to a percentage, counting the number up. */
function meter(stage: Element, id: string, used: number, lvl: Level, animate: boolean): void {
  const win = stage.querySelector(`[data-meter="${id}"]`);
  const pct = win?.querySelector('[data-pct]');
  const fill = win?.querySelector('.bar-fill');
  if (!win || !pct || !fill) return;
  setLevel(win, lvl);
  setLevel(fill, lvl);
  fill.setAttribute('width', `${used}%`);
  const from = Number.parseInt(pct.textContent ?? '', 10);
  if (!animate || !Number.isFinite(from) || from === used) {
    pct.textContent = `${used}%`;
    return;
  }
  const t0 = performance.now();
  const tick = (now: number) => {
    const k = Math.min(1, (now - t0) / COUNT_MS);
    pct.textContent = `${Math.round(from + (used - from) * (1 - (1 - k) ** 3))}%`;
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function apply(stage: Element, f: Frame, animate: boolean): void {
  for (const [pane, shown] of [
    ['left', f.left],
    ['right', f.right],
  ] as const) {
    stage.querySelectorAll<HTMLElement>(`[data-step^="${pane}-"]`).forEach((line) => {
      const i = Number(line.dataset['step']?.split('-')[1]);
      line.hidden = !(i < shown);
    });
  }
  meter(stage, 'claude-5h', f.claude, f.claudeLevel, animate);
  meter(stage, 'codex-7d', f.codex, f.codexLevel, animate);
}

function play(stage: Element, rest: Frame[]): void {
  for (const f of rest) setTimeout(() => apply(stage, f, true), f.at);
}

export function init(): void {
  const stage = document.querySelector<HTMLElement>('[data-hero]');
  if (!stage || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let frames: Frame[];
  try {
    frames = JSON.parse(stage.dataset['frames'] ?? '[]') as Frame[];
  } catch {
    return;
  }
  const [first, ...rest] = frames;
  if (!first || rest.length === 0 || !('IntersectionObserver' in window)) return;
  // Rewind now, before the stage is seen; play once it is mostly on screen.
  apply(stage, first, false);
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      play(stage, rest);
    },
    { threshold: 0.35 }
  );
  io.observe(stage);
}
