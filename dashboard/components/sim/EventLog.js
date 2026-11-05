'use client';

import { useState } from 'react';
import { BoxThumb } from './BoxGlyph';
import { CLASSES } from '@/lib/sim/engine';

const FILTERS = [
  { key: 'ALL', label: 'ทั้งหมด' },
  { key: 'PASS', label: 'PASS' },
  { key: 'REJECT', label: 'REJECT' },
];

const time = (ms) => new Date(ms).toLocaleTimeString('en-GB', { hour12: false });

export default function EventLog({ events }) {
  const [filter, setFilter] = useState('ALL');
  const rows = filter === 'ALL' ? events : events.filter((e) => e.result === filter);
  return (
    <div className="rounded-lg border border-edge bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3">
        <h2 className="text-base font-semibold text-slate-200">
          ประวัติการตรวจ <span className="text-sm font-normal text-muted">· proof of condition</span>
        </h2>
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-md px-3 py-1 text-xs font-semibold ${
                filter === f.key ? 'bg-slate-200 text-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-panel text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">ภาพ</th>
              <th className="px-2 py-2 font-medium">Tracking</th>
              <th className="px-2 py-2 font-medium">ผล</th>
              <th className="px-2 py-2 font-medium">AI บอกว่า</th>
              <th className="hidden px-2 py-2 text-right font-medium sm:table-cell">Conf</th>
              <th className="hidden px-2 py-2 text-right font-medium md:table-cell">น้ำหนัก</th>
              <th className="hidden px-4 py-2 font-medium md:table-cell">เวลา</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  ยังไม่มีรายการ
                </td>
              </tr>
            ) : (
              rows.map((e) => (
                <tr key={e.eventId} className={`border-t border-edge/60 ${e.result === 'REJECT' ? 'row-new-fail' : 'row-new'}`}>
                  <td className="px-4 py-1.5">
                    <BoxThumb truth={e.truth} seed={e.seed} />
                  </td>
                  <td className="px-2 py-1.5 font-mono text-xs text-slate-300">{e.tracking}</td>
                  <td className="px-2 py-1.5">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold ${
                        e.result === 'REJECT' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
                      }`}
                    >
                      {e.result}
                    </span>
                    {!e.correct ? (
                      <span className="ml-1 text-xs text-amber-300" title={`ของจริงคือ ${CLASSES[e.truth].th}`}>
                        ⚠ ผิด
                      </span>
                    ) : null}
                  </td>
                  <td className="px-2 py-1.5" style={{ color: CLASSES[e.predicted].color }}>
                    {e.predicted} <span className="text-xs text-muted">({CLASSES[e.predicted].th})</span>
                  </td>
                  <td className="hidden px-2 py-1.5 text-right font-mono text-slate-300 sm:table-cell">{Math.round(e.conf * 100)}%</td>
                  <td className="hidden px-2 py-1.5 text-right font-mono text-slate-400 md:table-cell">{e.weight.toFixed(2)} kg</td>
                  <td className="hidden px-4 py-1.5 font-mono text-slate-400 md:table-cell">{time(e.at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
