/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Point2D } from '../models/types';
import { TJunctionMode } from '../utils/wallSplitJoin';
import { translations } from '../i18n';
import { GitMerge, Scissors, Shuffle } from 'lucide-react';

interface TJunctionModeChipProps {
  snapPoint: Point2D | null;
  targetWallId?: string;
  pan: Point2D;
  zoom: number;
  viewportWidth: number;
  viewportHeight: number;
  onSelectMode?: (mode: TJunctionMode) => void;
}

export const TJunctionModeChip: React.FC<TJunctionModeChipProps> = ({
  snapPoint,
  targetWallId: _targetWallId,
  pan,
  zoom,
  viewportWidth,
  viewportHeight,
  onSelectMode,
}) => {
  const { tJunctionMode, setTJunctionMode, cycleTJunctionMode, language, theme } = useStore();
  const t = translations[language];
  const isDark = theme === 'dark';
  const chipRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut listener: Tab cycles, J/S/X selects directly
  useEffect(() => {
    if (!snapPoint) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in text inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        cycleTJunctionMode();
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'j') {
        e.preventDefault();
        setTJunctionMode('join');
        if (onSelectMode) onSelectMode('join');
      } else if (key === 's') {
        e.preventDefault();
        setTJunctionMode('split');
        if (onSelectMode) onSelectMode('split');
      } else if (key === 'x') {
        e.preventDefault();
        setTJunctionMode('cross');
        if (onSelectMode) onSelectMode('cross');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [snapPoint, cycleTJunctionMode, setTJunctionMode, onSelectMode]);

  if (!snapPoint) return null;

  // Calculate screen position
  const screenX = pan.x + snapPoint.x * zoom;
  const screenY = pan.y + snapPoint.y * zoom;

  const isMobile = viewportWidth < 768;

  // Position offset:
  // On mobile: display above the finger so it's never covered
  // On desktop: display offset to the top-right of cursor/point
  let left = screenX + 16;
  let top = isMobile ? screenY - 68 : screenY - 42;

  // Clamp within viewport so it never falls outside
  const chipWidth = isMobile ? 260 : 210;
  const chipHeight = isMobile ? 54 : 32;

  if (left + chipWidth > viewportWidth - 10) {
    left = Math.max(10, screenX - chipWidth - 16);
  }
  if (top < 10) {
    top = screenY + 28;
  } else if (top + chipHeight > viewportHeight - 10) {
    top = viewportHeight - chipHeight - 10;
  }

  const handleModeClick = (mode: TJunctionMode, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setTJunctionMode(mode);
    if (onSelectMode) onSelectMode(mode);
  };

  const modeLabel =
    tJunctionMode === 'join'
      ? t.junctions.join
      : tJunctionMode === 'split'
        ? t.junctions.splitOnly
        : t.junctions.cross;

  return (
    <div
      ref={chipRef}
      data-testid="t-junction-mode-chip"
      className={`absolute z-40 flex items-center gap-1.5 rounded-[4px] border px-2 py-1 shadow-sm backdrop-blur-md select-none transition-all duration-150 ${
        isDark
          ? 'bg-slate-900/90 border-sky-500/30 text-slate-200 shadow-black/40'
          : 'bg-white/95 border-sky-600/30 text-slate-800 shadow-slate-300/50'
      }`}
      style={{
        left: `${Math.round(left)}px`,
        top: `${Math.round(top)}px`,
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Compact glass pill indicator: 11px text, 4px radius */}
      <div
        className="flex items-center gap-1 cursor-pointer font-sans text-[11px] font-semibold text-sky-400 dark:text-sky-300 pr-1.5 border-r border-slate-700/60 dark:border-slate-700/60"
        onClick={() => cycleTJunctionMode()}
        title="Click or press Tab to switch mode"
        data-testid="t-junction-badge"
      >
        <span className="font-mono text-xs">⊥</span>
        <span>{t.junctions.tJunction.replace(' ⊥', '')}</span>
        <span className="text-[10px] text-slate-400 font-normal">·</span>
        <span className="text-sky-300 dark:text-sky-200 font-bold">{modeLabel}</span>
      </div>

      {/* Mode choice button group: 3 tiny icon buttons with tooltips */}
      <div className="flex items-center gap-1">
        {/* Join button */}
        <button
          type="button"
          data-testid="tj-mode-join"
          onClick={(e) => handleModeClick('join', e)}
          title={`${t.junctions.joinDesc}`}
          className={`flex items-center justify-center gap-1 rounded transition-colors ${
            isMobile ? 'min-w-[44px] min-h-[44px] px-2 text-xs' : 'px-1.5 py-0.5 text-[10px]'
          } ${
            tJunctionMode === 'join'
              ? 'bg-sky-500 text-white font-semibold shadow-xs'
              : isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <GitMerge className={isMobile ? 'w-4 h-4' : 'w-3 h-3'} />
          <span className="hidden sm:inline">{t.junctions.join}</span>
          <span className="text-[9px] opacity-70 font-mono hidden md:inline">J</span>
        </button>

        {/* Split only button */}
        <button
          type="button"
          data-testid="tj-mode-split"
          onClick={(e) => handleModeClick('split', e)}
          title={`${t.junctions.splitOnlyDesc}`}
          className={`flex items-center justify-center gap-1 rounded transition-colors ${
            isMobile ? 'min-w-[44px] min-h-[44px] px-2 text-xs' : 'px-1.5 py-0.5 text-[10px]'
          } ${
            tJunctionMode === 'split'
              ? 'bg-amber-500 text-white font-semibold shadow-xs'
              : isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Scissors className={isMobile ? 'w-4 h-4' : 'w-3 h-3'} />
          <span className="hidden sm:inline">{t.junctions.splitOnly}</span>
          <span className="text-[9px] opacity-70 font-mono hidden md:inline">S</span>
        </button>

        {/* Overlap / Cross button */}
        <button
          type="button"
          data-testid="tj-mode-cross"
          onClick={(e) => handleModeClick('cross', e)}
          title={`${t.junctions.crossDesc}`}
          className={`flex items-center justify-center gap-1 rounded transition-colors ${
            isMobile ? 'min-w-[44px] min-h-[44px] px-2 text-xs' : 'px-1.5 py-0.5 text-[10px]'
          } ${
            tJunctionMode === 'cross'
              ? 'bg-purple-600 text-white font-semibold shadow-xs'
              : isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Shuffle className={isMobile ? 'w-4 h-4' : 'w-3 h-3'} />
          <span className="hidden sm:inline">{t.junctions.cross}</span>
          <span className="text-[9px] opacity-70 font-mono hidden md:inline">X</span>
        </button>
      </div>
    </div>
  );
};
