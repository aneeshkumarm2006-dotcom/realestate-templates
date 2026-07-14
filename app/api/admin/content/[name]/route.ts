import { NextResponse } from 'next/server';
import { authorFor, sessionFromRequest } from '@/lib/admin/auth';
import { isContentFile, readContent, writeContent } from '@/lib/admin/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Content files only Admins may save. */
const ADMIN_ONLY = new Set(['settings']);

type Params = { params: { name: string } };

export async function GET(_req: Request, { params }: Params) {
  if (!isContentFile(params.name)) {
    return NextResponse.json({ error: 'Unknown content file.' }, { status: 404 });
  }
  const data = await readContent(params.name);
  return NextResponse.json(data);
}

export async function PUT(req: Request, { params }: Params) {
  if (!isContentFile(params.name)) {
    return NextResponse.json({ error: 'Unknown content file.' }, { status: 404 });
  }
  const session = await sessionFromRequest(req);
  if (ADMIN_ONLY.has(params.name) && session?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admins can change site settings.' },
      { status: 403 }
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body must be valid JSON.' }, { status: 400 });
  }
  if (body === null || typeof body !== 'object') {
    return NextResponse.json(
      { error: 'Body must be a JSON object or array.' },
      { status: 400 }
    );
  }
  await writeContent(params.name, body, authorFor(session));
  return NextResponse.json({ ok: true });
}
