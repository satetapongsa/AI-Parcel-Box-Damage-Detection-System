'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Pipeline from '@/components/Pipeline';
import NavTabs from '@/components/NavTabs';
import KpiCard from '@/components/KpiCard';
import { PerMinuteChart, PassFailDonut } from '@/components/Charts';
import EventsTable from '@/components/EventsTable';
import HourlyTable from '@/components/HourlyTable';

const POLL_MS = 2000;
const CIRA_FRESH_MS = 5000;
const BRIDGE_FRESH_MS = 10000;

const STAGE_NAMES = { cira: 'CiRA', mqtt: 'MQTT', bridge: 'Bridge', db: 'Database' };

function ageMs(iso, now) {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? Infinity : now - t;
}

function computeHealth(stats, statsError) {
  const dbOk = !!stats && !statsError;
  const st = stats && stats.status;
  if (!st || !dbOk) {
    return { cira: false, mqtt: false, bridge: false, db: dbOk, ciraDetail: '' };
  }
  const now = stats.serverTime;
  const bridge = ageMs(st.updatedAt, now) < BRIDGE_FRESH_MS;
  const cira = bridge && ageMs(st.lastFrameAt, now) < CIRA_FRESH_MS;
  return {
    cira,
    mqtt: bridge && st.mqttConnected,
    bridge,
    db: dbOk,
    ciraDetail: cira && st.lastSource === 'simulator' ? 'SIM' : '',
  };
}

const clock = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour12: false });

function LiveClock() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono text-2xl tabular-nums text-slate-200">
      {now ? now.toLocaleTimeString('en-GB', { hour12: false }) : '--:--:--'}
    </span>
  );
}

/** Big "last box" tile — the first thing an operator looks at. */
function LatestBox({ event }) {
  if (!event) {
    return (
      <div className="flex h-full flex-col justify-center rounded-lg border border-edge bg-panel px-4 py-3">
        <div className="text-base font-semibold text-slate-300">กล่องล่าสุด · Last box</div>
        <div className="mt-1 font-mono text-5xl font-bold text-muted sm:text-6xl">—</div>
        <div className="mt-1 text-sm text-muted">ยังไม่มีข้อมูล</div>
      </div>
    );
  }
  const fail = event.result === 'FAIL';
  return (
    <div
      className={`flex h-full flex-col justify-center rounded-lg px-4 py-3 text-white ${fail ? 'bg-red-600' : 'bg-green-600'}`}
    >
      <div className="text-base font-semibold opacity-90">กล่องล่าสุด · Last box</div>
      <div className="mt-1 text-5xl font-bold leading-tight sm:text-6xl">{fail ? '✖ FAIL' : '✔ PASS'}</div>
      <div className="mt-1 text-sm opacity-90">
        {fail ? 'กล่องเสียหาย' : 'กล่องดี'} · {Math.round((event.confidence || 0) * 100)}% · {clock(event.ts)}
      </div>
    </div>
  );
}

export default function LiveDashboardPage() {
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventsError, setEventsError] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [freshIds, setFreshIds] = useState(() => new Set());
  const [alert, setAlert] = useState(null);

  const seenIds = useRef(new Set());
  const baseline = useRef(true); // first load (or filter change) -> no highlight
  const lastFailId = useRef(undefined); // undefined = not loaded yet
  const alertTimer = useRef(null);
  const filterRef = useRef(filter);

  const changeFilter = useCallback((f) => {
    filterRef.current = f;
    baseline.current = true;
    setFilter(f);
  }, []);

  const loadStats = useCallback(async (signal) => {
    try {
      const res = await fetch('/api/stats', { cache: 'no-store', signal });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setStats(data);
      setStatsError(null);

      // Red alert when a NEW FAIL arrives (independent of the table filter)
      const failId = data.lastFail ? data.lastFail.eventId : null;
      if (lastFailId.current !== undefined && failId && failId !== lastFailId.current) {
        setAlert(data.lastFail);
        clearTimeout(alertTimer.current);
        alertTimer.current = setTimeout(() => setAlert(null), 6000);
      }
      lastFailId.current = failId;
    } catch (err) {
      if (err.name === 'AbortError') return;
      setStatsError(err.message || 'Network error');
    }
  }, []);

  const loadEvents = useCallback(async (signal) => {
    const f = filterRef.current;
    try {
      const q = f === 'ALL' ? '' : `&result=${f}`;
      const res = await fetch(`/api/events?limit=20${q}`, { cache: 'no-store', signal });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (f !== filterRef.current) return; // filter changed while loading

      const list = data.events || [];
      if (baseline.current) {
        list.forEach((e) => seenIds.current.add(e.eventId));
        baseline.current = false;
        setFreshIds(new Set());
      } else {
        const fresh = list.filter((e) => !seenIds.current.has(e.eventId)).map((e) => e.eventId);
        fresh.forEach((id) => seenIds.current.add(id));
        if (fresh.length) setFreshIds(new Set(fresh));
      }
      if (seenIds.current.size > 2000) seenIds.current = new Set(list.map((e) => e.eventId));
      setEvents(list);
      setEventsError(null);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setEventsError(err.message || 'Network error');
    }
  }, []);

  useEffect(() => {
    let stopped = false;
    let busy = false;
    let controller = null;
    const tick = async () => {
      if (busy || stopped) return;
      busy = true;
      controller = new AbortController();
      await Promise.all([loadStats(controller.signal), loadEvents(controller.signal)]);
      busy = false;
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
      if (controller) controller.abort();
    };
  }, [loadStats, loadEvents]);

  // reload the table immediately when the filter changes
  useEffect(() => {
    const c = new AbortController();
    loadEvents(c.signal);
    return () => c.abort();
  }, [filter, loadEvents]);

  useEffect(() => () => clearTimeout(alertTimer.current), []);

  const health = computeHealth(stats, statsError);
  const down = Object.keys(STAGE_NAMES).filter((k) => !health[k]);
  const allOk = down.length === 0;
  const c = stats ? stats.counts : null;
  const st = stats ? stats.status : null;
  const empty = c && c.total === 0;

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6">
      {/* ---------- header ---------- */}
      <header className="rounded-lg border border-edge bg-panel px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-50">SPDI · ระบบตรวจกล่องพัสดุเสียหาย</h1>
            <p className="text-sm text-muted">Smart Parcel Defect Inspection · ข้อมูลจริงจาก CiRA CORE · Line {st?.line || 'line1'}</p>
          </div>
          <NavTabs />
          <div className="flex items-center gap-4">
            <span
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                allOk ? 'bg-green-600/20 text-green-300' : 'bg-red-600/20 text-red-300'
              }`}
            >
              {allOk ? '● ระบบทำงานปกติ' : `● ${down.map((k) => STAGE_NAMES[k]).join(', ')} ไม่ทำงาน`}
            </span>
            <LiveClock />
          </div>
        </div>
        <div className="mt-3 border-t border-edge pt-3">
          <Pipeline health={health} />
        </div>
      </header>

      {/* ---------- FAIL alert ---------- */}
      {alert ? (
        <div
          role="alert"
          className="fixed left-1/2 top-4 z-50 w-[92%] max-w-xl -translate-x-1/2 rounded-lg bg-red-600 px-4 py-3 text-white shadow-2xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-bold">พบกล่องเสียหาย · Damaged parcel</div>
              <div className="text-sm opacity-90">
                {alert.className} · {Math.round((alert.confidence || 0) * 100)}% · {alert.ts ? clock(alert.ts) : ''}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAlert(null)}
              className="rounded px-2 text-xl leading-none hover:bg-white/20"
              aria-label="Close alert"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}

      {/* ---------- error state ---------- */}
      {statsError ? (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <b>เชื่อมต่อฐานข้อมูลไม่ได้</b> · {statsError}
          <div className="mt-1 text-xs text-red-300/80">
            ตรวจ MONGODB_URI และ Atlas Network Access · ลองใหม่อัตโนมัติทุก 2 วินาที
            {stats ? ' · ตัวเลขด้านล่างเป็นข้อมูลล่าสุดที่โหลดได้' : ''}
          </div>
        </div>
      ) : null}

      {/* ---------- loading ---------- */}
      {!stats && !statsError ? (
        <div className="rounded-lg border border-edge bg-panel p-10 text-center text-muted">กำลังโหลด…</div>
      ) : null}

      {c ? (
        <>
          {empty ? (
            <div className="rounded-lg border border-edge bg-panel px-4 py-3 text-sm text-slate-300">
              ยังไม่มีข้อมูลการตรวจ — เริ่ม CiRA CORE หรือรัน <code className="font-mono">npm run demo:sim</code>
            </div>
          ) : null}

          {/* ---------- main counters ---------- */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <LatestBox event={stats.lastEvent} />
            <KpiCard
              size="lg"
              title="ตรวจแล้ว"
              subtitle="Total"
              value={c.total.toLocaleString()}
              note={stats.invariantOk ? 'ดี + เสีย = ทั้งหมด ✔' : 'ตัวเลขไม่ตรงกัน ✖'}
              noteTone={stats.invariantOk ? undefined : 'bad'}
            />
            <KpiCard
              size="lg"
              title="กล่องดี"
              subtitle="PASS"
              value={c.good.toLocaleString()}
              tone="ok"
              note={`${c.passRate}% ของทั้งหมด`}
            />
            <KpiCard
              size="lg"
              title="กล่องเสีย"
              subtitle="FAIL"
              value={c.damaged.toLocaleString()}
              tone="bad"
              note={`${c.failRate}% ของทั้งหมด`}
            />
          </section>

          {/* ---------- secondary figures ---------- */}
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard title="อัตราผ่าน" subtitle="Yield" value={c.passRate} unit="%" />
            <KpiCard title="ความเร็ว" subtitle="1 นาทีล่าสุด" value={c.perMin} unit="กล่อง/นาที" />
            <KpiCard
              title="ความมั่นใจ AI"
              subtitle="เฉลี่ย"
              value={c.avgConf === null ? '—' : (c.avgConf * 100).toFixed(1)}
              unit={c.avgConf === null ? '' : '%'}
            />
            <KpiCard
              title="CiRA"
              subtitle="เฟรม/วินาที"
              value={health.cira && st ? st.fps : 0}
              unit="fps"
              tone={health.cira ? 'neutral' : 'bad'}
              note={health.cira ? null : 'ไม่มีภาพเข้ามา'}
              noteTone="bad"
            />
          </section>

          {/* ---------- charts ---------- */}
          <section className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-lg border border-edge bg-panel p-4 lg:col-span-2">
              <h2 className="mb-2 text-base font-semibold text-slate-200">
                จำนวนกล่องต่อนาที <span className="text-sm font-normal text-muted">· 60 นาทีล่าสุด</span>
              </h2>
              <PerMinuteChart data={stats.timeline} />
            </div>
            <div className="rounded-lg border border-edge bg-panel p-4">
              <h2 className="mb-2 text-base font-semibold text-slate-200">
                สัดส่วน ดี / เสีย <span className="text-sm font-normal text-muted">· PASS vs FAIL</span>
              </h2>
              <PassFailDonut good={c.good} damaged={c.damaged} passRate={c.passRate} />
              <div className="mt-2 flex justify-center gap-4 text-sm">
                <span className="text-ok">● ดี {c.good}</span>
                <span className="text-bad">● เสีย {c.damaged}</span>
              </div>
            </div>
          </section>

          {/* ---------- tables ---------- */}
          <section className="grid gap-3 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <EventsTable
                events={events}
                filter={filter}
                onFilter={changeFilter}
                freshIds={freshIds}
                error={eventsError}
              />
            </div>
            <HourlyTable hourly={stats.hourly} />
          </section>
        </>
      ) : null}

      <footer className="pb-4 pt-1 text-center text-xs text-muted">
        อัปเดตอัตโนมัติทุก {POLL_MS / 1000} วินาที
        {st && st.pendingWrites > 0 ? ` · รอบันทึก ${st.pendingWrites} รายการ` : ''}
      </footer>
    </main>
  );
}
