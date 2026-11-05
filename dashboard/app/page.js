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
  green: { text: '● Line running', cls: 'bg-green-600/20 text-green-300' },
  yellow: { text: '● Damaged box — rejecting', cls: 'bg-amber-500/20 text-amber-300' },
  red: { text: '● Line stopped', cls: 'bg-red-600/20 text-red-300' },
};

function Clock() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono text-xl tabular-nums text-slate-200 sm:text-2xl">
      {now ? now.toLocaleTimeString('en-GB', { hour12: false }) : '--:--:--'}
    </span>
  );
}

function LastDecision({ ev }) {
  if (!ev) {
    return (
      <div className="col-span-2 flex h-full flex-col justify-center rounded-lg border border-edge bg-panel px-4 py-3 xl:col-span-1">
        <div className="text-base font-semibold text-slate-300">Last box</div>
        <div className="mt-1 font-mono text-4xl font-bold text-muted sm:text-5xl">—</div>
        <div className="mt-1 text-sm text-muted">Waiting for a box to reach the decision line</div>
      </div>
    );
  }
  const reject = ev.result === 'REJECT';
  return (
    <div
      className={`col-span-2 flex h-full items-center gap-3 rounded-lg px-4 py-3 text-white xl:col-span-1 ${
        reject ? 'bg-red-600' : 'bg-green-600'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="text-base font-semibold opacity-90">Last box</div>
        <div className="mt-1 text-4xl font-bold leading-tight sm:text-5xl">{reject ? '✖ REJECT' : '✔ PASS'}</div>
        <div className="mt-1 truncate text-sm opacity-90">
          #{ev.no} · {CLASSES[ev.predicted].label} · {Math.round(ev.conf * 100)}%{ev.reworked ? ' · reworked' : ''}
        </div>
      </div>
      <div className="shrink-0 rounded-md bg-white/15 p-1">
        <BoxThumb truth={ev.truth} seed={ev.seed} size={60} reworked={ev.reworked > 0} />
      </div>
    </div>
  );
}

export default function SimulationPage() {
  const { sim, snap, refresh } = useSim();
  const st = snap.stats;
  const light = LIGHT_TEXT[snap.light];

  return (
    <main className="mx-auto max-w-7xl space-y-3 px-3 py-3 sm:space-y-4 sm:px-6 sm:py-4">
      {/* ---------- header ---------- */}
      <header className="rounded-lg border border-edge bg-panel px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-50 sm:text-xl">SPDI · Parcel Defect Inspection</h1>
            <p className="text-sm text-muted">Edge AI (CiRA CORE) + IoT · digital twin</p>
          </div>
          <NavTabs />
          <div className="flex items-center justify-between gap-3 sm:justify-start sm:gap-4">
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
          <b>Internet offline.</b> The line keeps sorting at the edge. Results are stored in SQLite ({snap.queue}/500) and
          sync to the cloud automatically when the connection is back.
        </div>
      ) : null}

      {/* ---------- conveyor + controls ---------- */}
      <section className="grid gap-3 lg:grid-cols-4">
        <div className="min-w-0 overflow-hidden rounded-lg border border-edge bg-panel lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-edge px-4 py-2 text-sm">
            <span className="font-semibold text-slate-200">Conveyor · Line 1</span>
            <span className="font-mono text-xs text-muted sm:text-sm">
              {formatSimTime(snap.simTime)} · {snap.speed}x · {snap.framesTotal.toLocaleString()} frames
            </span>
          </div>
          {/* on phones the scene keeps a readable size and scrolls sideways */}
          <div className="overflow-x-auto overscroll-x-contain">
            <div className="min-w-[760px] sm:min-w-0">
              <ConveyorScene sim={sim} />
            </div>
          </div>
          <div className="px-4 pt-1 text-xs text-muted sm:hidden">← swipe to see the whole line →</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-edge px-4 py-2 text-xs text-muted">
            <span>
              <span className="text-ok">■</span> box_good
            </span>
            <span>
              <span className="text-amber-400">■</span> dent (crushed)
            </span>
            <span>
              <span className="text-bad">■</span> tear (torn)
            </span>
            <span className="hidden sm:inline">Box colour frame = CiRA CORE result per frame · decided once at the line by multi-frame vote</span>
          </div>
        </div>
        <ControlPanel sim={sim} snap={snap} refresh={refresh} />
      </section>

      {/* ---------- main counters ---------- */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <LastDecision ev={snap.events[0]} />
        <KpiCard size="lg" title="Inspections" subtitle="incl. re-checks" value={st.total} note={`PASS + REJECT = ${st.pass + st.reject} ✔`} />
        <KpiCard size="lg" title="Passed" subtitle="PASS" value={st.pass} tone="ok" note={`yield ${snap.yieldPct}%`} />
        <KpiCard
          size="lg"
          title="Rejected"
          subtitle="REJECT"
          value={st.reject}
          tone="bad"
          note={`dent ${st.byClass.dent} · tear ${st.byClass.tear} · ${snap.rejectPct}%`}
        />
      </section>

      {/* ---------- line balance: where every physical unit is right now ---------- */}
      <section className="rounded-lg border border-edge bg-panel p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-200">
            Line balance <span className="text-sm font-normal text-muted">· every numbered box is in exactly one place</span>
          </h2>
          <span className={`rounded-md px-2.5 py-1 text-sm font-semibold ${snap.balanceOk ? 'bg-green-600/20 text-green-300' : 'bg-red-600/20 text-red-300'}`}>
            {snap.balanceOk ? '✔ balanced' : '✖ mismatch'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard title="Boxes in" subtitle="new units" value={snap.unitsIn} />
          <KpiCard
            title="Shipped"
            value={snap.shipped}
            tone="ok"
            note={snap.shippedRecent.length ? `last #${snap.shippedRecent[0].no}${snap.shippedRecent[0].reworked ? ' (reworked)' : ''}` : 'none yet'}
          />
          <KpiCard title="Dented bin" value={snap.bins.dent} tone={snap.bins.dent ? 'bad' : 'neutral'} note="waiting to be fixed" />
          <KpiCard title="Torn bin" value={snap.bins.tear} tone={snap.bins.tear ? 'bad' : 'neutral'} note="waiting to be repacked" />
          <KpiCard title="On the belt" value={snap.onBelt + snap.returning} note={snap.returning ? `${snap.returning} reworked queued` : 'in transit'} />
          <KpiCard title="Reworked" subtitle="sent back" value={snap.stats.reworked} />
        </div>
        <p className="mt-3 font-mono text-xs text-muted">
          {snap.unitsIn} in = {snap.shipped} shipped + {snap.bins.dent} dented + {snap.bins.tear} torn + {snap.onBelt + snap.returning} on belt
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard title="Throughput" value={snap.perMin} unit="boxes/min" />
        <KpiCard title="Pusher strokes" subtitle="ESP32" value={snap.esp32Cmds} />
        <KpiCard
          title="Avg confidence"
          value={snap.avgConf === null ? '—' : (snap.avgConf * 100).toFixed(1)}
          unit={snap.avgConf === null ? '' : '%'}
        />
        <KpiCard
          title="Cloud sync"
          subtitle={snap.online ? 'online' : 'offline'}
          value={snap.synced}
          unit="records"
          tone={snap.online ? 'neutral' : 'bad'}
          note={snap.queue ? `${snap.queue} waiting in SQLite` : 'all synced'}
          noteTone={snap.queue && !snap.online ? 'bad' : undefined}
        />
      </section>

      {/* ---------- charts ---------- */}
      <section className="grid gap-3 lg:grid-cols-3">
        <div className="min-w-0 rounded-lg border border-edge bg-panel p-4 lg:col-span-2">
          <h2 className="mb-2 text-base font-semibold text-slate-200">
            Results every 10 s <span className="text-sm font-normal text-muted">· sim time</span>
          </h2>
          <ThroughputChart data={snap.timeline} />
        </div>
        <div className="min-w-0 rounded-lg border border-edge bg-panel p-4">
          <h2 className="mb-2 text-base font-semibold text-slate-200">
            By class <span className="text-sm font-normal text-muted">· CiRA</span>
          </h2>
          <ClassDonut byClass={st.byClass} total={st.total} yieldPct={snap.yieldPct} />
          <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
            <span className="text-ok">● good {st.byClass.box_good}</span>
            <span className="text-amber-400">● dent {st.byClass.dent}</span>
            <span className="text-bad">● tear {st.byClass.tear}</span>
          </div>
        </div>
      </section>

      {/* ---------- logs ---------- */}
      <section className="grid gap-3 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <EventLog events={snap.events} />
        </div>
        <MessageFeed messages={snap.messages} />
      </section>

      <footer className="pb-4 pt-1 text-center text-xs text-muted">
        The simulation runs entirely in your browser (no database needed) · real CiRA data is on the “Live” tab
      </footer>
    </main>
  );
}
