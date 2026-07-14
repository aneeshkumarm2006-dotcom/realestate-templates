'use client';
import './grid.css';
import Link from 'next/link';
import { ArrowRight } from '@/components/icons';
import { PAGES } from '@/lib/pages';

/** Grid · About — a fact-driven company page, not a magazine essay.
 *  Compact head, the figures as bordered stat tiles, the story as numbered
 *  panels, the standards as a tight hairline checklist, flat CTA band.
 *  All copy comes from content/pages.json (PAGES.about) — nothing hardcoded. */
export default function About() {
  const { hero, story, standards, figures, cta } = PAGES.about;

  return (
    <main className="page-enter">
      <header className="g-pagehead">
        <div className="g-container">
          <nav className="g-crumb" aria-label="Breadcrumb" style={{ marginBottom: 14 }}>
            <Link href="/">Home</Link>
            <span className="sep" aria-hidden="true">/</span>
            <span className="cur" aria-current="page">About</span>
          </nav>
          <span className="g-label">{hero.eyebrow}</span>
          <h1 className="g-page-title">
            {hero.titleItalic} <span className="g-num accent">{hero.titleRest}</span>
          </h1>
          <p className="g-page-sub">{hero.subtitle}</p>
        </div>
      </header>

      {/* 1 · By the numbers — bordered stat tiles, big grotesk numerals */}
      <section className="g-section">
        <div className="g-container">
          <div className="g-section-head">
            <div>
              <span className="g-label">{figures.eyebrow}</span>
              <h2 className="g-section-title">{figures.title}</h2>
            </div>
            <p className="g-result-count" style={{ maxWidth: 380 }}>{figures.blurb}</p>
          </div>

          {figures.items.length > 0 ? (
            <div className="g-stats">
              {figures.items.map((f) => (
                <div key={`${f.value}-${f.label}`} className="g-stat">
                  <div className="g-stat-val g-num">{f.value}</div>
                  <span className="g-label">{f.label}</span>
                  <p>{f.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="g-empty">
              <p>No figures published yet.</p>
              <span>This section fills in as the portfolio grows.</span>
            </div>
          )}
        </div>
      </section>

      {/* 2 · Story — numbered panels, 2×2 */}
      <section className="g-section alt">
        <div className="g-container">
          <div className="g-section-head">
            <div>
              <span className="g-label">{story.eyebrow}</span>
              <p className="g-section-lead">{story.lead}</p>
            </div>
          </div>

          <div className="g-panels two">
            {story.cards.map((c, i) => (
              <article key={c.numeral || i} className="g-panel">
                <div className="g-panel-head">
                  <span className="g-panel-num g-num">{c.numeral || String(i + 1).padStart(2, '0')}</span>
                  <span className="g-label">{c.eyebrow}</span>
                </div>
                <h3 className="g-panel-title">{c.quote}</h3>
                <p className="g-panel-body">{c.body}</p>
              </article>
            ))}
          </div>

          <p className="g-section-foot">{story.close}</p>
        </div>
      </section>

      {/* 3 · Standards — tight checklist on hairline dividers */}
      <section className="g-section">
        <div className="g-container">
          <div className="g-split">
            <div>
              <span className="g-label">{standards.eyebrow}</span>
              <h2 className="g-section-title">{standards.title}</h2>
            </div>
            <ol className="g-checklist">
              {standards.items.map((s, i) => (
                <li key={s}>
                  <span className="n g-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* 4 · CTA band */}
      <section className="g-section alt">
        <div className="g-container">
          <div className="g-cta">
            <div>
              <span className="g-label" style={{ color: 'var(--gold-soft)' }}>{cta.eyebrow}</span>
              <h2>{cta.title}</h2>
            </div>
            <div className="g-cta-actions">
              <Link href="/inquire" className="btn btn-primary">
                {cta.buttonLabel} <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
