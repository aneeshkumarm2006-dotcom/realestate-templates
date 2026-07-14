/* ============================================================
   Colour palettes.

   A palette is a full set of the ten design tokens the site
   renders from. A client picks one by name in content/brand.json
   ("palette": "slate") and may override any individual token
   inline ("theme": { "gold": "#C2410C" }).

   The palette DATA lives in lib/palettes.json so the Node build
   scripts (scripts/*.mjs, which can't import TypeScript) resolve
   the exact same colours the app renders — no drift. This file
   adds the types and helpers on top.

   TOKEN ROLES — the keys are stable identifiers, NOT literal
   colours. In particular `gold` is "the accent", whatever its
   hue: in the `slate` palette it's a steel blue, in `ocean` a
   coral. Don't rename these keys — globals.css and every
   template read them as `var(--gold)`, `var(--ink)`, etc.
   Every palette follows the same structure — a light site with
   dark sections — so any palette works under any template.
   ============================================================ */

import palettesJson from '@/lib/palettes.json';
import type { BrandTheme } from './brand';

export type PaletteId =
  | 'midnight'
  | 'slate'
  | 'forest'
  | 'terracotta'
  | 'plum'
  | 'charcoal'
  | 'sage'
  | 'ocean';

export interface Palette {
  id: PaletteId;
  label: string;
  /** One-line description for the picker in scripts/new-site.mjs. */
  note: string;
  theme: BrandTheme;
}

type RawPalette = { label: string; note: string; theme: BrandTheme };
const RAW = palettesJson as Record<string, RawPalette>;

export const PALETTES: Record<PaletteId, Palette> = Object.fromEntries(
  Object.entries(RAW).map(([id, p]) => [id, { id: id as PaletteId, ...p }])
) as Record<PaletteId, Palette>;

export const PALETTE_LIST: Palette[] = Object.values(PALETTES);

/** The palette used when brand.json names none (or an unknown one). */
export const DEFAULT_PALETTE: PaletteId = 'midnight';

export const isPaletteId = (v: unknown): v is PaletteId =>
  typeof v === 'string' && v in PALETTES;
