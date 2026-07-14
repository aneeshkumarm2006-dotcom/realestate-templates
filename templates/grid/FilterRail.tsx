'use client';
import './grid.css';
import { SearchIcon } from '@/components/icons';
import { DEFAULT_FILTERS, type Filters } from '@/components/FiltersPanel';

interface FilterRailProps {
  filters: Filters;
  setFilters: (f: Filters) => void;
  query: string;
  setQuery: (q: string) => void;
  onClear: () => void;
}

const BEDS: { n: number; label: string }[] = [
  { n: 0, label: 'Studio' },
  { n: 1, label: '1' },
  { n: 2, label: '2' },
  { n: 3, label: '3+' },
];

const AVAIL: { v: Filters['availability']; label: string }[] = [
  { v: 'any', label: 'Any' },
  { v: 'available', label: 'Available' },
  { v: 'coming-soon', label: 'Soon' },
];

const SORTS: { v: Filters['sort']; label: string }[] = [
  { v: 'name', label: 'Name (A–Z)' },
  { v: 'price-asc', label: 'Price (low to high)' },
  { v: 'price-desc', label: 'Price (high to low)' },
  { v: 'bedrooms', label: 'Bedrooms' },
];

/** Inline filter controls that live on the page (not a drawer) — the defining
 *  trait of the Grid search product. Purely presentational: state is owned by
 *  the page so it can be synced to the URL. */
export function FilterRail({ filters, setFilters, query, setQuery, onClear }: FilterRailProps) {
  const update = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });

  const toggleBed = (n: number) => {
    const has = filters.beds.includes(n);
    update({ beds: has ? filters.beds.filter((b) => b !== n) : [...filters.beds, n] });
  };

  const price = (raw: string, key: 'priceMin' | 'priceMax') => {
    const v = raw === '' ? DEFAULT_FILTERS[key] : Number(raw);
    if (!Number.isNaN(v)) update({ [key]: v } as Partial<Filters>);
  };

  return (
    <>
      <div className="g-rail-group">
        <span className="g-label">Search</span>
        <div className="g-rail-search">
          <SearchIcon size={15} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="City, building, address"
            aria-label="Search residences"
          />
        </div>
      </div>

      <div className="g-rail-group">
        <span className="g-label" id="g-beds-label">Bedrooms</span>
        <div className="g-chips" role="group" aria-labelledby="g-beds-label">
          {BEDS.map(({ n, label }) => (
            <button
              key={n}
              type="button"
              className="g-chip g-num"
              aria-pressed={filters.beds.includes(n)}
              onClick={() => toggleBed(n)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="g-rail-group">
        <span className="g-label">Monthly rent</span>
        <div className="g-price-row">
          <label className="g-price-field">
            <span>$</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={50}
              value={filters.priceMin}
              onChange={(e) => price(e.target.value, 'priceMin')}
              aria-label="Minimum rent"
            />
          </label>
          <span className="g-price-dash" aria-hidden="true">–</span>
          <label className="g-price-field">
            <span>$</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={50}
              value={filters.priceMax}
              onChange={(e) => price(e.target.value, 'priceMax')}
              aria-label="Maximum rent"
            />
          </label>
        </div>
      </div>

      <div className="g-rail-group">
        <span className="g-label" id="g-avail-label">Availability</span>
        <div className="g-seg" role="group" aria-labelledby="g-avail-label">
          {AVAIL.map((a) => (
            <button
              key={a.v}
              type="button"
              aria-pressed={filters.availability === a.v}
              onClick={() => update({ availability: a.v })}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="g-rail-group">
        <label className="g-label" htmlFor="g-sort">Sort</label>
        <select
          id="g-sort"
          className="g-select"
          value={filters.sort}
          onChange={(e) => update({ sort: e.target.value as Filters['sort'] })}
        >
          {SORTS.map((s) => (
            <option key={s.v} value={s.v}>{s.label}</option>
          ))}
        </select>
      </div>

      <button type="button" className="btn btn-ghost btn-sm g-btn-block" onClick={onClear}>
        Clear all
      </button>
    </>
  );
}
