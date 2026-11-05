'use client';

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CLASSES, CLASS_KEYS, formatSimTime } from '@/lib/sim/engine';

const tooltipStyle = {
  contentStyle: { background: '#161b22', border: '1px solid #262d36', borderRadius: 8, color: '#e2e8f0' },
  labelStyle: { color: '#94a3b8' },
  cursor: { fill: 'rgba(148,163,184,0.08)' },
};

export function ThroughputChart({ data }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="#262d36" vertical={false} />
          <XAxis dataKey="t" tickFormatter={formatSimTime} stroke="#64748b" fontSize={11} tickLine={false} minTickGap={20} />
          <YAxis allowDecimals={false} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip {...tooltipStyle} labelFormatter={(t) => `เวลาจำลอง ${formatSimTime(t)}`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="pass" name="PASS" stackId="a" fill="#22c55e" isAnimationActive={false} />
          <Bar dataKey="reject" name="REJECT" stackId="a" fill="#ef4444" radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ClassDonut({ byClass, total, yieldPct }) {
  const data = total
    ? CLASS_KEYS.map((k) => ({ name: k, value: byClass[k], color: CLASSES[k].color })).filter((d) => d.value > 0)
    : [{ name: 'none', value: 1, color: '#334155' }];
  return (
    <div className="relative h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="85%" stroke="none" isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          {total ? <Tooltip {...tooltipStyle} /> : null}
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-bold text-slate-100">{total ? `${yieldPct}%` : '—'}</span>
        <span className="text-xs text-muted">Yield</span>
      </div>
    </div>
  );
}
