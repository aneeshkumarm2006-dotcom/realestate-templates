'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';

/* Scroll progress through a pinned section, as 0 → 1.
 *
 * Two outputs, deliberately:
 *   - progress (a REF)  — read every frame by the 3D render loop. A ref, not
 *     state, because updating state on every scroll pixel would re-render the
 *     React tree 60×/sec and stutter the canvas.
 *   - step (STATE)      — a coarse index for the text overlay. Only changes a
 *     handful of times across the whole scroll, so re-rendering on it is free.
 *
 * The listener is passive and rAF-coalesced, so scrolling stays smooth.
 */
export function useScrollProgress(
  ref: RefObject<HTMLElement>,
  stepBoundaries: number[]
): { progress: RefObject<number>; step: number } {
  const progress = useRef(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      // Distance we can travel while the sticky child is pinned.
      const travel = el.offsetHeight - window.innerHeight;
      const p = travel <= 0 ? 0 : Math.min(1, Math.max(0, -rect.top / travel));
      progress.current = p;

      // stepBoundaries = the p at which each step BEGINS (ascending).
      let next = 0;
      for (let i = 0; i < stepBoundaries.length; i++) {
        if (p >= stepBoundaries[i]) next = i;
      }
      setStep((prev) => (prev === next ? prev : next));
    };

    const onScroll = () => {
      if (frame) return; // coalesce: at most one measure per animation frame
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [ref, stepBoundaries]);

  return { progress, step };
}

/** True when the visitor has asked for less motion. The hero must then render
 *  as a still — no pinning, no scroll-jacking, no 3D. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}
