import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  CheckCircle2, 
  AlertOctagon, 
  Cpu, 
  Box as BoxIcon
} from 'lucide-react';

export interface ConveyorSimulationProps {
  conveyorSpeed?: number;
  inspectionStatus?: string;
  parcelStatus?: 'PASS' | 'REJECT' | 'SCANNING' | 'IDLE';
  simulationMode?: 'AUTO' | 'MANUAL' | 'DEMO';
  currentParcel?: {
    id: string;
    trackingNumber: string;
    damageType: string;
    status: 'PASS' | 'REJECT';
    weight: number;
    aiConfidence: number;
  };
  onInspectComplete?: (result: 'PASS' | 'REJECT', damageType: string) => void;
}

interface SimulatedParcel {
  id: string;
  trackingNumber: string;
  status: 'PASS' | 'REJECT';
  damageType: string;
  progress: number; // 0 to 100%
  phase: 'ENTRY' | 'IR_TRIGGER' | 'SCANNING' | 'DECISION' | 'EXITING' | 'REJECTED';
  weight: number;
  aiConfidence: number;
  width: number;
  height: number;
  depth: number;
}

export const ConveyorSimulation: React.FC<ConveyorSimulationProps> = ({
  conveyorSpeed = 1,
  parcelStatus: _parcelStatus,
  simulationMode = 'AUTO',
  currentParcel: _currentParcel,
  onInspectComplete
}) => {
  const [isRunning, setIsRunning] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(conveyorSpeed);
  const [parcels, setParcels] = useState<SimulatedParcel[]>([]);
  const [activeScan, setActiveScan] = useState<SimulatedParcel | null>(null);
  const [scannerLaser, setScannerLaser] = useState(false);
  const [sortingArmActive, setSortingArmActive] = useState(false);
  const [sensorIrTripped, setSensorIrTripped] = useState(false);
  const [stats, setStats] = useState({ total: 142, pass: 128, reject: 14 });

  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const spawnTimerRef = useRef<number>(0);

  // Sync external speed prop
  useEffect(() => {
    setSpeedMultiplier(conveyorSpeed);
  }, [conveyorSpeed]);

  // Helper to generate realistic parcel tracking
  const createNewParcel = (forcedType?: 'PASS' | 'TEAR' | 'DENT' | 'WATER'): SimulatedParcel => {
    const isDefect = forcedType ? forcedType !== 'PASS' : Math.random() < 0.35;
    const damageTypes = ['TEAR', 'DENT', 'WATER_STAIN', 'CRUSHED'];
    const damageType = isDefect 
      ? (forcedType && forcedType !== 'PASS' ? forcedType : damageTypes[Math.floor(Math.random() * damageTypes.length)])
      : 'NORMAL';
    
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return {
      id: `PCL-${Date.now()}-${randomNum}`,
      trackingNumber: `TH-${Math.floor(800000000 + Math.random() * 100000000)}`,
      status: isDefect ? 'REJECT' : 'PASS',
      damageType,
      progress: 0,
      phase: 'ENTRY',
      weight: parseFloat((1.2 + Math.random() * 3.5).toFixed(2)),
      aiConfidence: isDefect ? parseFloat((92 + Math.random() * 7.5).toFixed(1)) : parseFloat((96 + Math.random() * 3.9).toFixed(1)),
      width: Math.floor(64 + Math.random() * 20),
      height: Math.floor(48 + Math.random() * 16),
      depth: Math.floor(54 + Math.random() * 18),
    };
  };

  // Trigger manual spawn
  const handleManualSpawn = (type: 'PASS' | 'TEAR' | 'DENT' | 'WATER') => {
    if (parcels.length >= 3) return; // limit active on belt
    const p = createNewParcel(type);
    setParcels(prev => [...prev, p]);
  };

  // Main animation loop using requestAnimationFrame
  useEffect(() => {
    const updatePhysics = (time: number) => {
      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (isRunning) {
        // Auto spawn timer if mode is AUTO
        spawnTimerRef.current += delta * speedMultiplier;
        if (simulationMode === 'AUTO' && spawnTimerRef.current > 3.5) {
          spawnTimerRef.current = 0;
          setParcels(prev => {
            if (prev.length < 3) {
              return [...prev, createNewParcel()];
            }
            return prev;
          });
        }

        // Update existing parcels progress
        setParcels(prevParcels => {
          return prevParcels.map(p => {
            let nextProgress = p.progress;
            let nextPhase = p.phase;

            // Speed factor
            const baseSpeed = 18 * speedMultiplier; // % per sec

            // IR Sensor Checkpoint (at 22%)
            if (p.progress >= 20 && p.progress <= 26) {
              setSensorIrTripped(true);
            } else if (p.progress > 26 && p.progress < 30) {
              setSensorIrTripped(false);
            }

            // AI Scan Checkpoint (at 45% - 55%)
            if (p.progress >= 42 && p.progress <= 55) {
              nextPhase = 'SCANNING';
              setScannerLaser(true);
              setActiveScan(p);
              // Pause slightly at scan point for realism
              nextProgress += baseSpeed * 0.45 * delta;
            } else {
              if (activeScan?.id === p.id) {
                setScannerLaser(false);
                setActiveScan(null);
                if (onInspectComplete && p.phase === 'SCANNING') {
                  onInspectComplete(p.status, p.damageType);
                }
              }
              nextProgress += baseSpeed * delta;
            }

            // Sorting Gate / Actuator Checkpoint (at 70%)
            if (p.progress >= 68 && p.progress <= 78) {
              nextPhase = 'DECISION';
              if (p.status === 'REJECT') {
                setSortingArmActive(true);
              } else {
                setSortingArmActive(false);
              }
            } else {
              if (p.progress > 78 && p.progress < 82) {
                setSortingArmActive(false);
              }
            }

            // Exit or Reject destination
            if (p.progress > 75) {
              nextPhase = p.status === 'REJECT' ? 'REJECTED' : 'EXITING';
            }

            return {
              ...p,
              progress: nextProgress,
              phase: nextPhase
            };
          }).filter(p => {
            // Keep parcels until off-screen
            if (p.progress >= 105) {
              setStats(s => ({
                total: s.total + 1,
                pass: p.status === 'PASS' ? s.pass + 1 : s.pass,
                reject: p.status === 'REJECT' ? s.reject + 1 : s.reject
              }));
              return false;
            }
            return true;
          });
        });
      }

      animRef.current = requestAnimationFrame(updatePhysics);
    };

    animRef.current = requestAnimationFrame(updatePhysics);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isRunning, speedMultiplier, simulationMode, activeScan, onInspectComplete]);

  return (
    <div className="w-full bg-[#080E1A] border border-[#1E293B] rounded-xl p-4 md:p-6 shadow-2xl relative overflow-hidden font-sans">
      
      {/* 1. Header Controls & Telemetry Overlay */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-[#1E293B] pb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <BoxIcon className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm md:text-base font-bold text-white tracking-wide">
                3D Edge AI Conveyor Inspection Simulation
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                PURE CSS 3D
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Station SORT-01 • Belt Speed: {(0.8 * speedMultiplier).toFixed(1)} m/s • Sensor Grid Active
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Simulation Toggle */}
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center space-x-1.5 shadow ${
              isRunning 
                ? 'bg-amber-600/80 hover:bg-amber-500 text-white border border-amber-500/40' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/40'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'Pause Belt' : 'Run Belt'}</span>
          </button>

          {/* Speed Select */}
          <div className="flex items-center bg-[#0F172A] border border-[#26354A] rounded-lg p-1 space-x-1 text-xs font-mono">
            {[1, 1.5, 2].map(s => (
              <button
                key={s}
                onClick={() => setSpeedMultiplier(s)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  speedMultiplier === s 
                    ? 'bg-sky-500 text-slate-950 shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Spawn Test Buttons */}
          <div className="hidden sm:flex items-center space-x-1">
            <button
              onClick={() => handleManualSpawn('PASS')}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 hover:bg-emerald-900 text-emerald-400 font-mono text-xs font-semibold transition"
            >
              + Normal
            </button>
            <button
              onClick={() => handleManualSpawn('TEAR')}
              className="px-2.5 py-1.5 rounded-lg bg-red-950/80 border border-red-500/40 hover:bg-red-900 text-red-400 font-mono text-xs font-semibold transition"
            >
              + Defect
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN 3D CONVEYOR SIMULATION CONTAINER */}
      <div 
        className="relative w-full h-[320px] sm:h-[380px] md:h-[420px] bg-gradient-to-b from-[#09111E] via-[#0D1829] to-[#060B14] rounded-xl border border-[#1E293B] overflow-hidden flex items-center justify-center select-none"
        style={{ perspective: '1100px' }}
      >

        {/* Ambient Industrial Grid Background */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(56, 189, 248, 0.15) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(56, 189, 248, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />

        {/* Spotlight overhead gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-[45%] -translate-x-1/2 w-48 h-48 bg-purple-500/10 blur-2xl pointer-events-none" />

        {/* 3D SCENE STAGE (Perspected transformation) */}
        <div 
          className="relative w-[92%] max-w-[1100px] h-[220px] sm:h-[260px] md:h-[280px] transition-all duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'rotateX(24deg) rotateY(-8deg) rotateZ(0deg)',
          }}
        >

          {/* A. CONVEYOR BELT METALLIC BASE FRAME */}
          <div 
            className="absolute bottom-6 left-0 right-0 h-16 bg-gradient-to-r from-[#111C2D] via-[#1A293E] to-[#111C2D] rounded-lg border-b-4 border-slate-900 shadow-2xl flex items-center justify-between px-4"
            style={{
              transform: 'translateZ(-10px)',
              boxShadow: '0 25px 40px -10px rgba(0,0,0,0.8), inset 0 2px 4px rgba(255,255,255,0.1)'
            }}
          >
            {/* Belt Legs */}
            <div className="absolute -bottom-16 left-6 w-5 h-16 bg-gradient-to-b from-slate-800 to-slate-950 border-r border-slate-700 shadow-lg" />
            <div className="absolute -bottom-16 left-1/3 w-5 h-16 bg-gradient-to-b from-slate-800 to-slate-950 border-r border-slate-700 shadow-lg" />
            <div className="absolute -bottom-16 right-1/3 w-5 h-16 bg-gradient-to-b from-slate-800 to-slate-950 border-r border-slate-700 shadow-lg" />
            <div className="absolute -bottom-16 right-6 w-5 h-16 bg-gradient-to-b from-slate-800 to-slate-950 border-r border-slate-700 shadow-lg" />
          </div>

          {/* B. MOVING CONVEYOR BELT TRACK SURFACE */}
          <div 
            className="absolute bottom-14 left-0 right-0 h-24 rounded-lg border-t border-b border-slate-700 overflow-hidden shadow-inner"
            style={{
              backgroundColor: '#0F1724',
              backgroundImage: `repeating-linear-gradient(
                90deg,
                #0F1724 0px,
                #0F1724 16px,
                #182335 16px,
                #182335 20px,
                #090E17 20px,
                #090E17 24px
              )`,
              backgroundPositionX: isRunning ? '0px' : '0px',
              animation: isRunning ? `conveyorMove ${2.4 / speedMultiplier}s linear infinite` : 'none',
              transform: 'rotateX(55deg) translateZ(12px)',
              boxShadow: 'inset 0 0 15px rgba(0,0,0,0.9)'
            }}
          />

          {/* C. ROTATING ROLLERS UNDER BELT */}
          <div className="absolute bottom-11 left-2 right-2 flex justify-between px-2 pointer-events-none">
            {Array.from({ length: 18 }).map((_, idx) => (
              <div 
                key={idx} 
                className="w-3 h-3 rounded-full bg-gradient-to-r from-slate-600 via-slate-400 to-slate-800 border border-slate-900 shadow-sm"
                style={{
                  transform: `rotate(${isRunning ? (Date.now() / 10) % 360 : 0}deg)`
                }}
              />
            ))}
          </div>

          {/* D. CHECKPOINT 1: IR BREAKBEAM SENSOR TOWER (X = 22%) */}
          <div 
            className="absolute bottom-16 left-[22%] -translate-x-1/2 w-8 h-44 pointer-events-none flex flex-col items-center justify-between"
            style={{ transform: 'translateZ(30px)' }}
          >
            {/* Top IR Arch */}
            <div className="w-10 h-3 bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 rounded-t shadow" />
            
            {/* Laser Line */}
            <div className={`w-0.5 h-full transition-all duration-150 ${
              sensorIrTripped 
                ? 'bg-amber-400 shadow-[0_0_12px_#f59e0b]' 
                : 'bg-red-500/70 shadow-[0_0_8px_#ef4444]'
            }`} />

            {/* Sensor Status Indicator */}
            <div className={`w-2.5 h-2.5 rounded-full border border-black ${
              sensorIrTripped ? 'bg-amber-400 animate-ping' : 'bg-red-500'
            }`} />

            <div className="absolute -top-7 text-[9px] font-mono font-bold text-slate-400 bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">
              IR BEAM
            </div>
          </div>

          {/* E. CHECKPOINT 2: DUAL CAMERA & AI VISION INSPECTION TUNNEL (X = 48%) */}
          <div 
            className="absolute bottom-14 left-[48%] -translate-x-1/2 w-32 h-52 pointer-events-none flex flex-col items-center justify-between z-20"
            style={{ transform: 'translateZ(40px)' }}
          >
            {/* Camera Gantry Arch Frame */}
            <div className="w-40 h-8 bg-gradient-to-r from-[#1E293B] via-[#0F172A] to-[#1E293B] border-2 border-[#334155] rounded-t-xl shadow-2xl flex items-center justify-around px-3 relative">
              {/* Dual Camera Lenses */}
              <div className="w-4 h-4 rounded-full bg-slate-950 border-2 border-sky-400 flex items-center justify-center shadow-inner">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              </div>
              <div className="w-5 h-5 rounded-full bg-slate-950 border-2 border-purple-400 flex items-center justify-center shadow-inner">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              </div>
              <div className="w-4 h-4 rounded-full bg-slate-950 border-2 border-sky-400 flex items-center justify-center shadow-inner">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              </div>

              {/* Status Header Badge */}
              <div className="absolute -top-6 bg-[#0B1322] border border-[#26354A] px-2 py-0.5 rounded text-[9px] font-mono font-bold text-sky-300">
                CiRA VISION GANTRY
              </div>
            </div>

            {/* Side Camera Pillars */}
            <div className="w-full flex justify-between h-full px-1">
              <div className="w-3 h-full bg-gradient-to-b from-slate-700 to-slate-900 border-r border-slate-800" />
              <div className="w-3 h-full bg-gradient-to-b from-slate-700 to-slate-900 border-l border-slate-800" />
            </div>

            {/* AI LASER SCAN PLANE EFFECT (sweeps down when scanning) */}
            {scannerLaser && (
              <div className="absolute top-8 left-2 right-2 bottom-4 pointer-events-none overflow-hidden">
                <div 
                  className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_#06b6d4] animate-scanLaser" 
                />
                <div className="w-full h-full bg-cyan-500/10 border-x border-cyan-400/40 transform -skew-x-12" />
              </div>
            )}
          </div>

          {/* F. CHECKPOINT 3: PNEUMATIC ACTUATOR & REJECT DIVERTER ARM (X = 72%) */}
          <div 
            className="absolute bottom-16 left-[72%] -translate-x-1/2 w-12 h-36 pointer-events-none z-20"
            style={{ transform: 'translateZ(35px)' }}
          >
            {/* Actuator Cylinder Box */}
            <div className="w-10 h-14 bg-gradient-to-b from-slate-800 to-slate-950 border border-slate-700 rounded shadow-xl p-1 relative">
              <div className="text-[8px] font-mono font-bold text-slate-400 text-center">AIR PNEUMATIC</div>
              <div className={`w-2 h-2 rounded-full mx-auto mt-1 ${sortingArmActive ? 'bg-red-500 animate-ping' : 'bg-slate-600'}`} />
            </div>

            {/* Diverter Arm (Swings out across belt when sortingArmActive) */}
            <div 
              className="absolute top-10 left-4 w-28 h-4 bg-gradient-to-r from-amber-600 via-amber-500 to-red-600 border border-black rounded shadow-2xl origin-left transition-transform duration-300 flex items-center justify-center"
              style={{
                transform: sortingArmActive ? 'rotateY(-42deg) rotateX(10deg)' : 'rotateY(0deg)',
              }}
            >
              <span className="text-[8px] font-mono font-black text-slate-950 tracking-tighter uppercase">
                {sortingArmActive ? 'PNEUMATIC REJECT' : 'RAIL'}
              </span>
            </div>

            {/* REJECT QUARANTINE BIN (Placed on the side) */}
            <div 
              className="absolute -bottom-10 left-16 w-28 h-20 bg-gradient-to-b from-red-950/80 to-slate-950 border-2 border-dashed border-red-500/60 rounded-lg p-2 shadow-2xl"
              style={{ transform: 'rotateX(40deg)' }}
            >
              <div className="text-[9px] font-mono font-bold text-red-400 flex items-center space-x-1">
                <AlertOctagon className="w-3 h-3" />
                <span>QUARANTINE BIN</span>
              </div>
              <div className="text-[8px] text-slate-500 font-mono mt-1">REJECTED PARCELS ONLY</div>
            </div>
          </div>

          {/* G. RENDER DYNAMIC 3D PARCEL BOXES ON BELT */}
          {parcels.map(p => {
            // Calculate 3D position based on progress %
            // Belt width is 100%, progress is 0 -> 100
            const leftPercent = p.progress;
            
            // Defect visual styling
            const isReject = p.status === 'REJECT';
            
            // Reject diversion offset (slides diagonally off belt into bin if REJECTED at >72%)
            let rejectYOffset = 0;
            let rejectZOffset = 0;
            if (p.progress > 72 && isReject) {
              const rejectProgress = (p.progress - 72) / 28;
              rejectYOffset = rejectProgress * 45; // move down into bin
              rejectZOffset = rejectProgress * 40; // move forward out of belt
            }

            return (
              <div
                key={p.id}
                className="absolute bottom-20 transition-transform duration-75 pointer-events-none"
                style={{
                  left: `${leftPercent}%`,
                  transform: `translateX(-50%) translateY(${rejectYOffset}px) translateZ(${20 + rejectZOffset}px)`,
                  zIndex: Math.floor(leftPercent) + 10
                }}
              >
                {/* CSS 3D CUBOID CARDBOARD BOX */}
                <div 
                  className="relative transition-all duration-300"
                  style={{
                    width: `${p.width}px`,
                    height: `${p.height}px`,
                    transformStyle: 'preserve-3d',
                    transform: 'rotateX(-12deg) rotateY(18deg) rotateZ(0deg)',
                  }}
                >

                  {/* Top Face */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-tr from-[#B38B57] via-[#C9A26D] to-[#997343] border border-[#7D5C32] rounded-xs shadow-md p-1 flex flex-col justify-between overflow-hidden"
                    style={{
                      height: `${p.depth}px`,
                      transform: `rotateX(90deg) translateZ(${p.height / 2}px)`
                    }}
                  >
                    {/* Tape & Shipping Label */}
                    <div className="w-full h-2 bg-[#D4C39D]/70 border-y border-[#91764B] shadow-inner" />
                    <div className="bg-white/95 text-[7px] font-mono text-slate-900 p-0.5 rounded shadow max-w-[80%] border border-slate-400">
                      <div className="font-bold truncate">{p.trackingNumber}</div>
                      <div className="text-[6px] text-slate-600">TH-EXPRESS • AIR</div>
                    </div>
                  </div>

                  {/* Front Face */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-b from-[#C49C67] via-[#A8814F] to-[#8C6737] border border-[#6E5028] rounded-xs p-1.5 flex flex-col justify-between shadow-xl"
                    style={{
                      transform: `translateZ(${p.depth / 2}px)`
                    }}
                  >
                    {/* Fragile & Barcode Sticker */}
                    <div className="flex items-center justify-between">
                      <span className="bg-red-600 text-white text-[6px] font-bold px-1 rounded uppercase tracking-tighter">FRAGILE</span>
                      <div className="w-8 h-2 bg-slate-900 flex items-center justify-around px-0.5">
                        <div className="w-0.5 h-full bg-white" />
                        <div className="w-1 h-full bg-white" />
                        <div className="w-0.5 h-full bg-white" />
                        <div className="w-0.5 h-full bg-white" />
                      </div>
                    </div>

                    {/* Defect Visual Overlays */}
                    {isReject && (
                      <div className="absolute inset-0 bg-red-950/40 border-2 border-red-500/80 rounded flex items-center justify-center">
                        <span className="bg-red-600 text-white font-mono font-black text-[8px] px-1 py-0.5 rounded shadow uppercase animate-pulse">
                          {p.damageType}
                        </span>
                      </div>
                    )}

                    <div className="text-[7px] font-mono text-amber-950/80 font-bold">
                      {p.weight} KG
                    </div>
                  </div>

                  {/* Right Face */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-b from-[#9E7A4A] to-[#785930] border border-[#593E1D]"
                    style={{
                      width: `${p.depth}px`,
                      transform: `rotateY(90deg) translateZ(${p.width - p.depth / 2}px)`
                    }}
                  />

                  {/* Left Face */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-b from-[#B08A56] to-[#876538] border border-[#593E1D]"
                    style={{
                      width: `${p.depth}px`,
                      transform: `rotateY(-90deg) translateZ(${p.depth / 2}px)`
                    }}
                  />

                  {/* Status Ring Glow underneath parcel */}
                  <div 
                    className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-full h-3 rounded-full blur-sm transition-all ${
                      p.phase === 'SCANNING'
                        ? 'bg-cyan-400/80 scale-125'
                        : isReject && p.progress > 55
                        ? 'bg-red-500/80 scale-110'
                        : 'bg-emerald-400/60'
                    }`}
                    style={{ transform: 'rotateX(90deg)' }}
                  />

                  {/* Real-time AI Bounding Box Callout when scanning */}
                  {p.phase === 'SCANNING' && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-950/90 text-cyan-300 border border-cyan-500 px-2 py-0.5 rounded text-[9px] font-mono font-bold whitespace-nowrap shadow-2xl flex items-center space-x-1 animate-bounce z-30">
                      <Cpu className="w-3 h-3 text-cyan-400 animate-spin" />
                      <span>AI SCAN: {p.aiConfidence}%</span>
                    </div>
                  )}

                  {/* Final Result Badge */}
                  {p.progress > 55 && (
                    <div className={`absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-mono font-black shadow-xl z-30 flex items-center space-x-1 ${
                      isReject 
                        ? 'bg-red-600 text-white border border-red-300 animate-pulse' 
                        : 'bg-emerald-600 text-white border border-emerald-300'
                    }`}>
                      {isReject ? <AlertOctagon className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                      <span>{p.status}</span>
                    </div>
                  )}

                </div>
              </div>
            );
          })}

        </div>

      </div>

      {/* 3. SIMULATION TELEMETRY FOOTER */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
        <div className="bg-[#0B1322] p-2.5 rounded-lg border border-[#1E293B] flex items-center justify-between">
          <span className="text-slate-400 text-[10px]">INSPECTED COUNT</span>
          <span className="font-bold text-white text-sm">{stats.total}</span>
        </div>
        <div className="bg-[#0B1322] p-2.5 rounded-lg border border-[#1E293B] flex items-center justify-between">
          <span className="text-slate-400 text-[10px]">PASS RATE</span>
          <span className="font-bold text-emerald-400 text-sm">
            {((stats.pass / (stats.total || 1)) * 100).toFixed(1)}%
          </span>
        </div>
        <div className="bg-[#0B1322] p-2.5 rounded-lg border border-[#1E293B] flex items-center justify-between">
          <span className="text-slate-400 text-[10px]">REJECT COUNT</span>
          <span className="font-bold text-red-400 text-sm">{stats.reject}</span>
        </div>
        <div className="bg-[#0B1322] p-2.5 rounded-lg border border-[#1E293B] flex items-center justify-between">
          <span className="text-slate-400 text-[10px]">GATE ACTUATOR</span>
          <span className={`font-bold text-xs ${sortingArmActive ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`}>
            {sortingArmActive ? 'ENGAGED' : 'READY'}
          </span>
        </div>
      </div>

      {/* Inline Keyframe CSS for belt movement and laser sweep */}
      <style>{`
        @keyframes conveyorMove {
          0% { background-position-x: 0px; }
          100% { background-position-x: 48px; }
        }
        @keyframes scanLaser {
          0% { transform: translateY(0%); opacity: 0.8; }
          50% { transform: translateY(1800%); opacity: 1; }
          100% { transform: translateY(0%); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};
