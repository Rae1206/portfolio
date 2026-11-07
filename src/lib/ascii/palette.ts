/**
 * Palette indices used by scenes. Actual colors are read from the CSS
 * design tokens at runtime so tokens.css stays the single source of truth.
 */
export const Color = {
  sage: 0,
  sageBright: 1,
  sageDim: 2,
  lavender: 3,
  purple: 4,
  purpleDim: 5,
  ink: 6,
  inkFaint: 7,
  amber: 8,
  fuchsia: 9,
} as const;

export type ColorIndex = (typeof Color)[keyof typeof Color];

const CSS_VARIABLES: Record<ColorIndex, [variable: string, fallback: string]> = {
  0: ['--color-sage', '#52e062'],
  1: ['--color-sage-bright', '#80ff8e'],
  2: ['--color-sage-dim', '#2b8a36'],
  3: ['--color-lavender', '#d6b4ff'],
  4: ['--color-purple', '#b042ff'],
  5: ['--color-purple-dim', '#7b2cbf'],
  6: ['--color-ink', '#f5f2eb'],
  7: ['--color-ink-faint', '#706c62'],
  8: ['--color-amber', '#ffbe3d'],
  9: ['--color-fuchsia', '#ff2aa8'],
};

export const PALETTE_SIZE = Object.keys(CSS_VARIABLES).length;

export function readPalette(element: Element): string[] {
  const styles = getComputedStyle(element);
  return Object.values(CSS_VARIABLES).map(
    ([variable, fallback]) => styles.getPropertyValue(variable).trim() || fallback,
  );
}
