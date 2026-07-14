'use client';
import { useState } from 'react';
import { ChevronDown } from './icons';
import type { Filters } from './FiltersPanel';

const OPTIONS: { v: Filters['sort']; label: string }[] = [
  { v: 'name', label: 'Alphabetical (A–Z)' },
  { v: 'price-asc', label: 'Price (low to high)' },
  { v: 'price-desc', label: 'Price (high to low)' },
  { v: 'bedrooms', label: 'Bedrooms' },
];

interface Props {
  value: Filters['sort'];
  onChange: (v: Filters['sort']) => void;
}

export function SortDropdown({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const current = OPTIONS.find((o) => o.v === value) || OPTIONS[0];

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        className="btn btn-ghost btn-sm"
        style={{ borderColor: 'var(--hairline-strong)' }}
      >
        Sort by: {current.label} <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 10 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 4px)',
              background: 'var(--ivory)',
              border: '1px solid var(--hairline)',
              minWidth: 220,
              zIndex: 20,
            }}
          >
            {OPTIONS.map((o) => (
              <button
                key={o.v}
                onClick={() => {
                  onChange(o.v);
                  setOpen(false);
                }}
                className="dropdown-item"
                style={{ fontSize: 14, padding: '14px 20px' }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
