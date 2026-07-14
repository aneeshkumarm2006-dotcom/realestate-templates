import { cookies } from 'next/headers';
import {
  BRAND,
  BRAND_PALETTE,
  BRAND_TEMPLATE,
  resolveTheme,
  type BrandTheme,
} from '@/lib/brand';
import { isPaletteId, type PaletteId } from '@/lib/palettes';
import { isTemplateId, type TemplateId } from '@/lib/template';

/* ============================================================
   The ACTIVE template + palette for this request.

   SERVER ONLY — this reads cookies(). Client components must
   receive the resolved values as props, never import this.

   Two modes:

   - Normal (a real client site): the template and palette are
     fixed by content/brand.json. No cookie is read, so the
     public pages stay STATICALLY PRERENDERED and a visitor
     cannot reskin the client's site.

   - Showcase (SHOWCASE=1, set only on OUR demo deployment):
     a cookie may override both, so a prospective client can
     click through all three templates and all eight palettes
     on one live URL. Reading the cookie opts these routes into
     dynamic rendering — that cost is accepted, and is confined
     to the demo deploy.

   Everything else in the app must call getActive() rather than
   reading BRAND.template / BRAND.palette, so the override is
   always honoured.
   ============================================================ */

export const TEMPLATE_COOKIE = 'tpl';
export const PALETTE_COOKIE = 'pal';

/** Is this the showcase deployment? Build/run-time env, never a cookie. */
export const showcaseEnabled = (): boolean => process.env.SHOWCASE === '1';

export interface Active {
  template: TemplateId;
  palette: PaletteId;
  /** Palette preset + brand.json's inline overrides, ready for :root. */
  theme: BrandTheme;
}

export function getActive(): Active {
  let template = BRAND_TEMPLATE;
  let palette = BRAND_PALETTE;

  if (showcaseEnabled()) {
    // Only touched in showcase mode — calling cookies() is what makes a route
    // dynamic, so a normal client deploy never pays for it.
    const jar = cookies();
    const t = jar.get(TEMPLATE_COOKIE)?.value;
    const p = jar.get(PALETTE_COOKIE)?.value;
    if (isTemplateId(t)) template = t;
    if (isPaletteId(p)) palette = p;
  }

  return { template, palette, theme: resolveTheme(palette, BRAND.theme ?? {}) };
}
