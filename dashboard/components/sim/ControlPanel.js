'use client';

import { useEffect, useRef, useState } from 'react';
import { addBox, resetSim, setOnline } from '@/lib/sim/engine';
import { saveSettings } from '@/lib/sim/useSim';

function Slider({ label, hint, value, min, max, step, format, onChange, accent }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold text-slate-200">
          {label} {hint ? <span className="font-normal text-muted">{hint}</span> : null}
        </span>
        <span className="font-mono text-base text-slate-100">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-6 w-full cursor-pointer"
        style={{ accentColor: accent }}
      />
    </label>
  );
}

export default function ControlPanel({ sim, snap, refresh }) {
  const [savedNote, setSavedNote] = useState('');
  const timer = useRef(null);

  // auto-save: every slider change is stored in this browser (debounced)
  const change = (fn) => {
    fn();
    refresh();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSavedNote(saveSettings(sim) ? 'Saved' : 'Could not save (storage blocked)');
    }, 300);
  };
  useEffect(() => {
    if (!savedNote) return undefined;
    const t = setTimeout(() => setSavedNote(''), 1800);
    return () => clearTimeout(t);
  }, [savedNote]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const act = (fn) => {
    fn();
    refresh();
  };

  return (
    <div className="space-y-4 rounded-lg border border-edge bg-panel p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-slate-200">Control panel</h2>
        <span className="text-xs text-muted" aria-live="polite">
          {savedNote ? <span className="text-sky-300">✓ {savedNote}</span> : 'Settings save automatically'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => act(() => (sim.running = !sim.running))}
          className={`rounded-md px-3 py-2.5 text-sm font-bold ${
            snap.running ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-green-600 text-white hover:bg-green-500'
          }`}
        >
          {snap.running ? '⏸ Stop belt' : '▶ Start belt'}
        </button>
        <button
          type="button"
          onClick={() => act(() => resetSim(sim))}
          className="rounded-md bg-slate-700 px-3 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-600"
        >
          ↺ Reset counters
        </button>
      </div>

      <div>
        <div className="mb-1 text-sm font-semibold text-slate-200">
          Add a box <span className="font-normal text-muted">(manual)</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => addBox(sim, 'box_good')} className="rounded-md bg-green-600/20 px-2 py-2.5 text-sm font-semibold text-green-300 hover:bg-green-600/30">
            + Good
          </button>
          <button type="button" onClick={() => addBox(sim, 'dent')} className="rounded-md bg-amber-500/20 px-2 py-2.5 text-sm font-semibold text-amber-300 hover:bg-amber-500/30">
            + Dented
          </button>
          <button type="button" onClick={() => addBox(sim, 'tear')} className="rounded-md bg-red-600/20 px-2 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-600/30">
            + Torn
          </button>
        </div>
      </div>

      <Slider
        label="Belt speed"
        value={snap.speed}
        min={0.5}
        max={4}
        step={0.5}
        format={(v) => `${v}x`}
        accent="#cbd5e1"
        onChange={(v) => change(() => (sim.speed = v))}
      />
      <Slider
        label="Torn boxes"
        hint="(damaged)"
        value={snap.tearRate}
        min={0}
        max={0.5}
        step={0.05}
        format={(v) => `${Math.round(v * 100)}%`}
        accent="#ef4444"
        onChange={(v) => change(() => (sim.tearRate = v))}
      />
      <Slider
        label="Dented boxes"
        hint="(crushed)"
        value={snap.dentRate}
        min={0}
        max={0.5}
        step={0.05}
        format={(v) => `${Math.round(v * 100)}%`}
        accent="#f59e0b"
        onChange={(v) => change(() => (sim.dentRate = v))}
      />

      <div className="flex items-center justify-between gap-3 rounded-md border border-edge px-3 py-2">
        <div className="text-sm">
          <div className="font-semibold text-slate-200">Internet</div>
          <div className="text-xs text-muted">Turn off to test store-and-forward</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={snap.online}
          onClick={() => act(() => setOnline(sim, !sim.online))}
          className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-bold ${snap.online ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
        >
          {snap.online ? 'ONLINE' : 'OFFLINE'}
        </button>
      </div>
    </div>
  );
}
