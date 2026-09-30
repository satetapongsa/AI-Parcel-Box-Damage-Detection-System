import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';

export const Toast: React.FC = () => {
  const { toast } = useSimulation();

  if (!toast) return null;

  const getStyle = (type: string) => {
    switch (type) {
      case 'danger':
        return 'bg-red-950 border-red-500 shadow-red-950/50 text-red-400';
      case 'warning':
        return 'bg-amber-950 border-amber-500 shadow-amber-950/50 text-amber-400';
      case 'success':
        return 'bg-emerald-950 border-emerald-500 shadow-emerald-950/50 text-emerald-400';
      default:
        return 'bg-sky-950 border-sky-500 shadow-sky-950/50 text-sky-400';
    }
  };

  return (
    <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-top-4 duration-300 pointer-events-none">
      <div className={`p-4 rounded-xl shadow-2xl border flex items-start space-x-3 text-xs font-mono max-w-md ${getStyle(toast.type)} pointer-events-auto`}>
        {toast.type === 'danger' && <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
        {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}
        {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />}
        {toast.type === 'info' && <Info className="w-5 h-5 shrink-0 mt-0.5" />}

        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white tracking-tight">{toast.title}</div>
          <div className="text-slate-300 font-sans mt-0.5 leading-relaxed">{toast.message}</div>
        </div>
      </div>
    </div>
  );
};
