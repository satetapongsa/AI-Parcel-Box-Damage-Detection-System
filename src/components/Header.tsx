import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  Wifi, 
  WifiOff, 
  Play, 
  Pause, 
  Database, 
  Bell,
  Menu,
  CheckCircle2,
  XCircle,
  RefreshCw
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
    latestParcel,
    notifications,
    unreadNotificationCount,
    markNotificationsAsRead,
    clearNotifications,
    refreshDbRecords,
    isLoadingDb
  } = useSimulation();

  const [time, setTime] = useState<Date>(new Date());
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close notification popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowNotificationMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <header className="min-h-16 bg-[#080E1A] border-b border-slate-800 px-4 sm:px-6 py-2.5 flex items-center justify-between sticky top-0 z-40 select-none">
      
      {/* Station Title & Line Info */}
      <div className="flex items-center space-x-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white bg-slate-900 border border-slate-700 shrink-0"
            aria-label="Toggle Menu"
          >
            <Menu className="w-5 h-5 text-cyan-400" />
          </button>
        )}

        <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center shrink-0">
          <Database className="w-4 h-4 text-cyan-400" />
        </div>

        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-sm sm:text-base font-bold text-white font-mono tracking-wide">
              SPDI MONITORING HUB
            </h1>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold font-mono">
              STATION SORT-01
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans hidden sm:block">
            Automated Damage Inspection & Diverter Control System
          </p>
        </div>
      </div>

      {/* Center Operational Strip */}
      <div className="hidden xl:flex items-center space-x-4 font-mono text-xs">
        {/* Neon DB Live Indicator */}
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400">Database:</span>
          <span className="text-emerald-400 font-bold">ONLINE</span>
          <button 
            onClick={() => refreshDbRecords()} 
            disabled={isLoadingDb}
            className="text-slate-400 hover:text-cyan-400 transition ml-1"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDb ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>

        {/* Conveyor & Actuator Status */}
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
          <span>Conveyor:</span>
          <span className={demoModeActive ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
            {demoModeActive ? 'RUNNING' : 'PAUSED'}
          </span>
        </div>

        {/* Last Scanned Parcel */}
        <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-400">
          Latest Box: <span className="text-white font-bold">{latestParcel?.trackingNumber || '-'}</span>
        </div>
      </div>

      {/* Right Controls: Conveyor Play/Pause, Offline Toggle, Clock & Notification Bell */}
      <div className="flex items-center space-x-3">
        {/* Play / Pause Conveyor Button */}
        <button
          onClick={toggleDemoMode}
          className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition flex items-center space-x-1.5 shadow ${
            demoModeActive
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
          title={demoModeActive ? 'Pause Conveyor' : 'Resume Conveyor'}
        >
          {demoModeActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{demoModeActive ? 'Pause' : 'Resume'}</span>
        </button>

        {/* Offline / WAN Disconnect Fail-Safe Toggle */}
        <button
          onClick={toggleOfflineMode}
          className={`px-2.5 py-1.5 rounded-lg font-mono text-xs font-bold transition flex items-center space-x-1.5 border ${
            isOfflineMode
              ? 'bg-amber-600 text-white border-amber-400 shadow animate-pulse'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
          }`}
          title="Toggle Network Offline Mode"
        >
          {isOfflineMode ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
          <span className="hidden md:inline">{isOfflineMode ? 'Offline Mode' : 'Online'}</span>
        </button>

        {/* Live Clock */}
        <div className="hidden md:flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg font-mono text-xs text-slate-300">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-white font-bold">{formatTime(time)}</span>
        </div>

        {/* QUIET NOTIFICATION BELL (Top-Right Icon with dropdown for operators) */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => {
              setShowNotificationMenu(!showNotificationMenu);
              if (!showNotificationMenu) {
                markNotificationsAsRead();
              }
            }}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition relative shadow"
            title="Quarantine Defect Alerts"
            aria-label="Alerts"
          >
            <Bell className="w-4 h-4 text-amber-400" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white font-mono text-[9px] font-bold flex items-center justify-center animate-pulse">
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown Panel */}
          {showNotificationMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#0B1424] border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden font-sans">
              <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white font-mono uppercase">
                    Quarantine Defect Queue
                  </span>
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="text-[10px] text-slate-400 hover:text-red-400 font-mono transition"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/80">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 font-mono">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/50" />
                    No unhandled defect alerts. Conveyor clear.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="p-3 hover:bg-slate-900/60 transition space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-red-400 flex items-center space-x-1.5">
                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{n.title}</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono shrink-0">
                          {n.timestamp}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-sans pl-5">
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-slate-800 bg-slate-950 text-center">
                <span className="text-[10px] text-slate-400 font-mono">
                  Review and clear diverted packages in "Quarantine Bin"
                </span>
              </div>
            </div>
          )}
        </div>

      </div>

    </header>
  );
};
