import { TONES, type ColoredArt, type ToneKey } from '@/lib/colored-art';
import { isMotionEnabled } from '@/lib/motion';

interface Glyph {
  x: number;
  y: number;
  char: string;
  tone: string | undefined;
}

interface Particle {
  el: HTMLSpanElement;
  from?: Glyph;
  to?: Glyph;
}

/** How long the first frame stays readable before morphing. */
const HOLD_MS = 900;
/** Matches the transform transition in AsciiMorph.astro. */
const FLIGHT_MS = 1000;
const MAX_STAGGER_MS = 260;
const IN_FLIGHT_GLYPHS = '.:*+';

/** Non-space characters of an art, centered horizontally and bottom-aligned on the stage. */
function toGlyphs(art: ColoredArt, cols: number, rows: number): Glyph[] {
  const width = Math.max(...art.lines.map((line) => line.length));
  const offsetX = Math.floor((cols - width) / 2);
  const offsetY = rows - art.lines.length;
  const glyphs: Glyph[] = [];

  art.lines.forEach((line, row) => {
    const mask = art.mask[row] ?? '';
    for (let col = 0; col < line.length; col++) {
      const char = line.charAt(col);
      if (char === ' ') continue;
      glyphs.push({ x: offsetX + col, y: offsetY + row, char, tone: TONES[mask.charAt(col) as ToneKey] });
    }
  });
  return glyphs;
}

/**
 * Pairs each target glyph with the nearest unused source glyph, working from
 * the center outwards, so the first art visibly gathers into the second.
 * Leftover sources fly to the center and fade; leftover targets fade in.
 */
function pairGlyphs(from: Glyph[], to: Glyph[], center: { x: number; y: number }): Omit<Particle, 'el'>[] {
  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, (a.y - b.y) * 2);
  const unused = new Set(from);
  const pairs: Omit<Particle, 'el'>[] = [];

  for (const target of [...to].sort((a, b) => distance(a, center) - distance(b, center))) {
    let nearest: Glyph | undefined;
    for (const source of unused) {
      if (!nearest || distance(source, target) < distance(nearest, target)) nearest = source;
    }
    if (nearest) unused.delete(nearest);
    pairs.push({ to: target, ...(nearest && { from: nearest }) });
  }
  for (const source of unused) pairs.push({ from: source });
  return pairs;
}

/**
 * <ascii-morph data-from data-to>: shows the `from` art, then morphs into the
 * `to` art. While a mouse hovers it, the art morphs back to `from`; leaving
 * morphs it to `to` again. Honors the site motion preference.
 */
export class AsciiMorphElement extends HTMLElement {
  private particles: Particle[] = [];
  private timers: number[] = [];
  private center = { x: 0, y: 0 };

  connectedCallback(): void {
    if (this.particles.length > 0) return;
    const stage = this.querySelector<HTMLElement>('[data-stage]');
    const from = JSON.parse(this.dataset.from ?? 'null') as ColoredArt | null;
    const to = JSON.parse(this.dataset.to ?? 'null') as ColoredArt | null;
    if (!stage || !from || !to) return;

    const cols = Math.max(...[...from.lines, ...to.lines].map((line) => line.length));
    const rows = Math.max(from.lines.length, to.lines.length);
    stage.style.setProperty('--cols', String(cols));
    stage.style.setProperty('--rows', String(rows));
    this.center = { x: cols / 2, y: rows / 2 };

    this.particles = pairGlyphs(toGlyphs(from, cols, rows), toGlyphs(to, cols, rows), this.center).map((pair) => {
      const el = document.createElement('span');
      el.className = 'morph-glyph';
      stage.append(el);
      return { ...pair, el };
    });

    this.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse') this.morphTo('from');
    });
    this.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'mouse') this.morphTo('to');
    });

    if (isMotionEnabled()) {
      this.render('from');
      this.later(() => this.morphTo('to'), HOLD_MS);
    } else {
      this.morphTo('to');
    }
  }

  disconnectedCallback(): void {
    this.clearTimers();
  }

  /**
   * Morphs towards one state. Safe to call mid-flight: CSS retargets the
   * transitions from wherever each glyph currently is.
   */
  morphTo(state: 'from' | 'to'): void {
    this.clearTimers();
    this.classList.remove('is-settled');

    if (!isMotionEnabled()) {
      this.render(state);
      this.classList.toggle('is-settled', state === 'to');
      return;
    }

    for (const particle of this.particles) {
      const delay = Math.random() * MAX_STAGGER_MS;
      const target = particle[state];
      particle.el.style.transitionDelay = `${delay}ms`;
      this.place(particle, state);

      if (target && particle.from && particle.to) {
        this.later(() => {
          particle.el.textContent = IN_FLIGHT_GLYPHS.charAt(Math.floor(Math.random() * IN_FLIGHT_GLYPHS.length));
          delete particle.el.dataset.tone;
        }, delay + 60);
        this.later(() => this.paint(particle, target), delay + FLIGHT_MS * 0.65);
      } else {
        // Unpaired glyphs fade in or out in place, already showing their own character.
        this.paint(particle, target ?? particle.from ?? particle.to);
      }
    }

    if (state === 'to') this.later(() => this.classList.add('is-settled'), FLIGHT_MS + MAX_STAGGER_MS + 50);
  }

  /** Places every particle in one state without transitions. */
  private render(state: 'from' | 'to'): void {
    this.classList.add('is-instant');
    for (const particle of this.particles) {
      particle.el.style.transitionDelay = '0ms';
      this.place(particle, state);
      this.paint(particle, particle[state] ?? particle.from ?? particle.to);
    }
    void this.offsetWidth; // flush styles so the next change animates
    this.classList.remove('is-instant');
  }

  private place(particle: Particle, state: 'from' | 'to'): void {
    const glyph = particle[state];
    // A glyph missing in this state waits at its other position (to fade in) or gathers at the center (to fade out).
    const position = glyph ?? (state === 'from' ? particle.to : this.center) ?? this.center;
    particle.el.style.setProperty('--x', String(position.x));
    particle.el.style.setProperty('--y', String(position.y));
    particle.el.style.opacity = glyph ? '1' : '0';
  }

  private paint(particle: Particle, glyph: Glyph | undefined): void {
    if (!glyph) return;
    particle.el.textContent = glyph.char;
    if (glyph.tone) particle.el.dataset.tone = glyph.tone;
    else delete particle.el.dataset.tone;
  }

  private later(callback: () => void, ms: number): void {
    this.timers.push(window.setTimeout(callback, ms));
  }

  private clearTimers(): void {
    this.timers.forEach((id) => window.clearTimeout(id));
    this.timers = [];
  }
}
