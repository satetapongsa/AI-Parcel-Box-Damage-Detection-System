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
  UserCheck,
  Zap,
  X
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab,
  isOpenMobile = false,
  onCloseMobile
}) => {
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

  const handleSelectNav = (id: string) => {
    setActiveTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="w-60 bg-[#07111F] border-r border-[#26354A] flex flex-col justify-between shrink-0 h-full select-none">
      <div>
        {/* System Brand Logo Header */}
        <div className="p-4 border-b border-[#26354A] flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#0B1220] p-1 border border-sky-500/40 shadow-lg shadow-sky-500/20 shrink-0">
              <img src="/logo.svg" alt="AI Parcel Box Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1">
                <h1 className="text-xs font-bold text-white font-mono tracking-tight truncate">
                  AI Parcel Box
                </h1>
                <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0">
                  v2.4
                </span>
              </div>
              <p className="text-[10px] text-sky-400 font-mono font-semibold tracking-tight truncate mt-0.5">
                Damage Detection
              </p>
            </div>
          </div>

          {/* Close button for mobile drawer */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#162235]"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-190px)]">
          <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#94A3B8]">
            Control Center
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectNav(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-mono font-medium transition-all group ${
                  isActive
                    ? 'bg-[#38BDF8] text-slate-950 shadow-md font-bold'
                    : 'text-[#94A3B8] hover:bg-[#101A2B] hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-sky-400 group-hover:text-white'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded text-white shrink-0 ${
                    isActive ? 'bg-slate-900 text-white' : item.badgeColor
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Sidebar Station & User Info */}
      <div className="p-3 border-t border-[#26354A] shrink-0">
        <div className="bg-[#101A2B] border border-[#26354A] rounded-xl p-3 space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${systemStatus.isOfflineMode ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`}></span>
              <span className="font-bold text-white truncate text-[11px]">
                {systemStatus.isOfflineMode ? 'OFFLINE' : 'ONLINE'}
              </span>
            </div>
            <Zap className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          </div>

          <div className="pt-1.5 border-t border-[#26354A] text-[11px] text-[#94A3B8] space-y-1">
            <div className="flex justify-between">
              <span>Station:</span>
              <span className="text-sky-400 font-bold">{systemStatus.stationId}</span>
            </div>
            <div className="flex justify-between">
              <span>User:</span>
              <span className="text-slate-200 font-bold flex items-center space-x-1">
                <UserCheck className="w-3 h-3 text-emerald-400 mr-1" />
                Operator
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block w-60 shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile / Tablet Drawer Backdrop & Modal */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-xs animate-in fade-in" 
            onClick={onCloseMobile} 
          />
          <div className="relative z-10 animate-in slide-in-from-left duration-300">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
