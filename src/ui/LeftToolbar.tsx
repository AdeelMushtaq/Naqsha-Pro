import React, { useState, useEffect } from 'react';
import {
  MousePointer2,
  Square,
  Circle as CircleIcon,
  Minus,
  Spline,
  DoorOpen,
  AppWindow,
  Hand,
  Ruler,
  Bed,
  MapPin,
  Type,
  MoveHorizontal,
  TrendingUp,
  Route,
  Shield,
  AlertTriangle,
  Truck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { ToolType } from '../models/types';
import { translations } from '../i18n';

interface LeftToolbarProps {
  onOpenLibrary?: () => void;
  onOpenVehicleCheck?: () => void;
}

interface ToolItem {
  id: ToolType;
  label: string;
  labelUrdu: string;
  desc: string;
  icon: React.ReactNode;
  shortcut: string;
  action?: () => void;
}

interface ToolGroup {
  id: string;
  name: string;
  nameUrdu: string;
  icon: React.ReactNode;
  tools: ToolItem[];
}

export const LeftToolbar: React.FC<LeftToolbarProps> = ({ onOpenLibrary, onOpenVehicleCheck }) => {
  const { activeTool, setActiveTool, language, setVehicleCheckOpen } = useStore();
  const t = translations[language];

  // Collapsed state: true = sidebar collapsed to slim strip / edge toggle
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Active flyout menu group id
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);

  // 6 clear, easy-to-understand categories with visible labels
  const toolGroups: ToolGroup[] = [
    {
      id: 'pointer',
      name: 'Select',
      nameUrdu: 'سلیکٹ',
      icon: <MousePointer2 className="w-5 h-5 text-sky-400" />,
      tools: [
        {
          id: 'select',
          label: t.tools.select,
          labelUrdu: 'سلیکٹ',
          desc: t.tools.selectDesc,
          icon: <MousePointer2 className="w-4 h-4 text-sky-400" />,
          shortcut: 'V',
        },
        {
          id: 'pan',
          label: t.tools.pan,
          labelUrdu: 'پین (گھمائیں)',
          desc: t.tools.panDesc,
          icon: <Hand className="w-4 h-4 text-emerald-400" />,
          shortcut: 'H',
        },
      ],
    },
    {
      id: 'walls',
      name: 'Wall',
      nameUrdu: 'دیوار',
      icon: <Minus className="w-5 h-5 stroke-[3] text-sky-400" />,
      tools: [
        {
          id: 'wall',
          label: t.tools.wall,
          labelUrdu: 'سیدھی دیوار',
          desc: t.tools.wallDesc,
          icon: <Minus className="w-4 h-4 stroke-[3] text-sky-400" />,
          shortcut: 'W',
        },
        {
          id: 'curve_wall',
          label: t.tools.curve_wall,
          labelUrdu: 'گول دیوار',
          desc: t.tools.curve_wallDesc,
          icon: <Spline className="w-4 h-4 text-amber-400" />,
          shortcut: 'G',
        },
      ],
    },
    {
      id: 'rooms',
      name: 'Room',
      nameUrdu: 'کمرا',
      icon: <Square className="w-5 h-5 text-blue-400" />,
      tools: [
        {
          id: 'box',
          label: t.tools.box,
          labelUrdu: 'چوکور کمرا',
          desc: t.tools.boxDesc,
          icon: <Square className="w-4 h-4 text-blue-400" />,
          shortcut: 'R',
        },
        {
          id: 'circle',
          label: t.tools.circle,
          labelUrdu: 'گول کمرا',
          desc: t.tools.circleDesc,
          icon: <CircleIcon className="w-4 h-4 text-indigo-400" />,
          shortcut: 'C',
        },
        {
          id: 'stair',
          label: t.tools.stair,
          labelUrdu: 'سیڑھیاں',
          desc: t.tools.stairDesc,
          icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
          shortcut: 'S',
        },
      ],
    },
    {
      id: 'openings',
      name: 'Doors',
      nameUrdu: 'دروازے',
      icon: <DoorOpen className="w-5 h-5 text-amber-400" />,
      tools: [
        {
          id: 'door',
          label: t.tools.door,
          labelUrdu: 'دروازہ',
          desc: t.tools.doorDesc,
          icon: <DoorOpen className="w-4 h-4 text-amber-400" />,
          shortcut: 'D',
        },
        {
          id: 'window',
          label: t.tools.window,
          labelUrdu: 'کھڑکی',
          desc: t.tools.windowDesc,
          icon: <AppWindow className="w-4 h-4 text-cyan-400" />,
          shortcut: 'N',
        },
        {
          id: 'gate',
          label: t.tools.gate,
          labelUrdu: 'مین گیٹ',
          desc: t.tools.gateDesc,
          icon: <Shield className="w-4 h-4 text-purple-400" />,
          shortcut: 'J',
        },
      ],
    },
    {
      id: 'drafting',
      name: 'Measure',
      nameUrdu: 'پیمائش',
      icon: <MoveHorizontal className="w-5 h-5 text-sky-400" />,
      tools: [
        {
          id: 'dimension',
          label: t.tools.dimension,
          labelUrdu: 'پیمائش لائن',
          desc: t.tools.dimensionDesc,
          icon: <MoveHorizontal className="w-4 h-4 text-sky-400" />,
          shortcut: 'M',
        },
        {
          id: 'measure',
          label: t.tools.measure,
          labelUrdu: 'فیتا چیک',
          desc: t.tools.measureDesc,
          icon: <Ruler className="w-4 h-4 text-teal-400" />,
          shortcut: 'U',
        },
        {
          id: 'plot',
          label: t.tools.plot,
          labelUrdu: 'پلاٹ حد',
          desc: t.tools.plotDesc,
          icon: <MapPin className="w-4 h-4 text-rose-400" />,
          shortcut: 'P',
        },
        {
          id: 'road',
          label: t.tools.road,
          labelUrdu: 'سامنے سڑک',
          desc: t.tools.roadDesc,
          icon: <Route className="w-4 h-4 text-slate-300" />,
          shortcut: 'O',
        },
        {
          id: 'text',
          label: t.tools.text,
          labelUrdu: 'نوٹ / نام',
          desc: t.tools.textDesc,
          icon: <Type className="w-4 h-4 text-amber-300" />,
          shortcut: 'T',
        },
      ],
    },
    {
      id: 'library',
      name: 'Library',
      nameUrdu: 'سامان',
      icon: <Bed className="w-5 h-5 text-purple-400" />,
      tools: [
        {
          id: 'furniture',
          label: t.tools.furniture,
          labelUrdu: 'فرنیچر لائبریری',
          desc: t.tools.furnitureDesc,
          icon: <Bed className="w-4 h-4 text-purple-400" />,
          shortcut: 'F',
          action: onOpenLibrary,
        },
        {
          id: 'vehicle_check',
          label: t.tools.vehicle_check,
          labelUrdu: 'گاڑی موڑ چیک',
          desc: t.tools.vehicle_checkDesc,
          icon: <Truck className="w-4 h-4 text-sky-400" />,
          shortcut: 'E',
          action: () => {
            setVehicleCheckOpen(true);
            if (onOpenVehicleCheck) onOpenVehicleCheck();
          },
        },
        {
          id: 'obstacle',
          label: t.tools.obstacle,
          labelUrdu: 'رکاوٹ / پلر',
          desc: t.tools.obstacleDesc,
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
          shortcut: 'X',
        },
      ],
    },
  ];

  // Close flyout on Escape or outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenGroupId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToolSelect = (tool: ToolItem) => {
    if (tool.action) {
      tool.action();
    } else {
      setActiveTool(tool.id);
    }
    setOpenGroupId(null);
  };

  return (
    <>
      {/* Invisible backdrop for closing flyout when clicked outside */}
      {openGroupId && (
        <div
          className="fixed inset-0 z-30 bg-transparent"
          onClick={() => setOpenGroupId(null)}
        />
      )}

      {/* Fixed Docked Sidebar (Docked to the left edge of the workspace) */}
      <aside
        className={`h-full bg-slate-900 border-r border-slate-800 flex flex-col justify-between py-2 shrink-0 relative z-40 transition-all duration-200 select-none ${
          isCollapsed ? 'w-9 px-1' : 'w-16 px-1.5'
        }`}
        role="toolbar"
        aria-label="Fixed CAD Tools Sidebar"
      >
        {/* Top Tools Area */}
        <div className="flex flex-col gap-1.5">
          {toolGroups.map((group) => {
            const activeInGroup = group.tools.find((tool) => tool.id === activeTool);
            const isGroupActive = Boolean(activeInGroup);
            const isFlyoutOpen = openGroupId === group.id;
            const currentDisplayTool = activeInGroup || group.tools[0];

            return (
              <div key={group.id} className="relative">
                {/* Fixed Sidebar Item Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (isCollapsed) {
                      setIsCollapsed(false);
                    }
                    if (group.tools.length === 1) {
                      handleToolSelect(group.tools[0]);
                    } else {
                      if (!isGroupActive) {
                        handleToolSelect(currentDisplayTool);
                      }
                      setOpenGroupId(isFlyoutOpen ? null : group.id);
                    }
                  }}
                  className={`relative flex flex-col items-center justify-center w-full py-2 rounded-xl transition-all ${
                    isGroupActive
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50 shadow-sm shadow-sky-500/10'
                      : isFlyoutOpen
                      ? 'bg-slate-800 text-white border border-slate-700'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent'
                  }`}
                  title={`${language === 'ur' ? group.nameUrdu : group.name}: ${currentDisplayTool.label}`}
                >
                  <span className="shrink-0 mb-0.5">{currentDisplayTool.icon}</span>

                  {/* Visible compact label under icon */}
                  {!isCollapsed && (
                    <span className="text-[10px] font-medium leading-none tracking-tight truncate max-w-full px-0.5">
                      {language === 'ur' ? group.nameUrdu : group.name}
                    </span>
                  )}

                  {/* Active glowing indicator */}
                  {isGroupActive && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                  )}

                  {/* Submenu indicator dot if category has multiple tools */}
                  {group.tools.length > 1 && !isCollapsed && (
                    <span className="absolute bottom-1 right-1.5 w-1 h-1 rounded-full bg-slate-600" />
                  )}
                </button>

                {/* Flyout Sub-menu (Opens docked to the right of the sidebar) */}
                {isFlyoutOpen && (
                  <div className="absolute left-full ml-2 top-0 z-50 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-1.5 min-w-[210px] flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 flex items-center justify-between">
                      <span>{language === 'ur' ? group.nameUrdu : group.name}</span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        {group.tools.length} Tools
                      </span>
                    </div>

                    {group.tools.map((tool) => {
                      const isSelected = activeTool === tool.id;
                      return (
                        <button
                          key={tool.id}
                          type="button"
                          onClick={() => handleToolSelect(tool)}
                          className={`flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-left transition-colors ${
                            isSelected
                              ? 'bg-sky-500/20 text-sky-200 border border-sky-500/40'
                              : 'text-slate-200 hover:bg-slate-800/90 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="shrink-0 p-1 rounded-lg bg-slate-800">
                              {tool.icon}
                            </span>
                            <div className="flex flex-col truncate">
                              <span className="text-xs font-semibold truncate leading-tight">
                                {language === 'ur' ? tool.labelUrdu : tool.label}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate leading-tight">
                                {tool.desc}
                              </span>
                            </div>
                          </div>
                          {tool.shortcut && (
                            <kbd className="ml-2 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400 shrink-0">
                              {tool.shortcut}
                            </kbd>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Area: Collapse / Expand Toggle Button */}
        <div className="pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => {
              setIsCollapsed(!isCollapsed);
              setOpenGroupId(null);
            }}
            className="flex items-center justify-center w-full py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isCollapsed ? 'Sidebar Kholein (Expand)' : 'Sidebar Chhota Karein (Collapse)'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-sky-400" />
            ) : (
              <div className="flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase tracking-wider">
                  {language === 'ur' ? 'بند' : 'Hide'}
                </span>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
