import { NextResponse } from 'next/server';
import { COOKIE, cookieOptions } from '@/lib/session';
import { sameOrigin } from '@/lib/sameOrigin';

export const dynamic = 'force-dynamic';

/** POST /api/logout -> removes the session cookie */
export async function POST(request) {
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  res.cookies.set(COOKIE, '', cookieOptions(0));
  return res;
}
