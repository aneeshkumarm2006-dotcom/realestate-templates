'use client';
import './grid.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { BRAND } from '@/lib/brand';
import { SETTINGS } from '@/lib/settings';
import { CITY_LIST } from '@/lib/data';

/** Grid footer — compact, utilitarian, dark. Returns null on /admin. */
export function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;

  const social: { label: string; href: string }[] = [
    { label: 'Facebook', href: SETTINGS.social.facebook },
    { label: 'Instagram', href: SETTINGS.social.instagram },
    { label: 'LinkedIn', href: SETTINGS.social.linkedin },
  ].filter((s) => !!s.href);

  return (
    <footer className="g-footer">
      <div className="g-footer-inner">
        <div className="g-footer-grid">
          <div>
            <Logo variant="dark" height={30} />
            <p className="g-tagline">{BRAND.tagline}</p>
          </div>

          <div>
            <h4>Explore</h4>
            <ul>
              {/* Markets come from content/cities.json — never hardcoded. */}
              {CITY_LIST.map((c) => (
                <li key={c.slug}>
                  <Link href={`/residences/${c.slug}`}>
                    {c.label}
                    {c.comingSoon ? ' · Coming soon' : ''}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/residences">All residences</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4>Company</h4>
            <ul>
              <li><Link href="/why-us">Why us</Link></li>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/careers">Careers</Link></li>
              <li><Link href="/inquire">Contact</Link></li>
              <li><Link href="/favorites">Favorites</Link></li>
            </ul>
          </div>

          <div>
            <h4>Get in touch</h4>
            <ul>
              <li>
                <a href={`mailto:${SETTINGS.contactEmail}`}>{SETTINGS.contactEmail}</a>
              </li>
              <li>
                <a href={`tel:${SETTINGS.contactPhone.replace(/[^+\d]/g, '')}`}>
                  {SETTINGS.contactPhone}
                </a>
              </li>
              {SETTINGS.officeLocation && <li>{SETTINGS.officeLocation}</li>}
            </ul>
            {social.length > 0 && (
              <ul style={{ marginTop: 16 }}>
                {social.map((s) => (
                  <li key={s.label}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="g-footer-bottom">
          <div>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</div>
          <div>Privacy · Terms · Accessibility</div>
        </div>
      </div>
    </footer>
  );
}
