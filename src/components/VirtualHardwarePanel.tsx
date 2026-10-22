import React from 'react';
import { useSimulation } from '../context/SimulationContext';
import { Camera, Radio, Server, Volume2 } from 'lucide-react';

export const VirtualHardwarePanel: React.FC = () => {
  const { systemStatus, settings, faults } = useSimulation();

  const isGreen = systemStatus.towerLight === 'GREEN';
  const isYellow = systemStatus.towerLight === 'YELLOW';
  const isRed = systemStatus.towerLight === 'RED';

  return (
    <div className="bg-[#0B1528] border border-cyan-950/70 rounded-xl p-4 shadow-xl">
      {/* Header with Title and Simulation Watermark */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
          <h2 className="text-sm font-semibold tracking-wide text-slate-100 uppercase">
            Virtual Hardware & Tower Light State
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono px-2 py-0.5 rounded">
            HARDWARE I/O
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Line Speed: {settings.conveyorSpeedMs} m/s
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Tower Light Schematic */}
        <div className="bg-[#070D1B] border border-slate-800/80 rounded-lg p-3 flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-slate-400">LED TOWER LIGHT</span>
            {systemStatus.buzzer && (
              <span className="flex items-center text-[10px] text-red-400 font-mono animate-pulse">
                <Volume2 className="w-3 h-3 mr-1" /> BUZZER ACTIVE
              </span>
            )}
          </div>

          {/* Tower Stack */}
          <div className="flex flex-col items-center space-y-1.5 py-2">
            {/* RED */}
            <div
              className={`w-12 h-6 rounded flex items-center justify-center font-mono text-[10px] font-bold border transition-all duration-300 ${
                isRed
                  ? 'bg-red-500 text-white border-red-300 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse'
                  : 'bg-red-950/40 text-red-700/60 border-red-950/40'
              }`}
            >
              RED
            </div>
            {/* YELLOW */}
            <div
              className={`w-12 h-6 rounded flex items-center justify-center font-mono text-[10px] font-bold border transition-all duration-300 ${
                isYellow
                  ? 'bg-amber-400 text-black border-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.8)]'
                  : 'bg-amber-950/40 text-amber-700/60 border-amber-950/40'
              }`}
            >
              YELLOW
            </div>
            {/* GREEN */}
            <div
              className={`w-12 h-6 rounded flex items-center justify-center font-mono text-[10px] font-bold border transition-all duration-300 ${
                isGreen
                  ? 'bg-emerald-500 text-white border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.8)]'
                  : 'bg-emerald-950/40 text-emerald-700/60 border-emerald-950/40'
              }`}
            >
              GREEN
            </div>
            {/* Tower Base Pole */}
            <div className="w-3 h-6 bg-slate-700 rounded-b" />
          </div>

          <div className="text-[10px] text-center font-mono text-slate-400 mt-2">
            {isRed && <span className="text-red-400 font-semibold">REJECT / Solenoid Pushing</span>}
            {isYellow && <span className="text-amber-400 font-semibold">OFFLINE / System Fault</span>}
            {isGreen && <span className="text-emerald-400 font-semibold">PASS / Belt Clear</span>}
          </div>
        </div>

        {/* Actuator Module */}
        <div className="bg-[#070D1B] border border-slate-800/80 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400">ACTUATOR (DISPATCH)</span>
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
              READY
            </span>
          </div>

          <div className="py-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-300 mb-1">
              <span>Type: {settings.actuatorType}</span>
              <span className={systemStatus.actuatorStatus === 'FIRING' ? 'text-red-400 font-bold animate-pulse' : 'text-slate-400'}>
                {systemStatus.actuatorStatus}
              </span>
            </div>
            <div className="h-6 bg-slate-900 border border-slate-800 rounded relative overflow-hidden flex items-center">
              {/* Cylinder Piston Stroke animation */}
              <div
                className={`h-full bg-cyan-500 transition-all duration-200 rounded ${
                  systemStatus.actuatorStatus === 'FIRING' ? 'w-full bg-red-500' : 'w-4'
                }`}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-slate-400">
                Stroke: {systemStatus.actuatorStatus === 'FIRING' ? 'EXTENDED (180ms)' : 'RETRACTED'}
              </span>
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-500 flex justify-between">
            <span>Delay: {settings.actuatorDelayMs}ms</span>
            <span>Dist: {settings.actuatorDistanceInstalledM}m</span>
          </div>
        </div>

        {/* Vision & IR Sensors */}
        <div className="bg-[#070D1B] border border-slate-800/80 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400">TRIGGER & CAMERAS</span>
            <Camera className="w-4 h-4 text-cyan-400" />
          </div>

          <div className="space-y-1.5 py-2 text-xs font-mono">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">IR Breakbeam:</span>
              <span className={systemStatus.irSensorStatus === 'TRIGGERED' ? 'text-cyan-400 font-semibold' : 'text-emerald-400'}>
                {systemStatus.irSensorStatus}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Top Cam (1080p):</span>
              <span className={faults.visionFaultDark ? 'text-amber-400' : 'text-emerald-400'}>
                {faults.visionFaultDark ? 'LOW LUX' : 'ONLINE'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Side Cam:</span>
              <span className={faults.dropSideCamera ? 'text-red-400' : 'text-emerald-400'}>
                {faults.dropSideCamera ? 'DROPPED' : 'ONLINE'}
              </span>
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-500">
            Min Brightness: {settings.minBrightness} lux
          </div>
        </div>

        {/* Edge Controller & Cloud Gateway */}
        <div className="bg-[#070D1B] border border-slate-800/80 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400">EDGE PC & CLOUD SYNC</span>
            <Server className="w-4 h-4 text-cyan-400" />
          </div>

          <div className="space-y-1.5 py-2 text-xs font-mono">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Local SQLite:</span>
              <span className="text-emerald-400">ACTIVE (500 MAX)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">WAN Link:</span>
              <span className={systemStatus.isOfflineMode ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                {systemStatus.isOfflineMode ? 'CUT (OFFLINE)' : 'ONLINE'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Pending Sync:</span>
              <span className={systemStatus.pendingSyncCount > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                {systemStatus.pendingSyncCount} items
              </span>
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-500">
            Store-and-Forward: Ready
          </div>
        </div>
      </div>
    </div>
  );
};
