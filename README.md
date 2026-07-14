# Estate Template

A production-ready real-estate site with a built-in CMS. Next.js 14 (App Router),
TypeScript, no database — all content is flat JSON in `content/`, edited through
the `/admin` portal.

Each client gets their own repo created from this template, and their own Vercel
deploy. Standing one up should mean **editing one config file, dropping in a
logo, and setting environment variables**. No code changes for identity.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # set ADMIN_EMAIL, ADMIN_PASSWORD, AUTH_SECRET
npm run dev
```

- Public site → http://localhost:3000
- CMS portal → http://localhost:3000/admin

Out of the box you get a complete demo site for a fictional company,
**Northwind Residences** — three invented buildings across two invented cities,
with placeholder artwork. Nothing needs to work around missing data.

---

## Standing up a new client

```bash
npm run new-site
```

Interactive. Prompts for the company name, tagline, palette, and contact
details; rewrites `content/brand.json` + `content/settings.json`, regenerates
the placeholder logo, and prints the Vercel env checklist. Re-runnable — every
prompt defaults to the current value.

Then, in order:

**1. Brand** — `content/brand.json` is the single identity file.

```jsonc
{
  "name": "Northwind Residences",     // full display name
  "shortName": "Northwind",           // tight chrome (admin sidebar, favicon)
  "tagline": "...",
  "metadata": { "title": "...", "description": "..." },
  "logo": { "light": "...", "dark": "...", "aspectRatio": 2.99 },

  "template": "editorial",            // which layout renders — see Templates
  "palette":  "slate",                // which colour preset — see Palettes
  "theme":    {}                      // optional per-token overrides
}
```

That's the whole identity surface. `template` and `palette` are the two big
levers; `theme` is an escape hatch for a client whose brand colour must match
exactly.

**2. Logo** — drop the client's artwork at the two paths named in
`brand.logo`:

| file | used on |
|---|---|
| `public/brand/logo-light.svg` | dark mark, for light backgrounds (header) |
| `public/brand/logo-dark.svg`  | light mark, for dark backgrounds (footer) |

Then set `logo.aspectRatio` to width ÷ height of the new artwork so the header
reserves the right space. A mismatched ratio letterboxes the mark; it never
distorts it.

No artwork yet? `npm run brand-assets` generates a decent placeholder wordmark
from the brand name and writes the correct `aspectRatio` for you.

**3. Content** — replace the demo listings via `/admin`, or edit `content/*.json`
directly. See *Content model* below.

**4. Deploy** — push to the client's repo, import to Vercel, set the env vars
from `.env.example`.

> **Set `CMS_STORAGE=github` in production.** Without it the CMS writes to local
> disk, which is ephemeral on Vercel — saves would silently vanish on the next
> redeploy. With it, every save becomes a Git commit that triggers a redeploy.

---

## Templates

**Three structurally different front-ends ship in every repo.** They are not
recolours of each other — different page composition, chrome, card design, and
type system. Pick one in `brand.json`:

| `template` | feel | signature moves |
|---|---|---|
| `editorial` | Establishment, quiet, magazine | Cinematic full-bleed hero, serif display (Cormorant), long editorial scroll |
| `grid` | Utilitarian proptech, fast | Compact sticky chrome + inline search, **filter rail** listing page, dense cards, big price numerals, sans-only (Space Grotesk) |
| `boutique` | Aspirational luxury, calm | Oversized display serif (Fraunces), vast whitespace, few large images, slow scroll reveals, minimal chrome + full-screen menu |
| `immersive` | Cinematic, heavy | **Scroll-built 3D house** — the building assembles as you scroll, then the camera walks you inside: hall → kitchen → up the stairs → bedroom |

```jsonc
// content/brand.json
{ "template": "grid" }
```

All three read the **same** `content/*.json` and the same resolved palette, so
switching is a one-line change with **no content migration** — a client can
change their mind after launch.

**How it works.** The routes under `app/` are thin dispatchers; each re-exports
the active template's view from `templates/registry.tsx`. The root layout sets
`<html data-template="grid">`, and each template scopes all of its CSS under
that attribute (`templates/grid/grid.css`), so the three never collide.

Editorial is the **fallback**: a template only implements the views it wants to
differentiate (all three do Header, Footer, Home, Residences, City, Property),
and anything it doesn't export — About, Why-us, Careers, Inquire, Favorites —
renders the editorial version, recoloured by the active palette.

To add a fourth: create `templates/<id>/`, export the views from its
`index.ts`, add the id to `TEMPLATES` in `lib/template.ts`, and scope its CSS
under `[data-template="<id>"]`.

### The Immersive template (3D)

The hero is a single pinned section (~620vh). Scroll progress 0 → 1 drives a
timeline: `0 → 0.46` the house builds itself (slab → walls → floor → stairs →
roof → glazing); `0.46 → 1` the front wall and roof dissolve and a camera walks
the interior. Captions pin at each beat, from `pages.immersive.captions` in
`content/pages.json`.

Three decisions worth knowing:

- **The house is procedural** (`templates/immersive/HouseScene.tsx`) — geometry
  is generated in Three.js, there is no `.glb` to ship. Every part is separately
  animatable (that's what makes it assemble), and every material reads the
  palette tokens, so **the same house tints itself for all 8 palettes**.
- **three.js is lazily loaded** (`next/dynamic`, `ssr: false`). It is a ~670KB
  chunk that downloads *only* on the immersive home — the other three templates
  never pay for it. The `<h1>` is server-rendered so the LCP element never waits
  on WebGL.
- **`prefers-reduced-motion` short-circuits the whole thing** to a static hero:
  no pinning, no scroll-jacking, no canvas. Mobile gets a shorter runway (440vh).

Only `Header`, `Footer` and `Home` are bespoke — the remaining views still fall
back to Editorial. (Everything else is complete: `editorial`, `grid` and
`boutique` implement all eleven views.)

### Showcase mode — previewing templates on a live URL

Set `SHOWCASE=1` **on the demo deployment only** and the site renders a floating
switcher: a visitor can click through all 3 templates × 8 palettes (24 looks) on
one URL. The choice is stored in a cookie and **resolved on the server**, so what
they see is exactly what that configuration deploys as — not a client-side fake.

This is for selling. It must never be on a client's own site:

| | `SHOWCASE` unset (client sites) | `SHOWCASE=1` (our demo) |
|---|---|---|
| Switcher widget | never rendered | floating, bottom-right |
| Cookie | never read | overrides template + palette |
| Public pages | **statically prerendered** | dynamically rendered per request |
| Can a visitor reskin the site? | **no** | yes (that's the point) |

The cost — dynamic rendering instead of static — is confined to the demo deploy,
because the cookie read in `lib/active.ts` only happens when the env var is set.

> Nothing in the app should read `BRAND.template` / `BRAND.palette` directly.
> Call `getActive()` from `lib/active.ts` so the showcase override is honoured.
> It is **server-only** (it reads `cookies()`); client components take the
> resolved values as props.

## Palettes

Colour is a **named preset plus optional overrides** — never loose hex scattered
through components.

```jsonc
// content/brand.json
{
  "palette": "slate",              // one of the 8 presets below
  "theme":   { "gold": "#C2410C" } // optional: override any single token
}
```

Eight curated presets ship in `lib/palettes.json`, each a complete harmonised
ten-token set:

`midnight` (navy & gold) · `slate` (cool blue-grey) · `forest` (deep green &
brass) · `terracotta` (warm clay) · `plum` (aubergine & mauve) · `charcoal`
(near-black & amber) · `sage` (muted olive) · `ocean` (deep teal & coral)

The resolved palette is `{ ...preset, ...theme }`, injected by the root layout
as a `:root` block *after* `globals.css` — so **brand.json always wins** and the
values in `globals.css` are only fallbacks. Retheming means editing
`brand.json`, never the CSS.

> **Token names are roles, not literal colours.** `gold` means *the accent* —
> it's a steel blue in `slate`, a coral in `ocean`. Don't rename the keys;
> every template reads them as `var(--gold)`, `var(--ink)`, etc.
> (camelCase → kebab: `inkSoft` → `--ink-soft`.)

After changing the palette, regenerate the artwork so the logo and placeholder
imagery match:

```bash
npm run brand-assets        # logo wordmark
npm run placeholder-images  # demo photography stand-ins
```

---

## Content model

Everything under `content/` is CMS-editable JSON. The public site imports the
same files at build time, so a save *is* what the site renders.

| file | holds |
|---|---|
| `brand.json` | **identity** — name, logo, palette. Not CMS-editable by design. |
| `buildings.json` | the portfolio: slug, name, city, address, featured flags |
| `cities.json` | markets — label, blurb, map bounds, `comingSoon` |
| `units.json` | available units per building (drives pricing when present) |
| `photos.json` | hero + gallery image paths per building, with tags and alt text |
| `copy.json` | per-building prose: neighbourhood, tier, description, nearby |
| `amenities.json` | per-building features + building amenities |
| `pages.json` | marketing copy for home / about / why-us / careers |
| `settings.json` | contact, social, and the fallback pricing rate card |
| `taxonomies.json` | tiers, unit types, photo tags |
| `links.json` | external property-management URLs (see below) |
| `geocoded.json` | real lat/lng per building, for map pins |
| `media.json`, `users.json` | CMS library index and admin accounts |

A building's `slug` is the stable key across all of these **and** the folder name
under `public/assets/`. Don't rename it.

### Pricing

A building with rows in `units.json` prices from those units. A building without
falls back to the rate card in `settings.json → pricing`:

```jsonc
"pricing": {
  "baseRates": { "0": 1100, "1": 1300, "2": 1500, "3": 1700 },  // by bedroom count
  "leaseMonths": 12,
  "promo": { "enabled": true, "freeMonths": 1 }
}
```

Advertised rent is **net effective** over the term — `base × (lease − free) / lease`.
A building can override the promo with `promoFreeMonths` in `buildings.json`
(`0` opts it out entirely).

> ⚠️ **The listings are static demo data.** A real PMS / property feed still has
> to be wired in. When it lands it replaces `units.json`, and the rate card above
> becomes the fallback of last resort.

### Property-management links

`links.json` is vendor-neutral and **empty by default**, which is the correct
state until a PMS is connected — the Apply and Resident Portal buttons simply
don't render.

```jsonc
{
  "applyLinks":  { "<building-slug>": { "1": "https://…" } },   // by bedroom count
  "portalSlugs": { "<building-slug>": "their-id-in-the-pms" },
  "portalTemplates": {
    "portal":      "https://pms.example.com/residents/{slug}/login",
    "maintenance": "https://pms.example.com/residents/{slug}/maintenance"
  }
}
```

`{slug}` is substituted with the building's `portalSlugs` entry.

---

## Images

Property photos live in `public/assets/<building-slug>/`, referenced from
`photos.json`. The demo ships with generated abstract placeholders — replace
them with real photography.

```bash
npm run sync-images    # Images/<City>/<Property>/ → public/assets/<slug>/
```

Resizes to fit 1800×1800, re-encodes as JPEG q82. Hero = the file with `main`
in its name, else first alphabetically. You can also upload directly in the CMS.

```bash
npm run geocode        # geocode buildings that have no coordinates yet
npm run geocode -- --all   # re-geocode everything
```

Reads `buildings.json`, writes `content/geocoded.json`. Existing pins are
preserved (the CMS "Fix map pin" button writes to the same file) unless
`--all` is passed.

---

## Scripts

| command | does |
|---|---|
| `npm run dev` | dev server |
| `npm run new-site` | interactive provisioning — name, template, palette, contact |
| `npm run brand-assets` | regenerate the logo wordmark from `brand.json` |
| `npm run placeholder-images` | regenerate the demo imagery in the active palette |
| `npm run sync-images` | bulk-import real property photos |
| `npm run geocode` | geocode buildings via OpenStreetMap Nominatim |
| `npm run build` | production build |

## Stack

Next.js 14 App Router · TypeScript · Leaflet (maps) · sharp (image processing) ·
three + @react-three/fiber + drei (the Immersive template only, lazy-loaded).
No database, no CSS framework, no component library.

Auth is a signed-cookie session (`middleware.ts`, `lib/admin/auth.ts`) with
credentials from env. Content persistence is `lib/admin/store.ts` — local disk in
dev, GitHub commits in production.
