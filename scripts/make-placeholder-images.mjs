#!/usr/bin/env node
/* Generate the demo placeholder imagery from the active palette.
 *
 *   npm run placeholder-images
 *
 * These stand in for real photography so a fresh clone has a complete-looking
 * site on day one. They are abstract architectural compositions — layered
 * masses, atmospheric perspective, gradient light — built from the brand
 * palette, so they re-colour with whatever palette a client picks.
 *
 * REPLACE THEM. Drop real photos into Images/<City>/<Property>/ and run
 * `npm run sync-images`, or upload via the CMS.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const brand = JSON.parse(await fs.readFile(path.join(ROOT, 'content/brand.json'), 'utf8'));
const palettes = JSON.parse(await fs.readFile(path.join(ROOT, 'lib/palettes.json'), 'utf8'));
const T = { ...(palettes[brand.palette] ?? palettes.midnight).theme, ...(brand.theme ?? {}) };

/* Deterministic PRNG — re-running produces identical art. */
const rng = (seed) => {
  let h = 2166136261;
  for (const c of String(seed)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1e5) / 1e5; };
};

const parse = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, t) => {
  const [r1, g1, b1] = parse(a), [r2, g2, b2] = parse(b);
  const c = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
};

/** A band of building masses at a given depth. Further back = lighter and
 *  hazier (atmospheric perspective), which is what sells the sense of space. */
function massBand(r, w, h, { baseY, minH, maxH, depth, windows }) {
  const tone = mix(T.ink, T.ivory, depth); // depth 0 = near/dark, 1 = far/pale
  const opacity = 0.95 - depth * 0.35;
  let out = '';
  let x = -w * 0.04;
  while (x < w * 1.02) {
    const bw = w * (0.06 + r() * 0.11);
    const bh = h * (minH + r() * (maxH - minH));
    const y = baseY - bh;
    out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${tone}" opacity="${opacity.toFixed(2)}"/>`;

    // Small, low-contrast windows only on the near band — big beige blocks read
    // as a cartoon; a fine grid reads as a building.
    if (windows && bw > w * 0.05) {
      const cols = Math.max(2, Math.floor(bw / (w * 0.018)));
      const rows = Math.max(3, Math.floor(bh / (h * 0.055)));
      const cw = bw / cols, ch = bh / rows;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const lit = r() > 0.72;
          out += `<rect x="${(x + i * cw + cw * 0.28).toFixed(1)}" y="${(y + j * ch + ch * 0.28).toFixed(1)}" width="${(cw * 0.44).toFixed(1)}" height="${(ch * 0.4).toFixed(1)}" fill="${lit ? T.goldSoft : T.ivory}" opacity="${lit ? 0.5 : 0.09}"/>`;
        }
      }
    }
    x += bw + w * 0.006;
  }
  return out;
}

/** Architectural composition: gradient sky, a light source, three receding
 *  bands of massing. Used for building exteriors, city cards, and the hero. */
function architecture(seed, w, h, { skyTop, skyMid, skyLow } = {}) {
  const r = rng(seed);
  const top = skyTop ?? mix(T.ink, T.inkSoft, 0.25);
  const mid = skyMid ?? mix(T.goldSoft, T.ivory, 0.35);
  const low = skyLow ?? T.cream;
  const ground = mix(T.ink, T.ivory, 0.12);
  const sunX = w * (0.18 + r() * 0.64);
  const sunY = h * (0.2 + r() * 0.16);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${top}"/>
      <stop offset="0.52" stop-color="${mid}"/>
      <stop offset="1" stop-color="${low}"/>
    </linearGradient>
    <radialGradient id="sun" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="${T.bone}" stop-opacity="0.85"/>
      <stop offset="1" stop-color="${T.bone}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  <circle cx="${sunX}" cy="${sunY}" r="${h * 0.26}" fill="url(#sun)"/>
  <circle cx="${sunX}" cy="${sunY}" r="${h * 0.045}" fill="${T.bone}" opacity="0.55"/>
  ${massBand(r, w, h, { baseY: h * 0.93, minH: 0.16, maxH: 0.34, depth: 0.78, windows: false })}
  ${massBand(r, w, h, { baseY: h * 0.97, minH: 0.3, maxH: 0.55, depth: 0.42, windows: false })}
  ${massBand(r, w, h, { baseY: h * 1.0, minH: 0.42, maxH: 0.78, depth: 0.06, windows: true })}
  <rect y="${h - h * 0.012}" width="${w}" height="${h * 0.012}" fill="${ground}" opacity="0.5"/>
</svg>`;
}

/** Interior: planes of light. A window casts a soft wash across a floor. */
function interior(seed, w, h) {
  const r = rng(seed);
  const wall = mix(T.ivory, T.cream, 0.3 + r() * 0.4);
  const wallShade = mix(wall, T.ink, 0.1);
  const floor = mix(T.hairlineStrong, T.gold, 0.18 + r() * 0.2);
  const horizon = h * (0.66 + r() * 0.08);
  const winX = w * (0.1 + r() * 0.4);
  const winW = w * (0.24 + r() * 0.14);
  const winTop = h * 0.12;
  const winBot = horizon - h * 0.08;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="wash" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${T.bone}" stop-opacity="0.5"/>
      <stop offset="1" stop-color="${T.bone}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${mix(T.goldSoft, T.bone, 0.35)}"/>
      <stop offset="1" stop-color="${mix(T.bone, T.cream, 0.4)}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="${wall}"/>
  <rect x="0" y="0" width="${w * 0.16}" height="${h}" fill="${wallShade}" opacity="0.5"/>

  <rect x="${winX}" y="${winTop}" width="${winW}" height="${winBot - winTop}" fill="url(#glass)"/>
  <rect x="${winX}" y="${winTop}" width="${winW}" height="${winBot - winTop}" fill="none" stroke="${mix(T.ink, T.muted, 0.45)}" stroke-width="${w * 0.005}"/>
  <line x1="${winX + winW / 2}" y1="${winTop}" x2="${winX + winW / 2}" y2="${winBot}" stroke="${mix(T.ink, T.muted, 0.45)}" stroke-width="${w * 0.003}"/>
  <line x1="${winX}" y1="${(winTop + winBot) / 2}" x2="${winX + winW}" y2="${(winTop + winBot) / 2}" stroke="${mix(T.ink, T.muted, 0.45)}" stroke-width="${w * 0.003}"/>

  <!-- light spilling from the window onto the floor -->
  <polygon points="${winX},${horizon} ${winX + winW},${horizon} ${winX + winW * 1.85},${h} ${winX - winW * 0.5},${h}" fill="url(#wash)"/>

  <rect y="${horizon}" width="${w}" height="${h - horizon}" fill="${floor}"/>
  <rect y="${horizon}" width="${w}" height="${h * 0.006}" fill="${T.hairline}"/>
  <polygon points="${winX},${horizon} ${winX + winW},${horizon} ${winX + winW * 1.85},${h} ${winX - winW * 0.5},${h}" fill="url(#wash)"/>

  <!-- a low mass reading as furniture, and a single object -->
  <rect x="${w * (0.06 + r() * 0.08)}" y="${horizon - h * 0.13}" width="${w * 0.3}" height="${h * 0.19}" rx="${h * 0.008}" fill="${mix(T.ink, T.muted, 0.5 + r() * 0.2)}" opacity="0.88"/>
  <rect x="${w * 0.78}" y="${horizon - h * 0.26}" width="${w * 0.015}" height="${h * 0.26}" fill="${mix(T.ink, T.muted, 0.35)}" opacity="0.6"/>
  <circle cx="${w * 0.787}" cy="${horizon - h * 0.28}" r="${h * 0.035}" fill="${T.goldSoft}" opacity="0.75"/>
</svg>`;
}

const out = (p) => path.join(ROOT, 'public', p);
const write = async (rel, svg, fmt = 'jpg') => {
  await fs.mkdir(path.dirname(out(rel)), { recursive: true });
  const img = sharp(Buffer.from(svg));
  await (fmt === 'jpg' ? img.jpeg({ quality: 84 }) : img.png({ compressionLevel: 9 })).toFile(out(rel));
};

const BUILDINGS = ['elmwood-court', 'alder-house', 'harbour-view'];
const CITIES = ['elmwood', 'harbourton', 'westbury'];

for (const b of BUILDINGS) {
  await write(`assets/${b}/01-main.jpg`, architecture(b + '-x', 1600, 1067));
  for (let i = 2; i <= 5; i++) {
    await write(`assets/${b}/${String(i).padStart(2, '0')}.jpg`, interior(b + i, 1600, 1067));
  }
}
for (let i = 1; i <= 3; i++) {
  await write(`assets/elmwood-court/units/201/${String(i).padStart(2, '0')}.jpg`, interior('u201' + i, 1400, 933));
}
for (const c of CITIES) await write(`assets/city-${c}.png`, architecture('city-' + c, 1200, 900), 'png');

// Wide, panoramic hero — more sky, deeper recession.
await write('assets/hero-home.png', architecture('hero', 2400, 1100), 'png');
await write('assets/admin-login.jpg', architecture('admin', 1400, 1900));
await write('assets/texture-detail.jpg', interior('texture', 1400, 1000));

await write('assets/coming-soon.png', `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1067">
  <rect width="1600" height="1067" fill="${T.cream}"/>
  <rect x="40" y="40" width="1520" height="987" fill="none" stroke="${T.hairlineStrong}" stroke-width="2"/>
  <text x="800" y="520" fill="${T.muted}" font-family="Georgia, serif" font-size="54" text-anchor="middle">Photography coming soon</text>
  <line x1="700" y1="580" x2="900" y2="580" stroke="${T.gold}" stroke-width="2"/>
</svg>`, 'png');

const initial = (brand.shortName || brand.name).charAt(0).toUpperCase();
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <rect width="512" height="512" fill="${T.ink}"/>
  <rect x="96" y="96" width="320" height="320" fill="none" stroke="${T.gold}" stroke-width="12"/>
  <text x="256" y="256" fill="${T.ivory}" font-family="Georgia, serif" font-size="200" text-anchor="middle" dominant-baseline="central">${initial}</text>
</svg>`)).png().toFile(path.join(ROOT, 'app/icon.png'));

await fs.mkdir(out('assets/library'), { recursive: true });
await fs.writeFile(out('assets/library/.gitkeep'), '');

console.log(`Placeholder imagery regenerated from the "${brand.palette ?? 'midnight'}" palette.`);
