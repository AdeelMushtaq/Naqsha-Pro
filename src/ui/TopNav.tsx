import React, { useState, useEffect } from 'react';
import {
  Undo2,
  Redo2,
  Grid,
  Magnet,
  Maximize,
  HelpCircle,
  FolderOpen,
  Download,
  Globe,
  Sun,
  Moon,
  ChevronDown,
  Layers,
  Building2,
  Calculator,
  Library,
  PieChart,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Truck,
  SlidersHorizontal,
  Wrench,
  Check,
  Sparkles,
} from 'lucide-react';
import Konva from 'konva';
import { useStore } from '../store/useStore';
import { translations } from '../i18n';
import { PWAInstallButton } from './PWAInstallButton';
import { InfoPanel } from './InfoPanel';
import { LayersPanel } from './LayersPanel';

interface TopNavProps {
  stageRef: React.RefObject<Konva.Stage | null>;
  onOpenProjects: () => void;
  onOpenShortcuts: () => void;
  onOpenLibrary: () => void;
  onOpenEstimator: () => void;
  onOpenExport: () => void;
  onOpenVehicleCheck?: () => void;
  onToggleInfoPanel: () => void;
  isInfoPanelOpen: boolean;
  onToggleLayersPanel: () => void;
  isLayersPanelOpen: boolean;
  onToggleFloorsPanel: () => void;
  isFloorsPanelOpen: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  stageRef,
  onOpenProjects,
  onOpenShortcuts,
  onOpenLibrary,
  onOpenEstimator,
  onOpenExport,
  onOpenVehicleCheck,
  onToggleInfoPanel,
  isInfoPanelOpen,
  onToggleLayersPanel,
  isLayersPanelOpen,
  onToggleFloorsPanel,
  isFloorsPanelOpen,
}) => {
  const {
    project,
    unitSystem,
    language,
    theme,
    showGrid,
    snapToGrid,
    showDimensions,
    zoom,
    selectedIds,
    canUndo,
    canRedo,
    undo,
    redo,
    setUnitSystem,
    setLanguage,
    setTheme,
    toggleGrid,
    toggleSnap,
    toggleDimensions,
    zoomIn,
    zoomOut,
    resetZoom,
    zoomToFit,
    toggleLock,
    toggleVisibility,
    view3dMode,
    setView3dMode,
    healWalls,
  } = useStore();

  const t = translations[language];

  // Active dropdown menu: 'view' | 'tools' | 'settings' | 'space' | null
  const [activeDropdown, setActiveDropdown] = useState<'view' | 'tools' | 'settings' | 'space' | null>(null);

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveDropdown(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const selectedElements = project.elements.filter((e) => selectedIds.includes(e.id));
  const isAnyLocked = selectedElements.some((e) => e.locked);
  const isAnyHidden = selectedElements.some((e) => e.hidden);

  const activeFloor =
    project.floors?.find((f) => f.id === project.activeFloorId)?.name || 'Ground Floor';

  const zoomPercent = Math.round(zoom * 100);

  return (
    <>
      {/* Invisible backdrop to dismiss any open dropdown */}
      {activeDropdown && (
        <div
          className="fixed inset-0 z-30 bg-transparent"
          onClick={() => setActiveDropdown(null)}
        />
      )}

      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 select-none shrink-0 z-40 relative">
        {/* Zone 1: Logo & Project / Floor Nav */}
        <div className="flex items-center gap-2 shrink-0">
          <a href="/" className="text-base font-bold tracking-tight text-white flex items-center gap-2 mr-1">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
            <span className="text-white hidden sm:inline">Naqsha</span>
            <span className="text-xs text-sky-400 font-normal">نقشہ</span>
          </a>

          {/* Project Switcher Chip */}
          <button
            onClick={onOpenProjects}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 transition-colors max-w-[130px] sm:max-w-[170px] truncate"
            title={t.projects.title}
          >
            <FolderOpen className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">{project.name}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </button>

          {/* Floor Switcher Chip */}
          <button
            onClick={onToggleFloorsPanel}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
              isFloorsPanelOpen
                ? 'bg-sky-950/60 border-sky-500/50 text-sky-300'
                : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-200'
            }`}
            title={t.floors.title}
          >
            <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden md:inline truncate max-w-[90px]">{activeFloor}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </button>
        </div>

        {/* Zone 2: Undo/Redo & Minimal Labeled Group Menus */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Undo & Redo */}
          <div className="flex items-center gap-0.5 p-0.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
            <button
              onClick={undo}
              disabled={!canUndo()}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
              title={`${t.canvas.undo} (Ctrl+Z)`}
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo()}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
              title={`${t.canvas.redo} (Ctrl+Y)`}
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Lock / Unlock button for selected items */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/60 animate-in fade-in">
              <button
                onClick={() => toggleLock()}
                className={`p-1.5 rounded-lg transition-colors ${
                  isAnyLocked ? 'bg-amber-500/20 text-amber-400' : 'text-slate-300 hover:text-white'
                }`}
                title={isAnyLocked ? 'Unlock (Ctrl+L)' : 'Lock (Ctrl+L)'}
              >
                {isAnyLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => toggleVisibility()}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white transition-colors"
                title="Hide / Show Object"
              >
                {isAnyHidden ? <EyeOff className="w-3.5 h-3.5 text-slate-500" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {/* 1. MANZAR (VIEW) GROUP DROPDOWN */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'view' ? null : 'view')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                activeDropdown === 'view' || view3dMode !== '2d'
                  ? 'bg-sky-500/20 border-sky-500/50 text-sky-200'
                  : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-sky-400" />
              <span>{language === 'ur' ? 'منظر (View)' : 'View'}</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-slate-700/70 text-slate-300 font-mono">
                {view3dMode.toUpperCase()}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* View Dropdown Card */}
            {activeDropdown === 'view' && (
              <div className="absolute right-0 sm:left-0 top-full mt-2 w-64 p-3 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150">
                {/* 2D / Split / 3D Mode */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    {language === 'ur' ? 'نقشہ کا ماڈل (Display Mode)' : 'Display Mode'}
                  </div>
                  <div className="grid grid-cols-3 gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => setView3dMode('2d')}
                      className={`py-1 text-xs font-bold rounded-lg transition-colors ${
                        view3dMode === '2d' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      2D Plan
                    </button>
                    <button
                      type="button"
                      onClick={() => setView3dMode('split')}
                      className={`py-1 text-xs font-bold rounded-lg transition-colors ${
                        view3dMode === 'split' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Split
                    </button>
                    <button
                      type="button"
                      onClick={() => setView3dMode('3d')}
                      className={`py-1 text-xs font-bold rounded-lg transition-colors ${
                        view3dMode === '3d' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      3D Model
                    </button>
                  </div>
                </div>

                {/* Unit Measurement (Ft / In) */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    {language === 'ur' ? 'پیمائش کی اکائی (Unit System)' : 'Unit System'}
                  </div>
                  <div className="grid grid-cols-2 gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => setUnitSystem('ft')}
                      className={`py-1 text-xs font-bold rounded-lg transition-colors ${
                        unitSystem === 'ft' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.canvas.unitFeet}
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnitSystem('in')}
                      className={`py-1 text-xs font-bold rounded-lg transition-colors ${
                        unitSystem === 'in' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.canvas.unitInches}
                    </button>
                  </div>
                </div>

                {/* Zoom & Screen Fit */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    {language === 'ur' ? 'زوم اور اسکرین (Zoom & Fit)' : 'Zoom & Fit'}
                  </div>
                  <div className="flex items-center justify-between bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60">
                    <button
                      type="button"
                      onClick={zoomOut}
                      className="p-1 rounded text-slate-300 hover:text-white"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span
                      onClick={resetZoom}
                      className="text-xs font-mono font-bold text-sky-400 cursor-pointer hover:underline"
                    >
                      {zoomPercent}% (Reset)
                    </span>
                    <button
                      type="button"
                      onClick={zoomIn}
                      className="p-1 rounded text-slate-300 hover:text-white"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => zoomToFit()}
                      className="p-1 rounded text-slate-400 hover:text-sky-400 ml-1 border-l border-slate-700 pl-2"
                      title="Fit to Screen"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Grid & Snapping Toggles */}
                <div className="flex flex-col gap-1 border-t border-slate-800 pt-2">
                  <button
                    type="button"
                    onClick={toggleGrid}
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg text-xs hover:bg-slate-800 text-slate-300"
                  >
                    <div className="flex items-center gap-2">
                      <Grid className="w-3.5 h-3.5 text-sky-400" />
                      <span>{language === 'ur' ? 'گریڈ لائنیں (Grid)' : 'Grid Lines'}</span>
                    </div>
                    {showGrid && <Check className="w-3.5 h-3.5 text-sky-400" />}
                  </button>
                  <button
                    type="button"
                    onClick={toggleSnap}
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg text-xs hover:bg-slate-800 text-slate-300"
                  >
                    <div className="flex items-center gap-2">
                      <Magnet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{language === 'ur' ? 'مقناطیسی اسنیپ (Magnetic Snap)' : 'Magnetic Snap'}</span>
                    </div>
                    {snapToGrid && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                  <button
                    type="button"
                    onClick={toggleDimensions}
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg text-xs hover:bg-slate-800 text-slate-300"
                  >
                    <div className="flex items-center gap-2">
                      <Maximize className="w-3.5 h-3.5 text-amber-400" />
                      <span>{language === 'ur' ? 'پیمائش دکھائیں (Show Dimensions)' : 'Wall Dimensions'}</span>
                    </div>
                    {showDimensions && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. TOOLS & PANELS GROUP DROPDOWN */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'tools' ? null : 'tools')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                activeDropdown === 'tools' || isFloorsPanelOpen
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                  : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'ur' ? 'اوزار (Tools)' : 'Tools'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Tools Dropdown Card */}
            {activeDropdown === 'tools' && (
              <div className="absolute right-0 sm:left-0 top-full mt-2 w-64 p-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  {language === 'ur' ? 'پینل اور سہولیات (Panels & Calculators)' : 'Panels & Calculators'}
                </div>

                {/* Manzil (Floors) */}
                <button
                  type="button"
                  onClick={() => {
                    onToggleFloorsPanel();
                    setActiveDropdown(null);
                  }}
                  className="flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-400" />
                    <span>{language === 'ur' ? 'منزلیں (Floors Manager)' : 'Floors Manager'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{activeFloor}</span>
                </button>

                {/* Raqba (Area Info) */}
                <button
                  type="button"
                  onClick={() => {
                    onToggleInfoPanel();
                    setActiveDropdown(null);
                  }}
                  className="flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-emerald-400" />
                    <span>{language === 'ur' ? 'رقبہ معلومات (Area & Dimensions)' : 'Area & Room Info'}</span>
                  </div>
                </button>

                {/* Thekedar (Cost Estimator) */}
                <button
                  type="button"
                  onClick={() => {
                    onOpenEstimator();
                    setActiveDropdown(null);
                  }}
                  className="flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-amber-400" />
                    <span>{language === 'ur' ? 'ٹھیکیدار خرچہ (Cost Estimator)' : 'Cost Estimator'}</span>
                  </div>
                </button>

                {/* Gari Entry Check */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenVehicleCheck) onOpenVehicleCheck();
                    setActiveDropdown(null);
                  }}
                  className="flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-sky-400" />
                    <span>{language === 'ur' ? 'گاڑی راستہ چیک (Swept Path)' : 'Vehicle Swept Path'}</span>
                  </div>
                </button>

                {/* Furniture Library */}
                <button
                  type="button"
                  onClick={() => {
                    onOpenLibrary();
                    setActiveDropdown(null);
                  }}
                  className="flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Library className="w-4 h-4 text-purple-400" />
                    <span>{language === 'ur' ? 'سامان لائبریری (Furniture Library)' : 'Furniture Library'}</span>
                  </div>
                </button>

                {/* Heal Walls */}
                <button
                  type="button"
                  onClick={() => {
                    healWalls();
                    setActiveDropdown(null);
                  }}
                  className="flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors border-t border-slate-800 pt-2"
                  title={language === 'ur' ? 'ٹوٹی یا کٹی ہوئی سیدھی دیواروں کو آپس میں جوڑیں' : 'Heal and merge broken/split collinear walls'}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <span>{language === 'ur' ? 'دیواریں جوڑیں (Heal Walls)' : 'Heal / Merge Walls'}</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 3. LAYERS GROUP DROPDOWN (Shifted into Top Nav) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setActiveDropdown(null);
                onToggleLayersPanel();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                isLayersPanelOpen
                  ? 'bg-sky-500/20 border-sky-500/50 text-sky-200'
                  : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-200'
              }`}
              title={language === 'ur' ? 'تہیں پینل (Layers Panel)' : 'Layers Panel'}
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>{language === 'ur' ? 'تہیں' : 'Layers'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Layers Dropdown Popover */}
            {isLayersPanelOpen && (
              <div className="absolute right-0 sm:left-0 top-full mt-2 w-80 z-50 animate-in fade-in zoom-in-95 duration-150">
                <LayersPanel onClose={onToggleLayersPanel} />
              </div>
            )}
          </div>

          {/* 3. LIVE SPACE & MEASUREMENTS GROUP DROPDOWN (Shifted into Top Nav) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'space' ? null : 'space')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                activeDropdown === 'space'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                  : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-200'
              }`}
              title={language === 'ur' ? 'لائیو رقبہ اور پیمائش' : 'Live Space & Measurements'}
            >
              <PieChart className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === 'ur' ? 'رقبہ و پیمائش' : 'Live Space'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Live Space Dropdown Popover */}
            {activeDropdown === 'space' && (
              <div className="absolute right-0 sm:left-0 top-full mt-2 w-76 sm:w-80 z-50 animate-in fade-in zoom-in-95 duration-150">
                <InfoPanel onClose={() => setActiveDropdown(null)} />
              </div>
            )}
          </div>
        </div>

        {/* Zone 3: Settings & 1-Click Export */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Settings & Help Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(activeDropdown === 'settings' ? null : 'settings')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                activeDropdown === 'settings'
                  ? 'bg-slate-700 text-white border-slate-600'
                  : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-300'
              }`}
              title="Settings & Help"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">{language === 'ur' ? 'سیٹنگز' : 'Settings'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Settings Dropdown Card */}
            {activeDropdown === 'settings' && (
              <div className="absolute right-0 top-full mt-2 w-56 p-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
                {/* Language Switch */}
                <button
                  type="button"
                  onClick={() => setLanguage(language === 'ur' ? 'en' : 'ur')}
                  className="flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-sky-400" />
                    <span>{language === 'ur' ? 'زبان (Language)' : 'Language'}</span>
                  </div>
                  <span className="font-bold text-sky-400 font-mono">
                    {language === 'ur' ? 'اردو' : 'English'}
                  </span>
                </button>

                {/* Theme Mode */}
                <button
                  type="button"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-slate-800"
                >
                  <div className="flex items-center gap-2">
                    {theme === 'dark' ? (
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Moon className="w-3.5 h-3.5 text-sky-400" />
                    )}
                    <span>{language === 'ur' ? 'تھیم (Theme Mode)' : 'Color Theme'}</span>
                  </div>
                  <span className="capitalize font-mono text-slate-400">{theme}</span>
                </button>

                {/* Shortcuts & Help */}
                <button
                  type="button"
                  onClick={() => {
                    onOpenShortcuts();
                    setActiveDropdown(null);
                  }}
                  className="flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{language === 'ur' ? 'شارٹ کٹس (Shortcuts)' : 'Keyboard Shortcuts'}</span>
                  </div>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400">
                    ?
                  </kbd>
                </button>
              </div>
            )}
          </div>

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Clear Labeled Export Button */}
          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold text-xs text-white shadow-lg shadow-sky-600/25 transition-all"
            title="Download PDF, PNG, DXF, or JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{language === 'ur' ? 'ایکسپورٹ (Export)' : 'Export Plan'}</span>
          </button>
        </div>
      </header>
    </>
  );
};
