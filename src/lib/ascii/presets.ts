import type { GardenOptions } from './garden';

const base: Omit<GardenOptions, 'seed'> = {
  ground: 0.95,
  meadow: { from: 0, to: 1, density: 1, maxHeight: 6 },
  grass: 0.8,
  stars: 0,
  clouds: 0,
  petals: 0,
  butterflies: 0,
  fireflies: 0,
  sparkles: true,
  wind: 1,
};

/** Named garden compositions reused across the page. */
export const gardenPresets = {
  hero: {
    ...base,
    seed: 7,
    ground: 0.93,
    feature: { x: 0.7, height: 0.42, radius: 0.54, kind: 'lily' },
    meadow: { from: 0.4, to: 1, density: 1.1, maxHeight: 9 },
    grass: 0.85,
    stars: 5,
    clouds: 3,
    petals: 18,
    butterflies: 1,
    fireflies: 6,
    cat: { x: 0.94 },
  },
  sidebar: {
    ...base,
    seed: 3,
    ground: 0.94,
    meadow: { from: 0.18, to: 0.82, density: 1.5, maxHeight: 11, species: ['daisy', 'tulip', 'star', 'rose'] },
    grass: 0.9,
    petals: 3,
    fireflies: 2,
  },
  strip: {
    ...base,
    seed: 11,
    ground: 0.9,
    meadow: { from: 0, to: 1, density: 1.1, maxHeight: 6 },
    grass: 0.9,
    petals: 4,
    butterflies: 1,
  },
  contact: {
    ...base,
    seed: 23,
    ground: 0.94,
    feature: { x: 0.62, height: 0.62, radius: 0.32, kind: 'tulip' },
    meadow: { from: 0, to: 1, density: 1.3, maxHeight: 8 },
    grass: 0.9,
    stars: 4,
    clouds: 1,
    petals: 12,
    butterflies: 2,
    fireflies: 4,
    cat: { x: 0.14 },
  },
} satisfies Record<string, GardenOptions>;

export type GardenPreset = keyof typeof gardenPresets;
