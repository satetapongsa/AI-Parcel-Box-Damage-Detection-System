import { NextResponse } from 'next/server';
import { COOKIE, authEnabled, verifySessionValue } from '@/lib/session';

/**
 * Login gate for the real-data pages (only when login is configured).
 * The API routes check the session again themselves; this only redirects the page.
 */
export async function proxy(request) {
  if (!authEnabled()) return NextResponse.next();
  if (await verifySessionValue(request.cookies.get(COOKIE)?.value)) return NextResponse.next();
  const url = new URL('/login', request.url);
  url.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/live/:path*'],
};
