import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { authorFor, sessionFromRequest } from '@/lib/admin/auth';
import {
  ghCommitFiles,
  ghReadFileAt,
  githubMode,
  type CommitFile,
} from '@/lib/admin/github';
import { CONTENT_FILES, writeContent } from '@/lib/admin/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const run = promisify(execFile);

/** Restore ALL CMS content (content/*.json) to how it was at a given commit.
 *  Creates a NEW commit/save on top of history — nothing is ever deleted from
 *  the timeline, so a restore can itself be undone. Photos on disk are kept;
 *  restoring content simply re-points which of them the site shows. */
export async function POST(req: Request) {
  const session = await sessionFromRequest(req);
  if (session?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admins can restore history.' },
      { status: 403 }
    );
  }
  const { sha } = (await req.json().catch(() => ({}))) as { sha?: string };
  if (!sha || !/^[0-9a-f]{7,40}$/i.test(sha)) {
    return NextResponse.json({ error: 'Invalid commit id.' }, { status: 400 });
  }

  if (githubMode()) {
    const files: CommitFile[] = [];
    for (const name of CONTENT_FILES) {
      const text = await ghReadFileAt(`content/${name}.json`, sha);
      // Files that didn't exist at that point in history keep their current
      // state rather than being emptied.
      if (text !== null) files.push({ path: `content/${name}.json`, content: text });
    }
    if (files.length === 0) {
      return NextResponse.json(
        { error: 'That point in history has no CMS content to restore.' },
        { status: 400 }
      );
    }
    await ghCommitFiles(
      files,
      `cms: restore content to ${sha.slice(0, 7)}`,
      authorFor(session)
    );
    return NextResponse.json({ ok: true, restored: files.length });
  }

  // Local mode: read each file at the commit via git and write it back.
  let restored = 0;
  for (const name of CONTENT_FILES) {
    try {
      const { stdout } = await run('git', ['show', `${sha}:content/${name}.json`], {
        maxBuffer: 32 * 1024 * 1024,
      });
      await writeContent(name, JSON.parse(stdout));
      restored++;
    } catch {
      // File didn't exist at that commit — keep the current version.
    }
  }
  if (restored === 0) {
    return NextResponse.json(
      { error: 'That point in history has no CMS content to restore.' },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true, restored });
}
