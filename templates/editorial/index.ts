/* The Editorial template — the default. Cinematic full-bleed hero, serif
   display type, magazine-style long scroll. Its chrome (Header/Footer) and
   card live in components/; its page views live alongside this file.

   Editorial is also the FALLBACK template: any view another template doesn't
   implement resolves to the editorial one (see templates/registry.tsx), so a
   new template can override only the pages it wants to. */
export { Header } from '@/components/Header';
export { Footer } from '@/components/Footer';
export { default as Home } from './Home';
export { default as Residences } from './Residences';
export { default as City } from './City';
export { default as Property } from './Property';
export { default as About } from './About';
export { default as WhyUs } from './WhyUs';
export { default as Careers } from './Careers';
export { default as Inquire } from './Inquire';
export { default as Favorites } from './Favorites';
