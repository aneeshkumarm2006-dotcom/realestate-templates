import { NextResponse } from 'next/server';
import { authorFor, sessionFromRequest } from '@/lib/admin/auth';
import {
  hashPassword,
  isRootEmail,
  readUsers,
  writeUsers,
  type Role,
  type User,
} from '@/lib/admin/users';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const isRole = (r: unknown): r is Role => r === 'admin' || r === 'editor';

const publicUser = (u: User) => ({
  email: u.email,
  name: u.name,
  role: u.role,
  createdAt: u.createdAt,
  active: u.active,
});

async function requireAdmin(req: Request) {
  const session = await sessionFromRequest(req);
  if (!session || session.role !== 'admin') return null;
  return session;
}

/** List team accounts (password hashes never leave the server). */
export async function GET(req: Request) {
  const session = await requireAdmin(req);
  if (!session) {
    return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  }
  const users = await readUsers();
  return NextResponse.json({
    users: users.map(publicUser),
    rootEmail: process.env.ADMIN_EMAIL ?? null,
  });
}

/** Create a team account. */
export async function POST(req: Request) {
  const session = await requireAdmin(req);
  if (!session) {
    return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  }
  const { email, name, role, password } = (await req.json().catch(() => ({}))) as {
    email?: string;
    name?: string;
    role?: string;
    password?: string;
  };
  if (!email || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  }
  if (!name?.trim()) {
    return NextResponse.json({ error: 'A name is required.' }, { status: 400 });
  }
  if (!isRole(role)) {
    return NextResponse.json({ error: 'Role must be admin or editor.' }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters.' },
      { status: 400 }
    );
  }
  const normalized = email.trim().toLowerCase();
  if (isRootEmail(normalized)) {
    return NextResponse.json(
      { error: 'That email is the site-owner recovery account.' },
      { status: 400 }
    );
  }
  const users = await readUsers();
  if (users.some((u) => u.email.toLowerCase() === normalized)) {
    return NextResponse.json(
      { error: 'A user with that email already exists.' },
      { status: 400 }
    );
  }
  const user: User = {
    email: email.trim(),
    name: name.trim(),
    role,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
    active: true,
  };
  await writeUsers(
    [...users, user],
    `cms: add user ${user.email}`,
    authorFor(session)
  );
  return NextResponse.json({ ok: true, user: publicUser(user) });
}

/** Update a team account: role, active, or a password reset. */
export async function PUT(req: Request) {
  const session = await requireAdmin(req);
  if (!session) {
    return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  }
  const { email, role, active, newPassword } = (await req.json().catch(() => ({}))) as {
    email?: string;
    role?: string;
    active?: boolean;
    newPassword?: string;
  };
  const users = await readUsers();
  const idx = users.findIndex(
    (u) => u.email.toLowerCase() === (email ?? '').trim().toLowerCase()
  );
  if (idx === -1) {
    return NextResponse.json({ error: 'Unknown user.' }, { status: 404 });
  }
  const user = { ...users[idx] };
  if (role !== undefined) {
    if (!isRole(role)) {
      return NextResponse.json({ error: 'Role must be admin or editor.' }, { status: 400 });
    }
    user.role = role;
  }
  if (active !== undefined) user.active = !!active;
  if (newPassword !== undefined) {
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      );
    }
    user.passwordHash = await hashPassword(newPassword);
  }
  const next = [...users];
  next[idx] = user;
  await writeUsers(next, `cms: update user ${user.email}`, authorFor(session));
  return NextResponse.json({ ok: true, user: publicUser(user) });
}

/** Remove a team account. */
export async function DELETE(req: Request) {
  const session = await requireAdmin(req);
  if (!session) {
    return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  }
  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  const users = await readUsers();
  const target = (email ?? '').trim().toLowerCase();
  if (!users.some((u) => u.email.toLowerCase() === target)) {
    return NextResponse.json({ error: 'Unknown user.' }, { status: 404 });
  }
  await writeUsers(
    users.filter((u) => u.email.toLowerCase() !== target),
    `cms: remove user ${target}`,
    authorFor(session)
  );
  return NextResponse.json({ ok: true });
}
