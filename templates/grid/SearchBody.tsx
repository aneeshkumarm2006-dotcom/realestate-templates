'use client';
import './grid.css';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapView } from '@/components/MapViewClient';
import { SlidersIcon, MapIcon, CloseIcon } from '@/components/icons';
import type { Residence } from '@/lib/data';
import type { Filters } from '@/components/FiltersPanel';
import { FilterRail } from './FilterRail';
import { GCard } from './GCard';

interface SearchBodyProps {
  filters: Filters;
  setFilters: (f: Filters) => void;
  query: string;
  setQuery: (q: string) => void;
  filtered: Residence[];
  total: number;
  onClear: () => void;
}

/** The two-pane search product: a sticky inline filter rail + a dense results
 *  grid with a map toggle. Shared by the Residences and City views. On mobile
 *  the rail collapses to a sheet opened from a Filters button. */
export function SearchBody({
  filters,
  setFilters,
  query,
  setQuery,
  filtered,
  total,
  onClear,
}: SearchBodyProps) {
  const router = useRouter();
  const [view, setView] = useState<'grid' | 'map'>('grid');
  const [railOpen, setRailOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="g-search-layout">
      {/* Mobile backdrop for the rail sheet */}
      <div
        className={'g-sheet-backdrop' + (railOpen ? ' open' : '')}
        onClick={() => setRailOpen(false)}
      />

      <aside className={'g-rail' + (railOpen ? ' open' : '')} aria-label="Filters">
        <div className="g-rail-head">
          <span className="g-label">Filters</span>
          <button
            type="button"
            className="g-menu-btn"
            style={{ display: 'inline-flex' }}
            aria-label="Close filters"
            onClick={() => setRailOpen(false)}
          >
            <CloseIcon size={18} />
          </button>
        </div>
        <FilterRail
          filters={filters}
          setFilters={setFilters}
          query={query}
          setQuery={setQuery}
          onClear={onClear}
        />
      </aside>

      <div className="g-results">
        <div className="g-results-head">
          <button
            type="button"
            className="g-rail-toggle"
            onClick={() => setRailOpen(true)}
            aria-label="Show filters"
          >
            <SlidersIcon size={15} /> Filters
          </button>

          <span className="g-result-count" role="status" aria-live="polite">
            <b className="g-num">{filtered.length}</b>{' '}
            {total > filtered.length && (
              <span className="g-num" style={{ color: 'var(--muted)' }}>of {total} </span>
            )}
            {filtered.length === 1 ? 'residence' : 'residences'}
          </span>

          <div className="g-view-toggle" role="group" aria-label="View">
            <button
              type="button"
              aria-pressed={view === 'grid'}
              onClick={() => setView('grid')}
            >
              <SlidersIcon size={14} /> Grid
            </button>
            <button
              type="button"
              aria-pressed={view === 'map'}
              onClick={() => setView('map')}
            >
              <MapIcon size={14} /> Map
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="g-empty">
            <p>No residences match these filters.</p>
            <span>Try widening your price range or clearing a filter.</span>
            <div style={{ marginTop: 18 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
                Clear all
              </button>
            </div>
          </div>
        ) : view === 'map' ? (
          <div className="g-map-wrap">
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
        ) : (
          <div className="g-grid">
            {filtered.map((r) => (
              <GCard key={r.id} residence={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
