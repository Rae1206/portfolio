/**
 * Counts how much of the page has been broken. Past the threshold (or on a
 * critical hit such as the moon falling) the page is "wrecked": a
 * `page:wrecked` event fires once. The page can keep breaking, but counting
 * stops until it is repaired, so the event never repeats meanwhile.
 */

/** Broken characters that count as a wrecked page. */
export const WRECK_THRESHOLD = 150;
export const WRECKED_EVENT = 'page:wrecked';

let broken = 0;
let wrecked = false;

export const isWrecked = (): boolean => wrecked;

export function recordDamage(count: number, critical = false): void {
  if (wrecked || (count === 0 && !critical)) return;
  broken += count;
  if (broken >= WRECK_THRESHOLD || critical) {
    wrecked = true;
    window.dispatchEvent(new Event(WRECKED_EVENT));
  }
}

export function resetDamage(): void {
  broken = 0;
  wrecked = false;
}
