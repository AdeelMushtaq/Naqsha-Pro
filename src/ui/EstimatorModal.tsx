import React, { useState } from 'react';
import {
  Calculator,
  X,
  Download,
  FileSpreadsheet,
  Settings,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n';
import {
  calculateEstimates,
  defaultEstimatorSettings,
  EstimatorSettings,
  exportEstimatesToCSV,
} from '../utils/estimator';

interface EstimatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EstimatorModal: React.FC<EstimatorModalProps> = ({ isOpen, onClose }) => {
  const { project, language } = useStore();
  const t = translations[language];

  const [settings, setSettings] = useState<EstimatorSettings>(defaultEstimatorSettings);

  if (!isOpen) return null;

  const result = calculateEstimates(project.elements, settings);

  const handleDownloadCSV = () => {
    exportEstimatesToCSV(project.name, result, settings);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-200 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-xs animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {t.estimator.title}
              </h2>
              <p className="text-xs text-slate-400">
                Wall elevation masonry, brick counts, plaster area & materials calculation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              {t.estimator.wallHeight}
            </label>
            <input
              type="number"
              min="6"
              max="20"
              step="0.5"
              value={settings.wallHeightFt}
              onChange={(e) =>
                setSettings({ ...settings, wallHeightFt: parseFloat(e.target.value) || 10 })
              }
              className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              {t.estimator.brickSize}
            </label>
            <div className="grid grid-cols-3 gap-1 font-mono">
              <input
                type="number"
                value={settings.brickLengthIn}
                onChange={(e) =>
                  setSettings({ ...settings, brickLengthIn: parseFloat(e.target.value) || 9 })
                }
                title="Length"
                className="px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-center"
              />
              <input
                type="number"
                value={settings.brickWidthIn}
                onChange={(e) =>
                  setSettings({ ...settings, brickWidthIn: parseFloat(e.target.value) || 4.5 })
                }
                title="Width"
                className="px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-center"
              />
              <input
                type="number"
                value={settings.brickHeightIn}
                onChange={(e) =>
                  setSettings({ ...settings, brickHeightIn: parseFloat(e.target.value) || 3 })
                }
                title="Height"
                className="px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-center"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              {t.estimator.wastage}
            </label>
            <input
              type="number"
              min="0"
              max="25"
              value={settings.wastagePercent}
              onChange={(e) =>
                setSettings({ ...settings, wastagePercent: parseFloat(e.target.value) || 0 })
              }
              className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/40 shrink-0">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
            <span className="text-[10px] text-amber-300 font-semibold block">
              {t.estimator.totalBricks}
            </span>
            <span className="text-xl font-black text-amber-400 mt-0.5 block font-mono">
              {result.totalBricks.toLocaleString()}
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5">
              Including {settings.wastagePercent}% waste
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-center">
            <span className="text-[10px] text-sky-300 font-semibold block">
              {t.estimator.plasterArea}
            </span>
            <span className="text-xl font-black text-sky-400 mt-0.5 block font-mono">
              {result.totalPlasterSqFt.toLocaleString()}
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5">Both wall sides</span>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <span className="text-[10px] text-emerald-300 font-semibold block">
              {t.estimator.cementBags}
            </span>
            <span className="text-xl font-black text-emerald-400 mt-0.5 block font-mono">
              ~{result.estimatedCementBags}
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5">Masonry + Plaster</span>
          </div>

          <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center">
            <span className="text-[10px] text-purple-300 font-semibold block">
              {t.estimator.sandCft}
            </span>
            <span className="text-xl font-black text-purple-400 mt-0.5 block font-mono">
              ~{result.estimatedSandCft}
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5">Cubic Feet (cft)</span>
          </div>
        </div>

        {/* Detailed Breakdown Table */}
        <div className="flex-1 overflow-y-auto p-4 max-h-[40vh]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold text-[10px]">
                <th className="py-2 px-3">{t.estimator.thickness}</th>
                <th className="py-2 px-3">{t.estimator.linearFt}</th>
                <th className="py-2 px-3">{t.estimator.grossArea}</th>
                <th className="py-2 px-3">Openings (Doors/Win)</th>
                <th className="py-2 px-3">{t.estimator.netArea}</th>
                <th className="py-2 px-3 font-bold text-amber-400">Bricks</th>
                <th className="py-2 px-3 font-bold text-sky-400">Plaster</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {result.breakdown.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-bold text-slate-200">
                    {row.thicknessInches}"
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">{row.linearLengthFt} ft</td>
                  <td className="py-2.5 px-3 text-slate-400">{row.grossAreaSqFt} sq ft</td>
                  <td className="py-2.5 px-3 text-rose-400">-{row.openingsAreaSqFt} sq ft</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-200">{row.netAreaSqFt} sq ft</td>
                  <td className="py-2.5 px-3 font-bold text-amber-400">
                    {row.brickCount.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-sky-400">
                    {row.plasterAreaSqFt.toLocaleString()} sq ft
                  </td>
                </tr>
              ))}

              {result.breakdown.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                    Plan mein koi deewar nahi mili (No walls in this plan yet)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/40 flex items-center justify-between shrink-0">
          <div className="text-slate-400 text-[11px]">
            Total Walls Length: <span className="text-white font-mono font-bold">{result.totalLinearLengthFt} ft</span>
          </div>
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-white shadow-lg shadow-amber-600/20 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t.estimator.exportCSV}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
