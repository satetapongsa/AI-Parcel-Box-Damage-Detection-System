import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  Wifi, 
  WifiOff, 
  Play, 
  Pause, 
  Database, 
  RefreshCw,
  Radio
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';

export const Header: React.FC = () => {
  const { 
    demoModeActive, 
    toggleDemoMode, 
    isOfflineMode, 
    toggleOfflineMode,
    syncOfflineQueue,
    pendingSyncCount,
    latestParcel,
    dataSourceMode,
    setDataSourceMode,
    connectionHealth
  } = useSimulation();

  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <header className="h-16 bg-[#07111F] border-b border-[#26344A] px-6 flex items-center justify-between sticky top-0 z-20 shadow-xl select-none">
      
      {/* Station Title & Subtitle */}
      <div className="flex items-center space-x-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Smart Parcel Inspection Center</span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
              Edge AI + IoT
            </span>
          </h2>
          <p className="text-xs text-[#94A3B8] font-mono">
            Real-time Edge AI parcel integrity monitoring & automated sorter • SORT-01
          </p>
        </div>
      </div>

      {/* Header Connection Health Telemetry Strip */}
      <div className="hidden xl:flex items-center space-x-2 font-mono text-[11px]">
        
        {/* CiRA CORE Status */}
        <div className="bg-[#101A2B] border border-[#26344A] px-2.5 py-1 rounded-lg flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-slate-300">CiRA CORE:</span>
          <span className="font-bold text-emerald-400">{connectionHealth.ciraCore}</span>
        </div>

        {/* MQTT Broker Status */}
        <div className={`border px-2.5 py-1 rounded-lg flex items-center space-x-1 font-semibold ${
          isOfflineMode 
            ? 'bg-amber-950/60 border-amber-500/40 text-amber-400' 
            : 'bg-[#101A2B] border-[#26344A] text-purple-400'
        }`}>
          {isOfflineMode ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
          <span>MQTT: {isOfflineMode ? 'DISCONNECTED' : 'CONNECTED'}</span>
        </div>

        {/* Database Status */}
        <div className="bg-[#101A2B] border border-[#26344A] px-2.5 py-1 rounded-lg flex items-center space-x-1 text-emerald-400 font-semibold">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>DB: CONNECTED</span>
        </div>

        {/* Last Inspection Time */}
        <div className="bg-[#101A2B] border border-[#26344A] px-2.5 py-1 rounded-lg text-[#94A3B8]">
          Last scan: <span className="text-white font-bold">{latestParcel?.time || 'Just now'}</span>
        </div>

      </div>

      {/* Right Toolbar Controls */}
      <div className="flex items-center space-x-3">
        
        {/* Data Source Switcher (MOCK vs LIVE EDGE) */}
        <div className="bg-[#101A2B] border border-[#26344A] p-0.5 rounded-lg flex items-center font-mono text-xs">
          <button
            onClick={() => setDataSourceMode('MOCK')}
            className={`px-2.5 py-1 rounded-md transition-all font-bold ${
              dataSourceMode === 'MOCK'
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            MOCK DATA
          </button>
          <button
            onClick={() => setDataSourceMode('LIVE_EDGE')}
            className={`px-2.5 py-1 rounded-md transition-all font-bold flex items-center space-x-1 ${
              dataSourceMode === 'LIVE_EDGE'
                ? 'bg-purple-600 text-white shadow animate-pulse'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5 mr-0.5" />
            <span>LIVE EDGE (CiRA)</span>
          </button>
        </div>

        {/* Offline Mode Switcher */}
        <button
          onClick={toggleOfflineMode}
          className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center space-x-1.5 border ${
            isOfflineMode
              ? 'bg-amber-600 text-white border-amber-400 shadow-lg shadow-amber-600/30 animate-pulse'
              : 'bg-[#101A2B] hover:bg-[#172235] text-amber-400 border-[#26344A]'
          }`}
          title="Toggle Store-and-Forward Offline Resiliency Mode"
        >
          {isOfflineMode ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
          <span>{isOfflineMode ? 'OFFLINE MODE (ACTIVE)' : 'Simulate Offline'}</span>
        </button>

        {/* Sync Button if Offline Queue has records */}
        {pendingSyncCount > 0 && (
          <button
            onClick={syncOfflineQueue}
            className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md shadow-sky-600/30 animate-bounce"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Sync Queue ({pendingSyncCount})</span>
          </button>
        )}

        {/* Demo Mode Toggle */}
        <button
          onClick={toggleDemoMode}
          className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center space-x-1.5 border ${
            demoModeActive
              ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-600/30'
              : 'bg-[#101A2B] hover:bg-[#172235] text-slate-300 border-[#26344A]'
          }`}
        >
          {demoModeActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{demoModeActive ? 'DEMO MODE ● ACTIVE' : 'DEMO MODE PAUSED'}</span>
        </button>

        {/* Live Clock Widget */}
        <div className="hidden md:flex items-center space-x-2 bg-[#101A2B] border border-[#26344A] px-3 py-1.5 rounded-lg font-mono text-xs text-slate-200">
          <Calendar className="w-3.5 h-3.5 text-sky-400" />
          <span>{formatDate(time)}</span>
          <span className="text-slate-600">|</span>
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-sky-400 font-bold">{formatTime(time)}</span>
        </div>

        {/* User Profile Avatar */}
        <div className="flex items-center space-x-2 pl-2 border-l border-[#26344A]">
          <div className="w-8 h-8 rounded-full bg-sky-600 border border-sky-400/50 flex items-center justify-center text-white font-bold text-xs shadow">
            OP
          </div>
        </div>

      </div>

    </header>
  );
};
