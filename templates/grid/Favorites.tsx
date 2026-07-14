'use client';
import './grid.css';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, HeartIcon } from '@/components/icons';
import { useFavorites } from '@/components/FavoritesContext';
import { RESIDENCES } from '@/lib/data';
import { GCard } from './GCard';

/** Grid · Favorites — the saved set rendered in the same dense listing grid as
 *  every other results view, so it reads as a saved *search*, not a scrapbook.
 *  Favourites hydrate from localStorage after mount, so the first client paint
 *  legitimately has none: hold a loading state instead of flashing the empty
 *  panel at someone who has saved residences. */
export default function Favorites() {
  const { ids } = useFavorites();
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  // Ids are user-controlled (localStorage) — never trusted as an index. Filter
  // the known portfolio instead, which drops stale or forged ids on its own.
  const saved = RESIDENCES.filter((r) => ids.includes(r.id));
  const count = saved.length;

  return (
    <main className="page-enter">
      <header className="g-pagehead">
        <div className="g-container">
          <nav className="g-crumb" aria-label="Breadcrumb" style={{ marginBottom: 14 }}>
            <Link href="/">Home</Link>
            <span className="sep" aria-hidden="true">/</span>
            <span className="cur" aria-current="page">Favorites</span>
          </nav>
          <span className="g-label">Saved</span>
          <h1 className="g-page-title">Your shortlist.</h1>
          <p className="g-result-count" style={{ marginTop: 10 }} aria-live="polite">
            {!ready ? (
              'Loading your saved residences…'
            ) : (
              <>
                <b className="g-num">{count}</b> of <b className="g-num">{RESIDENCES.length}</b>{' '}
                {RESIDENCES.length === 1 ? 'residence' : 'residences'} saved
              </>
            )}
          </p>
        </div>
      </header>

      <section className="g-section">
        <div className="g-container">
          {!ready ? (
            <div className="g-empty" aria-busy="true">
              <p>Loading…</p>
              <span>Fetching the residences you saved on this device.</span>
            </div>
          ) : count === 0 ? (
            <div className="g-empty-lg">
              <span className="g-empty-mark" aria-hidden="true">
                <HeartIcon size={22} />
              </span>
              <h2>Nothing saved yet.</h2>
              <p>
                Tap the heart on any residence and it will be kept here on this device —
                ready to compare side by side.
              </p>
              <Link href="/residences" className="btn btn-primary btn-sm">
                Browse residences <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="g-grid">
              {saved.map((r) => (
                <GCard key={r.id} residence={r} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
