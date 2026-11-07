/**
 * Hand-drawn ASCII flower heads for small plants, where rasterized vector
 * art turns into mush. Each species has three bloom frames (bud, half, open).
 *
 * Frames sit on top of the stem: the bottom row's center column touches the
 * stem tip. `mask` mirrors `lines` character by character:
 * p purple · l lavender · a amber · g sage · b bright sage · space = none.
 */

export interface SpriteFrame {
  lines: readonly string[];
  mask: readonly string[];
}

export type SpriteSpecies = 'daisy' | 'tulip' | 'star' | 'rose' | 'sprig';

export const SPRITE_SPECIES: readonly SpriteSpecies[] = ['daisy', 'tulip', 'star', 'rose', 'sprig'];

const BUD: SpriteFrame = { lines: ['o'], mask: ['p'] };

export const FLOWER_SPRITES: Record<SpriteSpecies, readonly [SpriteFrame, SpriteFrame, SpriteFrame]> = {
  daisy: [
    BUD,
    { lines: ['(o)'], mask: ['lal'] },
    {
      lines: [String.raw` .:. `, String.raw`:(@):`, String.raw` ':' `],
      mask: [' lll ', 'llall', ' lll '],
    },
  ],
  tulip: [
    BUD,
    { lines: ['(|)'], mask: ['pfp'] },
    {
      lines: [String.raw` _ _ `, String.raw`( V )`, String.raw` \_/ `],
      mask: [' p p ', 'p f p', ' ppp '],
    },
  ],
  star: [
    BUD,
    { lines: ['-*-'], mask: ['lfl'] },
    {
      // The trailing backslash is concatenated: inside String.raw it would escape the closing backtick.
      lines: [String.raw`\ | /`, String.raw`--*--`, String.raw`/ | ` + '\\'],
      mask: ['l p l', 'lpffl', 'l p l'],
    },
  ],
  rose: [
    BUD,
    { lines: ['(@)'], mask: ['pfp'] },
    {
      lines: [String.raw` .-. `, String.raw`(@@@)`, String.raw` '-' `],
      mask: [' lfl ', 'pfafp', ' lfl '],
    },
  ],
  sprig: [
    BUD,
    { lines: [':', '*'], mask: ['l', 'f'] },
    {
      lines: [String.raw` * `, String.raw`:*:`, String.raw`:*:`, String.raw` * `],
      mask: [' f ', 'lpl', 'lfl', ' p '],
    },
  ],
};
