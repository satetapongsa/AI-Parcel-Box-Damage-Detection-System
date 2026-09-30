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
import { PageHeader } from '../components/common/PageHeader';
import { SectionCard } from '../components/common/SectionCard';
import { MetricCard } from '../components/common/MetricCard';

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
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-300 max-w-[1920px] mx-auto">
      
      {/* Enterprise Page Header */}
      <PageHeader
        title="Industrial Quality Analytics & Pareto Portal"
        description="Industry 4.0 defect distribution, OEE metrics & weight anomaly telemetry"
        badge="SHIFT EVALUATION"
        badgeType="sky"
        actions={
          <div className="text-xs font-mono text-slate-300 bg-[#0F172A] px-3.5 py-1.5 rounded-lg border border-[#26354A] flex items-center space-x-2">
            <Activity className="w-4 h-4 text-sky-400" />
            <span>Range: Active Shift (12h)</span>
          </div>
        }
      />

      {/* OEE / OPERATIONAL PERFORMANCE SECTION */}
      <SectionCard 
        title="Overall Equipment Effectiveness (OEE Metrics)" 
        icon={Award}
        headerActions={<span className="text-xs font-mono text-emerald-400 font-bold">Target OEE: &gt; 85.0%</span>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          <MetricCard
            title="Availability Rate"
            value="96.8%"
            subtext="Conveyor Belt Uptime"
            trend="+0.4%"
            trendType="positive"
            color="sky"
          />

          <MetricCard
            title="Performance Rate"
            value="94.1%"
            subtext="Target Belt Velocity (1.5 m/s)"
            trend="Nominal"
            trendType="neutral"
            color="purple"
          />

          <MetricCard
            title="Quality Rate"
            value="98.2%"
            subtext="AI Precision & Precision Rate"
            trend="+0.8%"
            trendType="positive"
            color="emerald"
          />

          <div className="bg-[#162235] p-5 rounded-xl border border-sky-500/40 shadow-md flex flex-col justify-between">
            <span className="text-sky-400 text-xs uppercase font-bold tracking-tight">OVERALL OEE SCORE</span>
            <div className="my-2">
              <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">89.7%</span>
            </div>
            <span className="text-[11px] text-emerald-400 font-mono font-bold">EXCELLENT INDUSTRIAL CLASS</span>
          </div>
        </div>
      </SectionCard>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: PASS vs REJECT (Donut Chart) */}
        <SectionCard title="PASS vs REJECT Volume Distribution" icon={BarChart3}>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={passVsReject} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                  {passVsReject.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#07111F', borderColor: '#26354A', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Chart 2: Damage Type Distribution */}
        <SectionCard title="Damage Classification Breakdown" icon={BarChart3}>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={damageClasses}>
                <CartesianGrid strokeDasharray="3 3" stroke="#172235" />
                <XAxis dataKey="name" stroke="#94A3B8" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <YAxis stroke="#94A3B8" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#07111F', borderColor: '#26354A', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {damageClasses.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Chart 3: Reject Rate by Hour */}
        <SectionCard title="Hourly Reject Rate Timeline (%)" icon={BarChart3}>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={HOURLY_REJECT_RATE}>
                <CartesianGrid strokeDasharray="3 3" stroke="#172235" />
                <XAxis dataKey="time" stroke="#94A3B8" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <YAxis stroke="#94A3B8" tick={{ fontSize: 11, fill: '#94A3B8' }} domain={[0, 10]} />
                <Tooltip contentStyle={{ backgroundColor: '#07111F', borderColor: '#26354A', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                <Line type="monotone" dataKey="rate" stroke="#ef4444" strokeWidth={3} dot={{ fill: '#ef4444' }} name="Reject Rate %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Chart 4: Pareto Analysis Chart */}
        <SectionCard title="Defect Pareto Analysis (Root Cause Contribution)" icon={BarChart3}>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DAMAGE_CATEGORY_PARETO}>
                <CartesianGrid strokeDasharray="3 3" stroke="#172235" />
                <XAxis dataKey="category" stroke="#94A3B8" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <YAxis stroke="#94A3B8" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#07111F', borderColor: '#26354A', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Defect Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

      </div>

    </div>
  );
};

