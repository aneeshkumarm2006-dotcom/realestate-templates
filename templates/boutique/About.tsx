'use client';
import { useRouter } from 'next/navigation';
import { ArrowRight } from '@/components/icons';
import { PAGES } from '@/lib/pages';
import { Reveal } from './Reveal';
import { italicLast } from './text';
import './boutique.css';

/* About — a long, quiet, editorial-luxury essay.
   The four story cards become full-width alternating passages, each opened by
   an oversized roman numeral set as a display glyph, with the card's `quote`
   promoted to a pull-statement and the body kept small and calm beneath it.
   Nothing is boxed; the rhythm comes from hairlines and air. */

export default function About() {
  const router = useRouter();
  const { hero, story, standards, figures, cta } = PAGES.about;

  return (
    <main className="page-enter">
      {/* ---------- Hero: the italic/roman contrast is the point ---------- */}
      <section className="b-page-hero">
        <div className="b-container">
          <p className="b-label gold">{hero.eyebrow}</p>
          <h1 className="b-page-title">
            <em>{hero.titleItalic}</em> {hero.titleRest}
          </h1>
          <p className="b-page-sub">{hero.subtitle}</p>
        </div>
      </section>

      {/* ---------- Lead ---------- */}
      <section className="b-section b-essay">
        <div className="b-narrow">
          <Reveal>
            <p className="b-label" style={{ marginBottom: 30 }}>
              {story.eyebrow}
            </p>
            <p className="b-essay-lead">{story.lead}</p>
          </Reveal>
        </div>
      </section>

      {/* ---------- The four passages ---------- */}
      <div className="b-container">
        <div className="b-passages">
          {story.cards.map((c, i) => (
            <Reveal key={c.numeral}>
              <article className={'b-passage' + (i % 2 === 1 ? ' is-flip' : '')}>
                <p className="b-passage-glyph" aria-hidden="true">
                  {c.numeral}
                </p>
                <div className="b-passage-body">
                  <p className="b-label gold">{c.eyebrow}</p>
                  <p className="b-passage-quote">{c.quote}</p>
                  <p className="b-passage-copy">{c.body}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>

      {/* ---------- Close ---------- */}
      <section className="b-section b-essay-close">
        <div className="b-narrow">
          <Reveal>
            <p className="b-close-line">{story.close}</p>
          </Reveal>
        </div>
      </section>

      {/* ---------- Standards: hairline-ruled list ---------- */}
      <section className="b-section">
        <div className="b-container">
          <Reveal>
            <div className="b-standards">
              <div className="b-standards-head">
                <p className="b-label gold" style={{ marginBottom: 18 }}>
                  {standards.eyebrow}
                </p>
                <h2 className="b-h1">{italicLast(standards.title)}</h2>
              </div>
              <ul className="b-standard-list">
                {standards.items.map((s, i) => (
                  <li key={s}>
                    <span className="b-standard-num" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Figures: an airy row of big numerals ---------- */}
      <section className="b-section b-figures-section">
        <div className="b-container">
          <Reveal>
            <div className="b-listing-head">
              <div>
                <p className="b-label gold" style={{ marginBottom: 18 }}>
                  {figures.eyebrow}
                </p>
                <h2 className="b-h1">{italicLast(figures.title)}</h2>
              </div>
              <p className="b-body" style={{ maxWidth: '34ch', margin: 0 }}>
                {figures.blurb}
              </p>
            </div>
          </Reveal>

          <div className="b-figures">
            {figures.items.map((f, i) => (
              <Reveal key={f.value + f.label} delay={Math.min(i * 80, 240)}>
                <div className="b-figure">
                  <p className="b-figure-value">{f.value}</p>
                  <div className="b-figure-rule" />
                  <p className="b-label">{f.label}</p>
                  <p className="b-figure-copy">{f.body}</p>
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
            <p className="b-label gold">{cta.eyebrow}</p>
            <h2 className="b-quiet-title">{italicLast(cta.title)}</h2>
            <button
              type="button"
              className="b-link"
              onClick={() => router.push('/inquire')}
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
