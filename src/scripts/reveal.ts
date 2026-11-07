/**
 * Scroll-driven transforms:
 * - [data-reveal] gets `.is-visible` once it enters the viewport.
 * - [data-scramble] decodes its text from random glyphs when revealed.
 */

import { isMotionEnabled } from '@/lib/motion';

const GLYPHS = '!<>-_\\/[]{}=+*^?#@%&~';

function scramble(element: HTMLElement): void {
  const finalText = element.dataset.text ?? element.textContent ?? '';
  element.dataset.text = finalText;
  element.setAttribute('aria-label', finalText);

  const duration = 900;
  const start = performance.now();

  const frame = (now: number) => {
    const progress = Math.min(1, (now - start) / duration);
    const revealed = Math.floor(progress * finalText.length);
    let output = '';
    for (let i = 0; i < finalText.length; i++) {
      const char = finalText.charAt(i);
      output += i < revealed || char === ' ' ? char : GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
    }
    element.textContent = output;
    if (progress < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

export function initReveal(): void {
  const targets = document.querySelectorAll<HTMLElement>('[data-reveal]');

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        element.classList.add('is-visible');
        if (element.hasAttribute('data-scramble') && isMotionEnabled()) scramble(element);
        observer.unobserve(element);
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
  );

  targets.forEach((target) => observer.observe(target));
}
