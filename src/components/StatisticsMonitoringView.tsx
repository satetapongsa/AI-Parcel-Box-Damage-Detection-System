import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  Legend 
} from 'recharts';
import { 
  TrendingUp, 
  PieChart as PieIcon, 
  Activity, 
  AlertOctagon, 
  CheckCircle2, 
  XCircle,
  Clock
} from 'lucide-react';
import type { DbParcelInspection } from '../lib/database/neonClient';
import type { ParcelRecord } from '../types';

interface StatisticsMonitoringViewProps {
  dbRecords: DbParcelInspection[];
  liveParcels: ParcelRecord[];
  totalInspected: number;
  passCount: number;
  rejectCount: number;
}

export const StatisticsMonitoringView: React.FC<StatisticsMonitoringViewProps> = ({
  dbRecords,
  liveParcels,
  totalInspected,
  passCount,
  rejectCount
}) => {
  // 1. Calculate Defect Distribution
  const sourceRecords = dbRecords.length > 0 ? dbRecords : liveParcels.map(p => ({
    damage_type: p.damageType,
    status: p.status,
    created_at: p.timestamp,
    confidence: p.aiConfidence,
    weight_kg: p.weight
  }));

  const dentCount = sourceRecords.filter(r => r.damage_type === 'DENT').length;
  const tearCount = sourceRecords.filter(r => r.damage_type === 'TEAR').length;
  const wetCount = sourceRecords.filter(r => r.damage_type === 'WATER_STAIN').length;
  const weightCount = sourceRecords.filter(r => r.damage_type === 'WEIGHT_ANOMALY').length;
  const normalCount = sourceRecords.filter(r => r.damage_type === 'NORMAL' || r.status === 'PASS').length;

  const defectPieData = [
    { name: 'Normal / Intact', value: normalCount, color: '#10B981' },
    { name: 'Corner Dent', value: dentCount, color: '#F59E0B' },
    { name: 'Seam Tear', value: tearCount, color: '#EF4444' },
    { name: 'Moisture / Wet', value: wetCount, color: '#06B6D4' },
    { name: 'Weight Anomaly', value: weightCount, color: '#A855F7' }
  ].filter(d => d.value > 0);

  // 2. Compute Hourly / Timeline Trend (Group by recent time buckets)
  const timelineDataMap: Record<string, { time: string; pass: number; reject: number; total: number }> = {};
  
  sourceRecords.slice(0, 40).reverse().forEach((r, idx) => {
    const timeKey = r.created_at ? new Date(r.created_at).toLocaleTimeString('en-US', {
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }) : `T-${idx}`;

    if (!timelineDataMap[timeKey]) {
      timelineDataMap[timeKey] = { time: timeKey, pass: 0, reject: 0, total: 0 };
    }
    if (r.status === 'PASS') {
      timelineDataMap[timeKey].pass += 1;
    } else {
      timelineDataMap[timeKey].reject += 1;
    }
    timelineDataMap[timeKey].total += 1;
  });

  const timelineData = Object.values(timelineDataMap).slice(-12);

  // 3. Defect Category Comparison Bar Chart Data
  const defectBarData = [
    { category: 'Dent', count: dentCount, fill: '#F59E0B' },
    { category: 'Tear', count: tearCount, fill: '#EF4444' },
    { category: 'Moisture', count: wetCount, fill: '#06B6D4' },
    { category: 'Weight', count: weightCount, fill: '#A855F7' }
  ];

  const passRate = totalInspected > 0 ? ((passCount / totalInspected) * 100).toFixed(1) : '100.0';
  const rejectRate = totalInspected > 0 ? ((rejectCount / totalInspected) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Overview Stat Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0B1526] border border-slate-800 p-5 rounded-xl shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-mono text-slate-400">Total Throughput</span>
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white font-mono">{totalInspected}</span>
            <span className="text-xs text-slate-400">packages</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Live conveyor throughput tally</span>
        </div>

        <div className="bg-[#0B1526] border border-slate-800 p-5 rounded-xl shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-mono text-emerald-400">Delivery Pass Rate</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-emerald-400 font-mono">{passRate}%</span>
            <span className="text-xs text-slate-400">({passCount} pass)</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Intact deliverable boxes</span>
        </div>

        <div className="bg-[#0B1526] border border-slate-800 p-5 rounded-xl shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-mono text-red-400">Diverted Defect Rate</span>
            <XCircle className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-red-400 font-mono">{rejectRate}%</span>
            <span className="text-xs text-slate-400">({rejectCount} eject)</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Diverted via pneumatic pusher</span>
        </div>

        <div className="bg-[#0B1526] border border-slate-800 p-5 rounded-xl shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-mono text-amber-400">Primary Defect</span>
            <AlertOctagon className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-amber-300 font-mono truncate">
              {dentCount >= tearCount ? 'CORNER DENT' : 'SEAM TEAR'}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Most frequent classified flaw</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Real-Time Throughput & Divert Flow Line Chart (7 cols) */}
        <div className="lg:col-span-7 bg-[#0B1526] border border-slate-800 rounded-xl p-5 shadow flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white font-mono uppercase">
                Real-Time Package Flow & Divert Trend
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400 flex items-center space-x-1">
              <Clock className="w-3 h-3 mr-1" /> Recent Inspection Samples
            </span>
          </div>

          <div className="h-[280px] w-full font-mono text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="time" stroke="#64748B" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748B" tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#070D1B', 
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#F8FAFC'
                  }} 
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line 
                  type="monotone" 
                  dataKey="pass" 
                  name="Passed Packages" 
                  stroke="#10B981" 
                  strokeWidth={2.5} 
                  dot={{ r: 3 }} 
                  activeDot={{ r: 5 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="reject" 
                  name="Diverted Damaged" 
                  stroke="#EF4444" 
                  strokeWidth={2.5} 
                  dot={{ r: 3 }} 
                  activeDot={{ r: 5 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Defect Breakdown Pie / Donut Chart (5 cols) */}
        <div className="lg:col-span-5 bg-[#0B1526] border border-slate-800 rounded-xl p-5 shadow flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <PieIcon className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white font-mono uppercase">
                Defect Classification Ratio
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              CiRA Core Output
            </span>
          </div>

          <div className="h-[280px] w-full font-mono text-xs flex items-center justify-center">
            {defectPieData.length === 0 ? (
              <span className="text-slate-500">No defect data recorded yet.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={defectPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {defectPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#070D1B', 
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#F8FAFC'
                    }} 
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Chart 3: Defect Counts by Category Bar Chart */}
      <div className="bg-[#0B1526] border border-slate-800 rounded-xl p-5 shadow">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <AlertOctagon className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase">
              Defect Category Breakdown (Tally by Flaw Type)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Diverted by Pneumatic Pusher
          </span>
        </div>

        <div className="h-[220px] w-full font-mono text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={defectBarData} barSize={44}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="category" stroke="#94A3B8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#070D1B', 
                  borderColor: '#334155',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#F8FAFC'
                }} 
              />
              <Bar dataKey="count" name="Identified Instances" radius={[6, 6, 0, 0]}>
                {defectBarData.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
