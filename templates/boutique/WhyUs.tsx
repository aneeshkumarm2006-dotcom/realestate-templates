'use client';
import { useRouter } from 'next/navigation';
import { ArrowRight } from '@/components/icons';
import { PAGES } from '@/lib/pages';
import { Reveal } from './Reveal';
import { italicLast, splitNumeralEyebrow } from './text';
import './boutique.css';

/* Why us — the pull quote IS the hero. Enormous italic Fraunces, attribution
   tiny and tracked beneath it. The pillars are large stacked passages rather
   than a card grid, and the stats land as one spacious dark band (gold-soft on
   --ink; --gold fails contrast there). */

export default function WhyUs() {
  const router = useRouter();
  const { hero, intro, pillars, stats, cta } = PAGES.whyUs;

  return (
    <main className="page-enter">
      {/* ---------- Hero ---------- */}
      <section className="b-page-hero">
        <div className="b-container">
          <p className="b-label gold">{hero.eyebrow}</p>
          <h1 className="b-page-title">{italicLast(hero.title)}</h1>
        </div>
      </section>

      {/* ---------- The quote ---------- */}
      <section className="b-section b-quote-section">
        <div className="b-container">
          <Reveal>
            <figure className="b-quote">
              <blockquote className="b-quote-text">
                &ldquo;{intro.pullQuote}&rdquo;
              </blockquote>
              <figcaption className="b-label b-quote-attrib">
                {intro.attribution}
              </figcaption>
            </figure>
          </Reveal>

          <Reveal>
            <div className="b-intro-cols">
              <p className="b-intro-para">{intro.paragraph1}</p>
              <p className="b-intro-para is-muted">{intro.paragraph2}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Pillars: stacked passages ---------- */}
      <section className="b-section b-pillars-section">
        <div className="b-container">
          {pillars.map((p, i) => {
            const { numeral, label } = splitNumeralEyebrow(p.eyebrow, i);
            return (
              <Reveal key={p.title}>
                <article className="b-pillar">
                  <div className="b-pillar-mark">
                    <p className="b-pillar-num" aria-hidden="true">
                      {numeral}
                    </p>
                    <p className="b-label">{label}</p>
                  </div>
                  <div className="b-pillar-body">
                    <h2 className="b-pillar-title">{italicLast(p.title)}</h2>
                    <p className="b-pillar-copy">{p.body}</p>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ---------- Stats band ---------- */}
      <section className="b-section b-statband">
        <div className="b-container">
          <div className="b-stats">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={Math.min(i * 90, 270)}>
                <div className="b-stat">
                  <p className="b-stat-value">{s.value}</p>
                  <div className="b-stat-rule" />
                  <p className="b-label ivory">{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Closing invitation ---------- */}
      <section className="b-section b-quiet-cta">
        <div className="b-narrow">
          <Reveal>
            <h2 className="b-quiet-title" style={{ marginTop: 0 }}>
              {italicLast(cta.title)}
            </h2>
            <button
              type="button"
              className="b-link"
              onClick={() => router.push('/residences')}
            >
              {cta.buttonLabel}
              <ArrowRight size={15} className="b-arrow" />
            </button>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
