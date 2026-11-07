import type { AsciiGrid } from './grid';
import { Color, readPalette, type ColorIndex } from './palette';
import type { GridMetrics } from './types';

/** Glyph used for a fully inked cell, per color: gives each region its own texture. */
const FILL_GLYPH: Record<ColorIndex, string> = {
  [Color.sage]: ':',
  [Color.sageBright]: '+',
  [Color.sageDim]: '.',
  [Color.lavender]: '*',
  [Color.purple]: '@',
  [Color.purpleDim]: '+',
  [Color.ink]: '#',
  [Color.inkFaint]: '.',
  [Color.amber]: 'o',
  [Color.fuchsia]: '@',
};

const FULL_COVERAGE = 0.62;
const MIN_COVERAGE = 0.07;

function hexToRgb(hex: string): [number, number, number] {
  const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex.trim());
  if (!match) return [255, 255, 255];
  return [parseInt(match[1]!, 16), parseInt(match[2]!, 16), parseInt(match[3]!, 16)];
}

/**
 * Offscreen vector layer converted to characters. Scenes draw smooth shapes
 * (SVG paths, strokes) in cell space; `commit` picks one glyph per cell from
 * how much ink it holds and in which direction that ink runs, so edges become
 * / \ | - _ that follow the real outline.
 */
export class InkLayer {
  /** Raster pixels per cell. Height follows the cell aspect so shapes keep their proportions. */
  readonly cellWidth = 4;
  cellHeight = 8;

  private readonly canvas = document.createElement('canvas');
  private readonly ctx: CanvasRenderingContext2D;
  private readonly colors: string[];
  private readonly rgb: Array<[number, number, number]>;
  private cols = 0;
  private rows = 0;

  constructor() {
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas 2D context is not available');
    this.ctx = ctx;
    this.colors = readPalette(document.documentElement);
    this.rgb = this.colors.map(hexToRgb);
  }

  resize({ cols, rows, aspect }: GridMetrics): void {
    this.cols = cols;
    this.rows = rows;
    this.cellHeight = Math.max(2, Math.round(this.cellWidth / aspect));
    this.canvas.width = cols * this.cellWidth;
    this.canvas.height = rows * this.cellHeight;
  }

  /** CSS color for a palette index, for drawing on the layer. */
  color(index: ColorIndex): string {
    return this.colors[index] ?? '#fff';
  }

  /** Rows to drawing units: y = row * rowScale. */
  get rowScale(): number {
    return this.cellHeight / this.cellWidth;
  }

  /**
   * Clears the layer and returns a context with uniform units of one cell
   * width, so shapes and strokes keep their proportions on screen.
   */
  begin(): CanvasRenderingContext2D {
    const { ctx } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.cellWidth, 0, 0, this.cellWidth, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    return ctx;
  }

  commit(grid: AsciiGrid): void {
    const { cellWidth: cw, cellHeight: ch, cols, rows } = this;
    if (cols === 0) return;
    const { data } = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const stride = this.canvas.width * 4;
    const samples = cw * ch * 255;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        let ink = 0;
        let sx = 0;
        let sy = 0;
        let sxx = 0;
        let syy = 0;
        let sxy = 0;
        let r = 0;
        let g = 0;
        let b = 0;

        const origin = row * ch * stride + col * cw * 4;
        for (let y = 0; y < ch; y++) {
          let index = origin + y * stride;
          for (let x = 0; x < cw; x++, index += 4) {
            const alpha = data[index + 3] ?? 0;
            if (alpha === 0) continue;
            const px = x + 0.5;
            const py = y + 0.5;
            ink += alpha;
            sx += alpha * px;
            sy += alpha * py;
            sxx += alpha * px * px;
            syy += alpha * py * py;
            sxy += alpha * px * py;
            r += alpha * (data[index] ?? 0);
            g += alpha * (data[index + 1] ?? 0);
            b += alpha * (data[index + 2] ?? 0);
          }
        }

        const coverage = ink / samples;
        if (coverage < MIN_COVERAGE) continue;

        const color = this.nearestColor(r / ink, g / ink, b / ink);
        const glyph =
          coverage >= FULL_COVERAGE
            ? FILL_GLYPH[color]
            : edgeGlyph(sx / ink, sy / ink, sxx / ink, syy / ink, sxy / ink, coverage, ch);
        grid.set(col, row, glyph, color, Math.min(1, 0.5 + coverage * 0.7));
      }
    }
  }

  private nearestColor(r: number, g: number, b: number): ColorIndex {
    let best = 0;
    let bestDistance = Infinity;
    this.rgb.forEach(([pr, pg, pb], index) => {
      const distance = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    return best as ColorIndex;
  }
}

/**
 * Chooses a glyph for a partially inked cell from the principal axis of its
 * ink distribution (second moments): elongated ink becomes a line glyph
 * oriented like the outline, compact ink becomes a dot.
 */
function edgeGlyph(
  mx: number,
  my: number,
  mxx: number,
  myy: number,
  mxy: number,
  coverage: number,
  cellHeight: number,
): string {
  const cxx = mxx - mx * mx;
  const cyy = myy - my * my;
  const cxy = mxy - mx * my;
  const half = (cxx + cyy) / 2;
  const spread = Math.sqrt(((cxx - cyy) / 2) ** 2 + cxy * cxy);
  const major = half + spread;
  const minor = half - spread;

  if (major <= 0 || minor / major > 0.5) {
    if (my > cellHeight * 0.62) return coverage > 0.3 ? '_' : ',';
    if (my < cellHeight * 0.38) return coverage > 0.3 ? '"' : "'";
    return coverage > 0.3 ? 'o' : '.';
  }

  const angle = (0.5 * Math.atan2(2 * cxy, cxx - cyy) * 180) / Math.PI;
  if (Math.abs(angle) < 22.5) return my > cellHeight * 0.6 ? '_' : '-';
  if (Math.abs(angle) > 67.5) return '|';
  return angle > 0 ? '\\' : '/';
}
