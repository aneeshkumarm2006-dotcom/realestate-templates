'use client';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { BRAND } from '@/lib/brand';
import { CITY_LIST } from '@/lib/data';
import { SETTINGS } from '@/lib/settings';
import './immersive.css';

export function Footer() {
  const pathname = usePathname();
  const router = useRouter();
  const go = (to: string) => router.push(to);

  // The CMS portal has its own chrome — no public footer there.
  if (pathname.startsWith('/admin')) return null;

  return (
    <footer className="im-footer">
      <div className="im-footer-grid">
        <div>
          <Logo variant="dark" height={40} />
          <p className="im-footer-tag">{BRAND.tagline}</p>
        </div>

        <div>
          <h4>Residences</h4>
          <ul>
            {/* Markets come from content/cities.json — never hardcode them. */}
            {CITY_LIST.map((c) => (
              <li key={c.slug}>
                <a onClick={() => go(`/residences/${c.slug}`)}>
                  {c.label}
                  {c.comingSoon ? ' · Coming soon' : ''}
                </a>
              </li>
            ))}
            <li><a onClick={() => go('/residences')}>All residences</a></li>
          </ul>
        </div>

        <div>
          <h4>Company</h4>
          <ul>
            <li><a onClick={() => go('/why-us')}>Why us</a></li>
            <li><a onClick={() => go('/about')}>About</a></li>
            <li><a onClick={() => go('/careers')}>Careers</a></li>
            <li><a onClick={() => go('/inquire')}>Contact</a></li>
          </ul>

          <h4 style={{ marginTop: 26 }}>Contact</h4>
          <ul>
            <li><a href={`mailto:${SETTINGS.contactEmail}`}>{SETTINGS.contactEmail}</a></li>
            <li>{SETTINGS.contactPhone}</li>
          </ul>
        </div>
      </div>

      <div className="im-footer-bottom">
        <div>© 2026 {BRAND.name}. All rights reserved.</div>
        <div>Privacy · Terms · Accessibility</div>
      </div>
    </footer>
  );
}
