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
  Radio,
  Menu
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
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
    <header className="min-h-16 bg-[#07111F] border-b border-[#26354A] px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between sticky top-0 z-20 shadow-xl select-none gap-y-2">
      
      {/* Station Title & Subtitle + Mobile Drawer Menu Toggle */}
      <div className="flex items-center space-x-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:text-white bg-[#101A2B] border border-[#26354A] shrink-0"
            title="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5 text-sky-400" />
          </button>
        )}

        <img src="/logo.svg" alt="AI Parcel Box Logo" className="w-8 h-8 drop-shadow shrink-0 hidden sm:block" />
        
        <div className="min-w-0">
          <h2 className="text-xs sm:text-base font-bold text-white tracking-tight flex items-center space-x-2 truncate font-mono">
            <span className="truncate">AI Parcel Box Damage Detection System</span>
            <span className="hidden md:inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0">
              CiRA CORE AI
            </span>
          </h2>
          <p className="text-[11px] text-[#94A3B8] font-mono truncate hidden sm:block">
            Real-time Edge AI parcel integrity monitoring & sorter • SORT-01
          </p>
        </div>
      </div>

      {/* Header Connection Health Telemetry Strip */}
      <div className="hidden 2xl:flex items-center space-x-2 font-mono text-[11px]">
        {/* CiRA CORE Status */}
        <div className="bg-[#101A2B] border border-[#26354A] px-2.5 py-1 rounded-lg flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-slate-300">CiRA CORE:</span>
          <span className="font-bold text-emerald-400">{connectionHealth.ciraCore}</span>
        </div>

        {/* MQTT Broker Status */}
        <div className={`border px-2.5 py-1 rounded-lg flex items-center space-x-1 font-semibold ${
          isOfflineMode 
            ? 'bg-amber-950/60 border-amber-500/40 text-amber-400' 
            : 'bg-[#101A2B] border-[#26354A] text-purple-400'
        }`}>
          {isOfflineMode ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
          <span>MQTT: {isOfflineMode ? 'DISCONNECTED' : 'CONNECTED'}</span>
        </div>

        {/* Database Status */}
        <div className="bg-[#101A2B] border border-[#26354A] px-2.5 py-1 rounded-lg flex items-center space-x-1 text-emerald-400 font-semibold">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>DB: CONNECTED</span>
        </div>

        {/* Last Inspection Time */}
        <div className="bg-[#101A2B] border border-[#26354A] px-2.5 py-1 rounded-lg text-[#94A3B8]">
          Last scan: <span className="text-white font-bold">{latestParcel?.time || 'Just now'}</span>
        </div>
      </div>

      {/* Right Toolbar Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 flex-wrap gap-y-1">
        
        {/* Data Source Switcher (MOCK vs LIVE EDGE) */}
        <div className="bg-[#101A2B] border border-[#26354A] p-0.5 rounded-lg flex items-center font-mono text-[11px]">
          <button
            onClick={() => setDataSourceMode('MOCK')}
            className={`px-2 py-1 rounded transition-all font-bold ${
              dataSourceMode === 'MOCK'
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            MOCK
          </button>
          <button
            onClick={() => setDataSourceMode('LIVE_EDGE')}
            className={`px-2 py-1 rounded transition-all font-bold flex items-center space-x-1 ${
              dataSourceMode === 'LIVE_EDGE'
                ? 'bg-purple-600 text-white shadow animate-pulse'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3 h-3 mr-0.5" />
            <span>LIVE (CiRA)</span>
          </button>
        </div>

        {/* Offline Mode Switcher */}
        <button
          onClick={toggleOfflineMode}
          className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all flex items-center space-x-1 border ${
            isOfflineMode
              ? 'bg-amber-600 text-white border-amber-400 shadow animate-pulse'
              : 'bg-[#101A2B] hover:bg-[#172235] text-amber-400 border-[#26354A]'
          }`}
          title="Toggle Store-and-Forward Offline Resiliency Mode"
        >
          {isOfflineMode ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
          <span>{isOfflineMode ? 'OFFLINE' : 'Sim Offline'}</span>
        </button>

        {/* Sync Button if Offline Queue has records */}
        {pendingSyncCount > 0 && (
          <button
            onClick={syncOfflineQueue}
            className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-[11px] font-bold transition-all flex items-center space-x-1 shadow animate-bounce"
          >
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Sync ({pendingSyncCount})</span>
          </button>
        )}

        {/* Demo Mode Toggle */}
        <button
          onClick={toggleDemoMode}
          className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all flex items-center space-x-1 border ${
            demoModeActive
              ? 'bg-emerald-600 text-white border-emerald-400 shadow'
              : 'bg-[#101A2B] hover:bg-[#172235] text-slate-300 border-[#26354A]'
          }`}
        >
          {demoModeActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          <span className="hidden sm:inline">{demoModeActive ? 'DEMO ACTIVE' : 'DEMO PAUSED'}</span>
        </button>

        {/* Live Clock Widget */}
        <div className="hidden md:flex items-center space-x-2 bg-[#101A2B] border border-[#26354A] px-2.5 py-1 rounded-lg font-mono text-[11px] text-slate-200">
          <Calendar className="w-3 h-3 text-sky-400" />
          <span>{formatDate(time)}</span>
          <span className="text-slate-600">|</span>
          <Clock className="w-3 h-3 text-sky-400" />
          <span className="text-sky-400 font-bold">{formatTime(time)}</span>
        </div>

        {/* User Profile Avatar */}
        <div className="flex items-center space-x-2 pl-1 border-l border-[#26354A]">
          <div className="w-7 h-7 rounded-full bg-sky-600 border border-sky-400/50 flex items-center justify-center text-white font-bold text-[11px] shadow">
            OP
          </div>
        </div>

      </div>

    </header>
  );
};
