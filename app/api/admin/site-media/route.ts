import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { ghListDir, githubMode } from '@/lib/admin/github';
import { readContent } from '@/lib/admin/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg']);

interface SiteMediaItem {
  path: string;
  name: string;
  group: 'Site image' | 'Brand' | 'Library upload';
}

async function listImages(dir: string, urlBase: string): Promise<Array<{ path: string; name: string }>> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile() && IMAGE_EXT.has(path.extname(e.name).toLowerCase()))
    .map((e) => ({ path: `${urlBase}/${e.name}`, name: e.name }));
}

async function listImagesGitHub(
  repoDir: string,
  urlBase: string
): Promise<Array<{ path: string; name: string }>> {
  const entries = await ghListDir(repoDir);
  return entries
    .filter((e) => IMAGE_EXT.has(path.extname(e.name).toLowerCase()))
    .map((e) => ({ path: `${urlBase}/${e.name}`, name: e.name }));
}

/** The reusable, site-wide images shown in the Library's Media tab:
 *  top-level files in public/assets (hero, coming-soon, city cards,
 *  placeholder), brand logos in public/brand, and library uploads.
 *  Per-property photos are NOT included — they live on each property's
 *  Photos page. */
export async function GET() {
  const pub = path.join(process.cwd(), 'public');
  const [assets, brand, uploads] = await Promise.all([
    githubMode()
      ? listImagesGitHub('public/assets', '/assets')
      : listImages(path.join(pub, 'assets'), '/assets'),
    githubMode()
      ? listImagesGitHub('public/brand', '/brand')
      : listImages(path.join(pub, 'brand'), '/brand'),
    readContent<Array<{ path: string; name: string; uploadedAt: string }>>('media'),
  ]);

  const items: SiteMediaItem[] = [
    ...uploads.map((u) => ({ path: u.path, name: u.name, group: 'Library upload' as const })),
    ...assets.map((a) => ({ ...a, group: 'Site image' as const })),
    ...brand.map((b) => ({ ...b, group: 'Brand' as const })),
  ];

  return NextResponse.json({ items });
}
