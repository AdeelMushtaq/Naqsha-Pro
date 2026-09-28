/**
 * 3D Viewport Control Toolbar for Naqsha CAD.
 * Camera presets, walkthrough toggle, section cut, sun time, floor selector, and exports.
 */

import React, { useState } from 'react';
import {
  Camera,
  Sun,
  Layers,
  Scissors,
  Download,
  Grid,
  Eye,
  Box,
  Compass,
  FileCode,
  Image,
  ChevronDown,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { View3DMode } from '../models/types';

interface Toolbar3DProps {
  onPresetView: (preset: 'top' | 'front' | 'side' | 'isometric' | 'perspective') => void;
  onExportPNG: () => void;
  onExportGLB: () => void;
  onExportOBJ: () => void;
  onZoomToFit: () => void;
}

export const Toolbar3D: React.FC<Toolbar3DProps> = ({
  onPresetView,
  onExportPNG,
  onExportGLB,
  onExportOBJ,
  onZoomToFit,
}) => {
  const {
    view3dMode,
    setView3dMode,
    cameraMode3d,
    setCameraMode3d,
    floorViewMode3d,
    setFloorViewMode3d,
    sunTimeOfDay,
    setSunTimeOfDay,
    sectionCutHeight,
    setSectionCutHeight,
    wireframe3d,
    toggleWireframe3d,
    show3dDimensions,
    toggle3dDimensions,
  } = useStore();

  const [showSectionSlider, setShowSectionSlider] = useState(false);
  const [showSunSlider, setShowSunSlider] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  return (
    <div className="absolute top-4 left-6 right-6 z-30 pointer-events-none flex items-center justify-between">
      {/* Left: View presets & camera modes */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-2xl backdrop-blur-md pointer-events-auto">
        <button
          onClick={() => onPresetView('isometric')}
          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-slate-800 text-slate-200 transition-colors flex items-center gap-1.5"
          title="Isometric View"
        >
          <Box className="w-3.5 h-3.5 text-sky-400" />
          <span>Iso</span>
        </button>

        <button
          onClick={() => onPresetView('top')}
          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-slate-800 text-slate-200 transition-colors"
          title="Top View"
        >
          Top
        </button>

        <button
          onClick={() => onPresetView('front')}
          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-slate-800 text-slate-200 transition-colors"
          title="Front View"
        >
          Front
        </button>

        <button
          onClick={() => onPresetView('side')}
          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-slate-800 text-slate-200 transition-colors"
          title="Side View"
        >
          Side
        </button>

        <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

        {/* Walkthrough Toggle */}
        <button
          onClick={() => setCameraMode3d(cameraMode3d === 'orbit' ? 'walkthrough' : 'orbit')}
          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            cameraMode3d === 'walkthrough'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
              : 'hover:bg-slate-800 text-slate-300'
          }`}
          title="Walkthrough (First-Person WASD) Mode"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Walkthrough</span>
        </button>

        <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

        {/* Floor view mode selector */}
        <button
          onClick={() => {
            const nextMode =
              floorViewMode3d === 'all'
                ? 'active'
                : floorViewMode3d === 'active'
                ? 'explode'
                : 'all';
            setFloorViewMode3d(nextMode);
          }}
          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-slate-800 text-slate-200 transition-colors flex items-center gap-1.5"
          title="Toggle Floors: All, Active Floor, Explode View"
        >
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span className="capitalize">{floorViewMode3d}</span>
        </button>
      </div>

      {/* Right: Lighting, Section Cut, Wireframe, Export */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-2xl backdrop-blur-md pointer-events-auto">
        {/* Section Cut Tool */}
        <div className="relative">
          <button
            onClick={() => setShowSectionSlider(!showSectionSlider)}
            className={`p-2 rounded-xl transition-colors ${
              sectionCutHeight < 300
                ? 'bg-sky-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Horizontal Section Cut Slider"
          >
            <Scissors className="w-4 h-4" />
          </button>

          {showSectionSlider && (
            <div className="absolute top-full mt-2 right-0 p-3 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-48 animate-in fade-in slide-in-from-top-2">
              <div className="flex justify-between text-xs text-slate-300 font-medium mb-1.5">
                <span>Cut Height:</span>
                <span className="font-mono text-sky-400">
                  {sectionCutHeight >= 300 ? 'None' : `${Math.round(sectionCutHeight / 12)}'`}
                </span>
              </div>
              <input
                type="range"
                min="24"
                max="300"
                value={sectionCutHeight}
                onChange={(e) => setSectionCutHeight(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Sun Direction / Time of Day */}
        <div className="relative">
          <button
            onClick={() => setShowSunSlider(!showSunSlider)}
            className="p-2 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors"
            title="Sun / Time of Day"
          >
            <Sun className="w-4 h-4 text-amber-400" />
          </button>

          {showSunSlider && (
            <div className="absolute top-full mt-2 right-0 p-3 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-48 animate-in fade-in slide-in-from-top-2">
              <div className="flex justify-between text-xs text-slate-300 font-medium mb-1.5">
                <span>Time of Day:</span>
                <span className="font-mono text-amber-400">{sunTimeOfDay}:00</span>
              </div>
              <input
                type="range"
                min="6"
                max="19"
                value={sunTimeOfDay}
                onChange={(e) => setSunTimeOfDay(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Wireframe toggle */}
        <button
          onClick={toggleWireframe3d}
          className={`p-2 rounded-xl transition-colors ${
            wireframe3d ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
          }`}
          title="Toggle Wireframe Mode"
        >
          <Grid className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

        {/* 3D Export Menu */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export 3D</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showExportMenu && (
            <div className="absolute top-full mt-2 right-0 p-1.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-40 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2">
              <button
                onClick={() => {
                  onExportPNG();
                  setShowExportMenu(false);
                }}
                className="px-3 py-1.5 rounded-xl hover:bg-slate-800 text-left text-xs font-medium text-slate-200 transition-colors flex items-center gap-2"
              >
                <Image className="w-3.5 h-3.5 text-emerald-400" />
                <span>PNG Image</span>
              </button>
              <button
                onClick={() => {
                  onExportGLB();
                  setShowExportMenu(false);
                }}
                className="px-3 py-1.5 rounded-xl hover:bg-slate-800 text-left text-xs font-medium text-slate-200 transition-colors flex items-center gap-2"
              >
                <Box className="w-3.5 h-3.5 text-sky-400" />
                <span>GLB (glTF 3D)</span>
              </button>
              <button
                onClick={() => {
                  onExportOBJ();
                  setShowExportMenu(false);
                }}
                className="px-3 py-1.5 rounded-xl hover:bg-slate-800 text-left text-xs font-medium text-slate-200 transition-colors flex items-center gap-2"
              >
                <FileCode className="w-3.5 h-3.5 text-amber-400" />
                <span>OBJ Model</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
