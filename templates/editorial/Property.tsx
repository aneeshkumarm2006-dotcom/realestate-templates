'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eyebrow } from '@/components/Eyebrow';
import { FavoriteHeart } from '@/components/FavoriteHeart';
import { MapView } from '@/components/MapViewClient';
import { PropertyCard } from '@/components/PropertyCard';
import { PlaceholderImg } from '@/components/SmartImage';
import { InquireModal } from '@/components/InquireModal';
import { GalleryModal } from '@/components/GalleryModal';
import { Lightbox } from '@/components/Lightbox';
import { SETTINGS } from '@/lib/settings';
import {
  applyUrlFor,
  bedroomShort,
  formatPrice,
  getResidence,
  portalLinksFor,
  residencesByCity,
  type Residence,
} from '@/lib/data';

// Bedroom type label -> numeric key (0=Studio, 1..3=bedrooms).
const BED_NUM: Record<string, number> = { 'Studio': 0, '1 Bedroom': 1, '2 Bedroom': 2, '3 Bedroom': 3 };

const TONES = ['warm', 'cool', 'deep', 'light', 'warm', 'cool'] as const;

/** Capitalize the first letter of each NEARBY item (e.g. "downtown" → "Downtown"). */
const capFirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function FeatureList({ items }: { items: string[] }) {
  const mid = Math.ceil(items.length / 2);
  const left = items.slice(0, mid);
  const right = items.slice(mid);
  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 64px' }}
      className="grid-3-md1"
    >
      {[left, right].map((col, i) => (
        <ul key={i} style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {col.map((item, j) => (
            <li
              key={j}
              style={{
                padding: '16px 0',
                borderBottom: '1px solid var(--hairline)',
                fontSize: 15,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: 'var(--gold)',
                  flexShrink: 0,
                }}
              />
              {item}
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

export default function ResidenceDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const router = useRouter();
  const r: Residence | undefined = getResidence(params.slug);
  const [inquireOpen, setInquireOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(0);
  // null = closed; otherwise the index into `photos` to show enlarged.
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  // Per-unit photo viewer: tile grid modal + its own lightbox.
  const [unitGallery, setUnitGallery] = useState<{ photos: string[]; label: string } | null>(null);
  const [unitLightbox, setUnitLightbox] = useState<number | null>(null);

  useEffect(() => {
    if (!r) router.push('/residences');
  }, [r, router]);

  if (!r) return null;

  // Ordered photo set for the lightbox: hero first, then the gallery.
  const photos = [r.heroImage, ...r.gallery].filter(Boolean);

  // Photo badges + gallery grouping come from the CMS photo tags (set in the
  // admin portal). Aligned to `photos` (hero first, then gallery).
  const tagLabels = photos.map((p) => r.photoTags?.[p]);
  const photoLabels = tagLabels.some(Boolean) ? tagLabels : undefined;

  const plans = r.bedroomOptions
    .filter((b) => r.prices[b as 0 | 1 | 2 | 3] !== undefined)
    .map((b) => ({
      bed: b,
      label: b === 0 ? 'Studio' : `${b} Bedroom`,
      price: r.prices[b as 0 | 1 | 2 | 3] as number,
    }));

  // "Available suites" rows: real units from the sheet when we have them,
  // otherwise one row per available bedroom type (unit number unknown).
  const suiteRows = r.units?.length
    ? r.units.map((u) => ({ unit: u.unit, type: u.type, price: u.rent, bed: BED_NUM[u.type] ?? -1, image: u.image, images: u.images, applyUrl: u.applyUrl }))
    : plans.map((p) => ({ unit: '—', type: p.label, price: p.price, bed: p.bed, image: undefined as string | undefined, images: undefined as string[] | undefined, applyUrl: undefined as string | undefined }));

  const others = residencesByCity(r.city)
    .filter((x) => x.id !== r.id)
    .slice(0, 3);

  return (
    <main className="page-enter">
      <div className="container" style={{ paddingTop: 28 }}>
        <div className="breadcrumb" style={{ marginBottom: 20 }}>
          <a className="text-link" onClick={() => router.push('/')}>Home</a>
          <span className="sep">/</span>
          <a className="text-link" onClick={() => router.push('/residences')}>
            Residences
          </a>
          <span className="sep">/</span>
          <a
            className="text-link"
            onClick={() => router.push(`/residences/${r.city}`)}
          >
            {r.cityLabel}
          </a>
          <span className="sep">/</span>
          <span>{r.name}</span>
        </div>
      </div>

      {!r.hideDetailGallery && (
      <div className="container" style={{ marginBottom: 64 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.6fr 1fr',
            gap: 12,
            position: 'relative',
          }}
          className="detail-gallery-grid"
        >
          <div
            className="detail-gallery-main"
            onClick={() => r.heroImage && setLightboxIndex(0)}
            style={{
              overflow: 'hidden',
              background: 'var(--cream)',
              cursor: r.heroImage ? 'zoom-in' : undefined,
            }}
          >
            {r.heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r.heroImage}
                alt={`${r.name} · main`}
                loading="eager"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: r.heroImage === '/assets/coming-soon.png' ? 'contain' : 'cover',
                  background: r.heroImage === '/assets/coming-soon.png' ? '#fff' : undefined,
                }}
                className={r.heroImage === '/assets/coming-soon.png' ? undefined : 'ken-burns'}
              />
            ) : (
              <PlaceholderImg label={`${r.name} · main`} tone={TONES[0]}>
                {r.name.charAt(0)}
              </PlaceholderImg>
            )}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: 12,
            }}
            className="detail-gallery-thumbs"
          >
            {[0, 1, 2, 3].map((i) => {
              const galleryIdx = r.gallery.length ? i % r.gallery.length : -1;
              const src = galleryIdx >= 0 ? r.gallery[galleryIdx] : undefined;
              return (
                <div
                  key={i}
                  onClick={() => src && setLightboxIndex(galleryIdx + 1)}
                  style={{
                    overflow: 'hidden',
                    background: 'var(--cream)',
                    cursor: src ? 'zoom-in' : undefined,
                  }}
                >
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt={`${r.name} · ${i + 1}`}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <PlaceholderImg label="" tone={TONES[i + 1] ?? 'warm'}>
                      ·
                    </PlaceholderImg>
                  )}
                </div>
              );
            })}
          </div>
          <button
            onClick={() => setGalleryOpen(true)}
            className="btn btn-ghost btn-sm"
            style={{
              position: 'absolute',
              bottom: 18,
              right: 18,
              background: 'var(--ivory)',
              borderColor: 'var(--ink)',
            }}
          >
            View all photos
          </button>
        </div>
      </div>
      )}

      <div
        className="container"
        style={{
          paddingBottom: 'clamp(96px, 12vw, 160px)',
          ...(r.hideDetailGallery ? { marginTop: 32 } : null),
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.7fr 1fr',
            gap: 'clamp(40px, 6vw, 96px)',
          }}
          className="detail-grid"
        >
          <div>
            <Eyebrow style={{ marginBottom: 14 }}>
              {r.cityLabel}{r.neighbourhood ? ` · ${r.neighbourhood}` : ''}
            </Eyebrow>
            <h1 className="h1 serif" style={{ marginBottom: 12 }}>
              {r.name}.
            </h1>
            <p className="body muted" style={{ fontSize: 16, marginBottom: 12 }}>
              {r.address}
            </p>
            <p style={{ fontSize: 15 }}>
              <span className="serif" style={{ fontSize: 19, fontWeight: 500 }}>
                From {formatPrice(r.priceFrom)}
              </span>
              <span className="muted"> /month net · {bedroomShort(r.bedroomOptions)}</span>
            </p>
            {r.promo && (
              <div className="promo-banner" style={{ marginTop: 18 }}>
                <span className="promo-banner-tag">Limited offer</span>
                <span>{r.promo}</span>
              </div>
            )}

            <div className="divider" style={{ margin: '36px 0 32px' }} />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 24,
              }}
              className="quick-stats"
            >
              {[
                {
                  label: 'Bedrooms',
                  val: r.bedrooms.replace(' Bedrooms', '').replace(' Bedroom', ''),
                },
                {
                  label: 'Available',
                  val: r.availability === 'available' ? 'Now' : 'Soon',
                },
              ].map((s) => (
                <div key={s.label}>
                  <Eyebrow style={{ marginBottom: 8 }}>{s.label}</Eyebrow>
                  <div className="serif" style={{ fontSize: 22, fontWeight: 500 }}>
                    {s.val}
                  </div>
                </div>
              ))}
            </div>

            <div className="divider" style={{ margin: '32px 0 56px' }} />

            <h2 className="h2 serif" style={{ marginBottom: 24 }}>Overview</h2>
            <p
              className="body"
              style={{ fontSize: 17, marginBottom: 28, maxWidth: 640 }}
            >
              {r.description}
            </p>
            <p
              className="body muted"
              style={{ fontSize: 16, lineHeight: 1.8, maxWidth: 640 }}
            >
              {r.longDescription}
            </p>

            {(r.incentives ?? r.features).length > 0 && (
              <>
                <div className="divider" style={{ margin: '64px 0 40px' }} />
                <h2 className="h2 serif" style={{ marginBottom: 32 }}>
                  {r.incentives ? 'Incentives' : 'Residence features'}
                </h2>
                <FeatureList items={r.incentives ?? r.features} />
              </>
            )}

            {(r.unitLabels ?? r.amenities).length > 0 && (
              <>
                <div className="divider" style={{ margin: '64px 0 40px' }} />
                <h2 className="h2 serif" style={{ marginBottom: 32 }}>
                  {r.unitLabels ? 'Unit Photos' : 'Building amenities'}
                </h2>
                <FeatureList items={r.unitLabels ?? r.amenities} />
              </>
            )}

            <div className="divider" style={{ margin: '64px 0 40px' }} />

            <h2 className="h2 serif" style={{ marginBottom: 12 }}>Available suites</h2>
            {!r.units?.length ? (
              <p className="small muted" style={{ marginTop: 16 }}>
                There are no suites available at the moment.
              </p>
            ) : (
            <>
            <p className="small muted" style={{ marginBottom: 28 }}>
              Rents shown are net effective, what you pay after any promotion. Live
              availability is confirmed at viewing.
            </p>
            <div className="suites-table" role="table">
              <div className="suites-row suites-head" role="row">
                <span role="columnheader">Unit Number</span>
                <span role="columnheader">Unit Type</span>
                <span role="columnheader">Rent (net)</span>
                <span role="columnheader">Images</span>
                <span role="columnheader" aria-label="Apply" />
              </div>
              {suiteRows.map((row, i) => (
                <div className="suites-row" role="row" key={i}>
                  <span role="cell" className={row.unit === '—' ? 'muted' : 'serif'} style={row.unit === '—' ? undefined : { fontSize: 16, fontWeight: 500 }}>
                    {row.unit}
                  </span>
                  <span role="cell" className="serif" style={{ fontSize: 16, fontWeight: 500 }}>
                    {row.type}
                  </span>
                  <span role="cell" className="serif" style={{ fontWeight: 500 }}>
                    {formatPrice(row.price)}<span className="caption muted" style={{ marginLeft: 4 }}>/mo</span>
                  </span>
                  <span role="cell">
                    {row.images?.length ? (
                      // Per-unit photos, viewed in-site as a tile grid + lightbox.
                      <button
                        className="text-link"
                        onClick={() => setUnitGallery({ photos: row.images!, label: `Unit ${row.unit}` })}
                        style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer' }}
                      >
                        View
                      </button>
                    ) : row.image ? (
                      <a className="text-link" href={row.image} target="_blank" rel="noopener noreferrer">
                        View
                      </a>
                    ) : photos.length ? (
                      <button
                        className="text-link"
                        onClick={() => setLightboxIndex(0)}
                        style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer' }}
                      >
                        View
                      </button>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </span>
                  <span role="cell" style={{ textAlign: 'right' }}>
                    {(row.applyUrl ?? applyUrlFor(r.slug, row.bed)) ? (
                      <a
                        className="btn btn-ghost btn-sm"
                        href={row.applyUrl ?? applyUrlFor(r.slug, row.bed)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Apply
                      </a>
                    ) : (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => { if (!r.units?.length) setSelectedPlan(i); setInquireOpen(true); }}
                      >
                        Apply
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
            </>
            )}

            <div className="divider" style={{ margin: '64px 0 40px' }} />

            <h2 className="h2 serif" style={{ marginBottom: 32 }}>Location</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr',
                gap: 32,
              }}
              className="grid-3-md1"
            >
              <div
                style={{
                  aspectRatio: '4 / 3',
                  border: '1px solid var(--hairline)',
                }}
              >
                <MapView
                  residences={[r]}
                  selectedId={r.id}
                  height="100%"
                  showPreview={false}
                />
              </div>
              <div>
                <Eyebrow style={{ marginBottom: 16 }}>NEARBY</Eyebrow>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {r.nearbyPoints.map((n, i) => (
                    <li
                      key={i}
                      style={{
                        padding: '14px 0',
                        borderBottom: '1px solid var(--hairline)',
                        fontSize: 15,
                      }}
                    >
                      {capFirst(n)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <aside style={{ position: 'relative' }} className="detail-sidebar">
            <div
              className="card"
              style={{
                position: 'sticky',
                top: 'calc(var(--header-h) + 24px)',
                padding: 36,
              }}
            >
              <Eyebrow style={{ marginBottom: 10 }}>
                {plans[selectedPlan]?.label.toUpperCase() ?? 'FROM'}
              </Eyebrow>
              <div
                className="serif"
                style={{
                  fontSize: 'clamp(2.4rem, 3.5vw, 3rem)',
                  fontWeight: 500,
                  lineHeight: 1,
                  marginBottom: 8,
                }}
              >
                {formatPrice(plans[selectedPlan]?.price ?? r.priceFrom)}
                <span
                  style={{
                    fontSize: 15,
                    fontFamily: 'var(--sans)',
                    color: 'var(--muted)',
                    marginLeft: 6,
                    fontWeight: 400,
                  }}
                >
                  /month
                </span>
              </div>
              <div className="small muted" style={{ marginBottom: 6 }}>
                {r.availability === 'available' ? 'Available now' : 'Coming soon'}
              </div>
              <div className="caption muted" style={{ marginBottom: 28 }}>
                Net effective rent, what you pay after any promotion.
              </div>

              <div className="divider" style={{ marginBottom: 22 }} />

              <Eyebrow style={{ marginBottom: 16 }}>FLOOR PLANS</Eyebrow>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  marginBottom: 28,
                }}
              >
                {plans.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedPlan(i)}
                    style={{
                      background:
                        i === selectedPlan ? 'var(--cream)' : 'transparent',
                      border:
                        '1px solid ' +
                        (i === selectedPlan
                          ? 'var(--ink)'
                          : 'var(--hairline-strong)'),
                      padding: '14px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      textAlign: 'left',
                      fontFamily: 'var(--sans)',
                      fontSize: 14,
                      cursor: 'pointer',
                      transition: 'all 200ms var(--ease)',
                    }}
                  >
                    <div
                      className="serif"
                      style={{ fontSize: 17, fontWeight: 500 }}
                    >
                      {p.label}
                    </div>
                    <div className="small serif" style={{ fontWeight: 500 }}>
                      {formatPrice(p.price)}
                      <span
                        className="caption muted"
                        style={{ fontFamily: 'var(--sans)', marginLeft: 4 }}
                      >
                        /mo
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <button
                className="btn btn-primary full-w"
                style={{ width: '100%', marginBottom: 12 }}
                onClick={() => setInquireOpen(true)}
              >
                Book a viewing
              </button>

              {/* Resident Portal + Maintenance Request (per-property links). */}
              {(() => {
                const portal = portalLinksFor(r.slug);
                const secondary: React.CSSProperties = { width: '100%', marginBottom: 10 };
                const soon: React.CSSProperties = {
                  ...secondary,
                  opacity: 0.5,
                  cursor: 'default',
                  pointerEvents: 'none',
                };
                return (
                  <div style={{ marginTop: 4 }}>
                    {portal ? (
                      <a className="btn btn-ghost btn-sm" style={secondary} href={portal.portal} target="_blank" rel="noopener noreferrer">
                        Resident Portal
                      </a>
                    ) : (
                      <span className="btn btn-ghost btn-sm" style={soon} aria-disabled="true">
                        Resident Portal · Coming soon
                      </span>
                    )}
                    {portal ? (
                      <a className="btn btn-ghost btn-sm" style={secondary} href={portal.maintenance} target="_blank" rel="noopener noreferrer">
                        Maintenance Request
                      </a>
                    ) : (
                      <span className="btn btn-ghost btn-sm" style={soon} aria-disabled="true">
                        Maintenance Request · Coming soon
                      </span>
                    )}
                  </div>
                );
              })()}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 16,
                  padding: '12px 0',
                  borderTop: '1px solid var(--hairline)',
                }}
              >
                <span className="small">Save to favorites</span>
                <FavoriteHeart id={r.id} size={20} />
              </div>

              <div className="divider" style={{ margin: '22px 0' }} />

              <Eyebrow style={{ marginBottom: 12 }}>CONTACT</Eyebrow>
              <div className="small" style={{ marginBottom: 4 }}>
                {SETTINGS.contactEmail}
              </div>
              <div className="small muted">{SETTINGS.contactPhone}</div>
            </div>
          </aside>
        </div>

        {others.length > 0 && (
          <section style={{ marginTop: 'clamp(80px, 10vw, 140px)' }}>
            <div className="divider" style={{ marginBottom: 56 }} />
            <Eyebrow style={{ marginBottom: 16 }}>YOU MAY ALSO LIKE</Eyebrow>
            <h2 className="h2 serif" style={{ marginBottom: 48 }}>
              Other residences in {r.cityLabel}.
            </h2>
            <div
              className="grid grid-residences-city"
              style={{ gap: 'clamp(28px, 3vw, 44px)' }}
            >
              {others.map((o) => (
                <PropertyCard key={o.id} residence={o} hideCity />
              ))}
            </div>
          </section>
        )}
      </div>

      <InquireModal
        open={inquireOpen}
        onClose={() => setInquireOpen(false)}
        residence={r}
      />
      <GalleryModal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        residence={r}
        labels={photoLabels}
        onPhotoClick={(i) => setLightboxIndex(i)}
      />
      <Lightbox
        open={lightboxIndex !== null}
        photos={photos}
        index={lightboxIndex ?? 0}
        onIndexChange={setLightboxIndex}
        onClose={() => setLightboxIndex(null)}
        label={r.name}
        labels={photoLabels}
      />

      {/* Per-unit photo viewer: tile grid, click a tile to enlarge. */}
      <GalleryModal
        open={unitGallery !== null}
        onClose={() => setUnitGallery(null)}
        photos={unitGallery?.photos ?? []}
        title={unitGallery ? `${r.name} · ${unitGallery.label}` : ''}
        eyebrow="UNIT PHOTOS"
        onPhotoClick={(i) => setUnitLightbox(i)}
      />
      <Lightbox
        open={unitLightbox !== null}
        photos={unitGallery?.photos ?? []}
        index={unitLightbox ?? 0}
        onIndexChange={setUnitLightbox}
        onClose={() => setUnitLightbox(null)}
        label={unitGallery?.label ?? ''}
      />
    </main>
  );
}
