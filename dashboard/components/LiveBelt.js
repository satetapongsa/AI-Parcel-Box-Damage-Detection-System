'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import ConveyorScene from '@/components/belt/ConveyorScene';
import { useLiveBelt } from '@/lib/belt/useLiveBelt';

// three.js needs the browser: load the 3D view only on the client
const Conveyor3D = dynamic(() => import('@/components/belt/Conveyor3D'), {
  ssr: false,
  loading: () => <div className="flex aspect-[2.2] w-full items-center justify-center bg-[#1a1f26] text-sm text-muted">Loading 3D view…</div>,
});

/** Conveyor view on the Live page: one box per real inspection saved in MongoDB. */
export default function LiveBelt({ line = 'line1' }) {
  const { sim, info } = useLiveBelt(line);
  const [view, setView] = useState('3d');
  const noWebGL = useCallback(() => setView('2d'), []);
  const onBelt = sim.boxes.length;
  return (
    <section className="rounded-lg border border-emerald-700/50 bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-2.5">
        <h2 className="text-base font-semibold text-slate-200">
          Live conveyor{' '}
          <span className="text-sm font-normal text-muted">· one box per real inspection from CiRA CORE</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex overflow-hidden rounded border border-edge" role="group" aria-label="Conveyor view">
            {['3d', '2d'].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`px-2 py-1 font-semibold ${view === v ? 'bg-sky-700 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                {v.toUpperCase()}
              </button>
            ))}
          </div>
          <span className="rounded bg-emerald-600/20 px-2 py-1 font-semibold text-emerald-300">● LIVE DATA</span>
          <span className="rounded bg-slate-800 px-2 py-1 text-slate-300">received {info.received}</span>
          <span className="rounded bg-slate-800 px-2 py-1 text-slate-300">coming {info.waiting + sim.liveQueue.length}</span>
          <span className="rounded bg-slate-800 px-2 py-1 text-slate-300">on belt {onBelt}</span>
        </div>
      </div>
      {view === '3d' ? <Conveyor3D sim={sim} line={line} onNoWebGL={noWebGL} /> : <ConveyorScene sim={sim} live />}
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-edge px-4 py-2 text-xs text-muted">
        <span>A box enters 2–5 s after CiRA CORE detected it and the bridge counted it, at the size it measured.</span>
        {view === '3d' ? <span>Drag to turn · scroll to zoom · double-click to reset the view.</span> : null}
        <span>Result is the real decision: PASS goes to the exit, FAIL is pushed into the BAD bin.</span>
        {info.error ? <span className="text-bad">Cannot load events: {info.error}</span> : null}
        {info.received === 0 && !info.error ? <span>Waiting for new inspections (older ones are not replayed).</span> : null}
      </div>
    </section>
  );
}
