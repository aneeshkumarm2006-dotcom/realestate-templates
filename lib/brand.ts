import brandJson from '@/content/brand.json';
import { PALETTES, DEFAULT_PALETTE, isPaletteId, type PaletteId } from '@/lib/palettes';
import { DEFAULT_TEMPLATE, isTemplateId, type TemplateId } from '@/lib/template';

/** Site identity — name, logo, template, and colour palette. Everything
 *  brand-specific lives in content/brand.json; nothing brand-specific belongs
 *  in code.
 *
 *  To stand up a new client site: edit content/brand.json (or run
 *  `npm run new-site`), drop the two logo files at the paths named in `logo`,
 *  and deploy. No component should ever hardcode a company name, a logo path,
 *  a layout choice, or a hex colour. */
export interface BrandTheme {
  /** Primary dark — body text, dark sections, the mark in the logo. */
  ink: string;
  /** Lifted dark, used for gradients and hover states on dark ground. */
  inkSoft: string;
  /** Page background. */
  ivory: string;
  /** Alternating section background, one step warmer than ivory. */
  cream: string;
  /** Cards and panels that must sit above ivory. */
  bone: string;
  /** Accent — rules, eyebrows, primary buttons. (Hue varies by palette.) */
  gold: string;
  /** Accent at low emphasis, for accents on dark ground. */
  goldSoft: string;
  /** Secondary text. */
  muted: string;
  /** Default 1px border. */
  hairline: string;
  /** Border that needs to carry more weight than a hairline. */
  hairlineStrong: string;
}

export interface Brand {
  /** Legal / display name: "Northwind Residences". Used in metadata and alt text. */
  name: string;
  /** Compact name for tight chrome like the admin sidebar: "Northwind". */
  shortName: string;
  tagline: string;
  metadata: {
    title: string;
    description: string;
  };
  logo: {
    /** Dark mark for light backgrounds (the public header). */
    light: string;
    /** Light mark for dark backgrounds (the footer). */
    dark: string;
    /** width ÷ height of the mark. Keep in sync with the artwork or the logo
     *  is letterboxed inside its box (it is never distorted — see Logo.tsx). */
    aspectRatio: number;
  };
  /** Which front-end layout renders. All templates ship in the repo and read
   *  the same content; this picks the active one. See lib/template.ts. */
  template?: TemplateId;
  /** Named colour preset from lib/palettes.ts. */
  palette?: PaletteId;
  /** Optional per-token overrides that win over the chosen palette. Leave
   *  empty to use the palette as-is; set a token to match an exact brand colour. */
  theme?: Partial<BrandTheme>;
}

export const BRAND: Brand = brandJson as Brand;

/** The template/palette the SITE ships with, from content/brand.json. This is
 *  what a real client deployment renders.
 *
 *  In showcase mode (SHOWCASE=1, our demo deploy only) a cookie can override
 *  these per request so a visitor can flip through the options — see
 *  lib/active.ts. Nothing else in the app should read brand.template/palette
 *  directly; call getActive() instead, so the override is honoured. */
export const BRAND_TEMPLATE: TemplateId = isTemplateId(BRAND.template)
  ? BRAND.template
  : DEFAULT_TEMPLATE;

export const BRAND_PALETTE: PaletteId = isPaletteId(BRAND.palette)
  ? BRAND.palette
  : DEFAULT_PALETTE;

/** The resolved palette: a named preset with brand.json's inline overrides
 *  applied on top. The single source of truth for colour — globals.css only
 *  holds fallbacks in case brand.json is mid-edit. */
export function resolveTheme(
  palette: PaletteId = BRAND_PALETTE,
  overrides: Partial<BrandTheme> = BRAND.theme ?? {}
): BrandTheme {
  const preset = PALETTES[palette] ?? PALETTES[DEFAULT_PALETTE];
  return { ...preset.theme, ...overrides };
}

/** inkSoft -> --ink-soft. Mirrors the token names declared in globals.css. */
function cssVarName(key: string): string {
  return '--' + key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
}

/** A resolved palette as a `:root` block. Injected by the root layout *after*
 *  globals.css loads, so these values win over the defaults declared there.
 *  globals.css keeps its own palette so the app still renders if brand.json
 *  is mid-edit; think of that copy as the fallback, this one as the source. */
export function brandThemeCss(theme: BrandTheme = resolveTheme()): string {
  const declarations = Object.entries(theme)
    .map(([key, value]) => `  ${cssVarName(key)}: ${value};`)
    .join('\n');
  return `:root {\n${declarations}\n}`;
}
