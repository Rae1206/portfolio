import type { DebrisPiece } from './types';
import { weightOf } from './weights';

const BROKEN_ATTRIBUTE = 'data-broken';
const FALLBACK_COLOR = '#c3aef0';

interface CaretHit {
  node: Text;
  offset: number;
}

function caretAt(x: number, y: number): CaretHit | null {
  if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(x, y);
    if (position?.offsetNode instanceof Text) return { node: position.offsetNode, offset: position.offset };
    return null;
  }
  // Older WebKit fallback.
  const range = (document as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null })
    .caretRangeFromPoint?.(x, y);
  if (range?.startContainer instanceof Text) return { node: range.startContainer, offset: range.startOffset };
  return null;
}

function rectOfChar(node: Text, offset: number): DOMRect | null {
  if (offset < 0 || offset >= node.data.length) return null;
  const range = document.createRange();
  range.setStart(node, offset);
  range.setEnd(node, offset + 1);
  return range.getBoundingClientRect();
}

const contains = (rect: DOMRect, x: number, y: number) =>
  x >= rect.left - 1 && x <= rect.right + 1 && y >= rect.top - 1 && y <= rect.bottom + 1;

/** The caret sits between characters: the clicked one is either after or before it. */
function charUnder(x: number, y: number): CaretHit | null {
  const caret = caretAt(x, y);
  if (!caret) return null;
  for (const offset of [caret.offset, caret.offset - 1]) {
    const rect = rectOfChar(caret.node, offset);
    if (rect && rect.width > 0 && contains(rect, x, y)) return { node: caret.node, offset };
  }
  return null;
}

function fontOf(style: CSSStyleDeclaration): string {
  return `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
}

function visibleColor(style: CSSStyleDeclaration): string {
  const color = style.color;
  // Gradient text (background-clip: text) reports a transparent color.
  return /rgba\(.*,\s*0\)$/.test(color) || color === 'transparent' ? FALLBACK_COLOR : color;
}

/** Puts every broken character back: unwraps the spans and re-joins the split text. */
export function repairText(): void {
  document.querySelectorAll<HTMLElement>(`[${BROKEN_ATTRIBUTE}]`).forEach((span) => {
    const parent = span.parentNode;
    span.replaceWith(...span.childNodes);
    parent?.normalize();
  });
}

/**
 * Breaks the single character of real page text under the point. The
 * character stays in the DOM, hidden in place, so the rest of the text
 * does not reflow and screen readers still read it.
 */
export function breakTextAt(x: number, y: number, isExcluded: (element: Element) => boolean): DebrisPiece[] {
  const hit = charUnder(x, y);
  if (!hit) return [];

  const { node, offset } = hit;
  const parent = node.parentElement;
  const char = node.data.charAt(offset);
  if (!parent || /\s/.test(char) || isExcluded(parent) || parent.hasAttribute(BROKEN_ATTRIBUTE)) return [];

  const rect = rectOfChar(node, offset)!;
  const style = getComputedStyle(parent);
  const fontSize = parseFloat(style.fontSize) || 16;
  const weightKey =
    parent.closest<HTMLElement>('[data-weight]')?.dataset.weight ?? (parent.closest('h1, h2, h3') ? 'heading' : undefined);

  // Isolate the character in its own span and hide it in place.
  const target = node.splitText(offset);
  target.splitText(1);
  const span = document.createElement('span');
  span.setAttribute(BROKEN_ATTRIBUTE, '');
  // Decorative (aria-hidden) art may paint text through background-clip, so hide it fully there.
  span.style.cssText = parent.closest('[aria-hidden="true"]')
    ? 'visibility:hidden'
    : 'color:transparent;-webkit-text-fill-color:transparent;text-shadow:none';
  target.replaceWith(span);
  span.append(target);

  return [
    {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      char,
      font: fontOf(style),
      color: visibleColor(style),
      mass: weightOf(weightKey, Math.max(0.3, fontSize / 20)),
    },
  ];
}
