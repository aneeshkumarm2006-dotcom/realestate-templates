'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { useFavorites } from '@/components/FavoritesContext';
import { HeartIcon, MenuIcon, CloseIcon } from '@/components/icons';
import { CITY_LIST } from '@/lib/data';
import { SETTINGS } from '@/lib/settings';
import './boutique.css';

/* Primary nav (matches the shared contract). Cities are appended from
   CITY_LIST inside the overlay — never hardcoded here. */
const PRIMARY = [
  { href: '/residences', label: 'Properties' },
  { href: '/why-us', label: 'Why us' },
  { href: '/about', label: 'About' },
  { href: '/careers', label: 'Careers' },
  { href: '/inquire', label: 'Contact' },
];

/* A few restrained inline links on desktop; the full nav lives in the overlay. */
const INLINE = [
  { href: '/residences', label: 'Properties' },
  { href: '/about', label: 'About' },
  { href: '/inquire', label: 'Contact' },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { count } = useFavorites();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Solid header once the page has scrolled past the first fold.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the overlay on navigation.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Overlay: lock scroll, Escape to close, move focus in and back out.
  useEffect(() => {
    if (!menuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
      triggerRef.current?.focus();
    };
  }, [menuOpen]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  const go = (href: string) => {
    setMenuOpen(false);
    router.push(href);
  };

  // The CMS portal has its own chrome — no public site header there.
  if (pathname.startsWith('/admin')) return null;

  return (
    <>
      <header className={'b-header' + (scrolled ? ' is-scrolled' : '')}>
        <div className="b-header-inner">
          <Logo variant="light" height={30} />

          <nav className="b-header-nav" aria-label="Primary">
            {INLINE.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={'b-nav-link' + (isActive(l.href) ? ' active' : '')}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="b-header-right">
            <Link
              href="/favorites"
              className="b-fav"
              aria-label={`Favorites, ${count} saved`}
            >
              <HeartIcon
                filled={count > 0}
                size={18}
                style={{ color: count > 0 ? 'var(--gold)' : 'currentColor' }}
              />
              <span className="b-fav-count">{count}</span>
            </Link>
            <button
              ref={triggerRef}
              type="button"
              className="b-menu-trigger"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <span className="b-menu-word">Menu</span>
              <MenuIcon size={22} />
            </button>
          </div>
        </div>
      </header>

      <div
        className={'b-menu' + (menuOpen ? ' is-open' : '')}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        aria-hidden={!menuOpen}
      >
        <div className="b-menu-top">
          <Logo variant="light" height={30} />
          <button
            ref={closeRef}
            type="button"
            className="b-menu-close"
            onClick={() => setMenuOpen(false)}
          >
            Close <CloseIcon size={22} />
          </button>
        </div>

        <div className="b-menu-body">
          <nav className="b-menu-primary" aria-label="Primary">
            {PRIMARY.map((l, i) => (
              <button
                key={l.href}
                type="button"
                className="b-menu-link"
                style={{ transitionDelay: menuOpen ? `${120 + i * 55}ms` : '0ms' }}
                onClick={() => go(l.href)}
              >
                {l.label}
              </button>
            ))}
            <button
              type="button"
              className="b-menu-link"
              style={{ transitionDelay: menuOpen ? `${120 + PRIMARY.length * 55}ms` : '0ms' }}
              onClick={() => go('/favorites')}
            >
              Favorites <span className="b-menu-count">{count}</span>
            </button>
          </nav>

          <div className="b-menu-aside">
            <div>
              <p className="b-label" style={{ marginBottom: 20 }}>
                Our cities
              </p>
              <div className="b-menu-cities">
                {CITY_LIST.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    className="b-menu-city"
                    onClick={() => go(`/residences/${c.slug}`)}
                  >
                    {c.label}
                    {c.comingSoon && <span className="b-soon">Soon</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="b-menu-contact">
              <p className="b-label" style={{ marginBottom: 16 }}>
                Enquiries
              </p>
              <p style={{ margin: '0 0 6px' }}>
                <a href={`mailto:${SETTINGS.contactEmail}`}>
                  {SETTINGS.contactEmail}
                </a>
              </p>
              <p style={{ margin: 0 }}>
                <a href={`tel:${SETTINGS.contactPhone.replace(/[^\d+]/g, '')}`}>
                  {SETTINGS.contactPhone}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
