import type { ColorIndex } from './palette';

/**
 * Fixed-size character buffer. Scenes write into it every frame and the
 * renderer paints it. Later writes overwrite earlier ones (painter's order).
 */
export class AsciiGrid {
  cols = 0;
  rows = 0;
  chars: string[] = [];
  colors = new Uint8Array(0);
  alphas = new Float32Array(0);
  /** Which scene object wrote each cell (0 = none); lets clicks find what was hit. */
  owners = new Int32Array(0);
  /** Owner id stamped on cells written from now on. */
  owner = 0;

  resize(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    const size = cols * rows;
    this.chars = new Array<string>(size).fill('');
    this.colors = new Uint8Array(size);
    this.alphas = new Float32Array(size);
    this.owners = new Int32Array(size);
  }

  clear(): void {
    this.chars.fill('');
    this.alphas.fill(0);
    this.owners.fill(0);
    this.owner = 0;
  }

  /** Removes a cell, e.g. one that was broken off. */
  erase(index: number): void {
    this.chars[index] = '';
    this.owners[index] = 0;
  }

  set(col: number, row: number, char: string, color: ColorIndex, alpha = 1): void {
    if (char === ' ' || alpha <= 0.02) return;
    const c = Math.round(col);
    const r = Math.round(row);
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return;
    const index = r * this.cols + c;
    this.chars[index] = char;
    this.colors[index] = color;
    this.alphas[index] = Math.min(alpha, 1);
    this.owners[index] = this.owner;
  }

  /** Writes a single-line string; spaces are transparent. */
  text(col: number, row: number, value: string, color: ColorIndex, alpha = 1): void {
    const start = Math.round(col);
    for (let i = 0; i < value.length; i++) {
      this.set(start + i, row, value.charAt(i), color, alpha);
    }
  }

  /** Writes a multi-line sprite; spaces are transparent. */
  sprite(col: number, row: number, lines: readonly string[], color: ColorIndex, alpha = 1): void {
    const top = Math.round(row);
    lines.forEach((line, offset) => this.text(col, top + offset, line, color, alpha));
  }
}
