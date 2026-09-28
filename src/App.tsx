/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import Konva from 'konva';
import { useStore } from './store/useStore';
import { TopNav } from './ui/TopNav';
import { LeftToolbar } from './ui/LeftToolbar';
import { PropertiesPanel } from './ui/PropertiesPanel';
import { FloorPlanCanvas } from './canvas/FloorPlanCanvas';
import { ProjectsModal } from './ui/ProjectsModal';
import { ShortcutsModal } from './ui/ShortcutsModal';
import { LibraryModal } from './ui/LibraryModal';
import { EstimatorModal } from './ui/EstimatorModal';
import { ExportModal } from './ui/ExportModal';
import { FloorsPanel } from './ui/FloorsPanel';
import { MobileBottomBar } from './ui/MobileBottomBar';
import { MobilePropertiesSheet } from './ui/MobilePropertiesSheet';
import { OfflineIndicator } from './ui/OfflineIndicator';
import { VehicleCheckModal } from './ui/VehicleCheckModal';
import { translations } from './i18n';
import { Compass, Minus, Info } from 'lucide-react';

const View3D = React.lazy(() => import('./view3d/View3D'));

export default function App() {
  const stageRef = useRef<Konva.Stage | null>(null);

  // Modal dialog states
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isEstimatorOpen, setIsEstimatorOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  // Floating panel states
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(true);
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false);
  const [isFloorsPanelOpen, setIsFloorsPanelOpen] = useState(false);

  const {
    project,
    activeTool,
    selectedIds,
    theme,
    language,
    setActiveTool,
    undo,
    redo,
    deleteElements,
    duplicateElement,
    selectAll,
    clearSelection,
    toggleLock,
    copySelection,
    pasteClipboard,
    zoomIn,
    zoomOut,
    resetZoom,
    view3dMode,
    isVehicleCheckOpen,
    setVehicleCheckOpen,
  } = useStore();

  const t = translations[language];

  // Open mobile sheet automatically if an element gets selected on mobile
  useEffect(() => {
    if (selectedIds.length > 0 && window.innerWidth < 768) {
      setIsMobileSheetOpen(true);
    }
  }, [selectedIds]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if (isCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // Lock / Unlock shortcut (Ctrl+L)
      if (isCtrl && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        if (selectedIds.length > 0) {
          toggleLock();
        }
        return;
      }

      // Copy (Ctrl+C) & Paste (Ctrl+V)
      if (isCtrl && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copySelection();
        return;
      }

      if (isCtrl && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        pasteClipboard();
        return;
      }

      if (isCtrl && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedIds.length > 0) {
          duplicateElement(selectedIds[0]);
        }
        return;
      }

      if (isCtrl && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectAll();
        return;
      }

      // Zoom shortcuts (Ctrl++ / Ctrl+-)
      if (isCtrl && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomIn();
        return;
      }

      if (isCtrl && e.key === '-') {
        e.preventDefault();
        zoomOut();
        return;
      }

      if (isCtrl && e.key === '0') {
        e.preventDefault();
        resetZoom();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          deleteElements(selectedIds);
        }
        return;
      }

      if (e.key === 'Escape') {
        clearSelection();
        setActiveTool('select');
        setIsLayersPanelOpen(false);
        setIsFloorsPanelOpen(false);
        setIsProjectsOpen(false);
        setIsShortcutsOpen(false);
        setIsLibraryOpen(false);
        setIsEstimatorOpen(false);
        setIsExportOpen(false);
        setIsMobileSheetOpen(false);
        setVehicleCheckOpen(false);
        return;
      }

      // Tool switches
      switch (e.key.toLowerCase()) {
        case 'v':
          setActiveTool('select');
          break;
        case 'w':
          setActiveTool('wall');
          break;
        case 'g':
          setActiveTool('curve_wall');
          break;
        case 'r':
          setActiveTool('box');
          break;
        case 'c':
          setActiveTool('circle');
          break;
        case 'd':
          setActiveTool('door');
          break;
        case 'k':
          setActiveTool('window');
          break;
        case 'f':
          setIsLibraryOpen(true);
          break;
        case 'n':
          setActiveTool('dimension');
          break;
        case 'p':
          setActiveTool('plot');
          break;
        case 't':
          setActiveTool('text');
          break;
        case 'h':
          setActiveTool('pan');
          break;
        case 'm':
          setActiveTool('measure');
          break;
        case 's':
          setActiveTool('stair');
          break;
        case 'e':
          setActiveTool('vehicle_check');
          setVehicleCheckOpen(true);
          break;
        case 'j':
          setActiveTool('gate');
          break;
        case 'o':
          setActiveTool('road');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedIds,
    undo,
    redo,
    deleteElements,
    duplicateElement,
    selectAll,
    clearSelection,
    setActiveTool,
    toggleLock,
    copySelection,
    pasteClipboard,
    zoomIn,
    zoomOut,
    resetZoom,
  ]);

  // Helper text for currently active tool
  const getToolHelpText = () => {
    switch (activeTool) {
      case 'wall':
        return t.canvas.drawingHelpWall;
      case 'curve_wall':
        return 'Drag karke golaai wali deewar banayein. Curve handle se arc adjust karein.';
      case 'box':
        return t.canvas.drawingHelpBox;
      case 'circle':
        return t.canvas.drawingHelpCircle;
      case 'door':
        return t.canvas.drawingHelpDoor;
      case 'window':
        return t.canvas.drawingHelpWindow;
      case 'dimension':
        return 'Do points par click aur drag karein permanent pamaish line lagane ke liye.';
      case 'plot':
        return 'Click aur drag karke plot ki hadbandi banayein.';
      case 'text':
        return 'Canvas par click karein note ya naam likhne ke liye.';
      case 'measure':
        return t.canvas.drawingHelpMeasure;
      case 'pan':
        return 'Canvas drag karke idhar udhar ghumayein.';
      default:
        return null;
    }
  };

  const helpText = getToolHelpText();
  const isEmptyPlan = project.elements.length === 0;

  return (
    <div
      className={`h-screen w-screen flex flex-col overflow-hidden ${
        theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Bar Navigation */}
      <TopNav
        stageRef={stageRef}
        onOpenProjects={() => setIsProjectsOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onOpenEstimator={() => setIsEstimatorOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenVehicleCheck={() => setVehicleCheckOpen(true)}
        onToggleInfoPanel={() => setIsInfoPanelOpen(!isInfoPanelOpen)}
        isInfoPanelOpen={isInfoPanelOpen}
        onToggleLayersPanel={() => setIsLayersPanelOpen(!isLayersPanelOpen)}
        isLayersPanelOpen={isLayersPanelOpen}
        onToggleFloorsPanel={() => setIsFloorsPanelOpen(!isFloorsPanelOpen)}
        isFloorsPanelOpen={isFloorsPanelOpen}
      />

      {/* Main CAD Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Left Toolbar (Shown in 2D and Split view modes) */}
        {view3dMode !== '3d' && (
          <div className="hidden md:flex h-full shrink-0 relative z-40">
            <LeftToolbar
              onOpenLibrary={() => setIsLibraryOpen(true)}
              onOpenVehicleCheck={() => setVehicleCheckOpen(true)}
            />
          </div>
        )}

        {/* 2D Plan Canvas (shown in 2D and Split mode) */}
        {view3dMode !== '3d' && (
          <main className={`${view3dMode === 'split' ? 'w-1/2 border-r border-slate-800' : 'flex-1'} relative overflow-hidden bg-slate-900`}>
            <FloorPlanCanvas
              stageRef={stageRef}
              onOpenLibrary={() => setIsLibraryOpen(true)}
            />

            {/* Active Tool Help Banner */}
            {helpText && activeTool !== 'select' && (
              <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-sky-500/40 text-sky-300 text-xs font-medium shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2">
                  <Info className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                  <span>{helpText}</span>
                </div>
              </div>
            )}

            {/* Backdrop for floating popover panels so clicking outside closes them */}
            {(isLayersPanelOpen || isFloorsPanelOpen) && (
              <div
                className="fixed inset-0 z-30 cursor-default"
                onClick={() => {
                  setIsLayersPanelOpen(false);
                  setIsFloorsPanelOpen(false);
                }}
              />
            )}

            {/* Floors Popover Panel */}
            {isFloorsPanelOpen && (
              <div className="absolute top-2 left-60 z-40 animate-in fade-in slide-in-from-top-2 duration-150">
                <FloorsPanel onClose={() => setIsFloorsPanelOpen(false)} />
              </div>
            )}

            {/* Empty Plan Guidance Banner */}
            {isEmptyPlan && (
              <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
                <div className="max-w-sm rounded-3xl bg-slate-900/95 border border-slate-700/80 p-6 text-center shadow-2xl backdrop-blur-md pointer-events-auto">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center mx-auto mb-3 text-sky-400">
                    <Compass className="w-6 h-6 animate-spin-slow" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    {t.canvas.emptyHintTitle}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    {t.canvas.emptyHintDesc}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setActiveTool('wall')}
                      className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-sky-600/30"
                    >
                      <Minus className="w-4 h-4 stroke-[3]" />
                      {t.canvas.emptyHintStart}
                    </button>
                    <button
                      onClick={() => setIsLibraryOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
                    >
                      Library Kholein
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        )}

        {/* 3D Viewport (shown in Split and 3D mode) */}
        {view3dMode !== '2d' && (
          <div className={`${view3dMode === 'split' ? 'w-1/2' : 'flex-1'} relative overflow-hidden bg-slate-950`}>
            <React.Suspense
              fallback={
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
                  <span className="text-xs font-mono font-medium">3D Model Tayyar Ho Raha Hai (Loading 3D)...</span>
                </div>
              }
            >
              <View3D />
            </React.Suspense>
          </div>
        )}

        {/* Desktop Right Properties Panel */}
        <div className="hidden md:flex">
          <PropertiesPanel />
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomBar
        onToggleSheet={() => setIsMobileSheetOpen(!isMobileSheetOpen)}
        isSheetOpen={isMobileSheetOpen}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onOpenVehicleCheck={() => setVehicleCheckOpen(true)}
      />

      {/* Mobile Properties Bottom Sheet */}
      <MobilePropertiesSheet
        isOpen={isMobileSheetOpen}
        onClose={() => setIsMobileSheetOpen(false)}
      />

      {/* Modals */}
      <ProjectsModal
        isOpen={isProjectsOpen}
        onClose={() => setIsProjectsOpen(false)}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <LibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
      />

      <EstimatorModal
        isOpen={isEstimatorOpen}
        onClose={() => setIsEstimatorOpen(false)}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        stageRef={stageRef}
      />

      <VehicleCheckModal
        isOpen={isVehicleCheckOpen}
        onClose={() => setVehicleCheckOpen(false)}
        onExportReport={() => setIsExportOpen(true)}
      />

      {/* Offline Status Toast */}
      <OfflineIndicator />
    </div>
  );
}
