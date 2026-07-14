'use client';
import './grid.css';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DEFAULT_FILTERS, type Filters } from '@/components/FiltersPanel';
import { applyFilters } from '@/lib/filter';
import { CITY_LIST, RESIDENCES } from '@/lib/data';
import { SearchBody } from './SearchBody';

/** Region for the count line, derived from the city records (mirrors the
 *  editorial approach): one province reads "… across X", several drops it. */
const PROVINCES = Array.from(new Set(CITY_LIST.map((c) => c.province).filter(Boolean)));
const REGION_SUFFIX = PROVINCES.length === 1 ? ` across ${PROVINCES[0]}` : '';

/** Read a Filters + query state out of the current URL search params. */
function readState(search: URLSearchParams): { filters: Filters; query: string } {
  const qBeds = search.get('beds');
  const qPriceMin = search.get('priceMin');
  const qPriceMax = search.get('priceMax') || search.get('maxRent');
  const qAvailability = search.get('availability');
  const qSort = search.get('sort');
  return {
    filters: {
      beds: qBeds ? qBeds.split(',').map(Number).filter((n) => !Number.isNaN(n)) : [],
      priceMin: qPriceMin ? Number(qPriceMin) : DEFAULT_FILTERS.priceMin,
      priceMax: qPriceMax ? Number(qPriceMax) : DEFAULT_FILTERS.priceMax,
      availability: (qAvailability as Filters['availability']) || DEFAULT_FILTERS.availability,
      amenities: [],
      sort: (qSort as Filters['sort']) || DEFAULT_FILTERS.sort,
    },
    query: search.get('q') ?? '',
  };
}

function ResidencesInner() {
  const search = useSearchParams();

  const [filters, setFilters] = useState<Filters>(() => readState(search).filters);
  const [query, setQuery] = useState(() => readState(search).query);

  // Pull state back in when the URL changes underneath us (e.g. Back button).
  useEffect(() => {
    const next = readState(search);
    setFilters((prev) => {
      const changed =
        prev.beds.join(',') !== next.filters.beds.join(',') ||
        prev.priceMin !== next.filters.priceMin ||
        prev.priceMax !== next.filters.priceMax ||
        prev.availability !== next.filters.availability ||
        prev.sort !== next.filters.sort;
      return changed ? next.filters : prev;
    });
    setQuery((prev) => (prev !== next.query ? next.query : prev));
  }, [search]);

  // Push local state out to the URL (debounced history push, immediate address bar).
  useEffect(() => {
    const sp = new URLSearchParams();
    if (query) sp.set('q', query);
    if (filters.beds.length) sp.set('beds', filters.beds.join(','));
    if (filters.priceMin !== DEFAULT_FILTERS.priceMin) sp.set('priceMin', String(filters.priceMin));
    if (filters.priceMax !== DEFAULT_FILTERS.priceMax) sp.set('priceMax', String(filters.priceMax));
    if (filters.availability !== DEFAULT_FILTERS.availability) sp.set('availability', filters.availability);
    if (filters.sort !== DEFAULT_FILTERS.sort) sp.set('sort', filters.sort);

    const qs = sp.toString();
    const url = qs ? `/residences?${qs}` : '/residences';

    const cur = new URLSearchParams(window.location.search);
    const nxt = new URLSearchParams(qs);
    cur.sort();
    nxt.sort();
    if (cur.toString() !== nxt.toString()) {
      window.history.replaceState(null, '', url);
      const t = setTimeout(() => window.history.pushState(null, '', url), 500);
      return () => clearTimeout(t);
    }
  }, [filters, query]);

  const filtered = useMemo(() => applyFilters(RESIDENCES, filters, query), [filters, query]);

  const clearAll = () => {
    setFilters(DEFAULT_FILTERS);
    setQuery('');
  };

  return (
    <main className="page-enter">
      <div className="g-container" style={{ paddingTop: 20, paddingBottom: 4 }}>
        <div className="g-crumb" style={{ marginBottom: 12 }}>
          <a href="/">Home</a>
          <span className="sep">/</span>
          <span className="cur">Residences</span>
        </div>
        <h1 className="h1" style={{ marginBottom: 4 }}>All residences</h1>
        <p className="g-result-count">
          {RESIDENCES.length} residences{REGION_SUFFIX} · net-effective pricing
        </p>
      </div>

      <SearchBody
        filters={filters}
        setFilters={setFilters}
        query={query}
        setQuery={setQuery}
        filtered={filtered}
        total={RESIDENCES.length}
        onClear={clearAll}
      />
    </main>
  );
}

export default function Residences() {
  return (
    <Suspense fallback={<main className="page-enter" />}>
      <ResidencesInner />
    </Suspense>
  );
}
