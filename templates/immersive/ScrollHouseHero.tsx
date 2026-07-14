'use client';
import { useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ArrowRight } from '@/components/icons';
import { PAGES, type ImmersiveCaption } from '@/lib/pages';
import { useScrollProgress, usePrefersReducedMotion } from './useScrollProgress';
import './immersive.css';

/* The 3D scene is the ONLY thing that pulls in three.js. Loading it lazily and
   client-side keeps ~500KB out of every other template's bundle, and keeps the
   <h1> below in the server-rendered HTML — the hero text is the LCP element and
   it must not wait on a WebGL canvas. */
const HouseScene = dynamic(() => import('./HouseScene'), {
  ssr: false,
  loading: () => null,
});

/* Where each caption takes over, in scroll progress. Index 0 is the brand hero;
   1–4 are the journey beats; 5 is the closing CTA. Must stay in step with the
   camera path in HouseScene.tsx. */
const STEPS = [0, 0.16, 0.5, 0.72, 0.87, 0.965];

const FALLBACK: ImmersiveCaption[] = [
  { eyebrow: '01 · CONSTRUCTION', title: 'Built to one standard.', body: '' },
  { eyebrow: '02 · ARRIVAL', title: 'Step inside.', body: '' },
  { eyebrow: '03 · THE KITCHEN', title: 'Where the day starts.', body: '' },
  { eyebrow: '04 · UPSTAIRS', title: 'Room to stay a while.', body: '' },
];

export function ScrollHouseHero() {
  const router = useRouter();
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const { progress, step } = useScrollProgress(sectionRef, STEPS);

  const hero = PAGES.home.hero;
  const im = PAGES.immersive;
  const captions = im?.captions?.length ? im.captions : FALLBACK;
  const cta = im?.cta ?? {
    title: 'Now find yours.',
    body: '',
    buttonLabel: 'Browse residences',
  };

  /* Reduced motion: no pinning, no scroll-jacking, no WebGL. A still hero that
     says the same thing. This is not a lesser page — it's the same content. */
  if (reduced) {
    return (
      <section className="im-hero-static">
        <div className="im-hero-inner">
          <p className="im-eyebrow">{hero.eyebrow}</p>
          <h1 className="im-title">{hero.title}</h1>
          <p className="im-sub">{hero.subtitle}</p>
          <button className="btn btn-primary" onClick={() => router.push('/residences')}>
            {cta.buttonLabel} <ArrowRight size={14} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="im-scroll" aria-label={hero.title}>
      <div className="im-pin">
        <div className="im-canvas">
          <HouseScene progress={progress} />
        </div>

        {/* Copy sits above the canvas. Only the active beat is shown; the rest
            stay in the DOM (opacity 0) so nothing reflows mid-scroll. */}
        <div className="im-copy">
          <div className={'im-beat' + (step === 0 ? ' is-on' : '')}>
            <p className="im-eyebrow">{hero.eyebrow}</p>
            <h1 className="im-title">{hero.title}</h1>
            <p className="im-sub">{hero.subtitle}</p>
          </div>

          {captions.map((c, i) => (
            <div key={c.title} className={'im-beat' + (step === i + 1 ? ' is-on' : '')}>
              <p className="im-eyebrow">{c.eyebrow}</p>
              <h2 className="im-title">{c.title}</h2>
              <p className="im-sub">{c.body}</p>
            </div>
          ))}

          <div className={'im-beat' + (step === 5 ? ' is-on' : '')}>
            <h2 className="im-title">{cta.title}</h2>
            <p className="im-sub">{cta.body}</p>
            <button className="btn btn-primary" onClick={() => router.push('/residences')}>
              {cta.buttonLabel} <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <div className={'im-hint' + (step === 0 ? '' : ' is-gone')} aria-hidden="true">
          <span>Scroll to build</span>
          <span className="im-hint-rule" />
        </div>
      </div>
    </section>
  );
}
