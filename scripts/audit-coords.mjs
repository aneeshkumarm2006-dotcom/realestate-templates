/**
 * Audit each residence's pinned coordinate against a fresh geocode of its
 * address (OSM Nominatim). Prints distance between pin and geocode and flags
 * anything that looks wrong. Read-only — does not modify lib/data.ts.
 */

// Current address + pinned coord, transcribed from lib/data.ts.
// `geo` is the address normalized for Nominatim (ST -> Street, Ave -> Avenue).
const ITEMS = [
  { slug: 'chicklet-house',   geo: '10304 107 Avenue NW, Edmonton, AB, Canada',  pin: { lat: 53.56195, lng: -113.49980 } },
  { slug: 'woodridge',        geo: '10139 158 Street NW, Edmonton, AB, Canada',  pin: { lat: 53.50777, lng: -113.59237 } },
  { slug: 'palisades',        geo: '10825 113 Street NW, Edmonton, AB, Canada',  pin: { lat: 53.55377, lng: -113.51541 } },
  { slug: 'hamlet',           geo: '11647 124 Street NW, Edmonton, AB, Canada',  pin: { lat: 53.56818, lng: -113.53571 } },
  { slug: 'copper-manor',     geo: '13011 83 Street NW, Edmonton, AB, Canada',   pin: { lat: 53.58946, lng: -113.46890 } },
  { slug: 'kafa',             geo: '12717 119 Street NW, Edmonton, AB, Canada',  pin: { lat: 53.58548, lng: -113.52637 } },
  { slug: 'royal-lady',       geo: '10746 102 Street NW, Edmonton, AB, Canada',  pin: { lat: 53.55253, lng: -113.49567 } },
  { slug: 'catalina-estates', geo: '5910 118 Avenue NW, Edmonton, AB, Canada',   pin: { lat: 53.57065, lng: -113.43269 } },
  { slug: 'layali',           geo: '13710 64 Street NW, Edmonton, AB, Canada',   pin: { lat: 53.60011, lng: -113.44043 } },
  { slug: 'sky-manor',        geo: '9612 156 Street NW, Edmonton, AB, Canada',   pin: { lat: 53.53347, lng: -113.59051 } },
  { slug: 'grandview-manor',  geo: '11705 83 Street NW, Edmonton, AB, Canada',   pin: { lat: 53.56902, lng: -113.46863 } },
  { slug: 'cedar-manor',      geo: '12040 82 Street NW, Edmonton, AB, Canada',   pin: { lat: 53.64296, lng: -113.46738 } },
  { slug: 'courts-manor',     geo: '12239 82 Street NW, Edmonton, AB, Canada',   pin: { lat: 53.57766, lng: -113.46717 } },
  { slug: 'oakwood-manor',    geo: '11348 97 Street NW, Edmonton, AB, Canada',   pin: { lat: 53.56408, lng: -113.49233 } },
  { slug: 'royal-manor',      geo: '10215 108 Avenue NW, Edmonton, AB, Canada',  pin: { lat: 53.55293, lng: -113.49664 } },
  { slug: 'balwin-manor',     geo: '6704 131A Avenue NW, Edmonton, AB, Canada',  pin: { lat: 53.59132, lng: -113.44544 } },
  { slug: 'acadian',          geo: '11535 124 Street NW, Edmonton, AB, Canada',  pin: { lat: 53.59792, lng: -113.53657 } },
  { slug: 'parkdale',         geo: '8021 115 Avenue NW, Edmonton, AB, Canada',   pin: { lat: 53.56570, lng: -113.46520 } },
  { slug: 'beverly',          geo: '11312 34 Street NW, Edmonton, AB, Canada',   pin: { lat: 53.56629, lng: -113.39384 } },
  { slug: 'strathearn',       geo: '9510 85 Street NW, Edmonton, AB, Canada',    pin: { lat: 53.53202, lng: -113.45802 } },
  { slug: 'pioneer',          geo: '12929 127 Street NW, Edmonton, AB, Canada',  pin: { lat: 53.58853, lng: -113.54084 } },
  { slug: 'rivergate',        geo: '11040 82 Street NW, Edmonton, AB, Canada',   pin: { lat: 53.55941, lng: -113.46769 } },
  { slug: 'arbour-green',     geo: '12036 66 Street NW, Edmonton, AB, Canada',   pin: { lat: 53.57439, lng: -113.44324 } },
  { slug: 'ten-one-26-154',   geo: '10126 154 Street NW, Edmonton, AB, Canada',  pin: { lat: 53.54219, lng: -113.58721 } },
  { slug: 'britnell-landing', geo: '16255 51 Street NW, Edmonton, AB, Canada',   pin: { lat: 53.62481, lng: -113.41321 } },
  { slug: 'edge',             geo: '3005 James Mowatt Trail SW, Edmonton, AB, Canada', pin: { lat: 53.41544, lng: -113.52042 } },
  { slug: 'cielo',            geo: '235 Willis Crescent, Saskatoon, SK, Canada', pin: { lat: 52.08840, lng: -106.63143 } },
  { slug: 'greyson',          geo: '241 Willis Crescent, Saskatoon, SK, Canada', pin: { lat: 52.08835, lng: -106.62955 } },
  { slug: 'lawson-village',   geo: '192 Pinehouse Drive, Saskatoon, SK, Canada', pin: { lat: 52.16912, lng: -106.62724 } },
  { slug: 'lockwood-arms',    geo: '193 Lockwood Road, Regina, SK, Canada',      pin: { lat: 50.40151, lng: -104.62602 } },
];

const UA = 'EstateTemplate-CoordAudit/1.0';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function geocode(addr, { structured = false } = {}) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(addr)}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const d = data[0];
  return { lat: Number(d.lat), lng: Number(d.lon), type: d.type, cat: d.category, display: d.display_name };
}

const rows = [];
for (const it of ITEMS) {
  let r = null;
  try {
    r = await geocode(it.geo);
  } catch (e) {
    r = { error: e.message };
  }
  if (r && !r.error) {
    const km = haversineKm(it.pin, r);
    rows.push({ slug: it.slug, km, geocode: r, addr: it.geo });
    const flag = km > 1.5 ? '  <-- WRONG?' : km > 0.4 ? '  <-- check' : '';
    console.log(
      `${it.slug.padEnd(18)} ${km.toFixed(2).padStart(6)} km  [${r.cat}/${r.type}]${flag}`
    );
  } else {
    rows.push({ slug: it.slug, km: null, geocode: r, addr: it.geo });
    console.log(`${it.slug.padEnd(18)}   NO MATCH  "${it.geo}" ${r?.error ?? ''}`);
  }
  await sleep(1100);
}

console.log('\n=== Sorted by distance (worst first) ===');
rows
  .filter((x) => x.km != null)
  .sort((a, b) => b.km - a.km)
  .forEach((x) => {
    console.log(
      `${x.slug.padEnd(18)} ${x.km.toFixed(2).padStart(6)} km  pin vs ${x.geocode.lat.toFixed(5)},${x.geocode.lng.toFixed(5)}`
    );
  });

const misses = rows.filter((x) => x.km == null);
if (misses.length) {
  console.log('\nNo geocode match (verify manually): ' + misses.map((m) => m.slug).join(', '));
}
