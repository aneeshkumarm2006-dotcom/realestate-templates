import pagesJson from '@/content/pages.json';

/** Marketing copy for the public pages (home, about, why-us, careers),
 *  managed via the CMS portal (content/pages.json). Single source of truth —
 *  do not hardcode page copy in components. Strings are rendered verbatim,
 *  so preserve unicode punctuation (’ · →) when editing. */

export interface HomeBenefit {
  title: string;
  body: string;
}

export interface HomeTimelineEntry {
  year: string;
  label: string;
}

export interface HomeContent {
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    searchButton: string;
    disclaimer: string;
  };
  cities: {
    eyebrow: string;
    title: string;
    blurb: string;
    comingSoonBadge: string;
    comingSoonCta: string;
    liveCta: string;
  };
  featured: {
    eyebrow: string;
    title: string;
    viewAllLabel: string;
  };
  benefits: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: HomeBenefit[];
  };
  steps: {
    eyebrow: string;
    title: string;
    items: string[];
  };
  story: {
    eyebrow: string;
    title: string;
    paragraph: string;
    timeline: HomeTimelineEntry[];
    ctaLabel: string;
  };
  cta: {
    eyebrow: string;
    title: string;
    body: string;
    primaryLabel: string;
    secondaryLabel: string;
  };
}

export interface AboutStoryCard {
  numeral: string;
  eyebrow: string;
  quote: string;
  body: string;
}

export interface AboutFigure {
  value: string;
  label: string;
  body: string;
}

export interface AboutContent {
  hero: {
    eyebrow: string;
    titleItalic: string;
    titleRest: string;
    subtitle: string;
  };
  story: {
    eyebrow: string;
    lead: string;
    cards: AboutStoryCard[];
    close: string;
  };
  standards: {
    eyebrow: string;
    title: string;
    items: string[];
  };
  figures: {
    eyebrow: string;
    title: string;
    blurb: string;
    items: AboutFigure[];
  };
  cta: {
    eyebrow: string;
    title: string;
    buttonLabel: string;
  };
}

export interface WhyUsPillar {
  eyebrow: string;
  title: string;
  body: string;
}

export interface WhyUsStat {
  value: string;
  label: string;
}

export interface WhyUsContent {
  hero: {
    eyebrow: string;
    title: string;
  };
  intro: {
    pullQuote: string;
    attribution: string;
    paragraph1: string;
    paragraph2: string;
  };
  pillars: WhyUsPillar[];
  stats: WhyUsStat[];
  cta: {
    title: string;
    buttonLabel: string;
  };
}

export interface CareersContent {
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
  };
  openings: {
    eyebrow: string;
    title: string;
    noOpeningsMessage: string;
    contactIntro: string;
    buttonLabel: string;
  };
  benefits: {
    eyebrow: string;
    title: string;
    items: string[];
  };
}

/** Captions pinned to the scroll milestones of the Immersive template's
 *  scroll-built house. Optional: only that template reads them, and it falls
 *  back to built-in defaults when the block is absent. */
export interface ImmersiveCaption {
  eyebrow: string;
  title: string;
  body: string;
}

export interface ImmersiveContent {
  /** One per beat of the journey: construction → entry → kitchen → upstairs. */
  captions: ImmersiveCaption[];
  cta: {
    title: string;
    body: string;
    buttonLabel: string;
  };
}

export interface PagesContent {
  home: HomeContent;
  about: AboutContent;
  whyUs: WhyUsContent;
  careers: CareersContent;
  immersive?: ImmersiveContent;
}

export const PAGES: PagesContent = pagesJson;
