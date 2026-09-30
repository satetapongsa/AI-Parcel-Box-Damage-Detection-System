import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  badgeType?: 'sky' | 'green' | 'red' | 'amber' | 'purple';
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  badgeType = 'sky',
  actions
}) => {
  const getBadgeStyle = () => {
    switch (badgeType) {
      case 'green':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'red':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'amber':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'purple':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      default:
        return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0F172A] border border-[#26354A] p-5 rounded-xl shadow-md min-w-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
            {title}
          </h1>
          {badge && (
            <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${getBadgeStyle()} shrink-0`}>
              {badge}
            </span>
          )}
        </div>

        {description && (
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-1 tracking-normal leading-relaxed truncate">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center space-x-2 shrink-0 self-start sm:self-center flex-wrap gap-y-2">
          {actions}
        </div>
      )}
    </div>
  );
};
