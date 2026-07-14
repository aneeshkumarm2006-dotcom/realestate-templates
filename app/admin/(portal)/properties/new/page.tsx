'use client';

/* CMS — Add property: creates the building record plus its empty
   photo set, then sends the user to the photo manager to upload images. */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { getContent, putContent } from '@/components/admin/api';
import { IconChevronLeft, IconSpinner } from '@/components/admin/icons';
import { Field, PageHead, useToast } from '@/components/admin/ui';
import { Dropdown, type DropdownOption } from '@/components/ui/Dropdown';

interface Building {
  slug: string;
  name: string;
  city: string;
  address: string;
  featured?: boolean;
  bedrooms?: number[];
}

interface BuildingCopy {
  neighbourhood: string;
  tier: string;
  description: string;
  closeTo: string[];
}

interface PhotoSet {
  hero: string | null;
  gallery: string[];
  hidden: string[];
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

const BEDROOM_OPTIONS = [
  { value: 0, label: 'Studio' },
  { value: 1, label: '1 Bedroom' },
  { value: 2, label: '2 Bedroom' },
  { value: 3, label: '3 Bedroom' },
];

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export default function NewPropertyPage() {
  const router = useRouter();
  const toast = useToast();
  const [existing, setExisting] = useState<Building[] | null>(null);
  const [cityOptions, setCityOptions] = useState<DropdownOption[]>([]);
  const [tierOptions, setTierOptions] = useState<DropdownOption[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [neighbourhood, setNeighbourhood] = useState('');
  const [tier, setTier] = useState('coming-soon');
  const [description, setDescription] = useState('');
  const [featured, setFeatured] = useState(false);
  const [bedrooms, setBedrooms] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getContent<Building[]>('buildings'),
      getContent<Record<string, CityEntry>>('cities'),
      getContent<Taxonomies>('taxonomies'),
    ])
      .then(([b, cities, tax]) => {
        if (cancelled) return;
        setExisting(Array.isArray(b) ? b : []);

        const cityEntries = Object.values(
          cities && typeof cities === 'object' ? cities : {}
        ).filter(
          (x): x is CityEntry =>
            !!x && typeof x.slug === 'string' && typeof x.label === 'string'
        );
        setCityOptions(cityEntries.map((x) => ({ value: x.slug, label: x.label })));
        const defaultCity = cityEntries.find((x) => x.comingSoon !== true) ?? cityEntries[0];
        setCity((current) => current || (defaultCity?.slug ?? ''));

        const tiers = (Array.isArray(tax?.tiers) ? tax.tiers : [])
          .filter((t) => typeof t?.value === 'string' && typeof t?.label === 'string')
          .map((t) => ({ value: t.value, label: t.label }));
        setTierOptions(tiers);
        setTier((current) =>
          tiers.some((t) => t.value === current) ? current : tiers[0]?.value ?? ''
        );
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load properties.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveSlug = slugTouched ? slug : slugify(name);
  const slugValid = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(effectiveSlug);
  const slugTaken = !!existing?.some((b) => b.slug === effectiveSlug);
  const nameValid = name.trim().length > 0;
  const addressValid = address.trim().length > 0;
  const canSave =
    !busy &&
    nameValid &&
    addressValid &&
    slugValid &&
    !slugTaken &&
    city !== '' &&
    !!existing;

  const toggleBedroom = (value: number) =>
    setBedrooms((prev) =>
      prev.includes(value)
        ? prev.filter((b) => b !== value)
        : [...prev, value].sort()
    );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSave || !existing) return;
    setBusy(true);
    try {
      const building: Building = {
        slug: effectiveSlug,
        name: name.trim(),
        city,
        address: address.trim(),
      };
      if (featured) building.featured = true;
      if (bedrooms.length > 0) building.bedrooms = bedrooms;

      const [photos, copy] = await Promise.all([
        getContent<Record<string, PhotoSet>>('photos'),
        getContent<Record<string, BuildingCopy>>('copy'),
      ]);

      photos[effectiveSlug] = { hero: null, gallery: [], hidden: [] };
      if (neighbourhood.trim() || description.trim()) {
        copy[effectiveSlug] = {
          neighbourhood: neighbourhood.trim(),
          tier,
          description: description.trim(),
          closeTo: [],
        };
      }

      await putContent('buildings', [...existing, building]);
      await putContent('photos', photos);
      if (copy[effectiveSlug]) await putContent('copy', copy);

      toast('success', `${building.name} created. Add photos next.`);
      router.push(`/admin/properties/${effectiveSlug}/images`);
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Could not create the property.');
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <div className="adm-card">
        <div className="adm-empty">
          <div className="t">Something went wrong</div>
          <p>{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="adm-row" style={{ marginBottom: 24 }}>
        <Link href="/admin/properties" className="adm-btn-bare">
          <IconChevronLeft />
          All properties
        </Link>
      </div>

      <PageHead
        eyebrow="New listing"
        title="Add a property"
        lede="Create the building first — you'll add photos, amenities, and available units right after. It appears on the website with a coming-soon cover until photos are uploaded."
      />

      <form onSubmit={submit} noValidate>
        <div className="adm-card adm-card-pad" style={{ marginBottom: 22 }}>
          <div className="adm-form-grid">
            <Field label="Display name" required>
              <input
                className="adm-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Riverside Manor"
                autoFocus
              />
              {!nameValid && name !== '' && (
                <span className="adm-error-text">Name is required.</span>
              )}
            </Field>

            <Field
              label="Web address (slug)"
              help={
                effectiveSlug
                  ? `Will live at /residences/${city}/${effectiveSlug}`
                  : 'Generated from the name — lowercase letters, numbers and hyphens.'
              }
            >
              <input
                className="adm-input"
                value={effectiveSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase());
                }}
                placeholder="riverside-manor"
              />
              {effectiveSlug && !slugValid && (
                <span className="adm-error-text">
                  Use lowercase letters, numbers, and hyphens only.
                </span>
              )}
              {slugTaken && (
                <span className="adm-error-text">
                  Another property already uses this address.
                </span>
              )}
            </Field>

            <Field label="Address" required span2>
              <input
                className="adm-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, City, Province Postal code"
              />
            </Field>

            <Field label="City">
              <Dropdown
                variant="admin"
                ariaLabel="City"
                value={city}
                options={cityOptions}
                onChange={setCity}
              />
            </Field>

            <Field label="Tier">
              <Dropdown
                variant="admin"
                ariaLabel="Tier"
                value={tier}
                options={tierOptions}
                onChange={setTier}
              />
            </Field>

            <Field label="Neighbourhood">
              <input
                className="adm-input"
                value={neighbourhood}
                onChange={(e) => setNeighbourhood(e.target.value)}
                placeholder="e.g. Market Square"
              />
            </Field>

            <Field label="Featured on homepage">
              <label className="adm-switch">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                />
                <span className="track" />
                {featured ? 'Featured' : 'Not featured'}
              </label>
            </Field>

            <Field
              label="Bedroom types offered"
              help="Used for the search filters and the bedrooms line on the listing."
              span2
            >
              <div className="adm-chip-row">
                {BEDROOM_OPTIONS.map((b) => (
                  <label
                    key={b.value}
                    className="adm-chip"
                    style={{
                      cursor: 'pointer',
                      borderColor: bedrooms.includes(b.value)
                        ? 'var(--adm-gold)'
                        : undefined,
                      background: bedrooms.includes(b.value)
                        ? 'rgba(184, 150, 90, 0.08)'
                        : undefined,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={bedrooms.includes(b.value)}
                      onChange={() => toggleBedroom(b.value)}
                      style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                    />
                    {b.label}
                  </label>
                ))}
              </div>
            </Field>

            <Field
              label="Description"
              help="Shown as the first paragraph on the property page. You can also write this later."
              span2
            >
              <textarea
                className="adm-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A few sentences about the building and its neighbourhood…"
              />
            </Field>
          </div>
        </div>

        <div className="adm-row" style={{ justifyContent: 'flex-end' }}>
          <Link href="/admin/properties" className="adm-btn ghost">
            Cancel
          </Link>
          <button className="adm-btn gold" type="submit" disabled={!canSave}>
            {busy && <IconSpinner />}
            {busy ? 'Creating…' : 'Create property'}
          </button>
        </div>
      </form>
    </>
  );
}
