import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { ghCreateBlob, githubMode } from '@/lib/admin/github';
import { readContent } from '@/lib/admin/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_EDGE = 1800; // same web size the sync-images pipeline ships
const JPEG_QUALITY = 82;

/** Upload one or more photos (resize + store only — never commits).
 *  - dest omitted / 'building' (+ slug): public/assets/<slug>/uploads/
 *  - dest 'unit' (+ slug + unit): public/assets/<slug>/units/<unit>/uploads/
 *  - dest 'library': public/assets/library/
 *  Returns { added: webPaths, staged: [{path, sha}] } — staged is non-empty
 *  in GitHub mode, where files wait as uncommitted blobs until the page
 *  publishes them in one commit via /api/admin/commit-staged. */
export async function POST(req: Request) {
  const form = await req.formData();
  const dest = String(form.get('dest') ?? 'building');
  const slug = String(form.get('slug') ?? '');
  const unit = String(form.get('unit') ?? '')
    .trim()
    .replace(/[^A-Za-z0-9-]/g, '-');
  const files = form.getAll('files').filter((f): f is File => f instanceof File);

  if (dest === 'building' || dest === 'unit') {
    const buildings = await readContent<Array<{ slug: string }>>('buildings');
    if (!buildings.some((b) => b.slug === slug)) {
      return NextResponse.json({ error: 'Unknown building.' }, { status: 400 });
    }
    if (dest === 'unit' && !unit) {
      return NextResponse.json(
        { error: 'Give the unit a number before uploading its photos.' },
        { status: 400 }
      );
    }
  } else if (dest !== 'library') {
    return NextResponse.json({ error: 'Unknown upload destination.' }, { status: 400 });
  }
  if (files.length === 0) {
    return NextResponse.json({ error: 'No files received.' }, { status: 400 });
  }

  const relDir =
    dest === 'library'
      ? ['library']
      : dest === 'unit'
        ? [slug, 'units', unit, 'uploads']
        : [slug, 'uploads'];

  // Resize everything to web size in memory first.
  const added: string[] = [];
  const names: string[] = [];
  const buffers: Buffer[] = [];
  const stamp = Date.now();
  for (let i = 0; i < files.length; i++) {
    const input = Buffer.from(await files[i].arrayBuffer());
    const filename = `${stamp}-${String(i + 1).padStart(2, '0')}.jpg`;
    try {
      buffers.push(
        await sharp(input)
          .rotate() // honour EXIF orientation
          .resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
          .toBuffer()
      );
    } catch {
      return NextResponse.json(
        { error: `"${files[i].name}" is not a readable image.` },
        { status: 400 }
      );
    }
    added.push(['/assets', ...relDir, filename].join('/'));
    names.push(files[i].name);
  }

  // Uploads NEVER commit or edit content JSON by themselves — the editor
  // pages put the returned paths into their draft and publish everything in
  // ONE commit (via /api/admin/commit-staged), so a 20-photo session is a
  // single deploy instead of twenty.
  if (githubMode()) {
    // Stage blobs in GitHub's object store; no commit, no deploy yet.
    const staged = await Promise.all(
      buffers.map(async (buf, i) => ({
        path: `public${added[i]}`,
        sha: await ghCreateBlob(buf),
      }))
    );
    return NextResponse.json({ ok: true, added, staged });
  }

  // Local mode: files land on disk immediately; publishing is just the
  // JSON save (and you commit/push yourself).
  const dir = path.join(process.cwd(), 'public', 'assets', ...relDir);
  await fs.mkdir(dir, { recursive: true });
  await Promise.all(
    buffers.map((buf, i) =>
      fs.writeFile(path.join(dir, path.basename(added[i])), buf)
    )
  );
  return NextResponse.json({ ok: true, added, staged: [] });
}
