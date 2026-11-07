import type { AsciiGrid } from './grid';
import type { ColorIndex } from './palette';

/** Pointer position expressed in grid cells, relative to the canvas. */
export interface PointerState {
  col: number;
  row: number;
  /** True while the pointer is over the canvas area. */
  active: boolean;
  /** Distance travelled (in cells) since the previous frame. */
  movement: number;
}

export interface GridMetrics {
  cols: number;
  rows: number;
  /** cellWidth / cellHeight. Converts columns to row units for round shapes. */
  aspect: number;
}

export interface SceneStartOptions {
  /** Skip intro animations (used for prefers-reduced-motion). */
  instant: boolean;
}

/** A character a scene broke off, in grid coordinates. */
export interface BrokenCell {
  col: number;
  row: number;
  char: string;
  color: ColorIndex;
  /** Debris mass (see lib/debris/weights). */
  mass: number;
  /** Detached rather than hit: falls instead of flying. */
  drop?: boolean;
  /** Wrecks the page on its own (see lib/debris/damage-meter). */
  critical?: boolean;
}

/**
 * Contract every ASCII scene implements. The renderer owns the canvas,
 * the loop and input; scenes only simulate and write characters to a grid.
 */
export interface AsciiScene {
  resize(metrics: GridMetrics): void;
  start?(options: SceneStartOptions): void;
  update(dt: number, time: number, pointer: PointerState): void;
  draw(grid: AsciiGrid, time: number): void;
  /**
   * Breaks what was drawn around a cell in the last frame (`grid` still holds
   * it) and remembers the damage. Returns the characters that broke off.
   */
  breakAt?(col: number, row: number, grid: AsciiGrid): BrokenCell[];
  /** Undoes all damage done through `breakAt`. */
  repair?(): void;
  dispose?(): void;
}
