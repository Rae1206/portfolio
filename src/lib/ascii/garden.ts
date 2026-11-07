import { WEIGHTS } from '@/lib/debris/weights';
import {
  breakSprite,
  cellsOf,
  createDamage,
  drawDamagedSprite,
  type BreakHandler,
  type Damage,
  type HitCell,
} from './damage';
import type { AsciiGrid } from './grid';
import { InkLayer } from './ink';
import { Color, type ColorIndex } from './palette';
import type { FlowerKind } from './flowers';
import { SPRITE_SPECIES, type SpriteSpecies } from './flower-sprites';
import { VectorPlant, type LeafSpec, type PlantBase } from './plant';
import { SpritePlant, spriteHeight } from './sprite-plant';
import { clamp, createRng, damp, lerp, pick, range, type Rng } from './random';
import {
  BUTTERFLY_FRAMES,
  CAT_EYES,
  CAT_TAIL_FRAMES,
  CAT_TEMPLATE,
  CLOUDS,
  GRASS_CHARS,
  PETAL_CHARS,
  SPARKLE_CHARS,
  STAR_CHARS,
} from './sprites';
import type { AsciiScene, BrokenCell, GridMetrics, PointerState, SceneStartOptions } from './types';

export interface GardenOptions {
  seed: number;
  /** Ground line position as a fraction of the canvas height. */
  ground: number;
  /** One large hero flower. x is a fraction of width, height of the ground row, radius of the flower height. */
  feature?: { x: number; height: number; radius: number; kind: FlowerKind };
  /**
   * Small hand-drawn flowers between `from` and `to` (fractions of width); density is flowers per 10 columns.
   * `species` restricts which flowers appear (defaults to all of them).
   */
  meadow: { from: number; to: number; density: number; maxHeight: number; species?: readonly SpriteSpecies[] };
  /** Fraction of columns that grow grass blades. */
  grass: number;
  /** Stars per 1000 cells above the ground. */
  stars: number;
  clouds: number;
  /** Maximum petals floating at once. */
  petals: number;
  butterflies: number;
  fireflies: number;
  cat?: { x: number };
  sparkles: boolean;
  wind: number;
}

interface Star { col: number; row: number; char: string; color: ColorIndex; phase: number; speed: number; damage: Damage }
interface Grain { col: number; row: number; char: string; color: ColorIndex }
interface Cloud { col: number; row: number; speed: number; lines: readonly string[]; damage: Damage }
interface Blade { col: number; height: number; char: string; phase: number; damage: Damage }
interface Particle { col: number; row: number; vCol: number; vRow: number; life: number; maxLife: number; char: string; color: ColorIndex; settled: boolean }
interface Butterfly { col: number; row: number; vCol: number; vRow: number; targetCol: number; targetRow: number; retarget: number; phase: number; damage: Damage }
interface Firefly { col: number; row: number; phase: number; damage: Damage }

/** Cells broken by one click: a small plus shape around the clicked cell. */
const BREAK_RADIUS = { cols: 1.6, rows: 1.1 };

/** Bloom sprites are up to 5 columns wide; this keeps neighbours apart. */
const MIN_FLOWER_SPACING = 7;

/**
 * A living ASCII garden: plants grow in, sway with wind, lean away from the
 * cursor and shed petals. Everything is rebuilt from a seed on resize.
 */
export class GardenScene implements AsciiScene {
  private metrics: GridMetrics = { cols: 0, rows: 0, aspect: 0.5 };
  private groundRow = 0;
  private clock = 0;
  private started = false;

  private feature: VectorPlant | null = null;
  private meadow: SpritePlant[] = [];
  private stars: Star[] = [];
  private clouds: Cloud[] = [];
  private blades: Blade[] = [];
  private soil: Grain[] = [];
  private butterflies: Butterfly[] = [];
  private fireflies: Firefly[] = [];
  private petals: Particle[] = [];
  private sparkles: Particle[] = [];
  private petalTimer = 0;
  private pointer: PointerState = { col: 0, row: 0, active: false, movement: 0 };
  private catAwake = 0;
  private ink: InkLayer | null = null;
  /** Damage by stable object key; survives rebuilds, lost only on reload. */
  private readonly damageStore = new Map<string, Damage>();
  /** Break handlers of the objects drawn in the last frame; grid owner id = index + 1. */
  private handlers: BreakHandler[] = [];
  private readonly rng: Rng;

  constructor(private readonly options: GardenOptions) {
    this.rng = createRng(options.seed * 7919);
  }

  resize(metrics: GridMetrics): void {
    this.metrics = metrics;
    this.ink ??= new InkLayer();
    this.ink.resize(metrics);
    this.build();
  }

  start({ instant }: SceneStartOptions): void {
    this.started = true;
    if (instant) this.clock = 1000;
  }

  update(dt: number, time: number, pointer: PointerState): void {
    this.pointer = pointer;
    if (this.started) this.clock += dt;

    for (const plant of this.plants) plant.update(dt, this.clock, pointer, this.metrics.aspect);
    this.updateClouds(dt);
    this.updatePetals(dt, time);
    this.updateSparkles(dt);
    this.updateButterflies(dt, time);

    const nearCat = this.options.cat && pointer.active && this.distanceToCat(pointer) < 14 ? 1 : 0;
    this.catAwake = lerp(this.catAwake, nearCat, damp(4, dt));
  }

  draw(grid: AsciiGrid, time: number): void {
    this.handlers = [];
    this.drawStars(grid, time);
    this.drawClouds(grid);
    this.drawFireflies(grid, time);
    if (this.ink && this.feature) {
      const feature = this.feature;
      const ctx = this.ink.begin();
      feature.draw(this.ink, ctx, time, this.windAt(time, feature.spec.col));
      const owner = this.own(grid, (hits, g, id) => feature.breakCells(hits, g, id));
      this.ink.commit(grid);
      feature.applyDamage(grid, owner);
    }
    for (const plant of this.meadow) {
      const owner = this.own(grid, (hits, g, id) => plant.breakCells(hits, g, id));
      plant.draw(grid, this.windAt(time, plant.spec.col));
      plant.applyDamage(grid, owner);
    }
    this.drawGround(grid, time);
    this.drawCat(grid, time);
    this.drawButterflies(grid, time);
    this.drawParticles(grid, this.petals);
    this.drawParticles(grid, this.sparkles);
    grid.owner = 0;
  }

  breakAt(col: number, row: number, grid: AsciiGrid): BrokenCell[] {
    const byOwner = new Map<number, HitCell[]>();
    for (let r = Math.floor(row - BREAK_RADIUS.rows); r <= row + BREAK_RADIUS.rows; r++) {
      for (let c = Math.floor(col - BREAK_RADIUS.cols); c <= col + BREAK_RADIUS.cols; c++) {
        if (r < 0 || c < 0 || r >= grid.rows || c >= grid.cols) continue;
        if (((c - col) / BREAK_RADIUS.cols) ** 2 + ((r - row) / BREAK_RADIUS.rows) ** 2 > 1) continue;
        const index = r * grid.cols + c;
        const owner = grid.owners[index] ?? 0;
        const char = grid.chars[index];
        if (owner === 0 || !char) continue;
        const hit: HitCell = { col: c, row: r, index, char, color: grid.colors[index] as ColorIndex };
        byOwner.set(owner, [...(byOwner.get(owner) ?? []), hit]);
      }
    }
    return [...byOwner].flatMap(([owner, hits]) => this.handlers[owner - 1]?.(hits, grid, owner) ?? []);
  }

  /** Heals everything: objects keep their damage records, so clearing them in place is enough. */
  repair(): void {
    for (const damage of this.damageStore.values()) {
      damage.cells.clear();
      damage.cut = Infinity;
      damage.dead = false;
    }
  }

  /** Registers the object about to be drawn and stamps its cells with a new owner id. */
  private own(grid: AsciiGrid, handler: BreakHandler): number {
    this.handlers.push(handler);
    grid.owner = this.handlers.length;
    return grid.owner;
  }

  private damageFor(key: string): Damage {
    let damage = this.damageStore.get(key);
    if (!damage) {
      damage = createDamage();
      this.damageStore.set(key, damage);
    }
    return damage;
  }

  private get plants(): PlantBase[] {
    return this.feature ? [this.feature, ...this.meadow] : this.meadow;
  }

  private windAt(time: number, col: number): number {
    const gust = Math.pow(Math.max(0, Math.sin(time * 0.23)), 4) * 0.6;
    return (Math.sin(time * 0.7 + col * 0.045) * 0.6 + Math.sin(time * 1.7 + col * 0.11) * 0.25 + gust) * this.options.wind;
  }

  // ---------------------------------------------------------------- build

  private build(): void {
    const { cols, rows } = this.metrics;
    const rng = createRng(this.options.seed);
    this.groundRow = Math.min(rows - 1, Math.floor(rows * this.options.ground));

    this.feature = this.options.feature ? this.createFeature(rng) : null;
    if (this.feature) this.feature.damage = this.damageFor('feature');
    this.meadow = this.createMeadow(rng);
    this.meadow.forEach((plant, index) => (plant.damage = this.damageFor(`meadow:${index}`)));

    this.stars = this.createStars(rng);
    this.clouds = Array.from({ length: this.options.clouds }, (_, index) => {
      const lines = CLOUDS[index % CLOUDS.length] ?? CLOUDS[0];
      return {
        col: range(rng, 0, cols),
        row: range(rng, 1, Math.max(2, this.groundRow * 0.3)),
        speed: range(rng, 0.4, 1.1),
        lines,
        damage: this.damageFor(`cloud:${index}`),
      };
    });

    this.blades = [];
    for (let col = 0; col < cols; col++) {
      if (rng() > this.options.grass) continue;
      const height = 1 + Math.floor(rng() * 3);
      this.blades.push({ col, height, char: pick(rng, GRASS_CHARS), phase: rng() * 6, damage: this.damageFor(`blade:${col}`) });
    }

    this.soil = [];
    for (let row = this.groundRow + 1; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (rng() < 0.08) this.soil.push({ col, row, char: pick(rng, ['.', ',', "'"]), color: Color.sageDim });
      }
    }

    this.butterflies = Array.from({ length: this.options.butterflies }, (_, index) => ({
      col: range(rng, cols * 0.4, cols),
      row: range(rng, 2, this.groundRow * 0.6),
      vCol: 0,
      vRow: 0,
      targetCol: range(rng, 0, cols),
      targetRow: range(rng, 2, this.groundRow * 0.7),
      retarget: range(rng, 2, 5),
      phase: rng() * 6,
      damage: this.damageFor(`butterfly:${index}`),
    }));

    this.fireflies = Array.from({ length: this.options.fireflies }, (_, index) => ({
      col: range(rng, 0, cols),
      row: range(rng, this.groundRow * 0.45, this.groundRow - 2),
      phase: rng() * 6,
      damage: this.damageFor(`firefly:${index}`),
    }));
  }

  private createFeature(rng: Rng): VectorPlant {
    const feature = this.options.feature!;
    const { cols } = this.metrics;
    const narrow = cols < 110;
    const height = Math.max(4, this.groundRow * feature.height * (narrow ? 0.8 : 1));
    const baseLeaves: LeafSpec[] = Array.from({ length: narrow ? 4 : 7 }, (_, index) => ({
      at: range(rng, 0.01, 0.08),
      side: index % 2 === 0 ? 1 : -1,
      length: Math.min(range(rng, cols * 0.06, cols * 0.11), height * 1.1),
      lift: range(rng, 1.4, 2.2),
      droop: range(rng, 0.9, 1.15),
      width: range(rng, 1, 2.2),
    }));
    const stemLeaves: LeafSpec[] = [0.25, 0.42, 0.58].map((at, index) => ({
      at,
      side: index % 2 === 0 ? -1 : 1,
      length: height * range(rng, 0.35, 0.55),
      lift: range(rng, 2, 3),
      droop: range(rng, 0.6, 0.8),
      width: range(rng, 0.8, 1.4),
    }));

    return new VectorPlant({
      col: cols * (narrow ? Math.min(feature.x, 0.72) : feature.x),
      baseRow: this.groundRow,
      height,
      bend: -0.08,
      thick: true,
      bloom: feature.kind,
      radius: height * feature.radius,
      leaves: [...baseLeaves, ...stemLeaves],
      delay: 0.2,
      duration: 4.5,
      phase: rng() * 6,
      flex: 0.25,
    });
  }

  private createMeadow(rng: Rng): SpritePlant[] {
    const { from, to, density, maxHeight, species = SPRITE_SPECIES } = this.options.meadow;
    const { cols } = this.metrics;
    const span = (to - from) * cols;
    // Never closer than MIN_FLOWER_SPACING columns, so bloom sprites don't overlap.
    const count = Math.min(Math.round((span * density) / 10), Math.floor(span / MIN_FLOWER_SPACING));

    return Array.from({ length: count }, (_, index) => {
      const kind = pick(rng, species);
      // Leave room above the stem for the bloom sprite so it is never clipped.
      const room = this.groundRow - spriteHeight(kind) - 1;
      const height = Math.max(2, Math.min(range(rng, 3, maxHeight), room));
      return new SpritePlant({
        // Stratified: one slot per flower with jitter, so flowers spread evenly instead of clumping.
        col: cols * (from + ((index + range(rng, 0.15, 0.85)) / count) * (to - from)),
        baseRow: this.groundRow,
        height,
        bend: range(rng, -0.25, 0.25),
        radius: 1.5,
        species: kind,
        swapTones: rng() < 0.4,
        leaves: Array.from({ length: height > 4 ? 1 + Math.floor(rng() * 2) : 0 }, (_, leafIndex) => ({
          at: range(rng, 0.2, 0.6),
          side: leafIndex % 2 === 0 ? -1 : 1,
        })),
        delay: 0.8 + rng() * 2.8,
        duration: range(rng, 2, 3.5),
        phase: rng() * 6,
        flex: range(rng, 0.6, 1),
      });
    });
  }

  private createStars(rng: Rng): Star[] {
    const { cols } = this.metrics;
    const skyRows = Math.max(0, this.groundRow - 4);
    const count = Math.round((this.options.stars * cols * skyRows) / 1000);
    return Array.from({ length: count }, (_, index) => {
      const char = pick(rng, STAR_CHARS);
      return {
        damage: this.damageFor(`star:${index}`),
        col: Math.floor(rng() * cols),
        row: Math.floor(rng() * skyRows),
        char,
        color: char === '+' || char === '*' ? pick(rng, [Color.ink, Color.lavender, Color.sage]) : Color.inkFaint,
        phase: rng() * Math.PI * 2,
        speed: range(rng, 0.6, 2.2),
      };
    });
  }

  // --------------------------------------------------------------- update

  private updateClouds(dt: number): void {
    const { cols } = this.metrics;
    for (const cloud of this.clouds) {
      cloud.col += cloud.speed * dt;
      const width = Math.max(...cloud.lines.map((line) => line.length));
      if (cloud.col > cols + 2) cloud.col = -width;
    }
  }

  private updatePetals(dt: number, time: number): void {
    const { cols, aspect } = this.metrics;
    const blooming = this.plants.filter((plant) => plant.isBlooming);

    this.petalTimer -= dt;
    if (this.petalTimer <= 0 && this.petals.length < this.options.petals && this.started) {
      this.petalTimer = range(this.rng, 0.25, 0.9);
      const source = blooming.length > 0 && this.rng() < 0.75 ? pick(this.rng, blooming) : undefined;
      const origin = source
        ? { col: source.headPoint.col + range(this.rng, -4, 4), row: source.headPoint.row + range(this.rng, -2, 1) }
        : { col: range(this.rng, cols * 0.3, cols), row: -1 };
      this.petals.push({
        ...origin,
        vCol: range(this.rng, 0.5, 3),
        vRow: range(this.rng, 0.8, 2),
        life: 0,
        maxLife: range(this.rng, 8, 16),
        char: pick(this.rng, PETAL_CHARS),
        color: this.rng() > 0.4 ? Color.purple : Color.lavender,
        settled: false,
      });
    }

    for (const petal of this.petals) {
      petal.life += dt;
      if (petal.settled) continue;

      const wind = this.windAt(time, petal.col);
      petal.col += (petal.vCol + wind * 2 + Math.sin(time * 2 + petal.maxLife) * 1.2) * dt;
      petal.row += petal.vRow * dt;
      this.repelFromPointer(petal, 5, 10 * dt, aspect);

      if (petal.row >= this.groundRow) {
        petal.row = this.groundRow;
        petal.settled = true;
        petal.maxLife = petal.life + 2.5;
      }
    }
    this.petals = this.petals.filter((petal) => petal.life < petal.maxLife && petal.col < cols + 2 && petal.col > -4);
  }

  private updateSparkles(dt: number): void {
    const { pointer } = this;
    if (this.options.sparkles && pointer.active && pointer.movement > 0.6) {
      const count = Math.min(4, Math.floor(pointer.movement * 0.5) + 1);
      for (let i = 0; i < count; i++) {
        this.sparkles.push({
          col: pointer.col + range(this.rng, -1.5, 1.5),
          row: pointer.row + range(this.rng, -0.8, 0.8),
          vCol: range(this.rng, -3, 3),
          vRow: range(this.rng, -1.5, 1),
          life: 0,
          maxLife: range(this.rng, 0.5, 1.1),
          char: '*',
          color: this.rng() > 0.5 ? Color.sageBright : Color.lavender,
          settled: false,
        });
      }
    }
    for (const sparkle of this.sparkles) {
      sparkle.life += dt;
      sparkle.col += sparkle.vCol * dt;
      sparkle.row += sparkle.vRow * dt;
      const fade = 1 - sparkle.life / sparkle.maxLife;
      sparkle.char = SPARKLE_CHARS[Math.min(SPARKLE_CHARS.length - 1, Math.floor(fade * SPARKLE_CHARS.length))] ?? '.';
    }
    this.sparkles = this.sparkles.filter((sparkle) => sparkle.life < sparkle.maxLife).slice(-80);
  }

  private updateButterflies(dt: number, time: number): void {
    const { cols } = this.metrics;
    const { pointer } = this;
    for (const butterfly of this.butterflies) {
      butterfly.retarget -= dt;
      const curious = pointer.active && Math.hypot(pointer.col - butterfly.col, (pointer.row - butterfly.row) * 2) < 30;
      if (curious) {
        butterfly.targetCol = pointer.col + Math.sin(time * 1.3 + butterfly.phase) * 6;
        butterfly.targetRow = pointer.row - 2 + Math.cos(time * 1.1 + butterfly.phase) * 2;
      } else if (butterfly.retarget <= 0) {
        butterfly.retarget = range(this.rng, 3, 6);
        butterfly.targetCol = range(this.rng, cols * 0.1, cols * 0.95);
        butterfly.targetRow = range(this.rng, 2, this.groundRow * 0.75);
      }

      const steer = damp(1.2, dt);
      butterfly.vCol = lerp(butterfly.vCol, clamp((butterfly.targetCol - butterfly.col) * 0.8, -12, 12), steer);
      butterfly.vRow = lerp(butterfly.vRow, clamp((butterfly.targetRow - butterfly.row) * 0.8, -5, 5), steer);
      butterfly.col += butterfly.vCol * dt;
      butterfly.row += (butterfly.vRow + Math.sin(time * 5 + butterfly.phase) * 1.5) * dt;
    }
  }

  private repelFromPointer(particle: Particle, radius: number, strength: number, aspect: number): void {
    if (!this.pointer.active) return;
    const dCol = (particle.col - this.pointer.col) * aspect;
    const dRow = particle.row - this.pointer.row;
    const distance = Math.hypot(dCol, dRow);
    if (distance === 0 || distance > radius) return;
    const push = (1 - distance / radius) * strength;
    particle.col += (dCol / distance) * push * 4;
    particle.row += (dRow / distance) * push;
  }

  private distanceToCat(pointer: PointerState): number {
    const catCol = (this.options.cat?.x ?? 0) * this.metrics.cols;
    return Math.hypot((pointer.col - catCol) * this.metrics.aspect * 2, pointer.row - (this.groundRow - 2));
  }

  // ----------------------------------------------------------------- draw

  private drawStars(grid: AsciiGrid, time: number): void {
    for (const star of this.stars) {
      if (star.damage.dead) continue;
      this.own(grid, (hits) => {
        star.damage.dead = true;
        return hits.map((hit) => ({ ...hit, mass: WEIGHTS.star }));
      });
      const pulse = (Math.sin(time * star.speed + star.phase) + 1) / 2;
      const alpha = 0.2 + 0.8 * Math.pow(pulse, 3);
      const char = star.char === '+' && alpha > 0.85 ? '*' : star.char;
      grid.set(star.col, star.row, char, star.color, alpha);
    }
  }

  private drawClouds(grid: AsciiGrid): void {
    for (const cloud of this.clouds) {
      const left = Math.round(cloud.col);
      const top = Math.round(cloud.row);
      this.own(grid, (hits) => breakSprite(hits, left, top, cloud.damage, WEIGHTS.cloud));
      drawDamagedSprite(grid, left, top, cloud.lines, Color.sageDim, 0.75, cloud.damage);
    }
  }

  private drawFireflies(grid: AsciiGrid, time: number): void {
    for (const firefly of this.fireflies) {
      if (firefly.damage.dead) continue;
      this.own(grid, (hits) => {
        firefly.damage.dead = true;
        return hits.map((hit) => ({ ...hit, mass: WEIGHTS.star }));
      });
      const col = firefly.col + Math.sin(time * 0.3 + firefly.phase) * 6;
      const row = firefly.row + Math.cos(time * 0.5 + firefly.phase) * 2;
      const alpha = Math.max(0, Math.sin(time * 1.4 + firefly.phase));
      grid.set(col, row, alpha > 0.8 ? '*' : '·', Color.sageBright, alpha);
    }
  }

  private drawGround(grid: AsciiGrid, time: number): void {
    const { aspect } = this.metrics;
    const { pointer } = this;

    for (const blade of this.blades) {
      const height = Math.min(blade.height, blade.damage.cut);
      if (height <= 0) continue;
      // Cutting a blade drops everything above the cut.
      this.own(grid, (hits, g, owner) => {
        const cut = Math.min(...hits.map((hit) => this.groundRow - 1 - hit.row));
        blade.damage.cut = Math.min(blade.damage.cut, cut);
        const hitIndexes = new Set(hits.map((hit) => hit.index));
        return cellsOf(g, owner, WEIGHTS.grass).map((cell) =>
          hitIndexes.has(cell.row * g.cols + cell.col) ? cell : { ...cell, drop: true },
        );
      });
      let lean = this.windAt(time, blade.col) + Math.sin(time * 1.3 + blade.phase) * 0.3;
      if (pointer.active) {
        const dx = blade.col - pointer.col;
        const near = Math.abs(dx) * aspect < 2.5 && Math.abs(pointer.row - this.groundRow) < 5;
        if (near) lean += Math.sign(dx) * 1.5;
      }
      for (let k = 0; k < height; k++) {
        const isTop = k === height - 1;
        const char = isTop ? (lean > 0.55 ? '/' : lean < -0.55 ? '\\' : blade.char) : k === 0 ? ',' : '|';
        grid.set(blade.col, this.groundRow - 1 - k, char, isTop ? Color.sage : Color.sageDim, isTop ? 0.85 : 0.7);
      }
    }

    // Ground and soil: damage keyed by column and depth below the ground line.
    const ground = this.damageFor('ground');
    this.own(grid, (hits) =>
      hits.map((hit) => {
        ground.cells.add(`${hit.col},${hit.row - this.groundRow}`);
        return { ...hit, mass: WEIGHTS.ground };
      }),
    );
    for (let col = 0; col < this.metrics.cols; col++) {
      if (!ground.cells.has(`${col},0`)) grid.set(col, this.groundRow, col % 3 === 0 ? '.' : '_', Color.sageDim, 0.55);
    }
    for (const grain of this.soil) {
      if (!ground.cells.has(`${grain.col},${grain.row - this.groundRow}`)) {
        grid.set(grain.col, grain.row, grain.char, grain.color, 0.3);
      }
    }
  }

  private drawCat(grid: AsciiGrid, time: number): void {
    if (!this.options.cat) return;
    const col = this.options.cat.x * this.metrics.cols - 8;
    const top = this.groundRow - CAT_TEMPLATE.length + 1;
    const awake = this.catAwake > 0.5;
    const tail = CAT_TAIL_FRAMES[Math.floor(time * (awake ? 6 : 1.5)) % CAT_TAIL_FRAMES.length] ?? '~';
    const lines = CAT_TEMPLATE.map((line) =>
      line.replace('{eyes}', awake ? CAT_EYES.awake : CAT_EYES.asleep).replace('{tail}', tail),
    );
    const left = Math.round(col);
    const damage = this.damageFor('cat');
    this.own(grid, (hits) => breakSprite(hits, left, top, damage, WEIGHTS.cat));
    drawDamagedSprite(grid, left, top, lines, Color.sage, 0.9, damage);

    if (awake) {
      grid.set(col + 9, top - 1, '!', Color.amber, this.catAwake);
      return;
    }
    for (let i = 0; i < 3; i++) {
      const t = (time * 0.35 + i / 3) % 1;
      grid.set(col + 10 + t * 4 + i, top - t * 4, i === 2 ? 'Z' : 'z', Color.lavender, (1 - t) * (1 - this.catAwake));
    }
  }

  private drawButterflies(grid: AsciiGrid, time: number): void {
    for (const butterfly of this.butterflies) {
      if (butterfly.damage.dead) continue;
      // A hit butterfly shatters completely.
      this.own(grid, (_hits, g, owner) => {
        butterfly.damage.dead = true;
        return cellsOf(g, owner, WEIGHTS.petal);
      });
      const frame = BUTTERFLY_FRAMES[Math.sin(time * 14 + butterfly.phase) > 0 ? 0 : 1] ?? BUTTERFLY_FRAMES[0];
      grid.sprite(butterfly.col - 2, butterfly.row - 1, frame, Color.lavender, 0.95);
    }
  }

  private drawParticles(grid: AsciiGrid, particles: Particle[]): void {
    for (const particle of particles) {
      // Transient particles just vanish when hit.
      this.own(grid, (hits) => {
        particle.life = particle.maxLife;
        return hits.map((hit) => ({ ...hit, mass: WEIGHTS.petal }));
      });
      const fadeIn = clamp(particle.life / 0.4);
      const fadeOut = clamp((particle.maxLife - particle.life) / 1.2);
      grid.set(particle.col, particle.row, particle.char, particle.color, Math.min(fadeIn, fadeOut));
    }
  }
}
