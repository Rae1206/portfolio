/** Static ASCII sprites. Spaces are transparent when drawn. */

export const CLOUDS = [
  [
    String.raw`          _.--~~--._`,
    String.raw`     .--(          )--.`,
    String.raw`  .-(                  )-.`,
    String.raw` (________________________)`,
  ],
  [
    String.raw`      .-~~-.`,
    String.raw`  .--(      )-._`,
    String.raw` (______________)`,
  ],
  [
    String.raw`        __.--.`,
    String.raw`   _.--(      )--.__`,
    String.raw`  (___________________)`,
  ],
] as const;

export const BUTTERFLY_FRAMES = [
  [String.raw`(\ /)`, String.raw` (o) `, String.raw`(/ \)`],
  [String.raw` \ / `, String.raw`  o  `, String.raw` / \ `],
] as const;

export const CAT_EYES = { asleep: '-.-', awake: 'o.o' } as const;
export const CAT_TAIL_FRAMES = ['~', '-', '~', '_'] as const;

/** Sleeping cat; {eyes} and {tail} are replaced at draw time. */
export const CAT_TEMPLATE = [
  String.raw`   /\_/\       `,
  String.raw`  ( {eyes} )____  `,
  String.raw`   > ^ <    ){tail}`,
  String.raw`  (__)(__)___)  `,
] as const;

export const PETAL_CHARS = ['@', '%', '&', '*', '~', 'o', '°'] as const;
export const STAR_CHARS = ['.', '·', '+', '*'] as const;
export const GRASS_CHARS = [',', "'", '"', '|', 'v', 'w', '`'] as const;
export const SPARKLE_CHARS = ['.', '·', '+', '*'] as const;
