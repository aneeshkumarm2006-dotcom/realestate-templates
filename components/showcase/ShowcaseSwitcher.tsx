'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import './showcase.css';

/* ============================================================
   Showcase switcher — DEMO DEPLOY ONLY.

   Rendered by the root layout only when SHOWCASE=1, so a real
   client site never ships it (see lib/active.ts). Lets a
   prospective client flip through every template and palette on
   one live URL.

   It writes a cookie and reloads: the server re-resolves the
   template + palette for the next request (lib/active.ts), so
   what you see is exactly what that configuration renders — not
   a client-side approximation.

   Its own styles are namespaced `.sc-*` and set explicit values
   rather than inheriting the palette, so the widget stays legible
   whichever template/palette is being previewed.
   ============================================================ */

export interface SwitcherOption {
  id: string;
  label: string;
  note: string;
  /** Palettes only: swatch colours for the chip. */
  swatch?: { ink: string; gold: string; ivory: string };
}

interface Props {
  template: string;
  palette: string;
  templates: SwitcherOption[];
  palettes: SwitcherOption[];
  templateCookie: string;
  paletteCookie: string;
}

const YEAR = 60 * 60 * 24 * 365;

export function ShowcaseSwitcher({
  template,
  palette,
  templates,
  palettes,
  templateCookie,
  paletteCookie,
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // The CMS portal has its own chrome — never overlay the switcher there.
  if (pathname.startsWith('/admin')) return null;

  const choose = (name: string, value: string) => {
    document.cookie = `${name}=${value}; path=/; max-age=${YEAR}; samesite=lax`;
    // Full reload: the template + palette are resolved on the server, so we
    // want the next request to render them for real.
    window.location.reload();
  };

  return (
    <div className={'sc-root' + (open ? ' is-open' : '')}>
      {!open && (
        <button className="sc-fab" onClick={() => setOpen(true)} aria-label="Open the showcase switcher">
          <span className="sc-fab-dot" />
          Preview
        </button>
      )}

      {open && (
        <section className="sc-panel" aria-label="Showcase switcher">
          <header className="sc-head">
            <div>
              <p className="sc-kicker">Showcase</p>
              <h2 className="sc-title">Try a look</h2>
            </div>
            <button className="sc-close" onClick={() => setOpen(false)} aria-label="Close">
              ×
            </button>
          </header>

          <p className="sc-hint">
            Every combination below is a real, deployable configuration — one line in
            <code> brand.json</code>. Nothing here changes the content.
          </p>

          <div className="sc-group">
            <p className="sc-label">Template · page structure</p>
            <div className="sc-templates">
              {templates.map((t) => (
                <button
                  key={t.id}
                  className={'sc-tpl' + (t.id === template ? ' is-active' : '')}
                  onClick={() => t.id !== template && choose(templateCookie, t.id)}
                  aria-pressed={t.id === template}
                >
                  <span className="sc-tpl-name">{t.label}</span>
                  <span className="sc-tpl-note">{t.note}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="sc-group">
            <p className="sc-label">Palette · colour</p>
            <div className="sc-palettes">
              {palettes.map((p) => (
                <button
                  key={p.id}
                  className={'sc-pal' + (p.id === palette ? ' is-active' : '')}
                  onClick={() => p.id !== palette && choose(paletteCookie, p.id)}
                  aria-pressed={p.id === palette}
                  title={p.note}
                >
                  <span className="sc-swatch" aria-hidden="true">
                    <i style={{ background: p.swatch?.ink }} />
                    <i style={{ background: p.swatch?.gold }} />
                    <i style={{ background: p.swatch?.ivory }} />
                  </span>
                  <span className="sc-pal-name">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          <footer className="sc-foot">
            Currently: <strong>{template}</strong> · <strong>{palette}</strong>
          </footer>
        </section>
      )}
    </div>
  );
}
