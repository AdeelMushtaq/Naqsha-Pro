import React from 'react';
import {
  Layers as LayersIcon,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Check,
  ToggleLeft,
  ToggleRight,
  X,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { LayerType } from '../models/types';
import { translations } from '../i18n';

interface LayersPanelProps {
  onClose?: () => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({ onClose }) => {
  const {
    layers,
    activeLayer,
    language,
    toggleLayerVisibility,
    toggleLayerLock,
    setActiveLayer,
    lockAll,
    unlockAll,
    clickThroughLocked,
    toggleClickThroughLocked,
  } = useStore();

  const t = translations[language];

  const layerKeys: LayerType[] = [
    'walls',
    'doors_windows',
    'furniture',
    'dimensions',
    'plot',
    'notes',
  ];

  return (
    <div
      className="w-80 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-xs select-none backdrop-blur-md transition-all duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700">
        <div className="flex items-center gap-2 text-white font-bold">
          <LayersIcon className="w-4 h-4 text-sky-400" />
          <span>{t.layers.title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={lockAll}
            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            title={t.layers.lockAll}
          >
            {t.layers.lockAll}
          </button>
          <button
            onClick={unlockAll}
            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            title={t.layers.unlockAll}
          >
            {t.layers.unlockAll}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors ml-1"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Layer List */}
      <div className="p-2 space-y-1">
        {layerKeys.map((key) => {
          const cfg = layers[key];
          const isActive = activeLayer === key;
          const displayName = language === 'ur' ? cfg.nameUrdu : cfg.name;

          return (
            <div
              key={key}
              onClick={() => setActiveLayer(key)}
              className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-sky-950/60 border border-sky-500/40 text-white'
                  : 'hover:bg-slate-800/60 text-slate-300'
              }`}
            >
              {/* Color swatch & Layer Name */}
              <div className="flex items-center gap-2.5 truncate">
                <span
                  className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: cfg.color }}
                />
                <span className="font-medium truncate">{displayName}</span>
              </div>

              {/* Visibility and Lock toggles */}
              <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => toggleLayerVisibility(key)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    cfg.visible
                      ? 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                      : 'text-slate-500 hover:text-slate-400 bg-slate-800/40'
                  }`}
                  title={cfg.visible ? 'Hide Layer' : 'Show Layer'}
                >
                  {cfg.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => toggleLayerLock(key)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    cfg.locked
                      ? 'text-amber-400 bg-amber-950/40 hover:bg-amber-900/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
                  }`}
                  title={cfg.locked ? 'Unlock Layer' : 'Lock Layer'}
                >
                  {cfg.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer options */}
      <div className="px-4 py-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 font-medium">
          {t.layers.clickThrough}
        </span>
        <button
          onClick={toggleClickThroughLocked}
          className="text-sky-400 hover:text-sky-300 transition-colors p-1"
          title="Click-through locked elements toggle"
        >
          {clickThroughLocked ? (
            <ToggleRight className="w-6 h-6 text-sky-400" />
          ) : (
            <ToggleLeft className="w-6 h-6 text-slate-600" />
          )}
        </button>
      </div>
    </div>
  );
};
