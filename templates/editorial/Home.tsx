'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eyebrow } from '@/components/Eyebrow';
import { SmartImage } from '@/components/SmartImage';
import { PropertyCard } from '@/components/PropertyCard';
import { useTilt } from '@/components/useTilt';
import { ArrowRight, SearchIcon } from '@/components/icons';
import { Dropdown } from '@/components/ui/Dropdown';
import {
  COMING_SOON_CITIES,
  LIVE_CITIES,
  featuredResidences,
  type City,
} from '@/lib/data';
import { BRAND } from '@/lib/brand';
import { PAGES } from '@/lib/pages';

/* ------------------------------------------------------------------ */
/* 02 · Hero + rental search bar                                       */
/* ------------------------------------------------------------------ */
const CITY_OPTIONS = [
  { value: '', label: 'All cities' },
  ...LIVE_CITIES.map((c) => ({ value: c.slug, label: c.label })),
];
const RENT_OPTIONS = [
  { value: '', label: 'Any' },
  { value: '1400', label: 'Up to $1,400' },
  { value: '1600', label: 'Up to $1,600' },
  { value: '1800', label: 'Up to $1,800' },
  { value: '2200', label: 'Up to $2,200' },
];
const BED_OPTIONS = [
  { value: '', label: 'Any' },
  { value: '0', label: 'Studio' },
  { value: '1', label: '1 Bedroom' },
  { value: '2', label: '2 Bedrooms' },
  { value: '3', label: '3+ Bedrooms' },
];

function CinematicHero({
  onSearch,
}: {
  onSearch: (v: { city: string; maxRent: string; beds: string }) => void;
}) {
  const [city, setCity] = useState('');
  const [maxRent, setMaxRent] = useState('');
  const [beds, setBeds] = useState('');

  return (
    <section
      style={{
        position: 'relative',
        height: 'calc(100vh - var(--header-h))',
        minHeight: 640,
        overflow: 'hidden',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/hero-home.png"
        alt={`A resident at home with her dog in a ${BRAND.name} apartment`}
        loading="eager"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          // Anchor near the top so the resident's head is always fully in frame.
          objectPosition: 'center top',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to bottom, rgba(10,25,41,0.58) 0%, rgba(10,25,41,0.40) 45%, rgba(10,25,41,0.66) 100%)',
        }}
      />
      <div
        style={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '0 24px',
        }}
      >
        <div
          className="eyebrow gold"
          style={{
            marginBottom: 26,
            fontFamily: 'var(--serif)',
            fontStyle: 'italic',
            textTransform: 'none',
            fontSize: 16,
            letterSpacing: '0.18em',
          }}
        >
          {PAGES.home.hero.eyebrow}
        </div>
        <h1 className="display" style={{ color: 'var(--ivory)', maxWidth: 1040 }}>
          {PAGES.home.hero.title}
        </h1>
        <p
          className="body"
          style={{
            color: 'rgba(247,243,236,0.88)',
            fontWeight: 300,
            marginTop: 22,
            fontSize: 19,
            maxWidth: 600,
          }}
        >
          {PAGES.home.hero.subtitle}
        </p>

        {/* Rental search bar, City · Max Rent · Bedrooms · Search */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSearch({ city, maxRent, beds });
          }}
          className="hero-search"
          style={{
            marginTop: 44,
            background: 'var(--ivory)',
            width: 'min(880px, 96%)',
            padding: 8,
            display: 'flex',
            alignItems: 'stretch',
            gap: 0,
            border: '1px solid var(--hairline)',
            flexWrap: 'wrap',
          }}
        >
          <label style={{ flex: 1, minWidth: 150, display: 'flex', flexDirection: 'column' }}>
            <span className="eyebrow" style={{ padding: '8px 16px 0', fontSize: 10 }}>City</span>
            <Dropdown variant="site" ariaLabel="City" value={city} onChange={setCity} options={CITY_OPTIONS} />
          </label>
          <span className="hero-search-div" />
          <label style={{ flex: 1, minWidth: 150, display: 'flex', flexDirection: 'column' }}>
            <span className="eyebrow" style={{ padding: '8px 16px 0', fontSize: 10 }}>Max rent</span>
            <Dropdown variant="site" ariaLabel="Max rent" value={maxRent} onChange={setMaxRent} options={RENT_OPTIONS} />
          </label>
          <span className="hero-search-div" />
          <label style={{ flex: 1, minWidth: 150, display: 'flex', flexDirection: 'column' }}>
            <span className="eyebrow" style={{ padding: '8px 16px 0', fontSize: 10 }}>Bedrooms</span>
            <Dropdown variant="site" ariaLabel="Bedrooms" value={beds} onChange={setBeds} options={BED_OPTIONS} />
          </label>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ margin: 4, display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <SearchIcon size={16} /> {PAGES.home.hero.searchButton}
          </button>
        </form>
        <p style={{ marginTop: 14, color: 'rgba(247,243,236,0.7)', fontSize: 12.5 }}>
          {PAGES.home.hero.disclaimer}
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 04 · Our cities                                                     */
/* ------------------------------------------------------------------ */
function CityCard({ c, comingSoon }: { c: City; comingSoon?: boolean }) {
  const router = useRouter();
  const tiltRef = useTilt<HTMLAnchorElement>(comingSoon ? 0 : 4);
  return (
    <a
      ref={tiltRef}
      onClick={() => router.push(`/residences/${c.slug}`)}
      className="city-card"
      style={comingSoon ? { filter: 'grayscale(0.7)', opacity: 0.82 } : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={c.image} alt={c.label} />
      <div className="overlay" />
      {comingSoon && (
        <div
          className="eyebrow"
          style={{
            position: 'absolute', top: 16, left: 16, zIndex: 2,
            background: 'rgba(10,25,41,0.72)', color: 'var(--gold)',
            padding: '6px 12px', fontSize: 10,
          }}
        >
          {PAGES.home.cities.comingSoonBadge}
        </div>
      )}
      <div className="label">
        <div className="eyebrow" style={{ color: 'rgba(247,243,236,0.7)' }}>
          {c.province}
        </div>
        <div className="serif" style={{ fontSize: 32, fontWeight: 500, marginTop: 4 }}>
          {c.label}
        </div>
        <div className="gold-rule" />
        <div className="small" style={{ color: 'rgba(247,243,236,0.82)', marginTop: 6 }}>
          {comingSoon ? PAGES.home.cities.comingSoonCta : PAGES.home.cities.liveCta}
        </div>
      </div>
    </a>
  );
}

function OurCities() {
  const cities = LIVE_CITIES;
  return (
    <section className="section bg-ivory">
      <div className="container">
        <div
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'end',
            marginBottom: 56, flexWrap: 'wrap', gap: 16,
          }}
        >
          <div>
            <Eyebrow style={{ marginBottom: 18 }}>{PAGES.home.cities.eyebrow}</Eyebrow>
            <h2 className="h2 serif">{PAGES.home.cities.title}</h2>
          </div>
          <p className="body muted" style={{ maxWidth: 400, margin: 0 }}>
            {PAGES.home.cities.blurb}
          </p>
        </div>
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}
          className="city-carousel-grid"
        >
          {cities.map((c) => (
            <CityCard key={c.slug} c={c} />
          ))}
          {COMING_SOON_CITIES.map((c) => (
            <CityCard key={c.slug} c={c} comingSoon />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 05 · Featured residences                                            */
/* ------------------------------------------------------------------ */
function FeaturedResidences() {
  const router = useRouter();
  const featured = featuredResidences().slice(0, 6);
  return (
    <section className="section bg-cream">
      <div className="container">
        <div
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'end',
            marginBottom: 48, flexWrap: 'wrap', gap: 16,
          }}
        >
          <div>
            <Eyebrow style={{ marginBottom: 18 }}>{PAGES.home.featured.eyebrow}</Eyebrow>
            <h2 className="h2 serif">{PAGES.home.featured.title}</h2>
          </div>
          <button className="btn btn-ghost" onClick={() => router.push('/residences')}>
            {PAGES.home.featured.viewAllLabel} <ArrowRight size={14} />
          </button>
        </div>
        <div className="home-cards-3">
          {featured.map((r) => (
            <PropertyCard key={r.id} residence={r} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 06 · Why rent with us                                               */
/* ------------------------------------------------------------------ */
function WhyRent() {
  return (
    <section className="section bg-ivory">
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 56, maxWidth: 680, margin: '0 auto 56px' }}>
          <Eyebrow style={{ marginBottom: 18 }}>{PAGES.home.benefits.eyebrow}</Eyebrow>
          <h2 className="h2 serif" style={{ marginBottom: 18 }}>{PAGES.home.benefits.title}</h2>
          <p className="body muted" style={{ fontSize: 17 }}>
            {PAGES.home.benefits.subtitle}
          </p>
        </div>
        <div className="home-cards-4">
          {PAGES.home.benefits.items.map((b, i) => (
            <div key={b.title} style={{ borderTop: '2px solid var(--gold)', paddingTop: 24 }}>
              <div className="serif italic" style={{ fontSize: 20, color: 'var(--gold)', marginBottom: 16 }}>
                0{i + 1}
              </div>
              <h3 className="h3 serif" style={{ marginBottom: 12 }}>{b.title}</h3>
              <p className="body muted" style={{ fontSize: 15, lineHeight: 1.7 }}>{b.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 07 · How to rent                                                    */
/* ------------------------------------------------------------------ */
function HowToRent() {
  return (
    <section className="section bg-ink">
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <Eyebrow style={{ marginBottom: 18 }}>{PAGES.home.steps.eyebrow}</Eyebrow>
          <h2 className="h2 serif" style={{ color: 'var(--ivory)' }}>{PAGES.home.steps.title}</h2>
        </div>
        <div className="steps-grid">
          {PAGES.home.steps.items.map((s, i) => (
            <div key={s} style={{ textAlign: 'center' }}>
              <div
                className="serif"
                style={{
                  width: 56, height: 56, borderRadius: '50%', margin: '0 auto 18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid var(--gold)', color: 'var(--gold)', fontSize: 22,
                }}
              >
                {i + 1}
              </div>
              <div className="serif" style={{ color: 'var(--ivory)', fontSize: 17, fontWeight: 500 }}>{s}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 10 · Our story / heritage                                           */
/* ------------------------------------------------------------------ */
function StoryStrip() {
  const router = useRouter();
  return (
    <section className="section bg-ivory">
      <div className="container">
        <div
          style={{
            display: 'grid', gridTemplateColumns: '1.05fr 1fr',
            gap: 'clamp(40px, 7vw, 96px)', alignItems: 'center',
          }}
          className="grid-3-md1"
        >
          <div style={{ aspectRatio: '4 / 5', overflow: 'hidden' }}>
            <SmartImage
              src="/assets/texture-detail.jpg"
              alt="Architectural detail · brick masonry"
              fallbackLabel="Architectural detail"
              fallbackTone="deep"
              fallbackChar={BRAND.shortName.charAt(0)}
            />
          </div>
          <div>
            <Eyebrow style={{ marginBottom: 24 }}>{PAGES.home.story.eyebrow}</Eyebrow>
            <h2 className="h2 serif" style={{ marginBottom: 28 }}>
              {PAGES.home.story.title}
            </h2>
            <p className="body muted" style={{ fontSize: 17, maxWidth: 540, marginBottom: 28 }}>
              {PAGES.home.story.paragraph}
            </p>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 36 }}
              className="story-timeline"
            >
              {PAGES.home.story.timeline.map((m) => (
                <div key={m.year} style={{ borderLeft: '2px solid var(--gold)', paddingLeft: 14 }}>
                  <div className="serif" style={{ fontSize: 20, fontWeight: 500 }}>{m.year}</div>
                  <div className="small muted">{m.label}</div>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost" onClick={() => router.push('/about')}>
              {PAGES.home.story.ctaLabel} <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 11 · Inquiry CTA                                                    */
/* ------------------------------------------------------------------ */
function InquireCTA() {
  const router = useRouter();
  return (
    <section className="section bg-cream" style={{ textAlign: 'center' }}>
      <div className="container-narrow">
        <Eyebrow style={{ marginBottom: 22 }}>{PAGES.home.cta.eyebrow}</Eyebrow>
        <h2 className="h2 serif" style={{ marginBottom: 24 }}>{PAGES.home.cta.title}</h2>
        <p className="body muted" style={{ fontSize: 18, maxWidth: 520, margin: '0 auto 40px' }}>
          {PAGES.home.cta.body}
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => router.push('/residences')}>
            {PAGES.home.cta.primaryLabel} <ArrowRight size={14} />
          </button>
          <button className="btn btn-ghost" onClick={() => router.push('/inquire')}>
            {PAGES.home.cta.secondaryLabel}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function HomePage() {
  const router = useRouter();

  const onSearch = ({ city, maxRent, beds }: { city: string; maxRent: string; beds: string }) => {
    const sp = new URLSearchParams();
    if (city) sp.set('q', city);
    if (maxRent) sp.set('maxRent', maxRent);
    if (beds) sp.set('beds', beds);
    const qs = sp.toString();
    router.push(qs ? `/residences?${qs}` : '/residences');
  };

  return (
    <main className="page-enter">
      <CinematicHero onSearch={onSearch} />
      <OurCities />
      <FeaturedResidences />
      <WhyRent />
      <HowToRent />
      <StoryStrip />
      <InquireCTA />
    </main>
  );
}
