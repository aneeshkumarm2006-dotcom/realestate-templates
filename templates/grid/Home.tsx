'use client';
import './grid.css';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SearchIcon, ArrowRight } from '@/components/icons';
import {
  CITY_LIST,
  LIVE_CITIES,
  RESIDENCES,
  featuredResidences,
} from '@/lib/data';
import { PAGES } from '@/lib/pages';
import { GCard } from './GCard';

const COMING_SOON = '/assets/coming-soon.png';

// City options carry the city LABEL as the query value so the text search
// (which matches against cityLabel) resolves cleanly on the results page.
const CITY_OPTIONS = [
  { value: '', label: 'All cities' },
  ...LIVE_CITIES.map((c) => ({ value: c.label, label: c.label })),
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
  { value: '1', label: '1+' },
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
];

function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [maxRent, setMaxRent] = useState('');
  const [beds, setBeds] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (maxRent) sp.set('maxRent', maxRent);
    if (beds) sp.set('beds', beds);
    const s = sp.toString();
    router.push(s ? `/residences?${s}` : '/residences');
  };

  return (
    <form className="g-searchbar" onSubmit={submit}>
      <div className="g-sb-field">
        <label htmlFor="g-sb-city">City</label>
        <select id="g-sb-city" value={q} onChange={(e) => setQ(e.target.value)}>
          {CITY_OPTIONS.map((o) => (
            <option key={o.label} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="g-sb-field">
        <label htmlFor="g-sb-rent">Max rent</label>
        <select id="g-sb-rent" value={maxRent} onChange={(e) => setMaxRent(e.target.value)}>
          {RENT_OPTIONS.map((o) => (
            <option key={o.label} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="g-sb-field">
        <label htmlFor="g-sb-beds">Beds</label>
        <select id="g-sb-beds" value={beds} onChange={(e) => setBeds(e.target.value)}>
          {BED_OPTIONS.map((o) => (
            <option key={o.label} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <button type="submit" className="g-sb-btn">
        <SearchIcon size={15} /> {PAGES.home.hero.searchButton}
      </button>
    </form>
  );
}

export default function Home() {
  const featured = featuredResidences().slice(0, 8);
  const hero = PAGES.home.hero;
  const cta = PAGES.home.cta;
  const steps = PAGES.home.steps;
  const citiesCopy = PAGES.home.cities;

  return (
    <main className="page-enter">
      {/* 1 · Compact hero band + search */}
      <section className="g-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="g-hero-bg" src="/assets/hero-home.png" alt="" aria-hidden="true" loading="eager" />
        <div className="g-hero-scrim" />
        <div className="g-hero-inner">
          <span className="g-label" style={{ color: 'var(--gold-soft)' }}>{hero.eyebrow}</span>
          <h1 className="g-hero-title" style={{ marginTop: 8 }}>{hero.title}</h1>
          <p className="g-hero-sub">{hero.subtitle}</p>
          <HeroSearch />
          <p className="g-hero-note">{hero.disclaimer}</p>
        </div>
      </section>

      {/* 2 · Trust / stat strip */}
      <div className="g-trust">
        <div className="g-trust-inner">
          <span className="g-trust-item"><b className="g-num">{RESIDENCES.length}</b> residences</span>
          <span className="g-trust-sep" aria-hidden="true">·</span>
          <span className="g-trust-item"><b className="g-num">{LIVE_CITIES.length}</b> {LIVE_CITIES.length === 1 ? 'city' : 'cities'}</span>
          <span className="g-trust-sep" aria-hidden="true">·</span>
          <span className="g-trust-item">Net-effective pricing, no surprises at signing</span>
        </div>
      </div>

      {/* 3 · Featured grid — the star */}
      <section className="g-section">
        <div className="g-container">
          <div className="g-section-head">
            <div>
              <span className="g-label">{PAGES.home.featured.eyebrow}</span>
              <h2 className="g-section-title">{PAGES.home.featured.title}</h2>
            </div>
            <Link href="/residences" className="btn btn-ghost btn-sm">
              {PAGES.home.featured.viewAllLabel} <ArrowRight size={14} />
            </Link>
          </div>
          {featured.length > 0 ? (
            <div className="g-grid">
              {featured.map((r) => (
                <GCard key={r.id} residence={r} />
              ))}
            </div>
          ) : (
            <div className="g-empty">
              <p>No featured residences right now.</p>
              <span>Browse the full portfolio to see what&apos;s available.</span>
            </div>
          )}
        </div>
      </section>

      {/* 4 · Cities */}
      <section className="g-section alt">
        <div className="g-container">
          <div className="g-section-head">
            <div>
              <span className="g-label">{citiesCopy.eyebrow}</span>
              <h2 className="g-section-title">{citiesCopy.title}</h2>
            </div>
            <p className="g-result-count" style={{ maxWidth: 360 }}>{citiesCopy.blurb}</p>
          </div>
          <div className="g-cities">
            {CITY_LIST.map((c) => {
              const placeholder = !c.image || c.image === COMING_SOON;
              return (
                <Link
                  key={c.slug}
                  href={`/residences/${c.slug}`}
                  className={'g-city' + (c.comingSoon ? ' soon' : '')}
                  aria-label={`${c.label}, ${c.province}${c.comingSoon ? ' (coming soon)' : ''}`}
                >
                  {!placeholder && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image} alt="" aria-hidden="true" loading="lazy" />
                  )}
                  <div className="g-city-scrim" />
                  {c.comingSoon && <span className="g-city-badge">{citiesCopy.comingSoonBadge}</span>}
                  <div className="g-city-body">
                    <div className="g-city-prov">{c.province}</div>
                    <div className="g-city-name">{c.label}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5 · How it works */}
      <section className="g-section">
        <div className="g-container">
          <div className="g-section-head">
            <div>
              <span className="g-label">{steps.eyebrow}</span>
              <h2 className="g-section-title">{steps.title}</h2>
            </div>
          </div>
          <div className="g-steps">
            {steps.items.map((s, i) => (
              <div key={s} className="g-step">
                <div className="g-step-num g-num">{String(i + 1).padStart(2, '0')}</div>
                <div className="g-step-text">{s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6 · CTA band */}
      <section className="g-section alt">
        <div className="g-container">
          <div className="g-cta">
            <div>
              <span className="g-label" style={{ color: 'var(--gold-soft)' }}>{cta.eyebrow}</span>
              <h2>{cta.title}</h2>
              <p>{cta.body}</p>
            </div>
            <div className="g-cta-actions">
              <Link href="/residences" className="btn btn-primary">
                {cta.primaryLabel} <ArrowRight size={14} />
              </Link>
              <Link href="/inquire" className="btn btn-ghost-ivory btn-sm" style={{ borderRadius: 'var(--g-radius)' }}>
                {cta.secondaryLabel}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
