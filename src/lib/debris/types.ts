/** One broken-off character, in viewport coordinates (its center). */
export interface DebrisPiece {
  x: number;
  y: number;
  char: string;
  /** CSS font shorthand used to draw it. */
  font: string;
  color: string;
  mass: number;
  /** Detached rather than hit: falls with almost no kick (e.g. a cut stem's top, the moon's last fall). */
  drop?: boolean;
  /** A break so big it wrecks the page on its own (the moon falling). */
  critical?: boolean;
}

/** Something that can be broken at a viewport point (an ASCII canvas, for instance). */
export interface BreakableSurface {
  element: Element;
  breakAt(clientX: number, clientY: number): DebrisPiece[];
  /** Undoes every break on this surface. */
  repair(): void;
}
