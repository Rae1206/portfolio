/**
 * How heavy each breakable thing is. Heavier debris gets a smaller kick and
 * falls hard; lighter debris flies far and drifts (more air drag).
 */
export const WEIGHTS = {
  name: 3,
  heading: 2,
  text: 0.8,
  small: 0.5,
  cloud: 0.25,
  star: 0.15,
  petal: 0.2,
  flower: 0.6,
  leaf: 0.5,
  stem: 1.2,
  grass: 0.4,
  ground: 1,
  cat: 1.5,
  moonShard: 1.4,
  moonCore: 6,
} as const;

export type WeightKey = keyof typeof WEIGHTS;

export function weightOf(key: string | undefined, fallback: number): number {
  if (!key) return fallback;
  if (key in WEIGHTS) return WEIGHTS[key as WeightKey];
  const numeric = Number(key);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}
