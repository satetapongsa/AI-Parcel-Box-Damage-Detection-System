import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ComponentType<{ className?: string }>;
  color?: 'sky' | 'emerald' | 'amber' | 'red' | 'purple';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtext,
  trend,
  trendType = 'positive',
  icon: Icon,
  color = 'sky'
}) => {
  const getColorClasses = () => {
    switch (color) {
      case 'emerald':
        return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
      case 'amber':
        return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
      case 'red':
        return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' };
      case 'purple':
        return { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' };
      default:
        return { text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30' };
    }
  };

  const style = getColorClasses();

  return (
    <div className={`bg-[#162235] border border-[#26354A] p-4 sm:p-5 rounded-xl shadow-md transition-all hover:translate-y-[-2px] hover:border-[#38BDF8]/40 flex flex-col justify-between min-w-0`}>
      <div className="flex items-center justify-between space-x-2">
        <span className="text-xs sm:text-sm font-medium text-[#94A3B8] tracking-tight truncate">
          {title}
        </span>
        {Icon && (
          <div className={`p-2 rounded-lg ${style.bg} shrink-0`}>
            <Icon className={`w-4 h-4 ${style.text}`} />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between flex-wrap gap-x-2 gap-y-1">
        <span className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white ${style.text}`}>
          {value}
        </span>

        {trend && (
          <span className={`text-[11px] font-mono font-bold ${
            trendType === 'positive' ? 'text-emerald-400' : trendType === 'negative' ? 'text-red-400' : 'text-[#94A3B8]'
          }`}>
            {trend}
          </span>
        )}
      </div>

      {subtext && (
        <div className="text-[11px] font-mono text-[#94A3B8] mt-1.5 truncate">
          {subtext}
        </div>
      )}
    </div>
  );
};
