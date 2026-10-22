import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
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
  x: number; // percentage
  y: number; // percentage
  lane: 'MAIN' | 'EJECTING' | 'REJECT_LINE' | 'EXIT';
  ejectProgress: number;
}

export const ConveyorTopDownSimulation: React.FC<ConveyorTopDownSimulationProps> = ({
  isRunning,
  onToggleRunning,
  latestParcel
}) => {
  const [boxes, setBoxes] = useState<MovingBox[]>([]);
  const [cylinderFired, setCylinderFired] = useState(false);
  const [entryTriggered, setEntryTriggered] = useState(false);
  const [validExitTriggered, setValidExitTriggered] = useState(false);
  const [rejectExitTriggered, setRejectExitTriggered] = useState(false);

  // Optical sensor counter tallies
  const [validSensorCount, setValidSensorCount] = useState(0);
  const [rejectSensorCount, setRejectSensorCount] = useState(0);

  const lastSpawnTime = useRef<number>(Date.now());
  const boxCounter = useRef<number>(101);

  // Sync with live inspection engine
  useEffect(() => {
    if (!latestParcel) return;
    setBoxes(prev => {
      if (prev.some(b => b.trackingNumber === latestParcel.trackingNumber)) return prev;
      const newBox: MovingBox = {
        id: String(Date.now() + Math.random()),
        trackingNumber: latestParcel.trackingNumber,
        status: latestParcel.status,
        damageType: latestParcel.damageType,
        x: 0,
        y: 35,
        lane: 'MAIN',
        ejectProgress: 0
      };
      setEntryTriggered(true);
      setTimeout(() => setEntryTriggered(false), 300);
      return [...prev.slice(-8), newBox];
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

      // Spawn periodic box if none arrived for 3.2s
      if (Date.now() - lastSpawnTime.current > 3200) {
        lastSpawnTime.current = Date.now();
        boxCounter.current += 1;
        const isDefect = Math.random() < 0.40;
        const defectList = ['DENT', 'TEAR', 'WATER_STAIN', 'WEIGHT_ANOMALY'];
        const picked = isDefect ? defectList[Math.floor(Math.random() * defectList.length)] : 'NORMAL';

        const autoBox: MovingBox = {
          id: String(Date.now()),
          trackingNumber: `THA-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(boxCounter.current).padStart(4, '0')}`,
          status: isDefect ? 'REJECT' : 'PASS',
          damageType: picked,
          x: 0,
          y: 35,
          lane: 'MAIN',
          ejectProgress: 0
        };
        setEntryTriggered(true);
        setTimeout(() => setEntryTriggered(false), 300);
        setBoxes(prev => [...prev.slice(-8), autoBox]);
      }

      setBoxes(prevBoxes => {
        let pistonActive = false;

        const updated = prevBoxes.map(box => {
          // Lane 1: Main Conveyor (moves left to right from 0% to 100%)
          if (box.lane === 'MAIN') {
            const nextX = box.x + 18 * dt;

            // Trigger Entry Sensor flash when crossing x ~ 10%
            if (box.x < 10 && nextX >= 10) {
              setEntryTriggered(true);
              setTimeout(() => setEntryTriggered(false), 250);
            }

            // Detection & Pusher Station at X = 50%
            // CiRA Core classifies damaged boxes and activates pneumatic pusher
            if (box.status === 'REJECT' && box.x < 50 && nextX >= 50) {
              pistonActive = true;
              return {
                ...box,
                x: 50,
                lane: 'EJECTING' as const,
                ejectProgress: 0
              };
            }

            // Valid package reaches end of main conveyor (Sensor 2)
            if (nextX >= 90 && box.x < 90) {
              setValidSensorCount(c => c + 1);
              setValidExitTriggered(true);
              setTimeout(() => setValidExitTriggered(false), 350);
            }

            if (nextX >= 98) {
              return { ...box, x: 102, lane: 'EXIT' as const };
            }

            return { ...box, x: nextX };
          }

          // Lane 2: Pneumatic Cylinder Pusher Stroke (moves damaged box downward to reject conveyor)
          if (box.lane === 'EJECTING') {
            pistonActive = true;
            const nextProg = Math.min(1, box.ejectProgress + 3.2 * dt); // fast 300ms stroke
            const newY = 35 + (72 - 35) * nextProg;

            if (nextProg >= 1) {
              return {
                ...box,
                lane: 'REJECT_LINE' as const,
                y: 72,
                x: 50
              };
            }

            return { ...box, ejectProgress: nextProg, y: newY };
          }

          // Lane 3: Diverted Reject Conveyor Line (moves rightwards to reject end sensor)
          if (box.lane === 'REJECT_LINE') {
            const nextX = box.x + 16 * dt;

            // Reject item reaches end sensor of diverted line
            if (nextX >= 90 && box.x < 90) {
              setRejectSensorCount(c => c + 1);
              setRejectExitTriggered(true);
              setTimeout(() => setRejectExitTriggered(false), 350);
            }

            if (nextX >= 98) {
              return { ...box, x: 102, lane: 'EXIT' as const };
            }

            return { ...box, x: nextX };
          }

          return box;
        }).filter(b => b.lane !== 'EXIT');

        setCylinderFired(pistonActive);
        return updated;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isRunning]);

  return (
    <div className="bg-[#0B1526] border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg flex flex-col space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
            Conveyor Line & Sensor Tracking
          </h2>
          <p className="text-xs text-slate-400">
            Sensor detects arriving boxes &bull; CiRA Core identifies damage &bull; Pusher diverts rejected items &bull; End sensors count verified deliveries and rejected packages
          </p>
        </div>

        {onToggleRunning && (
          <button
            onClick={onToggleRunning}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center space-x-1.5 shadow ${
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

      {/* Sensor Count Readouts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
        {/* Valid Deliverable Sensor Count */}
        <div className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${
          validExitTriggered 
            ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200 shadow-[0_0_15px_rgba(52,211,153,0.3)]' 
            : 'bg-[#070E1A] border-slate-800 text-slate-300'
        }`}>
          <div className="flex items-center space-x-2.5">
            <span className={`w-3 h-3 rounded-full ${validExitTriggered ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500/40'}`} />
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Main Line Delivery Sensor</span>
              <span className="font-bold text-white">Valid / Deliverable Packages</span>
            </div>
          </div>
          <span className="text-2xl font-extrabold text-emerald-400">{validSensorCount}</span>
        </div>

        {/* Rejected Item Sensor Count */}
        <div className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${
          rejectExitTriggered 
            ? 'bg-red-950/60 border-red-400 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
            : 'bg-[#070E1A] border-slate-800 text-slate-300'
        }`}>
          <div className="flex items-center space-x-2.5">
            <span className={`w-3 h-3 rounded-full ${rejectExitTriggered ? 'bg-red-400 animate-ping' : 'bg-red-500/40'}`} />
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Diverted Line Sensor</span>
              <span className="font-bold text-white">Damaged / Rejected Packages</span>
            </div>
          </div>
          <span className="text-2xl font-extrabold text-red-400">{rejectSensorCount}</span>
        </div>
      </div>

      {/* Top-Down Schematic View */}
      <div className="relative w-full h-[220px] sm:h-[240px] bg-[#060C17] border border-slate-800/80 rounded-xl overflow-hidden select-none">
        
        {/* Track Grid Lines */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(#38bdf8 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />

        {/* 1. Entry Arrival Sensor (X: 10%, Main Belt) */}
        <div className="absolute left-[8%] top-[20%] flex flex-col items-center z-10 pointer-events-none">
          <span className={`w-3 h-3 rounded-full transition-all duration-200 ${
            entryTriggered ? 'bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,1)] scale-125' : 'bg-slate-700'
          }`} />
          <span className="text-[9px] font-mono text-slate-400 mt-1 uppercase font-semibold">Entry Sensor</span>
        </div>

        {/* 2. Main Conveyor Belt (Upper Line: Y ~35%) */}
        <div className="absolute left-0 right-0 top-[30%] h-12 bg-gradient-to-b from-slate-900 via-[#0B1526] to-slate-900 border-y border-slate-700/80 flex items-center">
          <div className="absolute left-3 top-1 text-[9px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
            Main Conveyor Line &rarr;
          </div>
          <div className="absolute right-24 top-1 text-[9px] font-mono text-emerald-400 font-bold uppercase">
            Deliverable Outlet
          </div>
        </div>

        {/* 3. CiRA Core Detection Station & Pneumatic Pusher (At X: 50%) */}
        <div className="absolute left-[48%] top-[25%] w-[12%] h-16 border border-cyan-500/50 bg-cyan-950/20 rounded flex flex-col items-center justify-center pointer-events-none z-10">
          <span className="text-[9px] font-bold text-cyan-300 font-mono">CiRA Core</span>
          <span className="text-[8px] text-slate-400 font-mono">Inspection</span>
        </div>

        {/* Pneumatic Cylinder Pusher (Piston at X: 52%, top edge) */}
        <div className="absolute left-[52%] top-[6%] flex flex-col items-center z-20 pointer-events-none">
          <div className="w-5 h-7 bg-slate-800 border border-slate-600 rounded-t flex items-center justify-center">
            <span className="text-[7px] font-mono text-slate-400">AIR</span>
          </div>
          <div 
            className="w-2 bg-slate-300 transition-all duration-150 ease-out flex flex-col items-center shadow-md"
            style={{ height: cylinderFired ? '42px' : '4px' }}
          >
            <div className={`w-7 h-2.5 rounded-sm transition-colors ${
              cylinderFired ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]' : 'bg-slate-400'
            }`} />
          </div>
          <span className="text-[8px] font-mono text-slate-400 mt-1">Pusher</span>
        </div>

        {/* 4. Diverted Reject Conveyor Line (Lower Line: Y ~72%) */}
        <div className="absolute left-[46%] right-0 top-[66%] h-12 bg-gradient-to-b from-slate-900 via-[#180E16] to-slate-900 border-y border-red-900/60 flex items-center">
          <div className="absolute left-3 top-1 text-[9px] font-mono text-red-400 font-bold uppercase tracking-wider">
            Diverted Reject Line &rarr;
          </div>
          <div className="absolute right-24 top-1 text-[9px] font-mono text-red-400 font-bold uppercase">
            Reject Bin Outlet
          </div>
        </div>

        {/* 5. End Delivery Sensor (Main Line, X: 90%) */}
        <div className="absolute right-[8%] top-[20%] flex flex-col items-center z-10 pointer-events-none">
          <span className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
            validExitTriggered ? 'bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,1)] scale-125' : 'bg-slate-700'
          }`} />
          <span className="text-[9px] font-mono text-emerald-400 mt-1 uppercase font-semibold">Valid Sensor</span>
        </div>

        {/* 6. End Reject Sensor (Diverted Line, X: 90%) */}
        <div className="absolute right-[8%] top-[56%] flex flex-col items-center z-10 pointer-events-none">
          <span className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
            rejectExitTriggered ? 'bg-red-400 shadow-[0_0_14px_rgba(239,68,68,1)] scale-125' : 'bg-slate-700'
          }`} />
          <span className="text-[9px] font-mono text-red-400 mt-1 uppercase font-semibold">Reject Sensor</span>
        </div>

        {/* 7. Animated Moving Boxes */}
        {boxes.map(box => {
          const isReject = box.status === 'REJECT';
          const isDiverting = box.lane === 'EJECTING';

          return (
            <div
              key={box.id}
              className={`absolute w-8 h-8 rounded flex flex-col items-center justify-center transition-all duration-75 shadow-lg font-mono text-[8px] z-20 ${
                isReject
                  ? 'bg-red-600 text-white border border-red-300'
                  : 'bg-amber-300 text-amber-950 border border-amber-600 font-bold'
              } ${isDiverting ? 'scale-110 shadow-red-500/50' : ''}`}
              style={{
                left: `${box.x}%`,
                top: `${box.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <span className="truncate max-w-[28px] font-extrabold leading-none">
                {isReject ? 'FAIL' : 'PASS'}
              </span>
              <span className="text-[6px] opacity-75 mt-0.5">
                {box.trackingNumber.slice(-4)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
