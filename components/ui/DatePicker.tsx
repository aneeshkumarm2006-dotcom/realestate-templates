'use client';

/* Custom branded calendar / date picker (no native date input).
   Value format: 'YYYY-MM-DD' (local, timezone-safe). Styles in globals.css
   (.bd-cal-*), same variants as Dropdown: 'site' | 'admin'. */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function parseKey(key?: string): { y: number; m: number; d: number } | null {
  if (!key) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  return { y: +m[1], m: +m[2] - 1, d: +m[3] };
}

function formatDisplay(key?: string): string | null {
  const p = parseKey(key);
  if (!p) return null;
  return `${MONTHS[p.m].slice(0, 3)} ${p.d}, ${p.y}`;
}

export function DatePicker({
  value,
  onChange,
  min,
  placeholder = 'Select a date',
  variant = 'site',
  ariaLabel = 'Choose a date',
  clearable = true,
  style,
}: {
  value?: string;
  onChange: (value: string | undefined) => void;
  /** Earliest selectable date, 'YYYY-MM-DD'. */
  min?: string;
  placeholder?: string;
  variant?: 'site' | 'admin';
  ariaLabel?: string;
  clearable?: boolean;
  style?: CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate());
  const start = parseKey(value) ?? parseKey(min) ?? {
    y: today.getFullYear(),
    m: today.getMonth(),
    d: 1,
  };
  const [view, setView] = useState({ y: start.y, m: start.m });

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const openCal = () => {
    const p = parseKey(value) ?? parseKey(min);
    if (p) setView({ y: p.y, m: p.m });
    setOpen(true);
  };

  const shiftMonth = (delta: number) =>
    setView(({ y, m }) => {
      const next = new Date(y, m + delta, 1);
      return { y: next.getFullYear(), m: next.getMonth() };
    });

  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const firstWeekday = new Date(view.y, view.m, 1).getDay();
  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isDisabled = (d: number) => !!min && toKey(view.y, view.m, d) < min;

  const display = formatDisplay(value);

  return (
    <div ref={rootRef} className={`bd-select bd-cal bd-${variant}`} style={style}>
      <button
        type="button"
        className="bd-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? close() : openCal())}
      >
        <span className={display ? 'bd-value' : 'bd-placeholder'}>
          {display ?? placeholder}
        </span>
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
          strokeLinecap="round" strokeLinejoin="round" className="bd-chevron" aria-hidden
        >
          <rect x="3" y="4" width="18" height="18" rx="0" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>

      {open && (
        <div className="bd-cal-pop" role="dialog" aria-label={ariaLabel}>
          <div className="bd-cal-head">
            <button
              type="button"
              className="bd-cal-nav"
              aria-label="Previous month"
              onClick={() => shiftMonth(-1)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <div className="bd-cal-title">
              {MONTHS[view.m]} <span>{view.y}</span>
            </div>
            <button
              type="button"
              className="bd-cal-nav"
              aria-label="Next month"
              onClick={() => shiftMonth(1)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>

          <div className="bd-cal-grid" role="grid">
            {WEEKDAYS.map((w) => (
              <div key={w} className="bd-cal-wd" aria-hidden>
                {w}
              </div>
            ))}
            {cells.map((d, i) =>
              d === null ? (
                <div key={`e${i}`} />
              ) : (
                <button
                  key={d}
                  type="button"
                  className={[
                    'bd-cal-day',
                    toKey(view.y, view.m, d) === value ? 'selected' : '',
                    toKey(view.y, view.m, d) === todayKey ? 'today' : '',
                  ].join(' ').trim()}
                  disabled={isDisabled(d)}
                  aria-label={`${MONTHS[view.m]} ${d}, ${view.y}`}
                  aria-pressed={toKey(view.y, view.m, d) === value}
                  onClick={() => {
                    onChange(toKey(view.y, view.m, d));
                    close();
                  }}
                >
                  {d}
                </button>
              )
            )}
          </div>

          {clearable && value && (
            <div className="bd-cal-foot">
              <button
                type="button"
                className="bd-cal-clear"
                onClick={() => {
                  onChange(undefined);
                  close();
                }}
              >
                Clear date
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
