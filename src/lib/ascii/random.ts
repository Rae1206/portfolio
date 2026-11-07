export type Rng = () => number;

/** Small seeded PRNG (mulberry32) so layouts are stable between visits. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const range = (rng: Rng, min: number, max: number): number => min + rng() * (max - min);

export const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)] as T;

export const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));

export const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

/** Frame-rate independent smoothing factor. */
export const damp = (rate: number, dt: number): number => 1 - Math.exp(-rate * dt);
