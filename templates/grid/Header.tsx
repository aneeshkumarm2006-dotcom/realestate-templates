'use client';
import './grid.css';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { useFavorites } from '@/components/FavoritesContext';
import { HeartIcon, MenuIcon, CloseIcon, ChevronDown, SearchIcon } from '@/components/icons';
import { CITY_LIST } from '@/lib/data';

/** Grid header — slim, sticky, ~60px. Wordmark, tight nav with a Properties
 *  dropdown of markets, an inline search affordance, a favorites link with
 *  count, and a primary Contact button. Collapses to a slide-over on mobile.
 *  Returns null on /admin (the CMS ships its own chrome). */
export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { count } = useFavorites();
  const [menuOpen, setMenuOpen] = useState(false);
  const [ddOpen, setDdOpen] = useState(false);
  const [term, setTerm] = useState('');
  const ddRef = useRef<HTMLDivElement>(null);

  // Close transient UI on navigation.
  useEffect(() => {
    setMenuOpen(false);
    setDdOpen(false);
  }, [pathname]);

  // Close the dropdown on Escape or an outside click (keyboard + pointer).
  useEffect(() => {
    if (!ddOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDdOpen(false);
    const onDown = (e: PointerEvent) => {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) setDdOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [ddOpen]);

  const isActive = (prefix: string) =>
    pathname === prefix || pathname.startsWith(prefix + '/');

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    router.push(q ? `/residences?q=${encodeURIComponent(q)}` : '/residences');
  };

  // The CMS portal has its own chrome — no public site header there.
  if (pathname.startsWith('/admin')) return null;

  const NAV = [
    { href: '/why-us', label: 'Why us' },
    { href: '/about', label: 'About' },
    { href: '/careers', label: 'Careers' },
  ];

  return (
    <>
      <header className="g-header">
        <div className="g-header-inner">
          <Logo variant="light" height={26} />

          <nav className="g-nav" aria-label="Primary">
            <div
              className="g-dd"
              ref={ddRef}
              onMouseEnter={() => setDdOpen(true)}
              onMouseLeave={() => setDdOpen(false)}
            >
              <button
                type="button"
                className={'g-nav-link' + (isActive('/residences') ? ' active' : '')}
                aria-haspopup="true"
                aria-expanded={ddOpen}
                onClick={() => setDdOpen((v) => !v)}
              >
                Properties <ChevronDown size={14} />
              </button>
              {ddOpen && (
                <div className="g-dd-menu" role="menu">
                  <Link className="g-dd-item" role="menuitem" href="/residences">
                    All properties
                  </Link>
                  {/* Markets come from content/cities.json — never hardcoded. */}
                  {CITY_LIST.map((c) => (
                    <Link
                      key={c.slug}
                      className="g-dd-item"
                      role="menuitem"
                      href={`/residences/${c.slug}`}
                    >
                      {c.label}
                      {c.comingSoon && <span className="g-soon">Soon</span>}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={'g-nav-link' + (isActive(n.href) ? ' active' : '')}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <form className="g-header-search" role="search" onSubmit={submitSearch}>
            <SearchIcon size={15} />
            <input
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search city, building, address"
              aria-label="Search residences"
            />
          </form>

          <div className="g-header-right">
            <Link href="/favorites" className="g-fav" aria-label={`Favorites (${count})`}>
              <HeartIcon
                filled={count > 0}
                size={18}
                style={{ color: count > 0 ? 'var(--gold)' : 'var(--ink)' }}
              />
              <span className="g-fav-count g-num">{count}</span>
            </Link>
            <Link href="/inquire" className="btn btn-primary btn-sm">
              Contact
            </Link>
            <button
              type="button"
              className="g-menu-btn"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <MenuIcon size={20} />
            </button>
          </div>
        </div>
      </header>

      <div
        className={'g-sheet-backdrop' + (menuOpen ? ' open' : '')}
        onClick={() => setMenuOpen(false)}
      />
      <aside className={'g-sheet' + (menuOpen ? ' open' : '')} aria-hidden={!menuOpen}>
        <div className="g-sheet-head">
          <Logo variant="light" height={24} />
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="g-menu-btn"
            style={{ display: 'inline-flex' }}
          >
            <CloseIcon size={20} />
          </button>
        </div>
        <nav className="g-sheet-nav" aria-label="Mobile">
          <Link href="/residences">Properties</Link>
          {CITY_LIST.map((c) => (
            <Link key={c.slug} className="sub" href={`/residences/${c.slug}`}>
              {c.label}
              {c.comingSoon ? ' · Coming soon' : ''}
            </Link>
          ))}
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}>
              {n.label}
            </Link>
          ))}
          <Link href="/inquire">Contact</Link>
          <Link href="/favorites">Favorites ({count})</Link>
        </nav>
      </aside>
    </>
  );
}
