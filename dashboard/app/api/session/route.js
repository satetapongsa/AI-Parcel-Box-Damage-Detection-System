import { NextResponse } from 'next/server';
import { COOKIE, authEnabled, verifySessionValue } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** GET /api/session -> { enabled, loggedIn } so the page knows whether to show "Log out" */
export async function GET(request) {
  const enabled = authEnabled();
  const loggedIn = enabled ? await verifySessionValue(request.cookies.get(COOKIE)?.value) : false;
  return NextResponse.json({ enabled, loggedIn }, { headers: { 'Cache-Control': 'no-store' } });
}
