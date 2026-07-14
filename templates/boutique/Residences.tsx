'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronDown } from '@/components/icons';
import { LIVE_CITIES, RESIDENCES, CITY_LIST } from '@/lib/data';
import { applyFilters } from '@/lib/filter';
import { DEFAULT_FILTERS, type Filters } from '@/components/FiltersPanel';
import { BoutiqueCard } from './BoutiqueCard';
import { Reveal } from './Reveal';
import './boutique.css';

const SORTS: { value: Filters['sort']; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'price-asc', label: 'Price · low to high' },
  { value: 'price-desc', label: 'Price · high to low' },
  { value: 'bedrooms', label: 'Bedrooms' },
];

const BEDS: { value: number; label: string }[] = [
  { value: 0, label: 'Studio' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3+' },
];

// A single-province portfolio reads "… across <Province>"; mixed/none drops it.
const PROVINCES = Array.from(
  new Set(CITY_LIST.map((c) => c.province).filter(Boolean))
);
const REGION_SUFFIX = PROVINCES.length === 1 ? ` across ${PROVINCES[0]}` : '';

export default function Residences() {
  return (
    <Suspense fallback={<main className="page-enter" />}>
      <ResidencesInner />
    </Suspense>
  );
}

function ResidencesInner() {
  const search = useSearchParams();

  const [city, setCity] = useState('');
  const [sort, setSort] = useState<Filters['sort']>(DEFAULT_FILTERS.sort);
  const [beds, setBeds] = useState<number[]>([]);

  // Hydrate state from the URL, including Back/Forward navigation.
  useEffect(() => {
    const qCity = search.get('city') ?? '';
    const qSort = (search.get('sort') as Filters['sort']) || DEFAULT_FILTERS.sort;
    const qBeds = search.get('beds');
    setCity((p) => (p !== qCity ? qCity : p));
    setSort((p) => (p !== qSort ? qSort : p));
    const parsed = qBeds
      ? qBeds.split(',').map(Number).filter((n) => !Number.isNaN(n))
      : [];
    setBeds((p) => (p.join(',') !== parsed.join(',') ? parsed : p));
  }, [search]);

  // Reflect the current selection in the address bar (no history spam).
  useEffect(() => {
    const sp = new URLSearchParams();
    if (city) sp.set('city', city);
    if (sort !== DEFAULT_FILTERS.sort) sp.set('sort', sort);
    if (beds.length) sp.set('beds', beds.join(','));
    const qs = sp.toString();
    const next = qs ? `/residences?${qs}` : '/residences';
    if (window.location.pathname + window.location.search !== next) {
      window.history.replaceState(null, '', next);
    }
  }, [city, sort, beds]);

  const filtered = useMemo(() => {
    const base = city ? RESIDENCES.filter((r) => r.city === city) : RESIDENCES;
    const filters: Filters = { ...DEFAULT_FILTERS, beds, sort };
    return applyFilters(base, filters, '');
  }, [city, beds, sort]);

  const toggleBed = (b: number) =>
    setBeds((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));

  const clearAll = () => {
    setCity('');
    setSort(DEFAULT_FILTERS.sort);
    setBeds([]);
  };

  return (
    <main className="page-enter">
      <section className="b-section" style={{ paddingBottom: 'clamp(3rem, 6vw, 6rem)' }}>
        <div className="b-container">
          <div className="b-listing-head">
            <div>
              <p className="b-label gold" style={{ marginBottom: 18 }}>The portfolio</p>
              <h1 className="b-display" style={{ fontSize: 'clamp(2.6rem, 6vw, 5rem)' }}>
                All residences
              </h1>
              <p className="b-count">
                {filtered.length} of {RESIDENCES.length} residences{REGION_SUFFIX}
              </p>
            </div>
          </div>

          <div className="b-filters">
            <div className="b-filter-group">
              <span className="b-label">City</span>
              <span className="b-field">
                <select
                  className="b-select"
                  aria-label="Filter by city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  <option value="">All</option>
                  {LIVE_CITIES.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="b-chev" />
              </span>
            </div>

            <div className="b-filter-group">
              <span className="b-label">Bedrooms</span>
              <div className="b-beds" role="group" aria-label="Filter by bedrooms">
                {BEDS.map((b) => {
                  const on = beds.includes(b.value);
                  return (
                    <button
                      key={b.value}
                      type="button"
                      className={'b-bed' + (on ? ' active' : '')}
                      aria-pressed={on}
                      onClick={() => toggleBed(b.value)}
                    >
                      {b.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="b-filter-group" style={{ marginLeft: 'auto' }}>
              <span className="b-label">Sort</span>
              <span className="b-field">
                <select
                  className="b-select"
                  aria-label="Sort residences"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Filters['sort'])}
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="b-chev" />
              </span>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="b-empty">
              <p className="b-empty-title">No residences match these filters.</p>
              <button className="btn btn-ghost btn-sm" onClick={clearAll}>
                Clear all
              </button>
            </div>
          ) : (
            <div className="b-grid">
              {filtered.map((r, i) => (
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
