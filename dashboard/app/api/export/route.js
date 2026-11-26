import { getDb, friendlyError } from '@/lib/mongodb';
import { requireSession } from '@/lib/session';
import { lineOf } from '@/lib/line';
import { CSV_COLUMNS, csvRow } from '@/lib/csv';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DAY = 24 * 3600 * 1000;
const MAX_ROWS = 50000;

/**
 * GET /api/export?days=7&line=line1&result=FAIL — inspections as a CSV file (newest first).
 * days: 1-90 (default 7). At most 50 000 rows.
 */
export async function GET(request) {
  const denied = await requireSession(request);
  if (denied) return denied;
  const sp = new URL(request.url).searchParams;
  const daysRaw = Number.parseInt(sp.get('days') || '7', 10);
  const days = Number.isFinite(daysRaw) ? Math.min(90, Math.max(1, daysRaw)) : 7;
  const filter = { ts: { $gte: new Date(Date.now() - days * DAY) } };
  const line = lineOf(sp);
  if (line) filter.line = line;
  const result = (sp.get('result') || '').toUpperCase();
  if (result === 'PASS' || result === 'FAIL') filter.result = result;

  try {
    const db = await getDb();
    const cursor = db
      .collection('inspections')
      .find(filter, { sort: { ts: -1 }, limit: MAX_ROWS, projection: { _id: 0, createdAt: 0, trackId: 0, source: 0 } });
    const enc = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // BOM so Excel opens the file as UTF-8
        controller.enqueue(enc.encode(`﻿${CSV_COLUMNS.join(',')}\n`));
        try {
          for await (const d of cursor) controller.enqueue(enc.encode(`${csvRow(d)}\n`));
        } finally {
          controller.close();
        }
      },
      cancel() {
        cursor.close().catch(() => {});
      },
    });
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="spdi-${line || 'all'}-${days}d-${stamp}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return Response.json({ ok: false, error: friendlyError(err) }, { status: 500 });
  }
}
