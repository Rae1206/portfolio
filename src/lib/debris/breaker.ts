import { recordDamage, resetDamage } from './damage-meter';
import { debrisLayer } from './debris-layer';
import { breakTextAt, repairText } from './dom-text';
import type { BreakableSurface, DebrisPiece } from './types';

/** Controls and live UI that must keep working: never broken. */
const UNBREAKABLE =
  'a, button, input, textarea, select, label, summary, [role="button"], [contenteditable="true"], [data-unbreakable]';

const surfaces = new Set<BreakableSurface>();
let listening = false;

const isExcluded = (element: Element) => element.closest(UNBREAKABLE) !== null;

/** ASCII canvases and other non-text surfaces register here to receive clicks. */
export function registerBreakable(surface: BreakableSurface): () => void {
  surfaces.add(surface);
  listen();
  return () => surfaces.delete(surface);
}

/** Starts handling clicks for DOM text (canvases also start it when they register). */
export function initBreaker(): void {
  listen();
}

/** Restores everything that was broken and re-enables damage. */
export function repairAll(): void {
  repairText();
  surfaces.forEach((surface) => surface.repair());
  debrisLayer.clear();
  resetDamage();
}

function listen(): void {
  if (listening) return;
  listening = true;
  document.addEventListener('click', onClick);
}

/** Surfaces under the point, topmost first (later in the document paints on top). */
function surfacesAt(x: number, y: number): BreakableSurface[] {
  return [...surfaces]
    .filter((surface) => {
      const rect = surface.element.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    })
    .sort((a, b) => (a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? 1 : -1));
}

function onClick(event: MouseEvent): void {
  if (event.button !== 0) return;
  const target = event.target as Element | null;
  if (target && isExcluded(target)) return;
  // A drag that selected text is a selection, not a hit.
  if (window.getSelection()?.toString()) return;

  const { clientX: x, clientY: y } = event;
  let pieces: DebrisPiece[] = breakTextAt(x, y, isExcluded);

  if (pieces.length === 0) {
    for (const surface of surfacesAt(x, y)) {
      pieces = surface.breakAt(x, y);
      if (pieces.length > 0) break;
    }
  }

  debrisLayer.spawn(pieces, { x, y });
  recordDamage(pieces.length, pieces.some((piece) => piece.critical));
}
