import React, { useState, useRef } from 'react';
import {
  X,
  FolderOpen,
  Plus,
  Trash2,
  Copy,
  Edit2,
  Check,
  Upload,
  Download,
  FileCode,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { translations } from '../i18n';
import { exportProjectToJSON, importProjectFromJSON } from '../utils/export';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({ isOpen, onClose }) => {
  const {
    project,
    projectsList,
    language,
    createNewProject,
    switchProject,
    renameProject,
    deleteProject,
    duplicateProject,
    importProject,
  } = useStore();

  const t = translations[language];
  const [newPlanName, setNewPlanName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameText, setEditNameText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim()) return;
    createNewProject(newPlanName.trim());
    setNewPlanName('');
    onClose();
  };

  const handleStartRename = (id: string, name: string) => {
    setEditingId(id);
    setEditNameText(name);
  };

  const handleSaveRename = (id: string) => {
    if (editNameText.trim()) {
      renameProject(id, editNameText.trim());
    }
    setEditingId(null);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importProjectFromJSON(file);
      importProject(imported);
      onClose();
    } catch {
      alert('File parhne mein ghalti hui. Barah-e-karam durust .naqsha.json file chunein.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 transition-all duration-200 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl text-slate-100 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">{t.projects.title}</h2>
              <p className="text-xs text-slate-400">{t.projects.currentProject}: <strong className="text-sky-400">{project.name}</strong></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Create new plan form */}
        <form onSubmit={handleCreate} className="mt-4 flex gap-2">
          <input
            type="text"
            placeholder={t.projects.enterName}
            value={newPlanName}
            onChange={(e) => setNewPlanName(e.target.value)}
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 font-semibold text-xs text-white flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            {t.projects.createBtn}
          </button>
        </form>

        {/* Projects list */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-2 pr-1">
          {projectsList.map((p) => {
            const isActive = p.id === project.id;
            const isEditing = editingId === p.id;
            const dateStr = new Date(p.updatedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={p.id}
                className={`p-3 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-sky-950/30 border-sky-500/50 shadow-sm'
                    : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editNameText}
                          onChange={(e) => setEditNameText(e.target.value)}
                          className="px-2 py-1 rounded bg-slate-800 border border-sky-500 text-xs text-white focus:outline-none w-full"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveRename(p.id)}
                          className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          if (!isActive) {
                            switchProject(p.id);
                            onClose();
                          }
                        }}
                        className="cursor-pointer"
                      >
                        <h4 className="text-xs font-bold text-white truncate flex items-center gap-2">
                          {p.name}
                          {isActive && (
                            <span className="text-[10px] font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {p.elementCount} {t.projects.elementsCount} · {dateStr}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!isEditing && (
                      <button
                        onClick={() => handleStartRename(p.id, p.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                        title={t.projects.rename}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => duplicateProject(p.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                      title={t.projects.duplicate}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(t.projects.deleteConfirm)) {
                          deleteProject(p.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title={t.projects.delete}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Import & Export JSON buttons */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInput}
            accept=".json,.naqsha.json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-2 px-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            {t.app.importJSON}
          </button>
          <button
            onClick={() => exportProjectToJSON(project)}
            className="flex-1 py-2 px-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            {t.app.exportJSON}
          </button>
        </div>
      </div>
    </div>
  );
};
