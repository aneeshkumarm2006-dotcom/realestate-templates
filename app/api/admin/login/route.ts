import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  type Session,
} from '@/lib/admin/auth';
import { isRootEmail, readUsers, verifyPassword } from '@/lib/admin/users';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { email, password } = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const secret = process.env.AUTH_SECRET;

  if (!adminEmail || !adminPassword || !secret) {
    return NextResponse.json(
      { error: 'CMS is not configured. Set ADMIN_EMAIL, ADMIN_PASSWORD and AUTH_SECRET.' },
      { status: 500 }
    );
  }
  if (typeof email !== 'string' || typeof password !== 'string') {
    return NextResponse.json(
      { error: 'Email and password are required.' },
      { status: 400 }
    );
  }

  const normalized = email.trim().toLowerCase();
  let session: Session | null = null;

  // 1. Root recovery account from env — always works, always admin.
  if (isRootEmail(normalized) && password === adminPassword) {
    session = { email: adminEmail, name: 'Site owner', role: 'admin' };
  }

  // 2. Team accounts from content/users.json (scrypt-hashed).
  if (!session) {
    const users = await readUsers();
    const user = users.find(
      (u) => u.email.toLowerCase() === normalized && u.active
    );
    if (user && (await verifyPassword(password, user.passwordHash))) {
      session = { email: user.email, name: user.name, role: user.role };
    }
  }

  if (!session) {
    return NextResponse.json(
      { error: 'That email and password combination is incorrect.' },
      { status: 401 }
    );
  }

  const token = await createSessionToken(session, secret);
  const res = NextResponse.json({ ok: true, role: session.role, name: session.name });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
