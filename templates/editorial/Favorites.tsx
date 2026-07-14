'use client';
import { useRouter } from 'next/navigation';
import { Eyebrow } from '@/components/Eyebrow';
import { useFavorites } from '@/components/FavoritesContext';
import { PropertyCard } from '@/components/PropertyCard';
import { ArrowRight } from '@/components/icons';
import { RESIDENCES } from '@/lib/data';

export default function FavoritesPage() {
  const router = useRouter();
  const { ids } = useFavorites();
  const saved = RESIDENCES.filter((r) => ids.includes(r.id));

  return (
    <main className="page-enter">
      <section className="section bg-ivory">
        <div className="container">
          <Eyebrow style={{ marginBottom: 22 }}>FAVORITES</Eyebrow>
          <h1 className="h1 serif" style={{ marginBottom: 14 }}>
            Your saved residences.
          </h1>
          <p className="small muted" style={{ marginBottom: 56 }}>
            {saved.length === 0
              ? 'Nothing saved yet.'
              : `${saved.length} ${saved.length === 1 ? 'residence' : 'residences'} kept for you.`}
          </p>

          {saved.length === 0 ? (
            <div
              style={{
                background: 'var(--cream)',
                border: '1px solid var(--hairline)',
                padding: 'clamp(48px, 8vw, 96px)',
                textAlign: 'center',
              }}
            >
              <p
                className="serif italic"
                style={{
                  fontSize: 'clamp(1.5rem, 2.4vw, 2rem)',
                  maxWidth: 440,
                  margin: '0 auto 32px',
                }}
              >
                &ldquo;No residences saved yet.&rdquo;
              </p>
              <button
                className="btn btn-ghost"
                onClick={() => router.push('/residences')}
              >
                Discover residences <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div
              className="grid grid-residences-city"
              style={{ gap: 'clamp(28px, 3vw, 44px)' }}
            >
              {saved.map((r) => (
                <PropertyCard key={r.id} residence={r} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
