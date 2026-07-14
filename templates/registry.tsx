/* ============================================================
   Template registry — resolves a template's view set.

   All three templates are imported, so all three ship in the
   repo and switching is a config (or, in showcase mode, a
   cookie) change with no rebuild of the routing.

   Editorial is the FALLBACK: any view a template hasn't
   implemented resolves to the editorial one. That let the new
   templates land incrementally — but the goal is that every
   template implements every view, so nothing falls through.

   Resolution happens PER REQUEST (see lib/active.ts), not at
   module load, because showcase mode can override the template
   with a cookie. The routes under app/ call viewsFor(); the
   root layout renders Header / Footer from it.
   ============================================================ */
import type { ComponentType } from 'react';
import type { TemplateId } from '@/lib/template';
import * as editorial from './editorial';
import * as grid from './grid';
import * as boutique from './boutique';
import * as immersive from './immersive';

type AnyComponent = ComponentType<any>;

export type ViewName =
  | 'Header' | 'Footer'
  | 'Home' | 'Residences' | 'City' | 'Property'
  | 'About' | 'WhyUs' | 'Careers' | 'Inquire' | 'Favorites';

const SETS: Record<TemplateId, Partial<Record<ViewName, AnyComponent>>> = {
  editorial,
  grid,
  boutique,
  immersive,
};

export interface ViewSet {
  Header: AnyComponent;
  Footer: AnyComponent;
  Home: AnyComponent;
  Residences: AnyComponent;
  City: AnyComponent;
  Property: AnyComponent;
  About: AnyComponent;
  WhyUs: AnyComponent;
  Careers: AnyComponent;
  Inquire: AnyComponent;
  Favorites: AnyComponent;
}

/** The view set for `template`, with the Editorial implementation standing in
 *  for anything that template doesn't export. */
export function viewsFor(template: TemplateId): ViewSet {
  const set = SETS[template] ?? {};
  const fallback = editorial as unknown as Record<ViewName, AnyComponent>;
  const get = (name: ViewName): AnyComponent => set[name] ?? fallback[name];

  return {
    Header: get('Header'),
    Footer: get('Footer'),
    Home: get('Home'),
    Residences: get('Residences'),
    City: get('City'),
    Property: get('Property'),
    About: get('About'),
    WhyUs: get('WhyUs'),
    Careers: get('Careers'),
    Inquire: get('Inquire'),
    Favorites: get('Favorites'),
  };
}
