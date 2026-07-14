import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { authorFor, sessionFromRequest } from '@/lib/admin/auth';
import { githubMode } from '@/lib/admin/github';
import {
  hashPassword,
  isRootEmail,
  readUsers,
  verifyPassword,
  writeUsers,
} from '@/lib/admin/users';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Change the signed-in user's own password.
 *  - Team accounts (content/users.json): verify current, store a new scrypt
 *    hash. Works everywhere.
 *  - The root env account: rewrites .env.local locally; on the deployed site
 *    it must be changed in Vercel env vars (never committed to the repo). */
export async function POST(req: Request) {
  const { current, next } = (await req.json().catch(() => ({}))) as {
    current?: string;
    next?: string;
  };

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'CMS is not configured.' }, { status: 500 });
  }
  const session = await sessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Team account: update the scrypt hash in content/users.json.
  if (!isRootEmail(session.email)) {
    if (!next || next.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters.' },
        { status: 400 }
      );
    }
    const users = await readUsers();
    const idx = users.findIndex(
      (u) => u.email.toLowerCase() === session.email.toLowerCase()
    );
    if (idx === -1 || !users[idx].active) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }
    if (!current || !(await verifyPassword(current, users[idx].passwordHash))) {
      return NextResponse.json(
        { error: 'Your current password is incorrect.' },
        { status: 403 }
      );
    }
    const updated = [...users];
    updated[idx] = { ...users[idx], passwordHash: await hashPassword(next) };
    await writeUsers(
      updated,
      `cms: password change for ${session.email}`,
      authorFor(session)
    );
    return NextResponse.json({ ok: true });
  }

  if (githubMode()) {
    // No local .env.local to rewrite on the deployed site, and a password
    // must never be committed to the repo.
    return NextResponse.json(
      {
        error:
          'The site-owner password lives in Vercel: Project → Settings → Environment Variables → ADMIN_PASSWORD, then redeploy.',
      },
      { status: 400 }
    );
  }
  if (current !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: 'Your current password is incorrect.' },
      { status: 403 }
    );
  }
  if (!next || next.length < 8) {
    return NextResponse.json(
      { error: 'New password must be at least 8 characters.' },
      { status: 400 }
    );
  }

  const envPath = path.join(process.cwd(), '.env.local');
  let env: string;
  try {
    env = await fs.readFile(envPath, 'utf8');
  } catch {
    return NextResponse.json(
      { error: 'Could not read .env.local on this server.' },
      { status: 500 }
    );
  }
  const line = `ADMIN_PASSWORD=${next}`;
  env = /^ADMIN_PASSWORD=.*$/m.test(env)
    ? env.replace(/^ADMIN_PASSWORD=.*$/m, line)
    : env.trimEnd() + '\n' + line + '\n';
  await fs.writeFile(envPath, env, 'utf8');
  process.env.ADMIN_PASSWORD = next;

  return NextResponse.json({ ok: true });
}
