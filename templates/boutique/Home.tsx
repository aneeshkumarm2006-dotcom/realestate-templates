'use client';
import { Fragment, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { SmartImage } from '@/components/SmartImage';
import { ArrowRight } from '@/components/icons';
import {
  CITY_LIST,
  featuredResidences,
  formatPrice,
  bedroomShort,
  type City,
  type Residence,
} from '@/lib/data';
import { PAGES } from '@/lib/pages';
import { Reveal } from './Reveal';
import './boutique.css';

const COMING_SOON_TILE = '/assets/coming-soon.png';

/** Render `text` with its final word italicised — the signature Boutique
 *  display-serif emphasis. Data-driven, so it works with any headline copy. */
function italicLast(text: string): ReactNode {
  const parts = text.trim().split(/\s+/);
  if (parts.length <= 1) return <em>{text}</em>;
  const last = parts.pop() as string;
  return (
    <Fragment>
      {parts.join(' ')} <em>{last}</em>
    </Fragment>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  const router = useRouter();
  const { hero } = PAGES.home;
  return (
    <section className="b-hero">
      <div className="b-hero-head">
        <p className="b-label gold">{hero.eyebrow}</p>
        <h1 className="b-hero-title">{italicLast(hero.title)}</h1>
        <p className="b-hero-sub">{hero.subtitle}</p>
        <div className="b-hero-cta">
          <button
            type="button"
            className="b-link"
            onClick={() => router.push('/residences')}
          >
            Explore residences
            <ArrowRight size={15} className="b-arrow" />
          </button>
        </div>
      </div>
      <Reveal>
        <div className="b-hero-media">
          <SmartImage
            src="/assets/hero-home.png"
            alt="A quiet, light-filled residence interior"
            loading="eager"
            kenBurns
          />
        </div>
      </Reveal>
    </section>
  );
}

/* ---------- Featured (alternating large rows) ---------- */
function FeatureRow({ r, index }: { r: Residence; index: number }) {
  const router = useRouter();
  const to = `/residences/${r.city}/${r.slug}`;
  const flip = index % 2 === 1;
  const isTile = r.heroImage === COMING_SOON_TILE;
  const meta = [r.cityLabel, r.neighbourhood].filter(Boolean).join(' · ');

  return (
    <Reveal>
      <article className={'b-feature' + (flip ? ' is-flip' : '')}>
        <a
          href={to}
          onClick={(e) => {
            e.preventDefault();
            router.push(to);
          }}
          className="b-feature-media"
          aria-label={r.name}
        >
          <SmartImage
            src={r.heroImage}
            alt={r.name}
            fallbackLabel={`${r.name} · exterior`}
            fallbackChar={r.name.charAt(0)}
            style={isTile ? { objectFit: 'contain', background: '#fff' } : undefined}
          />
        </a>
        <div className="b-feature-body">
          <div className="b-feature-index">
            {String(index + 1).padStart(2, '0')}
          </div>
          <p className="b-label" style={{ marginBottom: 14 }}>{meta}</p>
          <h3 className="b-feature-name">{r.name}</h3>
          <p className="b-feature-copy">{r.description}</p>
          <div className="b-feature-spec">
            <span className="b-feature-price">
              From {formatPrice(r.priceFrom)}
            </span>
            <span className="b-label">{bedroomShort(r.bedroomOptions)}</span>
          </div>
          <button
            type="button"
            className="b-link"
            onClick={() => router.push(to)}
          >
            View residence
            <ArrowRight size={15} className="b-arrow" />
          </button>
        </div>
      </article>
    </Reveal>
  );
}

function Featured() {
  const featured = featuredResidences().slice(0, 3);
  if (!featured.length) return null;
  const { featured: copy } = PAGES.home;
  return (
    <section className="b-section">
      <div className="b-container">
        <div className="b-listing-head">
          <div>
            <p className="b-label gold" style={{ marginBottom: 18 }}>{copy.eyebrow}</p>
            <h2 className="b-h1">{italicLast(copy.title)}</h2>
          </div>
        </div>
        <div className="b-features">
          {featured.map((r, i) => (
            <FeatureRow key={r.id} r={r} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Story / philosophy ---------- */
function Story() {
  const router = useRouter();
  const { story, benefits } = PAGES.home;
  return (
    <section className="b-section" style={{ background: 'var(--ivory)' }}>
      <div className="b-narrow">
        <Reveal className="b-story">
          <p className="b-label gold">{story.eyebrow}</p>
          <p className="b-pull">{italicLast(story.title)}</p>
          <p className="b-story-para">{story.paragraph}</p>
          <div style={{ marginTop: 40, display: 'flex', justifyContent: 'center' }}>
            <button type="button" className="b-link" onClick={() => router.push('/about')}>
              {story.ctaLabel}
              <ArrowRight size={15} className="b-arrow" />
            </button>
          </div>
        </Reveal>
      </div>

      <div className="b-container">
        <Reveal>
          <div className="b-benefits">
            {benefits.items.map((b, i) => (
              <div key={b.title} className="b-benefit">
                <div className="b-benefit-num">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3>{b.title}</h3>
                <p>{b.body}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- City bands ---------- */
function CityBand({ c }: { c: City }) {
  const router = useRouter();
  const { cities } = PAGES.home;
  const to = `/residences/${c.slug}`;
  return (
    <Reveal>
      <a
        href={to}
        onClick={(e) => {
          e.preventDefault();
          router.push(to);
        }}
        className={'b-band' + (c.comingSoon ? ' is-soon' : '')}
        aria-label={`${c.label}, ${c.province}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c.image} alt="" aria-hidden="true" />
        <div className="b-band-overlay" />
        {c.comingSoon && (
          <span className="b-band-badge">{cities.comingSoonBadge}</span>
        )}
        <div className="b-band-inner">
          <p className="b-label ivory">{c.province}</p>
          <h3 className="b-band-name">{c.label}</h3>
          <div className="b-band-rule" />
          <p className="b-band-cta">
            {c.comingSoon ? cities.comingSoonCta : cities.liveCta}
          </p>
        </div>
      </a>
    </Reveal>
  );
}

function Cities() {
  const { cities } = PAGES.home;
  return (
    <section className="b-section" style={{ paddingBottom: 0 }}>
      <div className="b-container" style={{ marginBottom: 'clamp(40px, 6vw, 72px)' }}>
        <Reveal>
          <p className="b-label gold" style={{ marginBottom: 18 }}>{cities.eyebrow}</p>
          <h2 className="b-h1" style={{ marginBottom: 22 }}>{italicLast(cities.title)}</h2>
          <p className="b-lead muted" style={{ maxWidth: '52ch' }}>{cities.blurb}</p>
        </Reveal>
      </div>
      <div className="b-bands">
        {CITY_LIST.map((c) => (
          <CityBand key={c.slug} c={c} />
        ))}
      </div>
    </section>
  );
}

/* ---------- Closing CTA ---------- */
function Closing() {
  const router = useRouter();
  const { cta } = PAGES.home;
  return (
    <section className="b-section b-closing">
      <div className="b-narrow">
        <Reveal>
          <p className="b-label gold">{cta.eyebrow}</p>
          <h2 className="b-closing-title">{italicLast(cta.title)}</h2>
          <p className="b-closing-body">{cta.body}</p>
          <div className="b-cta-row">
            <button className="btn btn-primary" onClick={() => router.push('/residences')}>
              {cta.primaryLabel} <ArrowRight size={14} />
            </button>
            <button className="btn btn-ghost" onClick={() => router.push('/inquire')}>
              {cta.secondaryLabel}
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="page-enter">
      <Hero />
      <Featured />
      <Story />
      <Cities />
      <Closing />
    </main>
  );
}
