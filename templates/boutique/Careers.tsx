'use client';
import { useRouter } from 'next/navigation';
import { ArrowRight } from '@/components/icons';
import { PAGES } from '@/lib/pages';
import { SETTINGS } from '@/lib/settings';
import { Reveal } from './Reveal';
import { italicLast } from './text';
import './boutique.css';

/* Careers — a spacious, understated invitation.
   There are genuinely no openings in the data, so the empty state is the design
   rather than something to hide: a generous hairline-ruled band, the message in
   large italic Fraunces, and an elegant mailto line under it.

   The résumé inbox is the site-wide contact address until a careers-specific one
   is configured in the CMS (content/settings.json). */
const CAREERS_EMAIL = SETTINGS.contactEmail;

export default function Careers() {
  const router = useRouter();
  const { hero, openings, benefits } = PAGES.careers;

  return (
    <main className="page-enter">
      {/* ---------- Hero ---------- */}
      <section className="b-page-hero">
        <div className="b-container">
          <p className="b-label gold">{hero.eyebrow}</p>
          <h1 className="b-page-title">{italicLast(hero.title)}</h1>
          <p className="b-page-sub">{hero.subtitle}</p>
        </div>
      </section>

      {/* ---------- Openings (empty, by design) ---------- */}
      <section className="b-section">
        <div className="b-container">
          <Reveal>
            <div className="b-openings">
              <p className="b-label gold">{openings.eyebrow}</p>
              <h2 className="b-openings-title">{italicLast(openings.title)}</h2>
              <p className="b-openings-msg">{openings.noOpeningsMessage}</p>

              <p className="b-openings-note">{openings.contactIntro}</p>
              <a className="b-mailto" href={`mailto:${CAREERS_EMAIL}`}>
                {CAREERS_EMAIL}
              </a>

              <div className="b-openings-cta">
                <button
                  type="button"
                  className="b-link"
                  onClick={() => router.push('/inquire')}
                >
                  {openings.buttonLabel}
                  <ArrowRight size={15} className="b-arrow" />
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Benefits: two-column hairline list ---------- */}
      <section className="b-section b-benefits-section">
        <div className="b-container">
          <Reveal>
            <div className="b-listing-head">
              <div>
                <p className="b-label gold" style={{ marginBottom: 18 }}>
                  {benefits.eyebrow}
                </p>
                <h2 className="b-h1">{italicLast(benefits.title)}</h2>
              </div>
            </div>
          </Reveal>

          <Reveal>
            <ul className="b-blist">
              {benefits.items.map((b, i) => (
                <li key={b}>
                  <span className="b-blist-num" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="b-blist-text">{b}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
