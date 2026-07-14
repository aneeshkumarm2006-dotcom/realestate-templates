'use client';
import { useEffect, useRef, type RefObject } from 'react';

export function useTilt<T extends HTMLElement>(max = 4): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof window.matchMedia === 'function' &&
      !window.matchMedia('(hover: hover) and (pointer: fine)').matches
    ) {
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let rafId = 0;

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        el.style.setProperty('--tilt-y', `${(px * max).toFixed(2)}deg`);
        el.style.setProperty('--tilt-x', `${(-py * max).toFixed(2)}deg`);
        el.classList.add('is-tilting');
      });
    };

    const onLeave = () => {
      cancelAnimationFrame(rafId);
      el.style.setProperty('--tilt-y', '0deg');
      el.style.setProperty('--tilt-x', '0deg');
      el.classList.remove('is-tilting');
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(rafId);
    };
  }, [max]);

  return ref;
}
