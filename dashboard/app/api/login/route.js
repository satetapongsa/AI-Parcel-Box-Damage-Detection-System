import { NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/password';
import { COOKIE, authEnabled, cookieOptions, createSessionValue } from '@/lib/session';
import { clearFails, clientKey, isBlocked, recordFail } from '@/lib/rateLimit';
import { sameOrigin } from '@/lib/sameOrigin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store' };

/** POST /api/login { password } -> sets the httpOnly session cookie */
export async function POST(request) {
  if (!authEnabled()) return NextResponse.json({ ok: true, open: true }, { headers: NO_STORE });
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403, headers: NO_STORE });
  const key = clientKey(request);
  if (isBlocked(key)) {
    return NextResponse.json({ ok: false, error: 'Too many tries, wait 15 minutes' }, { status: 429, headers: NO_STORE });
  }
  let password = '';
  try {
    const body = await request.json();
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    /* empty or invalid body */
  }
  const ok = password.length > 0 && (await verifyPassword(password, process.env.DASHBOARD_PASSWORD_HASH));
  if (!ok) {
    recordFail(key);
    return NextResponse.json({ ok: false, error: 'Wrong password' }, { status: 401, headers: NO_STORE });
  }
  clearFails(key);
  const res = NextResponse.json({ ok: true }, { headers: NO_STORE });
  res.cookies.set(COOKIE, await createSessionValue(), cookieOptions());
  return res;
}
