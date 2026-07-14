'use client';

/* CMS — Property details editor: listing info, "close to" chips,
   incentives, suite features / building amenities, rental links, map
   location, and archive/delete controls for one building. Saves back to
   'buildings', 'copy', 'amenities', and 'links'. */

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getContent, putContent } from '@/components/admin/api';
import { IconPlus, IconSpinner, IconX } from '@/components/admin/icons';
import { ConfirmDialog, Field, PageHead, useToast } from '@/components/admin/ui';
import { useMe } from '@/components/admin/useMe';
import { PropertyTabs } from '@/components/admin/PropertyTabs';
import { Dropdown, type DropdownOption } from '@/components/ui/Dropdown';

type BedKey = '0' | '1' | '2' | '3';

interface Building {
  slug: string;
  name: string;
  city: string;
  address: string;
  featured?: boolean;
  featuredRank?: number;
  archived?: boolean;
  hideDetailGallery?: boolean;
  incentives?: string[];
  unitLabels?: string[];
  bedrooms?: number[];
}

interface CopyEntry {
  neighbourhood: string;
  tier: string;
  description: string;
  closeTo: string[];
}

interface AmenityEntry {
  features: string[];
  amenities: string[];
}

interface LinksData {
  applyLinks: Record<string, Partial<Record<BedKey, string>>>;
  portalSlugs: Record<string, string>;
  /** links.json also carries `portalTemplates` (the URL patterns the public
   *  site fills in). The CMS never edits them, so every save spreads the
   *  document it loaded and only overwrites the two keys it owns — nothing
   *  else in the file is dropped. */
  [key: string]: unknown;
}

interface Taxonomies {
  tiers: Array<{ value: string; label: string; line: string }>;
  unitTypes: Array<{ label: string; bedrooms: number }>;
  photoTags: string[];
}

interface CityEntry {
  slug: string;
  label: string;
  province: string;
  comingSoon?: boolean;
}

interface GeoPoint {
  lat: number;
  lng: number;
}

/** Everything the user can edit on this page, in one comparable object. */
interface Draft {
  name: string;
  address: string;
  city: string;
  featured: boolean;
  featuredRank: string;
  hideDetailGallery: boolean;
  incentives: string[];
  neighbourhood: string;
  tier: string;
  description: string;
  closeTo: string[];
  features: string[];
  amenities: string[];
  portalId: string;
  apply: Record<BedKey, string>;
}

const BED_KEYS: BedKey[] = ['0', '1', '2', '3'];

const BED_LABELS: Record<BedKey, string> = {
  '0': 'Studio',
  '1': '1 Bedroom',
  '2': '2 Bedroom',
  '3': '3 Bedroom',
};

/* ---------- Untrusted-data coercion ---------- */

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : [];
}

function asOption(value: unknown, options: DropdownOption[]): string {
  if (typeof value === 'string' && options.some((o) => o.value === value)) {
    return value;
  }
  return options[0]?.value ?? '';
}

/* ---------- Chip editor ---------- */

function ChipEditor({
  items,
  onChange,
  placeholder,
  addAriaLabel,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  addAriaLabel: string;
}) {
  const [text, setText] = useState('');

  const add = (e: FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    if (!items.includes(value)) onChange([...items, value]);
    setText('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.length === 0 ? (
        <p className="adm-muted" style={{ margin: 0, fontSize: 12.5 }}>
          Nothing added yet.
        </p>
      ) : (
        <div className="adm-chip-row">
          {items.map((item) => (
            <span key={item} className="adm-chip">
              {item}
              <button
                type="button"
                aria-label={`Remove ${item}`}
                onClick={() => onChange(items.filter((x) => x !== item))}
              >
                <IconX />
              </button>
            </span>
          ))}
        </div>
      )}
      <form className="adm-row" style={{ flexWrap: 'nowrap', gap: 8 }} onSubmit={add}>
        <input
          className="adm-input"
          style={{ minHeight: 36 }}
          value={text}
          placeholder={placeholder}
          aria-label={addAriaLabel}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="adm-btn sm ghost">
          <IconPlus />
          Add
        </button>
      </form>
    </div>
  );
}

/* ---------- Page ---------- */

export default function PropertyDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const toast = useToast();
  const me = useMe();

  const [buildings, setBuildings] = useState<Building[] | null>(null);
  const [copyAll, setCopyAll] = useState<Record<string, CopyEntry>>({});
  const [amenitiesAll, setAmenitiesAll] = useState<Record<string, AmenityEntry>>({});
  const [linksAll, setLinksAll] = useState<LinksData>({ applyLinks: {}, portalSlugs: {} });
  const [cityOptions, setCityOptions] = useState<DropdownOption[]>([]);
  const [tierOptions, setTierOptions] = useState<DropdownOption[]>([]);
  const [geo, setGeo] = useState<GeoPoint | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [snapshot, setSnapshot] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const [geocoding, setGeocoding] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dangerBusy, setDangerBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getContent<Building[]>('buildings'),
      getContent<Record<string, CopyEntry>>('copy'),
      getContent<Record<string, AmenityEntry>>('amenities'),
      getContent<LinksData>('links'),
      getContent<Taxonomies>('taxonomies'),
      getContent<Record<string, CityEntry>>('cities'),
      getContent<Record<string, GeoPoint>>('geocoded'),
    ])
      .then(([b, c, a, l, tax, cities, geocoded]) => {
        if (cancelled) return;
        const list = Array.isArray(b) ? b : [];
        const copyRec = c && typeof c === 'object' ? c : {};
        const amenRec = a && typeof a === 'object' ? a : {};
        const links: LinksData = {
          ...(l && typeof l === 'object' ? l : {}),
          applyLinks:
            l && typeof l.applyLinks === 'object' && l.applyLinks !== null
              ? l.applyLinks
              : {},
          portalSlugs:
            l && typeof l.portalSlugs === 'object' && l.portalSlugs !== null
              ? l.portalSlugs
              : {},
        };
        const cityOpts: DropdownOption[] = Object.values(
          cities && typeof cities === 'object' ? cities : {}
        )
          .filter(
            (x): x is CityEntry =>
              !!x && typeof x.slug === 'string' && typeof x.label === 'string'
          )
          .map((x) => ({ value: x.slug, label: x.label }));
        const tierOpts: DropdownOption[] = (Array.isArray(tax?.tiers) ? tax.tiers : [])
          .filter((t) => typeof t?.value === 'string' && typeof t?.label === 'string')
          .map((t) => ({ value: t.value, label: t.label }));

        setBuildings(list);
        setCopyAll(copyRec);
        setAmenitiesAll(amenRec);
        setLinksAll(links);
        setCityOptions(cityOpts);
        setTierOptions(tierOpts);

        const point = geocoded && typeof geocoded === 'object' ? geocoded[slug] : undefined;
        if (point && typeof point.lat === 'number' && typeof point.lng === 'number') {
          setGeo({ lat: point.lat, lng: point.lng });
        }

        const building = list.find((x) => x.slug === slug);
        if (!building) return;

        const copy = copyRec[slug];
        const amenity = amenRec[slug];
        const applyRaw = links.applyLinks[slug] ?? {};
        const apply = {} as Record<BedKey, string>;
        for (const k of BED_KEYS) {
          apply[k] = typeof applyRaw[k] === 'string' ? applyRaw[k] : '';
        }
        const initial: Draft = {
          name: typeof building.name === 'string' ? building.name : '',
          address: typeof building.address === 'string' ? building.address : '',
          city: asOption(building.city, cityOpts),
          featured: building.featured === true,
          featuredRank:
            typeof building.featuredRank === 'number' && building.featuredRank >= 1
              ? String(building.featuredRank)
              : '',
          hideDetailGallery: building.hideDetailGallery === true,
          incentives: asStringArray(building.incentives),
          neighbourhood: typeof copy?.neighbourhood === 'string' ? copy.neighbourhood : '',
          tier: asOption(copy?.tier, tierOpts),
          description: typeof copy?.description === 'string' ? copy.description : '',
          closeTo: asStringArray(copy?.closeTo),
          features: asStringArray(amenity?.features),
          amenities: asStringArray(amenity?.amenities),
          portalId:
            typeof links.portalSlugs[slug] === 'string' ? links.portalSlugs[slug] : '',
          apply,
        };
        setDraft(initial);
        setSnapshot(JSON.stringify(initial));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load property.');
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const dirty = useMemo(
    () => draft !== null && JSON.stringify(draft) !== snapshot,
    [draft, snapshot]
  );

  const nameError = draft !== null && draft.name.trim() === '';
  const addressError = draft !== null && draft.address.trim() === '';
  const valid = !nameError && !addressError;

  const patch = (partial: Partial<Draft>) =>
    setDraft((d) => (d ? { ...d, ...partial } : d));

  const handleDiscard = () => {
    if (snapshot) setDraft(JSON.parse(snapshot) as Draft);
  };

  const handleSave = async () => {
    if (!draft || !buildings || !valid || saving) return;
    setSaving(true);
    try {
      const rank = Math.floor(Number(draft.featuredRank));
      const rankValid =
        draft.featured &&
        draft.featuredRank.trim() !== '' &&
        Number.isFinite(rank) &&
        rank >= 1;

      const nextBuildings = buildings.map((b) => {
        if (b.slug !== slug) return b;
        const merged: Building = {
          ...b,
          name: draft.name.trim(),
          address: draft.address.trim(),
          city: draft.city,
        };
        if (draft.featured) merged.featured = true;
        else delete merged.featured;
        if (rankValid) merged.featuredRank = rank;
        else delete merged.featuredRank;
        if (draft.hideDetailGallery) merged.hideDetailGallery = true;
        else delete merged.hideDetailGallery;
        if (draft.incentives.length > 0) merged.incentives = draft.incentives;
        else delete merged.incentives;
        return merged;
      });

      const nextCopy: Record<string, CopyEntry> = {
        ...copyAll,
        [slug]: {
          neighbourhood: draft.neighbourhood.trim(),
          tier: draft.tier,
          description: draft.description.trim(),
          closeTo: draft.closeTo,
        },
      };

      const nextAmenities: Record<string, AmenityEntry> = {
        ...amenitiesAll,
        [slug]: { features: draft.features, amenities: draft.amenities },
      };

      const applyEntry: Partial<Record<BedKey, string>> = {};
      for (const k of BED_KEYS) {
        const v = draft.apply[k].trim();
        if (v) applyEntry[k] = v;
      }
      const nextApplyLinks = { ...linksAll.applyLinks };
      if (Object.keys(applyEntry).length > 0) nextApplyLinks[slug] = applyEntry;
      else delete nextApplyLinks[slug];
      const nextPortalSlugs = { ...linksAll.portalSlugs };
      const portalId = draft.portalId.trim();
      if (portalId) nextPortalSlugs[slug] = portalId;
      else delete nextPortalSlugs[slug];
      const nextLinks: LinksData = {
        ...linksAll,
        applyLinks: nextApplyLinks,
        portalSlugs: nextPortalSlugs,
      };

      await putContent('buildings', nextBuildings);
      await putContent('copy', nextCopy);
      await putContent('amenities', nextAmenities);
      await putContent('links', nextLinks);

      setBuildings(nextBuildings);
      setCopyAll(nextCopy);
      setAmenitiesAll(nextAmenities);
      setLinksAll(nextLinks);

      const saved: Draft = {
        ...draft,
        name: draft.name.trim(),
        address: draft.address.trim(),
        featuredRank: rankValid ? String(rank) : '',
        neighbourhood: draft.neighbourhood.trim(),
        description: draft.description.trim(),
        portalId,
        apply: {
          '0': applyEntry['0'] ?? '',
          '1': applyEntry['1'] ?? '',
          '2': applyEntry['2'] ?? '',
          '3': applyEntry['3'] ?? '',
        },
      };
      setDraft(saved);
      setSnapshot(JSON.stringify(saved));
      toast('success', 'Property saved.');
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Failed to save property.');
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Map pin ---------- */

  const handleGeocode = async () => {
    if (geocoding) return;
    setGeocoding(true);
    try {
      const res = await fetch('/api/admin/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        lat?: number;
        lng?: number;
        error?: string;
      } | null;
      if (
        !res.ok ||
        !body?.ok ||
        typeof body.lat !== 'number' ||
        typeof body.lng !== 'number'
      ) {
        throw new Error(body?.error ?? 'Could not geocode this address.');
      }
      setGeo({ lat: body.lat, lng: body.lng });
      toast('success', `Pin set to ${body.lat}, ${body.lng}.`);
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Could not geocode this address.');
    } finally {
      setGeocoding(false);
    }
  };

  /* ---------- Archive / restore / delete (act immediately) ---------- */

  const applyArchived = async (archived: boolean) => {
    if (!buildings || dangerBusy) return;
    setDangerBusy(true);
    try {
      const nextBuildings = buildings.map((b) => {
        if (b.slug !== slug) return b;
        const merged: Building = { ...b };
        if (archived) merged.archived = true;
        else delete merged.archived;
        return merged;
      });
      await putContent('buildings', nextBuildings);
      setBuildings(nextBuildings);
      setConfirmArchive(false);
      toast(
        'success',
        archived
          ? 'Property archived. It no longer appears on the website.'
          : 'Property restored. It appears on the website again.'
      );
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Could not update the property.');
    } finally {
      setDangerBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!buildings || dangerBusy) return;
    setDangerBusy(true);
    try {
      const [photos, units] = await Promise.all([
        getContent<Record<string, unknown>>('photos'),
        getContent<Record<string, unknown>>('units'),
      ]);
      const name = buildings.find((b) => b.slug === slug)?.name ?? slug;

      const nextBuildings = buildings.filter((b) => b.slug !== slug);
      const nextPhotos = { ...(photos ?? {}) };
      delete nextPhotos[slug];
      const nextUnits = { ...(units ?? {}) };
      delete nextUnits[slug];
      const nextCopy = { ...copyAll };
      delete nextCopy[slug];
      const nextAmenities = { ...amenitiesAll };
      delete nextAmenities[slug];
      const nextApplyLinks = { ...linksAll.applyLinks };
      delete nextApplyLinks[slug];
      const nextPortalSlugs = { ...linksAll.portalSlugs };
      delete nextPortalSlugs[slug];

      await putContent('buildings', nextBuildings);
      await putContent('photos', nextPhotos);
      await putContent('units', nextUnits);
      await putContent('copy', nextCopy);
      await putContent('amenities', nextAmenities);
      await putContent('links', {
        ...linksAll,
        applyLinks: nextApplyLinks,
        portalSlugs: nextPortalSlugs,
      });

      toast('success', `${name} deleted permanently.`);
      router.push('/admin/properties');
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Could not delete the property.');
      setConfirmDelete(false);
      setDangerBusy(false);
    }
  };

  /* ---------- Render states ---------- */

  if (loadError) {
    return (
      <>
        <PropertyTabs slug={slug} />
        <div className="adm-card">
          <div className="adm-empty">
            <div className="t">Something went wrong</div>
            <p>{loadError}</p>
          </div>
        </div>
      </>
    );
  }

  if (!buildings) {
    return (
      <>
        <PropertyTabs slug={slug} />
        <p className="adm-muted">
          <IconSpinner style={{ verticalAlign: '-3px', marginRight: 8 }} />
          Loading…
        </p>
      </>
    );
  }

  const building = buildings.find((b) => b.slug === slug);
  if (!building || !draft) {
    return (
      <>
        <PropertyTabs slug={slug} />
        <div className="adm-card">
          <div className="adm-empty">
            <div className="t">Property not found</div>
            <p>No building with the slug “{slug}” exists.</p>
          </div>
        </div>
      </>
    );
  }

  const archived = building.archived === true;

  return (
    <>
      <PropertyTabs slug={slug} />
      <PageHead
        eyebrow="Property"
        title={building.name}
        lede={building.address}
        actions={archived ? <span className="adm-badge danger">Archived</span> : undefined}
      />
      <p className="adm-muted" style={{ margin: '-16px 0 24px', fontSize: 12.5 }}>
        Slug: <span className="adm-mono-num">{slug}</span> (read-only)
      </p>

      {/* ---------- Listing details ---------- */}
      <section className="adm-card" style={{ marginBottom: 22 }}>
        <div className="adm-card-head">
          <h2 className="adm-card-title">Listing details</h2>
        </div>
        <div className="adm-card-pad">
          <div className="adm-form-grid">
            <Field label="Display name" required>
              <input
                className="adm-input"
                value={draft.name}
                required
                aria-invalid={nameError || undefined}
                onChange={(e) => patch({ name: e.target.value })}
              />
              {nameError && (
                <span className="adm-error-text">Display name is required.</span>
              )}
            </Field>
            <Field label="Address" required span2>
              <input
                className="adm-input"
                value={draft.address}
                required
                aria-invalid={addressError || undefined}
                onChange={(e) => patch({ address: e.target.value })}
              />
              {addressError && (
                <span className="adm-error-text">Address is required.</span>
              )}
            </Field>
            <Field label="City">
              <Dropdown
                variant="admin"
                ariaLabel="City"
                value={draft.city}
                options={cityOptions}
                onChange={(city) => patch({ city })}
              />
            </Field>
            <Field label="Neighbourhood">
              <input
                className="adm-input"
                value={draft.neighbourhood}
                onChange={(e) => patch({ neighbourhood: e.target.value })}
              />
            </Field>
            <Field label="Tier">
              <Dropdown
                variant="admin"
                ariaLabel="Tier"
                value={draft.tier}
                options={tierOptions}
                onChange={(tier) => patch({ tier })}
              />
            </Field>
            <div className="adm-field">
              <span className="adm-label">Featured</span>
              <label className="adm-switch">
                <input
                  type="checkbox"
                  checked={draft.featured}
                  onChange={(e) => patch({ featured: e.target.checked })}
                />
                <span className="track" />
                Featured on homepage
              </label>
            </div>
            {draft.featured && (
              <Field
                label="Featured order"
                help="Lower numbers appear first on the homepage; leave empty for last."
              >
                <input
                  className="adm-input"
                  type="number"
                  min={1}
                  style={{ width: 110 }}
                  value={draft.featuredRank}
                  onChange={(e) => patch({ featuredRank: e.target.value })}
                />
              </Field>
            )}
            <div className="adm-field">
              <span className="adm-label">Photo gallery</span>
              <label className="adm-switch">
                <input
                  type="checkbox"
                  checked={draft.hideDetailGallery}
                  onChange={(e) => patch({ hideDetailGallery: e.target.checked })}
                />
                <span className="track" />
                Hide photo gallery on property page
              </label>
              <span className="adm-help">
                The property page shows no photo section at all; the listing card keeps
                its hero.
              </span>
            </div>
            <Field
              label="Description"
              span2
              help="Shown as the first paragraph on the property page."
            >
              <textarea
                className="adm-textarea"
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </section>

      {/* ---------- Close to ---------- */}
      <section className="adm-card" style={{ marginBottom: 22 }}>
        <div className="adm-card-head">
          <h2 className="adm-card-title">Close to</h2>
        </div>
        <div className="adm-card-pad">
          <p className="adm-help" style={{ margin: '0 0 14px' }}>
            Nearby landmarks and amenities shown as a list on the property page.
          </p>
          <ChipEditor
            items={draft.closeTo}
            onChange={(closeTo) => patch({ closeTo })}
            placeholder="e.g. Light-rail station"
            addAriaLabel="Add a nearby place"
          />
        </div>
      </section>

      {/* ---------- Incentives ---------- */}
      <section className="adm-card" style={{ marginBottom: 22 }}>
        <div className="adm-card-head">
          <h2 className="adm-card-title">Incentives</h2>
        </div>
        <div className="adm-card-pad">
          <p className="adm-help" style={{ margin: '0 0 14px' }}>
            Shown as incentive lines on the property page.
          </p>
          <ChipEditor
            items={draft.incentives}
            onChange={(incentives) => patch({ incentives })}
            placeholder="e.g. One month free on 12-month leases"
            addAriaLabel="Add an incentive"
          />
        </div>
      </section>

      {/* ---------- Features & amenities ---------- */}
      <section className="adm-card" style={{ marginBottom: 22 }}>
        <div className="adm-card-head">
          <h2 className="adm-card-title">Features &amp; amenities</h2>
        </div>
        <div className="adm-card-pad">
          <p className="adm-help" style={{ margin: '0 0 16px' }}>
            When both lists are empty, the site shows a generic fallback set.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 24,
            }}
          >
            <div className="adm-field">
              <span className="adm-label">Suite features</span>
              <ChipEditor
                items={draft.features}
                onChange={(features) => patch({ features })}
                placeholder="e.g. In-suite laundry"
                addAriaLabel="Add a suite feature"
              />
            </div>
            <div className="adm-field">
              <span className="adm-label">Building amenities</span>
              <ChipEditor
                items={draft.amenities}
                onChange={(amenities) => patch({ amenities })}
                placeholder="e.g. Secured entry"
                addAriaLabel="Add a building amenity"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Rental links ---------- */}
      <section className="adm-card" style={{ marginBottom: 22 }}>
        <div className="adm-card-head">
          <h2 className="adm-card-title">Rental links</h2>
        </div>
        <div className="adm-card-pad">
          <div className="adm-form-grid">
            <Field
              label="Resident portal ID"
              span2
              help="Powers the Resident Portal and Maintenance Request buttons. Leave empty to show 'Coming soon'."
            >
              <input
                className="adm-input"
                value={draft.portalId}
                onChange={(e) => patch({ portalId: e.target.value })}
              />
            </Field>
            {BED_KEYS.map((k) => (
              <Field key={k} label={`Apply link — ${BED_LABELS[k]}`}>
                <input
                  className="adm-input"
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  value={draft.apply[k]}
                  onChange={(e) =>
                    patch({ apply: { ...draft.apply, [k]: e.target.value } })
                  }
                />
              </Field>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Map location ---------- */}
      <section className="adm-card" style={{ marginBottom: 22 }}>
        <div className="adm-card-head">
          <h2 className="adm-card-title">Map location</h2>
        </div>
        <div className="adm-card-pad">
          <div className="adm-row" style={{ justifyContent: 'space-between', gap: 18 }}>
            <div className="adm-grow">
              {geo ? (
                <p style={{ margin: 0 }}>
                  Pinned at{' '}
                  <span className="adm-mono-num">
                    {geo.lat}, {geo.lng}
                  </span>
                </p>
              ) : (
                <p className="adm-muted" style={{ margin: 0 }}>
                  Approximate — not geocoded yet
                </p>
              )}
              <p className="adm-help" style={{ margin: '6px 0 0' }}>
                Uses the address above to place this building precisely on the website
                map.
              </p>
            </div>
            <button
              type="button"
              className="adm-btn ghost"
              onClick={() => void handleGeocode()}
              disabled={geocoding}
            >
              {geocoding && <IconSpinner />}
              {geocoding ? 'Locating…' : 'Fix map pin from address'}
            </button>
          </div>
        </div>
      </section>

      {/* ---------- Danger zone (admins only) ---------- */}
      {me?.role === 'admin' && (
        <section className="adm-card" style={{ marginBottom: 22 }}>
          <div className="adm-card-head">
            <h2 className="adm-card-title">Danger zone</h2>
          </div>
          <div className="adm-card-pad">
            <div className="adm-row" style={{ justifyContent: 'space-between', gap: 18 }}>
              <div className="adm-grow">
                <strong>{archived ? 'Restore property' : 'Archive property'}</strong>
                <p className="adm-help" style={{ margin: '4px 0 0' }}>
                  {archived
                    ? 'This property is archived and hidden from the website. Restoring it makes it visible again immediately.'
                    : 'The property stays in the CMS but disappears from the website immediately.'}
                </p>
              </div>
              {archived ? (
                <button
                  type="button"
                  className="adm-btn ghost"
                  onClick={() => void applyArchived(false)}
                  disabled={dangerBusy}
                >
                  {dangerBusy && <IconSpinner />}
                  Restore property
                </button>
              ) : (
                <button
                  type="button"
                  className="adm-btn ghost"
                  onClick={() => setConfirmArchive(true)}
                  disabled={dangerBusy}
                >
                  Archive property
                </button>
              )}
            </div>
            <hr className="adm-divider" style={{ margin: '18px 0' }} />
            <div className="adm-row" style={{ justifyContent: 'space-between', gap: 18 }}>
              <div className="adm-grow">
                <strong>Delete permanently</strong>
                <p className="adm-help" style={{ margin: '4px 0 0' }}>
                  Removes the building and all of its content from the CMS. This cannot be
                  undone.
                </p>
              </div>
              <button
                type="button"
                className="adm-btn danger"
                onClick={() => setConfirmDelete(true)}
                disabled={dangerBusy}
              >
                Delete permanently
              </button>
            </div>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={confirmArchive}
        title={`Archive ${building.name}?`}
        body="It stays in the CMS, but disappears from the website immediately after archiving. You can restore it at any time."
        confirmLabel="Archive"
        busy={dangerBusy}
        onConfirm={() => void applyArchived(true)}
        onCancel={() => setConfirmArchive(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${building.name} permanently?`}
        body="This removes the building plus its photos, units, copy, amenities, and rental links from the CMS. This cannot be undone."
        confirmLabel="Delete"
        danger
        busy={dangerBusy}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />

      {/* ---------- Save bar ---------- */}
      {dirty && (
        <div className="adm-savebar">
          <span>You have unsaved changes</span>
          <div className="adm-row" style={{ flexWrap: 'nowrap' }}>
            <button
              type="button"
              className="adm-btn ghost"
              style={{
                borderColor: 'rgba(247,243,236,0.4)',
                color: 'var(--adm-ivory)',
                background: 'transparent',
              }}
              onClick={handleDiscard}
              disabled={saving}
            >
              Discard
            </button>
            <button
              type="button"
              className="adm-btn gold"
              onClick={handleSave}
              disabled={saving || !valid}
            >
              {saving && <IconSpinner />}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
