'use client';
import './grid.css';
import { useRouter } from 'next/navigation';
import { SmartImage } from '@/components/SmartImage';
import { FavoriteHeart } from '@/components/FavoriteHeart';
import { bedroomShort, formatPrice, type Residence } from '@/lib/data';

const COMING_SOON = '/assets/coming-soon.png';

/** The Grid listing card. Designed once, reused on Home / Residences / City /
 *  Property. Compact 3:2 media, availability chip, big price numeric, name,
 *  city · neighbourhood, bedroom mix, and a corner FavoriteHeart. The whole
 *  card is a link to the residence detail page. */
export function GCard({ residence: r }: { residence: Residence }) {
  const router = useRouter();
  const to = `/residences/${r.city}/${r.slug}`;
  const live = r.availability === 'available';
  const isPlaceholder = r.heroImage === COMING_SOON;

  return (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        router.push(to);
      }}
      className="g-card"
      aria-label={`${r.name}, ${r.cityLabel} — from ${formatPrice(r.priceFrom)} per month`}
    >
      <div className="g-card-media">
        <SmartImage
          src={r.heroImage}
          alt={r.name}
          fallbackLabel={`${r.name} · exterior`}
          fallbackChar={r.name.charAt(0)}
          style={isPlaceholder ? { objectFit: 'contain', background: '#fff' } : undefined}
        />
        <span className={'g-chip-avail' + (live ? ' live' : '')}>
          {live ? 'Available' : 'Coming soon'}
        </span>
        <div className="g-card-fav">
          <FavoriteHeart id={r.id} size={17} />
        </div>
      </div>

      <div className="g-card-body">
        <div className="g-card-price">
          <span className="g-num">{formatPrice(r.priceFrom)}</span>
          <span className="unit">/mo net</span>
        </div>
        <div className="g-card-name">{r.name}</div>
        <div className="g-card-meta">
          {r.cityLabel}
          {r.neighbourhood ? ` · ${r.neighbourhood}` : ''}
        </div>
        <div className="g-card-beds">{bedroomShort(r.bedroomOptions)}</div>
      </div>
    </a>
  );
}
