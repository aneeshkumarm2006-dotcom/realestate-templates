import type { Residence } from './data';
import type { Filters } from '@/components/FiltersPanel';

/** Bedroom count from a unit's type label. "Studio" -> 0, "2 Bedroom" -> 2.
 *  Returns -1 when the label has no recognisable size. */
function unitBeds(type: string): number {
  if (/studio/i.test(type)) return 0;
  const m = type.match(/(\d+)/);
  return m ? Number(m[1]) : -1;
}

export function applyFilters(
  residences: Residence[],
  filters: Filters,
  queryStr: string
): Residence[] {
  let out = residences.slice();

  if (filters.beds.length) {
    // Match against actual available suites, not the building's advertised
    // bedroom mix: a residence only appears under a bedroom filter when it has
    // a real unit of that size. Buildings with no available suites are hidden.
    out = out.filter((r) =>
      (r.units ?? []).some((u) => {
        const b = unitBeds(u.type);
        return b >= 0 && filters.beds.includes(b >= 3 ? 3 : b);
      })
    );
  }
  out = out.filter(
    (r) => r.priceFrom >= filters.priceMin && r.priceFrom <= filters.priceMax
  );
  if (filters.availability !== 'any') {
    out = out.filter((r) => r.availability === filters.availability);
  }
  if (filters.amenities.length) {
    out = out.filter((r) => {
      const haystack = [...r.amenities, ...r.features].map((x) => x.toLowerCase());
      return filters.amenities.every((a) =>
        haystack.some((x) => x.includes(a.toLowerCase()))
      );
    });
  }
  if (queryStr) {
    const q = queryStr.toLowerCase();
    out = out.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.cityLabel.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q)
    );
  }
  switch (filters.sort) {
    case 'price-asc':
      out.sort((a, b) => a.priceFrom - b.priceFrom);
      break;
    case 'price-desc':
      out.sort((a, b) => b.priceFrom - a.priceFrom);
      break;
    case 'bedrooms':
      out.sort(
        (a, b) => Math.max(...a.bedroomOptions) - Math.max(...b.bedroomOptions)
      );
      break;
    case 'name':
    default:
      out.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }
  return out;
}
