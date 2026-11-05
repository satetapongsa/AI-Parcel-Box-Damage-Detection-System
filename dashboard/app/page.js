'use client';

import { useEffect, useState } from 'react';
import NavTabs from '@/components/NavTabs';
import KpiCard from '@/components/KpiCard';
import ConveyorScene from '@/components/sim/ConveyorScene';
import ControlPanel from '@/components/sim/ControlPanel';
import SystemFlow from '@/components/sim/SystemFlow';
import EventLog from '@/components/sim/EventLog';
import MessageFeed from '@/components/sim/MessageFeed';
import { ThroughputChart, ClassDonut } from '@/components/sim/SimCharts';
import { BoxThumb } from '@/components/sim/BoxGlyph';
import { CLASSES, formatSimTime } from '@/lib/sim/engine';
import { useSim } from '@/lib/sim/useSim';

const LIGHT_TEXT = {
  green: { text: '● สายพานทำงานปกติ', cls: 'bg-green-600/20 text-green-300' },
  yellow: { text: '● พบกล่องเสีย กำลังคัดออก', cls: 'bg-amber-500/20 text-amber-300' },
  red: { text: '● สายพานหยุด', cls: 'bg-red-600/20 text-red-300' },
};

function Clock() {
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

function LastDecision({ ev }) {
  if (!ev) {
    return (
      <div className="flex h-full flex-col justify-center rounded-lg border border-edge bg-panel px-4 py-3">
        <div className="text-base font-semibold text-slate-300">กล่องล่าสุด</div>
        <div className="mt-1 font-mono text-5xl font-bold text-muted">—</div>
        <div className="mt-1 text-sm text-muted">รอกล่องผ่านเส้นตัดสิน</div>
      </div>
    );
  }
  const reject = ev.result === 'REJECT';
  return (
    <div className={`flex h-full items-center gap-3 rounded-lg px-4 py-3 text-white ${reject ? 'bg-red-600' : 'bg-green-600'}`}>
      <div className="min-w-0 flex-1">
        <div className="text-base font-semibold opacity-90">กล่องล่าสุด</div>
        <div className="mt-1 text-5xl font-bold leading-tight">{reject ? '✖ REJECT' : '✔ PASS'}</div>
        <div className="mt-1 truncate text-sm opacity-90">
          {CLASSES[ev.predicted].th} · {Math.round(ev.conf * 100)}% · {ev.tracking}
        </div>
      </div>
      <div className="hidden rounded-md bg-white/15 p-1 sm:block">
        <BoxThumb truth={ev.truth} seed={ev.seed} size={64} />
      </div>
    </div>
  );
}

export default function SimulationPage() {
  const { sim, snap, refresh } = useSim();
  const st = snap.stats;
  const light = LIGHT_TEXT[snap.light];

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6">
      {/* ---------- header ---------- */}
      <header className="rounded-lg border border-edge bg-panel px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-50">SPDI · ระบบคัดแยกพัสดุชำรุด</h1>
            <p className="text-sm text-muted">Smart Parcel Defect Inspection · Edge AI (CiRA CORE) + IoT · ระบบจำลอง</p>
          </div>
          <NavTabs />
          <div className="flex items-center gap-4">
            <span className={`rounded-md px-3 py-1.5 text-sm font-semibold ${light.cls}`}>{light.text}</span>
            <Clock />
          </div>
        </div>
        <div className="mt-3 border-t border-edge pt-3">
          <SystemFlow snap={snap} />
        </div>
      </header>

      {!snap.online ? (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <b>อินเทอร์เน็ตหลุด</b> · สายพานและการคัดแยกยังทำงานต่อที่ Edge 100% · ข้อมูลเก็บใน SQLite ก่อน ({snap.queue}/500
          รายการ) แล้วจะซิงค์ขึ้น Cloud เองเมื่อเน็ตกลับมา
        </div>
      ) : null}

      {/* ---------- conveyor + controls ---------- */}
      <section className="grid gap-3 lg:grid-cols-4">
        <div className="overflow-hidden rounded-lg border border-edge bg-panel lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-2 text-sm">
            <span className="font-semibold text-slate-200">สายพานลำเลียง · Line 1</span>
            <span className="font-mono text-muted">
              เวลาจำลอง {formatSimTime(snap.simTime)} · {snap.speed}x · CiRA {snap.framesTotal.toLocaleString()} frames
            </span>
          </div>
          <ConveyorScene sim={sim} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-edge px-4 py-2 text-xs text-muted">
            <span>
              <span className="text-ok">■</span> box_good
            </span>
            <span>
              <span className="text-amber-400">■</span> dent (บุบ)
            </span>
            <span>
              <span className="text-bad">■</span> tear (ฉีกขาด)
            </span>
            <span>กรอบสี = ผลจาก CiRA CORE แต่ละเฟรม · ตัดสินครั้งเดียวที่เส้นตัดสินด้วยการโหวตหลายเฟรม</span>
          </div>
        </div>
        <ControlPanel sim={sim} snap={snap} refresh={refresh} />
      </section>

      {/* ---------- main counters ---------- */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <LastDecision ev={snap.events[0]} />
        <KpiCard size="lg" title="ตรวจแล้ว" subtitle="Total" value={st.total} note={`PASS + REJECT = ${st.pass + st.reject} ✔`} />
        <KpiCard size="lg" title="ผ่าน" subtitle="PASS" value={st.pass} tone="ok" note={`yield ${snap.yieldPct}%`} />
        <KpiCard
          size="lg"
          title="คัดออก"
          subtitle="REJECT"
          value={st.reject}
          tone="bad"
          note={`บุบ ${st.byClass.dent} · ฉีก ${st.byClass.tear} · ${snap.rejectPct}%`}
        />
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard title="ความเร็ว" subtitle="throughput" value={snap.perMin} unit="กล่อง/นาที" />
        <KpiCard
          title="ความแม่นระบบ"
          subtitle="เทียบของจริง"
          value={st.total ? snap.accuracyPct : '—'}
          unit={st.total ? '%' : ''}
          note={`คัดผิด ${st.falseReject} · หลุด ${st.missedDefect}`}
          noteTone={st.missedDefect ? 'bad' : undefined}
        />
        <KpiCard
          title="ความมั่นใจ AI"
          subtitle="เฉลี่ย"
          value={snap.avgConf === null ? '—' : (snap.avgConf * 100).toFixed(1)}
          unit={snap.avgConf === null ? '' : '%'}
        />
        <KpiCard
          title="Cloud sync"
          subtitle={snap.online ? 'online' : 'offline'}
          value={snap.synced}
          unit="รายการ"
          tone={snap.online ? 'neutral' : 'bad'}
          note={snap.queue ? `ค้างใน SQLite ${snap.queue}` : 'ซิงค์ครบ'}
          noteTone={snap.queue && !snap.online ? 'bad' : undefined}
        />
      </section>

      {/* ---------- charts ---------- */}
      <section className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-edge bg-panel p-4 lg:col-span-2">
          <h2 className="mb-2 text-base font-semibold text-slate-200">
            ผลการตรวจทุก 10 วินาที <span className="text-sm font-normal text-muted">· เวลาจำลอง</span>
          </h2>
          <ThroughputChart data={snap.timeline} />
        </div>
        <div className="rounded-lg border border-edge bg-panel p-4">
          <h2 className="mb-2 text-base font-semibold text-slate-200">
            สัดส่วนตาม class <span className="text-sm font-normal text-muted">· CiRA</span>
          </h2>
          <ClassDonut byClass={st.byClass} total={st.total} yieldPct={snap.yieldPct} />
          <div className="mt-2 flex justify-center gap-4 text-sm">
            <span className="text-ok">● ดี {st.byClass.box_good}</span>
            <span className="text-amber-400">● บุบ {st.byClass.dent}</span>
            <span className="text-bad">● ฉีก {st.byClass.tear}</span>
          </div>
        </div>
      </section>

      {/* ---------- logs ---------- */}
      <section className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EventLog events={snap.events} />
        </div>
        <MessageFeed messages={snap.messages} />
      </section>

      <footer className="pb-4 pt-1 text-center text-xs text-muted">
        ระบบจำลองทำงานในเบราว์เซอร์ทั้งหมด (ไม่ต้องใช้ฐานข้อมูล) · ข้อมูลจริงจาก CiRA ดูที่แท็บ “ข้อมูลจริง”
      </footer>
    </main>
  );
}
