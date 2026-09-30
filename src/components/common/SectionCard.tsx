import React from 'react';

interface SectionCardProps {
  title?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  description,
  icon: Icon,
  headerActions,
  children,
  className = ''
}) => {
  return (
    <div className={`bg-[#162235] border border-[#26354A] rounded-xl shadow-md overflow-hidden min-w-0 ${className}`}>
      {(title || headerActions) && (
        <div className="p-4 sm:p-5 border-b border-[#26354A] bg-[#0F172A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
          <div>
            {title && (
              <h3 className="text-sm font-bold text-white tracking-tight uppercase font-mono flex items-center space-x-2 truncate">
                {Icon && <Icon className="w-4 h-4 text-sky-400 shrink-0" />}
                <span className="truncate">{title}</span>
              </h3>
            )}
            {description && (
              <p className="text-xs text-[#94A3B8] font-sans mt-0.5 truncate">
                {description}
              </p>
            )}
          </div>

          {headerActions && (
            <div className="shrink-0 flex items-center space-x-2 flex-wrap gap-y-1">
              {headerActions}
            </div>
          )}
        </div>
      )}

      <div className="p-4 sm:p-5 min-w-0">
        {children}
      </div>
    </div>
  );
};
