import type { DebrisPiece } from './types';
import { WEIGHTS } from './weights';

const BROKEN_ICON_ATTRIBUTE = 'data-broken-icon';
/** Sampling step in CSS pixels: each sample that hits ink becomes one fragment. */
const STEP_PX = 4;

/** True when the shape paints its fill or stroke at the given point (in its own user space). */
function paintsAt(shape: SVGGeometryElement, point: DOMPoint): boolean {
  const style = getComputedStyle(shape);
  if (style.fill !== 'none' && shape.isPointInFill(point)) return true;
  return style.stroke !== 'none' && shape.isPointInStroke(point);
}

/**
 * Shatters an inline SVG icon into text fragments: the icon is sampled on a
 * small grid, every point that hits ink becomes a "#" or "+" piece in the
 * icon's color, and the icon itself is hidden in place (layout is kept).
 */
export function breakIcon(target: Element, isExcluded: (element: Element) => boolean): DebrisPiece[] {
  const svg = target.closest<SVGSVGElement>('svg.icon');
  if (!svg || isExcluded(svg) || svg.hasAttribute(BROKEN_ICON_ATTRIBUTE)) return [];

  const shapes = [...svg.querySelectorAll<SVGGeometryElement>('path, line, polyline, polygon, circle, ellipse, rect')];
  const toUser = svg.getScreenCTM()?.inverse();
  if (!toUser || shapes.length === 0) return [];

  const rect = svg.getBoundingClientRect();
  const color = getComputedStyle(svg).color;
  const font = `700 ${Math.round(STEP_PX * 2)}px "IBM Plex Mono", monospace`;
  const pieces: DebrisPiece[] = [];

  for (let y = rect.top + STEP_PX / 2; y < rect.bottom; y += STEP_PX) {
    for (let x = rect.left + STEP_PX / 2; x < rect.right; x += STEP_PX) {
      const point = new DOMPoint(x, y).matrixTransform(toUser);
      if (!shapes.some((shape) => paintsAt(shape, point))) continue;
      pieces.push({ x, y, char: pieces.length % 3 === 0 ? '+' : '#', font, color, mass: WEIGHTS.icon });
    }
  }

  if (pieces.length > 0) {
    svg.setAttribute(BROKEN_ICON_ATTRIBUTE, '');
    svg.style.visibility = 'hidden';
  }
  return pieces;
}

/** Shows every broken icon again. */
export function repairIcons(): void {
  document.querySelectorAll<SVGSVGElement>(`[${BROKEN_ICON_ATTRIBUTE}]`).forEach((svg) => {
    svg.removeAttribute(BROKEN_ICON_ATTRIBUTE);
    svg.style.visibility = '';
  });
}
