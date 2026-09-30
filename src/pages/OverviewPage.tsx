import React, { useState } from 'react';
import { 
  Box, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Activity, 
  Cpu,
  ArrowRight,
  Layers,
  Video
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { InspectionVisualizer } from '../components/InspectionVisualizer';
import { ConveyorSimulation } from '../components/ConveyorSimulation';
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

  const [inspectionViewMode, setInspectionViewMode] = useState<'SIM_3D' | 'CAMERA_2D'>('SIM_3D');

  const isReject = latestParcel.status === 'REJECT';

  const kpis = [
    { title: 'Parcels Inspected', value: '1,248', trend: '+8.4% today', color: 'sky' as const, icon: Box },
    { title: 'PASS Rate', value: '94.2%', trend: '+0.6% improvement', color: 'emerald' as const, icon: CheckCircle2 },
    { title: 'REJECT Rate', value: '5.8%', trend: '-0.4% defect drop', color: 'red' as const, icon: XCircle },
    { title: 'Avg Inspection Time', value: '1.84 s', trend: 'Optimal < 2.0s', color: 'purple' as const, icon: Clock },
    { title: 'Damaged Parcels', value: '72', trend: 'Quarantined', color: 'amber' as const, icon: AlertTriangle },
    { title: 'AI Confidence', value: '93.8%', trend: 'TensorRT INT8', color: 'sky' as const, icon: Cpu },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-300 max-w-[1920px] mx-auto">
      
      {/* 1. Page Header */}
      <PageHeader
        title="Operations Control Dashboard"
        description="Real-time parcel integrity monitoring, edge vision telemetry & sorter decision control"
        badge="SORT-01"
        badgeType="sky"
      />

      {/* 2. Critical Alert Bar (Compact & Visually Distinct) */}
      {isReject && (
        <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-md animate-in fade-in">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="font-bold text-red-400 font-sans tracking-wide uppercase">
                  {latestParcel.damageType === 'WEIGHT_ANOMALY' ? 'WEIGHT ANOMALY DETECTED' : 'SURFACE DAMAGE REJECT DETECTED'}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.2 rounded bg-red-500/20 text-red-300 border border-red-500/30 shrink-0">
                  CRITICAL
                </span>
              </div>
              <p className="text-[#94A3B8] font-sans text-xs mt-0.5 truncate">
                Tracking: <strong className="font-mono text-white">{latestParcel.trackingNumber}</strong> • Reason: <strong className="text-red-300 font-sans">{latestParcel.rejectReason || latestParcel.damageType}</strong> ({latestParcel.weightDifference}% mass diff)
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              const el = document.getElementById('decision-engine-card');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-3.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 font-mono text-xs font-bold shrink-0 self-start sm:self-center flex items-center space-x-1 transition-colors"
          >
            <span>View Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. KPI Summary Section */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
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

      {/* 4 & 5. Live Inspection + Decision Engine (Dual Stage Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side — Dual Camera / 3D Conveyor Simulation (7 Cols) */}
        <div className="lg:col-span-7">
          <SectionCard 
            title="Live Inspection Tunnel & Conveyor" 
            icon={Activity}
            headerActions={
              <div className="flex items-center bg-[#0F172A] border border-[#26354A] rounded-lg p-1 space-x-1 text-xs font-mono">
                <button
                  onClick={() => setInspectionViewMode('SIM_3D')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center space-x-1 transition ${
                    inspectionViewMode === 'SIM_3D' 
                      ? 'bg-sky-500 text-slate-950 shadow' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>3D Conveyor</span>
                </button>
                <button
                  onClick={() => setInspectionViewMode('CAMERA_2D')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center space-x-1 transition ${
                    inspectionViewMode === 'CAMERA_2D' 
                      ? 'bg-sky-500 text-slate-950 shadow' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Video className="w-3 h-3" />
                  <span>Dual Feeds</span>
                </button>
              </div>
            }
          >
            {inspectionViewMode === 'SIM_3D' ? (
              <ConveyorSimulation 
                conveyorSpeed={systemStatus.conveyorSpeed > 0 ? 1 : 1.5}
                parcelStatus={latestParcel.status}
                simulationMode="AUTO"
                currentParcel={latestParcel}
              />
            ) : (
              <InspectionVisualizer parcel={latestParcel} />
            )}
          </SectionCard>
        </div>

        {/* Right Side — Decision Engine (5 Cols) */}
        <div className="lg:col-span-5 space-y-6" id="decision-engine-card">
          
          {/* Decision Banner Card */}
          <div className={`p-5 rounded-xl border shadow-xl transition-all duration-300 ${
            isReject 
              ? 'bg-red-950/70 border-red-500/80 text-red-400' 
              : 'bg-emerald-950/70 border-emerald-500/80 text-emerald-400'
          }`}>
            <div className="flex items-center justify-between font-sans text-xs uppercase opacity-90">
              <span className="font-semibold tracking-wide text-slate-300">Active Decision Status</span>
              <span className="font-mono font-bold px-2 py-0.5 rounded bg-black/40 text-slate-300 border border-slate-700 text-[10px]">
                Rules v2.4
              </span>
            </div>

            <div className="flex items-center space-x-3 my-3">
              <StatusBadge status={latestParcel.status} size="lg" />
              <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white truncate">
                {latestParcel.trackingNumber}
              </span>
            </div>

            <p className="text-xs font-sans text-slate-200 leading-relaxed">
              {isReject 
                ? `REJECT TRIGGERED: ${latestParcel.rejectReason || latestParcel.damageType}` 
                : 'Condition normal & weight verified within ±5% tolerance. Authorized for immediate dispatch.'}
            </p>
          </div>

          {/* Decision Telemetry Breakdown */}
          <SectionCard title="Decision Analysis Details" icon={Cpu}>
            <div className="space-y-2.5 font-sans text-xs text-slate-300">
              <div className="flex justify-between border-b border-[#26354A] pb-2">
                <span className="text-[#94A3B8]">Tracking Number:</span>
                <span className="text-sky-400 font-mono font-bold">{latestParcel.trackingNumber}</span>
              </div>

              <div className="flex justify-between border-b border-[#26354A] pb-2">
                <span className="text-[#94A3B8]">AI Damage Result:</span>
                <span className={`font-semibold ${isReject ? 'text-red-400' : 'text-emerald-400'}`}>
                  {latestParcel.damageType}
                </span>
              </div>

              <div className="flex justify-between border-b border-[#26354A] pb-2">
                <span className="text-[#94A3B8]">AI Confidence:</span>
                <span className="text-sky-400 font-mono font-bold">{latestParcel.aiConfidence}%</span>
              </div>

              <div className="flex justify-between border-b border-[#26354A] pb-2">
                <span className="text-[#94A3B8]">Measured Weight:</span>
                <span className="text-white font-mono font-bold">{latestParcel.weight} kg</span>
              </div>

              <div className="flex justify-between border-b border-[#26354A] pb-2">
                <span className="text-[#94A3B8]">Expected Weight:</span>
                <span className="text-slate-300 font-mono">{latestParcel.expectedWeight} kg</span>
              </div>

              <div className="flex justify-between border-b border-[#26354A] pb-2">
                <span className="text-[#94A3B8]">Weight Difference:</span>
                <span className={`font-mono font-bold ${
                  Math.abs(latestParcel.weightDifference) > 5 ? 'text-red-400' : 'text-emerald-400'
                }`}>
                  {latestParcel.weightDifference}%
                </span>
              </div>

              <div className="flex justify-between border-b border-[#26354A] pb-2">
                <span className="text-[#94A3B8]">Actuator Status:</span>
                <span className={`font-semibold ${latestParcel.actuatorTriggered ? 'text-red-400' : 'text-emerald-400'}`}>
                  {latestParcel.actuatorTriggered ? 'Actuator Fired (Chute)' : 'Passed (Conveyor Line)'}
                </span>
              </div>

              <div className="flex justify-between pt-0.5">
                <span className="text-[#94A3B8]">Evidence Status:</span>
                <span className="text-emerald-400 font-mono font-bold">SAVED (SQLite)</span>
              </div>
            </div>
          </SectionCard>

        </div>

      </div>

      {/* 6. System Health Hardware Grid */}
      <SectionCard title="System Telemetry & Hardware Nodes" icon={Activity}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 text-xs font-sans">
          <div className="bg-[#0F172A] p-2.5 rounded-lg border border-[#26354A] flex justify-between items-center">
            <span className="text-[#94A3B8]">Conveyor Motor:</span>
            <span className="text-emerald-400 font-semibold font-mono">RUNNING</span>
          </div>
          <div className="bg-[#0F172A] p-2.5 rounded-lg border border-[#26354A] flex justify-between items-center">
            <span className="text-[#94A3B8]">CiRA CORE AI:</span>
            <span className="text-sky-400 font-semibold font-mono">ONLINE</span>
          </div>
          <div className="bg-[#0F172A] p-2.5 rounded-lg border border-[#26354A] flex justify-between items-center">
            <span className="text-[#94A3B8]">SQLite DB:</span>
            <span className="text-emerald-400 font-semibold font-mono">CONNECTED</span>
          </div>
          <div className="bg-[#0F172A] p-2.5 rounded-lg border border-[#26354A] flex justify-between items-center">
            <span className="text-[#94A3B8]">MQTT Broker:</span>
            <span className={systemStatus.isOfflineMode ? 'text-amber-400 font-semibold font-mono' : 'text-purple-400 font-semibold font-mono'}>
              {systemStatus.isOfflineMode ? 'DISCONNECTED' : 'CONNECTED'}
            </span>
          </div>
          <div className="bg-[#0F172A] p-2.5 rounded-lg border border-[#26354A] flex justify-between items-center">
            <span className="text-[#94A3B8]">Network Link:</span>
            <span className={systemStatus.isOfflineMode ? 'text-amber-400 font-semibold font-mono' : 'text-emerald-400 font-semibold font-mono'}>
              {systemStatus.isOfflineMode ? 'OFFLINE' : 'ONLINE'}
            </span>
          </div>
          <div className="bg-[#0F172A] p-2.5 rounded-lg border border-[#26354A] flex justify-between items-center">
            <span className="text-[#94A3B8]">Webcams (2x):</span>
            <span className="text-emerald-400 font-semibold font-mono">ACTIVE</span>
          </div>
          <div className="bg-[#0F172A] p-2.5 rounded-lg border border-[#26354A] flex justify-between items-center">
            <span className="text-[#94A3B8]">IR Sensor:</span>
            <span className="text-emerald-400 font-semibold font-mono">{systemStatus.irSensorStatus}</span>
          </div>
          <div className="bg-[#0F172A] p-2.5 rounded-lg border border-[#26354A] flex justify-between items-center">
            <span className="text-[#94A3B8]">Load Cell:</span>
            <span className="text-emerald-400 font-semibold font-mono">{systemStatus.loadCellStatus}</span>
          </div>
          <div className="bg-[#0F172A] p-2.5 rounded-lg border border-[#26354A] flex justify-between items-center">
            <span className="text-[#94A3B8]">Actuator PLC:</span>
            <span className="text-emerald-400 font-semibold font-mono">{systemStatus.actuatorStatus}</span>
          </div>
          <div className="bg-[#0F172A] p-2.5 rounded-lg border border-[#26354A] flex justify-between items-center">
            <span className="text-[#94A3B8]">Tower Light:</span>
            <span className={`font-semibold font-mono ${
              systemStatus.towerLight === 'GREEN' ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {systemStatus.towerLight}
            </span>
          </div>
        </div>
      </SectionCard>

      {/* 7. Real-Time Inspection Sequence Timeline */}
      <SectionCard title="Real-Time Sensor & AI Inspection Sequence Timeline" icon={Clock}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {timelineEvents.map((ev) => (
            <div
              key={ev.id}
              className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                ev.type === 'danger'
                  ? 'bg-red-950/40 border-red-500/40 text-red-300'
                  : ev.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-[#0F172A] border-[#26354A] text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] text-[#94A3B8] font-mono">
                <span className="font-bold text-sky-400">{ev.source}</span>
                <span>{ev.timestamp}</span>
              </div>
              <p className="text-xs font-sans leading-relaxed">{ev.message}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 8. Developer / Demo Simulation Toolbar (Secondary) */}
      <div className="bg-[#0F172A] border border-[#26354A] p-3.5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2.5">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0">
            SIMULATION MODE
          </span>
          <span className="text-[#94A3B8] font-sans text-xs">
            Trigger instant test scans to evaluate Decision Engine rules & sorter
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <button
            onClick={() => generateParcel('NORMAL')}
            className="px-2.5 py-1 rounded bg-[#162235] hover:bg-[#26354A] text-emerald-400 border border-emerald-500/40 font-bold transition-colors flex items-center space-x-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Sim PASS</span>
          </button>

          <button
            onClick={() => generateParcel('TEAR')}
            className="px-2.5 py-1 rounded bg-[#162235] hover:bg-[#26354A] text-red-400 border border-red-500/40 font-bold transition-colors flex items-center space-x-1"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Sim TEAR</span>
          </button>

          <button
            onClick={() => generateParcel('DENT')}
            className="px-2.5 py-1 rounded bg-[#162235] hover:bg-[#26354A] text-amber-400 border border-amber-500/40 font-bold transition-colors flex items-center space-x-1"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Sim DENT</span>
          </button>

          <button
            onClick={() => generateParcel('WEIGHT_ANOMALY')}
            className="px-2.5 py-1 rounded bg-[#162235] hover:bg-[#26354A] text-purple-400 border border-purple-500/40 font-bold transition-colors flex items-center space-x-1"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Weight Anomaly</span>
          </button>
        </div>
      </div>

    </div>
  );
};


