import buildingsJson from '@/content/buildings.json';
import copyJson from '@/content/copy.json';
import amenitiesJson from '@/content/amenities.json';
import photosJson from '@/content/photos.json';
import unitsJson from '@/content/units.json';
import linksJson from '@/content/links.json';
import citiesJson from '@/content/cities.json';
import geocodedJson from '@/content/geocoded.json';
import taxonomiesJson from '@/content/taxonomies.json';
import { SETTINGS } from '@/lib/settings';
import { BRAND } from '@/lib/brand';

/** City slugs are dynamic — the client can add markets from the CMS
 *  (content/cities.json), so this is an open string rather than a union. */
export type CitySlug = string;

export interface City {
  slug: CitySlug;
  label: string;
  province: string;
  image: string;
  blurb: string;
  bounds: { minLng: number; maxLng: number; minLat: number; maxLat: number };
  /** Map centre + jitter spread for properties that haven't been geocoded. */
  center?: { lat: number; lng: number; spreadLat: number; spreadLng: number };
  /** Market is announced but not yet live, render as register-interest, not listings. */
  comingSoon?: boolean;
}

export const CITIES: Record<string, City> = citiesJson as Record<string, City>;

/** Cities in display order: live markets first, coming-soon markets last. */
export const CITY_LIST: City[] = Object.values(CITIES);
export const LIVE_CITIES: City[] = CITY_LIST.filter((c) => !c.comingSoon);
export const COMING_SOON_CITIES: City[] = CITY_LIST.filter((c) => c.comingSoon);

export type Availability = 'available' | 'coming-soon';

/** Tiers are client-editable in the CMS
 *  (content/taxonomies.json), so this is an open string rather than a union. */
export type Tier = string;

export interface Residence {
  id: string;
  slug: string;
  name: string;
  city: CitySlug;
  cityLabel: string;
  address: string;
  coordinates: { lat: number; lng: number };
  description: string;
  longDescription: string;
  bedrooms: string;
  bedroomOptions: number[];
  /** Monthly rent by bedroom count. Keys: 0=Studio, 1..3=Bedroom count. */
  prices: Partial<Record<0 | 1 | 2 | 3, number>>;
  /** Minimum across `prices`, used on cards / "From $X/mo" labels. */
  priceFrom: number;
  /** Promotional banner text, e.g. "Up to 2 months free on a 12-month lease". */
  promo?: string;
  availability: Availability;
  featured: boolean;
  /** Neighbourhood label (shown as the property-page tag). */
  neighbourhood?: string;
  /** Description tier, drives the condition voice on the property page. */
  tier?: Tier;
  heroImage: string;
  gallery: string[];
  /** CMS photo tags keyed by image path (e.g. "Studio", "1 Bedroom") — shown
   *  as badges and used to group the View-all-photos gallery. */
  photoTags?: Record<string, string>;
  /** CMS alt text keyed by image path. */
  photoAlt?: Record<string, string>;
  features: string[];
  amenities: string[];
  nearbyPoints: string[];
  /** Suppress the detail-page gallery for this asset. */
  hideDetailGallery?: boolean;
  incentives?: string[];
  unitLabels?: string[];
  /** Available units for this building. When present,
   *  these drive the "Available suites" table and the building's pricing. */
  units?: Unit[];
}

/** A single available unit. */
export interface Unit {
  unit: string;
  type: string;
  rent: number;
  /** External photo-folder URL for this unit (reference only).
   *  The site serves the local `images` below instead. */
  image?: string;
  /** Local per-unit photos. "View" opens
   *  these in an in-site tile grid + lightbox. */
  images?: string[];
  /** Unit-specific apply URL. Overrides the per-bedroom-type link. */
  applyUrl?: string;
}

/* ============================================================
   Pricing — fallback rate card for buildings with no rows in
   content/units.json. Rates, lease term, and the free-months
   promotion all come from `pricing` in content/settings.json;
   nothing here is client-specific.

   Advertised rent is NET EFFECTIVE over the lease term:
     base × (leaseMonths - freeMonths) / leaseMonths
   e.g. $1,300 × 11/12 = $1,191 with one month free.

   TODO(PMS): the listings are static demo data. A real
   property-management feed replaces units.json later; this card
   stays as the fallback for buildings the feed doesn't cover.
   ============================================================ */
const PRICING = SETTINGS.pricing;

/** Free months for a building: its own override, else the site-wide promo.
 *  Zero when the promo is switched off — the advertised rent is then the
 *  base rate, and no promo banner renders. */
const freeMonthsFor = (raw: RawAsset): number => {
  if (!PRICING.promo.enabled) return 0;
  return raw.promoFreeMonths ?? PRICING.promo.freeMonths;
};

const promoText = (freeMonths: number): string =>
  `Up to ${freeMonths} month${freeMonths === 1 ? '' : 's'} free on a ${PRICING.leaseMonths}-month lease`;

const netEffective = (base: number, freeMonths: number): number =>
  Math.floor((base * (PRICING.leaseMonths - freeMonths)) / PRICING.leaseMonths);

/* ============================================================
   Buildings, from content/buildings.json (CMS-managed).
   Coordinates come from content/geocoded.json; anything not yet
   geocoded falls back to the city centre + a deterministic
   offset from the slug, so pins never collide.
   ============================================================ */
interface RawAsset {
  slug: string;
  name: string;
  city: CitySlug;
  address: string;
  /** Explicit feature flag. Replaces the old `idx % 4 === 0` heuristic
   *  so reordering the array doesn't accidentally re-shuffle featured cards. */
  featured?: boolean;
  /** Suppress the gallery on the detail page (card image still renders). */
  hideDetailGallery?: boolean;
  incentives?: string[];
  unitLabels?: string[];
  /** Bedroom configs the building actually offers (0=Studio, 1..3=bedrooms).
   *  Buildings left blank keep the default until data arrives. */
  bedrooms?: number[];
  /** Overrides the site-wide promo for this building. Ignored when the promo
   *  is switched off in settings. 0 opts the building out entirely. */
  promoFreeMonths?: number;
  /** Archived in the CMS: kept in content/buildings.json but never rendered. */
  archived?: boolean;
  /** Homepage featured-card order (lower first). Unranked featured go last. */
  featuredRank?: number;
}

// NOTE: `slug` is the stable URL + asset-folder key, keep it fixed across
// renames. `name` is the public display name.
const ASSETS: RawAsset[] = buildingsJson as unknown as RawAsset[];

/** Map centre + jitter spread per city, from content/cities.json. A city with
 *  no `center` borrows the first configured city's, so a newly-added market
 *  still lands somewhere sensible before it is geocoded. */
const DEFAULT_CENTER =
  CITY_LIST.find((c) => c.center)?.center
  ?? { lat: 0, lng: 0, spreadLat: 0.04, spreadLng: 0.07 };
const centerFor = (city: CitySlug) => CITIES[city]?.center ?? DEFAULT_CENTER;

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Real lat/lng per property (content/geocoded.json), geocoded via OSM
 *  Nominatim — by scripts/geocode.mjs or the CMS "Fix map pin" button. */
const GEOCODED: Record<string, { lat: number; lng: number }> =
  geocodedJson as Record<string, { lat: number; lng: number }>;

function coordsFor(slug: string, city: CitySlug): { lat: number; lng: number } {
  const real = GEOCODED[slug];
  if (real) return real;
  // Fallback for new properties that haven't been geocoded yet.
  const c = centerFor(city);
  const h = hashSeed(slug);
  const dLat = (((h % 997) / 997) - 0.5) * c.spreadLat * 2;
  const dLng = ((((h * 13) % 1009) / 1009) - 0.5) * c.spreadLng * 2;
  return { lat: +(c.lat + dLat).toFixed(5), lng: +(c.lng + dLng).toFixed(5) };
}

const BEDROOM_VARIANTS: number[][] = [
  [0, 1, 2],
  [1, 2],
  [1, 2, 3],
  [2, 3],
  [0, 1],
];

// (Generic feature/amenity fallback pools removed — the six buildings that
// relied on them had their values frozen into content/amenities.json. New
// properties list nothing until amenities are added in the CMS.)
/** Per-building Residence Features + Building Amenities, copied verbatim from
 *  the client's "Properties Descriptions Checklist" sheet (2026). The sheet is
 *  the single source of truth: each building shows exactly what its row lists,
 *  and anything not on the sheet is removed. Casing is normalised to the site
 *  style; the item set matches the sheet. "Heat and hot water included" = HEAT.
 *  Six buildings are absent from the sheet (britnell-landing, edge, cielo,
 *  greyson, lawson-village, lockwood-arms) and keep their pool fallback. */
const CURATED: Record<string, { features: string[]; amenities: string[] }> =
  amenitiesJson as unknown as Record<string, { features: string[]; amenities: string[] }>;

// (Unsplash hero/gallery fallback pools removed - every building has real or
// coming-soon imagery managed via content/photos.json.)

function bedroomLabel(opts: number[]): string {
  const parts = opts.map((b) => (b === 0 ? 'Studio' : String(b)));
  const onlyStudio = opts.length === 1 && opts[0] === 0;
  return parts.join(' · ') + (onlyStudio ? '' : ' Bedrooms');
}

/** Per-building photo sets synced into public/assets/<slug>/ and managed by
 *  the CMS in content/photos.json. `hidden` lists image paths the client has
 *  hidden in the admin portal - they stay on disk but never render. */
export interface PhotoSet {
  hero?: string | null;
  gallery: string[];
  hidden?: string[];
  /** Tag per image path (e.g. "Studio") — badges + gallery grouping. */
  tags?: Record<string, string>;
  /** Alt text per image path. */
  alt?: Record<string, string>;
}
const REAL_PHOTOS: Record<string, PhotoSet> = photosJson as unknown as Record<string, PhotoSet>;

/** Net-effective pricing from the fallback rate card, for buildings with no
 *  rows in units.json. The advertised number reflects the building's promo. */
function pricesFor(raw: RawAsset): Partial<Record<0 | 1 | 2 | 3, number>> {
  const free = freeMonthsFor(raw);
  const card: Partial<Record<0 | 1 | 2 | 3, number>> = {};
  ([0, 1, 2, 3] as const).forEach((bed) => {
    const base = PRICING.baseRates[String(bed)];
    if (base !== undefined) card[bed] = netEffective(base, free);
  });
  return card;
}

/** Per-building copy (content/copy.json). `description` is the
 *  ready-to-use blurb; `closeTo` populates the NEARBY list. Keyed by slug.
 *  NOTE: bed/bath, rents, and in-suite finishes still come from the
 *  management system, verify before publishing. */
interface BuildingCopy {
  neighbourhood: string;
  tier: Tier;
  description: string;
  closeTo: string[];
}

const COPY: Record<string, BuildingCopy> = copyJson as unknown as Record<string, BuildingCopy>;

/** Client-editable taxonomies (CMS Library): building tiers (with their
 *  standard Overview condition line) and unit types (with bedroom counts). */
interface Taxonomies {
  tiers: Array<{ value: string; label: string; line: string }>;
  unitTypes: Array<{ label: string; bedrooms: number }>;
  photoTags: string[];
}
export const TAXONOMIES: Taxonomies = taxonomiesJson as Taxonomies;

/** Standard condition line per tier, used as the second Overview paragraph. */
const TIER_LINE: Record<string, string> = Object.fromEntries(
  TAXONOMIES.tiers.map((t) => [t.value, t.line])
);
const GENERIC_TIER_LINE = `Operated to the ${BRAND.shortName} standard, locally managed, with a one-business-day maintenance response.`;

/** Unit-type label → bedroom count (0=Studio), from the CMS taxonomies. */
const UNIT_TYPE_TO_NUM: Record<string, number> = Object.fromEntries(
  TAXONOMIES.unitTypes.map((u) => [u.label, u.bedrooms])
);
const UNITS: Record<string, Unit[]> = unitsJson as unknown as Record<string, Unit[]>;

/* ============================================================
   External property-management links (content/links.json).
   Vendor-neutral: the site knows a building's slug in whatever
   PMS the client uses, plus URL templates with a {slug} token.
   Everything is optional — with links.json empty (the template
   default) the Apply and Resident Portal buttons simply don't
   render, which is the correct state until a PMS is wired in.
   ============================================================ */

/** Per-floor-plan "Apply"/"View Details" URLs by bedroom type
 *  (0=Studio, 1..3=bedrooms), keyed by building slug. */
const APPLY_LINKS: Record<string, Partial<Record<0 | 1 | 2 | 3, string>>> =
  linksJson.applyLinks as unknown as Record<string, Partial<Record<0 | 1 | 2 | 3, string>>>;

/** Apply/"View Details" URL for a building + bedroom type, if provided. */
export const applyUrlFor = (slug: string, bed: number): string | undefined =>
  APPLY_LINKS[slug]?.[bed as 0 | 1 | 2 | 3];

/** The building's identifier in the client's resident-services system, keyed
 *  by our slug. Buildings not listed have no portal yet. */
const PORTAL_SLUGS: Record<string, string> =
  linksJson.portalSlugs as Record<string, string>;

/** URL templates for the client's resident-services system. `{slug}` is
 *  replaced with the building's PORTAL_SLUGS entry. Empty = no portal. */
const PORTAL_TEMPLATES: { portal: string; maintenance: string } =
  linksJson.portalTemplates as { portal: string; maintenance: string };

/** Resident Portal + Maintenance Request URLs for a building. Returns
 *  undefined when the building has no portal slug, or no templates are
 *  configured — callers render a "coming soon" state instead. */
export const portalLinksFor = (
  slug: string
): { portal: string; maintenance: string } | undefined => {
  const key = PORTAL_SLUGS[slug];
  const { portal, maintenance } = PORTAL_TEMPLATES ?? { portal: '', maintenance: '' };
  if (!key || !portal || !maintenance) return undefined;
  const fill = (t: string) => t.replace(/\{slug\}/g, key);
  return { portal: fill(portal), maintenance: fill(maintenance) };
};

function makeResidence(raw: RawAsset, _idx: number): Residence {
  const seed = hashSeed(raw.slug);
  const cityLabel = CITIES[raw.city]?.label ?? raw.city;
  const units = UNITS[raw.slug];

  let bedroomOptions: number[];
  let prices: Partial<Record<0 | 1 | 2 | 3, number>>;
  if (units && units.length) {
    // Listed units are the source of truth: bedroom types + rent (min per
    // type) come from the actual available units.
    prices = {};
    units.forEach((u) => {
      const n = UNIT_TYPE_TO_NUM[u.type];
      if (n === undefined || n < 0 || n > 3) return;
      const bed = n as 0 | 1 | 2 | 3;
      const cur = prices[bed];
      prices[bed] = cur === undefined ? u.rent : Math.min(cur, u.rent);
    });
    bedroomOptions = (Object.keys(prices) as unknown as number[])
      .map(Number)
      .sort((a, b) => a - b);
  } else {
    // No units listed: fall back to the building's configured bedrooms (or a
    // deterministic variant) priced off the rate card in settings.json.
    bedroomOptions =
      raw.bedrooms ?? BEDROOM_VARIANTS[seed % BEDROOM_VARIANTS.length];
    const card = pricesFor(raw);
    prices = {};
    bedroomOptions.forEach((b) => {
      const v = card[b as 0 | 1 | 2 | 3];
      if (v !== undefined) prices[b as 0 | 1 | 2 | 3] = v;
    });
  }
  const priceFrom = Math.min(...(Object.values(prices) as number[]));
  // Promo banner, when the site-wide promotion is on and this building
  // hasn't opted out (promoFreeMonths: 0).
  const freeMonths = freeMonthsFor(raw);
  const promo = freeMonths > 0 ? promoText(freeMonths) : undefined;

  const real = REAL_PHOTOS[raw.slug];
  const hiddenSet = new Set(real?.hidden ?? []);
  // Card image: honour the real photo when present and not hidden in the CMS.
  // hideDetailGallery only skips the gallery on the detail page, not the card.
  const visibleHero = real?.hero && !hiddenSet.has(real.hero) ? real.hero : undefined;
  const heroImage = visibleHero || '/assets/coming-soon.png';
  const gallery = raw.hideDetailGallery
    ? []
    : (real?.gallery ?? []).filter((src) => !hiddenSet.has(src));

  const curated = CURATED[raw.slug];
  const features = curated?.features ?? [];
  const amenities = curated?.amenities ?? [];
  const availability: Availability = 'available';
  const featured = raw.featured ?? false;

  const streetLine = raw.address.split(',')[0];
  const copy = COPY[raw.slug];

  return {
    id: `r-${raw.slug}`,
    slug: raw.slug,
    name: raw.name,
    city: raw.city,
    cityLabel,
    address: raw.address,
    coordinates: coordsFor(raw.slug, raw.city),
    neighbourhood: copy?.neighbourhood,
    tier: copy?.tier,
    description: copy?.description
      ?? `${raw.name}, a ${BRAND.shortName} residence at ${streetLine} in ${cityLabel}.`,
    longDescription: copy
      ? TIER_LINE[copy.tier] ?? GENERIC_TIER_LINE
      : `${raw.name} is held within the ${BRAND.name} portfolio at ${raw.address}. The building is restored where appropriate, maintained by a resident manager, and let on terms intended to favour long stays. Detailed unit plans, finishes, and current availability are released on request.`,
    bedrooms: bedroomLabel(bedroomOptions),
    bedroomOptions,
    prices,
    priceFrom,
    promo,
    availability,
    featured,
    hideDetailGallery: raw.hideDetailGallery,
    incentives: raw.incentives,
    unitLabels: raw.unitLabels,
    units,
    heroImage,
    gallery,
    photoTags: real?.tags,
    photoAlt: real?.alt,
    features,
    amenities,
    nearbyPoints: copy?.closeTo ?? [
      'Within walking distance of local shops and cafés',
      'Public transit within a short walk',
      'Quiet residential setting',
    ],
  };
}

/** Live residences only — archived buildings stay in the CMS but never render. */
export const RESIDENCES: Residence[] = ASSETS.filter((a) => !a.archived).map(
  (raw, idx) => makeResidence(raw, idx)
);

const FEATURED_RANK: Record<string, number> = Object.fromEntries(
  ASSETS.filter((a) => a.featuredRank !== undefined).map((a) => [a.slug, a.featuredRank as number])
);

export const getCity = (slug: string): City | undefined => CITIES[slug];
export const getResidence = (slug: string): Residence | undefined =>
  RESIDENCES.find((r) => r.slug === slug);
export const residencesByCity = (slug: string): Residence[] =>
  RESIDENCES.filter((r) => r.city === slug);
export const featuredResidences = (): Residence[] =>
  RESIDENCES.filter((r) => r.featured).sort(
    (a, b) => (FEATURED_RANK[a.slug] ?? Infinity) - (FEATURED_RANK[b.slug] ?? Infinity)
  );

export const formatPrice = (n: number): string => '$' + n.toLocaleString('en-US');

export function bedroomShort(opts: number[]): string {
  const parts = opts.map((b) => (b === 0 ? 'Studio' : String(b)));
  const onlyStudio = opts.length === 1 && opts[0] === 0;
  return parts.join(' · ') + (onlyStudio ? '' : ' Bedrooms');
}
