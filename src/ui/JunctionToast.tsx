/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n';
import { Undo2, X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export const JunctionToast: React.FC = () => {
  const { recentJunctionToast, setRecentJunctionToast, undo, language, theme } = useStore();
  const t = translations[language];
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!recentJunctionToast) return;

    const timer = setTimeout(() => {
      setRecentJunctionToast(null);
    }, 4000);

    return () => clearTimeout(timer);
  }, [recentJunctionToast, setRecentJunctionToast]);

  if (!recentJunctionToast) return null;

  const handleUndo = (e: React.MouseEvent) => {
    e.stopPropagation();
    undo();
    setRecentJunctionToast(null);
  };

  return (
    <div
      role="status"
      data-testid="junction-toast"
      className={`fixed bottom-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-3 py-1.5 rounded-lg border shadow-lg backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${
        isDark
          ? 'bg-slate-900/95 border-slate-700/80 text-slate-100 shadow-black/50'
          : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-400/30'
      }`}
    >
      {recentJunctionToast.type === 'success' && (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      )}
      {recentJunctionToast.type === 'warning' && (
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
      )}
      {recentJunctionToast.type === 'info' && (
        <Info className="w-4 h-4 text-sky-400 shrink-0" />
      )}

      <span className="text-xs font-medium">{recentJunctionToast.message}</span>

      {/* Undo Button */}
      {recentJunctionToast.type === 'success' && (
        <button
          type="button"
          data-testid="toast-undo-btn"
          onClick={handleUndo}
          className="ml-1 flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 dark:bg-sky-500/30 dark:text-sky-300 dark:hover:bg-sky-500/40 transition-colors"
        >
          <Undo2 className="w-3 h-3" />
          <span>{t.junctions.undoBtn}</span>
        </button>
      )}

      {/* Close button */}
      <button
        type="button"
        onClick={() => setRecentJunctionToast(null)}
        className="text-slate-400 hover:text-slate-200 p-0.5 rounded transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
