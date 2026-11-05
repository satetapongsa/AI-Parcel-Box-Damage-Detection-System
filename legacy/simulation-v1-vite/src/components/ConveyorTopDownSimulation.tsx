import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Camera, 
  Radio, 
  Cpu, 
  ArrowRight, 
  CheckCircle2, 
  XCircle,
  Zap,
  Activity
} from 'lucide-react';
import type { ParcelRecord } from '../types';

export interface ConveyorTopDownSimulationProps {
  isRunning: boolean;
  onToggleRunning?: () => void;
  latestParcel?: ParcelRecord;
}

interface MovingBox {
  id: string;
  trackingNumber: string;
  status: 'PASS' | 'REJECT';
  damageType: string;
  x: number; // percentage along track (0% to 100%)
  y: number; // percentage (vertical track placement)
  lane: 'MAIN' | 'EJECTING' | 'REJECT_LINE' | 'EXIT';
  ejectProgress: number; // 0 to 1
  scanned: boolean;
  analyzed: boolean;
}

export const ConveyorTopDownSimulation: React.FC<ConveyorTopDownSimulationProps> = ({
  isRunning,
  onToggleRunning,
  latestParcel
}) => {
  const [boxes, setBoxes] = useState<MovingBox[]>([]);
  const [cylinderFired, setCylinderFired] = useState(false);

  // Sensor & Camera Activity States
  const [entryTriggered, setEntryTriggered] = useState(false);
  const [camerasActive, setCamerasActive] = useState(false);
  const [ciraProcessing, setCiraProcessing] = useState(false);
  const [pusherReadyToFire, setPusherReadyToFire] = useState(false);
  const [lastVerdict, setLastVerdict] = useState<{ status: 'PASS' | 'REJECT'; defect: string; tracking: string; stage: string } | null>(null);

  // End sensor flash & counts
  const [validExitTriggered, setValidExitTriggered] = useState(false);
  const [rejectExitTriggered, setRejectExitTriggered] = useState(false);
  const [validSensorCount, setValidSensorCount] = useState(0);
  const [rejectSensorCount, setRejectSensorCount] = useState(0);

  const lastSpawnTime = useRef<number>(Date.now());
  const boxCounter = useRef<number>(101);

  // Spacing & speed constants
  const MIN_BOX_GAP = 26; // 26% gap guarantees clear, distinct spacing between boxes
  const BELT_SPEED = 13;  // 13% distance per second (steady, uniform pace)

  // Sync with live inspection engine
  useEffect(() => {
    if (!latestParcel) return;
    setBoxes(prev => {
      if (prev.some(b => b.trackingNumber === latestParcel.trackingNumber)) return prev;

      const trailingBox = prev[prev.length - 1];
      if (trailingBox && trailingBox.x < MIN_BOX_GAP) {
        return prev;
      }

      const newBox: MovingBox = {
        id: String(Date.now() + Math.random()),
        trackingNumber: latestParcel.trackingNumber,
        status: latestParcel.status,
        damageType: latestParcel.damageType,
        x: 0,
        y: 35,
        lane: 'MAIN',
        ejectProgress: 0,
        scanned: false,
        analyzed: false
      };
      setEntryTriggered(true);
      setTimeout(() => setEntryTriggered(false), 250);
      return [...prev.slice(-6), newBox];
    });
  }, [latestParcel]);

  // Main 60FPS physics animation loop
  useEffect(() => {
    if (!isRunning) return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const now = Date.now();
      if (now - lastSpawnTime.current > 2600) {
        setBoxes(prev => {
          const trailingBox = prev[prev.length - 1];
          if (!trailingBox || trailingBox.x >= MIN_BOX_GAP) {
            lastSpawnTime.current = now;
            boxCounter.current += 1;
            const isDefect = Math.random() < 0.45;
            const defectList = ['DENT', 'TEAR', 'WATER_STAIN', 'WEIGHT_ANOMALY'];
            const picked = isDefect ? defectList[Math.floor(Math.random() * defectList.length)] : 'NORMAL';

            const autoBox: MovingBox = {
              id: String(now),
              trackingNumber: `THA-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(boxCounter.current).padStart(4, '0')}`,
              status: isDefect ? 'REJECT' : 'PASS',
              damageType: picked,
              x: 0,
              y: 35,
              lane: 'MAIN',
              ejectProgress: 0,
              scanned: false,
              analyzed: false
            };
            setEntryTriggered(true);
            setTimeout(() => setEntryTriggered(false), 250);
            return [...prev.slice(-6), autoBox];
          }
          return prev;
        });
      }

      setBoxes(prevBoxes => {
        let pistonActive = false;
        let camActive = false;
        let ciraActive = false;
        let pusherTargeting = false;

        const updated = prevBoxes.map(box => {
          // Lane 1: Main Conveyor Belt
          if (box.lane === 'MAIN') {
            const nextX = box.x + BELT_SPEED * dt;

            // 1. Entry Sensor (At X = 6%)
            if (box.x < 6 && nextX >= 6) {
              setEntryTriggered(true);
              setTimeout(() => setEntryTriggered(false), 200);
            }

            // 2. Optical Cameras Inspection Station (At X = 25% - well before pusher)
            if (nextX >= 22 && nextX <= 30) {
              camActive = true;
              if (!box.scanned) {
                setLastVerdict({
                  status: box.status,
                  defect: box.status === 'REJECT' ? box.damageType : 'CLEAN / INTACT',
                  tracking: box.trackingNumber,
                  stage: 'Capturing optical imagery...'
                });
              }
            }

            // 3. CiRA Core AI Processing & Decision Area (At X = 38% to 55% - occurs before pusher)
            if (nextX >= 36 && nextX <= 58) {
              ciraActive = true;
              if (box.status === 'REJECT') {
                pusherTargeting = true;
                setLastVerdict({
                  status: 'REJECT',
                  defect: box.damageType,
                  tracking: box.trackingNumber,
                  stage: 'CiRA Core: Damaged box identified! Arming pneumatic pusher...'
                });
              } else if (!box.analyzed) {
                setLastVerdict({
                  status: 'PASS',
                  defect: 'INTACT PACKAGE',
                  tracking: box.trackingNumber,
                  stage: 'CiRA Core: Integrity verified. Cleared to continue along main line.'
                });
              }
            }

            const isBoxScanned = box.scanned || nextX >= 30;
            const isBoxAnalyzed = box.analyzed || nextX >= 55;

            // 4. Downstream Pneumatic Pusher Mechanism (At X = 72% - executes after CiRA Core processing)
            if (box.status === 'REJECT' && box.x < 72 && nextX >= 72) {
              pistonActive = true;
              return {
                ...box,
                x: 72,
                lane: 'EJECTING' as const,
                ejectProgress: 0,
                scanned: true,
                analyzed: true
              };
            }

            // 5. Valid Intact Package reaches Delivery Sensor (At X = 92%)
            if (nextX >= 92 && box.x < 92) {
              setValidSensorCount(c => c + 1);
              setValidExitTriggered(true);
              setTimeout(() => setValidExitTriggered(false), 350);
            }

            if (nextX >= 100) {
              return { ...box, x: 104, lane: 'EXIT' as const };
            }

            return { ...box, x: nextX, scanned: isBoxScanned, analyzed: isBoxAnalyzed };
          }

          // Lane 2: Pneumatic Cylinder Pusher Stroke (Diverting from Y=35% to Y=72%)
          if (box.lane === 'EJECTING') {
            pistonActive = true;
            const nextProg = Math.min(1, box.ejectProgress + 3.2 * dt); // fast 300ms stroke
            const newY = 35 + (72 - 35) * nextProg;

            if (nextProg >= 1) {
              return {
                ...box,
                lane: 'REJECT_LINE' as const,
                y: 72,
                x: 72
              };
            }

            return { ...box, ejectProgress: nextProg, y: newY };
          }

          // Lane 3: Diverted Reject Conveyor Line (Uniform speed to reject sensor)
          if (box.lane === 'REJECT_LINE') {
            const nextX = box.x + BELT_SPEED * dt;

            // Damaged box reaches Reject End Sensor (At X = 92%)
            if (nextX >= 92 && box.x < 92) {
              setRejectSensorCount(c => c + 1);
              setRejectExitTriggered(true);
              setTimeout(() => setRejectExitTriggered(false), 350);
            }

            if (nextX >= 100) {
              return { ...box, x: 104, lane: 'EXIT' as const };
            }

            return { ...box, x: nextX };
          }

          return box;
        }).filter(b => b.lane !== 'EXIT');

        setCylinderFired(pistonActive);
        setCamerasActive(camActive);
        setCiraProcessing(ciraActive);
        setPusherReadyToFire(pusherTargeting);
        return updated;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isRunning]);

  return (
    <div className="bg-[#0B1526] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col space-y-5">
      {/* 1. Header with Controls & Process Explanation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center space-x-2.5">
            <span>Conveyor Flow & Optical Inspection Architecture</span>
            <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded uppercase font-semibold">
              Live Hardware
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            <strong>Sequential Process:</strong> Optical Cameras detect & capture box &rarr; CiRA Core evaluates structural damage &rarr; Compromised boxes reach downstream Pneumatic Pusher & are ejected onto the reject line.
          </p>
        </div>

        {onToggleRunning && (
          <button
            onClick={onToggleRunning}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition flex items-center space-x-2 shadow ${
              isRunning
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'Pause Belt' : 'Resume Belt'}</span>
          </button>
        )}
      </div>

      {/* 2. Hardware Signal Pipeline (Cameras &rarr; CiRA Core &rarr; Downstream Pusher) */}
      <div className="bg-[#070E1A] border border-slate-800 rounded-xl p-3.5 sm:p-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
        {/* Step 1: Upstream Optical Cameras */}
        <div className={`p-3 rounded-lg border flex items-center space-x-3 transition-colors ${
          camerasActive ? 'bg-cyan-950/40 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'bg-[#0B1526] border-slate-800'
        }`}>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            camerasActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
          }`}>
            <Camera className={`w-5 h-5 ${camerasActive ? 'animate-pulse' : ''}`} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-cyan-400 font-bold uppercase font-mono block">Step 1: Upstream Optical Scan</span>
            <span className="text-xs font-bold text-white block truncate">Dual Cameras Capture Box</span>
            <span className={`text-[10px] font-mono ${camerasActive ? 'text-cyan-400 font-bold' : 'text-slate-500'}`}>
              {camerasActive ? 'IMAGING IN PROGRESS' : 'STANDBY (READY)'}
            </span>
          </div>
        </div>

        {/* Step 2: Intermediate CiRA Core AI Processing Platform */}
        <div className={`p-3 rounded-lg border flex items-center space-x-3 transition-colors ${
          ciraProcessing ? 'bg-purple-950/40 border-purple-400/80 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-[#0B1526] border-slate-800'
        }`}>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            ciraProcessing ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-400'
          }`}>
            <Cpu className={`w-5 h-5 ${ciraProcessing ? 'animate-spin' : ''}`} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-purple-400 font-bold uppercase font-mono block">Step 2: CiRA Core AI Analysis</span>
            <span className="text-xs font-bold text-white block truncate">Damage Classification</span>
            <span className={`text-[10px] font-mono ${ciraProcessing ? 'text-purple-400 font-bold' : 'text-slate-500'}`}>
              {ciraProcessing ? 'PROCESSING DAMAGE INTEGRITY' : 'AWAITING OPTICAL DATA'}
            </span>
          </div>
        </div>

        {/* Step 3: Downstream Pneumatic Pusher Ejection */}
        <div className={`p-3 rounded-lg border flex items-center space-x-3 transition-colors ${
          cylinderFired ? 'bg-red-950/50 border-red-400/80 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : pusherReadyToFire ? 'bg-amber-950/40 border-amber-500/60' : 'bg-[#0B1526] border-slate-800'
        }`}>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            cylinderFired ? 'bg-red-500/20 text-red-400' : pusherReadyToFire ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
          }`}>
            <Zap className={`w-5 h-5 ${cylinderFired ? 'animate-bounce' : pusherReadyToFire ? 'animate-pulse' : ''}`} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-red-400 font-bold uppercase font-mono block">Step 3: Downstream Pusher Action</span>
            <span className="text-xs font-bold text-white block truncate">Pneumatic Ejection Cylinder</span>
            <span className={`text-[10px] font-mono ${cylinderFired ? 'text-red-400 font-bold' : pusherReadyToFire ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
              {cylinderFired ? 'PUSHER STROKE ACTIVE (DIVERT)' : pusherReadyToFire ? 'TARGET IDENTIFIED &bull; ARMED' : 'WAITING FOR COMPROMISED BOX'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Sensor Count Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs font-mono">
        <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors shadow ${
          validExitTriggered 
            ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200 shadow-[0_0_15px_rgba(52,211,153,0.3)]' 
            : 'bg-[#070E1A] border-slate-800 text-slate-300'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              validExitTriggered ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-emerald-500'
            }`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block font-medium">Main Line Delivery Sensor</span>
              <span className="text-sm font-bold text-white">Valid Deliverable Packages</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-3xl font-extrabold text-emerald-400 block">{validSensorCount}</span>
            <span className="text-[10px] text-slate-400">passed intact</span>
          </div>
        </div>

        <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors shadow ${
          rejectExitTriggered 
            ? 'bg-red-950/60 border-red-400 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
            : 'bg-[#070E1A] border-slate-800 text-slate-300'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              rejectExitTriggered ? 'bg-red-500/20 text-red-300' : 'bg-slate-800 text-red-500'
            }`}>
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block font-medium">Diverted Line Reject Sensor</span>
              <span className="text-sm font-bold text-white">Damaged Packages Diverted</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-3xl font-extrabold text-red-400 block">{rejectSensorCount}</span>
            <span className="text-[10px] text-slate-400">ejected by pusher</span>
          </div>
        </div>
      </div>

      {/* 4. Enlarged Conveyor Canvas (Height 340px) */}
      <div className="relative w-full h-[340px] bg-[#050B16] border border-slate-800 rounded-xl overflow-hidden select-none">
        
        {/* Precision Floor Grid */}
        <div 
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: 'radial-gradient(#38bdf8 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px'
          }}
        />

        {/* 1. Inbound Entry Arrival Sensor (At X = 6%) */}
        <div className="absolute left-[5%] top-[14%] flex flex-col items-center z-20 pointer-events-none">
          <div className="flex items-center space-x-1 mb-1">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-[8.5px] font-mono text-cyan-300 font-bold uppercase">ENTRY</span>
          </div>
          <span className={`w-4 h-4 rounded-full transition-all duration-200 border-2 ${
            entryTriggered 
              ? 'bg-cyan-400 border-white shadow-[0_0_16px_rgba(6,182,212,1)] scale-125' 
              : 'bg-slate-800 border-slate-600'
          }`} />
        </div>

        {/* 2. Main Conveyor Belt (Upper Track: Y = 35%, Height = 64px) */}
        <div className="absolute left-0 right-0 top-[28%] h-16 bg-gradient-to-b from-slate-900 via-[#0C172B] to-slate-900 border-y-2 border-slate-700/80 flex items-center shadow-inner">
          <div className="w-full h-full flex items-center justify-around opacity-25 pointer-events-none">
            {Array.from({ length: 32 }).map((_, i) => (
              <div key={i} className="w-0.5 h-full bg-slate-300" />
            ))}
          </div>

          <div className="absolute left-3 top-1.5 text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider flex items-center space-x-1.5">
            <span>MAIN CONVEYOR (UNIFORM PACE &rarr;)</span>
          </div>
          <div className="absolute right-24 top-1.5 text-[10px] font-mono text-emerald-400 font-bold uppercase">
            DELIVERABLE LINE &rarr;
          </div>
        </div>

        {/* 3. Upstream Optical Cameras (X = 25%) */}
        <div className="absolute left-[20%] top-[8%] w-[12%] h-[130px] pointer-events-none z-10 flex flex-col items-center">
          <div className={`p-2 rounded-lg border transition-all duration-200 flex items-center space-x-1.5 mb-1 ${
            camerasActive 
              ? 'bg-cyan-500 text-slate-950 border-white shadow-[0_0_16px_rgba(6,182,212,0.8)] scale-110' 
              : 'bg-[#0B1526] text-cyan-400 border-cyan-500/40'
          }`}>
            <Camera className="w-4 h-4" />
            <span className="text-[9px] font-mono font-bold">OPTICAL CAM</span>
          </div>

          {/* Camera Scanning Beam Cone */}
          <div className={`w-full h-16 border-x-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center ${
            camerasActive ? 'border-cyan-400/80 bg-cyan-500/15' : 'border-slate-700/50 bg-transparent'
          }`}>
            <span className="text-[8px] font-mono text-cyan-300 font-bold">1080p CAPTURE</span>
            <span className="text-[7px] font-mono text-slate-400">Pass-through</span>
          </div>

          <div className={`p-1 rounded border text-[8px] font-mono font-bold mt-1 ${
            camerasActive ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            SIDE CAMERA
          </div>
        </div>

        {/* 4. Intermediate CiRA Core AI Processing Station (X = 42% to 56%) */}
        <div className="absolute left-[38%] top-[10%] w-[18%] h-[120px] pointer-events-none z-10 flex flex-col items-center justify-center border-2 border-dashed border-purple-500/50 bg-purple-950/20 rounded-xl p-2 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
          <div className="flex items-center space-x-1.5 text-purple-300 mb-1">
            <Cpu className={`w-4 h-4 ${ciraProcessing ? 'animate-spin' : ''}`} />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">CiRA Core Engine</span>
          </div>
          <span className="text-[8px] font-mono text-slate-300 text-center leading-tight">
            Analyzes Optical Imagery &bull; Identifies Dents/Tears &bull; Issues Divert Decision
          </span>
          <div className="flex items-center space-x-1 mt-1.5 text-[8px] font-mono text-cyan-400">
            <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>Before Pusher Zone</span>
          </div>
        </div>

        {/* Data Transmission Arrow from CiRA Core to Pusher */}
        <div className="absolute left-[58%] top-[34%] w-[10%] flex items-center justify-center pointer-events-none">
          <ArrowRight className="w-5 h-5 text-purple-400 animate-pulse" />
        </div>

        {/* 5. Downstream Pneumatic Pusher Mechanism (At X = 72% - positioned AFTER camera & CiRA Core) */}
        <div className="absolute left-[68%] top-[5%] flex flex-col items-center z-20 pointer-events-none">
          <div className="bg-slate-800 border border-slate-600 px-2 py-0.5 rounded text-[8px] font-mono text-cyan-300 font-bold mb-1 shadow">
            PNEUMATIC PUSHER
          </div>
          <div className="w-7 h-8 bg-gradient-to-b from-slate-700 to-slate-900 border-2 border-slate-500 rounded-t flex flex-col items-center justify-center shadow">
            <span className="text-[7.5px] font-mono text-cyan-400 font-bold">5/2 V</span>
          </div>
          {/* Extended Piston Rod */}
          <div 
            className="w-2.5 bg-slate-300 transition-all duration-150 ease-out flex flex-col items-center shadow-lg"
            style={{ height: cylinderFired ? '52px' : '4px' }}
          >
            <div className={`w-8 h-3 rounded-sm transition-colors duration-150 ${
              cylinderFired ? 'bg-red-500 shadow-[0_0_14px_rgba(239,68,68,1)]' : 'bg-slate-400'
            }`} />
          </div>
        </div>

        {/* 6. Diverted Reject Conveyor Line (Lower Track: Y = 72%, Height = 64px) */}
        <div className="absolute left-[65%] right-0 top-[64%] h-16 bg-gradient-to-b from-slate-900 via-[#1C0E16] to-slate-900 border-y-2 border-red-900/70 flex items-center shadow-inner">
          <div className="w-full h-full flex items-center justify-around opacity-25 pointer-events-none">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="w-0.5 h-full bg-red-400" />
            ))}
          </div>

          <div className="absolute left-3 top-1.5 text-[10px] font-mono text-red-400 font-bold uppercase tracking-wider flex items-center space-x-1.5">
            <span>DIVERTED REJECT LINE &rarr;</span>
          </div>
          <div className="absolute right-24 top-1.5 text-[10px] font-mono text-red-400 font-bold uppercase">
            DAMAGED REJECT BIN &rarr;
          </div>
        </div>

        {/* 7. Main Delivery End Sensor (At X = 92%) */}
        <div className="absolute right-[6%] top-[14%] flex flex-col items-center z-20 pointer-events-none">
          <div className="flex items-center space-x-1 mb-1">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[8.5px] font-mono text-emerald-400 font-bold uppercase">DELIVERY SENSOR</span>
          </div>
          <span className={`w-4 h-4 rounded-full transition-all duration-200 border-2 ${
            validExitTriggered 
              ? 'bg-emerald-400 border-white shadow-[0_0_16px_rgba(52,211,153,1)] scale-125' 
              : 'bg-slate-800 border-slate-600'
          }`} />
        </div>

        {/* 8. Diverted Reject End Sensor (At X = 92%) */}
        <div className="absolute right-[6%] top-[50%] flex flex-col items-center z-20 pointer-events-none">
          <div className="flex items-center space-x-1 mb-1">
            <Radio className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[8.5px] font-mono text-red-400 font-bold uppercase">REJECT SENSOR</span>
          </div>
          <span className={`w-4 h-4 rounded-full transition-all duration-200 border-2 ${
            rejectExitTriggered 
              ? 'bg-red-400 border-white shadow-[0_0_16px_rgba(239,68,68,1)] scale-125' 
              : 'bg-slate-800 border-slate-600'
          }`} />
        </div>

        {/* 9. Active Uniformly Spaced Moving Boxes */}
        {boxes.map(box => {
          const isReject = box.status === 'REJECT';
          const isDiverting = box.lane === 'EJECTING';

          return (
            <div
              key={box.id}
              className={`absolute w-10 h-10 rounded-lg flex flex-col items-center justify-center transition-all duration-75 shadow-xl font-mono text-[8px] z-30 ${
                isReject
                  ? 'bg-red-600 text-white border-2 border-red-300 shadow-red-950/80'
                  : 'bg-amber-300 text-amber-950 border-2 border-amber-500 font-bold shadow-amber-950/60'
              } ${isDiverting ? 'scale-115 shadow-red-500/80' : ''}`}
              style={{
                left: `${box.x}%`,
                top: `${box.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="w-full h-1 bg-black/20 mb-0.5 rounded-full" />
              <span className="truncate max-w-[34px] font-black text-[9px] leading-tight">
                {isReject ? 'FAIL' : 'PASS'}
              </span>
              <span className="text-[6.5px] opacity-75 font-mono">
                {box.trackingNumber.slice(-4)}
              </span>
            </div>
          );
        })}
      </div>

      {/* 5. Live Processing Feedback Footer */}
      {lastVerdict && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono bg-[#070E1A] border border-slate-800 px-4 py-2.5 rounded-lg gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-medium">Box In Inspection:</span>
            <span className="font-bold text-white">{lastVerdict.tracking}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              lastVerdict.status === 'REJECT' ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}>
              {lastVerdict.status === 'REJECT' ? 'COMPROMISED' : 'INTACT'}
            </span>
          </div>
          <span className="text-slate-400 text-[11px]">
            {lastVerdict.stage}
          </span>
        </div>
      )}
    </div>
  );
};
