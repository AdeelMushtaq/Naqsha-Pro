import React, { useState } from 'react';
import {
  MousePointer,
  Minus,
  Square,
  DoorOpen,
  AppWindow,
  Sliders,
  Ruler,
  Spline,
  Circle as CircleIcon,
  TrendingUp,
  Shield,
  MoveHorizontal,
  MapPin,
  Route,
  Type,
  Bed,
  Truck,
  Grid,
  X,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { ToolType } from '../models/types';
import { translations } from '../i18n';

interface MobileBottomBarProps {
  onToggleSheet: () => void;
  isSheetOpen: boolean;
  onOpenLibrary?: () => void;
  onOpenVehicleCheck?: () => void;
}

interface MobileToolItem {
  id: ToolType;
  label: string;
  labelUrdu: string;
  icon: React.ReactNode;
  action?: () => void;
}

interface MobileToolCategory {
  title: string;
  tools: MobileToolItem[];
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  onToggleSheet,
  isSheetOpen,
  onOpenLibrary,
  onOpenVehicleCheck,
}) => {
  const { activeTool, setActiveTool, selectedIds, language, setVehicleCheckOpen } = useStore();
  const t = translations[language];

  // Drawer for all tools on mobile
  const [isMoreToolsOpen, setIsMoreToolsOpen] = useState(false);

  // Primary 4 quick tools on bottom bar
  const quickTools: { id: ToolType; label: string; labelUrdu: string; icon: React.ReactNode }[] = [
    { id: 'select', label: 'Select', labelUrdu: 'چنو', icon: <MousePointer className="w-5 h-5" /> },
    { id: 'wall', label: 'Wall', labelUrdu: 'دیوار', icon: <Minus className="w-5 h-5 stroke-[3]" /> },
    { id: 'box', label: 'Room', labelUrdu: 'کمرا', icon: <Square className="w-5 h-5" /> },
    { id: 'door', label: 'Door', labelUrdu: 'دروازہ', icon: <DoorOpen className="w-5 h-5" /> },
  ];

  // Categorized tools in the "More Tools" sheet
  const allToolCategories: MobileToolCategory[] = [
    {
      title: language === 'ur' ? 'دیوار اور کمرے' : 'Walls & Rooms',
      tools: [
        { id: 'wall' as ToolType, label: 'Wall', labelUrdu: 'سیدھی دیوار', icon: <Minus className="w-4 h-4 stroke-[3]" /> },
        { id: 'curve_wall' as ToolType, label: 'Curve Wall', labelUrdu: 'گول دیوار', icon: <Spline className="w-4 h-4 text-amber-400" /> },
        { id: 'box' as ToolType, label: 'Room', labelUrdu: 'چوکور کمرا', icon: <Square className="w-4 h-4 text-blue-400" /> },
        { id: 'circle' as ToolType, label: 'Circle Room', labelUrdu: 'گول کمرا', icon: <CircleIcon className="w-4 h-4 text-indigo-400" /> },
        { id: 'stair' as ToolType, label: 'Stairs', labelUrdu: 'سیڑھیاں', icon: <TrendingUp className="w-4 h-4 text-emerald-400" /> },
      ],
    },
    {
      title: language === 'ur' ? 'کھڑکیاں اور دروازے' : 'Openings',
      tools: [
        { id: 'door' as ToolType, label: 'Door', labelUrdu: 'دروازہ', icon: <DoorOpen className="w-4 h-4 text-amber-400" /> },
        { id: 'window' as ToolType, label: 'Window', labelUrdu: 'کھڑکی', icon: <AppWindow className="w-4 h-4 text-cyan-400" /> },
        { id: 'gate' as ToolType, label: 'Gate', labelUrdu: 'مین گیٹ', icon: <Shield className="w-4 h-4 text-purple-400" /> },
      ],
    },
    {
      title: language === 'ur' ? 'پیمائش اور سائیٹ' : 'Measurements & Site',
      tools: [
        { id: 'dimension' as ToolType, label: 'Dimension', labelUrdu: 'پیمائش لائن', icon: <MoveHorizontal className="w-4 h-4 text-sky-400" /> },
        { id: 'measure' as ToolType, label: 'Tape Check', labelUrdu: 'فیتا چیک', icon: <Ruler className="w-4 h-4 text-teal-400" /> },
        { id: 'plot' as ToolType, label: 'Plot', labelUrdu: 'پلاٹ حد', icon: <MapPin className="w-4 h-4 text-rose-400" /> },
        { id: 'road' as ToolType, label: 'Road', labelUrdu: 'سامنے سڑک', icon: <Route className="w-4 h-4 text-slate-300" /> },
        { id: 'text' as ToolType, label: 'Text Note', labelUrdu: 'نوٹ لکھیں', icon: <Type className="w-4 h-4 text-amber-300" /> },
      ],
    },
    {
      title: language === 'ur' ? 'سامان اور گاڑیاں' : 'Library & Simulation',
      tools: [
        {
          id: 'furniture' as ToolType,
          label: 'Furniture',
          labelUrdu: 'فرنیچر',
          icon: <Bed className="w-4 h-4 text-purple-400" />,
          action: onOpenLibrary,
        },
        {
          id: 'vehicle_check' as ToolType,
          label: 'Car Turn Check',
          labelUrdu: 'گاڑی موڑ',
          icon: <Truck className="w-4 h-4 text-sky-400" />,
          action: () => {
            setVehicleCheckOpen(true);
            if (onOpenVehicleCheck) onOpenVehicleCheck();
          },
        },
      ],
    },
  ];

  const hasSelection = selectedIds.length > 0;
  const isCurrentToolInQuickList = quickTools.some((t) => t.id === activeTool);

  return (
    <>
      {/* Mobile More Tools Drawer Sheet */}
      {isMoreToolsOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="flex-1"
            onClick={() => setIsMoreToolsOpen(false)}
          />
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-4 max-h-[75vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Grid className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-sm text-white">
                  {language === 'ur' ? 'تمام اوزار (All CAD Tools)' : 'All CAD Tools'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreToolsOpen(false)}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {allToolCategories.map((cat, idx) => (
                <div key={idx}>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    {cat.title}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {cat.tools.map((t) => {
                      const isSelected = activeTool === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            if (t.action) {
                              t.action();
                            } else {
                              setActiveTool(t.id);
                            }
                            setIsMoreToolsOpen(false);
                          }}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold text-left transition-colors ${
                            isSelected
                              ? 'bg-sky-500/20 text-sky-200 border-sky-500/50'
                              : 'bg-slate-800/80 text-slate-200 border-slate-700/60 hover:bg-slate-800'
                          }`}
                        >
                          <span className="shrink-0 p-1.5 rounded-lg bg-slate-900">
                            {t.icon}
                          </span>
                          <span className="truncate">
                            {language === 'ur' ? t.labelUrdu : t.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Touch Bar on Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around h-16 px-1 safe-area-bottom">
        {quickTools.map((tool) => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`min-h-[46px] min-w-[46px] flex flex-col items-center justify-center rounded-xl px-2 py-1 transition-colors ${
                isActive
                  ? 'text-sky-400 bg-sky-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tool.icon}
              <span className="text-[10px] font-semibold tracking-tight mt-0.5">
                {language === 'ur' ? tool.labelUrdu : tool.label}
              </span>
            </button>
          );
        })}

        {/* More Tools Drawer Button */}
        <button
          onClick={() => setIsMoreToolsOpen(true)}
          className={`min-h-[46px] min-w-[46px] flex flex-col items-center justify-center rounded-xl px-2 py-1 transition-colors ${
            !isCurrentToolInQuickList
              ? 'text-sky-400 bg-sky-950/50 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Grid className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-tight mt-0.5 truncate max-w-[50px]">
            {!isCurrentToolInQuickList ? activeTool : language === 'ur' ? 'اوزار' : 'More'}
          </span>
        </button>

        {/* Properties Drawer Trigger on mobile if an element is selected */}
        {hasSelection && (
          <button
            onClick={onToggleSheet}
            className={`min-h-[46px] min-w-[46px] flex flex-col items-center justify-center rounded-xl px-2 py-1 transition-colors ${
              isSheetOpen
                ? 'text-amber-400 bg-amber-950/50'
                : 'text-amber-300 hover:text-amber-200 animate-pulse'
            }`}
          >
            <Sliders className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-tight mt-0.5">
              {language === 'ur' ? 'تفصیل' : 'Details'}
            </span>
          </button>
        )}
      </div>
    </>
  );
};
