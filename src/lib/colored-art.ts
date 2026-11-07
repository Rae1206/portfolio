/** Multi-color ASCII art: `mask` assigns a tone to each character of `lines`. */
export interface ColoredArt {
  /** Accessible name; the art itself is decorative. */
  label: string;
  lines: readonly string[];
  mask: readonly string[];
}

export const TONES = {
  p: 'purple',
  l: 'lavender',
  g: 'sage',
  b: 'sage-bright',
  d: 'sage-dim',
  a: 'amber',
  u: 'azure',
  w: 'ink',
  k: 'ink-faint',
  m: 'magenta',
  v: 'violet',
  n: 'neon',
} as const;

export type ToneKey = keyof typeof TONES;

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** One art line as HTML: runs of the same tone become `<span data-tone>`. */
export function artLineToHtml(line: string, mask: string): string {
  let html = '';
  let run = '';
  let runTone: string | undefined;
  const flush = () => {
    if (!run) return;
    html += runTone ? `<span data-tone="${runTone}">${escapeHtml(run)}</span>` : escapeHtml(run);
    run = '';
  };
  for (let i = 0; i < line.length; i++) {
    const tone: string | undefined = TONES[mask.charAt(i) as ToneKey];
    if (tone !== runTone) {
      flush();
      runTone = tone;
    }
    run += line.charAt(i);
  }
  flush();
  return html;
}
