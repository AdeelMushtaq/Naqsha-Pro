/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Point2D } from '../models/types';
import { Scissors } from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n';

interface ScissorsHoverIndicatorProps {
  visible: boolean;
  screenPos: Point2D;
  onClick: (e: React.MouseEvent) => void;
}

export const ScissorsHoverIndicator: React.FC<ScissorsHoverIndicatorProps> = ({
  visible,
  screenPos,
  onClick,
}) => {
  const { language, theme } = useStore();
  const t = translations[language];
  const isDark = theme === 'dark';

  if (!visible) return null;

  return (
    <div
      data-testid="scissors-hover-indicator"
      className="absolute z-30 pointer-events-auto cursor-pointer -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 group"
      style={{
        left: `${Math.round(screenPos.x)}px`,
        top: `${Math.round(screenPos.y)}px`,
      }}
      onClick={onClick}
      title={`${t.junctions.splitWallHere} (Click)`}
    >
      {/* Scissors Icon with subtle amber pulse circle */}
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center border shadow-sm transition-transform duration-150 group-hover:scale-115 ${
          isDark
            ? 'bg-amber-500/20 border-amber-400/60 text-amber-300 shadow-black/40'
            : 'bg-amber-100 border-amber-500 text-amber-700 shadow-slate-300'
        }`}
      >
        <Scissors className="w-3.5 h-3.5" />
      </div>

      {/* Mini tooltip chip */}
      <div
        className={`hidden group-hover:flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border shadow-xs whitespace-nowrap backdrop-blur-md ${
          isDark
            ? 'bg-slate-900/90 border-slate-700 text-amber-300'
            : 'bg-white/95 border-slate-300 text-amber-800'
        }`}
      >
        {t.junctions.splitWallHere}
      </div>
    </div>
  );
};
