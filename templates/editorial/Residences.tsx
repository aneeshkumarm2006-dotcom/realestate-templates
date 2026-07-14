'use client';
import { Suspense, useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiltersPanel, DEFAULT_FILTERS, type Filters } from '@/components/FiltersPanel';
import { SortDropdown } from '@/components/SortDropdown';
import { PropertyCard } from '@/components/PropertyCard';
import { MapView } from '@/components/MapViewClient';
import { CloseIcon, MapIcon, SlidersIcon } from '@/components/icons';
import { CITY_LIST, RESIDENCES } from '@/lib/data';
import { applyFilters } from '@/lib/filter';

/** Region for the count line, derived from the city records: a portfolio in a
 *  single province reads "… residences across Northshire"; a portfolio spanning
 *  several (or none) simply drops the phrase rather than naming a fixed one. */
const PROVINCES = Array.from(new Set(CITY_LIST.map((c) => c.province).filter(Boolean)));
const REGION_SUFFIX = PROVINCES.length === 1 ? ` across ${PROVINCES[0]}` : '';

export default function ResidencesAllPage() {
  return (
    <Suspense fallback={<main className="page-enter" />}>
      <ResidencesAllInner />
    </Suspense>
  );
}

function ResidencesAllInner() {
  const router = useRouter();
  const search = useSearchParams();

  const [filters, setFilters] = useState<Filters>(() => {
    const qBeds = search.get('beds');
    const qPriceMin = search.get('priceMin');
    const qPriceMax = search.get('priceMax') || search.get('maxRent');
    const qAvailability = search.get('availability');
    const qAmenities = search.get('amenities');
    const qSort = search.get('sort');

    return {
      beds: qBeds
        ? qBeds.split(',').map(Number).filter((n) => !Number.isNaN(n))
        : [],
      priceMin: qPriceMin ? Number(qPriceMin) : DEFAULT_FILTERS.priceMin,
      priceMax: qPriceMax ? Number(qPriceMax) : DEFAULT_FILTERS.priceMax,
      availability: (qAvailability as any) || DEFAULT_FILTERS.availability,
      amenities: qAmenities ? qAmenities.split(',') : [],
      sort: (qSort as any) || DEFAULT_FILTERS.sort,
    };
  });
  
  const [query, setQuery] = useState(() => search.get('q') ?? '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  // Sync state from URL when the URL changes (e.g. Back button)
  useEffect(() => {
    const qBeds = search.get('beds');
    const qPriceMin = search.get('priceMin');
    const qPriceMax = search.get('priceMax') || search.get('maxRent');
    const qAvailability = search.get('availability');
    const qAmenities = search.get('amenities');
    const qSort = search.get('sort');
    const qQuery = search.get('q') ?? '';

    const newBeds = qBeds ? qBeds.split(',').map(Number).filter((n) => !Number.isNaN(n)) : [];
    const newPriceMin = qPriceMin ? Number(qPriceMin) : DEFAULT_FILTERS.priceMin;
    const newPriceMax = qPriceMax ? Number(qPriceMax) : DEFAULT_FILTERS.priceMax;
    const newAvailability = (qAvailability as any) || DEFAULT_FILTERS.availability;
    const newAmenities = qAmenities ? qAmenities.split(',') : [];
    const newSort = (qSort as any) || DEFAULT_FILTERS.sort;

    setFilters((prev) => {
      const bedsChanged = prev.beds.join(',') !== newBeds.join(',');
      const minChanged = prev.priceMin !== newPriceMin;
      const maxChanged = prev.priceMax !== newPriceMax;
      const availChanged = prev.availability !== newAvailability;
      const amenChanged = prev.amenities.join(',') !== newAmenities.join(',');
      const sortChanged = prev.sort !== newSort;

      if (bedsChanged || minChanged || maxChanged || availChanged || amenChanged || sortChanged) {
        return {
          beds: newBeds,
          priceMin: newPriceMin,
          priceMax: newPriceMax,
          availability: newAvailability,
          amenities: newAmenities,
          sort: newSort,
        };
      }
      return prev;
    });

    setQuery((prev) => (prev !== qQuery ? qQuery : prev));
  }, [search]);

  // Sync state to URL
  useEffect(() => {
    const sp = new URLSearchParams();
    if (query) sp.set('q', query);
    if (filters.beds.length) sp.set('beds', filters.beds.join(','));
    if (filters.priceMin !== DEFAULT_FILTERS.priceMin) sp.set('priceMin', String(filters.priceMin));
    if (filters.priceMax !== DEFAULT_FILTERS.priceMax) sp.set('priceMax', String(filters.priceMax));
    if (filters.availability !== DEFAULT_FILTERS.availability) sp.set('availability', filters.availability);
    if (filters.amenities.length) sp.set('amenities', filters.amenities.join(','));
    if (filters.sort !== DEFAULT_FILTERS.sort) sp.set('sort', filters.sort);

    const queryString = sp.toString();
    const newUrl = queryString ? `/residences?${queryString}` : '/residences';

    const currentQueryString = window.location.search;
    const parsedCurrent = new URLSearchParams(currentQueryString);
    const parsedNew = new URLSearchParams(queryString);
    parsedCurrent.sort();
    parsedNew.sort();

    if (parsedCurrent.toString() !== parsedNew.toString()) {
      // Immediate address bar update for continuous changes
      window.history.replaceState(null, '', newUrl);

      // Debounce history push for the back button
      const timeoutId = setTimeout(() => {
        window.history.pushState(null, '', newUrl);
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [filters, query]);

  const filtered = useMemo(
    () => applyFilters(RESIDENCES, filters, query),
    [filters, query]
  );

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
            <a className="text-link" onClick={() => router.push('/')}>
              Home
            </a>
            <span className="sep">/</span>
            <span>Residences</span>
          </div>
          <h1 className="h1 serif" style={{ marginBottom: 10 }}>
            All residences.
          </h1>
          <p className="small muted" style={{ marginBottom: 36 }}>
            {filtered.length} of {RESIDENCES.length} residences{REGION_SUFFIX}
          </p>

          {query && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 24,
                padding: '12px 16px',
                background: 'var(--cream)',
                border: '1px solid var(--hairline)',
              }}
            >
              <span className="small">
                Searching <span className="italic serif">&ldquo;{query}&rdquo;</span>
              </span>
              <button
                onClick={() => setQuery('')}
                style={{
                  marginLeft: 'auto',
                  background: 'transparent',
                  border: 0,
                  color: 'var(--muted)',
                }}
              >
                <CloseIcon size={14} />
              </button>
            </div>
          )}

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
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <SortDropdown
                value={filters.sort}
                onChange={(s) => setFilters({ ...filters, sort: s })}
              />
            </div>
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
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  setQuery('');
                }}
              >
                Clear all
              </button>
            </div>
          ) : (
            <div
              className="grid grid-residences"
              style={{ gap: 'clamp(28px, 3vw, 44px)' }}
            >
              {filtered.map((r) => (
                <PropertyCard key={r.id} residence={r} />
              ))}
            </div>
          )}
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
