'use client';
import type { Residence } from '@/lib/data';
import { Eyebrow } from './Eyebrow';
import { CloseIcon } from './icons';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Building gallery (hero + gallery). Ignored when `photos` is passed. */
  residence?: Residence;
  /** Explicit photo list — used for the per-unit gallery. */
  photos?: string[];
  /** Optional array of labels corresponding to each photo (e.g., unit types). */
  labels?: (string | undefined)[];
  /** Heading (defaults to residence name). */
  title?: string;
  eyebrow?: string;
  /** Open the enlarged lightbox at the given photo index. */
  onPhotoClick?: (index: number) => void;
}

export function GalleryModal({ open, onClose, residence, photos, labels, title, eyebrow, onPhotoClick }: Props) {
  const allPhotos = photos
    ?? (residence ? [residence.heroImage, ...residence.gallery].filter(Boolean) : []);
  const heading = title ?? residence?.name ?? '';

  return (
    <div
      className={'modal-backdrop' + (open ? ' open' : '')}
      onClick={onClose}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(1100px, 96vw)',
          maxHeight: '90vh',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Sticky header */}
        <div
          style={{
            padding: '28px 36px 20px',
            borderBottom: '1px solid var(--hairline)',
            background: 'var(--bone)',
            position: 'relative',
          }}
        >
          <button
            aria-label="Close"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 18,
              right: 18,
              background: 'transparent',
              border: 0,
            }}
          >
            <CloseIcon size={18} />
          </button>
          <Eyebrow style={{ marginBottom: 6 }}>{eyebrow ?? 'GALLERY'}</Eyebrow>
          <h2 className="h2 serif" style={{ marginBottom: 4, fontSize: 28 }}>
            {heading}
          </h2>
          <div
            className="small muted"
            style={{ fontFamily: 'var(--sans)' }}
          >
            {allPhotos.length} {allPhotos.length === 1 ? 'photo' : 'photos'}
          </div>
        </div>

        {/* Scrollable grid */}
        <div
          style={{
            padding: 16,
            overflowY: 'auto',
            flex: 1,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
            }}
            className="gallery-modal-grid"
          >
            {allPhotos.map((src, i) => (
              <div
                key={`${src}-${i}`}
                onClick={onPhotoClick ? () => onPhotoClick(i) : undefined}
                style={{
                  position: 'relative',
                  aspectRatio: '4 / 3',
                  background: 'var(--cream)',
                  overflow: 'hidden',
                  cursor: onPhotoClick ? 'zoom-in' : undefined,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`${heading} · ${i + 1}`}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {labels && labels[i] && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      background: 'rgba(0,0,0,0.65)',
                      color: '#fff',
                      padding: '4px 8px',
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 4,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontFamily: 'var(--sans)',
                    }}
                  >
                    {labels[i]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
