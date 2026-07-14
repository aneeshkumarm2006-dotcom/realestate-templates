'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiltersPanel, DEFAULT_FILTERS, type Filters } from '@/components/FiltersPanel';
import { SortDropdown } from '@/components/SortDropdown';
import { PropertyCard } from '@/components/PropertyCard';
import { MapView } from '@/components/MapViewClient';
import { Eyebrow } from '@/components/Eyebrow';
import { SlidersIcon, ArrowRight } from '@/components/icons';
import { CITIES, residencesByCity, type City, type CitySlug } from '@/lib/data';
import { applyFilters } from '@/lib/filter';

/* Announced-but-not-live market (`comingSoon` in content/cities.json):
   register-interest email capture instead of a listing grid. */
function ComingSoonCity({ city }: { city: City }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <main className="page-enter">
      <section
        style={{
          position: 'relative',
          minHeight: 'calc(100vh - var(--header-h))',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={city.image}
          alt={city.label}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', filter: 'grayscale(0.4)',
          }}
        />
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(10,25,41,0.62), rgba(10,25,41,0.80))',
          }}
        />
        <div className="container" style={{ position: 'relative', color: 'var(--ivory)' }}>
          <div style={{ maxWidth: 640 }}>
            <Eyebrow color="gold" style={{ marginBottom: 24 }}>
              COMING SOON · {city.province}
            </Eyebrow>
            <h1 className="display" style={{ color: 'var(--ivory)', marginBottom: 24 }}>
              {city.label}.
            </h1>
            {/* The market's own pitch, from its record in content/cities.json. */}
            <p
              className="body"
              style={{ color: 'rgba(247,243,236,0.88)', fontSize: 18, maxWidth: 540, marginBottom: 28 }}
            >
              {city.blurb}
            </p>

            {sent ? (
              <p className="serif" style={{ color: 'var(--gold)', fontSize: 20 }}>
                Thank you, we&apos;ll be in touch as homes become available.
              </p>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); if (email.trim()) setSent(true); }}
                style={{
                  display: 'flex', gap: 8, maxWidth: 460, flexWrap: 'wrap',
                  background: 'var(--ivory)', padding: 8, border: '1px solid var(--hairline)',
                }}
              >
                <input
                  type="email"
                  required
                  className="input"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ border: 0, flex: 1, minWidth: 200, padding: '12px 16px', color: 'var(--ink)' }}
                />
                <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  Register interest <ArrowRight size={14} />
                </button>
              </form>
            )}
            <p className="small" style={{ color: 'rgba(247,243,236,0.55)', marginTop: 16 }}>
              Register interest only · no listings in this market yet
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function CityListingPage({
  params,
}: {
  params: { city: string };
}) {
  const router = useRouter();
  const city = CITIES[params.city as CitySlug];
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const all = useMemo(
    () => (city ? residencesByCity(params.city) : []),
    [city, params.city]
  );
  const filtered = useMemo(
    () => applyFilters(all, filters, ''),
    [filters, all]
  );

  useEffect(() => {
    if (!city) router.push('/residences');
  }, [city, router]);

  if (!city) return null;

  // Announced-but-not-live markets: register-interest, not listings.
  if (city.comingSoon) return <ComingSoonCity city={city} />;

  return (
    <main className="page-enter">
      <FiltersPanel
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        setFilters={setFilters}
        onApply={() => setFiltersOpen(false)}
        onClear={() => setFilters(DEFAULT_FILTERS)}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 480px',
        }}
        className="residences-layout"
      >
        <div style={{ padding: 'clamp(28px, 4vw, 56px) clamp(20px, 5vw, 64px)' }}>
          <div className="breadcrumb" style={{ marginBottom: 24 }}>
            <a className="text-link" onClick={() => router.push('/')}>Home</a>
            <span className="sep">/</span>
            <a className="text-link" onClick={() => router.push('/residences')}>
              Residences
            </a>
            <span className="sep">/</span>
            <span>{city.label}</span>
          </div>
          <Eyebrow style={{ marginBottom: 16 }}>{city.province}</Eyebrow>
          <h1 className="h1 serif" style={{ marginBottom: 14 }}>
            {city.label}.
          </h1>
          <p
            className="body muted"
            style={{ maxWidth: 560, marginBottom: 16, fontSize: 17 }}
          >
            {city.blurb}
          </p>
          <p className="small muted" style={{ marginBottom: 36 }}>
            {filtered.length} {filtered.length === 1 ? 'residence' : 'residences'} available
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 36,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setFiltersOpen(true)}
              style={{ borderColor: 'var(--hairline-strong)' }}
            >
              <SlidersIcon size={14} /> Show filters
            </button>
            <SortDropdown
              value={filters.sort}
              onChange={(s) => setFilters({ ...filters, sort: s })}
            />
          </div>

          {filtered.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 24px',
                background: 'var(--cream)',
                border: '1px solid var(--hairline)',
              }}
            >
              <p className="serif italic" style={{ fontSize: 22 }}>
                No residences match these filters.
              </p>
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 24 }}
                onClick={() => setFilters(DEFAULT_FILTERS)}
              >
                Clear all
              </button>
            </div>
          ) : (
            <div
              className="grid grid-residences-city"
              style={{ gap: 'clamp(28px, 3vw, 44px)' }}
            >
              {filtered.map((r) => (
                <PropertyCard key={r.id} residence={r} hideCity />
              ))}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: 56,
              gap: 24,
            }}
          >
            <span className="small muted">Page 1 of 1</span>
          </div>
        </div>

        <div
          style={{
            position: 'sticky',
            top: 'var(--header-h)',
            height: 'calc(100vh - var(--header-h))',
            borderLeft: '1px solid var(--hairline)',
          }}
          className="residences-map"
        >
          <MapView
            residences={filtered}
            selectedId={selected}
            onSelect={(id, navigateTo) => {
              const r = filtered.find((x) => x.id === id);
              if (navigateTo && r) router.push(`/residences/${r.city}/${r.slug}`);
              else setSelected(id);
            }}
          />
        </div>
      </div>
    </main>
  );
}
