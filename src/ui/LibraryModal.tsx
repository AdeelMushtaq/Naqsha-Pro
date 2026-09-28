import React, { useState } from 'react';
import {
  Library as LibraryIcon,
  X,
  Search,
  Plus,
  Bed,
  Sofa,
  UtensilsCrossed,
  Bath,
  Columns,
  Grid,
  MapPin,
  Check,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { LIBRARY_ITEMS, LibraryItem } from '../models/libraryItems';
import { translations } from '../i18n';
import { formatLength } from '../utils/units';
import { PlanElement, FurnitureElement, PlotElement, StairElement } from '../models/types';
import { calculateStairParameters } from '../utils/stairs';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LibraryModal: React.FC<LibraryModalProps> = ({ isOpen, onClose }) => {
  const {
    language,
    unitSystem,
    pan,
    zoom,
    addElement,
    selectElement,
  } = useStore();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const t = translations[language];

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'Sab (All)', icon: <Grid className="w-3.5 h-3.5" /> },
    { id: 'bed', label: 'Beds (Palang)', icon: <Bed className="w-3.5 h-3.5" /> },
    { id: 'sofa', label: 'Sofas / Seating', icon: <Sofa className="w-3.5 h-3.5" /> },
    { id: 'table', label: 'Tables & Desks', icon: <UtensilsCrossed className="w-3.5 h-3.5" /> },
    { id: 'bath', label: 'Bathroom Fixtures', icon: <Bath className="w-3.5 h-3.5" /> },
    { id: 'structural', label: 'Pillars & Stairs', icon: <Columns className="w-3.5 h-3.5" /> },
    { id: 'plot_preset', label: 'Plots (Marla / Kanal)', icon: <MapPin className="w-3.5 h-3.5" /> },
  ];

  const filteredItems = LIBRARY_ITEMS.filter((item) => {
    const matchesCat =
      activeCategory === 'all' ||
      item.category === activeCategory ||
      (activeCategory === 'structural' && item.category === 'stairs');
    const matchesQuery =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nameUrdu.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const handleInsertItem = (item: LibraryItem) => {
    // Insert near center of current canvas view
    const viewCenterX = (-pan.x + 400) / zoom;
    const viewCenterY = (-pan.y + 300) / zoom;

    const id = `item-${Date.now().toString(36)}`;

    if (item.category === 'plot_preset') {
      const newPlot: PlotElement = {
        id,
        type: 'plot',
        x: Math.round(viewCenterX - item.width / 2),
        y: Math.round(viewCenterY - item.height / 2),
        width: item.width,
        height: item.height,
        label: item.defaultLabel || item.name,
        areaMarla: item.marla,
        locked: false,
        layer: 'plot',
      };
      addElement(newPlot);
      selectElement(id);
    } else if (item.category === 'stairs') {
      const totalHeight = 120;
      const stairCalc = calculateStairParameters(totalHeight, 6.0, 10.0);
      const newStair: StairElement = {
        id,
        type: 'stair',
        x: Math.round(viewCenterX - item.width / 2),
        y: Math.round(viewCenterY - item.height / 2),
        stairType: item.stairType || 'straight',
        width: item.width || 42,
        length: item.height || 144,
        flight2Length: 80,
        landingSize: 42,
        totalHeight,
        targetRiser: 6.0,
        treadDepth: 10.0,
        calculatedRiser: stairCalc.calculatedRiser,
        numSteps: stairCalc.numSteps,
        handrail: true,
        direction: 'up',
        rotation: 0,
        locked: false,
        layer: 'stairs',
        label: item.defaultLabel || item.name,
      };
      addElement(newStair);
      selectElement(id);
    } else {
      const newFurniture: FurnitureElement = {
        id,
        type: 'furniture',
        x: Math.round(viewCenterX - item.width / 2),
        y: Math.round(viewCenterY - item.height / 2),
        width: item.width,
        height: item.height,
        rotation: 0,
        category: (item.category as any) || 'table',
        label: item.defaultLabel || item.name,
        fillColor: item.fillColor,
        strokeColor: item.strokeColor,
        locked: false,
        layer: 'furniture',
      };
      addElement(newFurniture);
      selectElement(id);
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-200 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <LibraryIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {t.library.title}
              </h2>
              <p className="text-xs text-slate-400">
                Standard architectural blocks, furniture, and plot presets
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

        {/* Search & Category filter */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/60 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search library (e.g. Bed, Sofa, 5 Marla, Stairs)..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700/80 border border-slate-700/60'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Item Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh]">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handleInsertItem(item)}
              className="group p-3.5 rounded-2xl bg-slate-800/40 hover:bg-slate-800/90 border border-slate-700/60 hover:border-sky-500/60 transition-all cursor-pointer flex items-center justify-between shadow-sm"
            >
              <div className="truncate mr-2">
                <h4 className="text-sm font-semibold text-slate-200 group-hover:text-white truncate">
                  {language === 'ur' ? item.nameUrdu : item.name}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono font-medium text-sky-400">
                    {formatLength(item.width, unitSystem)} × {formatLength(item.height, unitSystem)}
                  </span>
                  {item.marla && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {item.marla} Marla
                    </span>
                  )}
                </div>
              </div>

              <button
                className="w-8 h-8 rounded-xl bg-slate-700/60 group-hover:bg-sky-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-all shrink-0 shadow-sm"
                title="Canvas Par Lagayein"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="col-span-2 text-center py-10 text-slate-500 text-sm">
              Koi cheez nahi mili (No matching library items found)
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
