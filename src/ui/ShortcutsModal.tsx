import React from 'react';
import { X, Keyboard, Command } from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const { language } = useStore();
  const t = translations[language];

  if (!isOpen) return null;

  const shortcutsList = [
    { key: 'V / Esc', desc: t.shortcuts.selectTool },
    { key: 'W', desc: t.shortcuts.wallTool },
    { key: 'R', desc: t.shortcuts.boxTool },
    { key: 'D', desc: t.shortcuts.doorTool },
    { key: 'H / Space', desc: t.shortcuts.panTool },
    { key: 'Shift', desc: t.shortcuts.snapOrthogonal },
    { key: 'Ctrl + Z', desc: t.shortcuts.undoRedo },
    { key: 'Ctrl + Y', desc: 'Redo (Aagay)' },
    { key: 'Delete / ⌫', desc: t.shortcuts.deleteElem },
    { key: 'Ctrl + D', desc: t.shortcuts.duplicateElem },
    { key: 'Wheel', desc: 'Zoom In / Out' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 transition-all duration-200 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">{t.shortcuts.title}</h2>
              <p className="text-xs text-slate-400">{t.shortcuts.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {shortcutsList.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 text-xs"
            >
              <span className="text-slate-300 font-medium">{item.desc}</span>
              <kbd className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 font-mono text-[11px] font-semibold text-sky-400 shadow-sm">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 font-medium text-xs text-white transition-colors"
          >
            {t.shortcuts.close}
          </button>
        </div>
      </div>
    </div>
  );
};
