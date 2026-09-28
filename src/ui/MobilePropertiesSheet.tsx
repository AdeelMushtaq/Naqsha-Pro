import React from 'react';
import { X } from 'lucide-react';
import { PropertiesPanel } from './PropertiesPanel';

interface MobilePropertiesSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobilePropertiesSheet: React.FC<MobilePropertiesSheetProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs transition-all duration-200 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-h-[70vh] bg-slate-900 border-t border-slate-700 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab handle */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-3 shrink-0" />

        <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-800">
          <span className="text-xs font-bold text-slate-300">Khusoosiyat (Details)</span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Embedded Properties Panel */}
        <div className="flex-1 overflow-y-auto">
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
};
