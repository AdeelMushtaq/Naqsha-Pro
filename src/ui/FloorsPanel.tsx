import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Copy,
  Trash2,
  Check,
  Edit2,
  X,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n';

interface FloorsPanelProps {
  onClose?: () => void;
}

export const FloorsPanel: React.FC<FloorsPanelProps> = ({ onClose }) => {
  const {
    project,
    language,
    switchFloor,
    addFloor,
    renameFloor,
    deleteFloor,
  } = useStore();

  const t = translations[language];
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newFloorName, setNewFloorName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const floors = project.floors || [
    { id: 'floor-ground', name: 'Ground Floor', level: 0, elements: project.elements },
  ];
  const activeFloorId = project.activeFloorId || floors[0]?.id;

  const handleStartRename = (id: string, currentName: string) => {
    setEditingFloorId(id);
    setEditingName(currentName);
  };

  const handleSaveRename = (id: string) => {
    if (editingName.trim()) {
      renameFloor(id, editingName.trim());
    }
    setEditingFloorId(null);
  };

  const handleCreateFloor = (copyCurrent: boolean) => {
    const name = newFloorName.trim() || `Floor ${floors.length + 1}`;
    addFloor(name, copyCurrent);
    setIsAddingNew(false);
    setNewFloorName('');
  };

  const handleDelete = (id: string) => {
    deleteFloor(id);
    setConfirmDeleteId(null);
  };

  return (
    <div
      className="w-80 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-xs select-none backdrop-blur-md transition-all duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700">
        <div className="flex items-center gap-2 text-white font-bold">
          <Building2 className="w-4 h-4 text-sky-400" />
          <span>{t.floors.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddingNew(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 font-semibold text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.floors.addFloor}</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* New Floor Creation Form */}
      {isAddingNew && (
        <div className="p-3 bg-slate-950/70 border-b border-slate-800 space-y-2">
          <input
            type="text"
            value={newFloorName}
            onChange={(e) => setNewFloorName(e.target.value)}
            placeholder="Floor Name (e.g. First Floor / 1st Manzil)"
            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCreateFloor(false)}
              className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold transition-colors"
            >
              Khali Manzil (Blank)
            </button>
            <button
              onClick={() => handleCreateFloor(true)}
              className="flex-1 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center justify-center gap-1 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              {t.floors.copyFloor}
            </button>
          </div>
        </div>
      )}

      {/* Floor list */}
      <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
        {floors.map((floor) => {
          const isActive = floor.id === activeFloorId;
          const isEditing = editingFloorId === floor.id;
          const isConfirmingDelete = confirmDeleteId === floor.id;

          return (
            <div
              key={floor.id}
              onClick={() => switchFloor(floor.id)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-sky-950/60 border border-sky-500/50 text-white'
                  : 'hover:bg-slate-800/60 text-slate-300'
              }`}
            >
              {isEditing ? (
                <div
                  className="flex items-center gap-1 w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(floor.id)}
                    className="flex-1 px-2 py-1 rounded bg-slate-800 border border-sky-500 text-white text-xs focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveRename(floor.id)}
                    className="p-1 rounded bg-sky-600 text-white hover:bg-sky-500"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : isConfirmingDelete ? (
                <div
                  className="flex items-center justify-between w-full gap-2 px-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[11px] text-rose-300 font-semibold truncate">
                    Hata dein? (Delete?)
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleDelete(floor.id)}
                      className="px-2 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] flex items-center gap-1 transition-colors shadow-sm"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Haan</span>
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-[10px] transition-colors"
                    >
                      Nahi
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 truncate">
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isActive ? 'bg-sky-400 animate-pulse' : 'bg-slate-600'
                      }`}
                    />
                    <span className="font-semibold truncate">{floor.name}</span>
                    <span className="text-[10px] text-slate-500">
                      ({floor.elements?.length || 0} items)
                    </span>
                  </div>

                  <div
                    className="flex items-center gap-1 shrink-0 ml-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleStartRename(floor.id, floor.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
                      title={t.floors.renameFloor}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {floors.length > 1 && (
                      <button
                        onClick={() => setConfirmDeleteId(floor.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title={t.floors.deleteFloor}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
