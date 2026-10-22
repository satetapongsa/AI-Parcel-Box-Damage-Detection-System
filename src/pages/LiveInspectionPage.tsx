import React from 'react';
import { 
  Activity,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Droplets,
  Play,
  Pause,
  Scale
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { InspectionVisualizer } from '../components/InspectionVisualizer';
import { ConveyorSimulation } from '../components/ConveyorSimulation';
import { VirtualHardwarePanel } from '../components/VirtualHardwarePanel';
import { CiraPanel } from '../components/CiraPanel';
import { UartConsole } from '../components/UartConsole';
import { PageHeader } from '../components/common/PageHeader';
import { SectionCard } from '../components/common/SectionCard';
import { StatusBadge } from '../components/common/StatusBadge';

export const LiveInspectionPage: React.FC = () => {
  const { 
    latestParcel, 
    systemStatus, 
    generateParcel,
    demoModeActive,
    toggleDemoMode,
    demoSpeed,
    setDemoSpeed,
    timelineEvents
  } = useSimulation();

  const isReject = latestParcel.status === 'REJECT';

  const pipelineSteps = [
    { label: '1. IR SENSOR', status: '✓', detail: systemStatus.irSensorStatus },
    { label: '2. CAMERA CAPTURE', status: '✓', detail: 'Dual 1080p' },
    { label: '3. BARCODE', status: '✓', detail: latestParcel.trackingNumber },
    { label: '4. CiRA CORE AI', status: '✓', detail: `${latestParcel.aiConfidence}%` },
    { label: '5. LOAD CELL', status: '✓', detail: `${latestParcel.weight} kg` },
    { label: '6. DECISION', status: isReject ? 'REJECT' : 'PASS', detail: latestParcel.status },
    { label: '7. UART / ESP32', status: isReject ? 'CMD 3' : 'CMD 1', detail: isReject ? 'RED' : 'GREEN' },
    { label: '8. ACTUATOR', status: latestParcel.actuatorTriggered ? 'TRIGGERED' : 'IDLE', detail: latestParcel.actuatorTriggered ? 'PUSHED' : 'PASSED' },
    { label: '9. LOCAL SQLITE', status: 'SAVED', detail: 'Local Disk' },
    { label: '10. CLOUD SYNC', status: latestParcel.syncedToCloud ? 'SYNCED' : 'PENDING', detail: latestParcel.syncedToCloud ? '201 OK' : 'Queued' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-300 max-w-[1920px] mx-auto">
      
      {/* Enterprise Page Header */}
      <PageHeader
        title="Live Vision Inspection Station"
        description="End-to-end automated machine vision defect classification & diverter control tunnel (SORT-01)"
        badge="ONLINE"
        badgeType="green"
        actions={
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            {/* Play/Pause Control */}
            <button
              onClick={toggleDemoMode}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all shadow flex items-center space-x-1.5 ${
                demoModeActive ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {demoModeActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{demoModeActive ? 'Pause' : 'Play Flow'}</span>
            </button>

            {/* Speed Selector */}
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
              {([0.5, 1, 2, 4] as const).map((spd) => (
                <button
                  key={spd}
                  onClick={() => setDemoSpeed(spd)}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                    demoSpeed === spd ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  x{spd}
                </button>
              ))}
            </div>

            {/* Manual Single Parcel Injections */}
            <button
              onClick={() => generateParcel('NORMAL')}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white font-bold transition shadow flex items-center space-x-1"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Normal</span>
            </button>
            <button
              onClick={() => generateParcel('DENT')}
              className="px-2.5 py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-500 text-white font-bold transition shadow flex items-center space-x-1"
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Dent</span>
            </button>
            <button
              onClick={() => generateParcel('TEAR')}
              className="px-2.5 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-500 text-white font-bold transition shadow flex items-center space-x-1"
            >
              <XCircle className="w-3 h-3" />
              <span>Tear</span>
            </button>
            <button
              onClick={() => generateParcel('WATER_STAIN')}
              className="px-2.5 py-1.5 rounded-lg bg-sky-600/80 hover:bg-sky-500 text-white font-bold transition shadow flex items-center space-x-1"
            >
              <Droplets className="w-3 h-3" />
              <span>Wet</span>
            </button>
            <button
              onClick={() => generateParcel('WEIGHT_ANOMALY')}
              className="px-2.5 py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-500 text-white font-bold transition shadow flex items-center space-x-1"
            >
              <Scale className="w-3 h-3" />
              <span>Weight</span>
            </button>
          </div>
        }
      />

      {/* VIRTUAL HARDWARE PANEL (Tower Light 3-Color, Solenoid, Sensors) */}
      <VirtualHardwarePanel />

      {/* 3D CONVEYOR BELT SIMULATION */}
      <ConveyorSimulation 
        conveyorSpeed={systemStatus.conveyorSpeed > 0 ? 1 : 1.5}
        parcelStatus={latestParcel.status}
        simulationMode="AUTO"
        currentParcel={latestParcel}
      />

      {/* 10-STEP SYSTEM FLOW PIPELINE FROM SECTION 6.1 */}
      <SectionCard 
        title="10-Step Automated Inspection & Decision Pipeline" 
        icon={Zap}
        headerActions={<span className="text-xs text-emerald-400 font-mono font-bold">Latency: {systemStatus.aiInferenceMs}ms</span>}
      >
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 font-mono">
          {pipelineSteps.map((step, idx) => (
            <div key={idx} className="bg-[#0F172A] p-2 rounded-lg border border-[#26354A] text-center space-y-1">
              <span className="text-[9px] text-[#94A3B8] uppercase block font-bold truncate">{step.label}</span>
              <span className={`text-xs font-bold block ${
                step.status === 'REJECT' || step.status === 'TRIGGERED' || step.status === 'CMD 3' 
                  ? 'text-red-400' 
                  : step.status === 'PENDING'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {step.status}
              </span>
              <span className="text-[10px] text-slate-300 block truncate">{step.detail}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* CiRA CORE Screen & ESP32 UART Console side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <CiraPanel />
        </div>
        <div className="lg:col-span-5">
          <UartConsole />
        </div>
      </div>

      {/* Main Dual Camera Visualizer */}
      <SectionCard title="Dual-Camera Machine Vision Feed" icon={Activity}>
        <InspectionVisualizer parcel={latestParcel} />
      </SectionCard>

      {/* Real-time Telemetry Grid & Decision Callout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Real-Time Sensor Telemetry (7 Cols) */}
        <div className="lg:col-span-7">
          <SectionCard title="Tunnel Instrumentation & Actuator Timing" icon={Activity}>
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
                <span className="text-[#94A3B8] text-[10px] block uppercase">Tower Light State</span>
                <span className={`font-bold text-sm mt-1 block ${
                  systemStatus.towerLight === 'RED' ? 'text-red-400' : systemStatus.towerLight === 'YELLOW' ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {systemStatus.towerLight}
                </span>
              </div>

              <div className="bg-[#0F172A] p-3.5 rounded-lg border border-[#26354A]">
                <span className="text-[#94A3B8] text-[10px] block uppercase">Actuator Dispatch</span>
                <span className={`font-bold text-sm mt-1 block ${
                  systemStatus.actuatorStatus === 'FIRING' ? 'text-red-400 animate-pulse' : 'text-emerald-400'
                }`}>
                  {systemStatus.actuatorStatus}
                </span>
              </div>

              <div className="bg-[#0F172A] p-3.5 rounded-lg border border-[#26354A]">
                <span className="text-[#94A3B8] text-[10px] block uppercase">Store-and-Forward Queue</span>
                <span className={`font-bold text-sm mt-1 block ${
                  systemStatus.pendingSyncCount > 0 ? 'text-amber-400' : 'text-slate-400'
                }`}>
                  {systemStatus.pendingSyncCount} pending
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

          {/* Live Timeline Events Box */}
          <SectionCard title="Live Chronological Inspection Timeline" icon={Activity}>
            <div className="text-xs font-mono space-y-2 max-h-48 overflow-y-auto pr-1">
              {timelineEvents.slice(0, 7).map((evt) => (
                <div key={evt.id} className="flex items-start space-x-2 border-b border-slate-800/60 pb-1.5">
                  <span className="text-slate-500 text-[10px]">[{evt.timestamp}]</span>
                  <span className={`text-[10px] px-1 rounded font-bold ${
                    evt.type === 'danger' ? 'bg-red-500/20 text-red-400' :
                    evt.type === 'warning' ? 'bg-amber-500/20 text-amber-300' :
                    evt.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-cyan-500/20 text-cyan-300'
                  }`}>
                    {evt.source}
                  </span>
                  <span className="text-slate-300 text-[11px] truncate">{evt.message}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

      </div>

    </div>
  );
};
