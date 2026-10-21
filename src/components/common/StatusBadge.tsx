import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, AlertCircle, Circle } from 'lucide-react';

export type StatusType = 
  | 'PASS' 
  | 'REJECT' 
  | 'ONLINE' 
  | 'OFFLINE' 
  | 'WARNING' 
  | 'CRITICAL' 
  | 'MANUAL INSPECTION' 
  | 'READY' 
  | 'PROCESSING';

interface StatusBadgeProps {
  status: StatusType | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true
}) => {
  const getStyleAndIcon = () => {
    switch (status) {
      case 'PASS':
        return {
          bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        };
      case 'REJECT':
        return {
          bg: 'bg-red-500/15 text-red-400 border-red-500/30',
          icon: <XCircle className="w-3.5 h-3.5 shrink-0" />
        };
      case 'ONLINE':
      case 'READY':
        return {
          bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          icon: <Circle className="w-2 h-2 fill-emerald-400 shrink-0" />
        };
      case 'OFFLINE':
      case 'DISCONNECTED':
        return {
          bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          icon: <Circle className="w-2 h-2 fill-amber-400 shrink-0" />
        };
      case 'WARNING':
      case 'MANUAL INSPECTION':
        return {
          bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          icon: <AlertTriangle className="w-3 h-3 shrink-0" />
        };
      case 'CRITICAL':
        return {
          bg: 'bg-red-500/20 text-red-400 border-red-500/40 font-bold',
          icon: <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        };
      default:
        return {
          bg: 'bg-[#172235] text-slate-300 border-[#26354A]',
          icon: <Circle className="w-1.5 h-1.5 fill-slate-400 shrink-0" />
        };
    }
  };

  const { bg, icon } = getStyleAndIcon();
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm font-bold'
  }[size];

  return (
    <span className={`inline-flex items-center space-x-1.5 rounded-full border font-mono tracking-tight font-semibold shrink-0 ${bg} ${sizeClasses}`}>
      {showIcon && icon}
      <span>{status}</span>
    </span>
  );
};
