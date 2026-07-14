'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from '@/components/icons';
import { DEFAULT_FILTERS } from '@/components/FiltersPanel';
import { CITIES, residencesByCity, type City as CityRecord } from '@/lib/data';
import { applyFilters } from '@/lib/filter';
import { BoutiqueCard } from './BoutiqueCard';
import { Reveal } from './Reveal';
import './boutique.css';

/* Announced-but-not-live market (`comingSoon` in content/cities.json):
   the market's own pitch + register-interest capture, never a listing grid. */
function ComingSoonCity({ city }: { city: CityRecord }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <main className="page-enter">
      <section className="b-city-hero is-soon">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={city.image} alt={city.label} />
        <div className="b-city-hero-overlay" />
        <div className="b-city-hero-inner">
          <p className="b-label gold">Coming soon · {city.province}</p>
          <h1 className="b-city-name">{city.label}</h1>
          <p className="b-city-blurb">{city.blurb}</p>

          {sent ? (
            <p className="b-city-blurb" style={{ color: 'var(--gold-soft)' }}>
              Thank you — we&apos;ll be in touch as homes become available.
            </p>
          ) : (
            <form
              className="b-register"
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) setSent(true);
              }}
            >
              <input
                type="email"
                required
                placeholder="Your email"
                aria-label="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                Register interest <ArrowRight size={14} />
              </button>
            </form>
          )}

          <p className="b-label" style={{ marginTop: 18, opacity: 0.7 }}>
            Register interest only · no listings in this market yet
          </p>
        </div>
      </section>
    </main>
  );
}

export default function City({ params }: { params: { city: string } }) {
  const router = useRouter();
  const city = CITIES[params.city];

  // An unknown slug (a market that was removed in the CMS) returns to the list.
  useEffect(() => {
    if (!city) router.push('/residences');
  }, [city, router]);

  const residences = useMemo(
    () => (city ? applyFilters(residencesByCity(params.city), DEFAULT_FILTERS, '') : []),
    [city, params.city]
  );

  if (!city) {
    return (
      <main className="page-enter">
        <div className="b-notfound">
          <h1 className="b-h2">That market isn&apos;t listed.</h1>
          <button className="btn btn-ghost" onClick={() => router.push('/residences')}>
            View all residences <ArrowRight size={14} />
          </button>
        </div>
      </main>
    );
  }

  if (city.comingSoon) return <ComingSoonCity city={city} />;

  return (
    <main className="page-enter">
      <section className="b-city-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={city.image} alt={city.label} />
        <div className="b-city-hero-overlay" />
        <div className="b-city-hero-inner">
          <p className="b-label gold">{city.province}</p>
          <h1 className="b-city-name">{city.label}</h1>
          <p className="b-city-blurb">{city.blurb}</p>
        </div>
      </section>

      <section className="b-section">
        <div className="b-container">
          <p className="b-count" style={{ marginBottom: 'clamp(32px, 4vw, 56px)' }}>
            {residences.length}{' '}
            {residences.length === 1 ? 'residence' : 'residences'} in {city.label}
          </p>

          {residences.length === 0 ? (
            <div className="b-empty">
              <p className="b-empty-title">No residences are available here just now.</p>
              <button className="btn btn-ghost btn-sm" onClick={() => router.push('/residences')}>
                View the whole portfolio
              </button>
            </div>
          ) : (
            <div className="b-grid">
              {residences.map((r, i) => (
                <Reveal key={r.id} delay={Math.min((i % 4) * 60, 180)}>
                  <BoutiqueCard residence={r} hideCity />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
