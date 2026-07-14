'use client';
import { useRouter } from 'next/navigation';
import { useFavorites } from '@/components/FavoritesContext';
import { ArrowRight } from '@/components/icons';
import { RESIDENCES } from '@/lib/data';
import { BoutiqueCard } from './BoutiqueCard';
import { Reveal } from './Reveal';
import './boutique.css';

/* Favorites — the saved set, shown in the same spacious grid as the portfolio.
   `ids` come from localStorage via FavoritesContext, so they can name a
   residence that no longer exists; filtering RESIDENCES by id (rather than
   mapping over ids) drops anything stale instead of rendering a hole. */

export default function Favorites() {
  const router = useRouter();
  const { ids } = useFavorites();
  const saved = RESIDENCES.filter((r) => ids.includes(r.id));

  return (
    <main className="page-enter">
      <section className="b-page-hero">
        <div className="b-container">
          <p className="b-label gold">Favorites</p>
          <h1 className="b-page-title">
            Your saved <em>residences.</em>
          </h1>
          <p className="b-count" style={{ marginTop: 26 }}>
            {saved.length === 0
              ? 'Nothing saved yet'
              : `${saved.length} ${saved.length === 1 ? 'residence' : 'residences'} kept for you`}
          </p>
        </div>
      </section>

      <section className="b-section" style={{ paddingTop: 'clamp(2.5rem, 5vw, 4.5rem)' }}>
        <div className="b-container">
          {saved.length === 0 ? (
            <Reveal>
              <div className="b-fav-empty">
                <p className="b-empty-title">
                  Nothing kept yet — the heart on any residence saves it here.
                </p>
                <button
                  type="button"
                  className="b-link"
                  onClick={() => router.push('/residences')}
                >
                  Discover residences
                  <ArrowRight size={15} className="b-arrow" />
                </button>
              </div>
            </Reveal>
          ) : (
            <div className="b-grid">
              {saved.map((r, i) => (
                <Reveal key={r.id} delay={Math.min((i % 4) * 60, 180)}>
                  <BoutiqueCard residence={r} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
