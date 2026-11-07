import { WEIGHTS } from '@/lib/debris/weights';
import { createDamage, type Damage, type HitCell } from './damage';
import { FLOWER_ART_SIZE, getFlowerArt, type FlowerArt, type FlowerKind } from './flowers';
import type { AsciiGrid } from './grid';
import type { InkLayer } from './ink';
import { Color } from './palette';
import { clamp, damp, easeOutCubic, lerp } from './random';
import type { BrokenCell, PointerState } from './types';

export interface LeafSpec {
  /** Position along the stem (0 = base, 1 = head). */
  at: number;
  side: 1 | -1;
  /** Length in columns. */
  length: number;
  /** How steeply the leaf rises. */
  lift: number;
  /** Values above 1 make the tip arc back down. */
  droop: number;
  /** Half thickness in rows. */
  width: number;
}

/** What every plant needs to grow, sway and react to the cursor. */
export interface GrowthSpec {
  col: number;
  baseRow: number;
  height: number;
  bend: number;
  /** Bloom radius in rows (cursor reach). */
  radius: number;
  /** Seconds after the scene starts before this plant sprouts. */
  delay: number;
  /** Seconds the full grow animation takes. */
  duration: number;
  phase: number;
  /** How much wind and cursor move the plant. */
  flex: number;
}

export interface PlantSpec extends GrowthSpec {
  thick: boolean;
  bloom: FlowerKind;
  leaves: LeafSpec[];
}

export interface Point {
  col: number;
  row: number;
}

const MIN_LEAF_WIDTH = 0.45;
const LEAF_STEPS = 14;

/**
 * Shared plant behavior. Growth is derived from the scene clock, so
 * rebuilding plants on resize never restarts their animation. Subclasses
 * only decide how the plant is drawn.
 */
export abstract class PlantBase<Spec extends GrowthSpec = GrowthSpec> {
  growth = 0;
  /** Broken parts; assigned by the scene from a store that survives rebuilds. */
  damage: Damage = createDamage();
  protected lean = 0;
  protected hover = 0;
  protected head: Point;
  /** Wind of the last draw, so damage can be located where the plant was drawn. */
  protected lastWind = 0;
  /** Stem half-width in columns, for telling a stem hit from a leaf hit. */
  protected stemHalfWidth = 0;

  constructor(readonly spec: Spec) {
    this.head = { col: spec.col, row: spec.baseRow - spec.height };
  }

  /** Approximate bloom center, used to emit petals. */
  get headPoint(): Point {
    return { col: this.head.col, row: this.head.row - this.spec.radius * 0.8 };
  }

  get isBlooming(): boolean {
    return this.bloomProgress > 0.6 && !Number.isFinite(this.damage.cut);
  }

  /**
   * Cell position in the plant's own frame: rows above the ground and columns
   * relative to the stem at that height. Damage stored this way sways with the plant.
   */
  protected localCell(col: number, row: number): { lc: number; lr: number } {
    const lr = this.spec.baseRow - row;
    const u = clamp(lr / this.spec.height);
    return { lc: Math.round(col - this.stemPoint(u, this.lastWind).col), lr };
  }

  /** Erases this plant's broken cells from the grid (call right after drawing it with `owner`). */
  applyDamage(grid: AsciiGrid, owner: number): void {
    const { damage } = this;
    if (damage.cells.size === 0 && !Number.isFinite(damage.cut)) return;
    for (let index = 0; index < grid.owners.length; index++) {
      if (grid.owners[index] !== owner) continue;
      const { lc, lr } = this.localCell(index % grid.cols, Math.floor(index / grid.cols));
      if (lr >= damage.cut || damage.cells.has(`${lc},${lr}`)) grid.erase(index);
    }
  }

  /**
   * Breaks the hit cells. Hitting the stem cuts it: everything above the cut
   * detaches and falls.
   */
  breakCells(hits: HitCell[], grid: AsciiGrid, owner: number): BrokenCell[] {
    const broken: BrokenCell[] = [];
    const stemTop = this.spec.height * this.stemProgress;
    let cut = Infinity;

    for (const hit of hits) {
      const { lc, lr } = this.localCell(hit.col, hit.row);
      const onStem = lr >= 1 && lr <= stemTop && Math.abs(lc) <= this.stemHalfWidth;
      if (onStem) cut = Math.min(cut, lr);
      else this.damage.cells.add(`${lc},${lr}`);
      broken.push({ ...hit, mass: this.massAt(lc, lr, stemTop) });
    }

    if (Number.isFinite(cut) && cut < this.damage.cut) {
      this.damage.cut = cut;
      const hitIndexes = new Set(hits.map((hit) => hit.index));
      for (let index = 0; index < grid.owners.length; index++) {
        if (grid.owners[index] !== owner || hitIndexes.has(index)) continue;
        const col = index % grid.cols;
        const row = Math.floor(index / grid.cols);
        const { lc, lr } = this.localCell(col, row);
        if (lr < cut) continue;
        broken.push({
          col,
          row,
          char: grid.chars[index] ?? '',
          color: grid.colors[index] as BrokenCell['color'],
          mass: this.massAt(lc, lr, stemTop),
          drop: true,
        });
      }
    }
    return broken;
  }

  private massAt(lc: number, lr: number, stemTop: number): number {
    if (lr > stemTop) return WEIGHTS.flower;
    return Math.abs(lc) <= this.stemHalfWidth ? WEIGHTS.stem : WEIGHTS.leaf;
  }

  protected get stemProgress(): number {
    return clamp(this.growth / 0.55);
  }

  protected get leafProgress(): number {
    return clamp((this.growth - 0.2) / 0.6);
  }

  protected get bloomProgress(): number {
    return easeOutCubic(clamp((this.growth - 0.55) / 0.45));
  }

  update(dt: number, clock: number, pointer: PointerState, aspect: number): void {
    const { spec } = this;
    this.growth = easeOutCubic(clamp((clock - spec.delay) / spec.duration));

    let leanTarget = 0;
    let hoverTarget = 0;
    if (pointer.active && this.growth > 0.3) {
      const dx = pointer.col - spec.col;
      const influence = 8 + spec.radius / aspect;
      const withinHeight =
        pointer.row > spec.baseRow - spec.height - spec.radius * 2 && pointer.row < spec.baseRow + 1;
      if (withinHeight && Math.abs(dx) < influence) {
        leanTarget = -Math.sign(dx) * (1 - Math.abs(dx) / influence) * 1.6;
      }
      const center = this.headPoint;
      const headDistance = Math.hypot((pointer.col - center.col) * aspect, pointer.row - center.row);
      if (headDistance < spec.radius * 1.4 + 1.5) hoverTarget = 1;
    }

    this.lean = lerp(this.lean, leanTarget, damp(3.5, dt));
    this.hover = lerp(this.hover, hoverTarget, damp(5, dt));
  }

  protected stemPoint(u: number, wind: number): Point {
    const { spec } = this;
    return {
      col:
        spec.col +
        spec.bend * u * u * spec.height * 0.4 +
        (wind + this.lean) * spec.flex * Math.pow(u, 1.5) * spec.height * 0.35,
      row: spec.baseRow - u * spec.height,
    };
  }
}

/**
 * Large plant drawn as vectors (SVG bloom art, curved stem and leaves) on an
 * InkLayer, which turns the shapes into characters.
 */
export class VectorPlant extends PlantBase<PlantSpec> {
  protected override stemHalfWidth = 1;

  draw(ink: InkLayer, ctx: CanvasRenderingContext2D, time: number, wind: number): void {
    this.lastWind = wind;
    if (this.growth <= 0) return;
    const k = ink.rowScale;
    this.drawStem(ink, ctx, wind, k);
    for (const leaf of this.spec.leaves) this.drawLeaf(ink, ctx, leaf, time, wind, k);
    this.head = this.stemPoint(this.stemProgress, wind);
    this.drawBloom(ink, ctx, time, wind, k);
  }

  private drawStem(ink: InkLayer, ctx: CanvasRenderingContext2D, wind: number, k: number): void {
    const visible = this.stemProgress;
    const segments = Math.max(4, Math.ceil((this.spec.height * visible) / 2));
    const base = this.stemPoint(0, wind);

    ctx.beginPath();
    ctx.moveTo(base.col, base.row * k);
    for (let i = 1; i <= segments; i++) {
      const point = this.stemPoint((visible * i) / segments, wind);
      ctx.lineTo(point.col, point.row * k);
    }
    ctx.lineWidth = this.spec.thick ? 1.7 : 0.85;
    ctx.strokeStyle = ink.color(Color.sage);
    ctx.stroke();
  }

  /** A leaf is a lens-shaped polygon wrapped around a curved midrib. */
  private drawLeaf(
    ink: InkLayer,
    ctx: CanvasRenderingContext2D,
    leaf: LeafSpec,
    time: number,
    wind: number,
    k: number,
  ): void {
    if (this.stemProgress < leaf.at) return;
    const grow = clamp((this.leafProgress - leaf.at * 0.4) / 0.6);
    if (grow <= 0) return;

    const anchor = this.stemPoint(leaf.at, wind);
    const length = leaf.length * easeOutCubic(grow);
    const rise = (leaf.lift * length) / k;
    const flutter = Math.sin(time * 2.1 + this.spec.phase + leaf.at * 7) * 0.35;
    const sway = wind * this.spec.flex * 0.8 + this.lean * 0.5;
    const halfWidth = Math.max(leaf.width, MIN_LEAF_WIDTH) * k;

    const midrib: Array<[number, number]> = [];
    for (let i = 0; i <= LEAF_STEPS; i++) {
      const u = i / LEAF_STEPS;
      const col = anchor.col + leaf.side * u * length + sway * u * u * length * 0.15;
      const row = anchor.row - (u - leaf.droop * u * u) * rise + flutter * u * u * 2;
      midrib.push([col, row * k]);
    }

    const upper: Array<[number, number]> = [];
    const lower: Array<[number, number]> = [];
    midrib.forEach(([x, y], i) => {
      const [nextX, nextY] = midrib[Math.min(i + 1, LEAF_STEPS)]!;
      const [prevX, prevY] = midrib[Math.max(i - 1, 0)]!;
      const tangentX = nextX - prevX;
      const tangentY = nextY - prevY;
      const norm = Math.hypot(tangentX, tangentY) || 1;
      const normalX = -tangentY / norm;
      const normalY = tangentX / norm;
      const width = Math.sin(Math.PI * Math.pow(i / LEAF_STEPS, 0.8)) * halfWidth;
      upper.push([x + normalX * width, y + normalY * width]);
      lower.push([x - normalX * width * 0.6, y - normalY * width * 0.6]);
    });

    ctx.beginPath();
    upper.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    for (let i = lower.length - 1; i >= 0; i--) ctx.lineTo(lower[i]![0], lower[i]![1]);
    ctx.closePath();
    ctx.fillStyle = ink.color(Color.sage);
    ctx.fill();

    ctx.beginPath();
    midrib.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.lineWidth = 0.35;
    ctx.strokeStyle = ink.color(Color.sageDim);
    ctx.stroke();
  }

  private drawBloom(ink: InkLayer, ctx: CanvasRenderingContext2D, time: number, wind: number, k: number): void {
    const { spec, head } = this;

    const open = this.bloomProgress;
    const diameter = spec.radius * 2 * k;
    const tilt = (wind + this.lean) * spec.flex * 0.12;

    if (open <= 0) {
      if (this.stemProgress > 0.6) {
        const budScale = (diameter * 0.35 * this.stemProgress) / FLOWER_ART_SIZE;
        this.drawArt(ink, ctx, getFlowerArt('bud'), head, budScale, tilt, k);
      }
      return;
    }

    const breathe = 1 + Math.sin(time * 1.3 + spec.phase) * 0.04;
    const scale = (diameter / FLOWER_ART_SIZE) * (0.25 + 0.75 * open) * breathe * (1 + this.hover * 0.12);
    this.drawArt(ink, ctx, getFlowerArt(spec.bloom), head, scale, tilt, k);
  }

  private drawArt(
    ink: InkLayer,
    ctx: CanvasRenderingContext2D,
    art: FlowerArt,
    at: Point,
    scale: number,
    tilt: number,
    k: number,
  ): void {
    ctx.save();
    ctx.translate(at.col, at.row * k);
    ctx.rotate(tilt);
    ctx.scale(scale, scale);
    for (const layer of art) {
      if (layer.stroke !== undefined) {
        ctx.lineWidth = layer.stroke;
        ctx.strokeStyle = ink.color(layer.color);
        ctx.stroke(layer.path);
      } else {
        ctx.fillStyle = ink.color(layer.color);
        ctx.fill(layer.path);
      }
    }
    ctx.restore();
  }
}
