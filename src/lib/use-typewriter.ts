import { useEffect, useState } from 'react';

/** Time between two steps of the typing. */
export const TYPEWRITER_TICK_MS = 25;
/** Each step types this share of what is left (at least one character), so any text ends fast. */
const STEP_SHARE = 1 / 12;

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Types `text` out a few characters at a time when `animate` is true on the first render, and
 * keeps up as `text` grows. Typing goes on to the end when `animate` turns false later (the
 * streamed reply is replaced by the saved one). Without `animate`, or with reduced motion, the
 * whole text is shown at once. `done` is true once all of it is shown.
 */
export function useTypewriter(text: string, animate: boolean): { text: string; done: boolean } {
  const [typing] = useState(() => animate && !prefersReducedMotion());
  const [shown, setShown] = useState(0);
  const length = typing ? Math.min(shown, text.length) : text.length;

  useEffect(() => {
    if (!typing || shown >= text.length) return;
    const timer = setTimeout(
      () => setShown((n) => n + Math.max(1, Math.ceil((text.length - n) * STEP_SHARE))),
      TYPEWRITER_TICK_MS,
    );
    return () => clearTimeout(timer);
  }, [typing, shown, text.length]);

  return { text: text.slice(0, length), done: length >= text.length };
}
