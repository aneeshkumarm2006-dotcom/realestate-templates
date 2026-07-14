'use client';
import './grid.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FavoriteHeart } from '@/components/FavoriteHeart';
import { MapView } from '@/components/MapViewClient';
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
import { GCard } from './GCard';

const COMING_SOON = '/assets/coming-soon.png';
// Bedroom type label -> numeric key (0=Studio, 1..3=bedrooms).
const BED_NUM: Record<string, number> = { Studio: 0, '1 Bedroom': 1, '2 Bedroom': 2, '3 Bedroom': 3 };
const capFirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export default function Property({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const r: Residence | undefined = getResidence(params.slug);

  const [inquireOpen, setInquireOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [unitGallery, setUnitGallery] = useState<{ photos: string[]; label: string } | null>(null);
  const [unitLightbox, setUnitLightbox] = useState<number | null>(null);

  useEffect(() => {
    if (!r) router.push('/residences');
  }, [r, router]);

  if (!r) return null;

  const photos = [r.heroImage, ...r.gallery].filter(Boolean);
  const tagLabels = photos.map((p) => r.photoTags?.[p]);
  const photoLabels = tagLabels.some(Boolean) ? tagLabels : undefined;
  const heroIsPlaceholder = r.heroImage === COMING_SOON;

  const plans = r.bedroomOptions
    .filter((b) => r.prices[b as 0 | 1 | 2 | 3] !== undefined)
    .map((b) => ({
      bed: b,
      label: b === 0 ? 'Studio' : `${b} Bedroom`,
      price: r.prices[b as 0 | 1 | 2 | 3] as number,
    }));

  const suiteRows = r.units?.length
    ? r.units.map((u) => ({
        unit: u.unit,
        type: u.type,
        price: u.rent,
        bed: BED_NUM[u.type] ?? -1,
        image: u.image,
        images: u.images,
        applyUrl: u.applyUrl,
      }))
    : plans.map((p) => ({
        unit: '—',
        type: p.label,
        price: p.price,
        bed: p.bed,
        image: undefined as string | undefined,
        images: undefined as string[] | undefined,
        applyUrl: undefined as string | undefined,
      }));

  const others = residencesByCity(r.city).filter((x) => x.id !== r.id).slice(0, 3);

  const primaryItems = r.incentives ?? r.features;
  const secondaryItems = r.unitLabels ?? r.amenities;
  const portal = portalLinksFor(r.slug);
  const availLabel = r.availability === 'available' ? 'Now' : 'Soon';

  return (
    <main className="page-enter">
      <div className="g-container g-prop">
        <div className="g-crumb" style={{ paddingTop: 18, marginBottom: 4 }}>
          <a href="/">Home</a>
          <span className="sep">/</span>
          <a href="/residences">Residences</a>
          <span className="sep">/</span>
          <a href={`/residences/${r.city}`}>{r.cityLabel}</a>
          <span className="sep">/</span>
          <span className="cur">{r.name}</span>
        </div>

        {/* Photo block */}
        {!r.hideDetailGallery && (
          <div className="g-prop-gallery">
            <div
              className="g-prop-main"
              role="button"
              tabIndex={0}
              aria-label="Open photo gallery"
              onClick={() => setLightboxIndex(0)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setLightboxIndex(0);
                }
              }}
            >
              {r.heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.heroImage}
                  alt={`${r.name} · main`}
                  loading="eager"
                  style={heroIsPlaceholder ? { objectFit: 'contain', background: '#fff' } : undefined}
                />
              ) : (
                <PlaceholderImg label={`${r.name} · main`}>{r.name.charAt(0)}</PlaceholderImg>
              )}
              {photos.length > 1 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm g-prop-allphotos"
                  style={{ background: 'var(--bone)', borderRadius: 'var(--g-radius)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setGalleryOpen(true);
                  }}
                >
                  View all {photos.length} photos
                </button>
              )}
            </div>

            {r.gallery.length > 0 && (
              <div className="g-prop-thumbs">
                {[0, 1, 2, 3].map((i) => {
                  const idx = r.gallery.length ? i % r.gallery.length : -1;
                  const src = idx >= 0 ? r.gallery[idx] : undefined;
                  return (
                    <div
                      key={i}
                      className="g-prop-thumb"
                      role="button"
                      tabIndex={0}
                      aria-label={`Open photo ${i + 1}`}
                      onClick={() => src && setLightboxIndex(idx + 1)}
                      onKeyDown={(e) => {
                        if (src && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          setLightboxIndex(idx + 1);
                        }
                      }}
                    >
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt={`${r.name} · ${i + 1}`} loading="lazy" />
                      ) : (
                        <PlaceholderImg label="">·</PlaceholderImg>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="g-prop-layout" style={r.hideDetailGallery ? { marginTop: 24 } : undefined}>
          {/* LEFT */}
          <div>
            <span className="g-label">
              {r.cityLabel}{r.neighbourhood ? ` · ${r.neighbourhood}` : ''}
            </span>
            <h1 className="g-prop-title">{r.name}</h1>
            <p className="g-prop-addr">{r.address}</p>

            {r.promo && (
              <div className="g-promo">
                <span className="g-promo-tag">Limited offer</span>
                <span>{r.promo}</span>
              </div>
            )}

            {/* Spec strip */}
            <div className="g-spec">
              <div className="g-spec-tile">
                <span className="g-label">From</span>
                <div className="g-spec-val g-num">{formatPrice(r.priceFrom)}</div>
              </div>
              <div className="g-spec-tile">
                <span className="g-label">Bedrooms</span>
                <div className="g-spec-val">
                  {r.bedrooms.replace(' Bedrooms', '').replace(' Bedroom', '')}
                </div>
              </div>
              <div className="g-spec-tile">
                <span className="g-label">Available</span>
                <div className="g-spec-val">{availLabel}</div>
              </div>
              <div className="g-spec-tile">
                <span className="g-label">Area</span>
                <div className="g-spec-val" style={{ fontSize: 15 }}>
                  {r.neighbourhood ?? r.cityLabel}
                </div>
              </div>
            </div>

            {/* Overview */}
            <div className="g-prop-section">
              <h2>Overview</h2>
              <p className="g-prop-body">{r.description}</p>
              {r.longDescription && <p className="g-prop-body">{r.longDescription}</p>}
            </div>

            {/* Features */}
            {primaryItems.length > 0 && (
              <div className="g-prop-section">
                <h2>{r.incentives ? 'Incentives' : 'Residence features'}</h2>
                <div className="g-chiprow">
                  {primaryItems.map((f, i) => (
                    <span key={i} className="g-tag">{f}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Amenities */}
            {secondaryItems.length > 0 && (
              <div className="g-prop-section">
                <h2>{r.unitLabels ? 'Unit photos' : 'Building amenities'}</h2>
                <div className="g-chiprow">
                  {secondaryItems.map((a, i) => (
                    <span key={i} className="g-tag">{a}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Available suites */}
            <div className="g-prop-section">
              <h2>Available suites</h2>
              {!r.units?.length ? (
                <p className="g-result-count">There are no suites available at the moment.</p>
              ) : (
                <>
                  <p className="g-result-count" style={{ marginBottom: 12 }}>
                    Rents are net effective — what you pay after any promotion. Live
                    availability is confirmed at viewing.
                  </p>
                  <div className="g-suites">
                    <div className="g-suite-row g-suite-head">
                      <span>Unit</span>
                      <span>Type</span>
                      <span>Rent (net)</span>
                      <span className="g-suite-photos">Photos</span>
                      <span aria-hidden="true" />
                    </div>
                    {suiteRows.map((row, i) => {
                      const href = row.applyUrl ?? applyUrlFor(r.slug, row.bed);
                      return (
                        <div className="g-suite-row" key={i}>
                          <span className={row.unit === '—' ? 'g-num' : 'g-suite-unit'}
                                style={row.unit === '—' ? { color: 'var(--muted)' } : undefined}>
                            {row.unit}
                          </span>
                          <span className="g-suite-type">{row.type}</span>
                          <span className="g-suite-rent g-num">
                            {formatPrice(row.price)}<span className="u">/mo</span>
                          </span>
                          <span className="g-suite-photos">
                            {row.images?.length ? (
                              <button
                                type="button"
                                className="g-link"
                                onClick={() => setUnitGallery({ photos: row.images!, label: `Unit ${row.unit}` })}
                              >
                                View
                              </button>
                            ) : row.image ? (
                              <a className="g-link" href={row.image} target="_blank" rel="noopener noreferrer">View</a>
                            ) : photos.length ? (
                              <button type="button" className="g-link" onClick={() => setLightboxIndex(0)}>View</button>
                            ) : (
                              <span style={{ color: 'var(--muted)' }}>—</span>
                            )}
                          </span>
                          <span style={{ textAlign: 'right' }}>
                            {href ? (
                              <a className="btn btn-ghost btn-sm" href={href} target="_blank" rel="noopener noreferrer">
                                Apply
                              </a>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => {
                                  if (!r.units?.length) setSelectedPlan(i);
                                  setInquireOpen(true);
                                }}
                              >
                                Apply
                              </button>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Location */}
            <div className="g-prop-section">
              <h2>Location</h2>
              <div className="g-loc">
                <div className="g-loc-map">
                  <MapView residences={[r]} selectedId={r.id} height="100%" showPreview={false} />
                </div>
                <div>
                  <span className="g-label">Nearby</span>
                  <ul className="g-nearby" style={{ marginTop: 10 }}>
                    {r.nearbyPoints.map((n, i) => (
                      <li key={i}>{capFirst(n)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — sticky booking panel */}
          <aside>
            <div className="g-booking">
              <span className="g-label">{(plans[selectedPlan]?.label ?? 'From').toUpperCase()}</span>
              <div className="g-price-big g-num">
                {formatPrice(plans[selectedPlan]?.price ?? r.priceFrom)}
                <span className="u">/mo</span>
              </div>
              <div className="g-result-count">
                {r.availability === 'available' ? 'Available now' : 'Coming soon'}
              </div>
              <p className="caption muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                Net-effective rent — what you pay after any promotion.
              </p>

              {plans.length > 0 && (
                <>
                  <hr className="g-hr" />
                  <span className="g-label">Floor plans</span>
                  <div className="g-plans">
                    {plans.map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        className="g-plan"
                        aria-pressed={i === selectedPlan}
                        onClick={() => setSelectedPlan(i)}
                      >
                        <span className="g-plan-label">{p.label}</span>
                        <span className="g-plan-price g-num">
                          {formatPrice(p.price)}<span className="u">/mo</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              <button
                type="button"
                className="btn btn-primary g-btn-block"
                style={{ width: '100%' }}
                onClick={() => setInquireOpen(true)}
              >
                Book a viewing
              </button>

              <div className="g-portal">
                {portal ? (
                  <a className="btn btn-ghost btn-sm" href={portal.portal} target="_blank" rel="noopener noreferrer">
                    Resident Portal
                  </a>
                ) : (
                  <span className="btn btn-ghost btn-sm g-disabled" aria-disabled="true">
                    Resident Portal · Coming soon
                  </span>
                )}
                {portal ? (
                  <a className="btn btn-ghost btn-sm" href={portal.maintenance} target="_blank" rel="noopener noreferrer">
                    Maintenance Request
                  </a>
                ) : (
                  <span className="btn btn-ghost btn-sm g-disabled" aria-disabled="true">
                    Maintenance · Coming soon
                  </span>
                )}
              </div>

              <div className="g-fav-row">
                <span>Save to favorites</span>
                <FavoriteHeart id={r.id} size={20} />
              </div>

              <hr className="g-hr" />
              <span className="g-label">Contact</span>
              <div className="small" style={{ marginTop: 6 }}>
                <a href={`mailto:${SETTINGS.contactEmail}`}>{SETTINGS.contactEmail}</a>
              </div>
              <div className="small muted">
                <a href={`tel:${SETTINGS.contactPhone.replace(/[^+\d]/g, '')}`}>{SETTINGS.contactPhone}</a>
              </div>
            </div>
          </aside>
        </div>

        {others.length > 0 && (
          <section style={{ marginTop: 'clamp(48px, 7vw, 88px)' }}>
            <div className="g-section-head">
              <div>
                <span className="g-label">You may also like</span>
                <h2 className="g-section-title">Other residences in {r.cityLabel}</h2>
              </div>
            </div>
            <div className="g-grid">
              {others.map((o) => (
                <GCard key={o.id} residence={o} />
              ))}
            </div>
          </section>
        )}
      </div>

      <InquireModal open={inquireOpen} onClose={() => setInquireOpen(false)} residence={r} />
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
