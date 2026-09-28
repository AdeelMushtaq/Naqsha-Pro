import React from 'react';
import { UnitSystem, ThemeMode } from '../models/types';
import { formatLength } from '../utils/units';

interface ScaleBarProps {
  zoom: number;
  unitSystem: UnitSystem;
  theme: ThemeMode;
}

export const ScaleBar: React.FC<ScaleBarProps> = ({ zoom, unitSystem, theme }) => {
  const isDark = theme === 'dark';

  // Target standard display distance in feet: 10 ft, 5 ft, 20 ft, 50 ft
  const targetPx = 90; // approx desired scale bar pixel width
  const rawInches = targetPx / zoom;
  const rawFt = rawInches / 12;

  let displayFt = 10;
  if (rawFt <= 2) displayFt = 1;
  else if (rawFt <= 4) displayFt = 2;
  else if (rawFt <= 8) displayFt = 5;
  else if (rawFt <= 15) displayFt = 10;
  else if (rawFt <= 30) displayFt = 20;
  else if (rawFt <= 60) displayFt = 50;
  else displayFt = 100;

  const barWidthPx = Math.round(displayFt * 12 * zoom);
  const label = unitSystem === 'ft' ? `${displayFt} ft` : `${displayFt * 12}"`;

  return (
    <div className="absolute bottom-6 left-12 z-30 flex flex-col items-center select-none pointer-events-none">
      <span className="text-[10px] font-mono font-bold tracking-tight mb-1 text-slate-300 drop-shadow">
        {label}
      </span>
      <div
        className="h-2 border-b-2 border-l-2 border-r-2 border-sky-400 bg-sky-400/20 shadow-md"
        style={{ width: `${barWidthPx}px` }}
      />
    </div>
  );
};
