/* The Immersive template — a scroll-built 3D house.

   The hero is the product: scroll assembles the building piece by piece, then
   walks the camera inside (hall → kitchen → stairs → bedroom). Geometry is
   procedural and tints from the active palette, so there is no model to ship
   and all eight palettes work.

   Header, Footer and Home are bespoke. The remaining views (Residences, City,
   Property, About, WhyUs, Careers, Inquire, Favorites) currently fall back to
   the Editorial implementation via templates/registry.tsx — see the README. */
export { Header } from './Header';
export { Footer } from './Footer';
export { default as Home } from './Home';
