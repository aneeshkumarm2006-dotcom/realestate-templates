'use client';
import { usePathname, useRouter } from 'next/navigation';
import { BRAND } from '@/lib/brand';
import { CITY_LIST } from '@/lib/data';
import { SETTINGS } from '@/lib/settings';
import { Logo } from './Logo';

// Resident Portal + Maintenance Request are per-building links, resolved from
// the client's property-management system (content/links.json). Site-wide links
// route to the residence list, where each property has its own buttons.
const RESIDENT_PORTAL_URL = '/residences';
const MAINTENANCE_REQUEST_URL = '/residences';

export function Footer() {
  const router = useRouter();
  const pathname = usePathname();
  const go = (to: string) => router.push(to);
  // The CMS portal has its own chrome — no public site footer there.
  if (pathname.startsWith('/admin')) return null;
  return (
    <footer className="site-footer">
      <div className="inner">
        <div className="footer-grid">
          <div>
            <div style={{ marginBottom: 24 }}>
              <Logo variant="dark" height={44} />
            </div>
            <p
              style={{
                fontSize: 14,
                color: 'rgba(247,243,236,0.7)',
                lineHeight: 1.7,
                maxWidth: 320,
                margin: 0,
              }}
            >
              {BRAND.tagline}
            </p>
          </div>
          <div>
            <h4>Residences</h4>
            <ul>
              {/* Markets come from content/cities.json — never hardcode them. */}
              {CITY_LIST.map((c) => (
                <li key={c.slug}>
                  <a onClick={() => go(`/residences/${c.slug}`)}>
                    {c.label}{c.comingSoon ? ' · Coming soon' : ''}
                  </a>
                </li>
              ))}
              <li><a onClick={() => go('/residences')}>All residences</a></li>
            </ul>
          </div>
          <div>
            <h4>Residents</h4>
            <ul>
              <li><a href={RESIDENT_PORTAL_URL}>Resident Portal</a></li>
              <li><a href={MAINTENANCE_REQUEST_URL}>Maintenance Request</a></li>
            </ul>
            <h4 style={{ marginTop: 24 }}>Company</h4>
            <ul>
              <li><a onClick={() => go('/why-us')}>Why us</a></li>
              <li><a onClick={() => go('/about')}>About</a></li>
              <li><a onClick={() => go('/careers')}>Careers</a></li>
              <li><a onClick={() => go('/inquire')}>Inquire</a></li>
            </ul>
          </div>
          <div>
            <h4>Connect</h4>
            <ul>
              <li>
                <a
                  href={SETTINGS.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Facebook
                </a>
              </li>
              <li>
                <a
                  href={SETTINGS.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href={SETTINGS.social.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  LinkedIn
                </a>
              </li>
            </ul>
            <div style={{ marginTop: 24 }}>
              <h4 style={{ marginBottom: 10 }}>Inquiries</h4>
              <div style={{ fontSize: 14, color: 'rgba(247,243,236,0.7)' }}>
                {SETTINGS.contactEmail}
              </div>
              <div style={{ fontSize: 14, color: 'rgba(247,243,236,0.7)' }}>
                {SETTINGS.contactPhone}
              </div>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <div>© 2026 {BRAND.name}. All rights reserved.</div>
          <div>Privacy · Terms · Accessibility</div>
        </div>
      </div>
    </footer>
  );
}
