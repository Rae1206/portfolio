import { FLOWER_SPRITES, type SpriteFrame, type SpriteSpecies } from './flower-sprites';
import type { AsciiGrid } from './grid';
import { Color, type ColorIndex } from './palette';
import { PlantBase, type GrowthSpec } from './plant';

export interface SpriteLeaf {
  /** Position along the stem (0 = base, 1 = head). */
  at: number;
  side: 1 | -1;
}

export interface SpritePlantSpec extends GrowthSpec {
  species: SpriteSpecies;
  /** Swaps purple and lavender so one species reads in two color variants. */
  swapTones: boolean;
  leaves: SpriteLeaf[];
}

const MASK_COLORS: Record<string, ColorIndex> = {
  p: Color.purple,
  f: Color.fuchsia,
  l: Color.lavender,
  a: Color.amber,
  g: Color.sage,
  b: Color.sageBright,
  d: Color.sageDim,
};

const LEFT_LEAF = '_\\';
const RIGHT_LEAF = '/_';

/** Rows a species' tallest frame occupies above the stem. */
export function spriteHeight(species: SpriteSpecies): number {
  return Math.max(...FLOWER_SPRITES[species].map((frame) => frame.lines.length));
}

/**
 * Small plant drawn directly with characters: a stem that bends one column
 * at a time and a hand-drawn bloom sprite that goes bud → half → open.
 * Crisp at any size, unlike rasterized vector art.
 */
export class SpritePlant extends PlantBase<SpritePlantSpec> {
  draw(grid: AsciiGrid, wind: number): void {
    this.lastWind = wind;
    if (this.growth <= 0) return;
    const { spec } = this;
    const baseCol = Math.round(spec.col);
    const visible = Math.round(spec.height * this.stemProgress);
    const stemColor = this.hover > 0.5 ? Color.sageBright : Color.sage;

    // Stem: integer offsets, at most one column per row, so it stays a clean line.
    const offsets: number[] = [];
    let previous = 0;
    for (let i = 0; i < visible; i++) {
      const target = Math.round(this.stemPoint((i + 1) / spec.height, wind).col - spec.col);
      const offset = Math.max(previous - 1, Math.min(previous + 1, target));
      const char = offset > previous ? '/' : offset < previous ? '\\' : '|';
      grid.set(baseCol + offset, spec.baseRow - 1 - i, char, stemColor, 0.9);
      offsets.push(offset);
      previous = offset;
    }

    for (const leaf of spec.leaves) {
      const index = Math.round(leaf.at * (spec.height - 1));
      if (index >= visible || this.leafProgress < leaf.at) continue;
      const col = baseCol + (offsets[index] ?? 0);
      const row = spec.baseRow - 1 - index;
      if (leaf.side < 0) grid.text(col - LEFT_LEAF.length, row, LEFT_LEAF, Color.sage, 0.85);
      else grid.text(col + 1, row, RIGHT_LEAF, Color.sage, 0.85);
    }

    const tipCol = baseCol + previous;
    const tipRow = spec.baseRow - visible;
    this.head = { col: tipCol, row: tipRow };
    if (this.stemProgress < 1) return;

    this.drawFrame(grid, this.currentFrame(), tipCol, tipRow);
  }

  /** Bloom stage from growth; hovering opens the flower fully. */
  private currentFrame(): SpriteFrame {
    const [bud, half, open] = FLOWER_SPRITES[this.spec.species];
    const progress = Math.max(this.bloomProgress, this.hover);
    if (progress < 0.35) return bud;
    if (progress < 0.75) return half;
    return open;
  }

  /** Draws a frame so its bottom row's center sits right above the stem tip. */
  private drawFrame(grid: AsciiGrid, frame: SpriteFrame, tipCol: number, tipRow: number): void {
    const width = Math.max(...frame.lines.map((line) => line.length));
    const left = tipCol - Math.floor(width / 2);
    const top = tipRow - frame.lines.length;
    const alpha = 0.85 + this.hover * 0.15;

    frame.lines.forEach((line, row) => {
      const mask = frame.mask[row] ?? '';
      for (let col = 0; col < line.length; col++) {
        let tone = mask.charAt(col);
        if (this.spec.swapTones) tone = tone === 'p' ? 'f' : tone === 'f' ? 'p' : tone;
        const color = MASK_COLORS[tone];
        if (color !== undefined) grid.set(left + col, top + row, line.charAt(col), color, alpha);
      }
    });
  }
}
