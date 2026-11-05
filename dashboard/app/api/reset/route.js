import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getDb, friendlyError } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function tokenMatches(given, expected) {
  const a = Buffer.from(String(given || ''));
  const b = Buffer.from(String(expected));
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * POST /api/reset — deletes all inspections.
 * Enabled ONLY when env ADMIN_TOKEN is set AND header x-admin-token matches it.
 */
export async function POST(request) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'Reset is disabled (ADMIN_TOKEN not set)' }, { status: 403 });
  }
  if (!tokenMatches(request.headers.get('x-admin-token'), expected)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }
  try {
    const db = await getDb();
    const res = await db.collection('inspections').deleteMany({});
    return NextResponse.json({ ok: true, deleted: res.deletedCount });
  } catch (err) {
    return NextResponse.json({ ok: false, error: friendlyError(err) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: 'Use POST' }, { status: 405 });
}
