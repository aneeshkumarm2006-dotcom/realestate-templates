'use client';
import './grid.css';
import Link from 'next/link';
import { ArrowRight } from '@/components/icons';
import { PAGES } from '@/lib/pages';

/** Pillar eyebrows in content are already numbered ("I · OWNERSHIP"). Split on
 *  the middle dot so the numeral can carry the accent and the label stays a
 *  micro-label — and fall back to the positional index when an editor writes an
 *  un-numbered eyebrow. Every character of the field is still rendered. */
function splitEyebrow(raw: string, i: number): { num: string; label: string } {
  const parts = raw.split('·');
  if (parts.length > 1) {
    return { num: parts[0].trim(), label: parts.slice(1).join('·').trim() };
  }
  return { num: String(i + 1).padStart(2, '0'), label: raw.trim() };
}

/** Grid · Why us — compact head, the pull-quote as a bordered callout (no serif
 *  flourish), pillars as a bordered card grid, a dark stat strip (accents in
 *  --gold-soft for contrast on dark), and a flat CTA. */
export default function WhyUs() {
  const { hero, intro, pillars, stats, cta } = PAGES.whyUs;

  return (
    <main className="page-enter">
      <header className="g-pagehead">
        <div className="g-container">
          <nav className="g-crumb" aria-label="Breadcrumb" style={{ marginBottom: 14 }}>
            <Link href="/">Home</Link>
            <span className="sep" aria-hidden="true">/</span>
            <span className="cur" aria-current="page">Why us</span>
          </nav>
          <span className="g-label">{hero.eyebrow}</span>
          <h1 className="g-page-title">{hero.title}</h1>
        </div>
      </header>

      {/* 1 · Intro — bordered callout + running copy */}
      <section className="g-section">
        <div className="g-container">
          <div className="g-two">
            <figure className="g-callout">
              <blockquote>{intro.pullQuote}</blockquote>
              <figcaption className="g-label">{intro.attribution}</figcaption>
            </figure>
            <div className="g-prose">
              <p>{intro.paragraph1}</p>
              <p>{intro.paragraph2}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2 · Pillars — bordered card grid with numbered eyebrows */}
      <section className="g-section alt">
        <div className="g-container">
          <div className="g-panels">
            {pillars.map((p, i) => {
              const { num, label } = splitEyebrow(p.eyebrow, i);
              return (
                <article key={p.title} className="g-panel">
                  <div className="g-panel-head">
                    <span className="g-panel-num g-num">{num}</span>
                    <span className="g-label">{label}</span>
                  </div>
                  <h2 className="g-panel-title">{p.title}</h2>
                  <p className="g-panel-body">{p.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3 · Dark stat strip */}
      {stats.length > 0 && (
        <section className="g-strip" aria-label="Key figures">
          <div className="g-strip-inner">
            {stats.map((s) => (
              <div key={s.label} className="g-strip-cell">
                <div className="g-strip-val g-num">{s.value}</div>
                <div className="g-strip-label">{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4 · CTA band */}
      <section className="g-section">
        <div className="g-container">
          <div className="g-cta">
            <div>
              <h2>{cta.title}</h2>
            </div>
            <div className="g-cta-actions">
              <Link href="/residences" className="btn btn-primary">
                {cta.buttonLabel} <ArrowRight size={14} />
              </Link>
              <Link
                href="/inquire"
                className="btn btn-ghost-ivory btn-sm"
                style={{ borderRadius: 'var(--g-radius)' }}
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
