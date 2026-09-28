import React, { useState } from 'react';
import {
  Maximize2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Home,
  Layers,
  Ruler,
  DoorOpen,
  PieChart,
  X,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { AreaUnit } from '../models/types';
import { translations } from '../i18n';
import { formatAreaWithUnit, formatLength } from '../utils/units';
import {
  calculateBoxArea,
  calculateCircleArea,
  getWallLength,
  getCurveWallArc,
} from '../utils/geometry';

interface InfoPanelProps {
  onClose?: () => void;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({ onClose }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const {
    project,
    selectedIds,
    unitSystem,
    areaUnit,
    setAreaUnit,
    language,
    detectedRooms,
    refreshDetectedRooms,
  } = useStore();

  const t = translations[language];

  // Calculate live architectural stats
  let totalPlotSqInches = 0;
  let totalCoveredSqInches = 0;
  let totalWallLengthInches = 0;
  let doorCount = 0;
  let windowCount = 0;

  project.elements.forEach((el) => {
    if (el.hidden) return;

    if (el.type === 'plot') {
      totalPlotSqInches += el.width * el.height;
    } else if (el.type === 'box') {
      totalCoveredSqInches += calculateBoxArea(el.width, el.height);
    } else if (el.type === 'circle') {
      totalCoveredSqInches += calculateCircleArea(el.radius);
    } else if (el.type === 'wall') {
      totalWallLengthInches += getWallLength(el);
    } else if (el.type === 'curve_wall') {
      const arc = getCurveWallArc(el);
      totalWallLengthInches += arc.length;
    } else if (el.type === 'door') {
      doorCount++;
    } else if (el.type === 'window') {
      windowCount++;
    }
  });

  // Calculate area of selected element(s)
  let selectedAreaSqInches = 0;
  let selectedCount = selectedIds.length;

  selectedIds.forEach((id) => {
    const el = project.elements.find((e) => e.id === id);
    if (!el) return;
    if (el.type === 'box') {
      selectedAreaSqInches += calculateBoxArea(el.width, el.height);
    } else if (el.type === 'circle') {
      selectedAreaSqInches += calculateCircleArea(el.radius);
    } else if (el.type === 'plot') {
      selectedAreaSqInches += el.width * el.height;
    }
  });

  // Open area and utilization percentage
  const openAreaSqInches = Math.max(0, totalPlotSqInches - totalCoveredSqInches);
  const coveragePercent =
    totalPlotSqInches > 0
      ? Math.min(100, Math.round((totalCoveredSqInches / totalPlotSqInches) * 100))
      : 0;

  const areaUnits: { id: AreaUnit; label: string }[] = [
    { id: 'sqft', label: 'Sq Ft' },
    { id: 'marla', label: 'Marla' },
    { id: 'kanal', label: 'Kanal' },
    { id: 'sqyd', label: 'Sq Yd (Guz)' },
    { id: 'sqm', label: 'Sq M' },
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl shadow-xl backdrop-blur-md overflow-hidden transition-all text-xs select-none">
      {/* Header with collapse button */}
      <div
        className="flex items-center justify-between px-3.5 py-2.5 bg-slate-800/80 border-b border-slate-700/70 cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2 text-white font-bold tracking-tight">
          <PieChart className="w-4 h-4 text-sky-400" />
          <span>{t.infoPanel.title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              refreshDetectedRooms();
            }}
            className="p-1 rounded-md text-slate-400 hover:text-sky-400 hover:bg-slate-700/80 transition-colors"
            title={t.infoPanel.detectRooms}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button className="text-slate-400 hover:text-white p-0.5">
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          {onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/80 transition-colors ml-0.5"
              title="Close panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Body content */}
      {!isCollapsed && (
        <div className="p-3.5 space-y-3">
          {/* Unit selector pills */}
          <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            {areaUnits.map((u) => (
              <button
                key={u.id}
                onClick={() => setAreaUnit(u.id)}
                className={`flex-1 py-1 text-[10px] font-semibold rounded-lg transition-colors ${
                  areaUnit === u.id
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>

          {/* Plot & Covered Area Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <span className="text-[10px] text-slate-400 block font-medium">
                {t.infoPanel.coveredArea}
              </span>
              <span className="text-sm font-bold text-sky-400 block mt-0.5">
                {formatAreaWithUnit(totalCoveredSqInches, areaUnit)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <span className="text-[10px] text-slate-400 block font-medium">
                {t.infoPanel.plotArea}
              </span>
              <span className="text-sm font-bold text-amber-400 block mt-0.5">
                {totalPlotSqInches > 0
                  ? formatAreaWithUnit(totalPlotSqInches, areaUnit)
                  : '--'}
              </span>
            </div>
          </div>

          {/* Plot utilization bar if plot boundary drawn */}
          {totalPlotSqInches > 0 && (
            <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <div className="flex items-center justify-between text-[11px] font-medium mb-1.5">
                <span className="text-slate-300">{t.infoPanel.percentage}</span>
                <span className="font-bold text-sky-300">{coveragePercent}%</span>
              </div>
              <div className="w-full bg-slate-700/60 h-2 rounded-full overflow-hidden flex">
                <div
                  className="bg-sky-500 h-full transition-all duration-300"
                  style={{ width: `${coveragePercent}%` }}
                />
                <div
                  className="bg-emerald-500/40 h-full transition-all duration-300"
                  style={{ width: `${100 - coveragePercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1">
                <span>Covered: {formatAreaWithUnit(totalCoveredSqInches, areaUnit)}</span>
                <span>Open: {formatAreaWithUnit(openAreaSqInches, areaUnit)}</span>
              </div>
            </div>
          )}

          {/* Selection Area if elements selected */}
          {selectedCount > 0 && selectedAreaSqInches > 0 && (
            <div className="p-2.5 rounded-xl bg-sky-950/40 border border-sky-500/40">
              <span className="text-[10px] text-sky-300 block font-medium">
                {selectedCount > 1
                  ? `Muntakhib (${selectedCount} Objects) Combined Area`
                  : t.infoPanel.selectedArea}
              </span>
              <span className="text-sm font-bold text-sky-200 block mt-0.5">
                {formatAreaWithUnit(selectedAreaSqInches, areaUnit)}
              </span>
            </div>
          )}

          {/* Metrics summary */}
          <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-800/80">
            <div className="p-1.5 rounded-lg bg-slate-800/30">
              <span className="text-[9px] text-slate-400 block">{t.infoPanel.roomsCount}</span>
              <span className="text-xs font-bold text-slate-200 mt-0.5 block">
                {detectedRooms.length}
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-800/30">
              <span className="text-[9px] text-slate-400 block">{t.infoPanel.doorsCount}</span>
              <span className="text-xs font-bold text-slate-200 mt-0.5 block">{doorCount}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-800/30">
              <span className="text-[9px] text-slate-400 block">{t.infoPanel.windowsCount}</span>
              <span className="text-xs font-bold text-slate-200 mt-0.5 block">{windowCount}</span>
            </div>
          </div>

          {/* Total wall length */}
          <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
            <span>{t.infoPanel.wallLength}:</span>
            <span className="font-semibold text-slate-200 font-mono">
              {formatLength(totalWallLengthInches, unitSystem)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
