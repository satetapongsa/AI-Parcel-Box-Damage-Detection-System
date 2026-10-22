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
  Zap
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
  const [lastVerdict, setLastVerdict] = useState<{ status: 'PASS' | 'REJECT'; defect: string; tracking: string } | null>(null);

  // End sensor flash & counts
  const [validExitTriggered, setValidExitTriggered] = useState(false);
  const [rejectExitTriggered, setRejectExitTriggered] = useState(false);
  const [validSensorCount, setValidSensorCount] = useState(0);
  const [rejectSensorCount, setRejectSensorCount] = useState(0);

  const lastSpawnTime = useRef<number>(Date.now());
  const boxCounter = useRef<number>(101);

  // Minimum spacing constant between boxes (in percentage of belt width)
  const MIN_BOX_GAP = 22; // 22% gap guarantees boxes never touch
  const BELT_SPEED = 14;  // 14% distance per second (uniform, steady pace)

  // Sync with live inspection engine
  useEffect(() => {
    if (!latestParcel) return;
    setBoxes(prev => {
      // Prevent duplicate identical tracking IDs
      if (prev.some(b => b.trackingNumber === latestParcel.trackingNumber)) return prev;

      // Ensure minimum spacing behind the trailing box
      const trailingBox = prev[prev.length - 1];
      if (trailingBox && trailingBox.x < MIN_BOX_GAP) {
        return prev; // Delay spawn until trailing box clears spacing zone
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
        scanned: false
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

      // Periodic uniform spawn ensuring minimum gap between successive boxes
      const now = Date.now();
      if (now - lastSpawnTime.current > 2400) {
        setBoxes(prev => {
          const trailingBox = prev[prev.length - 1];
          // Guarantee boxes NEVER touch: only spawn if trailing box is at least MIN_BOX_GAP ahead
          if (!trailingBox || trailingBox.x >= MIN_BOX_GAP) {
            lastSpawnTime.current = now;
            boxCounter.current += 1;
            const isDefect = Math.random() < 0.40;
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
              scanned: false
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

        const updated = prevBoxes.map(box => {
          // Lane 1: Main Conveyor Belt (Uniform speed: 14% per second)
          if (box.lane === 'MAIN') {
            const nextX = box.x + BELT_SPEED * dt;

            // 1. Entry Arrival Sensor (X ~ 6% to 10%)
            if (box.x < 8 && nextX >= 8) {
              setEntryTriggered(true);
              setTimeout(() => setEntryTriggered(false), 250);
            }

            // 2. Optical Detection Station: Cameras at X = 35% (WELL BEFORE PUSHER at X = 65%)
            if (nextX >= 31 && nextX <= 39) {
              camActive = true;
              ciraActive = true;
              if (!box.scanned) {
                setLastVerdict({
                  status: box.status,
                  defect: box.status === 'REJECT' ? box.damageType : 'CLEAN / INTACT',
                  tracking: box.trackingNumber
                });
              }
            }

            const isBoxScanned = box.scanned || nextX >= 36;

            // 3. Pneumatic Pusher Mechanism at X = 65% (Diverts damaged boxes downward)
            if (box.status === 'REJECT' && box.x < 65 && nextX >= 65) {
              pistonActive = true;
              return {
                ...box,
                x: 65,
                lane: 'EJECTING' as const,
                ejectProgress: 0,
                scanned: true
              };
            }

            // 4. Valid package reaches Main Delivery End Sensor (X = 92%)
            if (nextX >= 92 && box.x < 92) {
              setValidSensorCount(c => c + 1);
              setValidExitTriggered(true);
              setTimeout(() => setValidExitTriggered(false), 350);
            }

            if (nextX >= 100) {
              return { ...box, x: 104, lane: 'EXIT' as const };
            }

            return { ...box, x: nextX, scanned: isBoxScanned };
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
                x: 65
              };
            }

            return { ...box, ejectProgress: nextProg, y: newY };
          }

          // Lane 3: Diverted Reject Conveyor Line (Uniform speed: 14% per second)
          if (box.lane === 'REJECT_LINE') {
            const nextX = box.x + BELT_SPEED * dt;

            // Damaged package reaches Reject End Sensor (X = 92%)
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
        return updated;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isRunning]);

  return (
    <div className="bg-[#0B1526] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col space-y-5">
      {/* 1. Header with Controls & Clean Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center space-x-2.5">
            <span>Conveyor Line & Vision Telemetry</span>
            <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded uppercase font-semibold">
              Live Hardware Feed
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Top & side cameras capture arriving boxes &bull; Optical data relays to CiRA Core for damage detection &bull; Pneumatic pusher diverts compromised parcels
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

      {/* 2. Visual Camera & CiRA Core Data Flow Pipeline (Icon Relay) */}
      <div className="bg-[#070E1A] border border-slate-800 rounded-xl p-3.5 sm:p-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
        {/* Node A: Dual Cameras & Breakbeam */}
        <div className={`p-3 rounded-lg border flex items-center space-x-3 transition-colors ${
          camerasActive ? 'bg-cyan-950/40 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'bg-[#0B1526] border-slate-800'
        }`}>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            camerasActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
          }`}>
            <Camera className={`w-5 h-5 ${camerasActive ? 'animate-pulse' : ''}`} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Inspection Point</span>
            <span className="text-xs font-bold text-white block truncate">Dual 1080p Optical Cameras</span>
            <span className={`text-[10px] font-mono ${camerasActive ? 'text-cyan-400 font-bold' : 'text-slate-500'}`}>
              {camerasActive ? 'CAPTURING FRAMES' : 'STANDBY (READY)'}
            </span>
          </div>
        </div>

        {/* Node B: CiRA Core AI Processing Engine */}
        <div className={`p-3 rounded-lg border flex items-center space-x-3 transition-colors ${
          ciraProcessing ? 'bg-purple-950/40 border-purple-400/80 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-[#0B1526] border-slate-800'
        }`}>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            ciraProcessing ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-400'
          }`}>
            <Cpu className={`w-5 h-5 ${ciraProcessing ? 'animate-spin' : ''}`} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Inference Engine</span>
            <span className="text-xs font-bold text-white block truncate">CiRA Core AI Platform</span>
            <span className={`text-[10px] font-mono ${ciraProcessing ? 'text-purple-400 font-bold' : 'text-slate-500'}`}>
              {ciraProcessing ? 'EVALUATING INTEGRITY' : 'NEURAL NET IDLE'}
            </span>
          </div>
        </div>

        {/* Node C: Pneumatic Pusher Action Dispatch */}
        <div className={`p-3 rounded-lg border flex items-center space-x-3 transition-colors ${
          cylinderFired ? 'bg-red-950/40 border-red-400/80 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-[#0B1526] border-slate-800'
        }`}>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            cylinderFired ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400'
          }`}>
            <Zap className={`w-5 h-5 ${cylinderFired ? 'animate-bounce' : ''}`} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Downstream Diverter</span>
            <span className="text-xs font-bold text-white block truncate">Pneumatic Pusher Cylinder</span>
            <span className={`text-[10px] font-mono ${cylinderFired ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
              {cylinderFired ? 'FIRING 180ms STROKE' : 'POSITION RETRACTED'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Real-Time End Sensor Count Display Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs font-mono">
        {/* Valid Deliverable Packages Sensor */}
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
              <span className="text-[10px] text-slate-400 uppercase block font-medium">Main Line End Sensor</span>
              <span className="text-sm font-bold text-white">Valid / Deliverable Packages</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-3xl font-extrabold text-emerald-400 block">{validSensorCount}</span>
            <span className="text-[10px] text-slate-400">units verified</span>
          </div>
        </div>

        {/* Damaged Packages Sensor */}
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
              <span className="text-[10px] text-slate-400 uppercase block font-medium">Diverted Line End Sensor</span>
              <span className="text-sm font-bold text-white">Damaged / Rejected Packages</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-3xl font-extrabold text-red-400 block">{rejectSensorCount}</span>
            <span className="text-[10px] text-slate-400">units diverted</span>
          </div>
        </div>
      </div>

      {/* 4. Enlarged Top-Down Conveyor Schematic (Height 320px) */}
      <div className="relative w-full h-[320px] bg-[#050B16] border border-slate-800 rounded-xl overflow-hidden select-none">
        
        {/* Floor Grid */}
        <div 
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: 'radial-gradient(#38bdf8 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px'
          }}
        />

        {/* SECTION A: Inbound Entry Sensor (At X = 8%) */}
        <div className="absolute left-[7%] top-[14%] flex flex-col items-center z-20 pointer-events-none">
          <div className="flex items-center space-x-1 mb-1">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-[9px] font-mono text-cyan-300 font-bold uppercase">ENTRY SENSOR</span>
          </div>
          <span className={`w-4 h-4 rounded-full transition-all duration-200 border-2 ${
            entryTriggered 
              ? 'bg-cyan-400 border-white shadow-[0_0_16px_rgba(6,182,212,1)] scale-125' 
              : 'bg-slate-800 border-slate-600'
          }`} />
        </div>

        {/* SECTION B: Main Conveyor Belt (Upper Horizontal Track: Y = 35%, Height = 64px) */}
        <div className="absolute left-0 right-0 top-[28%] h-16 bg-gradient-to-b from-slate-900 via-[#0C172B] to-slate-900 border-y-2 border-slate-700/80 flex items-center shadow-inner">
          {/* Animated Belt Tread Lines */}
          <div className="w-full h-full flex items-center justify-around opacity-25 pointer-events-none">
            {Array.from({ length: 28 }).map((_, i) => (
              <div key={i} className="w-0.5 h-full bg-slate-300" />
            ))}
          </div>

          <div className="absolute left-3 top-1.5 text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider flex items-center space-x-1.5">
            <span>MAIN CONVEYOR BELT (UNIFORM PACE &rarr;)</span>
          </div>
          <div className="absolute right-24 top-1.5 text-[10px] font-mono text-emerald-400 font-bold uppercase">
            DELIVERABLE PACKAGES &rarr;
          </div>
        </div>

        {/* SECTION C: Optical Cameras Inspection Station (Positioned WELL BEFORE pusher at X = 35%) */}
        <div className="absolute left-[30%] top-[10%] w-[12%] h-[120px] pointer-events-none z-10 flex flex-col items-center">
          {/* Top Camera Icon with Flash Indicator */}
          <div className={`p-2 rounded-lg border transition-all duration-200 flex items-center space-x-1.5 mb-1.5 ${
            camerasActive 
              ? 'bg-cyan-500 text-slate-950 border-white shadow-[0_0_16px_rgba(6,182,212,0.8)] scale-110' 
              : 'bg-[#0B1526] text-cyan-400 border-cyan-500/40'
          }`}>
            <Camera className="w-4 h-4" />
            <span className="text-[9px] font-mono font-bold">CAMERA</span>
          </div>

          {/* Optical Beam Cone */}
          <div className={`w-full h-16 border-x-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center ${
            camerasActive ? 'border-cyan-400/80 bg-cyan-500/10' : 'border-slate-700/50 bg-transparent'
          }`}>
            <span className="text-[8px] font-mono text-slate-400 font-bold">OPTICAL ZONE</span>
            <span className="text-[7px] font-mono text-cyan-400">CiRA Relay</span>
          </div>

          {/* Side Camera Icon */}
          <div className={`p-1.5 rounded border transition-all mt-1 flex items-center space-x-1 ${
            camerasActive 
              ? 'bg-purple-500 text-white border-white scale-105' 
              : 'bg-[#0B1526] text-purple-400 border-purple-500/40'
          }`}>
            <Camera className="w-3.5 h-3.5" />
            <span className="text-[8px] font-mono font-bold">SIDE CAM</span>
          </div>
        </div>

        {/* Data Arrow from Inspection Station to Pusher */}
        <div className="absolute left-[43%] top-[34%] w-[18%] flex items-center justify-center space-x-1 pointer-events-none opacity-60">
          <span className="text-[9px] font-mono text-cyan-400 font-semibold tracking-tight">CiRA Core Verdict</span>
          <ArrowRight className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
        </div>

        {/* SECTION D: Pneumatic Pusher Mechanism (Positioned Downstream at X = 65%) */}
        <div className="absolute left-[62%] top-[5%] flex flex-col items-center z-20 pointer-events-none">
          <div className="bg-slate-800 border border-slate-600 px-2 py-0.5 rounded text-[8px] font-mono text-cyan-300 font-bold mb-1 shadow">
            PNEUMATIC PUSHER
          </div>
          {/* Cylinder Block */}
          <div className="w-6 h-8 bg-gradient-to-b from-slate-700 to-slate-900 border-2 border-slate-500 rounded-t flex flex-col items-center justify-center shadow">
            <span className="text-[7px] font-mono text-cyan-400 font-bold">5/2 V</span>
          </div>
          {/* Piston Extension Rod */}
          <div 
            className="w-2.5 bg-slate-300 transition-all duration-150 ease-out flex flex-col items-center shadow-lg"
            style={{ height: cylinderFired ? '52px' : '4px' }}
          >
            {/* Rubber Contact Pad */}
            <div className={`w-8 h-3 rounded-sm transition-colors duration-150 ${
              cylinderFired ? 'bg-red-500 shadow-[0_0_14px_rgba(239,68,68,1)]' : 'bg-slate-400'
            }`} />
          </div>
        </div>

        {/* SECTION E: Diverted Reject Conveyor Line (Lower Track: Y = 72%, Height = 64px) */}
        <div className="absolute left-[58%] right-0 top-[64%] h-16 bg-gradient-to-b from-slate-900 via-[#1C0E16] to-slate-900 border-y-2 border-red-900/70 flex items-center shadow-inner">
          {/* Tread Lines */}
          <div className="w-full h-full flex items-center justify-around opacity-25 pointer-events-none">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="w-0.5 h-full bg-red-400" />
            ))}
          </div>

          <div className="absolute left-3 top-1.5 text-[10px] font-mono text-red-400 font-bold uppercase tracking-wider flex items-center space-x-1.5">
            <span>DIVERTED REJECT CONVEYOR &rarr;</span>
          </div>
          <div className="absolute right-24 top-1.5 text-[10px] font-mono text-red-400 font-bold uppercase">
            DAMAGED REJECT BIN &rarr;
          </div>
        </div>

        {/* SECTION F: Main Delivery End Sensor (Main Line at X = 92%) */}
        <div className="absolute right-[6%] top-[14%] flex flex-col items-center z-20 pointer-events-none">
          <div className="flex items-center space-x-1 mb-1">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase">DELIVERY SENSOR</span>
          </div>
          <span className={`w-4 h-4 rounded-full transition-all duration-200 border-2 ${
            validExitTriggered 
              ? 'bg-emerald-400 border-white shadow-[0_0_16px_rgba(52,211,153,1)] scale-125' 
              : 'bg-slate-800 border-slate-600'
          }`} />
        </div>

        {/* SECTION G: Diverted Reject End Sensor (Reject Line at X = 92%) */}
        <div className="absolute right-[6%] top-[50%] flex flex-col items-center z-20 pointer-events-none">
          <div className="flex items-center space-x-1 mb-1">
            <Radio className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[9px] font-mono text-red-400 font-bold uppercase">REJECT SENSOR</span>
          </div>
          <span className={`w-4 h-4 rounded-full transition-all duration-200 border-2 ${
            rejectExitTriggered 
              ? 'bg-red-400 border-white shadow-[0_0_16px_rgba(239,68,68,1)] scale-125' 
              : 'bg-slate-800 border-slate-600'
          }`} />
        </div>

        {/* SECTION H: Active Uniformly Spaced Moving Boxes */}
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
              {/* Packaging tape graphic */}
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono bg-[#070E1A] border border-slate-800 px-3.5 py-2 rounded-lg gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-medium">Latest Scanned Box:</span>
            <span className="font-bold text-white">{lastVerdict.tracking}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              lastVerdict.status === 'REJECT' ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}>
              {lastVerdict.status === 'REJECT' ? 'COMPROMISED (EJECTED)' : 'INTACT (DELIVERABLE)'}
            </span>
          </div>
          <span className="text-slate-400 text-[11px]">
            CiRA Core Classification: <strong className="text-cyan-300">{lastVerdict.defect}</strong>
          </span>
        </div>
      )}
    </div>
  );
};
