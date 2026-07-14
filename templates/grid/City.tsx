'use client';
import './grid.css';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { DEFAULT_FILTERS, type Filters } from '@/components/FiltersPanel';
import { ArrowRight } from '@/components/icons';
import { applyFilters } from '@/lib/filter';
import { getCity, residencesByCity, type City as CityType } from '@/lib/data';
import { PAGES } from '@/lib/pages';
import { SearchBody } from './SearchBody';

const COMING_SOON = '/assets/coming-soon.png';

/** Announced-but-not-live market: register-interest capture, no listings. */
function ComingSoonCity({ city }: { city: CityType }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const usePlaceholder = !city.image || city.image === COMING_SOON;

  return (
    <main className="page-enter">
      <section className="g-soon-page">
        {!usePlaceholder && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={city.image} alt={city.label} />
        )}
        <div className="g-city-scrim" style={{ position: 'absolute', inset: 0 }} />
        <div className="g-soon-inner">
          <div style={{ maxWidth: 620 }}>
            <span className="g-label gold">Coming soon · {city.province}</span>
            <h1 className="h1" style={{ color: 'var(--ivory)', margin: '10px 0 14px' }}>
              {city.label}
            </h1>
            <p style={{ color: 'color-mix(in srgb, var(--ivory) 82%, transparent)', fontSize: 16, maxWidth: 540, margin: 0 }}>
              {city.blurb}
            </p>

            {sent ? (
              <p className="g-label gold" style={{ marginTop: 22, fontSize: 14 }}>
                Thank you — we&apos;ll be in touch as homes become available.
              </p>
            ) : (
              <form
                className="g-soon-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (email.trim()) setSent(true);
                }}
              >
                <input
                  type="email"
                  required
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label="Your email"
                />
                <button type="submit" className="btn btn-primary btn-sm">
                  Register interest <ArrowRight size={14} />
                </button>
              </form>
            )}
            <p style={{ color: 'color-mix(in srgb, var(--ivory) 60%, transparent)', fontSize: 12.5, marginTop: 14 }}>
              Register interest only · no listings in this market yet
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function City({ params }: { params: { city: string } }) {
  const city = getCity(params.city);

  const all = useMemo(
    () => (city && !city.comingSoon ? residencesByCity(params.city) : []),
    [city, params.city]
  );

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => applyFilters(all, filters, query), [all, filters, query]);

  // Unknown market — graceful not-found rather than a silent redirect.
  if (!city) {
    return (
      <main className="page-enter">
        <div className="g-container" style={{ padding: '80px 0', textAlign: 'center' }}>
          <span className="g-label">Market not found</span>
          <h1 className="h1" style={{ margin: '10px 0 14px' }}>
            We don&apos;t have this market yet
          </h1>
          <p className="g-result-count" style={{ marginBottom: 20 }}>
            The city you&apos;re looking for isn&apos;t part of the portfolio.
          </p>
          <Link href="/residences" className="btn btn-primary btn-sm">
            Browse all residences <ArrowRight size={14} />
          </Link>
        </div>
      </main>
    );
  }

  if (city.comingSoon) return <ComingSoonCity city={city} />;

  const usePlaceholder = !city.image || city.image === COMING_SOON;
  const clearAll = () => {
    setFilters(DEFAULT_FILTERS);
    setQuery('');
  };

  return (
    <main className="page-enter">
      <section className="g-city-band">
        {!usePlaceholder && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={city.image} alt={city.label} />
        )}
        <div className="g-city-scrim" style={{ position: 'absolute', inset: 0 }} />
        <div className="g-city-band-inner">
          <div className="g-crumb" style={{ color: 'color-mix(in srgb, var(--ivory) 70%, transparent)', marginBottom: 8 }}>
            <a href="/" style={{ color: 'inherit' }}>Home</a>
            <span className="sep">/</span>
            <a href="/residences" style={{ color: 'inherit' }}>Residences</a>
            <span className="sep">/</span>
            <span style={{ color: 'var(--ivory)' }}>{city.label}</span>
          </div>
          <span className="g-label" style={{ color: 'color-mix(in srgb, var(--ivory) 78%, transparent)' }}>
            {city.province}
          </span>
          <h1>{city.label}</h1>
          <p>{city.blurb}</p>
          <p style={{ color: 'color-mix(in srgb, var(--ivory) 66%, transparent)', fontSize: 13, marginTop: 8 }}>
            {all.length} {all.length === 1 ? 'residence' : 'residences'}
            {all.length !== filtered.length ? ` · ${filtered.length} shown` : ''}
          </p>
        </div>
      </section>

      {all.length === 0 ? (
        <div className="g-container" style={{ padding: '48px 0' }}>
          <div className="g-empty">
            <p>No residences listed in {city.label} yet.</p>
            <span>Check back soon, or explore other markets.</span>
            <div style={{ marginTop: 18 }}>
              <Link href="/residences" className="btn btn-ghost btn-sm">
                All residences
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <SearchBody
          filters={filters}
          setFilters={setFilters}
          query={query}
          setQuery={setQuery}
          filtered={filtered}
          total={all.length}
          onClear={clearAll}
        />
      )}
    </main>
  );
}
