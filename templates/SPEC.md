# Template build spec (shared contract)

You are building ONE alternate front-end template for a de-branded Next.js 14
real-estate site. Three templates ship in the repo and switch via a single
config value (`content/brand.json → "template"`). All templates read the SAME
content and the SAME resolved colour palette. The existing "editorial" template
is done and is the fallback — anything your template doesn't implement renders
the editorial version, so you only build what you list in your `index.ts`.

## Hard rules

- **Only touch files inside your own template folder** (`templates/grid/` or
  `templates/boutique/`). Do NOT edit `lib/`, `content/`, `app/`,
  `components/`, `templates/editorial/`, the other template, or `SPEC.md`.
- **Do NOT modify `content/brand.json`, and do NOT run the dev server** — the
  parent process and the other builder are using them. Verify with
  `npx tsc --noEmit` only (fix errors originating in YOUR files; ignore others).
- Every component that uses React hooks or browser APIs needs `'use client';`
  as its first line.
- Never hardcode a company name, city, phone, email, or hex colour. Pull them
  from the data/config APIs below and the CSS variables.
- Responsive is required: usable at 360px, 768px, and desktop.

## Colour — CSS variables only

The active palette is injected as `:root` custom properties. USE THESE, never
literal hex (rgba() of a token for overlays is fine):

```
--ink            darkest — body text, dark sections
--ink-soft       lifted dark — gradients/hovers on dark
--ivory          page background
--cream          alternating section background
--bone           card/panel surface
--gold           ACCENT (hue varies by palette — may be blue, coral, brass…)
--gold-soft      soft accent for dark ground
--muted          secondary text
--hairline       default 1px border
--hairline-strong  heavier border
```

Also available: `--serif` (Cormorant), `--sans` (Inter), `--ease`
(cubic-bezier), `--header-h`, `--section-py`, and the font-size tokens
`--fs-display --fs-h1 --fs-h2 --fs-h3 --fs-body --fs-small --fs-caption`.
Your template's display font variable is noted in your brief.

Your template must look good under ANY of the 8 palettes (midnight, slate,
forest, terracotta, plum, charcoal, sage, ocean) — so lean on the tokens and
don't assume a specific hue.

## CSS scoping (critical — templates coexist)

- Author ALL your CSS in one file: `templates/<id>/<id>.css`.
- **Scope every selector under `[data-template="<id>"]`** (the root layout sets
  `<html data-template="grid">` etc.). This prevents collisions with the
  editorial global CSS and the other template. Example:
  ```css
  [data-template="grid"] .g-hero { … }
  [data-template="grid"] .g-card { … }
  ```
- Prefix your own class names (`g-` for grid, `b-` for boutique).
- `import './<id>.css';` at the TOP of every component file in your template
  (webpack dedupes). That guarantees the CSS loads whenever your template renders.
- You MAY reuse the generic global helpers (`.container`, `.btn`,
  `.btn-primary`, `.btn-ghost`, `.btn-sm`, `.eyebrow`, `.serif`, `.sans`,
  `.h1`–`.h3`, `.body`, `.small`, `.muted`, `.card`, `.divider`) — but if you
  want them to look different, override under your `[data-template]` scope.

## What to build + `index.ts` contract

Build these SIX and export them from `templates/<id>/index.ts`:

```ts
export { Header } from './Header';
export { Footer } from './Footer';
export { default as Home } from './Home';
export { default as Residences } from './Residences';
export { default as City } from './City';
export { default as Property } from './Property';
```

(About / WhyUs / Careers / Inquire / Favorites fall back to editorial — do not
build them unless trivial.)

### Component signatures (must match — the routes/layout call these)

- `export function Header()` and `export function Footer()` — no props.
  **Both MUST return `null` when `usePathname().startsWith('/admin')`** (the
  root layout wraps the admin portal too; the CMS has its own chrome).
- `Home` — `export default function Home()`, no props.
- `Residences` — `export default function Residences()`, no props. It uses
  `useSearchParams()`, so it MUST be wrapped in `<Suspense>` (see editorial
  pattern: an outer default component returning `<Suspense fallback={<main/>}>
  <Inner/></Suspense>`).
- `City` — `export default function City({ params }: { params: { city: string } })`.
  If `getCity(params.city)` is undefined, render a graceful "market not found"
  or the coming-soon state (a city can be `comingSoon` with no listings — show
  `city.blurb` and a register-interest CTA, no listings).
- `Property` — `export default function Property({ params }: { params: { slug: string } })`.
  If `getResidence(params.slug)` is undefined, `useRouter().push('/residences')`
  and return null.

## Data & config API

```ts
// @/lib/data
RESIDENCES: Residence[]
featuredResidences(): Residence[]              // featured, ranked
getResidence(slug): Residence | undefined
residencesByCity(citySlug): Residence[]
getCity(slug): City | undefined
CITIES: Record<slug, City>
CITY_LIST: City[]                              // all, live first then coming-soon
LIVE_CITIES: City[]; COMING_SOON_CITIES: City[]
formatPrice(n): string                         // "$1,295"
bedroomShort(opts: number[]): string           // "Studio · 1 · 2 Bedrooms"
applyUrlFor(slug, bed): string | undefined     // external apply link, often undefined
portalLinksFor(slug): { portal, maintenance } | undefined   // often undefined

// types
Residence = { id, slug, name, city, cityLabel, address,
  coordinates:{lat,lng}, description, longDescription,
  bedrooms:string, bedroomOptions:number[],
  prices:Partial<Record<0|1|2|3,number>>, priceFrom:number, promo?:string,
  availability:'available'|'coming-soon', featured:boolean,
  neighbourhood?, tier?, heroImage:string, gallery:string[],
  photoTags?, photoAlt?, features:string[], amenities:string[],
  nearbyPoints:string[], hideDetailGallery?, incentives?, unitLabels?,
  units?:Unit[] }
Unit = { unit:string, type:string, rent:number, image?, images?:string[], applyUrl? }
City = { slug, label, province, image, blurb, bounds, center?, comingSoon? }
```

```ts
// @/lib/pages   PAGES.home shape (use for Home copy):
PAGES.home = {
  hero:{eyebrow,title,subtitle,searchButton,disclaimer},
  cities:{eyebrow,title,blurb,comingSoonBadge,comingSoonCta,liveCta},
  featured:{eyebrow,title,viewAllLabel},
  benefits:{eyebrow,title,subtitle,items:[{title,body}]},
  steps:{eyebrow,title,items:string[]},
  story:{eyebrow,title,paragraph,timeline:[{year,label}],ctaLabel},
  cta:{eyebrow,title,body,primaryLabel,secondaryLabel},
}
// @/lib/settings  SETTINGS = { contactEmail, contactPhone, officeLocation,
//   officeHoursWeekdays, officeHoursWeekend, social:{facebook,instagram,linkedin} }
// @/lib/brand     BRAND = { name, shortName, tagline, metadata:{title,description},
//                           logo:{light,dark,aspectRatio} }
```

## Reusable primitives (import, don't rebuild)

```ts
import { Logo } from '@/components/Logo';                 // <Logo variant="light"|"dark" height={n}/>
import { Eyebrow } from '@/components/Eyebrow';           // {children, color?, className?, style?}
import { SmartImage } from '@/components/SmartImage';     // {src, alt, fallbackLabel?, fallbackChar?, style?, className?, loading?, kenBurns?}
import { FavoriteHeart } from '@/components/FavoriteHeart'; // {id, size?}
import { useFavorites } from '@/components/FavoritesContext'; // { count } — for header badge
import { InquireModal } from '@/components/InquireModal';   // {open, onClose, residence}
import { GalleryModal } from '@/components/GalleryModal';   // {open, onClose, residence?|photos?, labels?, title?, eyebrow?, onPhotoClick?}
import { Lightbox } from '@/components/Lightbox';           // {open, photos, index, onIndexChange, onClose, label?, labels?}
import { MapView } from '@/components/MapViewClient';       // {residences, selectedId?, onSelect?, height?, showPreview?}
import { HeartIcon, ArrowRight, ArrowLeft, ChevronDown, ChevronRight, SearchIcon, MenuIcon, CloseIcon, PlusIcon, MinusIcon, SlidersIcon, MapIcon } from '@/components/icons'; // each {size?, ...}
// Listing filter engine:
import { applyFilters } from '@/lib/filter';
import { DEFAULT_FILTERS, type Filters } from '@/components/FiltersPanel';
//   Filters = { beds:number[], priceMin:number, priceMax:number,
//     availability:'any'|'available'|'coming-soon', amenities:string[],
//     sort:'name'|'price-asc'|'price-desc'|'bedrooms' }
//   applyFilters(RESIDENCES, filters, queryString) -> Residence[]
```

## Property page — data logic to reproduce

- Photos for gallery/lightbox: `const photos = [r.heroImage, ...r.gallery].filter(Boolean)`.
- Floor plans: `r.bedroomOptions.filter(b => r.prices[b] !== undefined).map(b => ({ bed:b, label: b===0?'Studio':`${b} Bedroom`, price: r.prices[b] }))`.
- Available suites: if `r.units?.length`, one row per unit `{unit,type,rent,image?,images?,applyUrl?}`; else one row per plan (`unit:'—'`). Apply link = `row.applyUrl ?? applyUrlFor(r.slug, bedNumForType)`; if none, an "Apply"/"Book a viewing" button that opens `InquireModal`.
- `portalLinksFor(r.slug)` → Resident Portal + Maintenance links, or show a
  disabled "· Coming soon" state when undefined.
- `r.promo` (string) → render a small "limited offer" banner when present.
- Rents are net-effective; include the disclaimer text near pricing.
- "Book a viewing" / "Apply" (no external link) opens `<InquireModal open onClose residence={r}/>`.
- Also show `residencesByCity(r.city).filter(x=>x.id!==r.id).slice(0,3)` as
  "other residences" using YOUR card component.

## Assets that exist

- `/assets/hero-home.png` (wide hero), `/assets/texture-detail.jpg`.
- Per building: `r.heroImage`, `r.gallery[]` (already resolved paths).
- Per city: `city.image`.
- Fallback tile: `/assets/coming-soon.png` (some heroImages equal this — for
  those use object-fit: contain on white, not cover).

## Navigation targets (use next/link or router.push)

`/` · `/residences` · `/residences/{city.slug}` · `/residences/{r.city}/{r.slug}`
· `/why-us` · `/about` · `/careers` · `/inquire` · `/favorites`

Header nav should list: Properties (`/residences`) with the CITY_LIST cities,
Why us (`/why-us`), About (`/about`), Careers (`/careers`), Contact
(`/inquire`), and a favorites link (`/favorites`) showing `useFavorites().count`.

## Definition of done

- All six components built, exported from `index.ts`, `npx tsc --noEmit` clean
  for your files.
- Distinct STRUCTURE and FEEL from editorial (not a recolour) — different
  layout composition, chrome, card design, and type treatment.
- Reads only from the APIs above; works under any palette; responsive.
