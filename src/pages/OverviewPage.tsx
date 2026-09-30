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

export const OverviewPage: React.FC = () => {
  const { 
    latestParcel, 
    systemStatus, 
    timelineEvents, 
    generateParcel 
  } = useSimulation();

  const isReject = latestParcel.status === 'REJECT';

  const kpis = [
    { title: 'Parcels Inspected', value: '1,248', trend: '+8.4% today', color: 'text-sky-400', icon: Box },
    { title: 'PASS Rate', value: '94.2%', trend: '+0.6% improvement', color: 'text-emerald-400', icon: CheckCircle2 },
    { title: 'REJECT Rate', value: '5.8%', trend: '-0.4% defect drop', color: 'text-red-400', icon: XCircle },
    { title: 'Avg Inspection Time', value: '1.84 s', trend: 'Optimal < 2.0s', color: 'text-purple-400', icon: Clock },
    { title: 'Damaged Parcels', value: '72', trend: 'Quarantined', color: 'text-amber-400', icon: AlertTriangle },
    { title: 'Avg AI Confidence', value: '93.8%', trend: 'TensorRT INT8', color: 'text-[#38BDF8]', icon: Cpu },
  ];

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      
      {/* Simulation Trigger Bar */}
      <div className="bg-[#101A2B] border border-[#26344A] p-4 rounded-xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <Zap className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Live Sorter Dispatch Simulation
            </h3>
            <p className="text-[11px] text-[#94A3B8] font-mono">
              Trigger instant parcel scans to evaluate Decision Engine rules & pneumatic sorter
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <button
            onClick={() => generateParcel('NORMAL')}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md flex items-center space-x-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Generate PASS Parcel</span>
          </button>

          <button
            onClick={() => generateParcel('TEAR')}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-md flex items-center space-x-1.5"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Generate TEAR</span>
          </button>

          <button
            onClick={() => generateParcel('DENT')}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all shadow-md flex items-center space-x-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Generate DENT</span>
          </button>

          <button
            onClick={() => generateParcel('WEIGHT_ANOMALY')}
            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-md flex items-center space-x-1.5"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Weight Anomaly</span>
          </button>
        </div>
      </div>

      {/* 6 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="bg-[#101A2B] border border-[#26344A] p-4 rounded-xl shadow-md transition-all hover:translate-y-[-2px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#94A3B8] tracking-tight">{kpi.title}</span>
                <Icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <div className={`text-2xl font-bold font-mono tracking-tight mt-2.5 ${kpi.color}`}>
                {kpi.value}
              </div>
              <div className="text-[10px] font-mono text-[#94A3B8] mt-1">
                {kpi.trend}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live System Status Section */}
      <div className="bg-[#101A2B] border border-[#26344A] p-5 rounded-xl shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-[#26344A] pb-3">
          <div className="flex items-center space-x-2 font-mono">
            <Activity className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-bold text-white tracking-tight uppercase">
              Inspection Station: <span className="text-sky-400">SORT-01</span>
            </h3>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-emerald-400 font-bold">STATION RUNNING</span>
          </div>
        </div>

        {/* Component Health Telemetry Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs font-mono">
          <div className="bg-[#172235] p-2.5 rounded-lg border border-[#26344A] flex justify-between items-center">
            <span className="text-[#94A3B8]">Conveyor:</span>
            <span className="text-emerald-400 font-bold">ACTIVE</span>
          </div>
          <div className="bg-[#172235] p-2.5 rounded-lg border border-[#26344A] flex justify-between items-center">
            <span className="text-[#94A3B8]">AI Engine:</span>
            <span className="text-sky-400 font-bold">ONLINE</span>
          </div>
          <div className="bg-[#172235] p-2.5 rounded-lg border border-[#26344A] flex justify-between items-center">
            <span className="text-[#94A3B8]">Database:</span>
            <span className="text-emerald-400 font-bold">CONNECTED</span>
          </div>
          <div className="bg-[#172235] p-2.5 rounded-lg border border-[#26344A] flex justify-between items-center">
            <span className="text-[#94A3B8]">MQTT Broker:</span>
            <span className={systemStatus.isOfflineMode ? 'text-amber-400 font-bold' : 'text-purple-400 font-bold'}>
              {systemStatus.isOfflineMode ? 'DISCONNECTED' : 'CONNECTED'}
            </span>
          </div>
          <div className="bg-[#172235] p-2.5 rounded-lg border border-[#26344A] flex justify-between items-center">
            <span className="text-[#94A3B8]">Internet:</span>
            <span className={systemStatus.isOfflineMode ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
              {systemStatus.isOfflineMode ? 'OFFLINE' : 'ONLINE'}
            </span>
          </div>
          <div className="bg-[#172235] p-2.5 rounded-lg border border-[#26344A] flex justify-between items-center">
            <span className="text-[#94A3B8]">Webcams:</span>
            <span className="text-emerald-400 font-bold">2 / 2 ONLINE</span>
          </div>
          <div className="bg-[#172235] p-2.5 rounded-lg border border-[#26344A] flex justify-between items-center">
            <span className="text-[#94A3B8]">IR Breakbeam:</span>
            <span className="text-emerald-400 font-bold">{systemStatus.irSensorStatus}</span>
          </div>
          <div className="bg-[#172235] p-2.5 rounded-lg border border-[#26344A] flex justify-between items-center">
            <span className="text-[#94A3B8]">Load Cell:</span>
            <span className="text-emerald-400 font-bold">{systemStatus.loadCellStatus}</span>
          </div>
          <div className="bg-[#172235] p-2.5 rounded-lg border border-[#26344A] flex justify-between items-center">
            <span className="text-[#94A3B8]">Reject Cylinder:</span>
            <span className="text-emerald-400 font-bold">{systemStatus.actuatorStatus}</span>
          </div>
          <div className="bg-[#172235] p-2.5 rounded-lg border border-[#26344A] flex justify-between items-center">
            <span className="text-[#94A3B8]">Tower Light:</span>
            <span className={`font-bold ${
              systemStatus.towerLight === 'GREEN' ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {systemStatus.towerLight}
            </span>
          </div>
        </div>
      </div>

      {/* Main Dual Stage: Inspection Visualizer + Decision Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side — Dual Camera Preview (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#101A2B] border border-[#26344A] p-4 rounded-xl shadow-md">
            <InspectionVisualizer parcel={latestParcel} />
          </div>
        </div>

        {/* Right Side — Parcel Decision Card (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* PARCEL DECISION CARD (HIGH VISIBILITY) */}
          <div className={`p-5 rounded-xl border shadow-2xl transition-all duration-300 ${
            isReject 
              ? 'bg-red-950/90 border-red-500 text-red-400' 
              : 'bg-emerald-950/90 border-emerald-500 text-emerald-400'
          }`}>
            <div className="flex items-center justify-between font-mono text-xs uppercase opacity-90">
              <span>Parcel Inspection Decision</span>
              <span className="font-bold px-2 py-0.5 rounded bg-black/40">
                Rule Engine v2.4
              </span>
            </div>

            <h1 className="text-4xl font-black font-mono tracking-tight my-2 drop-shadow">
              {isReject ? 'REJECT' : 'PASS'}
            </h1>

            <p className="text-xs font-semibold text-slate-200">
              {isReject 
                ? `REJECT TRIGGERED: ${latestParcel.rejectReason || latestParcel.damageType}` 
                : 'Condition normal & weight verified within ±5% tolerance. Authorized for immediate dispatch.'}
            </p>
          </div>

          {/* Detailed Decision Metrics Breakdown */}
          <div className="bg-[#101A2B] border border-[#26344A] p-5 rounded-xl shadow-md space-y-3 font-mono text-xs">
            <h3 className="text-xs font-bold text-white uppercase border-b border-[#26344A] pb-2">
              Decision Analysis Details
            </h3>

            <div className="space-y-2 text-slate-300">
              <div className="flex justify-between border-b border-[#26344A] py-1">
                <span className="text-[#94A3B8]">Tracking ID:</span>
                <span className="text-sky-400 font-bold">{latestParcel.trackingNumber}</span>
              </div>

              <div className="flex justify-between border-b border-[#26344A] py-1">
                <span className="text-[#94A3B8]">AI Damage Result:</span>
                <span className={`font-bold ${isReject ? 'text-red-400' : 'text-emerald-400'}`}>
                  {latestParcel.damageType}
                </span>
              </div>

              <div className="flex justify-between border-b border-[#26344A] py-1">
                <span className="text-[#94A3B8]">AI Model Confidence:</span>
                <span className="text-sky-400 font-bold">{latestParcel.aiConfidence}% (Threshold: 85%)</span>
              </div>

              <div className="flex justify-between border-b border-[#26344A] py-1">
                <span className="text-[#94A3B8]">Measured Weight:</span>
                <span className="text-white font-bold">{latestParcel.weight} kg</span>
              </div>

              <div className="flex justify-between border-b border-[#26344A] py-1">
                <span className="text-[#94A3B8]">Expected Weight:</span>
                <span className="text-slate-300">{latestParcel.expectedWeight} kg</span>
              </div>

              <div className="flex justify-between border-b border-[#26344A] py-1">
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
                  {latestParcel.actuatorTriggered ? 'Pneumatic Cylinder Triggered' : 'No Action (Conveyor Passed)'}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Real-Time Inspection Event Timeline */}
      <div className="bg-[#101A2B] border border-[#26344A] p-5 rounded-xl shadow-md space-y-3">
        <h3 className="text-xs font-bold text-white uppercase font-mono border-b border-[#26344A] pb-2 flex items-center space-x-2">
          <Clock className="w-4 h-4 text-sky-400" />
          <span>Real-Time Sensor & AI Inspection Sequence Timeline</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {timelineEvents.map((ev) => (
            <div
              key={ev.id}
              className={`p-3 rounded-lg border font-mono text-xs space-y-1 ${
                ev.type === 'danger'
                  ? 'bg-red-950/40 border-red-500/40 text-red-300'
                  : ev.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-[#172235] border-[#26344A] text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-[#94A3B8]">
                <span className="font-bold text-sky-400">{ev.source}</span>
                <span>{ev.timestamp}</span>
              </div>
              <p className="text-xs font-medium leading-relaxed">{ev.message}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
