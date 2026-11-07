import type { ColoredArt } from '@/lib/colored-art';

/**
 * Sidebar emblem, first frame: the initials "AAAT" drawn as green stems,
 * each crowned by a flower. `mask` mirrors `lines` character by character:
 * p purple · l lavender · g sage · b bright sage · d dim sage · space = none.
 */
export const monogram: ColoredArt = {
  label: 'AAAT',
  lines: [
    String.raw`  .@.     (@)     *@*          `,
    String.raw`  \|/     \|/     \|/     .@.  `,
    String.raw`   |       |       |      \|/  `,
    String.raw`   ^       ^       ^    @--+--@`,
    String.raw`  / \     / \     / \      |   `,
    String.raw` /-~-\   /-~-\   /-~-\     |~  `,
    String.raw`/     \ /     \ /     \    |   `,
    String.raw`.,_.${'`'},._,.${'`'}._,._.,${'`'}._.,_.${'`'},._.,`,
  ],
  mask: [
    '  lpl     lpl     lpl          ',
    '  lgl     lgl     lgl     lpl  ',
    '   g       g       g      lgl  ',
    '   g       g       g    pgggggp',
    '  g g     g g     g g      g   ',
    ' gdbdg   gdbdg   gdbdg     gb  ',
    'g     g g     g g     g    g   ',
    'ddddddddddddddddddddddddddddddd',
  ],
};

/** Sidebar emblem, final frame: the initials gather into this single flower. */
export const monogramFlower: ColoredArt = {
  label: 'AAAT',
  lines: [
    String.raw`      _ _      `,
    String.raw`    _( | )_    `,
    String.raw`   (_ (@) _)   `,
    String.raw`     (_|_)     `,
    String.raw`       |       `,
    String.raw`   \_  |  _/   `,
    String.raw`     \_|_/     `,
    String.raw`.,_.,_.|._,._,.`,
  ],
  mask: [
    '      l l      ',
    '    ll p ll    ',
    '   ll lpl ll   ',
    '     llgll     ',
    '       g       ',
    '   bb  g  bb   ',
    '     bbgbb     ',
    'dddddddgddddddd',
  ],
};
