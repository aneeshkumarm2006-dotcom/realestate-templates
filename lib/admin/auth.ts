/* ============================================================
   CMS — session auth.
   HMAC-SHA256 signed tokens via Web Crypto, so the same code
   runs in Edge middleware and Node API routes. Single-admin
   credentials come from env (.env.local): ADMIN_EMAIL,
   ADMIN_PASSWORD, AUTH_SECRET.
   ============================================================ */

import { BRAND } from '@/lib/brand';

export const SESSION_COOKIE = 'cms_admin_session';
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

const encoder = new TextEncoder();

const toB64Url = (bytes: Uint8Array): string => {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromB64Url = (s: string): string =>
  atob(s.replace(/-/g, '+').replace(/_/g, '/'));

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return toB64Url(new Uint8Array(sig));
}

export interface Session {
  email: string;
  name: string;
  role: 'admin' | 'editor';
}

export async function createSessionToken(
  session: Session,
  secret: string
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = toB64Url(
    encoder.encode(
      JSON.stringify({ e: session.email, n: session.name, r: session.role, x: exp })
    )
  );
  const sig = await hmac(payload, secret);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(
  token: string,
  secret: string
): Promise<Session | null> {
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  // Compare HMACs of the signatures rather than the signatures themselves so
  // string comparison timing reveals nothing about the expected value.
  const expected = await hmac(payload, secret);
  if ((await hmac(sig, secret)) !== (await hmac(expected, secret))) return null;
  try {
    const decoded = JSON.parse(fromB64Url(payload)) as {
      e?: string;
      n?: string;
      r?: string;
      x?: number;
    };
    if (
      typeof decoded.e !== 'string' ||
      typeof decoded.x !== 'number' ||
      decoded.x * 1000 < Date.now()
    ) {
      return null;
    }
    const role = decoded.r === 'admin' ? 'admin' : 'editor';
    return { email: decoded.e, name: decoded.n ?? decoded.e, role };
  } catch {
    return null;
  }
}

/** Session from an API route's Request cookies (middleware has already
 *  gated access; use this for role checks and commit attribution). */
export async function sessionFromRequest(req: Request): Promise<Session | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  const cookie = req.headers.get('cookie') ?? '';
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!match) return null;
  return verifySessionToken(match[1], secret);
}

/** Commit author for a session — makes History show who made the change.
 *  The email is only ever a commit trailer, never contacted; override it with
 *  CMS_COMMIT_EMAIL if the client wants commits attributed to a real address. */
export const authorFor = (session: Session | null) => ({
  name: session ? session.name : `${BRAND.shortName} Content Studio`,
  email: process.env.CMS_COMMIT_EMAIL ?? 'cms@example.com',
});
