import type { AsciiGrid } from './grid';
import type { ColorIndex } from './palette';
import type { BrokenCell } from './types';

/**
 * What has been broken off one scene object. Lives in a store keyed by the
 * object's stable key, so rebuilding the scene (e.g. on resize) keeps it.
 */
export interface Damage {
  /** Broken cells in the object's own coordinates ("x,y"). */
  cells: Set<string>;
  /** Plants and grass: everything from this height up is gone. */
  cut: number;
  /** Whole object destroyed (stars, butterflies, fireflies). */
  dead: boolean;
}

export const createDamage = (): Damage => ({ cells: new Set(), cut: Infinity, dead: false });

/** A cell under a click, read from the last drawn frame. */
export interface HitCell {
  col: number;
  row: number;
  index: number;
  char: string;
  color: ColorIndex;
}

export type BreakHandler = (hits: HitCell[], grid: AsciiGrid, owner: number) => BrokenCell[];

/**
 * Draws a sprite at an integer origin, skipping cells broken in sprite
 * coordinates, so holes travel with the sprite.
 */
export function drawDamagedSprite(
  grid: AsciiGrid,
  left: number,
  top: number,
  lines: readonly string[],
  color: ColorIndex,
  alpha: number,
  damage: Damage,
): void {
  lines.forEach((line, y) => {
    for (let x = 0; x < line.length; x++) {
      if (!damage.cells.has(`${x},${y}`)) grid.set(left + x, top + y, line.charAt(x), color, alpha);
    }
  });
}

/** Breaks hit cells of a sprite drawn at (left, top). */
export function breakSprite(hits: HitCell[], left: number, top: number, damage: Damage, mass: number): BrokenCell[] {
  return hits.map((hit) => {
    damage.cells.add(`${hit.col - left},${hit.row - top}`);
    return { ...hit, mass };
  });
}

/** Every cell an owner drew in the last frame (to shatter a whole object). */
export function cellsOf(grid: AsciiGrid, owner: number, mass: number): BrokenCell[] {
  const cells: BrokenCell[] = [];
  for (let index = 0; index < grid.owners.length; index++) {
    if (grid.owners[index] !== owner) continue;
    cells.push({
      col: index % grid.cols,
      row: Math.floor(index / grid.cols),
      char: grid.chars[index] ?? '',
      color: grid.colors[index] as ColorIndex,
      mass,
    });
  }
  return cells;
}
