'use client';
import { useRouter } from 'next/navigation';
import { SmartImage } from '@/components/SmartImage';
import { FavoriteHeart } from '@/components/FavoriteHeart';
import { bedroomShort, formatPrice, type Residence } from '@/lib/data';
import './boutique.css';

const COMING_SOON_TILE = '/assets/coming-soon.png';

/* b-card — the Boutique listing card. Large, elegant: a tall 4:5 image then
   generous type beneath. The whole card links to the property; the heart is an
   independent control that stops propagation (mirrors the shared PropertyCard
   pattern). Used on Residences, City, and the Property "other residences" row.

   `hideCity` drops the city label (the City page already establishes context). */
export function BoutiqueCard({
  residence: r,
  hideCity,
}: {
  residence: Residence;
  hideCity?: boolean;
}) {
  const router = useRouter();
  const to = `/residences/${r.city}/${r.slug}`;
  const isTile = r.heroImage === COMING_SOON_TILE;

  const meta = [hideCity ? undefined : r.cityLabel, r.neighbourhood]
    .filter(Boolean)
    .join(' · ');

  return (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        router.push(to);
      }}
      className="b-card"
      aria-label={`${r.name}, ${r.cityLabel}`}
    >
      <div className="b-card-media">
        <SmartImage
          src={r.heroImage}
          alt={r.name}
          fallbackLabel={`${r.name} · exterior`}
          fallbackChar={r.name.charAt(0)}
          style={isTile ? { objectFit: 'contain', background: '#fff' } : undefined}
        />
        {r.availability === 'coming-soon' && (
          <span className="b-card-soon">Coming soon</span>
        )}
      </div>

      <div className="b-card-body">
        {meta && <p className="b-card-meta">{meta}</p>}
        <h3 className="b-card-name">{r.name}</h3>
        <div className="b-card-foot">
          <div>
            <div className="b-card-price">
              {formatPrice(r.priceFrom)}
              <span className="b-card-unit">from · /mo net</span>
            </div>
            <div className="b-card-beds">{bedroomShort(r.bedroomOptions)}</div>
          </div>
          <FavoriteHeart id={r.id} size={18} />
        </div>
      </div>
    </a>
  );
}
