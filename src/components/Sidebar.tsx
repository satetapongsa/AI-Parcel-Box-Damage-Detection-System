import React from 'react';
import { 
  LayoutDashboard, 
  Video, 
  FolderArchive, 
  BarChart3, 
  Activity, 
  AlertOctagon, 
  Sliders, 
  Network, 
  Box, 
  UserCheck,
  Zap
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { systemStatus } = useSimulation();

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'live', label: 'Live Inspection', icon: Video, badge: 'LIVE', badgeColor: 'bg-emerald-500' },
    { id: 'evidence', label: 'Evidence', icon: FolderArchive },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'health', label: 'System Health', icon: Activity, badge: 'OK', badgeColor: 'bg-sky-500' },
    { id: 'failure-tests', label: 'Failure Tests', icon: AlertOctagon },
    { id: 'settings', label: 'Settings', icon: Sliders },
    { id: 'architecture', label: 'Architecture', icon: Network },
  ];

  return (
    <aside className="w-64 bg-[#07111F] border-r border-[#26344A] flex flex-col justify-between shrink-0 h-screen sticky top-0 z-30 select-none">
      
      <div>
        {/* SPDI Brand Logo */}
        <div className="p-5 border-b border-[#26344A]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 border border-sky-400/30">
              <Box className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h1 className="text-xs font-black text-white tracking-tight font-mono leading-tight">
                  AI Parcel Box
                </h1>
                <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  v2.4
                </span>
              </div>
              <p className="text-[10px] text-sky-400 font-mono font-bold tracking-tight leading-tight mt-0.5">
                Damage Detection System
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-[#94A3B8]">
            Control Center
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-mono font-medium transition-all group ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30 font-bold border border-sky-400/40'
                    : 'text-[#94A3B8] hover:bg-[#101A2B] hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-sky-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded text-white ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Sidebar Station & User Info */}
      <div className="p-3 border-t border-[#26344A]">
        <div className="bg-[#101A2B] border border-[#26344A] rounded-xl p-3 space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${systemStatus.isOfflineMode ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`}></span>
              <span className="font-bold text-white">
                {systemStatus.isOfflineMode ? '● OFFLINE MODE' : '● ONLINE'}
              </span>
            </div>
            <Zap className="w-3.5 h-3.5 text-sky-400" />
          </div>

          <div className="pt-1 border-t border-[#26344A] text-[11px] text-[#94A3B8] space-y-1">
            <div className="flex justify-between">
              <span>Station:</span>
              <span className="text-sky-400 font-bold">{systemStatus.stationId}</span>
            </div>
            <div className="flex justify-between">
              <span>User:</span>
              <span className="text-slate-200 font-bold flex items-center space-x-1">
                <UserCheck className="w-3 h-3 text-emerald-400 mr-1" />
                Hub Operator
              </span>
            </div>
          </div>
        </div>
      </div>

    </aside>
  );
};
