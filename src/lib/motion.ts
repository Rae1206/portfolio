/**
 * Site-wide motion preference. Defaults to the OS `prefers-reduced-motion`
 * setting and can be overridden by the visitor (stored in localStorage).
 * The resolved value lives on <html data-motion="on|off"> so CSS and JS agree.
 */

export const MOTION_STORAGE_KEY = 'motion';
const MOTION_EVENT = 'motionchange';

export function isMotionEnabled(): boolean {
  return document.documentElement.dataset.motion !== 'off';
}

export function setMotionEnabled(enabled: boolean): void {
  document.documentElement.dataset.motion = enabled ? 'on' : 'off';
  try {
    localStorage.setItem(MOTION_STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // Storage can be unavailable (private mode); the choice still applies to this page view.
  }
  window.dispatchEvent(new Event(MOTION_EVENT));
}

export function onMotionChange(callback: (enabled: boolean) => void): () => void {
  const listener = () => callback(isMotionEnabled());
  window.addEventListener(MOTION_EVENT, listener);
  return () => window.removeEventListener(MOTION_EVENT, listener);
}
