'use client';
import { useRouter } from 'next/navigation';
import { Eyebrow } from '@/components/Eyebrow';
import { SmartImage } from '@/components/SmartImage';
import { ParallaxImage } from '@/components/ParallaxImage';
import { ArrowRight } from '@/components/icons';
import { CITY_LIST } from '@/lib/data';
import { PAGES } from '@/lib/pages';

// Layout only — copy for each pillar lives in content/pages.json (whyUs.pillars).
const PILLAR_ALIGNS = ['left', 'right', 'left'] as const;
const PILLAR_TONES = ['warm', 'cool', 'deep'] as const;
const PILLAR_CHARS = ['I', 'II', 'III'];

/* Page imagery is drawn from the city records (content/cities.json), never from
   literal asset paths — a template with a different set of markets must not
   reference a file that isn't on disk. The list wraps when there are fewer
   cities than image slots, and falls back to a neutral texture when there are
   none at all. */
const CITY_IMAGES: string[] = CITY_LIST.map((c) => c.image).filter(Boolean);
const TEXTURE_FALLBACK = '/assets/texture-detail.jpg';
const cityImage = (i: number): string =>
  CITY_IMAGES.length ? CITY_IMAGES[i % CITY_IMAGES.length] : TEXTURE_FALLBACK;

// The hero takes the first city; the pillars start one past it so the same
// photograph isn't shown twice on the way down the page.
const HERO_IMAGE = cityImage(0);
const pillarImage = (i: number): string => cityImage(i + 1);

export default function WhyUsPage() {
  const router = useRouter();
  return (
    <main className="page-enter">
      <section
        style={{
          position: 'relative',
          height: 'min(64vh, 620px)',
          minHeight: 420,
          overflow: 'hidden',
        }}
      >
        <ParallaxImage
          src={HERO_IMAGE}
          alt="Heritage architecture"
          kenBurns
          eager
          speed={0.15}
          style={{ position: 'absolute', inset: 0 }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to bottom, rgba(10,25,41,0.4), rgba(10,25,41,0.55))',
          }}
        />
        <div
          style={{
            position: 'relative',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: 'clamp(40px, 8vw, 96px) clamp(20px, 5vw, 96px)',
            color: 'var(--ivory)',
          }}
        >
          <Eyebrow color="gold" style={{ marginBottom: 24 }}>{PAGES.whyUs.hero.eyebrow}</Eyebrow>
          <h1 className="display" style={{ color: 'var(--ivory)', maxWidth: 900 }}>
            {PAGES.whyUs.hero.title}
          </h1>
        </div>
      </section>

      <section className="section bg-ivory">
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.2fr',
              gap: 'clamp(40px, 7vw, 110px)',
            }}
            className="grid-3-md1"
          >
            <div>
              <p
                className="serif italic"
                style={{
                  fontSize: 'clamp(1.5rem, 2.2vw, 2rem)',
                  lineHeight: 1.35,
                  color: 'var(--ink)',
                  maxWidth: 460,
                }}
              >
                &ldquo;{PAGES.whyUs.intro.pullQuote}&rdquo;
              </p>
              <p
                className="caption muted"
                style={{ marginTop: 24, letterSpacing: '0.1em' }}
              >
                {PAGES.whyUs.intro.attribution}
              </p>
            </div>
            <div>
              <p
                className="body"
                style={{ fontSize: 17, marginBottom: 24, maxWidth: 580 }}
              >
                {PAGES.whyUs.intro.paragraph1}
              </p>
              <p
                className="body muted"
                style={{ fontSize: 16, lineHeight: 1.8, maxWidth: 580 }}
              >
                {PAGES.whyUs.intro.paragraph2}
              </p>
            </div>
          </div>
        </div>
      </section>

      {PAGES.whyUs.pillars.map((p, i) => (
        <section
          key={i}
          className="section"
          style={{ background: i % 2 === 0 ? 'var(--cream)' : 'var(--ivory)' }}
        >
          <div className="container">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'clamp(40px, 7vw, 110px)',
                alignItems: 'center',
                direction: PILLAR_ALIGNS[i] === 'right' ? 'rtl' : 'ltr',
              }}
              className="grid-3-md1"
            >
              <div
                style={{
                  direction: 'ltr',
                  aspectRatio: '4 / 5',
                  overflow: 'hidden',
                }}
              >
                <SmartImage
                  src={pillarImage(i)}
                  alt={`${p.eyebrow}, imagery`}
                  fallbackLabel={`Pillar ${i + 1} · imagery`}
                  fallbackTone={PILLAR_TONES[i]}
                  fallbackChar={PILLAR_CHARS[i]}
                />
              </div>
              <div style={{ direction: 'ltr' }}>
                <Eyebrow style={{ marginBottom: 22 }}>{p.eyebrow}</Eyebrow>
                <h2
                  className="h2 serif"
                  style={{ marginBottom: 28, fontVariantNumeric: 'lining-nums', fontFeatureSettings: '"lnum" 1' }}
                >
                  {p.title}
                </h2>
                <p
                  className="body muted"
                  style={{ fontSize: 17, maxWidth: 480 }}
                >
                  {p.body}
                </p>
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="section bg-ink" style={{ textAlign: 'center' }}>
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'clamp(40px, 6vw, 96px)',
            }}
            className="grid-3-md1"
          >
            {PAGES.whyUs.stats.map((s) => (
              <div key={s.value}>
                <div
                  className="serif"
                  style={{
                    fontSize: 'clamp(4rem, 8vw, 6.5rem)',
                    color: 'var(--gold)',
                    lineHeight: 1,
                    fontWeight: 400,
                    marginBottom: 24,
                  }}
                >
                  {s.value}
                </div>
                <Eyebrow style={{ color: 'rgba(247,243,236,0.7)' }}>
                  {s.label}
                </Eyebrow>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-ivory" style={{ textAlign: 'center' }}>
        <div className="container-narrow">
          <h2 className="h2 serif" style={{ marginBottom: 36 }}>
            {PAGES.whyUs.cta.title}
          </h2>
          <button
            className="btn btn-primary"
            onClick={() => router.push('/residences')}
          >
            {PAGES.whyUs.cta.buttonLabel} <ArrowRight size={14} />
          </button>
        </div>
      </section>
    </main>
  );
}
