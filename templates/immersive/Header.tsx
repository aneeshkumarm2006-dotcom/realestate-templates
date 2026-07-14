'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { useFavorites } from '@/components/FavoritesContext';
import { HeartIcon, MenuIcon } from '@/components/icons';
import { CITY_LIST } from '@/lib/data';
import './immersive.css';

/* Immersive chrome: transparent over the 3D stage, then it solidifies once the
   house is behind you. Deliberately thin — the hero is the page. */
export function Header() {
  const pathname = usePathname();
  const { count } = useFavorites();
  const [stuck, setStuck] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  // The CMS portal has its own chrome — no public header there.
  if (pathname.startsWith('/admin')) return null;

  const active = (p: string) => pathname === p || pathname.startsWith(p + '/');

  return (
    <header className={'im-header' + (stuck ? ' is-stuck' : '')}>
      <Logo variant="light" height={30} />

      <nav className="im-nav" aria-label="Primary">
        <Link href="/residences" className={active('/residences') ? 'active' : ''}>
          Properties
        </Link>
        <Link href="/why-us" className={active('/why-us') ? 'active' : ''}>
          Why us
        </Link>
        <Link href="/about" className={active('/about') ? 'active' : ''}>
          About
        </Link>
        <Link href="/careers" className={active('/careers') ? 'active' : ''}>
          Careers
        </Link>
        <Link href="/inquire" className={active('/inquire') ? 'active' : ''}>
          Contact
        </Link>
      </nav>

      <div className="im-right">
        <Link href="/favorites" className="im-fav" aria-label={`Favorites (${count})`}>
          <HeartIcon filled={count > 0} size={17} />
          {count}
        </Link>
        <button
          className="im-burger"
          aria-label="Open menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <MenuIcon size={20} />
        </button>
      </div>

      {menuOpen && (
        <nav
          className="im-nav"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 14,
            padding: '20px var(--im-pad)',
            background: 'var(--ivory)',
            borderBottom: '1px solid var(--hairline)',
          }}
          aria-label="Mobile"
        >
          <Link href="/residences">Properties</Link>
          {CITY_LIST.map((c) => (
            <Link key={c.slug} href={`/residences/${c.slug}`} style={{ paddingLeft: 14, opacity: 0.6 }}>
              {c.label}
              {c.comingSoon ? ' · Coming soon' : ''}
            </Link>
          ))}
          <Link href="/why-us">Why us</Link>
          <Link href="/about">About</Link>
          <Link href="/careers">Careers</Link>
          <Link href="/inquire">Contact</Link>
        </nav>
      )}
    </header>
  );
}
