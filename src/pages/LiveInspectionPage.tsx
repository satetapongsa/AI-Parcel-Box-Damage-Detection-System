import React from 'react';
import { 
  Activity,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Droplets
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { InspectionVisualizer } from '../components/InspectionVisualizer';
import { PageHeader } from '../components/common/PageHeader';
import { SectionCard } from '../components/common/SectionCard';
import { StatusBadge } from '../components/common/StatusBadge';

export const LiveInspectionPage: React.FC = () => {
  const { 
    latestParcel, 
    systemStatus, 
    generateParcel,
    dataSourceMode
  } = useSimulation();

  const isReject = latestParcel.status === 'REJECT';

  const pipelineSteps = [
    { label: 'IR SENSOR', status: '✓', detail: 'Triggered' },
    { label: 'CAMERA CAPTURE', status: '✓', detail: 'Dual 1080p' },
    { label: 'AI INFERENCE', status: '✓', detail: `${latestParcel.aiConfidence}%` },
    { label: 'OCR / BARCODE', status: '✓', detail: latestParcel.trackingNumber },
    { label: 'WEIGHT CHECK', status: '✓', detail: `${latestParcel.weight} kg` },
    { label: 'DECISION ENGINE', status: isReject ? 'REJECT' : 'PASS', detail: latestParcel.status },
    { label: 'ACTUATOR CYLINDER', status: latestParcel.actuatorTriggered ? 'TRIGGERED' : 'IDLE', detail: latestParcel.actuatorTriggered ? 'REJECTED' : 'PASSED' },
    { label: 'EVIDENCE DB', status: 'SAVED', detail: 'SQLite Local' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-300 max-w-[1920px] mx-auto">
      
      {/* Enterprise Page Header */}
      <PageHeader
        title="Live Vision Inspection Station"
        description={`Active mode: ${dataSourceMode === 'LIVE_EDGE' ? 'LIVE EDGE (CiRA CORE MQTT Active)' : 'Simulated Frontend Engine'} • Station SORT-01`}
        badge={dataSourceMode === 'LIVE_EDGE' ? 'LIVE MQTT' : 'SIMULATION'}
        badgeType={dataSourceMode === 'LIVE_EDGE' ? 'purple' : 'sky'}
        actions={
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <button
              onClick={() => generateParcel('NORMAL')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow flex items-center space-x-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sim Normal</span>
            </button>
            <button
              onClick={() => generateParcel('TEAR')}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow flex items-center space-x-1"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Sim Tear</span>
            </button>
            <button
              onClick={() => generateParcel('DENT')}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all shadow flex items-center space-x-1"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Sim Dent</span>
            </button>
            <button
              onClick={() => generateParcel('WATER_STAIN')}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold transition-all shadow flex items-center space-x-1"
            >
              <Droplets className="w-3.5 h-3.5" />
              <span>Sim Wet</span>
            </button>
          </div>
        }
      />

      {/* STEP-BY-STEP SEQUENTIAL INSPECTION DATA FLOW PIPELINE */}
      <SectionCard 
        title="Sequential Inspection Pipeline Data Flow" 
        icon={Zap}
        headerActions={<span className="text-xs text-emerald-400 font-mono font-bold">Pipeline Latency: 35ms</span>}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {pipelineSteps.map((step, idx) => (
            <div key={idx} className="bg-[#0F172A] p-2.5 rounded-lg border border-[#26354A] text-center space-y-1 font-mono">
              <span className="text-[9px] text-[#94A3B8] uppercase block font-bold truncate">{step.label}</span>
              <span className={`text-xs font-bold block ${
                step.status === 'REJECT' || step.status === 'TRIGGERED' 
                  ? 'text-red-400' 
                  : 'text-emerald-400'
              }`}>
                {step.status}
              </span>
              <span className="text-[10px] text-slate-300 block truncate">{step.detail}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Main Dual Camera Visualizer */}
      <SectionCard title="Dual-Camera High-Resolution Vision Feed" icon={Activity}>
        <InspectionVisualizer parcel={latestParcel} />
      </SectionCard>

      {/* Real-time Telemetry Grid & Decision Callout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Real-Time Sensor Telemetry (7 Cols) */}
        <div className="lg:col-span-7">
          <SectionCard title="Inspection Tunnel Telemetry & Instrumentation" icon={Activity}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="bg-[#0F172A] p-3.5 rounded-lg border border-[#26354A]">
                <span className="text-[#94A3B8] text-[10px] block uppercase">IR Breakbeam Sensor</span>
                <span className="text-emerald-400 font-bold text-sm mt-1 block">
                  {systemStatus.irSensorStatus}
                </span>
              </div>

              <div className="bg-[#0F172A] p-3.5 rounded-lg border border-[#26354A]">
                <span className="text-[#94A3B8] text-[10px] block uppercase">Load Cell (HX711)</span>
                <span className="text-white font-bold text-sm mt-1 block">
                  {latestParcel.weight} kg
                </span>
              </div>

              <div className="bg-[#0F172A] p-3.5 rounded-lg border border-[#26354A]">
                <span className="text-[#94A3B8] text-[10px] block uppercase">Conveyor Speed</span>
                <span className="text-sky-400 font-bold text-sm mt-1 block">
                  {systemStatus.conveyorSpeed} m/s
                </span>
              </div>

              <div className="bg-[#0F172A] p-3.5 rounded-lg border border-[#26354A]">
                <span className="text-[#94A3B8] text-[10px] block uppercase">Air Pressure</span>
                <span className="text-sky-400 font-bold text-sm mt-1 block">
                  {systemStatus.airPressure} bar
                </span>
              </div>

              <div className="bg-[#0F172A] p-3.5 rounded-lg border border-[#26354A]">
                <span className="text-[#94A3B8] text-[10px] block uppercase">AI Frame Rate</span>
                <span className="text-purple-400 font-bold text-sm mt-1 block">
                  {systemStatus.aiFps} FPS
                </span>
              </div>

              <div className="bg-[#0F172A] p-3.5 rounded-lg border border-[#26354A]">
                <span className="text-[#94A3B8] text-[10px] block uppercase">Inference Latency</span>
                <span className="text-emerald-400 font-bold text-sm mt-1 block">
                  {systemStatus.aiInferenceMs} ms
                </span>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Current Decision Banner (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className={`p-5 rounded-xl border shadow-xl transition-all ${
            isReject ? 'bg-red-950/70 border-red-500/80 text-red-400' : 'bg-emerald-950/70 border-emerald-500/80 text-emerald-400'
          }`}>
            <span className="text-xs font-mono font-bold uppercase tracking-wider block">
              Active Sorter Decision
            </span>
            <div className="flex items-center space-x-3 my-2">
              <StatusBadge status={latestParcel.status} size="lg" />
              <h2 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white">
                {latestParcel.trackingNumber}
              </h2>
            </div>
            <p className="text-xs text-slate-200 font-sans mt-2">
              {isReject ? `Quarantine Diverter Engaged: ${latestParcel.rejectReason}` : 'Inspection clear. Conveyor belt proceed to sorting hub.'}
            </p>
          </div>

          <SectionCard title="Active Scan Parameters" icon={Activity}>
            <div className="text-xs font-mono space-y-2.5 text-slate-300">
              <div className="flex justify-between border-b border-[#26354A] pb-2">
                <span className="text-[#94A3B8]">AI Damage Type:</span>
                <span className="font-bold text-white">{latestParcel.damageType}</span>
              </div>
              <div className="flex justify-between border-b border-[#26354A] pb-2">
                <span className="text-[#94A3B8]">Confidence Score:</span>
                <span className="text-sky-400 font-bold">{latestParcel.aiConfidence}%</span>
              </div>
              <div className="flex justify-between border-b border-[#26354A] pb-2">
                <span className="text-[#94A3B8]">Weight Difference:</span>
                <span className="text-white font-bold">{latestParcel.weightDifference}%</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-[#94A3B8]">Actuator Cylinder:</span>
                <span className="text-emerald-400 font-bold">READY (PRESSURE NORMAL)</span>
              </div>
            </div>
          </SectionCard>
        </div>

      </div>

    </div>
  );
};

