'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FavoriteHeart } from '@/components/FavoriteHeart';
import { MapView } from '@/components/MapViewClient';
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
import { BoutiqueCard } from './BoutiqueCard';
import { Reveal } from './Reveal';
import './boutique.css';

const COMING_SOON_TILE = '/assets/coming-soon.png';

/** Unit-type label → bedroom count, for matching a suite to its apply link. */
const BED_NUM: Record<string, number> = {
  Studio: 0,
  '1 Bedroom': 1,
  '2 Bedroom': 2,
  '3 Bedroom': 3,
};

const capFirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Airy two-column list — features and amenities. */
function Columns({ items }: { items: string[] }) {
  const mid = Math.ceil(items.length / 2);
  return (
    <div className="b-cols">
      {[items.slice(0, mid), items.slice(mid)].map((col, i) => (
        <ul key={i}>
          {col.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ))}
    </div>
  );
}

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

  // Ordered photo set for the lightbox: hero first, then the gallery.
  const photos = [r.heroImage, ...r.gallery].filter(Boolean);
  const tagLabels = photos.map((p) => r.photoTags?.[p]);
  const photoLabels = tagLabels.some(Boolean) ? tagLabels : undefined;
  const heroIsTile = r.heroImage === COMING_SOON_TILE;

  const plans = r.bedroomOptions
    .filter((b) => r.prices[b as 0 | 1 | 2 | 3] !== undefined)
    .map((b) => ({
      bed: b,
      label: b === 0 ? 'Studio' : `${b} Bedroom`,
      price: r.prices[b as 0 | 1 | 2 | 3] as number,
    }));

  // Real units when the building has them; otherwise one row per bedroom type.
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

  const features = r.incentives ?? r.features;
  const amenities = r.unitLabels ?? r.amenities;
  const others = residencesByCity(r.city).filter((x) => x.id !== r.id).slice(0, 2);
  const portal = portalLinksFor(r.slug);
  const plan = plans[selectedPlan];

  return (
    <main className="page-enter">
      {/* One large image, full width — the boutique move. */}
      <div
        className={'b-prop-hero' + (heroIsTile ? ' is-contain' : '')}
        onClick={() => photos.length && setLightboxIndex(0)}
        style={{ cursor: photos.length ? 'zoom-in' : undefined }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={r.heroImage} alt={`${r.name} · exterior`} loading="eager" />
      </div>

      <div className="b-container">
        <nav className="b-prop-breadcrumb" aria-label="Breadcrumb">
          <a onClick={() => router.push('/')}>Home</a>
          <span className="b-sep">/</span>
          <a onClick={() => router.push('/residences')}>Residences</a>
          <span className="b-sep">/</span>
          <a onClick={() => router.push(`/residences/${r.city}`)}>{r.cityLabel}</a>
          <span className="b-sep">/</span>
          <span>{r.name}</span>
        </nav>

        <header>
          <p className="b-label gold" style={{ marginTop: 26 }}>
            {r.cityLabel}
            {r.neighbourhood ? ` · ${r.neighbourhood}` : ''}
          </p>
          <h1 className="b-prop-title">{r.name}</h1>
          <p className="b-prop-address">{r.address}</p>

          <div className="b-spec">
            <div className="b-spec-item">
              <span className="b-label">From</span>
              <span className="b-spec-val">{formatPrice(r.priceFrom)}</span>
            </div>
            <span className="b-spec-div" />
            <div className="b-spec-item">
              <span className="b-label">Bedrooms</span>
              <span className="b-spec-val">{bedroomShort(r.bedroomOptions)}</span>
            </div>
            <span className="b-spec-div" />
            <div className="b-spec-item">
              <span className="b-label">Available</span>
              <span className="b-spec-val">
                {r.availability === 'available' ? 'Now' : 'Soon'}
              </span>
            </div>
          </div>

          {r.promo && (
            <div className="b-promo">
              <span className="b-promo-tag">Limited offer</span>
              <span className="b-promo-text">{r.promo}</span>
            </div>
          )}
        </header>

        <div className="b-prop-layout">
          <div>
            <section className="b-prop-section" style={{ marginTop: 0 }}>
              <p className="b-label">Overview</p>
              <h2 className="b-section-title">A closer look.</h2>
              <p className="b-prose">{r.description}</p>
              <p className="b-prose muted">{r.longDescription}</p>
            </section>

            {photos.length > 1 && (
              <section className="b-prop-section">
                <p className="b-label">Gallery</p>
                <h2 className="b-section-title">Inside {r.name}.</h2>
                <div className="b-gallery">
                  {photos.slice(0, 6).map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      className={
                        'b-gallery-tile' + (src === COMING_SOON_TILE ? ' is-contain' : '')
                      }
                      onClick={() => setLightboxIndex(i)}
                      aria-label={`${r.name} · photo ${i + 1}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={r.photoAlt?.[src] ?? `${r.name} · ${i + 1}`} loading="lazy" />
                    </button>
                  ))}
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: 24 }}
                  onClick={() => setGalleryOpen(true)}
                >
                  View all photos
                </button>
              </section>
            )}

            {features.length > 0 && (
              <section className="b-prop-section">
                <p className="b-label">{r.incentives ? 'Incentives' : 'Residence features'}</p>
                <h2 className="b-section-title">
                  {r.incentives ? 'What’s included.' : 'In every home.'}
                </h2>
                <Columns items={features} />
              </section>
            )}

            {amenities.length > 0 && (
              <section className="b-prop-section">
                <p className="b-label">{r.unitLabels ? 'Unit photos' : 'Building amenities'}</p>
                <h2 className="b-section-title">In the building.</h2>
                <Columns items={amenities} />
              </section>
            )}

            <section className="b-prop-section">
              <p className="b-label">Availability</p>
              <h2 className="b-section-title">Available suites.</h2>
              {!r.units?.length ? (
                <p className="b-prose muted">
                  There are no suites available at the moment. Register your interest and
                  we&apos;ll be in touch as homes are released.
                </p>
              ) : (
                <>
                  <p className="b-prose muted" style={{ fontSize: '0.95rem' }}>
                    Rents shown are net effective — what you pay after any promotion. Live
                    availability is confirmed at viewing.
                  </p>
                  <div className="b-suites" role="table">
                    <div className="b-suite-row b-suite-head" role="row">
                      <span role="columnheader">Unit</span>
                      <span role="columnheader">Type</span>
                      <span role="columnheader">Rent (net)</span>
                      <span role="columnheader" className="b-suite-cell-apply">
                        Apply
                      </span>
                    </div>
                    {suiteRows.map((row, i) => {
                      const href = row.applyUrl ?? applyUrlFor(r.slug, row.bed);
                      return (
                        <div className="b-suite-row" role="row" key={`${row.unit}-${i}`}>
                          <span
                            role="cell"
                            className={'b-suite-unit' + (row.unit === '—' ? ' muted' : '')}
                          >
                            {row.unit}
                          </span>
                          <span role="cell" className="b-suite-type">
                            {row.type}
                            {row.images?.length ? (
                              <>
                                {' · '}
                                <button
                                  className="b-link"
                                  onClick={() =>
                                    setUnitGallery({
                                      photos: row.images as string[],
                                      label: `Unit ${row.unit}`,
                                    })
                                  }
                                >
                                  View photos
                                </button>
                              </>
                            ) : null}
                          </span>
                          <span role="cell" className="b-suite-rent">
                            {formatPrice(row.price)}
                            <span className="b-suite-mo">/mo</span>
                          </span>
                          <span role="cell" className="b-suite-cell-apply">
                            {href ? (
                              <a
                                className="btn btn-ghost btn-sm"
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Apply
                              </a>
                            ) : (
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setInquireOpen(true)}
                              >
                                Enquire
                              </button>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>

            <section className="b-prop-section">
              <p className="b-label">Location</p>
              <h2 className="b-section-title">The neighbourhood.</h2>
              <div className="b-location">
                <div className="b-map-frame">
                  <MapView residences={[r]} selectedId={r.id} height="100%" showPreview={false} />
                </div>
                <div>
                  <p className="b-label" style={{ marginBottom: 8 }}>
                    Nearby
                  </p>
                  <ul className="b-nearby">
                    {r.nearbyPoints.map((n) => (
                      <li key={n}>{capFirst(n)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          </div>

          <aside>
            <div className="b-book">
              <p className="b-label">{plan?.label ?? 'From'}</p>
              <div className="b-book-price">
                {formatPrice(plan?.price ?? r.priceFrom)}
                <span className="b-book-mo">/month</span>
              </div>
              <p className="b-book-avail">
                {r.availability === 'available' ? 'Available now' : 'Coming soon'}
              </p>
              <p className="b-book-note">
                Net effective rent — what you pay after any promotion.
              </p>

              {plans.length > 0 && (
                <>
                  <p className="b-label" style={{ marginTop: 24 }}>
                    Floor plans
                  </p>
                  <div className="b-plans">
                    {plans.map((p, i) => (
                      <button
                        key={p.label}
                        className={'b-plan' + (i === selectedPlan ? ' active' : '')}
                        aria-pressed={i === selectedPlan}
                        onClick={() => setSelectedPlan(i)}
                      >
                        <span className="b-plan-label">{p.label}</span>
                        <span className="b-plan-price">{formatPrice(p.price)} /mo</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div className="b-book-btns">
                <button className="btn btn-primary" onClick={() => setInquireOpen(true)}>
                  Book a viewing
                </button>

                {portal ? (
                  <a
                    className="btn btn-ghost btn-sm"
                    href={portal.portal}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Resident Portal
                  </a>
                ) : (
                  <span className="btn btn-ghost btn-sm b-book-soon" aria-disabled="true">
                    Resident Portal · Coming soon
                  </span>
                )}

                {portal ? (
                  <a
                    className="btn btn-ghost btn-sm"
                    href={portal.maintenance}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Maintenance Request
                  </a>
                ) : (
                  <span className="btn btn-ghost btn-sm b-book-soon" aria-disabled="true">
                    Maintenance Request · Coming soon
                  </span>
                )}
              </div>

              <div className="b-book-fav">
                <span>Save to favourites</span>
                <FavoriteHeart id={r.id} size={18} />
              </div>

              <div className="b-book-contact">
                <p className="b-label" style={{ marginBottom: 10 }}>
                  Contact
                </p>
                <a href={`mailto:${SETTINGS.contactEmail}`}>{SETTINGS.contactEmail}</a>
                <p className="b-book-avail" style={{ marginTop: 6 }}>
                  {SETTINGS.contactPhone}
                </p>
              </div>
            </div>
          </aside>
        </div>

        {others.length > 0 && (
          <section className="b-prop-section" style={{ paddingBottom: 'var(--b-section)' }}>
            <p className="b-label">More to see</p>
            <h2 className="b-section-title">Other residences in {r.cityLabel}.</h2>
            <div className="b-grid">
              {others.map((o, i) => (
                <Reveal key={o.id} delay={i * 60}>
                  <BoutiqueCard residence={o} hideCity />
                </Reveal>
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
