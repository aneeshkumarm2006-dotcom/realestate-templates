'use client';

/* Custom branded dropdown (replaces native <select> everywhere).
   Accessible listbox: full keyboard support, type-ahead, click-outside.
   Variants: 'site' (transparent trigger for the public site) and
   'admin' (input-style trigger for the CMS). Styles in globals.css (.bd-*). */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';

export interface DropdownOption {
  value: string;
  label: string;
}

export function Dropdown({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  variant = 'site',
  ariaLabel,
  disabled,
  style,
  menuStyle,
}: {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  variant?: 'site' | 'admin';
  ariaLabel?: string;
  disabled?: boolean;
  style?: CSSProperties;
  menuStyle?: CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ text: '', at: 0 });
  const listboxId = useId();

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const close = useCallback(() => {
    setOpen(false);
    setActive(-1);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener('pointerdown', onDocDown);
    return () => document.removeEventListener('pointerdown', onDocDown);
  }, [open, close]);

  useEffect(() => {
    if (open && active >= 0) {
      listRef.current
        ?.querySelectorAll('li')
        [active]?.scrollIntoView({ block: 'nearest' });
    }
  }, [open, active]);

  const openMenu = () => {
    if (disabled) return;
    setOpen(true);
    setActive(selectedIndex >= 0 ? selectedIndex : 0);
  };

  const commit = (i: number) => {
    const opt = options[i];
    if (opt) onChange(opt.value);
    close();
  };

  const findByTypeahead = (ch: string): number => {
    const now = Date.now();
    typeahead.current.text =
      now - typeahead.current.at > 600 ? ch : typeahead.current.text + ch;
    typeahead.current.at = now;
    const q = typeahead.current.text.toLowerCase();
    return options.findIndex((o) => o.label.toLowerCase().startsWith(q));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((a) => Math.min(a + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setActive(0);
        break;
      case 'End':
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        commit(active);
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        close();
        break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) {
          const i = findByTypeahead(e.key);
          if (i >= 0) setActive(i);
        }
    }
  };

  return (
    <div
      ref={rootRef}
      className={`bd-select bd-${variant}${disabled ? ' disabled' : ''}`}
      style={style}
    >
      <button
        type="button"
        className="bd-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span className={selected ? 'bd-value' : 'bd-placeholder'}>
          {selected?.label ?? placeholder}
        </span>
        <svg
          className={`bd-chevron${open ? ' up' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          className="bd-menu"
          role="listbox"
          aria-label={ariaLabel}
          style={menuStyle}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`bd-option${i === active ? ' active' : ''}`}
              onPointerEnter={() => setActive(i)}
              onClick={() => commit(i)}
            >
              <span>{o.label}</span>
              {o.value === value && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="m5 12.5 4.5 4.5L19 7" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
