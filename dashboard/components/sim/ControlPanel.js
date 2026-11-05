'use client';

import { useEffect, useState } from 'react';
import { addBox, resetSim, setOnline, getSettings, DEFAULT_SETTINGS } from '@/lib/sim/engine';
import { loadSaved, saveSettings, clearSaved } from '@/lib/sim/useSim';

const KEYS = ['speed', 'defectRate', 'failRatio'];
const same = (a, b) => !!a && !!b && KEYS.every((k) => Math.abs((a[k] ?? 0) - (b[k] ?? 0)) < 1e-9);

function SaveBar({ sim, snap, refresh }) {
  const [saved, setSaved] = useState(null); // settings stored in this browser
  const [msg, setMsg] = useState('');
  useEffect(() => setSaved(loadSaved()), []);
  useEffect(() => {
    if (!msg) return undefined;
    const t = setTimeout(() => setMsg(''), 2500);
    return () => clearTimeout(t);
  }, [msg]);

  const current = { speed: snap.speed, defectRate: snap.defectRate, failRatio: sim.failRatio };
  const dirty = !same(current, saved || DEFAULT_SETTINGS);

  const onSave = () => {
    if (saveSettings(sim)) {
      setSaved({ ...getSettings(sim), savedAt: Date.now() });
      setMsg('✓ บันทึกแล้ว');
    } else {
      setMsg('บันทึกไม่ได้ (เบราว์เซอร์บล็อก storage)');
    }
  };
  const onDefault = () => {
    clearSaved(sim);
    setSaved(null);
    refresh();
    setMsg('คืนค่าเริ่มต้นแล้ว');
  };

  return (
    <div className="space-y-2 border-t border-edge pt-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty}
          className={`rounded-md px-3 py-2 text-sm font-bold ${
            dirty ? 'bg-sky-600 text-white hover:bg-sky-500' : 'cursor-default bg-slate-800 text-slate-500'
          }`}
        >
          💾 บันทึกค่า
        </button>
        <button type="button" onClick={onDefault} className="rounded-md bg-slate-700 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-600">
          ค่าเริ่มต้น
        </button>
      </div>
      <div className="min-h-[1.25rem] text-xs" aria-live="polite">
        {msg ? (
          <span className="text-sky-300">{msg}</span>
        ) : dirty ? (
          <span className="text-amber-300">มีค่าที่ยังไม่ได้บันทึก</span>
        ) : saved ? (
          <span className="text-muted">
            ใช้ค่าที่บันทึกไว้ · {new Date(saved.savedAt || Date.now()).toLocaleString('en-GB', { hour12: false })}
          </span>
        ) : (
          <span className="text-muted">ใช้ค่าเริ่มต้น</span>
        )}
      </div>
    </div>
  );
}

function Slider({ label, sub, value, min, max, step, format, onChange }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold text-slate-200">
          {label} {sub ? <span className="font-normal text-muted">{sub}</span> : null}
        </span>
        <span className="font-mono text-slate-100">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-slate-200"
      />
    </label>
  );
}

export default function ControlPanel({ sim, snap, refresh }) {
  const set = (fn) => {
    fn();
    refresh();
  };
  return (
    <div className="space-y-4 rounded-lg border border-edge bg-panel p-4">
      <h2 className="text-base font-semibold text-slate-200">
        แผงควบคุม <span className="text-sm font-normal text-muted">· Control</span>
      </h2>

      <div className="flex items-center justify-between rounded-md border border-edge bg-slate-800/40 px-3 py-2" aria-disabled="true" title="ค่าจากโมเดลที่เทรนแล้ว แก้ไม่ได้">
        <div className="text-sm">
          <div className="font-semibold text-slate-500">ความแม่น AI (CiRA CORE)</div>
          <div className="text-xs text-slate-600">ค่าคงที่จากโมเดล · แก้ไม่ได้</div>
        </div>
        <span className="font-mono text-base font-bold text-slate-500">
          🔒 {Math.round(snap.aiRange.min * 100)}–{Math.round(snap.aiRange.max * 100)}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => set(() => (sim.running = !sim.running))}
          className={`rounded-md px-3 py-2 text-sm font-bold ${
            snap.running ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-green-600 text-white hover:bg-green-500'
          }`}
        >
          {snap.running ? '⏸ หยุด' : '▶ เดินสายพาน'}
        </button>
        <button
          type="button"
          onClick={() => set(() => resetSim(sim))}
          className="rounded-md bg-slate-700 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-600"
        >
          ↺ รีเซ็ต
        </button>
      </div>

      <div>
        <div className="mb-1 text-sm font-semibold text-slate-200">
          ส่งกล่องเข้าสาย <span className="font-normal text-muted">· manual</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => addBox(sim, 'box_good')} className="rounded-md bg-green-600/20 px-2 py-2 text-sm font-semibold text-green-300 hover:bg-green-600/30">
            + ดี
          </button>
          <button type="button" onClick={() => addBox(sim, 'dent')} className="rounded-md bg-amber-500/20 px-2 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/30">
            + บุบ
          </button>
          <button type="button" onClick={() => addBox(sim, 'tear')} className="rounded-md bg-red-600/20 px-2 py-2 text-sm font-semibold text-red-300 hover:bg-red-600/30">
            + ฉีก
          </button>
        </div>
      </div>

      <Slider label="ความเร็ว" sub="speed" value={snap.speed} min={0.5} max={4} step={0.5} format={(v) => `${v}x`} onChange={(v) => set(() => (sim.speed = v))} />
      <Slider label="กล่องเสีย" sub="defect rate" value={snap.defectRate} min={0} max={0.8} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set(() => (sim.defectRate = v))} />

      <div className="flex items-center justify-between rounded-md border border-edge px-3 py-2">
        <div className="text-sm">
          <div className="font-semibold text-slate-200">อินเทอร์เน็ต</div>
          <div className="text-xs text-muted">ปิดเพื่อทดสอบ store-and-forward</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={snap.online}
          onClick={() => set(() => setOnline(sim, !sim.online))}
          className={`rounded-full px-3 py-1.5 text-sm font-bold ${snap.online ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
        >
          {snap.online ? 'ONLINE' : 'OFFLINE'}
        </button>
      </div>

      <SaveBar sim={sim} snap={snap} refresh={refresh} />
    </div>
  );
}
