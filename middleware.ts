import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/admin/auth';

/** Guards the CMS portal. Everything under /admin and /api/admin requires a
 *  valid session cookie, except the login page and login endpoint. */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const secret = process.env.AUTH_SECRET;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session =
    secret && token ? await verifySessionToken(token, secret) : null;

  const isLoginPage = pathname === '/admin/login';
  const isLoginApi = pathname === '/api/admin/login';

  if (isLoginApi) return NextResponse.next();
  if (isLoginPage) {
    return session
      ? NextResponse.redirect(new URL('/admin', req.url))
      : NextResponse.next();
  }
  if (session) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const login = new URL('/admin/login', req.url);
  if (pathname !== '/admin') login.searchParams.set('from', pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
