import React from 'react';
import { X, AlertTriangle, AlertCircle, Info, CheckCircle2, Trash2 } from 'lucide-react';
import type { NotificationItem } from '../types/inspection';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onSelectParcel?: (parcelId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onClearAll,
  onSelectParcel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="w-96 bg-navy-900 border-l border-navy-700 h-full flex flex-col justify-between shadow-2xl">
        
        {/* Drawer Header */}
        <div className="p-4 border-b border-navy-700 flex items-center justify-between bg-navy-950">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h3 className="font-bold text-white text-sm">System Alerts & Notifications</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-navy-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action strip */}
        <div className="px-4 py-2 bg-navy-850 border-b border-navy-700 flex items-center justify-between text-xs font-mono">
          <button
            onClick={onMarkAllAsRead}
            className="text-blue-400 hover:underline"
          >
            Mark all as read
          </button>
          <button
            onClick={onClearAll}
            className="text-slate-400 hover:text-red-400 flex items-center space-x-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear all</span>
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs font-mono">
              No recent notifications
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => n.parcelId && onSelectParcel && onSelectParcel(n.parcelId)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  n.parcelId ? 'cursor-pointer hover:border-blue-500' : ''
                } ${
                  !n.read
                    ? 'bg-navy-800 border-navy-600 shadow-md'
                    : 'bg-navy-950/60 border-navy-800 opacity-80'
                }`}
              >
                <div className="flex items-start space-x-2.5">
                  {n.type === 'danger' && <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
                  {n.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />}
                  {n.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />}
                  {n.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white tracking-tight">{n.title}</h4>
                      <span className="text-[10px] font-mono text-slate-400">{n.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{n.message}</p>
                    
                    {n.parcelId && (
                      <div className="mt-2 inline-flex items-center text-[10px] font-mono font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                        View Parcel {n.parcelId} →
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 bg-navy-950 border-t border-navy-700 text-center text-[11px] font-mono text-slate-500">
          CiRA CORE Real-time Vision Dispatch Sync
        </div>

      </div>
    </div>
  );
};
