/** Small static ASCII illustrations used as decorative thumbnails. */
export const asciiArt = {
  sprout: String.raw`
     \ | /
    -- @ --
     / | \
       |  _
    \_ | / )
      \|/_/
    .-----.
    \     /
     '---'`,
  moon: String.raw`
  *     _.._    .
      .' .-'${'`'}   +
     /  /      .
     |  |    *
     \  '.___.;
  .   '._  _.'
         ${'``'}   +`,
  tulips: String.raw`
   (@)   (@)
    \|   |/
     \  /|  (@)
      \/ | /
       | |/
     __|_|__
    [_______]`,
  butterfly: String.raw`
    .-.   .-.
   (   \ /   )
    \   o   /
   (   / \   )
    '-'   '-'
       ~ ~`,
} as const;

export type AsciiArtName = keyof typeof asciiArt;

export const asciiArtNames = Object.keys(asciiArt) as AsciiArtName[];
