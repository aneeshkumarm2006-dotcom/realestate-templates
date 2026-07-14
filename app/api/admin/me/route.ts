import { NextResponse } from 'next/server';
import { sessionFromRequest } from '@/lib/admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The signed-in user's identity and role (for role-aware UI). */
export async function GET(req: Request) {
  const session = await sessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(session);
}
