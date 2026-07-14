import { promises as fs } from 'fs';
import path from 'path';
import {
  ghCommitFiles,
  ghReadFile,
  githubMode,
  type CommitAuthor,
} from './github';

/* ============================================================
   CMS — content store.
   All CMS-editable content lives as JSON under content/.
   The public site imports the same files at build/dev time,
   so a saved edit is what the site renders.

   Two persistence modes:
   - local (default): read/write files on disk. Used in dev —
     you review the changes and commit/push yourself.
   - github (CMS_STORAGE=github, set in Vercel): every save is
     a Git commit via the GitHub API, which triggers a Vercel
     redeploy. Reads come from GitHub too, so the admin always
     sees the latest content even before the redeploy lands.
   ============================================================ */

export const CONTENT_FILES = [
  'buildings',
  'copy',
  'amenities',
  'photos',
  'units',
  'links',
  'settings',
  'cities',
  'taxonomies',
  'geocoded',
  'media',
  'pages',
] as const;

export type ContentFile = (typeof CONTENT_FILES)[number];

export const isContentFile = (name: string): name is ContentFile =>
  (CONTENT_FILES as readonly string[]).includes(name);

const contentPath = (name: ContentFile): string =>
  path.join(process.cwd(), 'content', `${name}.json`);

export async function readContent<T = unknown>(name: ContentFile): Promise<T> {
  if (githubMode()) {
    const raw = await ghReadFile(`content/${name}.json`);
    return JSON.parse(raw) as T;
  }
  const raw = await fs.readFile(contentPath(name), 'utf8');
  return JSON.parse(raw) as T;
}

export async function writeContent(
  name: ContentFile,
  data: unknown,
  author?: CommitAuthor
): Promise<void> {
  const json = JSON.stringify(data, null, 2) + '\n';
  if (githubMode()) {
    await ghCommitFiles(
      [{ path: `content/${name}.json`, content: json }],
      `cms: update ${name}`,
      author
    );
    return;
  }
  const file = contentPath(name);
  // Write via a temp file + rename so a crash mid-write never truncates
  // the live content file.
  const tmp = file + '.tmp';
  await fs.writeFile(tmp, json, 'utf8');
  await fs.rename(tmp, file);
}
