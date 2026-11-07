import type { ColoredArt } from '@/lib/colored-art';

/**
 * Capri, the wreck mascot. Converted from the owner's own ASCII drawing:
 * the image was sampled into a 64 x 25 character grid, keeping its glyph
 * density (# + .) and its colors (m magenta, v violet, n neon green,
 * u azure, w white). Black areas of the drawing are empty cells.
 */
export const mascot: ColoredArt = {
  label: 'Capri, a spiky creature with a green mask, big blue eyes and a toothy grin',
  lines: [
    '+##+##+##+###+##+######+#+#######+#######+####+####++##+##+####+',
    '###+#####+###############################+######+  +########+. +',
    '+########+##################.################+    +####++     ##',
    '+##+#####+###+##+#########+  ####+########+     ++.         +###',
    '+############+##+#######+    +###+#######      +.       ...####.',
    '+##+##+##+##++##+################+####.#######.          .##+###',
    '+##+##+##+###+##+###+ .+##.###.#####.+#++.   #+    .   #########',
    '+########+###+####+ ++.++.#+########+#.++.#+ #+     .########+++',
    '+################+ +# #.+# #+####+#+# ###+ # #+   .##++. ++#####',
    '+##+.####+####++##+.# ###+.# ##+### #++## #+##.    .++##########',
    '##+ #####+###   ####.#++++#  ######  ++++##+##.###########+##+.+',
    '#+  ##+#######+ .#############################+##+########+. +##',
    '   +##+##########.....        +++..+.+.     .########+#+.  .###+',
    ' .+###+####   #####.     .##########+.    +##########.    #####+',
    '++.######+ .+###+#####.    .+######.   +#+#+#######     .#####.#',
    '  ######.++#+.+.     +###+    ..+   +#+.   .####.      +########',
    '  ####+ .        .    #+  +. ..  .#+      ++#+  . .   ########.#',
    '  ###.         . ..  .#     +# .+.      .++.   ..   .######+ +##',
    ' ###   .      ..     +     .#           .   .. .   +#####   ###+',
    '.##+.        .+# ..             .         . ..    +###+   .####+',
    '++     +#########+.       .++#+    . ###+   ..   +##     +######',
    '      .############.      +###+     +####+      .+      .###..',
    ' .    .#############  +##+.##+++.  +#####+   .  . .   ++###+  ..',
    '      .##############   ++++#+    .######+   . ..  ..++++++  ...',
    '       ##############+      ##.+. #######+              .. . ..',
  ],
  mask: [
    'mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm',
    'mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm  mmmmmmmmmmm m',
    'mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm    mmmmmmm     mm',
    'mmmmmmmmmmmmmmmmmmmmmmmmmmm  mmmmmmmmmmmmmm     mmm         mmmm',
    'mmmmmmmmmmmmmmmmmmmmmmmmm    mmmmmmmmmmmm      mm       vvmmmmmw',
    'mmmmmmmmmmmmmmmmmmmmmmnnnnnnnnmmmmmmmmnnnnnnnnn          mmmmmmm',
    'mmmmmmmmmmmmmmmmmmmmm nnnnnnnnnmmmmmnnnnnn   nn    v   mmmmmmmmm',
    'mmmmmmmmmmmmmmmmmmm nnnuunnnnnnmmmmnnnuuunnn nn     mmmmmmmmmmmm',
    'mmmmmmmmmmmmmmmmnn nn uwwu nnnnmmnnnn uwuu n nn   mmmmmm mmmmmmm',
    'mmmmmmmmmmmmmmmnnnnnn uuuunn nnnnnn nnuuu nnnnn    mmmmmmmmmmmvv',
    'mmm mmmmmmmmm   nnnnnnnnnnn  nnnnnn  nnnnnnnnnmmmmmmmmmmmmmvvvvm',
    'mm  mmmmmmmmmmm nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnmmmmmmmmmmvvvv mmm',
    '   mmmmmmmmmmmmmmmnnnn        wwwwwwwww     mmmmmmmmmvvvv  mmmmm',
    ' vvmmmmmmvv   mmmmmm     wwwwwwwwwwwww    mmmmmmmmmvvv    mmmmmm',
    'vvmmmmmmvv mmmmmvmmmmmm    wwwwwwwww   vvvvvvmmmmvv     mmmmmmwm',
    '  mmmmmvvvmvmmvv     mmmmm    www   vvvv   mmmvvv      mmmmmmmmv',
    '  mmmvv v        v    mm  mm vv  vvv      mmvv  v v   mmmmmmvvmm',
    '  mmvv         m vm  mm     vv vvv      vvvv   vv   mmmmmvvv mmm',
    ' mmv   m      mv     m     vv           v   vm v   mmmmvv   mmmm',
    'mmmmv        nnn vv             v         m vv    mmvvv   mmmmmm',
    'mv     nnnnnnnnnnnn       mmmmm    m mmmm   vm   mmv     mmmmmmm',
    '      nnnnnnnnnnnnnn      mmmmm     mmmmvv      vv      mmmvmm',
    ' m    nnnnnnnnnnnnnn  nnnnnmmmmmm  mmmmmvv   v  m m   mmmmvv  vm',
    '      nnnnnnnnnnnnnnn   nnnmmm    mmmmmmvv   v vm  vmmvvvvv  vmm',
    '       nnnnnnnnnnnnnnn      mmmmm mmmmmmvv              vv v vv',
  ],
};

/** A row replaced to animate the mascot. */
export interface FrameRow {
  row: number;
  line: string;
  mask: string;
}

/** Eyes closed: eye cells go dark, the middle eye row becomes a green lid. */
export const mascotBlink: FrameRow[] = [
  {
    row: 7,
    line: '+########+###+####+ ++.  .#+########+#   .#+ #+     .########+++',
    mask: 'mmmmmmmmmmmmmmmmmmm nnn  nnnnnnmmmmnnn   nnn nn     mmmmmmmmmmmm',
  },
  {
    row: 8,
    line: '+################+ +# ---- #+####+#+# ---- # #+   .##++. ++#####',
    mask: 'mmmmmmmmmmmmmmmmnn nn nnnn nnnnmmnnnn nnnn n nn   mmmmmm mmmmmmm',
  },
  {
    row: 9,
    line: '+##+.####+####++##+.#     .# ##+### #+    #+##.    .++##########',
    mask: 'mmmmmmmmmmmmmmmnnnnnn     nn nnnnnn nn    nnnnn    mmmmmmmmmmmvv',
  },
];

/** Mouth open while talking: the middle row of teeth opens up. */
export const mascotTalk: FrameRow[] = [
  {
    row: 14,
    line: '++.######+ .+###+#####.                +#+#+#######     .#####.#',
    mask: 'vvmmmmmmvv mmmmmvmmmmmm                vvvvvvmmmmvv     mmmmmmwm',
  },
];

/** What the mascot says (English by request). */
export const mascotScript = {
  name: 'Capri',
  message: "What a mess... but it doesn't matter, everything can be fixed.",
  question: 'Another chance?',
  yes: 'Yes',
  no: 'No',
  /** Shown each time the No button escapes. */
  quips: ['nope', 'almost!', 'too slow', 'not today', 'nice try', 'missed me', 'keep dreaming'],
  farewell: 'Good as new.',
};

export type MascotScript = typeof mascotScript;
