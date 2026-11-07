import { registerBreakable } from '@/lib/debris/breaker';
import type { DebrisPiece } from '@/lib/debris/types';
import { isMotionEnabled, onMotionChange } from '@/lib/motion';
import { AsciiGrid } from './grid';
import { PALETTE_SIZE, readPalette } from './palette';
import type { AsciiScene, PointerState } from './types';

export interface RendererOptions {
  fontSize?: number;
  /** Cell height as a multiple of the font size. */
  lineHeight?: number;
  fontFamily?: string;
  /** Frame cap. ASCII art reads well at 30fps and costs half. */
  fps?: number;
  /** Time scale for every scene animation (1 = real time). */
  speed?: number;
}

export const DEFAULT_ANIMATION_SPEED = 0.5;

const ALPHA_LEVELS = 6;
const DEFAULT_FONT_FAMILY = '"IBM Plex Mono", ui-monospace, monospace';

/**
 * Owns a canvas and drives one scene: sizing, DPR, frame loop, input,
 * offscreen/tab pausing and prefers-reduced-motion. Framework agnostic.
 */
export class AsciiRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly grid = new AsciiGrid();
  private readonly options: Required<RendererOptions>;
  private readonly pointer: PointerState = { col: 0, row: 0, active: false, movement: 0 };
  private readonly buckets: number[][] = Array.from({ length: PALETTE_SIZE * ALPHA_LEVELS }, () => []);
  private readonly cleanups: Array<() => void> = [];

  private palette: string[] = [];
  private cellWidth = 0;
  private cellHeight = 0;
  private frameId = 0;
  private lastFrame = 0;
  private time = 0;
  private isVisible = false;
  private hasStarted = false;
  private reducedMotion = false;
  private destroyed = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly scene: AsciiScene,
    options: RendererOptions = {},
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context is not available');
    this.ctx = ctx;
    this.options = {
      fontSize: options.fontSize ?? 12,
      lineHeight: options.lineHeight ?? 1.2,
      fontFamily: options.fontFamily ?? DEFAULT_FONT_FAMILY,
      fps: options.fps ?? 30,
      speed: options.speed ?? DEFAULT_ANIMATION_SPEED,
    };
  }

  async mount(): Promise<void> {
    await document.fonts?.load(this.font).catch(() => undefined);
    if (this.destroyed) return;

    this.palette = readPalette(document.documentElement);
    this.measureCell();
    this.observeReducedMotion();
    this.observeSize();
    this.observeVisibility();
    this.listenToPointer();
    if (this.scene.breakAt) {
      this.cleanups.push(
        registerBreakable({
          element: this.canvas,
          breakAt: (x, y) => this.breakAt(x, y),
          repair: () => {
            this.scene.repair?.();
            if (this.frameId === 0) this.renderFrame();
          },
        }),
      );
    }
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.frameId);
    this.cleanups.forEach((cleanup) => cleanup());
    this.scene.dispose?.();
  }

  private get font(): string {
    return `${this.options.fontSize}px ${this.options.fontFamily}`;
  }

  /** Breaks the scene at a viewport point and returns the pieces in viewport coordinates. */
  private breakAt(clientX: number, clientY: number): DebrisPiece[] {
    const rect = this.canvas.getBoundingClientRect();
    const col = Math.floor((clientX - rect.left) / this.cellWidth);
    const row = Math.floor((clientY - rect.top) / this.cellHeight);
    const cells = this.scene.breakAt?.(col, row, this.grid) ?? [];
    if (cells.length > 0 && this.frameId === 0) this.renderFrame();

    return cells.map((cell) => ({
      x: rect.left + (cell.col + 0.5) * this.cellWidth,
      y: rect.top + (cell.row + 0.5) * this.cellHeight,
      char: cell.char,
      font: this.font,
      color: this.palette[cell.color] ?? '#fff',
      mass: cell.mass,
      ...(cell.drop && { drop: true }),
      ...(cell.critical && { critical: true }),
    }));
  }

  private measureCell(): void {
    this.ctx.font = this.font;
    this.cellWidth = this.ctx.measureText('M').width;
    this.cellHeight = Math.round(this.options.fontSize * this.options.lineHeight);
  }

  private observeReducedMotion(): void {
    this.reducedMotion = !isMotionEnabled();
    const unsubscribe = onMotionChange((enabled) => {
      this.reducedMotion = !enabled;
      this.syncLoop();
    });
    this.cleanups.push(unsubscribe);
  }

  private observeSize(): void {
    const observer = new ResizeObserver(() => this.resize());
    observer.observe(this.canvas);
    this.cleanups.push(() => observer.disconnect());
    this.resize();
  }

  private observeVisibility(): void {
    const observer = new IntersectionObserver(
      ([entry]) => {
        this.isVisible = entry?.isIntersecting ?? false;
        if (this.isVisible && !this.hasStarted) {
          this.hasStarted = true;
          this.scene.start?.({ instant: this.reducedMotion });
          this.renderFrame();
        }
        this.syncLoop();
      },
      { rootMargin: '80px' },
    );
    observer.observe(this.canvas);

    const onVisibilityChange = () => this.syncLoop();
    document.addEventListener('visibilitychange', onVisibilityChange);

    this.cleanups.push(() => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    });
  }

  private listenToPointer(): void {
    const onMove = (event: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const col = (event.clientX - rect.left) / this.cellWidth;
      const row = (event.clientY - rect.top) / this.cellHeight;
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;

      if (inside && this.pointer.active) {
        this.pointer.movement += Math.hypot(col - this.pointer.col, (row - this.pointer.row) * 2);
      }
      this.pointer.col = col;
      this.pointer.row = row;
      this.pointer.active = inside;
    };
    const onLeave = () => {
      this.pointer.active = false;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);
    this.cleanups.push(() => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
    });
  }

  private resize(): void {
    const { width, height } = this.canvas.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cols = Math.ceil(width / this.cellWidth);
    const rows = Math.ceil(height / this.cellHeight);
    this.grid.resize(cols, rows);
    this.scene.resize({ cols, rows, aspect: this.cellWidth / this.cellHeight });
    this.renderFrame();
  }

  private syncLoop(): void {
    const shouldRun = this.isVisible && !document.hidden && !this.reducedMotion && !this.destroyed;
    if (shouldRun && this.frameId === 0) {
      this.lastFrame = performance.now();
      this.frameId = requestAnimationFrame(this.tick);
    } else if (!shouldRun && this.frameId !== 0) {
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    }
  }

  private readonly tick = (now: number): void => {
    this.frameId = requestAnimationFrame(this.tick);
    const elapsed = now - this.lastFrame;
    if (elapsed < 1000 / this.options.fps - 1) return;

    this.lastFrame = now;
    const dt = Math.min(elapsed / 1000, 0.1) * this.options.speed;
    this.time += dt;
    this.scene.update(dt, this.time, this.pointer);
    this.pointer.movement = 0;
    this.renderFrame();
  };

  private renderFrame(): void {
    if (this.grid.cols === 0) return;
    // Outside the loop (static or paused), still let the scene settle its state.
    if (this.frameId === 0) this.scene.update(0, this.time, this.pointer);
    this.grid.clear();
    this.scene.draw(this.grid, this.time);
    this.paint();
  }

  /** Paints the grid, batching cells by color and alpha to limit state changes. */
  private paint(): void {
    const { ctx, grid, buckets } = this;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.font = this.font;
    ctx.textBaseline = 'top';

    buckets.forEach((bucket) => (bucket.length = 0));
    for (let index = 0; index < grid.chars.length; index++) {
      if (grid.chars[index] === '') continue;
      const level = Math.min(ALPHA_LEVELS - 1, Math.floor((grid.alphas[index] ?? 0) * ALPHA_LEVELS));
      buckets[(grid.colors[index] ?? 0) * ALPHA_LEVELS + level]?.push(index);
    }

    buckets.forEach((bucket, bucketIndex) => {
      if (bucket.length === 0) return;
      ctx.fillStyle = this.palette[Math.floor(bucketIndex / ALPHA_LEVELS)] ?? '#fff';
      ctx.globalAlpha = ((bucketIndex % ALPHA_LEVELS) + 1) / ALPHA_LEVELS;
      for (const index of bucket) {
        const col = index % grid.cols;
        const row = (index - col) / grid.cols;
        ctx.fillText(grid.chars[index] ?? '', col * this.cellWidth, row * this.cellHeight);
      }
    });
    ctx.globalAlpha = 1;
  }
}
