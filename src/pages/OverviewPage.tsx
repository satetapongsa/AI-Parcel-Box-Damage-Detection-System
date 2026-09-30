import React from 'react';
import { 
  Box, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Zap, 
  Activity, 
  Cpu
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { InspectionVisualizer } from '../components/InspectionVisualizer';
import { PageHeader } from '../components/common/PageHeader';
import { MetricCard } from '../components/common/MetricCard';
import { SectionCard } from '../components/common/SectionCard';
import { StatusBadge } from '../components/common/StatusBadge';

export const OverviewPage: React.FC = () => {
  const { 
    latestParcel, 
    systemStatus, 
    timelineEvents, 
    generateParcel 
  } = useSimulation();

  const isReject = latestParcel.status === 'REJECT';

  const kpis = [
    { title: 'Parcels Inspected', value: '1,248', trend: '+8.4% today', color: 'sky' as const, icon: Box },
    { title: 'PASS Rate', value: '94.2%', trend: '+0.6% improvement', color: 'emerald' as const, icon: CheckCircle2 },
    { title: 'REJECT Rate', value: '5.8%', trend: '-0.4% defect drop', color: 'red' as const, icon: XCircle },
    { title: 'Avg Inspection Time', value: '1.84 s', trend: 'Optimal < 2.0s', color: 'purple' as const, icon: Clock },
    { title: 'Damaged Parcels', value: '72', trend: 'Quarantined', color: 'amber' as const, icon: AlertTriangle },
    { title: 'Avg AI Confidence', value: '93.8%', trend: 'TensorRT INT8', color: 'sky' as const, icon: Cpu },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-300 max-w-[1920px] mx-auto">
      
      {/* Enterprise Page Header */}
      <PageHeader
        title="Operations Control Dashboard"
        description="Real-time parcel integrity monitoring, edge vision telemetry & sorter decision control"
        badge="STATION SORT-01"
        badgeType="sky"
      />

      {/* KPI Section */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {kpis.map((kpi, i) => (
          <MetricCard
            key={i}
            title={kpi.title}
            value={kpi.value}
            trend={kpi.trend}
            color={kpi.color}
            icon={kpi.icon}
          />
        ))}
      </div>

      {/* Simulation Dispatch Bar */}
      <SectionCard className="border-sky-500/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 shrink-0">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Live Sorter Dispatch Simulation
              </h3>
              <p className="text-xs text-[#94A3B8] font-sans mt-0.5">
                Trigger instant parcel scans to evaluate Decision Engine rules & pneumatic sorter
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <button
              onClick={() => generateParcel('NORMAL')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Simulate PASS</span>
            </button>

            <button
              onClick={() => generateParcel('TEAR')}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow flex items-center space-x-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Simulate TEAR</span>
            </button>

            <button
              onClick={() => generateParcel('DENT')}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all shadow flex items-center space-x-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Simulate DENT</span>
            </button>

            <button
              onClick={() => generateParcel('WEIGHT_ANOMALY')}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow flex items-center space-x-1.5"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Weight Anomaly</span>
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Main Dual Stage: Inspection Visualizer + Decision Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side — Dual Camera Preview (7 Cols) */}
        <div className="lg:col-span-7">
          <SectionCard title="Live Camera Vision Inspection" icon={Activity}>
            <InspectionVisualizer parcel={latestParcel} />
          </SectionCard>
        </div>

        {/* Right Side — Parcel Decision Card (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* PARCEL DECISION CARD */}
          <div className={`p-5 rounded-xl border shadow-xl transition-all duration-300 ${
            isReject 
              ? 'bg-red-950/70 border-red-500/80 text-red-400' 
              : 'bg-emerald-950/70 border-emerald-500/80 text-emerald-400'
          }`}>
            <div className="flex items-center justify-between font-mono text-xs uppercase opacity-90">
              <span>Parcel Decision Engine</span>
              <span className="font-bold px-2 py-0.5 rounded bg-black/40 text-slate-300 border border-slate-700">
                Rule Engine v2.4
              </span>
            </div>

            <div className="flex items-center space-x-3 my-3">
              <StatusBadge status={latestParcel.status} size="lg" />
              <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white">
                {latestParcel.trackingNumber}
              </span>
            </div>

            <p className="text-xs font-sans text-slate-200 leading-relaxed">
              {isReject 
                ? `REJECT TRIGGERED: ${latestParcel.rejectReason || latestParcel.damageType}` 
                : 'Condition normal & weight verified within ±5% tolerance. Authorized for immediate dispatch.'}
            </p>
          </div>

          {/* Detailed Decision Metrics Breakdown */}
          <SectionCard title="Inspection Telemetry & Decision Analysis" icon={Cpu}>
            <div className="space-y-2.5 font-mono text-xs text-slate-300">
              <div className="flex justify-between border-b border-[#26354A] pb-2">
                <span className="text-[#94A3B8]">Tracking ID:</span>
                <span className="text-sky-400 font-bold">{latestParcel.trackingNumber}</span>
              </div>

              <div className="flex justify-between border-b border-[#26354A] pb-2">
                <span className="text-[#94A3B8]">AI Damage Result:</span>
                <span className={`font-bold ${isReject ? 'text-red-400' : 'text-emerald-400'}`}>
                  {latestParcel.damageType}
                </span>
              </div>

              <div className="flex justify-between border-b border-[#26354A] pb-2">
                <span className="text-[#94A3B8]">AI Model Confidence:</span>
                <span className="text-sky-400 font-bold">{latestParcel.aiConfidence}% (Threshold: 85%)</span>
              </div>

              <div className="flex justify-between border-b border-[#26354A] pb-2">
                <span className="text-[#94A3B8]">Measured Weight:</span>
                <span className="text-white font-bold">{latestParcel.weight} kg</span>
              </div>

              <div className="flex justify-between border-b border-[#26354A] pb-2">
                <span className="text-[#94A3B8]">Expected Weight:</span>
                <span className="text-slate-300">{latestParcel.expectedWeight} kg</span>
              </div>

              <div className="flex justify-between border-b border-[#26354A] pb-2">
                <span className="text-[#94A3B8]">Weight Difference:</span>
                <span className={`font-bold ${
                  Math.abs(latestParcel.weightDifference) > 5 ? 'text-red-400' : 'text-emerald-400'
                }`}>
                  {latestParcel.weightDifference}% (Tolerance: ±5%)
                </span>
              </div>

              <div className="flex justify-between pt-1">
                <span className="text-[#94A3B8]">Pneumatic Sorter Action:</span>
                <span className={`font-bold ${latestParcel.actuatorTriggered ? 'text-red-400' : 'text-emerald-400'}`}>
                  {latestParcel.actuatorTriggered ? 'Actuator Fired (Reject Chute)' : 'Passed (Conveyor Line)'}
                </span>
              </div>
            </div>
          </SectionCard>

        </div>

      </div>

      {/* Live System Hardware Status Grid */}
      <SectionCard title="System Telemetry & Hardware Nodes" icon={Activity}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 text-xs font-mono">
          <div className="bg-[#0F172A] p-2.5 rounded-lg border border-[#26354A] flex justify-between items-center">
            <span className="text-[#94A3B8]">Conveyor Motor:</span>
            <span className="text-emerald-400 font-bold">RUNNING</span>
          </div>
          <div className="bg-[#0F172A] p-2.5 rounded-lg border border-[#26354A] flex justify-between items-center">
            <span className="text-[#94A3B8]">CiRA CORE AI:</span>
            <span className="text-sky-400 font-bold">ONLINE</span>
          </div>
          <div className="bg-[#0F172A] p-2.5 rounded-lg border border-[#26354A] flex justify-between items-center">
            <span className="text-[#94A3B8]">SQLite DB:</span>
            <span className="text-emerald-400 font-bold">CONNECTED</span>
          </div>
          <div className="bg-[#0F172A] p-2.5 rounded-lg border border-[#26354A] flex justify-between items-center">
            <span className="text-[#94A3B8]">MQTT Broker:</span>
            <span className={systemStatus.isOfflineMode ? 'text-amber-400 font-bold' : 'text-purple-400 font-bold'}>
              {systemStatus.isOfflineMode ? 'DISCONNECTED' : 'CONNECTED'}
            </span>
          </div>
          <div className="bg-[#0F172A] p-2.5 rounded-lg border border-[#26354A] flex justify-between items-center">
            <span className="text-[#94A3B8]">Network Link:</span>
            <span className={systemStatus.isOfflineMode ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
              {systemStatus.isOfflineMode ? 'OFFLINE' : 'ONLINE'}
            </span>
          </div>
          <div className="bg-[#0F172A] p-2.5 rounded-lg border border-[#26354A] flex justify-between items-center">
            <span className="text-[#94A3B8]">Webcams (2x):</span>
            <span className="text-emerald-400 font-bold">ACTIVE</span>
          </div>
          <div className="bg-[#0F172A] p-2.5 rounded-lg border border-[#26354A] flex justify-between items-center">
            <span className="text-[#94A3B8]">IR Sensor:</span>
            <span className="text-emerald-400 font-bold">{systemStatus.irSensorStatus}</span>
          </div>
          <div className="bg-[#0F172A] p-2.5 rounded-lg border border-[#26354A] flex justify-between items-center">
            <span className="text-[#94A3B8]">Load Cell:</span>
            <span className="text-emerald-400 font-bold">{systemStatus.loadCellStatus}</span>
          </div>
          <div className="bg-[#0F172A] p-2.5 rounded-lg border border-[#26354A] flex justify-between items-center">
            <span className="text-[#94A3B8]">Actuator PLC:</span>
            <span className="text-emerald-400 font-bold">{systemStatus.actuatorStatus}</span>
          </div>
          <div className="bg-[#0F172A] p-2.5 rounded-lg border border-[#26354A] flex justify-between items-center">
            <span className="text-[#94A3B8]">Tower Light:</span>
            <span className={`font-bold ${
              systemStatus.towerLight === 'GREEN' ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {systemStatus.towerLight}
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Real-Time Inspection Event Timeline */}
      <SectionCard title="Real-Time Sensor & AI Inspection Event Sequence" icon={Clock}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {timelineEvents.map((ev) => (
            <div
              key={ev.id}
              className={`p-3.5 rounded-xl border font-mono text-xs space-y-1.5 ${
                ev.type === 'danger'
                  ? 'bg-red-950/40 border-red-500/40 text-red-300'
                  : ev.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-[#0F172A] border-[#26354A] text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                <span className="font-bold text-sky-400">{ev.source}</span>
                <span>{ev.timestamp}</span>
              </div>
              <p className="text-xs font-sans leading-relaxed">{ev.message}</p>
            </div>
          ))}
        </div>
      </SectionCard>

    </div>
  );
};

