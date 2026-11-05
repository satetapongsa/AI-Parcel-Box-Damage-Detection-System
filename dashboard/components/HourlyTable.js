'use client';

const hh = (t) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

export default function HourlyTable({ hourly }) {
  const rows = (hourly || []).filter((h) => h.total > 0).reverse();
  return (
    <div className="rounded-lg border border-edge bg-panel">
      <div className="border-b border-edge px-4 py-3 text-sm font-semibold text-slate-200">
        Hourly summary <span className="font-normal text-slate-400">· สรุปรายชั่วโมง (24 ชม.)</span>
      </div>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-panel text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Hour</th>
              <th className="px-2 py-2 text-right font-medium">Total</th>
              <th className="px-2 py-2 text-right font-medium">PASS</th>
              <th className="px-2 py-2 text-right font-medium">FAIL</th>
              <th className="px-4 py-2 text-right font-medium">Yield</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  ยังไม่มีข้อมูล · No data
                </td>
              </tr>
            ) : (
              rows.map((h) => (
                <tr key={h.t} className="border-t border-edge/60 font-mono">
                  <td className="px-4 py-2 text-slate-300">{hh(h.t)}</td>
                  <td className="px-2 py-2 text-right text-slate-200">{h.total}</td>
                  <td className="px-2 py-2 text-right text-green-400">{h.good}</td>
                  <td className="px-2 py-2 text-right text-red-400">{h.damaged}</td>
                  <td className="px-4 py-2 text-right text-slate-300">{h.yield}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
