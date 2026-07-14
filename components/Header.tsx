'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import { useFavorites } from './FavoritesContext';
import { HeartIcon, MenuIcon, CloseIcon, ChevronDown } from './icons';
import { CITY_LIST } from '@/lib/data';
import { PAGES } from '@/lib/pages';


export function Header() {
  const pathname = usePathname();
  const { count } = useFavorites();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [careersOpen, setCareersOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isActive = (prefix: string) =>
    pathname === prefix || pathname.startsWith(prefix + '/');

  // The CMS portal has its own chrome — no public site header there.
  if (pathname.startsWith('/admin')) return null;

  return (
    <>
      <header className="site-header">
        <div className="inner">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Logo variant="light" height={36} />
          </div>

          <nav className="nav" aria-label="Primary">
            <div
              className={'nav-item has-dropdown ' + (isActive('/residences') ? 'active' : '')}
              onMouseEnter={() => setDropdownOpen(true)}
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <Link
                href="/residences"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: 'inherit',
                }}
              >
                Properties <ChevronDown size={14} />
              </Link>
              <div
                className="dropdown"
                style={{
                  opacity: dropdownOpen ? 1 : undefined,
                  pointerEvents: dropdownOpen ? 'auto' : undefined,
                }}
              >
                {/* Markets come from content/cities.json — never hardcode them. */}
                {CITY_LIST.map((c) => (
                  <Link
                    key={c.slug}
                    className="dropdown-item"
                    href={`/residences/${c.slug}`}
                  >
                    {c.label}
                    {c.comingSoon && (
                      <span style={{ color: 'var(--muted)', fontSize: 11 }}> · Coming soon</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
            <Link
              href="/why-us"
              className={'nav-item ' + (isActive('/why-us') ? 'active' : '')}
            >
              Why us
            </Link>
            <Link
              href="/about"
              className={'nav-item ' + (isActive('/about') ? 'active' : '')}
            >
              About
            </Link>
            {/* Placeholder, destination pending client direction on content. */}
            <span className="nav-item" aria-disabled="true" style={{ cursor: 'default' }}>
              Community Involvement
            </span>
            <div
              className={'nav-item has-dropdown ' + (isActive('/careers') ? 'active' : '')}
              onMouseEnter={() => setCareersOpen(true)}
              onMouseLeave={() => setCareersOpen(false)}
            >
              <Link
                href="/careers"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: 'inherit',
                }}
              >
                Careers <ChevronDown size={14} />
              </Link>
              <div
                className="dropdown"
                style={{
                  opacity: careersOpen ? 1 : undefined,
                  pointerEvents: careersOpen ? 'auto' : undefined,
                  width: 260,
                }}
              >
                <div
                  style={{
                    padding: '14px 18px',
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: 'var(--muted)',
                  }}
                >
                  {PAGES.careers.openings.noOpeningsMessage}
                </div>
              </div>
            </div>
            <Link
              href="/inquire"
              className={'nav-item ' + (isActive('/inquire') ? 'active' : '')}
            >
              Contact Us
            </Link>
          </nav>

          <div className="nav-right">
            <Link
              href="/favorites"
              className="favorites-link"
              aria-label={`Favorites (${count})`}
            >
              <HeartIcon
                filled={count > 0}
                size={20}
                style={{ color: count > 0 ? 'var(--gold)' : 'var(--ink)' }}
              />
              <span className="favorites-count">{count}</span>
            </Link>
            <button
              className="menu-trigger"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <MenuIcon size={22} />
            </button>
          </div>
        </div>
      </header>

      <div
        className={'mobile-backdrop' + (menuOpen ? ' open' : '')}
        onClick={() => setMenuOpen(false)}
      />
      <aside
        className={'mobile-menu' + (menuOpen ? ' open' : '')}
        aria-hidden={!menuOpen}
      >
        <div className="close-row">
          <button
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            style={{ background: 'transparent', border: 0 }}
          >
            <CloseIcon size={22} />
          </button>
        </div>
        <nav>
          <Link href="/residences">Properties</Link>
          {CITY_LIST.map((c) => (
            <Link key={c.slug} className="sub" href={`/residences/${c.slug}`}>
              {c.label}{c.comingSoon ? ' (Coming soon)' : ''}
            </Link>
          ))}
          <Link href="/why-us">Why us</Link>
          <Link href="/about">About</Link>
          {/* Placeholder, destination pending client direction on content. */}
          <span aria-disabled="true">Community Involvement</span>
          <Link href="/careers">Careers</Link>
          <span className="sub" aria-disabled="true">
            No openings · check back soon
          </span>
          <Link href="/inquire">Contact Us</Link>
          <Link href="/favorites">
            Favorites{' '}
            <span style={{ fontStyle: 'italic', color: 'var(--gold)' }}>
              {count}
            </span>
          </Link>
        </nav>
      </aside>
    </>
  );
}
