import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Trash2,
  Copy,
  DoorOpen,
  Maximize2,
  RotateCw,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRightLeft,
  ArrowUpDown,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  MoveHorizontal,
  MoveVertical,
  Compass,
  Ruler,
} from 'lucide-react';
import { useStore, getDefaultLayerForType } from '../store/useStore';
import {
  WallElement,
  CurveWallElement,
  BoxElement,
  CircleElement,
  DoorElement,
  WindowElement,
  FurnitureElement,
  PlotElement,
  DimensionElement,
  TextElement,
  DoorSwing,
  LayerType,
  StairElement,
  RoadElement,
  GateElement,
  ObstacleElement,
  StairType,
  ObstacleType,
} from '../models/types';
import { translations } from '../i18n';
import { calculateStairParameters, checkStairHeadroom } from '../utils/stairs';
import {
  parseLengthInput,
  formatInputValue,
  formatLength,
  formatAreaWithUnit,
  formatPerimeter,
} from '../utils/units';
import {
  getWallLength,
  calculateBoxArea,
  calculateBoxPerimeter,
  calculateCircleArea,
  calculateCirclePerimeter,
  getCurveWallArc,
} from '../utils/geometry';

export const PropertiesPanel: React.FC = () => {
  const {
    project,
    selectedIds,
    unitSystem,
    areaUnit,
    language,
    updateElement,
    deleteElements,
    duplicateElement,
    addDoorToWall,
    addWindowToWall,
    toggleLock,
    toggleVisibility,
    alignElements,
    distributeElements,
    rotateSelected,
    mirrorSelected,
    addElement,
    healWalls,
  } = useStore();

  const t = translations[language];

  const selectedElements = project.elements.filter((e) => selectedIds.includes(e.id));
  const isMultiSelect = selectedIds.length > 1;
  const singleElement = selectedIds.length === 1 ? selectedElements[0] : null;

  // Local state for numeric input fields
  const [localLength, setLocalLength] = useState('');
  const [localWidth, setLocalWidth] = useState('');
  const [localHeight, setLocalHeight] = useState('');
  const [localThickness, setLocalThickness] = useState('');
  const [localRadius, setLocalRadius] = useState('');
  const [localBulge, setLocalBulge] = useState('');
  const [localOffset, setLocalOffset] = useState('');
  const [localLabel, setLocalLabel] = useState('');
  const [localAngle, setLocalAngle] = useState('0');
  const [showStairAdvanced, setShowStairAdvanced] = useState(false);

  useEffect(() => {
    if (!singleElement) return;

    setLocalLabel(singleElement.name || ('label' in singleElement ? (singleElement as any).label || '' : ''));
    if ('rotation' in singleElement) {
      setLocalAngle(String(singleElement.rotation || 0));
    }

    if (singleElement.type === 'wall') {
      const len = getWallLength(singleElement);
      setLocalLength(formatInputValue(len, unitSystem));
      setLocalThickness(formatInputValue(singleElement.thickness, unitSystem));
    } else if (singleElement.type === 'curve_wall') {
      const arc = getCurveWallArc(singleElement);
      setLocalLength(formatInputValue(arc.length, unitSystem));
      setLocalBulge(formatInputValue(singleElement.bulge, unitSystem));
      setLocalThickness(formatInputValue(singleElement.thickness, unitSystem));
    } else if (singleElement.type === 'box') {
      setLocalWidth(formatInputValue(singleElement.width, unitSystem));
      setLocalHeight(formatInputValue(singleElement.height, unitSystem));
    } else if (singleElement.type === 'circle') {
      setLocalRadius(formatInputValue(singleElement.radius, unitSystem));
    } else if (singleElement.type === 'door') {
      setLocalWidth(formatInputValue(singleElement.width, unitSystem));
      setLocalHeight(formatInputValue(singleElement.height, unitSystem));
      setLocalOffset(formatInputValue(singleElement.offset, unitSystem));
    } else if (singleElement.type === 'window') {
      setLocalWidth(formatInputValue(singleElement.width, unitSystem));
      setLocalHeight(formatInputValue(singleElement.height, unitSystem));
      setLocalOffset(formatInputValue(singleElement.offset, unitSystem));
    } else if (singleElement.type === 'furniture' || singleElement.type === 'plot') {
      setLocalWidth(formatInputValue(singleElement.width, unitSystem));
      setLocalHeight(formatInputValue(singleElement.height, unitSystem));
    } else if (singleElement.type === 'text') {
      setLocalLabel(singleElement.text);
    }
  }, [singleElement, unitSystem]);

  // If nothing is selected
  if (selectedIds.length === 0) {
    return (
      <div className="w-80 bg-slate-900 border-l border-slate-800 p-5 flex flex-col justify-center items-center text-center text-slate-500 select-none">
        <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
          <Sliders className="w-5 h-5" />
        </div>
        <h3 className="text-xs font-bold text-slate-300">{t.properties.noSelection}</h3>
        <p className="text-[11px] text-slate-500 mt-1 max-w-[200px] leading-relaxed">
          {t.properties.selectPrompt}
        </p>
      </div>
    );
  }

  // MULTI-SELECTION PROPERTIES VIEW
  if (isMultiSelect) {
    let combinedAreaSqIn = 0;
    selectedElements.forEach((el) => {
      if (el.type === 'box' || el.type === 'furniture' || el.type === 'plot') {
        combinedAreaSqIn += el.width * el.height;
      } else if (el.type === 'circle') {
        combinedAreaSqIn += calculateCircleArea(el.radius);
      }
    });

    const isAllLocked = selectedElements.every((e) => e.locked);

    return (
      <div className="w-80 bg-slate-900 border-l border-slate-800 p-4 flex flex-col h-full text-xs text-slate-200 select-none overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
              Multiple Objects Selected
            </span>
            <h3 className="text-sm font-bold text-white mt-0.5">
              {selectedIds.length} Cheezein (Objects)
            </h3>
          </div>
          <button
            onClick={() => toggleLock()}
            className={`p-2 rounded-xl border transition-colors ${
              isAllLocked
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title={isAllLocked ? 'Unlock All Selected' : 'Lock All Selected'}
          >
            {isAllLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>
        </div>

        {/* Combined Area Card */}
        {combinedAreaSqIn > 0 && (
          <div className="p-3 my-3 rounded-2xl bg-sky-950/40 border border-sky-500/40">
            <span className="text-[10px] text-sky-400 block font-semibold uppercase">
              Combined Total Area
            </span>
            <span className="text-base font-bold text-white font-mono mt-0.5 block">
              {formatAreaWithUnit(combinedAreaSqIn, areaUnit)}
            </span>
          </div>
        )}

        {/* Alignment & Distribution Tools */}
        <div className="space-y-3 my-2">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Align & Distribute
          </h4>
          <div className="grid grid-cols-6 gap-1 bg-slate-800/60 p-1.5 rounded-xl border border-slate-700/60">
            <button
              onClick={() => alignElements('left')}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center"
              title="Align Left"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => alignElements('center')}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center"
              title="Align Center"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              onClick={() => alignElements('right')}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center"
              title="Align Right"
            >
              <AlignRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => alignElements('top')}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center"
              title="Align Top"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
            <button
              onClick={() => alignElements('middle')}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center"
              title="Align Middle"
            >
              <AlignJustify className="w-4 h-4" />
            </button>
            <button
              onClick={() => alignElements('bottom')}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center"
              title="Align Bottom"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => distributeElements('horizontal')}
              className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center justify-center gap-1.5 font-medium transition-colors"
            >
              <MoveHorizontal className="w-3.5 h-3.5" />
              <span>Distribute Horiz</span>
            </button>
            <button
              onClick={() => distributeElements('vertical')}
              className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center justify-center gap-1.5 font-medium transition-colors"
            >
              <MoveVertical className="w-3.5 h-3.5" />
              <span>Distribute Vert</span>
            </button>
          </div>
        </div>

        {/* Rotate & Mirror */}
        <div className="space-y-3 my-2">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Rotate & Mirror
          </h4>
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => rotateSelected(90)}
              className="py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex flex-col items-center justify-center font-mono font-bold"
              title="Rotate 90° Clockwise"
            >
              <RotateCw className="w-3.5 h-3.5 mb-0.5 text-sky-400" />
              <span>+90°</span>
            </button>
            <button
              onClick={() => rotateSelected(-90)}
              className="py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex flex-col items-center justify-center font-mono font-bold"
              title="Rotate 90° Counter-Clockwise"
            >
              <RotateCcw className="w-3.5 h-3.5 mb-0.5 text-sky-400" />
              <span>-90°</span>
            </button>
            <button
              onClick={() => mirrorSelected('horizontal')}
              className="py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex flex-col items-center justify-center font-medium"
              title="Flip Horizontal"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 mb-0.5 text-amber-400" />
              <span>Flip H</span>
            </button>
            <button
              onClick={() => mirrorSelected('vertical')}
              className="py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex flex-col items-center justify-center font-medium"
              title="Flip Vertical"
            >
              <ArrowUpDown className="w-3.5 h-3.5 mb-0.5 text-amber-400" />
              <span>Flip V</span>
            </button>
          </div>
        </div>

        {/* Delete All Action */}
        <div className="mt-auto pt-4 border-t border-slate-800">
          <button
            onClick={() => deleteElements(selectedIds)}
            className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Hatao ({selectedIds.length} Objects Delete)</span>
          </button>
        </div>
      </div>
    );
  }

  // SINGLE ELEMENT PROPERTIES VIEW
  if (!singleElement) return null;

  const isLocked = singleElement.locked === true;

  // Apply edits
  const handleApplyLength = () => {
    if (isLocked) return;
    if (singleElement.type === 'wall') {
      const newLen = parseLengthInput(localLength, unitSystem);
      if (newLen > 0) {
        const curLen = getWallLength(singleElement);
        if (curLen > 0) {
          const factor = newLen / curLen;
          const newEnd = {
            x: singleElement.start.x + (singleElement.end.x - singleElement.start.x) * factor,
            y: singleElement.start.y + (singleElement.end.y - singleElement.start.y) * factor,
          };
          updateElement(singleElement.id, { end: newEnd });
        }
      }
    }
  };

  const handleApplyWallThickness = (inches: number) => {
    if (isLocked) return;
    updateElement(singleElement.id, { thickness: inches });
    setLocalThickness(formatInputValue(inches, unitSystem));
  };

  const handleAutoDimension = () => {
    if (singleElement.type !== 'wall') return;
    const newDim: DimensionElement = {
      id: `dim-${Date.now().toString(36)}`,
      type: 'dimension',
      start: { ...singleElement.start },
      end: { ...singleElement.end },
      offset: 18,
      locked: false,
      layer: 'dimensions',
    };
    addElement(newDim);
  };

  const flipDoorSwing = () => {
    if (isLocked || singleElement.type !== 'door') return;
    const swings: DoorSwing[] = [
      'inside_left',
      'inside_right',
      'outside_right',
      'outside_left',
    ];
    const currIdx = swings.indexOf(singleElement.swingDirection || 'inside_left');
    const nextSwing = swings[(currIdx + 1) % swings.length];
    updateElement(singleElement.id, { swingDirection: nextSwing });
  };

  const handleLayerChange = (newLayer: LayerType) => {
    if (isLocked) return;
    updateElement(singleElement.id, { layer: newLayer });
  };

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-800 p-4 flex flex-col h-full text-xs text-slate-200 select-none overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
            {singleElement.type}
          </span>
          <h3 className="text-sm font-bold text-white mt-0.5">
            {('label' in singleElement ? (singleElement as any).label : undefined) || singleElement.name || singleElement.type}
          </h3>
        </div>

        {/* Lock & Visibility Toggles */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleVisibility([singleElement.id])}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Visibility Toggle"
          >
            {singleElement.hidden ? <EyeOff className="w-4 h-4 text-slate-500" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={() => toggleLock([singleElement.id])}
            className={`p-1.5 rounded-lg border transition-colors ${
              isLocked
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title={isLocked ? 'Unlock (Ctrl+L)' : 'Lock (Ctrl+L)'}
          >
            {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Locked element alert banner */}
      {isLocked && (
        <div className="my-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-1.5 font-medium">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          <span>Locked: Cannot move, resize, edit or delete.</span>
        </div>
      )}

      {/* Name / Label input */}
      <div className="my-3 space-y-1">
        <label className="text-[11px] font-medium text-slate-400">
          {t.properties.label} / Name
        </label>
        <input
          type="text"
          disabled={isLocked}
          value={localLabel}
          onChange={(e) => setLocalLabel(e.target.value)}
          onBlur={() => updateElement(singleElement.id, { label: localLabel, name: localLabel })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              updateElement(singleElement.id, { label: localLabel, name: localLabel });
            }
          }}
          className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-sky-500 disabled:opacity-50"
        />
      </div>

      {/* WALL SPECIFIC PROPERTIES */}
      {singleElement.type === 'wall' && (
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              {t.properties.length}
            </label>
            <input
              type="text"
              disabled={isLocked}
              value={localLength}
              onChange={(e) => setLocalLength(e.target.value)}
              onBlur={handleApplyLength}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyLength()}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:border-sky-500 disabled:opacity-50"
            />
          </div>

          {/* Wall Thickness Presets */}
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1.5">
              {t.properties.thickness} (Presets)
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[4.5, 9, 13.5].map((th) => (
                <button
                  key={th}
                  disabled={isLocked}
                  onClick={() => handleApplyWallThickness(th)}
                  className={`py-1.5 rounded-xl font-mono font-bold transition-all ${
                    singleElement.thickness === th
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  } disabled:opacity-50`}
                >
                  {th}"
                </button>
              ))}
            </div>
          </div>

          {/* 3D Wall Height */}
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              3D Oonchai (Wall Height: {Math.round((singleElement.height || 120) / 12)}' ft)
            </label>
            <input
              type="text"
              disabled={isLocked}
              defaultValue={formatInputValue(singleElement.height || 120, unitSystem)}
              onBlur={(e) => {
                const h = parseLengthInput(e.target.value, unitSystem);
                if (h > 0) updateElement(singleElement.id, { height: h });
              }}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Add Door / Add Window / Auto Dimension buttons */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <button
              disabled={isLocked}
              onClick={() => addDoorToWall(singleElement.id)}
              className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-white flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              <DoorOpen className="w-3.5 h-3.5" />
              <span>{t.properties.addDoorToWall}</span>
            </button>
            <button
              disabled={isLocked}
              onClick={() => addWindowToWall(singleElement.id)}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-bold text-slate-200 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
              <span>{t.properties.addWindowToWall}</span>
            </button>
            <button
              onClick={handleAutoDimension}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-bold text-emerald-400 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Ruler className="w-3.5 h-3.5" />
              <span>+ Pamaish Line (Dimension)</span>
            </button>
            <button
              onClick={() => healWalls()}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-bold text-sky-400 flex items-center justify-center gap-1.5 transition-colors"
              title={language === 'ur' ? 'ٹوٹی یا کٹی ہوئی دیواروں کو جوڑیں' : 'Heal and merge broken collinear walls'}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{language === 'ur' ? 'دیوار جوڑیں (Heal Wall)' : 'Heal Split Wall'}</span>
            </button>
          </div>
        </div>
      )}

      {/* DOOR SPECIFIC PROPERTIES */}
      {singleElement.type === 'door' && (
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              {t.properties.width}
            </label>
            <input
              type="text"
              disabled={isLocked}
              value={localWidth}
              onChange={(e) => setLocalWidth(e.target.value)}
              onBlur={() => {
                const w = parseLengthInput(localWidth, unitSystem);
                if (w > 0) updateElement(singleElement.id, { width: w });
              }}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              {t.properties.offset}
            </label>
            <input
              type="text"
              disabled={isLocked}
              value={localOffset}
              onChange={(e) => setLocalOffset(e.target.value)}
              onBlur={() => {
                const off = parseLengthInput(localOffset, unitSystem);
                updateElement(singleElement.id, { offset: Math.max(0, off) });
              }}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Door Height
              </label>
              <input
                type="text"
                disabled={isLocked}
                defaultValue={formatInputValue(singleElement.height || 84, unitSystem)}
                onBlur={(e) => {
                  const h = parseLengthInput(e.target.value, unitSystem);
                  if (h > 0) updateElement(singleElement.id, { height: h });
                }}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                3D Panel
              </label>
              <button
                disabled={isLocked}
                onClick={() => updateElement(singleElement.id, { isOpen: !singleElement.isOpen })}
                className={`w-full py-1.5 rounded-xl font-bold border transition-colors ${
                  singleElement.isOpen
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                {singleElement.isOpen ? 'Open (Khula)' : 'Closed (Band)'}
              </button>
            </div>
          </div>

          <button
            disabled={isLocked}
            onClick={flipDoorSwing}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-bold text-amber-400 flex items-center justify-center gap-1.5 transition-colors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Rukh Badlein (Flip Swing: {singleElement.swingDirection})</span>
          </button>
        </div>
      )}

      {/* WINDOW SPECIFIC PROPERTIES */}
      {singleElement.type === 'window' && (
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              {t.properties.width}
            </label>
            <input
              type="text"
              disabled={isLocked}
              value={localWidth}
              onChange={(e) => setLocalWidth(e.target.value)}
              onBlur={() => {
                const w = parseLengthInput(localWidth, unitSystem);
                if (w > 0) updateElement(singleElement.id, { width: w });
              }}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              {t.properties.offset}
            </label>
            <input
              type="text"
              disabled={isLocked}
              value={localOffset}
              onChange={(e) => setLocalOffset(e.target.value)}
              onBlur={() => {
                const off = parseLengthInput(localOffset, unitSystem);
                updateElement(singleElement.id, { offset: Math.max(0, off) });
              }}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Window Height
              </label>
              <input
                type="text"
                disabled={isLocked}
                defaultValue={formatInputValue(singleElement.height || 48, unitSystem)}
                onBlur={(e) => {
                  const h = parseLengthInput(e.target.value, unitSystem);
                  if (h > 0) updateElement(singleElement.id, { height: h });
                }}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Sill Height
              </label>
              <input
                type="text"
                disabled={isLocked}
                defaultValue={formatInputValue(singleElement.sillHeight !== undefined ? singleElement.sillHeight : 36, unitSystem)}
                onBlur={(e) => {
                  const s = parseLengthInput(e.target.value, unitSystem);
                  if (s >= 0) updateElement(singleElement.id, { sillHeight: s });
                }}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* BOX / ROOM SPECIFIC PROPERTIES */}
      {singleElement.type === 'box' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                {t.properties.width}
              </label>
              <input
                type="text"
                disabled={isLocked}
                value={localWidth}
                onChange={(e) => setLocalWidth(e.target.value)}
                onBlur={() => {
                  const w = parseLengthInput(localWidth, unitSystem);
                  if (w > 0) updateElement(singleElement.id, { width: w });
                }}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                {t.properties.height}
              </label>
              <input
                type="text"
                disabled={isLocked}
                value={localHeight}
                onChange={(e) => setLocalHeight(e.target.value)}
                onBlur={() => {
                  const h = parseLengthInput(localHeight, unitSystem);
                  if (h > 0) updateElement(singleElement.id, { height: h });
                }}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
              />
            </div>
          </div>

          {/* 3D Height and Hollow Mode */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                3D Height
              </label>
              <input
                type="text"
                disabled={isLocked}
                defaultValue={formatInputValue(singleElement.height3d || 120, unitSystem)}
                onBlur={(e) => {
                  const h = parseLengthInput(e.target.value, unitSystem);
                  if (h > 0) updateElement(singleElement.id, { height3d: h });
                }}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                3D Type
              </label>
              <button
                disabled={isLocked}
                onClick={() => updateElement(singleElement.id, { isHollow: !singleElement.isHollow })}
                className="w-full py-1.5 rounded-xl bg-slate-800 border border-slate-700 font-bold text-sky-400"
              >
                {singleElement.isHollow ? 'Hollow Room' : 'Solid Block'}
              </button>
            </div>
          </div>

          {/* Area & Perimeter Card */}
          <div className="p-3 rounded-2xl bg-sky-950/40 border border-sky-500/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{t.properties.area}:</span>
              <span className="font-bold text-sky-400 font-mono">
                {formatAreaWithUnit(singleElement.width * singleElement.height, areaUnit)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">{t.properties.perimeter}:</span>
              <span className="font-semibold text-slate-200 font-mono">
                {formatPerimeter(calculateBoxPerimeter(singleElement.width, singleElement.height), unitSystem)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CIRCLE PROPERTIES */}
      {singleElement.type === 'circle' && (
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              {t.properties.radius}
            </label>
            <input
              type="text"
              disabled={isLocked}
              value={localRadius}
              onChange={(e) => setLocalRadius(e.target.value)}
              onBlur={() => {
                const r = parseLengthInput(localRadius, unitSystem);
                if (r > 0) updateElement(singleElement.id, { radius: r });
              }}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
            />
          </div>

          <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{t.properties.area}:</span>
              <span className="font-bold text-purple-400 font-mono">
                {formatAreaWithUnit(calculateCircleArea(singleElement.radius), areaUnit)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* PLOT PROPERTIES */}
      {singleElement.type === 'plot' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                {t.properties.width}
              </label>
              <input
                type="text"
                disabled={isLocked}
                value={localWidth}
                onChange={(e) => setLocalWidth(e.target.value)}
                onBlur={() => {
                  const w = parseLengthInput(localWidth, unitSystem);
                  if (w > 0) updateElement(singleElement.id, { width: w });
                }}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                {t.properties.height}
              </label>
              <input
                type="text"
                disabled={isLocked}
                value={localHeight}
                onChange={(e) => setLocalHeight(e.target.value)}
                onBlur={() => {
                  const h = parseLengthInput(localHeight, unitSystem);
                  if (h > 0) updateElement(singleElement.id, { height: h });
                }}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
              />
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Total Plot Area:</span>
              <span className="font-bold text-amber-400 font-mono">
                {formatAreaWithUnit(singleElement.width * singleElement.height, areaUnit)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TEXT PROPERTIES */}
      {singleElement.type === 'text' && (
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              Text / Note Content
            </label>
            <input
              type="text"
              disabled={isLocked}
              value={localLabel}
              onChange={(e) => setLocalLabel(e.target.value)}
              onBlur={() => updateElement(singleElement.id, { text: localLabel })}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
            />
          </div>
        </div>
      )}

      {/* DIMENSION PROPERTIES */}
      {singleElement.type === 'dimension' && (() => {
        const dim = singleElement as DimensionElement;
        const len = Math.hypot(dim.end.x - dim.start.x, dim.end.y - dim.start.y);
        const offsetVal = dim.offset || 16;

        return (
          <div className="space-y-3">
            {/* Live Length Readout Card */}
            <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-1">
              <span className="text-[10px] text-emerald-400 font-semibold block uppercase">
                Pamaish / Measured Length
              </span>
              <span className="text-base font-bold text-white font-mono block">
                {formatLength(len, unitSystem)}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                {Math.round(len)} inches ({((len / 12) * 0.3048).toFixed(2)} m)
              </span>
            </div>

            {/* Custom Label Override */}
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Custom Text Override (Ikhtiyari Note)
              </label>
              <input
                type="text"
                disabled={isLocked}
                placeholder="Leave blank for automatic length"
                defaultValue={dim.labelOverride || ''}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  updateElement(dim.id, { labelOverride: val || undefined });
                }}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Perpendicular Offset Slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-slate-400">
                  Offset Distance (Faasla)
                </label>
                <span className="text-xs font-mono font-bold text-sky-400">
                  {formatLength(offsetVal, unitSystem)}
                </span>
              </div>
              <input
                type="range"
                disabled={isLocked}
                min={-80}
                max={120}
                step={2}
                value={offsetVal}
                onChange={(e) => {
                  updateElement(dim.id, { offset: Number(e.target.value) }, true);
                }}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            {/* Quick Remove Action Button */}
            <div className="pt-2">
              <button
                disabled={isLocked}
                onClick={() => deleteElements([dim.id])}
                className="w-full py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-950/40"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Pamaish Hatao (Delete Dimension)</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* STAIRS PROPERTIES */}
      {singleElement.type === 'stair' && (() => {
        const stair = singleElement as StairElement;
        const totalH = stair.totalHeight || 120;
        const targetR = stair.targetRiser || 6.0;
        const treadD = stair.treadDepth || 10.0;
        const stairCalc = calculateStairParameters(totalH, targetR, treadD);
        const headroomCheck = checkStairHeadroom(totalH, stair.length, treadD, stairCalc.calculatedRiser, 80);

        return (
          <div className="space-y-3">
            {/* Stair Type Selector */}
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Stair Type (Qisam)
              </label>
              <select
                disabled={isLocked}
                value={stair.stairType}
                onChange={(e) => {
                  const newType = e.target.value as StairType;
                  updateElement(stair.id, { stairType: newType });
                }}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium focus:outline-none focus:border-sky-500"
              >
                <option value="straight">Straight Flight (Seedhi)</option>
                <option value="l_shape">L-Shape with Landing</option>
                <option value="u_shape">U-Shape (Dog-legged)</option>
                <option value="spiral">Spiral (Gol Chakar)</option>
                <option value="winder">Winder (Quarter-turn)</option>
              </select>
            </div>

            {/* Live Readout Badge */}
            <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-rose-300 font-bold">
                  Steps: {stairCalc.numSteps}, Riser {stairCalc.calculatedRiser.toFixed(1)} in, Tread {stairCalc.treadDepth} in
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                Total Rise: {formatLength(totalH, unitSystem)} | Blondel 2R+T: {stairCalc.blondelValue.toFixed(1)}"
              </div>
            </div>

            {/* Primary Fields: Width, Run Length, Total Height */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Stair Width
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  defaultValue={formatInputValue(stair.width, unitSystem)}
                  onBlur={(e) => {
                    const w = parseLengthInput(e.target.value, unitSystem);
                    if (w > 0) updateElement(stair.id, { width: w });
                  }}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Run Length
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  defaultValue={formatInputValue(stair.length, unitSystem)}
                  onBlur={(e) => {
                    const l = parseLengthInput(e.target.value, unitSystem);
                    if (l > 0) updateElement(stair.id, { length: l });
                  }}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-medium text-slate-400 block mb-1">
                  Total Height
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  defaultValue={formatInputValue(totalH, unitSystem)}
                  onBlur={(e) => {
                    const h = parseLengthInput(e.target.value, unitSystem);
                    if (h > 0) {
                      const res = calculateStairParameters(h, stair.targetRiser, stair.treadDepth);
                      updateElement(stair.id, {
                        totalHeight: h,
                        numSteps: res.numSteps,
                        calculatedRiser: res.calculatedRiser,
                      });
                    }
                  }}
                  className="w-full px-2 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-400 block mb-1">
                  Target Riser
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  defaultValue={formatInputValue(targetR, unitSystem)}
                  onBlur={(e) => {
                    const r = parseLengthInput(e.target.value, unitSystem);
                    if (r > 0) {
                      const res = calculateStairParameters(stair.totalHeight, r, stair.treadDepth);
                      updateElement(stair.id, {
                        targetRiser: r,
                        numSteps: res.numSteps,
                        calculatedRiser: res.calculatedRiser,
                      });
                    }
                  }}
                  className="w-full px-2 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-400 block mb-1">
                  Tread Depth
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  defaultValue={formatInputValue(treadD, unitSystem)}
                  onBlur={(e) => {
                    const td = parseLengthInput(e.target.value, unitSystem);
                    if (td > 0) {
                      const res = calculateStairParameters(stair.totalHeight, stair.targetRiser, td);
                      updateElement(stair.id, {
                        treadDepth: td,
                        numSteps: res.numSteps,
                        calculatedRiser: res.calculatedRiser,
                      });
                    }
                  }}
                  className="w-full px-2 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs"
                />
              </div>
            </div>

            {/* Direction & Flip */}
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={isLocked}
                onClick={() =>
                  updateElement(stair.id, {
                    direction: stair.direction === 'up' ? 'down' : 'up',
                  })
                }
                className="py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-sky-400"
              >
                Climb: {stair.direction === 'down' ? 'DN (Neechay)' : 'UP (Upar)'}
              </button>
              <button
                disabled={isLocked}
                onClick={() =>
                  updateElement(stair.id, {
                    rotation: ((stair.rotation || 0) + 90) % 360,
                  })
                }
                className="py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300"
              >
                Ghumayein (Rotate 90°)
              </button>
            </div>

            {/* Comfort Warnings */}
            {stairCalc.warnings.length > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-[11px] text-amber-300 space-y-1">
                {stairCalc.warnings.map((w, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Headroom Warning */}
            {headroomCheck.hasWarning && (
              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-[11px] text-rose-300 flex items-center gap-1.5">
                <span>⚠️</span>
                <span>{headroomCheck.message}</span>
              </div>
            )}

            {/* Advanced Options Accordion */}
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowStairAdvanced(!showStairAdvanced)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-white"
              >
                <span>More options (Mazeed Ikhtiyarat)</span>
                <span>{showStairAdvanced ? '▲' : '▼'}</span>
              </button>

              {showStairAdvanced && (
                <div className="mt-3 space-y-2 text-xs">
                  {(stair.stairType === 'l_shape' || stair.stairType === 'u_shape') && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Flight 2 Run</label>
                        <input
                          type="text"
                          defaultValue={formatInputValue(stair.flight2Length || 80, unitSystem)}
                          onBlur={(e) => {
                            const f2 = parseLengthInput(e.target.value, unitSystem);
                            if (f2 > 0) updateElement(stair.id, { flight2Length: f2 });
                          }}
                          className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Landing Size</label>
                        <input
                          type="text"
                          defaultValue={formatInputValue(stair.landingSize || 42, unitSystem)}
                          onBlur={(e) => {
                            const ls = parseLengthInput(e.target.value, unitSystem);
                            if (ls > 0) updateElement(stair.id, { landingSize: ls });
                          }}
                          className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-300">Railing / Handrail:</span>
                    <button
                      onClick={() => updateElement(stair.id, { handrail: !stair.handrail })}
                      className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-sky-400 font-bold"
                    >
                      {stair.handrail ? 'On' : 'Off'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-300">Upper Floor Slab Opening:</span>
                    <button
                      onClick={() => updateElement(stair.id, { createSlabOpening: !stair.createSlabOpening })}
                      className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 font-bold"
                    >
                      {stair.createSlabOpening ? 'Cut Slab' : 'No Cut'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ROAD PROPERTIES */}
      {singleElement.type === 'road' && (() => {
        const road = singleElement as RoadElement;
        return (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Street Name / Description
              </label>
              <input
                type="text"
                disabled={isLocked}
                defaultValue={road.name || 'Main Street'}
                onBlur={(e) => updateElement(road.id, { name: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Road Width (Sarak Ki Chorai)
              </label>
              <input
                type="text"
                disabled={isLocked}
                defaultValue={formatInputValue(road.width, unitSystem)}
                onBlur={(e) => {
                  const w = parseLengthInput(e.target.value, unitSystem);
                  if (w > 0) updateElement(road.id, { width: w });
                }}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-300">Footpath / Patri:</span>
              <button
                disabled={isLocked}
                onClick={() => updateElement(road.id, { hasFootpath: !road.hasFootpath })}
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-sky-400"
              >
                {road.hasFootpath ? 'Included (3ft)' : 'No Footpath'}
              </button>
            </div>
          </div>
        );
      })()}

      {/* GATE PROPERTIES */}
      {singleElement.type === 'gate' && (() => {
        const gate = singleElement as GateElement;
        return (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Gate Label
              </label>
              <input
                type="text"
                disabled={isLocked}
                defaultValue={gate.label || 'Main Gate'}
                onBlur={(e) => updateElement(gate.id, { label: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Clear Opening Width
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  defaultValue={formatInputValue(gate.width, unitSystem)}
                  onBlur={(e) => {
                    const w = parseLengthInput(e.target.value, unitSystem);
                    if (w > 0) updateElement(gate.id, { width: w });
                  }}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Clear Height (Arch)
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  defaultValue={formatInputValue(gate.height || 120, unitSystem)}
                  onBlur={(e) => {
                    const h = parseLengthInput(e.target.value, unitSystem);
                    if (h > 0) updateElement(gate.id, { height: h });
                  }}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Gate Type
                </label>
                <select
                  disabled={isLocked}
                  value={gate.gateType}
                  onChange={(e) => updateElement(gate.id, { gateType: e.target.value as any })}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                >
                  <option value="sliding">Sliding Gate</option>
                  <option value="swing">Swing (Double Leaf)</option>
                  <option value="open">Open Entrance</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Post / Pillar Size
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  defaultValue={formatInputValue(gate.postThickness || 18, unitSystem)}
                  onBlur={(e) => {
                    const pt = parseLengthInput(e.target.value, unitSystem);
                    if (pt > 0) updateElement(gate.id, { postThickness: pt });
                  }}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                />
              </div>
            </div>
          </div>
        );
      })()}

      {/* OBSTACLE PROPERTIES */}
      {singleElement.type === 'obstacle' && (() => {
        const obs = singleElement as ObstacleElement;
        return (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Obstacle Type (Rukawat Ki Qisam)
              </label>
              <select
                disabled={isLocked}
                value={obs.obstacleType}
                onChange={(e) => {
                  const ot = e.target.value as ObstacleType;
                  updateElement(obs.id, {
                    obstacleType: ot,
                    isOverhead: ot === 'hanging_wire' || ot === 'arch_beam' || ot === 'balcony',
                    elevation: ot === 'hanging_wire' ? 108 : ot === 'balcony' ? 120 : undefined,
                  });
                }}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
              >
                <option value="pole">Electric Pole (Khamba)</option>
                <option value="hanging_wire">Hanging Wire / Cable (Latki Taar)</option>
                <option value="tree">Tree / Branches (Darakht)</option>
                <option value="transformer">Transformer</option>
                <option value="parked_car">Parked Vehicle</option>
                <option value="neighbor_building">Neighbor Wall / Building</option>
                <option value="arch_beam">Gate Arch / Beam</option>
                <option value="balcony">Balcony Projection</option>
                <option value="custom">Custom Obstacle</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Width</label>
                <input
                  type="text"
                  disabled={isLocked}
                  defaultValue={formatInputValue(obs.width, unitSystem)}
                  onBlur={(e) => {
                    const w = parseLengthInput(e.target.value, unitSystem);
                    if (w > 0) updateElement(obs.id, { width: w });
                  }}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Length / Depth</label>
                <input
                  type="text"
                  disabled={isLocked}
                  defaultValue={formatInputValue(obs.height, unitSystem)}
                  onBlur={(e) => {
                    const h = parseLengthInput(e.target.value, unitSystem);
                    if (h > 0) updateElement(obs.id, { height: h });
                  }}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">3D Height</label>
                <input
                  type="text"
                  disabled={isLocked}
                  defaultValue={formatInputValue(obs.height3d || 96, unitSystem)}
                  onBlur={(e) => {
                    const h = parseLengthInput(e.target.value, unitSystem);
                    if (h > 0) updateElement(obs.id, { height3d: h });
                  }}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Elevation (Clearance)
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  defaultValue={formatInputValue(obs.elevation || 0, unitSystem)}
                  onBlur={(e) => {
                    const el = parseLengthInput(e.target.value, unitSystem);
                    updateElement(obs.id, { elevation: el, isOverhead: el > 0 });
                  }}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Layer assignment selector */}
      <div className="my-3 pt-3 border-t border-slate-800 space-y-1">
        <label className="text-[11px] font-medium text-slate-400 block">
          Layer Assignment
        </label>
        <select
          disabled={isLocked}
          value={singleElement.layer || getDefaultLayerForType(singleElement.type)}
          onChange={(e) => handleLayerChange(e.target.value as LayerType)}
          className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white capitalize focus:outline-none focus:border-sky-500"
        >
          <option value="walls">Walls (Deewarain)</option>
          <option value="doors_windows">Doors & Windows</option>
          <option value="furniture">Furniture & Fixtures</option>
          <option value="dimensions">Dimensions (Pamaish)</option>
          <option value="plot">Plot Boundary</option>
          <option value="notes">Notes & Text</option>
          <option value="stairs">Stairs (Seerhiyan)</option>
          <option value="roads_access">Roads & Access (Sarak)</option>
        </select>
      </div>

      {/* Rotate and Duplicate Actions */}
      <div className="mt-auto pt-3 border-t border-slate-800 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={isLocked}
            onClick={() => rotateSelected(90)}
            className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RotateCw className="w-3.5 h-3.5 text-sky-400" />
            <span>Ghumayein (90°)</span>
          </button>
          <button
            onClick={() => duplicateElement(singleElement.id)}
            className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-emerald-400" />
            <span>Naqal (Copy)</span>
          </button>
        </div>

        <button
          disabled={isLocked}
          onClick={() => deleteElements([singleElement.id])}
          className="w-full py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          <span>Hatao (Delete Element)</span>
        </button>
      </div>
    </div>
  );
};
