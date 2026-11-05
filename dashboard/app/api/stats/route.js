import { NextResponse } from 'next/server';
import { getDb, friendlyError } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

const iso = (d) => (d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString() : null);
const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

export async function GET() {
  try {
    const db = await getDb();
    const col = db.collection('inspections');
    const now = Date.now();
    const minuteStart = Math.floor(now / MIN) * MIN - 59 * MIN; // 60 buckets incl. current minute
    const hourStart = Math.floor(now / HOUR) * HOUR - 23 * HOUR; // 24 buckets incl. current hour

    const [total, facetResult, status, lastFail, lastEvent] = await Promise.all([
      col.countDocuments({}),
      col
        .aggregate([
          {
            $facet: {
              byResult: [{ $group: { _id: '$result', n: { $sum: 1 }, avgConf: { $avg: '$confidence' } } }],
              lastMinute: [{ $match: { ts: { $gte: new Date(now - MIN) } } }, { $count: 'n' }],
              timeline: [
                { $match: { ts: { $gte: new Date(minuteStart) } } },
                {
                  $group: {
                    _id: { m: { $dateTrunc: { date: '$ts', unit: 'minute' } }, r: '$result' },
                    n: { $sum: 1 },
                  },
                },
              ],
              hourly: [
                { $match: { ts: { $gte: new Date(hourStart) } } },
                {
                  $group: {
                    _id: { h: { $dateTrunc: { date: '$ts', unit: 'hour' } }, r: '$result' },
                    n: { $sum: 1 },
                    conf: { $avg: '$confidence' },
                  },
                },
              ],
            },
          },
        ])
        .toArray(),
      db.collection('system_status').findOne({ _id: 'bridge' }),
      col.findOne({ result: 'FAIL' }, { sort: { ts: -1 }, projection: { _id: 0 } }),
      col.findOne({}, { sort: { ts: -1 }, projection: { _id: 0 } }),
    ]);

    const facet = facetResult[0] || { byResult: [], lastMinute: [], timeline: [], hourly: [] };

    let good = 0;
    let damaged = 0;
    let confWeighted = 0;
    let confN = 0;
    for (const g of facet.byResult) {
      if (g._id === 'PASS') good = g.n;
      if (g._id === 'FAIL') damaged = g.n;
      if (typeof g.avgConf === 'number') {
        confWeighted += g.avgConf * g.n;
        confN += g.n;
      }
    }

    // per-minute timeline, zero-filled
    const minuteMap = new Map();
    for (let i = 0; i < 60; i++) minuteMap.set(minuteStart + i * MIN, { t: minuteStart + i * MIN, good: 0, damaged: 0 });
    for (const row of facet.timeline) {
      const bucket = minuteMap.get(new Date(row._id.m).getTime());
      if (!bucket) continue;
      if (row._id.r === 'PASS') bucket.good += row.n;
      else if (row._id.r === 'FAIL') bucket.damaged += row.n;
    }

    // hourly summary, zero-filled
    const hourMap = new Map();
    for (let i = 0; i < 24; i++) {
      hourMap.set(hourStart + i * HOUR, { t: hourStart + i * HOUR, good: 0, damaged: 0, total: 0, _cw: 0 });
    }
    for (const row of facet.hourly) {
      const bucket = hourMap.get(new Date(row._id.h).getTime());
      if (!bucket) continue;
      if (row._id.r === 'PASS') bucket.good += row.n;
      else if (row._id.r === 'FAIL') bucket.damaged += row.n;
      bucket.total += row.n;
      bucket._cw += (row.conf || 0) * row.n;
    }
    const hourly = [...hourMap.values()].map(({ _cw, ...h }) => ({
      ...h,
      avgConf: h.total ? Math.round((_cw / h.total) * 1000) / 1000 : null,
      yield: pct(h.good, h.good + h.damaged),
    }));

    return NextResponse.json(
      {
        ok: true,
        serverTime: now,
        counts: {
          total,
          good,
          damaged,
          passRate: pct(good, good + damaged),
          failRate: pct(damaged, good + damaged),
          avgConf: confN ? Math.round((confWeighted / confN) * 1000) / 1000 : null,
          perMin: facet.lastMinute[0] ? facet.lastMinute[0].n : 0,
        },
        invariantOk: total === good + damaged,
        timeline: [...minuteMap.values()],
        hourly,
        lastFail: lastFail ? { ...lastFail, ts: iso(lastFail.ts), createdAt: iso(lastFail.createdAt) } : null,
        lastEvent: lastEvent ? { ...lastEvent, ts: iso(lastEvent.ts), createdAt: iso(lastEvent.createdAt) } : null,
        status: status
          ? {
              mqttConnected: !!status.mqttConnected,
              fps: status.fps ?? 0,
              activeTracks: status.activeTracks ?? 0,
              lastFrameAt: iso(status.lastFrameAt),
              lastEventAt: iso(status.lastEventAt),
              lastDevice: status.lastDevice ?? null,
              lastSource: status.lastSource ?? null,
              pendingWrites: status.pendingWrites ?? 0,
              updatedAt: iso(status.updatedAt),
            }
          : null,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: friendlyError(err), serverTime: Date.now() },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
