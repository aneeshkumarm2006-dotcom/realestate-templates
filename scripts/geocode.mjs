#!/usr/bin/env node
/**
 * Geocode every building in content/buildings.json via OpenStreetMap Nominatim
 * and write the results to content/geocoded.json — the file the site actually
 * reads for map pins.
 *
 *   node scripts/geocode.mjs          # only buildings with no coordinates yet
 *   node scripts/geocode.mjs --all    # re-geocode everything, overwriting
 *
 * Nominatim's public endpoint has a 1 req/sec ceiling and requires a real
 * User-Agent, so we sleep between requests and identify ourselves from the
 * brand name. Existing entries are preserved unless --all is passed — the CMS
 * "Fix map pin" button writes to the same file, and we must not clobber a pin
 * an editor has already corrected by hand.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = async (p) => JSON.parse(await fs.readFile(path.join(ROOT, p), 'utf8'));

const brand = await read('content/brand.json');
const buildings = await read('content/buildings.json');

const GEOCODED_FILE = path.join(ROOT, 'content', 'geocoded.json');
const existing = await read('content/geocoded.json').catch(() => ({}));

const all = process.argv.includes('--all');
const slug = brand.shortName.replace(/[^A-Za-z0-9]/g, '') || 'Estate';
const UA = `${slug}-Geocode/1.0`;

const targets = buildings.filter((b) => all || !existing[b.slug]);
if (targets.length === 0) {
  console.log('Every building already has coordinates. Pass --all to re-geocode.');
  process.exit(0);
}

async function geocode(addr) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(addr)}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return { lat: +Number(data[0].lat).toFixed(5), lng: +Number(data[0].lon).toFixed(5) };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const out = { ...existing };
let ok = 0;
let missed = 0;

for (const b of targets) {
  try {
    const r = await geocode(b.address);
    if (r) {
      out[b.slug] = r;
      ok++;
      console.log(`✓ ${b.slug.padEnd(22)} ${r.lat}, ${r.lng}`);
    } else {
      missed++;
      console.log(`✗ ${b.slug.padEnd(22)} no match for "${b.address}"`);
    }
  } catch (e) {
    missed++;
    console.log(`✗ ${b.slug.padEnd(22)} error: ${e.message}`);
  }
  await sleep(1100); // Nominatim asks for <= 1 req/sec.
}

await fs.writeFile(GEOCODED_FILE, JSON.stringify(out, null, 2) + '\n');
console.log(`\n${ok} matched, ${missed} missed — wrote content/geocoded.json`);
if (missed > 0) {
  console.log('Buildings with no match keep their city-centre fallback pin.');
  console.log('Fix them individually with the "Fix map pin" button in the CMS.');
}
