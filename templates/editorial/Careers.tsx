'use client';
import { useRouter } from 'next/navigation';
import { Eyebrow } from '@/components/Eyebrow';
import { ArrowRight } from '@/components/icons';
import { SETTINGS } from '@/lib/settings';
import { PAGES } from '@/lib/pages';

// NOTE: benefits + culture copy are placeholders, editable in the CMS
// (content/pages.json → careers). Confirm the specific benefits with the client
// before launch. The openings message and resume inbox are placeholders too;
// the inbox is the site-wide contact address until a careers one is provided.
const CAREERS_EMAIL = SETTINGS.contactEmail;

export default function CareersPage() {
  const router = useRouter();
  return (
    <main className="page-enter">
      {/* 01 · Hero */}
      <section
        className="section bg-cream"
        style={{
          paddingTop: 'clamp(72px, 10vw, 140px)',
          paddingBottom: 'clamp(56px, 8vw, 96px)',
          textAlign: 'center',
        }}
      >
        <div className="container-narrow" style={{ maxWidth: 760 }}>
          <Eyebrow style={{ marginBottom: 28 }}>{PAGES.careers.hero.eyebrow}</Eyebrow>
          <h1
            className="serif"
            style={{
              fontSize: 'clamp(2.6rem, 6vw, 4.6rem)',
              fontWeight: 400,
              lineHeight: 1.02,
              letterSpacing: '-0.01em',
              marginBottom: 28,
            }}
          >
            {PAGES.careers.hero.title}
          </h1>
          <p
            className="body muted"
            style={{
              fontSize: 18,
              lineHeight: 1.7,
              maxWidth: 600,
              margin: '0 auto',
            }}
          >
            {PAGES.careers.hero.subtitle}
          </p>
        </div>
      </section>

      {/* 02 · Career centre, current openings */}
      <section className="section bg-ivory" style={{ textAlign: 'center' }}>
        <div className="container-narrow" style={{ maxWidth: 680 }}>
          <Eyebrow style={{ marginBottom: 22 }}>{PAGES.careers.openings.eyebrow}</Eyebrow>
          <h2 className="h2 serif" style={{ marginBottom: 28 }}>
            {PAGES.careers.openings.title}
          </h2>
          <div
            style={{
              padding: 'clamp(36px, 5vw, 56px)',
              background: 'var(--cream)',
              border: '1px solid var(--hairline)',
            }}
          >
            <p className="serif italic" style={{ fontSize: 20, lineHeight: 1.5, margin: 0 }}>
              {PAGES.careers.openings.noOpeningsMessage}
            </p>
          </div>
          <p className="body muted" style={{ fontSize: 16, marginTop: 32, lineHeight: 1.7 }}>
            {PAGES.careers.openings.contactIntro}{' '}
            <a className="text-link" href={`mailto:${CAREERS_EMAIL}`}>
              {CAREERS_EMAIL}
            </a>
            .
          </p>
          <button
            className="btn btn-primary"
            style={{ marginTop: 28 }}
            onClick={() => router.push('/inquire')}
          >
            {PAGES.careers.openings.buttonLabel} <ArrowRight size={14} />
          </button>
        </div>
      </section>

      {/* 03 · Key benefits */}
      <section className="section bg-cream">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <Eyebrow style={{ marginBottom: 18 }}>{PAGES.careers.benefits.eyebrow}</Eyebrow>
            <h2 className="h2 serif">{PAGES.careers.benefits.title}</h2>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'clamp(16px, 2vw, 28px)',
              maxWidth: 1000,
              margin: '0 auto',
            }}
            className="grid-4-md2"
          >
            {PAGES.careers.benefits.items.map((b, i) => (
              <div
                key={b}
                className="card"
                style={{
                  padding: 'clamp(24px, 2.4vw, 36px)',
                  display: 'flex',
                  gap: 18,
                  alignItems: 'baseline',
                }}
              >
                <span
                  className="serif italic"
                  style={{ color: 'var(--gold)', fontSize: 18, minWidth: 28, flexShrink: 0 }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ fontSize: 16, lineHeight: 1.5 }}>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
