#!/usr/bin/env node
/**
 * Provision a new client site from this template.
 *
 *   npm run new-site
 *
 * Prompts for the brand identity, the TEMPLATE (which of the three front-end
 * layouts renders), the PALETTE (one of the curated colour presets), and the
 * contact details. Then:
 *   1. rewrites content/brand.json    (name, tagline, metadata, template, palette)
 *   2. rewrites content/settings.json (contact + social; `pricing` left intact)
 *   3. regenerates public/brand/logo-{light,dark}.svg in the new palette
 *   4. regenerates the placeholder imagery in the new palette
 *   5. prints the Vercel environment checklist
 *
 * It does NOT touch the demo listings — buildings, units, photos, and page copy
 * are still the fictional demo set. Replace those through the /admin portal
 * (or by editing content/*.json) once the client's real data arrives.
 *
 * Safe to re-run: every prompt shows the current value as the default, so
 * pressing Enter keeps what is already there.
 */
import { promises as fs } from 'fs';
import path from 'path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...xs) => path.join(ROOT, ...xs);
const readJson = async (rel) => JSON.parse(await fs.readFile(p(rel), 'utf8'));
const writeJson = async (rel, data) =>
  fs.writeFile(p(rel), JSON.stringify(data, null, 2) + '\n');

const HEX = /^#[0-9a-fA-F]{6}$/;
const rl = readline.createInterface({ input, output });

/** Prompt with a default; Enter keeps the default. */
async function ask(label, fallback, validate) {
  for (;;) {
    const shown = fallback ? ` (${fallback})` : '';
    const raw = (await rl.question(`  ${label}${shown}: `)).trim();
    const value = raw || fallback || '';
    const err = validate ? validate(value) : null;
    if (!err) return value;
    console.log(`    ! ${err}`);
  }
}

/** Numbered picker. `items` = [{ id, label, note }]. Enter keeps `current`. */
async function pick(title, items, current) {
  console.log(`\n  ${title}\n`);
  items.forEach((it, i) => {
    const mark = it.id === current ? '›' : ' ';
    console.log(`   ${mark} ${i + 1}. ${it.label.padEnd(12)} ${it.note}`);
  });
  console.log('');
  for (;;) {
    const raw = (await rl.question(`  Choose 1–${items.length} (${current}): `)).trim();
    if (!raw) return current;
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 1 && n <= items.length) return items[n - 1].id;
    const byId = items.find((it) => it.id === raw.toLowerCase());
    if (byId) return byId.id;
    console.log(`    ! Enter a number 1–${items.length}.`);
  }
}

const required = (what) => (v) => (v ? null : `${what} is required.`);

/* ---- what's on offer ---------------------------------------------------- */

// Templates are discovered from the folders that actually ship, so this stays
// correct if one is added or removed.
const TEMPLATE_NOTES = {
  editorial: 'Cinematic hero, serif display, magazine long-scroll. Establishment.',
  grid: 'Dense search-first proptech: filter rail, tight listing grid. Utilitarian.',
  boutique: 'Airy luxury: oversized type, whitespace, few large images. Aspirational.',
};
const templateDirs = (await fs.readdir(p('templates'), { withFileTypes: true }))
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();
const TEMPLATES = templateDirs.map((id) => ({
  id,
  label: id[0].toUpperCase() + id.slice(1),
  note: TEMPLATE_NOTES[id] ?? '',
}));

const palettesJson = await readJson('lib/palettes.json');
const PALETTES = Object.entries(palettesJson).map(([id, v]) => ({
  id,
  label: v.label,
  note: v.note,
}));

/* ---- prompts ------------------------------------------------------------ */

console.log(`
  ────────────────────────────────────────────────────────
   New client site
   Enter to accept the value in parentheses.
  ────────────────────────────────────────────────────────
`);

const brand = await readJson('content/brand.json');
const settings = await readJson('content/settings.json');

console.log('  IDENTITY\n');
const name = await ask('Company name', brand.name, required('Company name'));
const shortName = await ask(
  'Short name (tight chrome)',
  name.split(' ')[0],
  required('Short name')
);
const tagline = await ask('Tagline', brand.tagline, required('Tagline'));

console.log('\n  SEO\n');
const metaTitle = await ask('Browser/SEO title', `${name} | ${tagline}`, required('Title'));
const metaDescription = await ask(
  'Meta description',
  brand.metadata.description,
  required('Description')
);

const template = await pick(
  'TEMPLATE — which layout renders (all three ship; switchable later)',
  TEMPLATES,
  brand.template ?? 'editorial'
);

const palette = await pick(
  'PALETTE — the colour preset (every template works with every palette)',
  PALETTES,
  brand.palette ?? 'midnight'
);

console.log('\n  ACCENT OVERRIDE  (optional — blank to use the palette as-is)\n');
const accent = await ask('Exact brand accent hex, e.g. #C2410C', '', (v) =>
  !v || HEX.test(v) ? null : 'Must be a 6-digit hex colour, or blank.'
);

console.log('\n  CONTACT\n');
const contactEmail = await ask('Contact email', settings.contactEmail, required('Email'));
const contactPhone = await ask('Contact phone', settings.contactPhone, required('Phone'));
const officeLocation = await ask('Office location', settings.officeLocation, required('Location'));

console.log('\n  SOCIAL  (blank to omit)\n');
const facebook = await ask('Facebook URL', settings.social.facebook, null);
const instagram = await ask('Instagram URL', settings.social.instagram, null);
const linkedin = await ask('LinkedIn URL', settings.social.linkedin, null);

rl.close();

/* ---- write -------------------------------------------------------------- */

/* brand.json — `theme` holds only OVERRIDES on top of the chosen palette, so a
   hand-tuned token survives a re-run. An accent override sets `gold` (the
   accent role; its hue varies by palette — see lib/palettes.ts). */
brand.name = name;
brand.shortName = shortName;
brand.tagline = tagline;
brand.metadata = { title: metaTitle, description: metaDescription };
brand.template = template;
brand.palette = palette;
brand.theme = { ...(brand.theme ?? {}) };
if (accent) brand.theme.gold = accent;
else delete brand.theme.gold;
await writeJson('content/brand.json', brand);

/* settings.json — `pricing` is spread through untouched. */
settings.contactEmail = contactEmail;
settings.contactPhone = contactPhone;
settings.officeLocation = officeLocation;
settings.social = { facebook, instagram, linkedin };
await writeJson('content/settings.json', settings);

console.log('');
execFileSync('node', [p('scripts', 'make-brand-assets.mjs')], { stdio: 'inherit' });
execFileSync('node', [p('scripts', 'make-placeholder-images.mjs')], { stdio: 'inherit' });

console.log(`
  ────────────────────────────────────────────────────────
   brand.json    template: ${template} · palette: ${palette}${accent ? ` · accent ${accent}` : ''}
   settings.json contact + social updated
   Regenerated the logo and the placeholder imagery.
  ────────────────────────────────────────────────────────

  NEXT

  1. Logo — the generated wordmark is a PLACEHOLDER. Drop the client's real
     artwork over these two files (same paths, no code change):
         public/brand/logo-light.svg   dark mark, for light backgrounds
         public/brand/logo-dark.svg    light mark, for dark backgrounds
     Then set "logo.aspectRatio" in content/brand.json to width ÷ height of the
     new artwork so the header reserves the right space.

  2. Template / palette — switch any time by editing "template" or "palette" in
     content/brand.json. All three templates ship in the repo and read the same
     content, so there is no migration. Re-run \`npm run brand-assets\` and
     \`npm run placeholder-images\` after a palette change.

  3. Content — the listings are still the fictional DEMO set. Replace the
     buildings, units, photos, and page copy via /admin, and remember a real
     PMS/property feed still has to be wired in.

  4. Vercel — set these environment variables, then deploy:

         ADMIN_EMAIL        the client's CMS login
         ADMIN_PASSWORD     a strong password
         AUTH_SECRET        openssl rand -hex 32
         CMS_STORAGE        github
         GITHUB_TOKEN       fine-grained PAT, Contents: Read & write,
                            scoped to THIS client's repo only
         GITHUB_REPO        your-org/this-client-repo
         GITHUB_BRANCH      main

     Without CMS_STORAGE=github the CMS writes to local disk, which is
     ephemeral on Vercel — saves would silently vanish on redeploy.

  5. Run it:  npm run dev   →  http://localhost:3000  and  /admin
`);
