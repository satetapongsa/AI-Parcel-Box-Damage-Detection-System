import React from 'react';
import { 
  BarChart3, 
  Activity, 
  Award
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line
} from 'recharts';
import { 
  HOURLY_REJECT_RATE, 
  DAMAGE_CATEGORY_PARETO
} from '../data/mockData';

export const AnalyticsPage: React.FC = () => {
  const passVsReject = [
    { name: 'PASS', value: 1176, color: '#22c55e' },
    { name: 'REJECT', value: 72, color: '#ef4444' },
  ];

  const damageClasses = [
    { name: 'Dent / Collapse', value: 32, color: '#f59e0b' },
    { name: 'Tear / Open Seam', value: 24, color: '#ef4444' },
    { name: 'Water Stain', value: 11, color: '#38bdf8' },
    { name: 'Weight Anomaly', value: 5, color: '#a855f7' },
  ];

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#101A2B] border border-[#26344A] p-5 rounded-xl shadow-md">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2 font-mono">
            <BarChart3 className="w-6 h-6 text-sky-400" />
            <span>Industrial Quality Analytics & Defect Pareto Analysis</span>
          </h1>
          <p className="text-xs text-[#94A3B8] font-mono mt-1">
            Industry 4.0 defect distribution, OEE metrics & weight anomaly telemetry
          </p>
        </div>

        <div className="text-xs font-mono text-slate-300 bg-[#172235] px-3.5 py-2 rounded-lg border border-[#26344A] flex items-center space-x-2">
          <Activity className="w-4 h-4 text-sky-400" />
          <span>Evaluation Range: Active Shift</span>
        </div>
      </div>

      {/* OEE / OPERATIONAL PERFORMANCE SECTION */}
      <div className="bg-[#101A2B] border border-[#26344A] p-5 rounded-xl shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-[#26344A] pb-3">
          <h3 className="text-xs font-bold text-white uppercase font-mono flex items-center space-x-2">
            <Award className="w-4 h-4 text-emerald-400" />
            <span>Overall Equipment Effectiveness (OEE Metrics)</span>
          </h3>
          <span className="text-xs font-mono text-emerald-400 font-bold">
            Target OEE: &gt; 85.0%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          <div className="bg-[#172235] p-4 rounded-xl border border-[#26344A]">
            <span className="text-[#94A3B8] text-xs block">Availability</span>
            <span className="text-2xl font-bold text-sky-400 mt-1 block">96.8%</span>
            <span className="text-[10px] text-slate-500">Conveyor Uptime</span>
          </div>

          <div className="bg-[#172235] p-4 rounded-xl border border-[#26344A]">
            <span className="text-[#94A3B8] text-xs block">Performance</span>
            <span className="text-2xl font-bold text-purple-400 mt-1 block">94.1%</span>
            <span className="text-[10px] text-slate-500">Belt Speed Rate</span>
          </div>

          <div className="bg-[#172235] p-4 rounded-xl border border-[#26344A]">
            <span className="text-[#94A3B8] text-xs block">Quality Rate</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block">98.2%</span>
            <span className="text-[10px] text-slate-500">Defect Accuracy</span>
          </div>

          <div className="bg-[#172235] p-4 rounded-xl border border-sky-500/40 bg-sky-500/10">
            <span className="text-sky-300 text-xs block font-bold">OVERALL OEE SCORE</span>
            <span className="text-3xl font-black text-white mt-1 block">89.7%</span>
            <span className="text-[10px] text-emerald-400 font-bold">EXCELLENT INDUSTRIAL CLASS</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: PASS vs REJECT (Donut Chart) */}
        <div className="bg-[#101A2B] border border-[#26344A] p-5 rounded-xl shadow-md space-y-3">
          <h3 className="text-xs font-bold text-white uppercase font-mono">PASS vs REJECT Share</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={passVsReject} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value">
                  {passVsReject.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#07111F', borderColor: '#26344A', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Damage Type Distribution */}
        <div className="bg-[#101A2B] border border-[#26344A] p-5 rounded-xl shadow-md space-y-3">
          <h3 className="text-xs font-bold text-white uppercase font-mono">Damage Type Distribution</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={damageClasses}>
                <CartesianGrid strokeDasharray="3 3" stroke="#172235" />
                <XAxis dataKey="name" stroke="#94A3B8" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <YAxis stroke="#94A3B8" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#07111F', borderColor: '#26344A', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {damageClasses.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Reject Rate by Hour */}
        <div className="bg-[#101A2B] border border-[#26344A] p-5 rounded-xl shadow-md space-y-3">
          <h3 className="text-xs font-bold text-white uppercase font-mono">Reject Rate by Hour (%)</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={HOURLY_REJECT_RATE}>
                <CartesianGrid strokeDasharray="3 3" stroke="#172235" />
                <XAxis dataKey="time" stroke="#94A3B8" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <YAxis stroke="#94A3B8" tick={{ fontSize: 11, fill: '#94A3B8' }} domain={[0, 10]} />
                <Tooltip contentStyle={{ backgroundColor: '#07111F', borderColor: '#26344A', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                <Line type="monotone" dataKey="rate" stroke="#ef4444" strokeWidth={3} dot={{ fill: '#ef4444' }} name="Reject Rate %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Pareto Analysis Chart */}
        <div className="bg-[#101A2B] border border-[#26344A] p-5 rounded-xl shadow-md space-y-3">
          <h3 className="text-xs font-bold text-white uppercase font-mono">Defect Pareto Analysis (Cumulative Contribution)</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DAMAGE_CATEGORY_PARETO}>
                <CartesianGrid strokeDasharray="3 3" stroke="#172235" />
                <XAxis dataKey="category" stroke="#94A3B8" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <YAxis stroke="#94A3B8" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#07111F', borderColor: '#26344A', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Defect Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};
