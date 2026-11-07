import budSvg from '@/assets/flowers/bud.svg?raw';
import lilySvg from '@/assets/flowers/lily.svg?raw';
import tulipSvg from '@/assets/flowers/tulip.svg?raw';
import { Color, type ColorIndex } from './palette';

export type FlowerKind = 'lily' | 'tulip' | 'bud';

export interface FlowerLayer {
  path: Path2D;
  color: ColorIndex;
  /** Stroke width in art units; fill when undefined. */
  stroke?: number;
}

export type FlowerArt = FlowerLayer[];

const SOURCES: Record<FlowerKind, string> = {
  lily: lilySvg,
  tulip: tulipSvg,
  bud: budSvg,
};

/** Art is authored so that 100 units equal the bloom diameter. */
export const FLOWER_ART_SIZE = 100;

const cache = new Map<FlowerKind, FlowerArt>();

/** Parsed flower art, cached. Client-only (uses DOMParser and Path2D). */
export function getFlowerArt(kind: FlowerKind): FlowerArt {
  let art = cache.get(kind);
  if (!art) {
    art = parseFlowerSvg(SOURCES[kind]);
    cache.set(kind, art);
  }
  return art;
}

/**
 * Turns an SVG document into drawable layers. Supports <path>, <circle> and
 * <ellipse> with `transform` (translate / rotate / scale) and the
 * `data-color` / `data-stroke` attributes.
 */
export function parseFlowerSvg(source: string): FlowerArt {
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  const layers: FlowerArt = [];

  doc.querySelectorAll('path, circle, ellipse').forEach((element) => {
    const shape = toPath(element);
    const colorKey = element.getAttribute('data-color') ?? 'purple';
    const color = (Color as Record<string, ColorIndex>)[colorKey];
    if (!shape || color === undefined) return;

    const path = new Path2D();
    path.addPath(shape, parseTransform(element.getAttribute('transform') ?? ''));
    const stroke = element.getAttribute('data-stroke');
    layers.push({ path, color, ...(stroke && { stroke: Number(stroke) }) });
  });

  return layers;
}

function toPath(element: Element): Path2D | null {
  const number = (name: string) => Number(element.getAttribute(name) ?? 0);
  switch (element.tagName.toLowerCase()) {
    case 'path': {
      const d = element.getAttribute('d');
      return d ? new Path2D(d) : null;
    }
    case 'circle': {
      const path = new Path2D();
      path.arc(number('cx'), number('cy'), number('r'), 0, Math.PI * 2);
      return path;
    }
    case 'ellipse': {
      const path = new Path2D();
      path.ellipse(number('cx'), number('cy'), number('rx'), number('ry'), 0, 0, Math.PI * 2);
      return path;
    }
    default:
      return null;
  }
}

/** Minimal SVG transform parser: translate, rotate (degrees, optional center) and scale. */
export function parseTransform(value: string): DOMMatrix {
  const matrix = new DOMMatrix();
  for (const [, name, rawArgs] of value.matchAll(/(\w+)\(([^)]*)\)/g)) {
    const args = (rawArgs ?? '').split(/[\s,]+/).filter(Boolean).map(Number);
    const [a = 0, b, c] = args;
    switch (name) {
      case 'translate':
        matrix.translateSelf(a, b ?? 0);
        break;
      case 'rotate':
        if (b !== undefined && c !== undefined) matrix.translateSelf(b, c).rotateSelf(a).translateSelf(-b, -c);
        else matrix.rotateSelf(a);
        break;
      case 'scale':
        matrix.scaleSelf(a, b ?? a);
        break;
    }
  }
  return matrix;
}
