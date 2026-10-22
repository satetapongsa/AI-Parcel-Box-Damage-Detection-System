import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, AlertTriangle, Gauge } from 'lucide-react';
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
  x: number; // in percentage of main belt (0 to 100)
  y: number; // in percentage
  lane: 'MAIN' | 'EJECTING' | 'RETURN_LOOP' | 'STAFF_INSPECTION' | 'EXIT';
  ejectProgress: number; // 0 to 1
  loopProgress: number; // 0 to 1
  divertedAt: string;
}

export const ConveyorTopDownSimulation: React.FC<ConveyorTopDownSimulationProps> = ({
  isRunning,
  onToggleRunning,
  latestParcel
}) => {
  const [boxes, setBoxes] = useState<MovingBox[]>([]);
  const [cylinderFired, setCylinderFired] = useState(false);
  const [pressureBar, setPressureBar] = useState(5.8); // Pneumatic pressure
  const [impactDampening, setImpactDampening] = useState('OPTIMAL'); // Calibration indicator
  const lastSpawnTime = useRef<number>(Date.now());
  const boxCounter = useRef<number>(101);

  // Monitor latestParcel to trigger synchronized box spawn
  useEffect(() => {
    if (!latestParcel) return;
    
    setBoxes(prev => {
      // Avoid duplicate consecutive identical IDs
      if (prev.some(b => b.trackingNumber === latestParcel.trackingNumber)) return prev;
      
      const newBox: MovingBox = {
        id: String(Date.now() + Math.random()),
        trackingNumber: latestParcel.trackingNumber,
        status: latestParcel.status,
        damageType: latestParcel.damageType,
        x: 0,
        y: 38,
        lane: 'MAIN',
        ejectProgress: 0,
        loopProgress: 0,
        divertedAt: latestParcel.time
      };
      return [...prev.slice(-8), newBox];
    });
  }, [latestParcel]);

  // Calibration check for pneumatic cylinder pressure
  useEffect(() => {
    if (pressureBar > 7.0) {
      setImpactDampening('HIGH IMPACT - RISK OF INTERNAL CONTENT DAMAGE');
    } else if (pressureBar < 4.5) {
      setImpactDampening('LOW PRESSURE - RISK OF STALL');
    } else {
      setImpactDampening('CALIBRATED (SMOOTH DAMPENED STROKE)');
    }
  }, [pressureBar]);

  // Main 60FPS physics animation loop
  useEffect(() => {
    if (!isRunning) return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Auto-spawn box if none has spawned for 3.2s
      if (Date.now() - lastSpawnTime.current > 3200) {
        lastSpawnTime.current = Date.now();
        boxCounter.current += 1;
        const isDefect = Math.random() < 0.45;
        const defectTypes = ['DENT', 'TEAR', 'WATER_STAIN', 'WEIGHT_ANOMALY'];
        const pickedDefect = isDefect ? defectTypes[Math.floor(Math.random() * defectTypes.length)] : 'NORMAL';

        const autoBox: MovingBox = {
          id: String(Date.now()),
          trackingNumber: `THA-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(boxCounter.current).padStart(4, '0')}`,
          status: isDefect ? 'REJECT' : 'PASS',
          damageType: pickedDefect,
          x: 0,
          y: 38,
          lane: 'MAIN',
          ejectProgress: 0,
          loopProgress: 0,
          divertedAt: new Date().toLocaleTimeString('en-US', { hour12: false })
        };
        setBoxes(prev => [...prev.slice(-8), autoBox]);
      }

      setBoxes(prevBoxes => {
        let pistonFired = false;

        const updated = prevBoxes.map(box => {
          // Lane 1: Main Conveyor Belt (Left to Right)
          if (box.lane === 'MAIN') {
            const nextX = box.x + 18 * dt; // speed 18% per sec

            // Inspection Point & Pneumatic Diverter zone at X = 50%
            if (box.status === 'REJECT' && nextX >= 50 && box.x < 50) {
              pistonFired = true;
              return {
                ...box,
                x: 50,
                lane: 'EJECTING' as const,
                ejectProgress: 0
              };
            }

            // Clean pass forward
            if (nextX >= 98) {
              return { ...box, x: 102, lane: 'EXIT' as const };
            }

            return { ...box, x: nextX };
          }

          // Lane 2: Pneumatic Cylinder Stroke pushing damaged box downward (Y: 38% -> 76%)
          if (box.lane === 'EJECTING') {
            pistonFired = true;
            const nextEject = Math.min(1, box.ejectProgress + 3.0 * dt); // fast 300ms stroke
            const newY = 38 + (76 - 38) * nextEject;

            if (nextEject >= 1) {
              return {
                ...box,
                lane: 'RETURN_LOOP' as const,
                y: 76,
                x: 50,
                loopProgress: 0
              };
            }

            return { ...box, ejectProgress: nextEject, y: newY };
          }

          // Lane 3: Return Conveyor Loop back to staff inspection (Right to Left: X = 50% -> 12%)
          if (box.lane === 'RETURN_LOOP') {
            const nextX = box.x - 16 * dt; // moves backwards towards manual quarantine station
            if (nextX <= 14) {
              return {
                ...box,
                x: 14,
                y: 76,
                lane: 'STAFF_INSPECTION' as const
              };
            }
            return { ...box, x: nextX };
          }

          // Lane 4: Staff Inspection Holding Area
          if (box.lane === 'STAFF_INSPECTION') {
            const nextProg = box.loopProgress + 0.3 * dt;
            if (nextProg >= 1) {
              return { ...box, x: -10, lane: 'EXIT' as const };
            }
            return { ...box, loopProgress: nextProg };
          }

          return box;
        }).filter(b => b.lane !== 'EXIT');

        if (pistonFired) {
          setCylinderFired(true);
        } else {
          setCylinderFired(false);
        }

        return updated;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isRunning]);

  return (
    <div className="bg-[#08101E] border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden font-mono">
      {/* Simulation Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3 mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-wide uppercase flex items-center space-x-2">
              <span>Top-Down Conveyor & Pneumatic Diverter Simulation</span>
            </h2>
            <p className="text-[11px] text-slate-400 font-sans">
              Damaged parcels are ejected via high-speed pneumatic stroke onto the return loop for staff re-inspection
            </p>
          </div>
        </div>

        {/* Cylinder Pressure & Belt Play/Pause */}
        <div className="flex items-center space-x-3">
          {/* Pressure Controller & Calibration Status */}
          <div className="flex items-center bg-[#050B14] border border-slate-700/80 px-2.5 py-1 rounded-lg text-xs">
            <Gauge className="w-3.5 h-3.5 text-cyan-400 mr-1.5" />
            <span className="text-slate-400 mr-2 text-[11px]">Pressure:</span>
            <input
              type="range"
              min="3.0"
              max="9.0"
              step="0.2"
              value={pressureBar}
              onChange={(e) => setPressureBar(Number(e.target.value))}
              className="w-16 h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
              title="Calibrate pneumatic cylinder pressure (Optimal: 5.5 - 6.5 Bar)"
            />
            <span className="text-white font-bold ml-2 text-xs">{pressureBar.toFixed(1)} Bar</span>
          </div>

          {onToggleRunning && (
            <button
              onClick={onToggleRunning}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow ${
                isRunning
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isRunning ? 'Pause Sim' : 'Run Sim'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Calibration Alert Warning Banner */}
      <div className={`mb-4 px-3 py-1.5 rounded-lg text-[11px] font-sans flex items-center justify-between border ${
        pressureBar > 7.0 
          ? 'bg-red-950/40 border-red-500/60 text-red-300 animate-pulse'
          : pressureBar < 4.5
          ? 'bg-amber-950/40 border-amber-500/60 text-amber-300'
          : 'bg-cyan-950/30 border-cyan-500/40 text-cyan-300'
      }`}>
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>
            <strong>Pneumatic Pusher Calibration:</strong> {impactDampening}
          </span>
        </div>
        <span className="font-mono text-[10px] hidden md:inline text-slate-400">
          Optimal stroke: 180ms • Space-efficient footprint
        </span>
      </div>

      {/* Main 2D Top-Down Schematic Canvas Area */}
      <div className="relative w-full h-[260px] sm:h-[280px] bg-[#040811] border border-slate-800 rounded-xl overflow-hidden select-none">
        
        {/* Subtle Background Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: 'radial-gradient(#38bdf8 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        {/* 1. Main Conveyor Belt (Upper Horizontal Track: Y ~38%) */}
        <div className="absolute left-0 right-0 top-[34%] h-14 bg-gradient-to-b from-slate-900 via-[#0B1526] to-slate-900 border-y-2 border-slate-700/80 flex items-center">
          {/* Animated Belt Tread Lines */}
          <div className="w-full h-full flex items-center justify-around opacity-20 pointer-events-none">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="w-0.5 h-full bg-slate-400" />
            ))}
          </div>

          {/* Direction Arrows */}
          <div className="absolute left-4 top-1 text-[10px] text-cyan-400 font-bold uppercase tracking-widest flex items-center space-x-1">
            <span>MAIN CONVEYOR &rarr; INTACT PASS LINE</span>
          </div>

          <div className="absolute right-4 top-1 text-[10px] text-emerald-400 font-bold font-mono">
            VERIFIED PASS OUTLET &rarr;
          </div>
        </div>

        {/* 2. Inspection Scanning Tunnel (X: ~34% to 46%) */}
        <div className="absolute left-[33%] top-[29%] w-[15%] h-[68px] bg-cyan-950/40 border-2 border-cyan-500/60 rounded-lg flex flex-col items-center justify-center z-10 backdrop-blur-sm shadow-[0_0_20px_rgba(6,182,212,0.15)]">
          <div className="flex items-center space-x-1 text-[10px] text-cyan-300 font-bold uppercase">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping mr-1" />
            <span>AI SCAN ZONE</span>
          </div>
          <span className="text-[9px] text-slate-400">IR & Dual Optical Cam</span>
        </div>

        {/* 3. Pneumatic Cylinder Pusher Assembly (At X: 50%, top side) */}
        <div className="absolute left-[49.5%] top-[12%] flex flex-col items-center z-20">
          <div className="bg-slate-800 border border-slate-600 px-2 py-0.5 rounded text-[9px] text-cyan-300 font-bold mb-1 shadow">
            PNEUMATIC CYLINDER
          </div>
          {/* Cylinder Body */}
          <div className="w-7 h-10 bg-gradient-to-b from-slate-700 to-slate-900 border-2 border-slate-500 rounded-t flex flex-col items-center justify-center">
            <div className="w-4 h-1 bg-cyan-400/80 mb-1 rounded" />
            <div className="text-[8px] text-slate-300 font-bold">5/2 V</div>
          </div>
          {/* Piston Rod & Pusher Pad */}
          <div 
            className="w-2.5 bg-slate-300 transition-all duration-150 ease-out flex flex-col items-center shadow-lg"
            style={{
              height: cylinderFired ? '48px' : '6px'
            }}
          >
            {/* Soft Rubber Impact Bumper */}
            <div className={`w-8 h-3 rounded-sm transition-colors duration-150 ${
              cylinderFired ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)]' : 'bg-amber-500'
            }`} />
          </div>
        </div>

        {/* 4. Divert Chute & Deflection Guide (At X: ~50%, between belts) */}
        <div className="absolute left-[48%] top-[54%] w-14 h-11 border-l-2 border-r-2 border-dashed border-red-500/50 flex items-center justify-center pointer-events-none">
          <span className="text-[9px] text-red-400/80 font-bold rotate-90">
            DIVERT &darr;
          </span>
        </div>

        {/* 5. Return Conveyor Loop Belt (Lower Horizontal Track: Y ~76%) */}
        <div className="absolute left-[10%] right-[38%] top-[72%] h-14 bg-gradient-to-b from-slate-900 via-[#130E1F] to-slate-900 border-y-2 border-amber-600/60 rounded-l-xl flex items-center">
          {/* Tread Lines */}
          <div className="w-full h-full flex items-center justify-around opacity-20 pointer-events-none">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="w-0.5 h-full bg-amber-400" />
            ))}
          </div>

          <div className="absolute right-4 top-1 text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center space-x-1">
            <span>&larr; DEFECT RETURN LOOP CONVEYOR</span>
          </div>
        </div>

        {/* 6. Staff Re-Inspection Station (Left end of return loop: X ~6% to 16%) */}
        <div className="absolute left-[4%] top-[68%] w-[12%] h-[68px] bg-amber-950/40 border-2 border-amber-500/70 rounded-xl flex flex-col items-center justify-center z-10 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          <span className="text-[9px] font-bold text-amber-300 uppercase text-center leading-tight">
            STAFF MANUAL INSPECTION
          </span>
          <span className="text-[8px] text-slate-400 mt-0.5">Quarantine Repack</span>
        </div>

        {/* 7. Active Animated Moving Boxes */}
        {boxes.map(box => {
          const isReject = box.status === 'REJECT';
          const isDiverting = box.lane === 'EJECTING';

          return (
            <div
              key={box.id}
              className={`absolute w-9 h-9 rounded-md flex flex-col items-center justify-center transition-all duration-75 shadow-xl font-mono text-[8px] z-20 ${
                isReject
                  ? 'bg-gradient-to-br from-red-600 to-amber-700 text-white border-2 border-red-300'
                  : 'bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 text-amber-950 border border-amber-600 font-bold'
              } ${isDiverting ? 'scale-110 shadow-red-500/50 ring-2 ring-red-400' : ''}`}
              style={{
                left: `${box.x}%`,
                top: `${box.y}%`,
                transform: `translate(-50%, -50%) rotate(${isDiverting ? '12deg' : '0deg'})`
              }}
            >
              {/* Tape strip graphic */}
              <div className="w-full h-1 bg-amber-700/40 mb-0.5" />
              <span className="truncate max-w-[32px] font-extrabold">
                {isReject ? box.damageType.slice(0, 4) : 'OK'}
              </span>
              <span className="text-[6px] opacity-75">
                {box.trackingNumber.slice(-4)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend & Engineering Note */}
      <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2 border-t border-slate-800/80 pt-2.5">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-amber-400 inline-block border border-amber-600" />
            <span>Intact Box (Main Belt Pass)</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-red-600 inline-block border border-red-300" />
            <span>Damaged Box (Pneumatic Ejected)</span>
          </span>
        </div>
        <span className="text-slate-500 text-[10px]">
          Pneumatic pusher saves conveyor footprint &bull; Calibrated dampening prevents package shock
        </span>
      </div>
    </div>
  );
};
