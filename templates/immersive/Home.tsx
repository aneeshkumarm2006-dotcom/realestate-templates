'use client';
import { useRouter } from 'next/navigation';
import { PropertyCard } from '@/components/PropertyCard';
import { ArrowRight } from '@/components/icons';
import { CITY_LIST, featuredResidences } from '@/lib/data';
import { PAGES } from '@/lib/pages';
import { ScrollHouseHero } from './ScrollHouseHero';
import './immersive.css';

export default function Home() {
  const router = useRouter();
  const featured = featuredResidences().slice(0, 3);
  const { featured: featuredCopy, cities, cta } = PAGES.home;

  return (
    <main className="page-enter">
      {/* The whole point of this template. Everything below is the quiet
          aftermath — the hero has already done the selling. */}
      <ScrollHouseHero />

      <section className="im-section">
        <div className="im-wrap">
          <div className="im-head">
            <div>
              <p className="im-eyebrow">{featuredCopy.eyebrow}</p>
              <h2 className="im-h2">{featuredCopy.title}</h2>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => router.push('/residences')}>
              {featuredCopy.viewAllLabel} <ArrowRight size={13} />
            </button>
          </div>
          <div className="im-grid3">
            {featured.map((r) => (
              <PropertyCard key={r.id} residence={r} />
            ))}
          </div>
        </div>
      </section>

      <section className="im-section" style={{ background: 'var(--cream)' }}>
        <div className="im-wrap">
          <div className="im-head">
            <div>
              <p className="im-eyebrow">{cities.eyebrow}</p>
              <h2 className="im-h2">{cities.title}</h2>
            </div>
            <p className="im-sub" style={{ maxWidth: 380, margin: 0, textShadow: 'none' }}>
              {cities.blurb}
            </p>
          </div>
          <div className="im-cities">
            {/* Markets come from content/cities.json — never hardcode them. */}
            {CITY_LIST.map((c) => (
              <a key={c.slug} className="im-city" onClick={() => router.push(`/residences/${c.slug}`)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image} alt={c.label} loading="lazy" />
                <span className="im-city-overlay" />
                <span className="im-city-label">
                  {c.comingSoon && <span className="im-city-soon">{cities.comingSoonBadge}</span>}
                  <span className="im-city-name" style={{ display: 'block' }}>{c.label}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="im-cta">
        <p className="im-eyebrow">{cta.eyebrow}</p>
        <h2 className="im-h2">{cta.title}</h2>
        <div className="im-cta-row">
          <button className="btn btn-primary" onClick={() => router.push('/residences')}>
            {cta.primaryLabel} <ArrowRight size={14} />
          </button>
          <button className="btn btn-ghost-ivory" onClick={() => router.push('/inquire')}>
            {cta.secondaryLabel}
          </button>
        </div>
      </section>
    </main>
  );
}
