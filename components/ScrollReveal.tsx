'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const TEXT_SELECTORS = [
  '.display',
  '.h1',
  '.h2',
  '.h3',
  'h1, h2, h3',
  '.eyebrow',
  'p.body',
  '[data-reveal-text]',
];

const BLOCK_SELECTORS = [
  '.property-card',
  '.city-card',
  '.featured-grid > *',
  '.grid-residences > *',
  '.grid-residences-city > *',
  '.city-carousel-grid > *',
  '[data-reveal]',
];

const ALL_SELECTORS = [...TEXT_SELECTORS, ...BLOCK_SELECTORS].join(',');
const TEXT_SELECTOR_STR = TEXT_SELECTORS.join(',');

const GRID_CLASSES = [
  'featured-grid',
  'grid-residences',
  'grid-residences-city',
  'city-carousel-grid',
];

export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    document.body.classList.remove('reveal-safety');

    const initTimer = window.setTimeout(() => {
      const els = Array.from(
        document.querySelectorAll<HTMLElement>(ALL_SELECTORS)
      );
      if (!els.length) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('is-revealed');
              observer.unobserve(e.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
      );

      els.forEach((el) => {
        if (el.dataset.revealInit) return;

        const rect = el.getBoundingClientRect();
        const aboveFold = rect.top < window.innerHeight * 0.95;

        if (aboveFold) {
          el.dataset.revealInit = 'skip';
          return;
        }

        el.dataset.revealInit = '1';
        el.classList.add('reveal-on-scroll');
        if (el.matches(TEXT_SELECTOR_STR)) {
          el.classList.add('reveal-x');
        }

        const parent = el.parentElement;
        if (parent) {
          const hit = GRID_CLASSES.find((c) => parent.classList.contains(c));
          if (hit) {
            const siblings = Array.from(parent.children);
            const idx = siblings.indexOf(el);
            el.style.transitionDelay = `${Math.min(idx * 90, 540)}ms`;
          }
        }

        observer.observe(el);
      });
    }, 60);

    const safety = window.setTimeout(() => {
      document.body.classList.add('reveal-safety');
    }, 1800);

    return () => {
      window.clearTimeout(initTimer);
      window.clearTimeout(safety);
    };
  }, [pathname]);

  return null;
}
