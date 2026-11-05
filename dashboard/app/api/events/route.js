import { NextResponse } from 'next/server';
import { getDb, friendlyError } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitRaw = Number.parseInt(searchParams.get('limit') || '20', 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, limitRaw)) : 20;
    const result = (searchParams.get('result') || '').toUpperCase();
    const filter = result === 'PASS' || result === 'FAIL' ? { result } : {};

    const db = await getDb();
    const docs = await db
      .collection('inspections')
      .find(filter, {
        sort: { ts: -1 },
        limit,
        projection: {
          _id: 0,
          eventId: 1,
          ts: 1,
          line: 1,
          device: 1,
          result: 1,
          className: 1,
          confidence: 1,
          trackId: 1,
          framesSeen: 1,
          votes: 1,
          source: 1,
        },
      })
      .toArray();

    const events = docs.map((d) => ({
      ...d,
      ts: d.ts instanceof Date ? d.ts.toISOString() : d.ts,
    }));
    return NextResponse.json({ ok: true, events }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: friendlyError(err), events: [] },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
