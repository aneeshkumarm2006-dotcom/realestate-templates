import { NextResponse } from 'next/server';
import { BRAND } from '@/lib/brand';
import { readContent, writeContent } from '@/lib/admin/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Nominatim's usage policy asks for a User-Agent that identifies the app and
 *  carries a contact address. Both come from the site's own config, never from
 *  a hardcoded client. The contact email is CMS-editable, so it is untrusted:
 *  anything that is not a plain, single-line address is discarded rather than
 *  interpolated into a request header. */
const EMAIL_RE = /^[^\s@<>(),;:"\\]+@[^\s@<>(),;:"\\]+\.[^\s@<>(),;:"\\]+$/;

const APP_NAME = BRAND.name.replace(/[^A-Za-z0-9]/g, '') || 'Site';

async function geocoderUserAgent(): Promise<string> {
  let contact = 'noreply@example.com';
  try {
    const settings = await readContent<{ contactEmail?: unknown }>('settings');
    const email =
      typeof settings?.contactEmail === 'string' ? settings.contactEmail.trim() : '';
    if (EMAIL_RE.test(email)) contact = email;
  } catch {
    /* Settings unreadable — fall back to the neutral contact. */
  }
  return `${APP_NAME}CMS/1.0 (contact: ${contact})`;
}

/** Geocode via OSM Nominatim.
 *  - { slug } — geocode that building's address and persist it to
 *    content/geocoded.json (fixes its map pin).
 *  - { query } — geocode an arbitrary place (e.g. a new city) and return
 *    lat/lng without persisting. */
export async function POST(req: Request) {
  const { slug, query } = (await req.json().catch(() => ({}))) as {
    slug?: string;
    query?: string;
  };

  let q = query;
  if (slug) {
    const buildings = await readContent<Array<{ slug: string; address: string }>>('buildings');
    const b = buildings.find((x) => x.slug === slug);
    if (!b) {
      return NextResponse.json({ error: 'Unknown building.' }, { status: 400 });
    }
    q = b.address;
  }
  if (!q) {
    return NextResponse.json({ error: 'Nothing to geocode.' }, { status: 400 });
  }

  /* No country filter: the template is not tied to one market, so the address
     itself (which carries its own city/region) does the narrowing. */
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': await geocoderUserAgent() },
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: 'The geocoding service is unavailable right now — try again shortly.' },
      { status: 502 }
    );
  }
  const results = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!results.length) {
    return NextResponse.json(
      { error: `No map location found for "${q}". Check the address.` },
      { status: 404 }
    );
  }
  const lat = +Number(results[0].lat).toFixed(5);
  const lng = +Number(results[0].lon).toFixed(5);

  if (slug) {
    const geocoded = await readContent<Record<string, { lat: number; lng: number }>>('geocoded');
    geocoded[slug] = { lat, lng };
    await writeContent('geocoded', geocoded);
  }

  return NextResponse.json({ ok: true, lat, lng });
}
