'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const GOOD = '#22c55e';
const BAD = '#ef4444';

const hhmm = (t) =>
  new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

const tooltipStyle = {
  contentStyle: { background: '#161b22', border: '1px solid #262d36', borderRadius: 8, color: '#e2e8f0' },
  labelStyle: { color: '#94a3b8' },
  cursor: { fill: 'rgba(148,163,184,0.08)' },
};

export function PerMinuteChart({ data }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="#262d36" vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={hhmm}
            stroke="#64748b"
            fontSize={11}
            minTickGap={24}
            tickLine={false}
          />
          <YAxis allowDecimals={false} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip {...tooltipStyle} labelFormatter={(t) => hhmm(t)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="good" name="Good (PASS)" stackId="a" fill={GOOD} isAnimationActive={false} />
          <Bar dataKey="damaged" name="Damaged (FAIL)" stackId="a" fill={BAD} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PassFailDonut({ good, damaged, passRate }) {
  const total = good + damaged;
  const data =
    total > 0
      ? [
          { name: 'PASS', value: good, color: GOOD },
          { name: 'FAIL', value: damaged, color: BAD },
        ]
      : [{ name: 'No data', value: 1, color: '#334155' }];
  return (
    <div className="relative h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="85%"
            paddingAngle={total > 0 && good > 0 && damaged > 0 ? 2 : 0}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          {total > 0 ? <Tooltip {...tooltipStyle} /> : null}
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-bold text-slate-100">{total > 0 ? `${passRate}%` : '—'}</span>
        <span className="text-xs text-slate-400">Yield (PASS)</span>
      </div>
    </div>
  );
}
