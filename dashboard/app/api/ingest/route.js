import { NextResponse } from 'next/server';
import { getDb, friendlyError } from '@/lib/mongodb';
import { MAX_BODY_BYTES, MAX_EVENTS, bearer, cleanEvent, cleanStatus, tokenMatches } from '@/lib/ingest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store' };
const reply = (body, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

/**
 * POST /api/ingest — the bridge sends counted boxes here over HTTPS (SINK=http),
 * for networks that block MongoDB's port 27017.
 *   Authorization: Bearer <INGEST_TOKEN>
 *   { "events": [ ...up to 200 ] }   or   { "status": { ...bridge heartbeat } }
 * Disabled (403) unless INGEST_TOKEN is set on the server.
 */
export async function POST(request) {
  const expected = process.env.INGEST_TOKEN;
  if (!expected || expected.length < 24) return reply({ ok: false, error: 'Ingest is disabled' }, 403);
  if (!tokenMatches(bearer(request.headers.get('authorization')), expected)) {
    return reply({ ok: false, error: 'Unauthorized' }, 401);
  }

  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > MAX_BODY_BYTES) return reply({ ok: false, error: 'Body too large' }, 413);
  let body;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return reply({ ok: false, error: 'Body too large' }, 413);
    body = JSON.parse(text);
  } catch {
    return reply({ ok: false, error: 'Invalid JSON' }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return reply({ ok: false, error: 'Invalid body' }, 422);

  try {
    const db = await getDb();

    if (body.status !== undefined) {
      const st = cleanStatus(body.status);
      if (!st) return reply({ ok: false, error: 'Invalid status' }, 422);
      await db.collection('system_status').updateOne({ _id: st.id }, { $set: st.fields }, { upsert: true });
      return reply({ ok: true });
    }

    if (!Array.isArray(body.events) || body.events.length === 0 || body.events.length > MAX_EVENTS) {
      return reply({ ok: false, error: `events must be an array of 1-${MAX_EVENTS}` }, 422);
    }
    const docs = [];
    for (let i = 0; i < body.events.length; i++) {
      const { doc, error } = cleanEvent(body.events[i]);
      if (error) return reply({ ok: false, error: `event ${i}: invalid ${error}` }, 422);
      docs.push(doc);
    }

    let duplicates = 0;
    try {
      await db.collection('inspections').insertMany(docs, { ordered: false });
    } catch (err) {
      const writeErrors = (err && err.writeErrors) || [];
      const onlyDuplicates = err && (err.code === 11000 || (writeErrors.length && writeErrors.every((w) => w.code === 11000)));
      if (!onlyDuplicates) throw err;
      duplicates = writeErrors.length || 1; // already stored earlier: fine, the bridge retried
    }
    return reply({ ok: true, inserted: docs.length - duplicates, duplicates });
  } catch (err) {
    return reply({ ok: false, error: friendlyError(err) }, 500);
  }
}

export async function GET() {
  return reply({ ok: false, error: 'Use POST' }, 405);
}
