import {
  AmbientLight,
  CanvasTexture,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import { WEIGHTS } from '@/lib/debris/weights';
import { AsciiGrid } from './grid';
import { Color, type ColorIndex } from './palette';
import { createRng, damp, lerp } from './random';
import type { AsciiScene, BrokenCell, GridMetrics, PointerState, SceneStartOptions } from './types';

const RAMP = ' .,:-=+*#%@';
/** On this click, whatever is left of the moon falls. */
const CLICKS_TO_FALL = 3;
/** Crater punched per click, in texture pixels (texture is 512 x 256). */
const CRATER_RADIUS = 34;
/** Cells broken by one click around the clicked cell. */
const BREAK_RADIUS = { cols: 2.2, rows: 1.2 };

/** Paints a cratered surface used as the moon's albedo map. */
function createCraterTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const rng = createRng(42);

  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = `rgba(60, 60, 60, ${0.25 + rng() * 0.25})`;
    ctx.beginPath();
    ctx.ellipse(rng() * 512, 40 + rng() * 176, 30 + rng() * 60, 20 + rng() * 40, rng() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 70; i++) {
    const x = rng() * 512;
    const y = rng() * 256;
    const r = 2 + Math.pow(rng(), 3) * 22;
    ctx.fillStyle = 'rgba(40, 40, 40, 0.55)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = Math.max(1, r * 0.18);
    ctx.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * A Three.js moon rendered into a tiny offscreen target, then converted to
 * characters. The light orbits slowly (moon phases) and the sphere tilts
 * towards the cursor.
 */
export class MoonScene implements AsciiScene {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(28, 1, 0.1, 20);
  private readonly light = new DirectionalLight(0xffffff, 3.2);
  private readonly moon: Mesh<SphereGeometry, MeshStandardMaterial>;
  private target: WebGLRenderTarget | null = null;
  private pixels = new Uint8Array(0);
  private metrics: GridMetrics = { cols: 0, rows: 0, aspect: 0.5, reservedTop: 0 };
  private tiltX = 0;
  private tiltY = 0;
  private reveal = 0;
  private hover = 0;
  private instant = false;
  private clicks = 0;
  private fallen = false;
  private readonly raycaster = new Raycaster();
  /** Offscreen grid used to see which cells a crater removed. */
  private readonly scratch = new AsciiGrid();
  /** Untouched copy of the texture, to undo craters on repair. */
  private readonly pristine: HTMLCanvasElement;

  constructor() {
    this.renderer = new WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'low-power' });
    this.moon = new Mesh(
      new SphereGeometry(1, 48, 32),
      // alphaTest lets punched holes in the texture become real holes in the sphere.
      new MeshStandardMaterial({ map: createCraterTexture(), roughness: 1, metalness: 0, alphaTest: 0.5 }),
    );
    const texture = this.moon.material.map?.image as HTMLCanvasElement;
    this.pristine = document.createElement('canvas');
    this.pristine.width = texture.width;
    this.pristine.height = texture.height;
    this.pristine.getContext('2d')?.drawImage(texture, 0, 0);
    this.scene.add(this.moon, this.light, new AmbientLight(0xffffff, 0.22));
    this.camera.position.set(0, 0, 4.6);
  }

  resize(metrics: GridMetrics): void {
    this.metrics = metrics;
    const { cols, rows, aspect } = metrics;
    this.target?.dispose();
    this.target = new WebGLRenderTarget(cols, rows);
    this.pixels = new Uint8Array(cols * rows * 4);
    this.camera.aspect = (cols * aspect) / rows;
    this.camera.updateProjectionMatrix();
  }

  start({ instant }: SceneStartOptions): void {
    this.instant = instant;
  }

  update(dt: number, time: number, pointer: PointerState): void {
    const { cols, rows } = this.metrics;
    const towardX = pointer.active ? (pointer.row / rows - 0.5) * 0.9 : 0;
    const towardY = pointer.active ? (pointer.col / cols - 0.5) * 0.9 : 0;
    this.tiltX = lerp(this.tiltX, towardX, damp(2, dt));
    this.tiltY = lerp(this.tiltY, towardY, damp(2, dt));
    this.hover = lerp(this.hover, pointer.active ? 1 : 0, damp(3, dt));
    this.reveal = this.instant ? 1 : Math.min(1, this.reveal + dt * 0.5);

    this.moon.rotation.set(this.tiltX + 0.2, time * 0.12 + this.tiltY, 0);
    const phase = time * 0.08 + 1.2;
    this.light.position.set(Math.cos(phase) * 5, 1.5, Math.sin(phase) * 5 + 2);
    this.light.intensity = 3.8 + this.hover * 1.4;
  }

  draw(grid: AsciiGrid): void {
    const { cols, rows } = this.metrics;
    if (!this.target || cols === 0 || this.fallen) return;

    this.renderer.setRenderTarget(this.target);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.readRenderTargetPixels(this.target, 0, 0, cols, rows, this.pixels);
    this.renderer.setRenderTarget(null);

    const revealRows = rows * this.reveal;
    for (let y = 0; y < rows; y++) {
      const row = rows - 1 - y;
      if (row > revealRows) continue;
      for (let col = 0; col < cols; col++) {
        const index = (y * cols + col) * 4;
        if ((this.pixels[index + 3] ?? 0) < 8) continue;

        const r = this.pixels[index] ?? 0;
        const g = this.pixels[index + 1] ?? 0;
        const b = this.pixels[index + 2] ?? 0;
        // The render target holds linear light; gamma-correct before mapping to glyphs.
        const luminance = Math.pow((r * 0.3 + g * 0.59 + b * 0.11) / 255, 1 / 2.2);
        if (luminance < 0.05) {
          grid.set(col, row, '.', Color.purpleDim, 0.65);
          continue;
        }
        const char = RAMP.charAt(Math.min(RAMP.length - 1, Math.floor(luminance * RAMP.length)));
        const color =
          luminance > 0.68
            ? Color.ink
            : luminance > 0.42
              ? Color.lavender
              : luminance > 0.22
                ? Color.purple
                : Color.fuchsia;
        grid.set(col, row, char, color, 0.72 + luminance * 0.28);
      }
    }
  }

  /**
   * Each click blasts shards off and punches a hole that rotates with the
   * moon. On the third click, whatever is left falls.
   */
  breakAt(col: number, row: number, grid: AsciiGrid): BrokenCell[] {
    // What you see is what breaks: no hits until the moon has fully appeared.
    if (this.fallen || this.reveal < 1) return [];
    // Hit-test the sphere itself, not the drawn cells: a click inside an
    // existing hole is still a click on the moon and must count.
    const uv = this.uvAt(col + 0.5, row + 0.5);
    if (!uv) return [];
    const hits = this.cellsAround(col, row, grid);

    this.clicks += 1;
    if (this.clicks >= CLICKS_TO_FALL) {
      this.fallen = true;
      const hitSet = new Set(hits.map((hit) => `${hit.col},${hit.row}`));
      return this.allCells(grid).map((cell) =>
        hitSet.has(`${cell.col},${cell.row}`)
          ? { ...cell, critical: true }
          : { ...cell, mass: WEIGHTS.moonCore, drop: true, critical: true },
      );
    }

    this.punchCrater(uv);
    const vanished = this.vanishedCells(grid);
    return vanished.length > 0 ? vanished : hits;
  }

  /** Restores the texture and brings the moon back, revealing it again. */
  repair(): void {
    const map = this.moon.material.map;
    const ctx = (map?.image as HTMLCanvasElement | undefined)?.getContext('2d');
    if (map && ctx) {
      ctx.save();
      ctx.globalCompositeOperation = 'copy';
      ctx.drawImage(this.pristine, 0, 0);
      ctx.restore();
      map.needsUpdate = true;
    }
    this.clicks = 0;
    this.fallen = false;
    this.reveal = this.instant ? 1 : 0;
  }

  /** Every cell of the last frame that is gone once the moon is drawn again. */
  private vanishedCells(grid: AsciiGrid): BrokenCell[] {
    if (this.scratch.cols !== grid.cols || this.scratch.rows !== grid.rows) this.scratch.resize(grid.cols, grid.rows);
    this.scratch.clear();
    this.draw(this.scratch);
    return this.allCells(grid).filter((cell) => !this.scratch.chars[cell.row * grid.cols + cell.col]);
  }

  private cellsAround(col: number, row: number, grid: AsciiGrid): BrokenCell[] {
    const cells: BrokenCell[] = [];
    for (let r = Math.floor(row - BREAK_RADIUS.rows); r <= row + BREAK_RADIUS.rows; r++) {
      for (let c = Math.floor(col - BREAK_RADIUS.cols); c <= col + BREAK_RADIUS.cols; c++) {
        if (r < 0 || c < 0 || r >= grid.rows || c >= grid.cols) continue;
        if (((c - col) / BREAK_RADIUS.cols) ** 2 + ((r - row) / BREAK_RADIUS.rows) ** 2 > 1) continue;
        const index = r * grid.cols + c;
        const char = grid.chars[index];
        if (char) cells.push({ col: c, row: r, char, color: grid.colors[index] as ColorIndex, mass: WEIGHTS.moonShard });
      }
    }
    return cells;
  }

  private allCells(grid: AsciiGrid): BrokenCell[] {
    const cells: BrokenCell[] = [];
    grid.chars.forEach((char, index) => {
      if (!char) return;
      cells.push({
        col: index % grid.cols,
        row: Math.floor(index / grid.cols),
        char,
        color: grid.colors[index] as ColorIndex,
        mass: WEIGHTS.moonShard,
      });
    });
    return cells;
  }

  /** Texture coordinates of the sphere under a grid cell (holes do not stop the ray). */
  private uvAt(col: number, row: number): Vector2 | null {
    const { cols, rows } = this.metrics;
    const pointer = new Vector2((col / cols) * 2 - 1, -((row / rows) * 2 - 1));
    this.raycaster.setFromCamera(pointer, this.camera);
    return this.raycaster.intersectObject(this.moon)[0]?.uv ?? null;
  }

  /** Erases a crater from the texture; it widens with every click so repeated hits keep digging. */
  private punchCrater(uv: Vector2): void {
    const map = this.moon.material.map;
    const canvas = map?.image as HTMLCanvasElement | undefined;
    const ctx = canvas?.getContext('2d');
    if (!map || !canvas || !ctx) return;

    const x = uv.x * canvas.width;
    const y = (1 - uv.y) * canvas.height;
    const radius = CRATER_RADIUS * (1 + 0.35 * (this.clicks - 1));
    // Latitude stretches the texture horizontally near the poles.
    const latitude = (uv.y - 0.5) * Math.PI;
    const radiusX = radius / Math.max(0.25, Math.cos(latitude));
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    for (const offset of [-canvas.width, 0, canvas.width]) {
      ctx.beginPath();
      ctx.ellipse(x + offset, y, radiusX, radius, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    map.needsUpdate = true;
  }

  dispose(): void {
    this.target?.dispose();
    this.moon.geometry.dispose();
    this.moon.material.map?.dispose();
    this.moon.material.dispose();
    this.renderer.dispose();
  }
}
