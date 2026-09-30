import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footerActions?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footerActions,
  maxWidth = '2xl'
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl'
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className={`w-full ${maxWidthClass} bg-[#0F172A] border border-[#26354A] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#26354A] bg-[#07111F] flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-4">
            <h3 className="text-base font-bold text-white font-mono truncate">{title}</h3>
            {subtitle && <p className="text-xs text-[#94A3B8] font-sans mt-0.5 truncate">{subtitle}</p>}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#162235] transition-colors shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-w-0 space-y-4 text-xs sm:text-sm">
          {children}
        </div>

        {/* Optional Footer */}
        {footerActions && (
          <div className="p-4 border-t border-[#26354A] bg-[#07111F] flex items-center justify-end space-x-3 shrink-0">
            {footerActions}
          </div>
        )}
      </div>
    </div>
  );
};
