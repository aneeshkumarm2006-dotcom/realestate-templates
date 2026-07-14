#!/usr/bin/env node
/* Generate placeholder logo artwork from content/brand.json.
 *
 *   node scripts/make-brand-assets.mjs
 *
 * Writes public/brand/logo-light.svg + logo-dark.svg — a two-line wordmark
 * lockup (shortName over the remainder of the name) beside a ruled initial.
 * The generated aspect ratio is written back to brand.logo.aspectRatio so the
 * header reserves the right amount of space.
 *
 * This exists so a new client site has a usable mark on day one. It is a
 * PLACEHOLDER: drop real artwork at the same two paths and the site picks it
 * up with no code change. Run this again any time the brand name changes.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BRAND_FILE = path.join(ROOT, 'content', 'brand.json');
const PALETTES_FILE = path.join(ROOT, 'lib', 'palettes.json');
const OUT_DIR = path.join(ROOT, 'public', 'brand');

/** Resolve the active theme exactly as the app does: the named palette preset
 *  with any inline brand.theme overrides applied on top. Kept in sync with
 *  lib/brand.ts::resolveTheme by reading the same lib/palettes.json. */
async function resolveTheme(brand) {
  const palettes = JSON.parse(await fs.readFile(PALETTES_FILE, 'utf8'));
  const preset = palettes[brand.palette] ?? palettes.midnight;
  return { ...preset.theme, ...(brand.theme ?? {}) };
}

/* Layout constants, in SVG user units. */
const H = 100;          // canvas height
const MARK = 64;        // ruled square around the initial
const GAP = 20;         // mark -> wordmark
const PAD = 2;          // keeps the mark's stroke off the edge
const L1_SIZE = 30;     // shortName
const L2_SIZE = 12;     // remainder of the name
const L1_TRACK = 0.06;  // letter-spacing, em
const L2_TRACK = 0.3;

/** Rough advance width of a run of caps, in user units. Serif caps average
 *  ~0.72em; this only needs to be close enough to size the viewBox, since the
 *  Logo component letterboxes rather than distorts. Overestimates are free
 *  (trailing whitespace), so round up. */
const textWidth = (s, size, track) => s.length * size * (0.72 + track);

const SERIF = "Georgia, 'Times New Roman', 'Iowan Old Style', serif";
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Split "Northwind Residences" + shortName "Northwind" -> the two lockup
 *  lines. When shortName isn't a prefix of name (or equals it), fall back to
 *  splitting on the first space so we always get a sane lockup. */
function lockupLines(name, shortName) {
  const short = (shortName || '').trim();
  const full = name.trim();
  if (short && short !== full && full.toLowerCase().startsWith(short.toLowerCase())) {
    return [short, full.slice(short.length).trim()];
  }
  const i = full.indexOf(' ');
  return i === -1 ? [full, ''] : [full.slice(0, i), full.slice(i + 1)];
}

function svg({ line1, line2, initial, fg, accent, subdued }) {
  const w1 = textWidth(line1, L1_SIZE, L1_TRACK);
  const w2 = textWidth(line2, L2_SIZE, L2_TRACK);
  const textW = Math.ceil(Math.max(w1, w2));
  const W = PAD + MARK + GAP + textW + PAD;
  const textX = PAD + MARK + GAP;
  // Optically centre the pair of lines against the mark.
  const baseline1 = line2 ? 52 : 60;
  const baseline2 = 74;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(line1)} ${esc(line2)}">
  <rect x="${PAD + 0.75}" y="${(H - MARK) / 2 + 0.75}" width="${MARK - 1.5}" height="${MARK - 1.5}" fill="none" stroke="${accent}" stroke-width="1.5"/>
  <text x="${PAD + MARK / 2}" y="${H / 2}" fill="${fg}" font-family="${SERIF}" font-size="34" text-anchor="middle" dominant-baseline="central">${esc(initial)}</text>
  <text x="${textX}" y="${baseline1}" fill="${fg}" font-family="${SERIF}" font-size="${L1_SIZE}" letter-spacing="${L1_TRACK}em">${esc(line1.toUpperCase())}</text>
${line2 ? `  <text x="${textX}" y="${baseline2}" fill="${subdued}" font-family="${SANS}" font-size="${L2_SIZE}" font-weight="500" letter-spacing="${L2_TRACK}em">${esc(line2.toUpperCase())}</text>` : ''}
</svg>
`.replace(/\n\n/g, '\n');
}

const brand = JSON.parse(await fs.readFile(BRAND_FILE, 'utf8'));
const { name, shortName } = brand;
const theme = await resolveTheme(brand);
const [line1, line2] = lockupLines(name, shortName);
const initial = (shortName || name).trim().charAt(0).toUpperCase();

const light = svg({
  line1, line2, initial,
  fg: theme.ink, accent: theme.gold, subdued: theme.muted,
});
const dark = svg({
  line1, line2, initial,
  fg: theme.ivory, accent: theme.gold, subdued: theme.goldSoft,
});

await fs.mkdir(OUT_DIR, { recursive: true });
await fs.writeFile(path.join(OUT_DIR, 'logo-light.svg'), light);
await fs.writeFile(path.join(OUT_DIR, 'logo-dark.svg'), dark);

// Keep brand.logo.aspectRatio honest — the Logo component sizes from it.
const width = Number(/viewBox="0 0 ([\d.]+)/.exec(light)[1]);
brand.logo.aspectRatio = +(width / H).toFixed(2);
await fs.writeFile(BRAND_FILE, JSON.stringify(brand, null, 2) + '\n');

console.log(`wrote public/brand/logo-{light,dark}.svg  (${width}×${H}, ratio ${brand.logo.aspectRatio})`);
