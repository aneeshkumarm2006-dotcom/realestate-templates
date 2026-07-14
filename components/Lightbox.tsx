'use client';
import { useCallback, useEffect, useRef } from 'react';
import { CloseIcon } from './icons';

interface Props {
  open: boolean;
  photos: string[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  /** Building name, used for alt text. */
  label?: string;
  /** Optional array of labels corresponding to each photo (e.g., unit types). */
  labels?: (string | undefined)[];
}

/**
 * Full-screen photo lightbox. Shows one image at a time; navigate with the
 * on-screen arrows, ← / → keys, or a swipe. Esc or a backdrop click closes.
 */
export function Lightbox({ open, photos, index, onIndexChange, onClose, label = '', labels }: Props) {
  const total = photos.length;
  const touchX = useRef<number | null>(null);

  const go = useCallback(
    (dir: number) => {
      if (total < 2) return;
      onIndexChange((index + dir + total) % total);
    },
    [index, total, onIndexChange]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, go, onClose]);

  if (!open || !total) return null;
  const src = photos[index];
  const isComingSoon = src === '/assets/coming-soon.png';

  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-modal="true">
      <button className="lightbox-close" aria-label="Close" onClick={onClose}>
        <CloseIcon size={22} />
      </button>

      {total > 1 && (
        <button
          className="lightbox-nav prev"
          aria-label="Previous photo"
          onClick={(e) => {
            e.stopPropagation();
            go(-1);
          }}
        >
          &#8249;
        </button>
      )}

      <figure
        className="lightbox-stage"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={label ? `${label} · photo ${index + 1}` : `Photo ${index + 1}`}
          style={isComingSoon ? { background: '#fff' } : undefined}
        />
      </figure>

      {total > 1 && (
        <button
          className="lightbox-nav next"
          aria-label="Next photo"
          onClick={(e) => {
            e.stopPropagation();
            go(1);
          }}
        >
          &#8250;
        </button>
      )}

      {total > 1 && (
        <div className="lightbox-counter">
          {labels && labels[index] && (
            <span style={{ 
              marginRight: 16, 
              opacity: 0.9, 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em',
              fontWeight: 600,
              background: 'rgba(0,0,0,0.5)',
              padding: '4px 8px',
              borderRadius: 4,
            }}>
              {labels[index]}
            </span>
          )}
          <span>{index + 1} / {total}</span>
        </div>
      )}
    </div>
  );
}
