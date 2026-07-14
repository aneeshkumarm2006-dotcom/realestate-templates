/* ============================================================
   Front-end templates.

   Three genuinely different site structures ship in every repo.
   A client picks one in content/brand.json ("template": "grid").
   All three read the SAME content (content/*.json) and the SAME
   resolved palette (lib/palettes.ts), so switching a template is
   a one-line config change with no content migration.

   The public routes under app/ are thin dispatchers: each reads
   ACTIVE_TEMPLATE and renders the matching view component from
   templates/<id>/. The data layer (lib/data.ts), the CMS, and
   the primitives (SmartImage, FavoritesContext, modals, icons)
   are shared across all three.
   ============================================================ */

export type TemplateId = 'editorial' | 'grid' | 'boutique' | 'immersive';

export interface TemplateMeta {
  id: TemplateId;
  label: string;
  /** One-line description for the picker in scripts/new-site.mjs + README. */
  note: string;
}

export const TEMPLATES: Record<TemplateId, TemplateMeta> = {
  editorial: {
    id: 'editorial',
    label: 'Editorial',
    note: 'Cinematic full-bleed hero, serif display type, magazine-style long scroll. Establishment and quiet.',
  },
  grid: {
    id: 'grid',
    label: 'Grid',
    note: 'Dense, search-first proptech layout — filter rail, tight listing grid, compact chrome. Utilitarian and fast.',
  },
  boutique: {
    id: 'boutique',
    label: 'Boutique',
    note: 'Airy luxury — oversized type, generous whitespace, slow reveals, few large images. Aspirational and calm.',
  },
  immersive: {
    id: 'immersive',
    label: 'Immersive',
    note: 'Scroll-built 3D house: the building assembles as you scroll, then the camera walks you inside. Cinematic and heavy.',
  },
};

export const TEMPLATE_LIST: TemplateMeta[] = Object.values(TEMPLATES);

export const DEFAULT_TEMPLATE: TemplateId = 'editorial';

export const isTemplateId = (v: unknown): v is TemplateId =>
  typeof v === 'string' && v in TEMPLATES;
