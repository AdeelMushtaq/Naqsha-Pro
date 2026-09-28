import React, { useState, useEffect } from 'react';
import {
  Truck,
  Car,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Plus,
  Trash2,
  FileText,
  Sliders,
  Compass,
  Layers,
  ChevronDown,
  Navigation,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { VEHICLE_PRESETS, createVehicleFromPreset } from '../models/vehiclePresets';
import { VehicleCheckSession, UnitSystem } from '../models/types';
import { translations } from '../i18n';
import { formatLength, parseLengthInput, formatInputValue } from '../utils/units';

interface VehicleCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportReport?: () => void;
}

export const VehicleCheckModal: React.FC<VehicleCheckModalProps> = ({
  isOpen,
  onClose,
  onExportReport,
}) => {
  const {
    project,
    activeVehicleCheckId,
    vehicleCheckPlaybackProgress,
    isVehicleCheckPlaying,
    manualDrivePose,
    unitSystem,
    language,
    theme,
    setActiveTool,
    createVehicleCheck,
    updateActiveVehicleCheck,
    runVehicleCheckSimulation,
    runAutoPath,
    clearWaypointsInActiveVehicleCheck,
    setVehicleCheckPlaybackProgress,
    setVehicleCheckPlaying,
    setManualDrivePose,
    deleteVehicleCheck,
    setActiveVehicleCheckId,
    addElement,
  } = useStore();

  const t = translations[language];
  const tVc = t.vehicleCheck;

  // Local state for animation loop
  useEffect(() => {
    let animId: number;
    if (isVehicleCheckPlaying) {
      const step = () => {
        setVehicleCheckPlaybackProgress(
          (useStore.getState().vehicleCheckPlaybackProgress + 0.008) % 1.0
        );
        animId = requestAnimationFrame(step);
      };
      animId = requestAnimationFrame(step);
    }
    return () => cancelAnimationFrame(animId);
  }, [isVehicleCheckPlaying, setVehicleCheckPlaybackProgress]);

  // Ensure active vehicle check session exists
  useEffect(() => {
    if (isOpen && !activeVehicleCheckId) {
      const existing = project.vehicleChecks || [];
      if (existing.length > 0) {
        setActiveVehicleCheckId(existing[0].id);
      } else {
        createVehicleCheck('car', 'Standard Car Check');
      }
    }
  }, [isOpen, activeVehicleCheckId, project.vehicleChecks, createVehicleCheck, setActiveVehicleCheckId]);

  if (!isOpen) return null;

  const currentSession =
    project.vehicleChecks?.find((c) => c.id === activeVehicleCheckId) ||
    project.vehicleChecks?.[0];

  if (!currentSession) return null;

  const { vehicle, result, waypoints, allowFootpath, safetyMargin } = currentSession;

  const handlePresetSelect = (presetKey: string) => {
    const updatedVehicle = createVehicleFromPreset(presetKey);
    updateActiveVehicleCheck({ vehicle: updatedVehicle });
  };

  const handleAddRoad = () => {
    addElement({
      id: `road-${Date.now().toString(36)}`,
      type: 'road',
      start: { x: 50, y: 100 },
      end: { x: 600, y: 100 },
      width: 240, // 20ft road
      hasFootpath: true,
      footpathWidth: 36,
      name: 'Main Street 20ft',
      layer: 'roads_access',
    });
  };

  const handleAddGate = () => {
    const walls = project.elements.filter((e) => e.type === 'wall');
    const wallId = walls[0]?.id || 'default-wall';
    addElement({
      id: `gate-${Date.now().toString(36)}`,
      type: 'gate',
      wallId,
      offset: 120,
      width: 144, // 12ft clear opening
      height: 120, // 10ft clear height
      gateType: 'sliding',
      postThickness: 18,
      label: 'Main Plot Gate',
      layer: 'doors_windows',
    });
  };

  const handleAddObstacle = (type: 'pole' | 'hanging_wire' | 'tree' | 'parked_car') => {
    addElement({
      id: `obs-${Date.now().toString(36)}`,
      type: 'obstacle',
      obstacleType: type,
      x: 180,
      y: 180,
      width: type === 'hanging_wire' ? 20 : type === 'parked_car' ? 70 : 36,
      height: type === 'hanging_wire' ? 240 : type === 'parked_car' ? 175 : 36,
      rotation: 0,
      height3d: type === 'hanging_wire' ? 6 : 96,
      elevation: type === 'hanging_wire' ? 108 : undefined, // 9ft wire
      isOverhead: type === 'hanging_wire',
      label: type === 'hanging_wire' ? 'Hanging Cable 9ft' : type,
      layer: 'roads_access',
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm transition-all duration-200 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{tVc.title}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-950 border border-sky-500/30 text-sky-400 font-mono">
                  Kinematic Swept Path
                </span>
              </h2>
              <p className="text-xs text-slate-400">{tVc.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Vehicle Selection & Specs */}
          <div className="lg:col-span-6 space-y-4">
            {/* Presets Dropdown */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                {tVc.selectVehicle}
              </label>
              <select
                value={
                  Object.keys(VEHICLE_PRESETS).find(
                    (k) => VEHICLE_PRESETS[k].name === vehicle.name
                  ) || 'custom'
                }
                onChange={(e) => handlePresetSelect(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium focus:outline-none focus:border-sky-500"
              >
                {Object.entries(VEHICLE_PRESETS).map(([k, p]) => (
                  <option key={k} value={k}>
                    {p.nameUrdu ? `${p.nameUrdu} (${p.name})` : p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Editable Vehicle Dimensions Grid */}
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
                <span className="text-xs font-bold text-sky-400">Pamaish (Dimensions)</span>
                <span className="text-[11px] text-slate-400 font-mono">
                  L: {formatLength(vehicle.length, unitSystem)} × W: {formatLength(vehicle.width, unitSystem)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Lambai (Length)</label>
                  <input
                    type="text"
                    defaultValue={formatInputValue(vehicle.length, unitSystem)}
                    onBlur={(e) => {
                      const v = parseLengthInput(e.target.value, unitSystem);
                      if (v > 0) updateActiveVehicleCheck({ vehicle: { ...vehicle, length: v } });
                    }}
                    className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Chorai (Width)</label>
                  <input
                    type="text"
                    defaultValue={formatInputValue(vehicle.width, unitSystem)}
                    onBlur={(e) => {
                      const v = parseLengthInput(e.target.value, unitSystem);
                      if (v > 0) updateActiveVehicleCheck({ vehicle: { ...vehicle, width: v } });
                    }}
                    className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Oonchai (Height)</label>
                  <input
                    type="text"
                    defaultValue={formatInputValue(vehicle.height, unitSystem)}
                    onBlur={(e) => {
                      const v = parseLengthInput(e.target.value, unitSystem);
                      if (v > 0) updateActiveVehicleCheck({ vehicle: { ...vehicle, height: v } });
                    }}
                    className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Wheelbase</label>
                  <input
                    type="text"
                    defaultValue={formatInputValue(vehicle.wheelbase, unitSystem)}
                    onBlur={(e) => {
                      const v = parseLengthInput(e.target.value, unitSystem);
                      if (v > 0) updateActiveVehicleCheck({ vehicle: { ...vehicle, wheelbase: v } });
                    }}
                    className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Min Turn Radius</label>
                  <input
                    type="text"
                    defaultValue={formatInputValue(vehicle.minTurningRadius, unitSystem)}
                    onBlur={(e) => {
                      const v = parseLengthInput(e.target.value, unitSystem);
                      if (v > 0) updateActiveVehicleCheck({ vehicle: { ...vehicle, minTurningRadius: v } });
                    }}
                    className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Mirror Extra (Side)</label>
                  <input
                    type="text"
                    defaultValue={formatInputValue(vehicle.mirrorExtraWidth || 8, unitSystem)}
                    onBlur={(e) => {
                      const v = parseLengthInput(e.target.value, unitSystem);
                      if (v >= 0) updateActiveVehicleCheck({ vehicle: { ...vehicle, mirrorExtraWidth: v } });
                    }}
                    className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Quick Environment Setup Tools */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                Environment & Obstacles (Sarak, Gate, Khambay)
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleAddRoad}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-sky-400 font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Sarak (Road)</span>
                </button>
                <button
                  onClick={handleAddGate}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-amber-400 font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Gate</span>
                </button>
                <button
                  onClick={() => handleAddObstacle('pole')}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-rose-400 font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Khamba (Pole)</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handleAddObstacle('hanging_wire')}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-yellow-400 font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Wire (9ft Cable)</span>
                </button>
                <button
                  onClick={() => handleAddObstacle('tree')}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Darakht (Tree)</span>
                </button>
              </div>
            </div>

            {/* Path Controls */}
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-sky-400" />
                  <span>Rasta (Simulation Path): {waypoints.length} Points</span>
                </span>
                <button
                  onClick={clearWaypointsInActiveVehicleCheck}
                  className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Path</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={runAutoPath}
                  className="py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold text-xs text-white flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/20 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{tVc.autoPath}</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTool('vehicle_check');
                    onClose();
                  }}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-bold text-xs text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                  <span>Canvas Par Points Lagayein</span>
                </button>
              </div>

              {/* Toggles */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-700/40">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={allowFootpath}
                    onChange={(e) => updateActiveVehicleCheck({ allowFootpath: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
                  />
                  <span>{tVc.allowFootpath}</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px]">Margin:</span>
                  <input
                    type="text"
                    defaultValue={formatInputValue(safetyMargin, unitSystem)}
                    onBlur={(e) => {
                      const v = parseLengthInput(e.target.value, unitSystem);
                      if (v >= 0) updateActiveVehicleCheck({ safetyMargin: v });
                    }}
                    className="w-14 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-white font-mono text-center text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Simulation Verdict, Clearance Numbers, Suggestions */}
          <div className="lg:col-span-6 space-y-4 flex flex-col">
            {/* Playback bar */}
            <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setVehicleCheckPlaying(!isVehicleCheckPlaying)}
                    className="w-8 h-8 rounded-xl bg-sky-600 hover:bg-sky-500 flex items-center justify-center text-white transition-colors"
                  >
                    {isVehicleCheckPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  <span className="font-semibold text-slate-200">
                    Playback Animation: {Math.round(vehicleCheckPlaybackProgress * 100)}%
                  </span>
                </div>
                <button
                  onClick={() => setVehicleCheckPlaybackProgress(0)}
                  className="p-1.5 text-slate-400 hover:text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={vehicleCheckPlaybackProgress}
                onChange={(e) => setVehicleCheckPlaybackProgress(parseFloat(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              />
            </div>

            {/* Primary Verdict Card */}
            {result ? (
              <div
                className={`p-5 rounded-3xl border flex flex-col gap-3 shadow-lg ${
                  result.verdict === 'pass'
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                    : result.verdict === 'tight'
                    ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                    : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {result.verdict === 'pass' && <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />}
                    {result.verdict === 'tight' && <AlertTriangle className="w-7 h-7 text-amber-400 shrink-0" />}
                    {result.verdict === 'fail' && <XCircle className="w-7 h-7 text-rose-400 shrink-0" />}
                    <div>
                      <h3 className="text-lg font-black tracking-tight leading-none">
                        {result.verdict === 'pass' && tVc.verdictPass}
                        {result.verdict === 'tight' && tVc.verdictTight}
                        {result.verdict === 'fail' && tVc.verdictFail}
                      </h3>
                      <p className="text-xs opacity-80 mt-0.5">
                        {result.verdict === 'pass' && 'Gari aasaani se plot gate ke andar dakhil hosakti hai.'}
                        {result.verdict === 'tight' && 'Jagah bohat tang hai, bacha kar gari nikalni paregi.'}
                        {result.verdict === 'fail' && 'Deewar, gate post ya rukawat se takrao horaha hai!'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Clearance Metric Badges */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/10">
                    <span className="text-[10px] text-slate-400 block">{tVc.gateClearance}</span>
                    <span className="text-sm font-bold font-mono text-white">
                      {result.minGateClearance < 900
                        ? formatLength(result.minGateClearance, unitSystem)
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/10">
                    <span className="text-[10px] text-slate-400 block">{tVc.sideClearance}</span>
                    <span className="text-sm font-bold font-mono text-white">
                      {result.minSideClearance < 900
                        ? formatLength(result.minSideClearance, unitSystem)
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/10">
                    <span className="text-[10px] text-slate-400 block">{tVc.overheadClearance}</span>
                    <span
                      className={`text-sm font-bold font-mono ${
                        result.minOverheadClearance < 0 ? 'text-rose-400' : 'text-white'
                      }`}
                    >
                      {result.minOverheadClearance < 900
                        ? formatLength(result.minOverheadClearance, unitSystem)
                        : 'Clear'}
                    </span>
                  </div>
                </div>

                {/* Collision Details List */}
                {result.collisions.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-xs font-bold text-rose-400 block">
                      Takrao Ki Tafseel ({result.collisions.length}):
                    </span>
                    <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                      {result.collisions.map((c, i) => (
                        <div
                          key={i}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-900/30 border border-rose-500/30 text-[11px] text-rose-200 flex items-start gap-1.5"
                        >
                          <span className="font-bold">•</span>
                          <span>{c.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations and Suggestions */}
                {result.suggestions.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-white/10">
                    <span className="text-xs font-bold text-amber-400 block">
                      Architectural Recommendations:
                    </span>
                    <ul className="text-xs space-y-1 text-slate-300">
                      {result.suggestions.map((s, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-amber-400">✓</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 rounded-3xl bg-slate-800/40 border border-slate-700/60 text-center">
                <Truck className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
                <h4 className="text-sm font-bold text-slate-300">Auto Path Chalaayein</h4>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  "Auto Path" dabayein taake app khud sarak se gate tak ka rasta banakar swept path check kare.
                </p>
                <button
                  onClick={runAutoPath}
                  className="mt-4 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold text-xs text-white shadow-lg shadow-sky-600/20"
                >
                  Auto Path Start
                </button>
              </div>
            )}

            {/* Action Bar */}
            <div className="mt-auto pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  onClose();
                  setActiveTool('vehicle_check');
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5 text-sky-400" />
                <span>View on Canvas</span>
              </button>

              {onExportReport && (
                <button
                  onClick={onExportReport}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF Access Report</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
