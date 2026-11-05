'use client';

const FILTERS = [
  { key: 'ALL', label: 'All ทั้งหมด' },
  { key: 'PASS', label: 'PASS ดี' },
  { key: 'FAIL', label: 'FAIL เสีย' },
];

const time = (iso) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

export default function EventsTable({ events, filter, onFilter, freshIds, error }) {
  return (
    <div className="rounded-lg border border-edge bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-200">
          Latest inspections <span className="font-normal text-slate-400">· รายการล่าสุด</span>
        </h2>
        <div className="flex gap-1" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => onFilter(f.key)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                filter === f.key ? 'bg-slate-200 text-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {error ? <div className="px-4 py-3 text-sm text-red-300">⚠ {error}</div> : null}
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-panel text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Time</th>
              <th className="px-2 py-2 font-medium">Result</th>
              <th className="px-2 py-2 font-medium">Class</th>
              <th className="px-2 py-2 text-right font-medium">Conf</th>
              <th className="hidden px-2 py-2 text-right font-medium sm:table-cell">Frames</th>
              <th className="hidden px-4 py-2 font-medium md:table-cell">Device</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  ยังไม่มีรายการ · No inspections yet
                </td>
              </tr>
            ) : (
              events.map((e) => {
                const fresh = freshIds.has(e.eventId);
                const fail = e.result === 'FAIL';
                return (
                  <tr
                    key={e.eventId}
                    className={`border-t border-edge/60 ${fresh ? (fail ? 'row-new-fail' : 'row-new') : ''}`}
                  >
                    <td className="px-4 py-2 font-mono text-slate-300">{time(e.ts)}</td>
                    <td className="px-2 py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-bold ${
                          fail ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
                        }`}
                      >
                        {e.result}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-slate-300">{e.className}</td>
                    <td className="px-2 py-2 text-right font-mono text-slate-300">
                      {typeof e.confidence === 'number' ? `${(e.confidence * 100).toFixed(0)}%` : '—'}
                    </td>
                    <td className="hidden px-2 py-2 text-right font-mono text-slate-400 sm:table-cell">
                      {e.framesSeen ?? '—'}
                    </td>
                    <td className="hidden px-4 py-2 text-slate-400 md:table-cell">
                      {e.device}
                      {e.source === 'simulator' ? <span className="ml-1 text-muted">(sim)</span> : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
