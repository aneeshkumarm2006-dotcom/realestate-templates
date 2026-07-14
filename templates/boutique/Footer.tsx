'use client';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { BRAND } from '@/lib/brand';
import { CITY_LIST } from '@/lib/data';
import { SETTINGS } from '@/lib/settings';
import './boutique.css';

const COMPANY = [
  { href: '/why-us', label: 'Why us' },
  { href: '/about', label: 'About' },
  { href: '/careers', label: 'Careers' },
  { href: '/inquire', label: 'Contact' },
];

export function Footer() {
  const pathname = usePathname();
  const router = useRouter();
  const go = (to: string) => router.push(to);

  // The CMS portal has its own chrome — no public site footer there.
  if (pathname.startsWith('/admin')) return null;

  const year = new Date().getFullYear();

  return (
    <footer className="b-footer">
      <div className="b-footer-inner">
        <p className="b-footer-statement">
          {BRAND.tagline}
        </p>

        <div className="b-footer-grid">
          <div className="b-footer-col">
            <Logo variant="light" height={30} />
            <p className="b-footer-tag">{BRAND.metadata.description}</p>
          </div>

          <div className="b-footer-col">
            <h4>Residences</h4>
            <ul>
              {CITY_LIST.map((c) => (
                <li key={c.slug}>
                  <button onClick={() => go(`/residences/${c.slug}`)}>
                    {c.label}
                    {c.comingSoon ? ' · Coming soon' : ''}
                  </button>
                </li>
              ))}
              <li>
                <button onClick={() => go('/residences')}>All residences</button>
              </li>
            </ul>
          </div>

          <div className="b-footer-col">
            <h4>Studio</h4>
            <ul>
              {COMPANY.map((l) => (
                <li key={l.href}>
                  <button onClick={() => go(l.href)}>{l.label}</button>
                </li>
              ))}
            </ul>
          </div>

          <div className="b-footer-col">
            <h4>Connect</h4>
            <ul>
              <li>
                <a href={SETTINGS.social.instagram} target="_blank" rel="noopener noreferrer">
                  Instagram
                </a>
              </li>
              <li>
                <a href={SETTINGS.social.facebook} target="_blank" rel="noopener noreferrer">
                  Facebook
                </a>
              </li>
              <li>
                <a href={SETTINGS.social.linkedin} target="_blank" rel="noopener noreferrer">
                  LinkedIn
                </a>
              </li>
            </ul>
            <ul style={{ marginTop: 20 }}>
              <li>
                <a href={`mailto:${SETTINGS.contactEmail}`}>{SETTINGS.contactEmail}</a>
              </li>
              <li>
                <a href={`tel:${SETTINGS.contactPhone.replace(/[^\d+]/g, '')}`}>
                  {SETTINGS.contactPhone}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="b-footer-bottom">
          <span>© {year} {BRAND.name}. All rights reserved.</span>
          <span>Privacy · Terms · Accessibility</span>
        </div>
      </div>
    </footer>
  );
}
