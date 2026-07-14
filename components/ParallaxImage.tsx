'use client';
import { useEffect, useRef, type CSSProperties } from 'react';

interface ParallaxImageProps {
  src: string;
  alt: string;
  kenBurns?: boolean;
  speed?: number;
  eager?: boolean;
  className?: string;
  style?: CSSProperties;
  objectPosition?: string;
}

export function ParallaxImage({
  src,
  alt,
  kenBurns = false,
  speed = 0.18,
  eager = false,
  className,
  style,
  objectPosition,
}: ParallaxImageProps) {
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    let rafId = 0;
    let ticking = false;

    const update = () => {
      const rect = frame.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.bottom < 0 || rect.top > vh) {
        ticking = false;
        return;
      }
      const progress =
        (vh - rect.top) / (vh + rect.height); // 0 entering → 1 exiting
      const px = (progress - 0.5) * 2 * (rect.height * speed);
      frame.style.setProperty('--py', `${px.toFixed(1)}px`);
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      rafId = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [speed]);

  return (
    <div
      ref={frameRef}
      className={`parallax-frame ${className ?? ''}`}
      style={style}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        className={`parallax-img${kenBurns ? ' ken-burns-soft' : ''}`}
        style={objectPosition ? { objectPosition } : undefined}
      />
    </div>
  );
}
