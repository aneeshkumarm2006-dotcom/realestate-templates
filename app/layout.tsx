import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter, Space_Grotesk, Fraunces } from 'next/font/google';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import { Providers } from './providers';
import { viewsFor } from '@/templates/registry';
import { ScrollReveal } from '@/components/ScrollReveal';
import { ShowcaseSwitcher } from '@/components/showcase/ShowcaseSwitcher';
import { BRAND, brandThemeCss } from '@/lib/brand';
import {
  getActive,
  showcaseEnabled,
  TEMPLATE_COOKIE,
  PALETTE_COOKIE,
} from '@/lib/active';
import { TEMPLATE_LIST } from '@/lib/template';
import { PALETTE_LIST } from '@/lib/palettes';

/* Base families — shared by all templates via --serif / --sans in globals.css. */
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

/* Template-specific display families. Only the active template's variable is
   attached to <html>, so next/font preloads just the font in use — except in
   showcase mode, where any template may be one click away. */
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-grotesk',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
});

export const metadata: Metadata = {
  title: BRAND.metadata.title,
  description: BRAND.metadata.description,
};

const TEMPLATE_FONT: Record<string, string> = {
  editorial: '',
  grid: spaceGrotesk.variable,
  boutique: fraunces.variable,
  // Immersive runs on the base serif/sans — the 3D stage carries the character,
  // so a fourth display face would just fight it.
  immersive: '',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { template, palette, theme } = getActive();
  const showcase = showcaseEnabled();
  const { Header, Footer } = viewsFor(template);

  // In showcase mode every display font must already be available, since the
  // visitor can switch template without a rebuild.
  const templateFonts = showcase
    ? `${spaceGrotesk.variable} ${fraunces.variable}`
    : TEMPLATE_FONT[template] ?? '';
  const fontVars = `${cormorant.variable} ${inter.variable} ${templateFonts}`.trim();

  return (
    // data-template scopes each template's CSS (templates/<id>/<id>.css).
    <html lang="en" data-template={template} className={fontVars}>
      <body>
        {/* Resolved palette overrides the defaults in globals.css. Rendered in
            the body so it lands after the stylesheet and wins on document order. */}
        <style dangerouslySetInnerHTML={{ __html: brandThemeCss(theme) }} />
        <Providers>
          <Header />
          {children}
          <Footer />
          <ScrollReveal />
          {showcase && (
            <ShowcaseSwitcher
              template={template}
              palette={palette}
              templateCookie={TEMPLATE_COOKIE}
              paletteCookie={PALETTE_COOKIE}
              templates={TEMPLATE_LIST.map((t) => ({
                id: t.id,
                label: t.label,
                note: t.note,
              }))}
              palettes={PALETTE_LIST.map((p) => ({
                id: p.id,
                label: p.label,
                note: p.note,
                swatch: {
                  ink: p.theme.ink,
                  gold: p.theme.gold,
                  ivory: p.theme.ivory,
                },
              }))}
            />
          )}
        </Providers>
      </body>
    </html>
  );
}
