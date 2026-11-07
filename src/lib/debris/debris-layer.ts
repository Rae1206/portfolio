import { isMotionEnabled } from '@/lib/motion';
import type { DebrisPiece } from './types';

interface Particle extends DebrisPiece {
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  drag: number;
  age: number;
  restTime: number;
  maxAge: number;
}

const GRAVITY = 1600;
const KICK = 620;
const MAX_PARTICLES = 500;
const REST_FADE_S = 3;
const MAX_AGE_S = 9;

const random = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Fixed full-viewport canvas where broken characters fly, fall and fade.
 * Created on first use; its loop only runs while debris exists. Debris does
 * not collide with each other, so a few lines of physics replace a library.
 */
class DebrisLayer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Particle[] = [];
  private frameId = 0;
  private lastFrame = 0;

  spawn(pieces: DebrisPiece[], origin: { x: number; y: number }): void {
    if (pieces.length === 0) return;
    this.ensureCanvas();
    const animate = isMotionEnabled();

    for (const piece of pieces) {
      const dx = piece.x - origin.x;
      const dy = piece.y - origin.y;
      const distance = Math.hypot(dx, dy) || 1;
      const kick = animate ? (piece.drop ? KICK * 0.08 : KICK) / Math.sqrt(piece.mass) : 0;
      const spread = piece.drop ? 0.2 : 1;

      this.particles.push({
        ...piece,
        vx: animate ? (dx / distance) * kick * 0.6 + random(-0.4, 0.4) * kick * spread : 0,
        vy: animate ? -kick * random(0.55, 1) * spread + (dy / distance) * kick * 0.2 : 0,
        angle: 0,
        spin: animate && !piece.drop ? random(-8, 8) / piece.mass : 0,
        drag: Math.min(6, Math.max(0.2, 1.6 / piece.mass)),
        age: 0,
        restTime: 0,
        // Without motion, pieces just fade where they were.
        maxAge: animate ? MAX_AGE_S : 0.6,
      });
    }

    if (this.particles.length > MAX_PARTICLES) this.particles.splice(0, this.particles.length - MAX_PARTICLES);
    if (this.frameId === 0) {
      this.lastFrame = performance.now();
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  /** Removes all debris at once (used when the page is repaired). */
  clear(): void {
    this.particles = [];
    this.ctx?.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }

  private ensureCanvas(): void {
    if (this.canvas) return;
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:90';
    document.body.append(canvas);
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  private resize(): void {
    if (!this.canvas || !this.ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(window.innerWidth * dpr);
    this.canvas.height = Math.round(window.innerHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private readonly tick = (now: number): void => {
    const dt = Math.min((now - this.lastFrame) / 1000, 0.05);
    this.lastFrame = now;
    this.step(dt);
    this.draw();

    if (this.particles.length > 0) {
      this.frameId = requestAnimationFrame(this.tick);
    } else {
      this.frameId = 0;
      this.ctx?.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  };

  private step(dt: number): void {
    const floor = window.innerHeight;
    const animate = isMotionEnabled();

    for (const p of this.particles) {
      p.age += dt;
      if (!animate) continue;

      p.vy += GRAVITY * dt;
      const damping = Math.exp(-p.drag * dt);
      p.vx *= damping;
      p.vy *= damping;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;

      const bottom = floor - 6;
      if (p.y > bottom) {
        p.y = bottom;
        if (Math.abs(p.vy) > 60) {
          p.vy *= -0.32;
          p.vx = p.vx * 0.6 + random(-40, 40);
          p.spin *= 0.5;
        } else {
          p.vy = 0;
          p.vx *= 0.8;
          p.spin = 0;
          p.restTime += dt;
        }
      }
    }

    this.particles = this.particles.filter(
      (p) => p.age < p.maxAge && p.restTime < REST_FADE_S && p.x > -80 && p.x < window.innerWidth + 80,
    );
  }

  private draw(): void {
    const { ctx } = this;
    if (!ctx) return;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const p of this.particles) {
      const fadeOut = Math.min(1, (p.maxAge - p.age) / 1, (REST_FADE_S - p.restTime) / REST_FADE_S);
      ctx.globalAlpha = Math.max(0, fadeOut);
      ctx.font = p.font;
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillText(p.char, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}

export const debrisLayer = new DebrisLayer();
