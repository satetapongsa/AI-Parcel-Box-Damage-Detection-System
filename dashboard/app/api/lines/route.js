import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { getDb, friendlyError } from '@/lib/mongodb';
import { LINE_RE } from '@/lib/line';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** GET /api/lines — conveyor lines that have inspections, for the line selector. */
export async function GET(request) {
  const denied = await requireSession(request);
  if (denied) return denied;
  try {
    const db = await getDb();
    const lines = (await db.collection('inspections').distinct('line')).filter((l) => typeof l === 'string' && LINE_RE.test(l)).sort();
    return NextResponse.json({ ok: true, lines: lines.length ? lines : ['line1'] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: friendlyError(err), lines: ['line1'] }, { status: 500 });
  }
}
