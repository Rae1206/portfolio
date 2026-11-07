import { useEffect, useRef } from 'react';
import { AsciiRenderer, type RendererOptions } from '@/lib/ascii/renderer';
import type { AsciiScene } from '@/lib/ascii/types';

export interface AsciiCanvasProps extends RendererOptions {
  /** Builds the scene. May be async so heavy scenes (Three.js) load lazily. */
  createScene: () => AsciiScene | Promise<AsciiScene>;
  className?: string;
}

/**
 * Generic React bridge for any ASCII scene. Decorative by design:
 * hidden from assistive tech and transparent to pointer events.
 */
export function AsciiCanvas({ createScene, className, ...options }: AsciiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const createSceneRef = useRef(createScene);
  const { fontSize, lineHeight, fontFamily, fps, speed } = options;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: AsciiRenderer | undefined;
    let cancelled = false;

    Promise.resolve(createSceneRef.current()).then((scene) => {
      if (cancelled) {
        scene.dispose?.();
        return;
      }
      renderer = new AsciiRenderer(canvas, scene, { fontSize, lineHeight, fontFamily, fps, speed });
      return renderer.mount();
    });

    return () => {
      cancelled = true;
      renderer?.destroy();
    };
  }, [fontSize, lineHeight, fontFamily, fps, speed]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" style={{ pointerEvents: 'none' }} />;
}
