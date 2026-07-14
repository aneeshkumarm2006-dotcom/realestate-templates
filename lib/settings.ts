import settingsJson from '@/content/settings.json';

/** Fallback rate card for buildings with no rows in content/units.json.
 *
 *  TODO(PMS): the listings in this template are static demo data. When a real
 *  property-management system / availability feed is wired in, live units
 *  replace units.json and this card becomes the fallback of last resort. */
export interface PricingSettings {
  /** Monthly rent by bedroom count. Keys: "0"=Studio, "1".."3"=bedrooms. */
  baseRates: Record<string, number>;
  /** Lease term the net-effective advertised rent is amortised over. */
  leaseMonths: number;
  /** Free-months promotion. Advertised rent is net effective across the term:
   *  base × (leaseMonths - freeMonths) / leaseMonths. A building can override
   *  `freeMonths` via `promoFreeMonths` in buildings.json. */
  promo: {
    enabled: boolean;
    freeMonths: number;
  };
}

/** Site-wide contact and social settings, managed via the CMS portal
 *  (content/settings.json). Single source of truth — do not hardcode the
 *  email/phone in components. */
export interface SiteSettings {
  contactEmail: string;
  contactPhone: string;
  officeLocation: string;
  officeHoursWeekdays: string;
  officeHoursWeekend: string;
  social: {
    facebook: string;
    instagram: string;
    linkedin: string;
  };
  pricing: PricingSettings;
}

export const SETTINGS: SiteSettings = settingsJson;
