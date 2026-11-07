import { useEffect, useState } from 'react';
import { isMotionEnabled } from '@/lib/motion';

interface TypewriterProps {
  lines: readonly string[];
  /** Milliseconds per character. */
  speed?: number;
  startDelay?: number;
  className?: string;
}

/**
 * Types lines out character by character. The full text is always present
 * for screen readers and no-JS visitors; only the visual layer animates.
 */
export default function Typewriter({ lines, speed = 32, startDelay = 600, className }: TypewriterProps) {
  const fullText = lines.join('\n');
  const [count, setCount] = useState(fullText.length);

  useEffect(() => {
    if (!isMotionEnabled()) return;

    setCount(0);
    let intervalId = 0;
    const timeoutId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        setCount((current) => {
          if (current >= fullText.length) window.clearInterval(intervalId);
          return Math.min(current + 1, fullText.length);
        });
      }, speed);
    }, startDelay);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [fullText, speed, startDelay]);

  const visible = fullText.slice(0, count);
  const done = count >= fullText.length;

  return (
    // React re-renders this text while typing: excluded from the page-breaking effect.
    <p className={className} data-unbreakable>
      <span className="sr-only">{fullText}</span>
      <span aria-hidden="true" style={{ whiteSpace: 'pre-line' }}>
        {visible}
        <span className={done ? 'typewriter-caret is-idle' : 'typewriter-caret'}>|</span>
      </span>
    </p>
  );
}
