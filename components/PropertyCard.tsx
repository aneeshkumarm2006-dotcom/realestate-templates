'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Residence } from '@/lib/data';
import { bedroomShort, formatPrice } from '@/lib/data';
import { Eyebrow } from './Eyebrow';
import { FavoriteHeart } from './FavoriteHeart';
import { PlaceholderImg } from './SmartImage';
import { useTilt } from './useTilt';

type Tone = 'warm' | 'cool' | 'deep' | 'light';
const TONES: Tone[] = ['warm', 'cool', 'deep', 'light'];

interface Props {
  residence: Residence;
  tone?: Tone;
  hideCity?: boolean;
}

export function PropertyCard({ residence, tone, hideCity }: Props) {
  const router = useRouter();
  const tiltRef = useTilt<HTMLAnchorElement>(3.5);
  const [imgErrored, setImgErrored] = useState(false);
  const r = residence;
  const to = `/residences/${r.city}/${r.slug}`;
  const cardTone = tone ?? TONES[(r.id.charCodeAt(2) + r.id.length) % 4];

  return (
    <a
      ref={tiltRef}
      href={to}
      onClick={(e) => {
        e.preventDefault();
        router.push(to);
      }}
      className="property-card"
      aria-label={`${r.name}, ${r.cityLabel}`}
    >
      <div className="image-wrap">
        {r.heroImage && !imgErrored ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.heroImage}
            alt={r.name}
            loading="lazy"
            onError={() => setImgErrored(true)}
            style={r.heroImage === '/assets/coming-soon.png' ? { objectFit: 'contain', background: '#fff' } : undefined}
          />
        ) : (
          <PlaceholderImg label={`${r.name} · exterior`} tone={cardTone}>
            {r.name.charAt(0)}
          </PlaceholderImg>
        )}
        {r.availability === 'coming-soon' && (
          <div
            style={{
              position: 'absolute',
              top: 18,
              right: 18,
              fontFamily: 'var(--sans)',
              fontSize: 10,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--ivory)',
              background: 'rgba(10,25,41,0.65)',
              padding: '6px 10px',
            }}
          >
            Coming soon
          </div>
        )}
      </div>

      <div style={{ paddingTop: 22 }}>
        {!hideCity && <Eyebrow style={{ marginBottom: 8 }}>{r.cityLabel}</Eyebrow>}
        <div className="h3 serif" style={{ marginBottom: 4 }}>{r.name}</div>
        <div className="small muted" style={{ marginBottom: 18 }}>
          {r.address.split(',').slice(0, -1).join(',') || r.address}
        </div>
        <div className="divider" style={{ marginBottom: 16 }} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div className="small" style={{ color: 'var(--ink)' }}>
            {bedroomShort(r.bedroomOptions)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="serif" style={{ fontSize: 18, fontWeight: 500 }}>
              From {formatPrice(r.priceFrom)}
              <span
                className="caption muted"
                style={{ marginLeft: 4, fontFamily: 'var(--sans)' }}
              >
                /mo net
              </span>
            </div>
            <FavoriteHeart id={r.id} size={18} />
          </div>
        </div>
        <div
          className="caption"
          style={{ marginTop: 16, color: 'var(--gold)', letterSpacing: '0.04em' }}
        >
          Book a viewing →
        </div>
      </div>
    </a>
  );
}
