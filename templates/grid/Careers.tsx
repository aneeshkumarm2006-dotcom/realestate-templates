'use client';
import './grid.css';
import Link from 'next/link';
import { ArrowRight } from '@/components/icons';
import { PAGES } from '@/lib/pages';
import { SETTINGS } from '@/lib/settings';

/** The careers content model (content/pages.json → careers) has no openings
 *  collection — the live state is zero roles, and `openings.noOpeningsMessage`
 *  is the copy for it. The board below is built around that state on purpose;
 *  when a roles feed exists it drops into the same panel as rows. */
const OPEN_ROLE_COUNT = 0;

/** Careers inbox: the site-wide contact address until a careers-specific one
 *  is added to settings. */
const CAREERS_EMAIL = SETTINGS.contactEmail;

/** Grid · Careers — job-board treatment: compact head, a bordered "open roles"
 *  board with a well-designed empty state, a mailto CTA, and benefits as a
 *  dense tile grid. */
export default function Careers() {
  const { hero, openings, benefits } = PAGES.careers;

  return (
    <main className="page-enter">
      <header className="g-pagehead">
        <div className="g-container">
          <nav className="g-crumb" aria-label="Breadcrumb" style={{ marginBottom: 14 }}>
            <Link href="/">Home</Link>
            <span className="sep" aria-hidden="true">/</span>
            <span className="cur" aria-current="page">Careers</span>
          </nav>
          <span className="g-label">{hero.eyebrow}</span>
          <h1 className="g-page-title">{hero.title}</h1>
          <p className="g-page-sub">{hero.subtitle}</p>
        </div>
      </header>

      {/* 1 · The board */}
      <section className="g-section">
        <div className="g-container">
          <div className="g-section-head">
            <div>
              <span className="g-label">{openings.eyebrow}</span>
              <h2 className="g-section-title">{openings.title}</h2>
            </div>
            <span className="g-count-chip">
              <b className="g-num">{OPEN_ROLE_COUNT}</b> open roles
            </span>
          </div>

          <div className="g-roles">
            <div className="g-roles-empty">
              <span className="g-roles-mark" aria-hidden="true">—</span>
              <p className="g-roles-msg">{openings.noOpeningsMessage}</p>
            </div>

            <div className="g-roles-foot">
              <p>
                {openings.contactIntro}{' '}
                <a className="g-mail" href={`mailto:${CAREERS_EMAIL}`}>
                  {CAREERS_EMAIL}
                </a>
                .
              </p>
              <Link href="/inquire" className="btn btn-primary btn-sm">
                {openings.buttonLabel} <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2 · Benefits — dense tile grid */}
      <section className="g-section alt">
        <div className="g-container">
          <div className="g-section-head">
            <div>
              <span className="g-label">{benefits.eyebrow}</span>
              <h2 className="g-section-title">{benefits.title}</h2>
            </div>
          </div>

          {benefits.items.length > 0 ? (
            <ul className="g-benefits">
              {benefits.items.map((b, i) => (
                <li key={b} className="g-benefit">
                  <span className="n g-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="g-empty">
              <p>Benefits are being finalised.</p>
              <span>Email us and we&apos;ll walk you through the package.</span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
