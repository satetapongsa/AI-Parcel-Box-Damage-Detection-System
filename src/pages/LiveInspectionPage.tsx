import React from 'react';
import { 
  Video, 
  Activity,
  Zap
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { InspectionVisualizer } from '../components/InspectionVisualizer';

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
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#101A2B] border border-[#26344A] p-5 rounded-xl shadow-md">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2 font-mono">
            <Video className="w-6 h-6 text-sky-400" />
            <span>Live Machine Vision Inspection Station</span>
          </h1>
          <p className="text-xs text-[#94A3B8] font-mono mt-1">
            Mode: <strong className="text-purple-400">{dataSourceMode === 'LIVE_EDGE' ? 'LIVE EDGE (CiRA CORE MQTT ACTIVE)' : 'SIMULATED FRONTEND MOCK'}</strong> • Station SORT-01
          </p>
        </div>

        {/* Quick Simulation Bar */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <button
            onClick={() => generateParcel('NORMAL')}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow"
          >
            Simulate Normal
          </button>
          <button
            onClick={() => generateParcel('TEAR')}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow"
          >
            Simulate Tear
          </button>
          <button
            onClick={() => generateParcel('DENT')}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all shadow"
          >
            Simulate Dent
          </button>
          <button
            onClick={() => generateParcel('WATER_STAIN')}
            className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold transition-all shadow"
          >
            Simulate Wet
          </button>
        </div>
      </div>

      {/* STEP-BY-STEP SEQUENTIAL INSPECTION DATA FLOW PIPELINE */}
      <div className="bg-[#101A2B] border border-[#26344A] p-4 rounded-xl shadow-md font-mono text-xs space-y-2">
        <div className="flex items-center justify-between text-[#94A3B8] border-b border-[#26344A] pb-2">
          <span className="font-bold text-white flex items-center space-x-1.5">
            <Zap className="w-4 h-4 text-sky-400" />
            <span>Sequential Inspection Pipeline Data Flow</span>
          </span>
          <span className="text-[10px] text-emerald-400 font-bold">Latency: 35ms</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-1">
          {pipelineSteps.map((step, idx) => (
            <div key={idx} className="bg-[#172235] p-2.5 rounded-lg border border-[#26344A] text-center space-y-1">
              <span className="text-[9px] text-[#94A3B8] uppercase block font-bold truncate">{step.label}</span>
              <span className={`text-xs font-black block ${
                step.status === 'REJECT' || step.status === 'TRIGGERED' 
                  ? 'text-red-400' 
                  : 'text-emerald-400'
              }`}>
                {step.status}
              </span>
              <span className="text-[9px] text-slate-300 block truncate">{step.detail}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Dual Camera Visualizer */}
      <div className="bg-[#101A2B] border border-[#26344A] p-5 rounded-xl shadow-md">
        <InspectionVisualizer parcel={latestParcel} />
      </div>

      {/* Real-time Telemetry Grid & Decision Callout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Real-Time Sensor Telemetry (7 Cols) */}
        <div className="lg:col-span-7 bg-[#101A2B] border border-[#26344A] p-5 rounded-xl shadow-md space-y-4">
          <h3 className="text-xs font-bold text-white uppercase font-mono border-b border-[#26344A] pb-2 flex items-center space-x-2">
            <Activity className="w-4 h-4 text-sky-400" />
            <span>Inspection Tunnel Telemetry & Sensor Instrumentation</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div className="bg-[#172235] p-3 rounded-lg border border-[#26344A]">
              <span className="text-[#94A3B8] text-[10px] block">IR Breakbeam Sensor</span>
              <span className="text-emerald-400 font-bold text-sm mt-1 block">
                {systemStatus.irSensorStatus}
              </span>
            </div>

            <div className="bg-[#172235] p-3 rounded-lg border border-[#26344A]">
              <span className="text-[#94A3B8] text-[10px] block">Load Cell (HX711)</span>
              <span className="text-white font-bold text-sm mt-1 block">
                {latestParcel.weight} kg
              </span>
            </div>

            <div className="bg-[#172235] p-3 rounded-lg border border-[#26344A]">
              <span className="text-[#94A3B8] text-[10px] block">Conveyor Speed</span>
              <span className="text-sky-400 font-bold text-sm mt-1 block">
                {systemStatus.conveyorSpeed} m/s
              </span>
            </div>

            <div className="bg-[#172235] p-3 rounded-lg border border-[#26344A]">
              <span className="text-[#94A3B8] text-[10px] block">Air Pressure</span>
              <span className="text-sky-400 font-bold text-sm mt-1 block">
                {systemStatus.airPressure} bar
              </span>
            </div>

            <div className="bg-[#172235] p-3 rounded-lg border border-[#26344A]">
              <span className="text-[#94A3B8] text-[10px] block">AI Frame Rate</span>
              <span className="text-purple-400 font-bold text-sm mt-1 block">
                {systemStatus.aiFps} FPS
              </span>
            </div>

            <div className="bg-[#172235] p-3 rounded-lg border border-[#26344A]">
              <span className="text-[#94A3B8] text-[10px] block">Inference Latency</span>
              <span className="text-emerald-400 font-bold text-sm mt-1 block">
                {systemStatus.aiInferenceMs} ms
              </span>
            </div>
          </div>
        </div>

        {/* Current Decision Banner (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className={`p-5 rounded-xl border shadow-xl transition-all ${
            isReject ? 'bg-red-950/90 border-red-500 text-red-400' : 'bg-emerald-950/90 border-emerald-500 text-emerald-400'
          }`}>
            <span className="text-xs font-mono font-bold uppercase tracking-wider block">
              Active Sorter Decision
            </span>
            <h2 className="text-3xl font-black font-mono my-2">
              {isReject ? 'REJECT (QUARANTINE)' : 'PASS (DISPATCH)'}
            </h2>
            <p className="text-xs text-slate-200 font-mono">
              Tracking: <span className="text-sky-400 font-bold">{latestParcel.trackingNumber}</span>
            </p>
          </div>

          <div className="bg-[#101A2B] border border-[#26344A] p-4 rounded-xl shadow-md text-xs font-mono space-y-2 text-slate-300">
            <div className="flex justify-between border-b border-[#26344A] pb-1">
              <span className="text-[#94A3B8]">AI Damage Type:</span>
              <span className="font-bold text-white">{latestParcel.damageType}</span>
            </div>
            <div className="flex justify-between border-b border-[#26344A] pb-1">
              <span className="text-[#94A3B8]">Confidence Score:</span>
              <span className="text-sky-400 font-bold">{latestParcel.aiConfidence}%</span>
            </div>
            <div className="flex justify-between border-b border-[#26344A] pb-1">
              <span className="text-[#94A3B8]">Weight Difference:</span>
              <span className="text-white font-bold">{latestParcel.weightDifference}%</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-[#94A3B8]">Actuator Cylinder:</span>
              <span className="text-emerald-400 font-bold">READY</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
