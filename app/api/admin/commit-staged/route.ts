import { NextResponse } from 'next/server';
import { authorFor, sessionFromRequest } from '@/lib/admin/auth';
import { ghCommitFiles, githubMode, type CommitFile } from '@/lib/admin/github';
import { isContentFile, writeContent } from '@/lib/admin/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SAFE_ASSET_PATH = /^public\/assets\/[A-Za-z0-9][A-Za-z0-9/._-]*\.(jpg|jpeg|png|webp|avif)$/;

interface Payload {
  message?: string;
  /** Blobs staged by /api/admin/upload (GitHub mode). */
  files?: Array<{ path: string; sha: string }>;
  /** Content files to save in the same commit. */
  content?: Array<{ name: string; data: unknown }>;
}

/** Publish a whole editing session as ONE commit: every staged photo blob
 *  plus the content JSON that references them. In local mode the files are
 *  already on disk, so this just writes the JSON. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Payload | null;
  if (!body) {
    return NextResponse.json({ error: 'Body must be valid JSON.' }, { status: 400 });
  }
  const files = Array.isArray(body.files) ? body.files : [];
  const content = Array.isArray(body.content) ? body.content : [];

  for (const f of files) {
    if (
      typeof f?.path !== 'string' ||
      typeof f?.sha !== 'string' ||
      f.path.includes('..') ||
      !SAFE_ASSET_PATH.test(f.path) ||
      !/^[0-9a-f]{40}$/.test(f.sha)
    ) {
      return NextResponse.json({ error: 'Invalid staged file entry.' }, { status: 400 });
    }
  }
  for (const c of content) {
    if (!c || typeof c.name !== 'string' || !isContentFile(c.name)) {
      return NextResponse.json({ error: 'Unknown content file.' }, { status: 400 });
    }
    if (c.data === null || typeof c.data !== 'object') {
      return NextResponse.json(
        { error: 'Content data must be a JSON object or array.' },
        { status: 400 }
      );
    }
  }
  if (files.length === 0 && content.length === 0) {
    return NextResponse.json({ error: 'Nothing to publish.' }, { status: 400 });
  }

  if (githubMode()) {
    const commitFiles: CommitFile[] = [
      ...files.map((f) => ({ path: f.path, sha: f.sha })),
      ...content.map((c) => ({
        path: `content/${c.name}.json`,
        content: JSON.stringify(c.data, null, 2) + '\n',
      })),
    ];
    const message =
      typeof body.message === 'string' && body.message.trim()
        ? `cms: ${body.message.trim().slice(0, 100)}`
        : `cms: publish ${files.length} photo(s) + ${content.length} content file(s)`;
    const session = await sessionFromRequest(req);
    await ghCommitFiles(commitFiles, message, authorFor(session));
  } else {
    // Local mode: staged files were already written to disk by the upload
    // route; only the JSON needs saving.
    for (const c of content) {
      if (isContentFile(c.name)) await writeContent(c.name, c.data);
    }
  }

  return NextResponse.json({ ok: true });
}
