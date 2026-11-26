'use client';

import ConveyorScene from '@/components/sim/ConveyorScene';
import { useLiveBelt } from '@/lib/sim/useLiveBelt';

/** Conveyor view on the Live page: one box per real inspection saved in MongoDB. */
export default function LiveBelt({ line = 'line1' }) {
  const { sim, info } = useLiveBelt(line);
  const onBelt = sim.boxes.length;
  return (
    <section className="rounded-lg border border-emerald-700/50 bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-2.5">
        <h2 className="text-base font-semibold text-slate-200">
          Live conveyor{' '}
          <span className="text-sm font-normal text-muted">· one box per real inspection from CiRA CORE</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded bg-emerald-600/20 px-2 py-1 font-semibold text-emerald-300">● LIVE DATA</span>
          <span className="rounded bg-slate-800 px-2 py-1 text-slate-300">received {info.received}</span>
          <span className="rounded bg-slate-800 px-2 py-1 text-slate-300">coming {info.waiting + sim.liveQueue.length}</span>
          <span className="rounded bg-slate-800 px-2 py-1 text-slate-300">on belt {onBelt}</span>
        </div>
      </div>
      <ConveyorScene sim={sim} live />
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-edge px-4 py-2 text-xs text-muted">
        <span>A box enters 2–5 s after CiRA CORE detected it and the bridge counted it.</span>
        <span>Result is the real decision: PASS goes to the exit, FAIL is pushed into the BAD bin.</span>
        {info.error ? <span className="text-bad">Cannot load events: {info.error}</span> : null}
        {info.received === 0 && !info.error ? <span>Waiting for new inspections (older ones are not replayed).</span> : null}
      </div>
    </section>
  );
}
