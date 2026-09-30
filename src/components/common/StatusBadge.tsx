import React from 'react';

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
  const getStyle = () => {
    switch (status) {
      case 'PASS':
        return {
          bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          icon: '✓'
        };
      case 'REJECT':
        return {
          bg: 'bg-red-500/15 text-red-400 border-red-500/30',
          icon: '!'
        };
      case 'ONLINE':
      case 'READY':
        return {
          bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          icon: '●'
        };
      case 'OFFLINE':
      case 'DISCONNECTED':
        return {
          bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          icon: '●'
        };
      case 'WARNING':
      case 'MANUAL INSPECTION':
        return {
          bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          icon: '⚠'
        };
      case 'CRITICAL':
        return {
          bg: 'bg-red-500/20 text-red-400 border-red-500/40 font-bold',
          icon: '🚨'
        };
      default:
        return {
          bg: 'bg-[#172235] text-slate-300 border-[#26354A]',
          icon: '•'
        };
    }
  };

  const style = getStyle();
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm font-bold'
  }[size];

  return (
    <span className={`inline-flex items-center space-x-1 rounded-full border font-mono tracking-tight font-semibold shrink-0 ${style.bg} ${sizeClasses}`}>
      {showIcon && <span className="mr-0.5">{style.icon}</span>}
      <span>{status}</span>
    </span>
  );
};
