import { create } from 'zustand';
import {
  PlanElement,
  Project,
  ProjectSummary,
  ToolType,
  UnitSystem,
  AreaUnit,
  Language,
  ThemeMode,
  Point2D,
  WallElement,
  CurveWallElement,
  DoorElement,
  WindowElement,
  LayerType,
  LayerConfig,
  Floor,
  GuideLine,
  DetectedRoom,
  PlotElement,
  DimensionElement,
  WallNode,
  View3DMode,
  Vehicle,
  VehicleCheckSession,
  PathWaypoint,
  GateElement,
  ObstacleElement,
  RoadElement,
  StairElement,
} from '../models/types';
import { getStarterPlan } from './starterPlan';
import { getWallLength, getCurveWallArc, clampOffset, distance } from '../utils/geometry';
import { detectRoomsFromWalls } from '../utils/roomDetection';
import { ensureWallNodes, getOrCreateWallNode, healCollinearWalls } from '../utils/wallJoin';
import {
  splitWallAtPoint,
  canJoinWalls,
  joinCollinearWalls,
  splitRoadAtPoint,
  joinCollinearRoads,
  mergeNodes,
  disconnectAtNode,
  findWallCrossing,
  splitWallsAtCrossing,
  TJunctionMode,
} from '../utils/wallSplitJoin';
import { translations } from '../i18n';
import { VEHICLE_PRESETS, createVehicleFromPreset } from '../models/vehiclePresets';
import { simulateVehiclePath, generateAutoPath } from '../utils/sweptPath';
import { evaluateVehicleCheck } from '../utils/collision';
import { calculateStairParameters } from '../utils/stairs';

const MAX_HISTORY = 120;
const STORAGE_PROJECTS_KEY = 'naqsha_projects_v2';
const STORAGE_ACTIVE_ID_KEY = 'naqsha_active_project_id_v2';
const STORAGE_PREFS_KEY = 'naqsha_user_prefs_v2';
const STORAGE_TJ_MODE_KEY = 'naqsha_tj_mode_v1';

export const DEFAULT_LAYERS: Record<LayerType, LayerConfig> = {
  walls: { id: 'walls', name: 'Walls', nameUrdu: 'Deewarain', visible: true, locked: false, color: '#38bdf8' },
  doors_windows: { id: 'doors_windows', name: 'Doors & Windows', nameUrdu: 'Darwazay / Khidkiyan', visible: true, locked: false, color: '#f59e0b' },
  furniture: { id: 'furniture', name: 'Furniture & Fixtures', nameUrdu: 'Saman / Furniture', visible: true, locked: false, color: '#a855f7' },
  dimensions: { id: 'dimensions', name: 'Dimensions', nameUrdu: 'Pamaish', visible: true, locked: false, color: '#10b981' },
  plot: { id: 'plot', name: 'Plot Boundary', nameUrdu: 'Plot Hadbandi', visible: true, locked: false, color: '#eab308' },
  notes: { id: 'notes', name: 'Notes & Text', nameUrdu: 'Tehreer / Notes', visible: true, locked: false, color: '#94a3b8' },
  stairs: { id: 'stairs', name: 'Stairs', nameUrdu: 'Seerhiyan (Stairs)', visible: true, locked: false, color: '#f43f5e' },
  roads_access: { id: 'roads_access', name: 'Roads & Access', nameUrdu: 'Sarak aur Rasta', visible: true, locked: false, color: '#06b6d4' },
};

export function getDefaultLayerForType(type: PlanElement['type']): LayerType {
  switch (type) {
    case 'wall':
    case 'curve_wall':
      return 'walls';
    case 'door':
    case 'window':
      return 'doors_windows';
    case 'furniture':
    case 'box':
    case 'circle':
      return 'furniture';
    case 'dimension':
      return 'dimensions';
    case 'plot':
      return 'plot';
    case 'text':
      return 'notes';
    case 'stair':
      return 'stairs';
    case 'road':
    case 'gate':
    case 'obstacle':
      return 'roads_access';
    default:
      return 'walls';
  }
}

interface UserPrefs {
  unitSystem: UnitSystem;
  areaUnit: AreaUnit;
  language: Language;
  theme: ThemeMode;
  showGrid: boolean;
  snapToGrid: boolean;
  snapToObjects: boolean;
  showDimensions: boolean;
  clickThroughLocked: boolean;
}

const defaultPrefs: UserPrefs = {
  unitSystem: 'ft',
  areaUnit: 'marla',
  language: 'ur', // Roman Urdu by default
  theme: 'dark',
  showGrid: true,
  snapToGrid: true,
  snapToObjects: true,
  showDimensions: true,
  clickThroughLocked: false,
};

function loadStoredTJMode(): TJunctionMode {
  try {
    const raw = localStorage.getItem(STORAGE_TJ_MODE_KEY);
    if (raw === 'join' || raw === 'split' || raw === 'cross') {
      return raw;
    }
  } catch {
    // Ignore storage errors
  }
  return 'join';
}

function loadStoredPrefs(): UserPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_PREFS_KEY);
    if (raw) {
      return { ...defaultPrefs, ...JSON.parse(raw) };
    }
  } catch {
    // Ignore storage errors
  }
  return defaultPrefs;
}

function normalizeProject(p: Project): Project {
  let floors = p.floors;
  if (!floors || floors.length === 0) {
    floors = [
      {
        id: 'floor-ground',
        name: 'Ground Floor',
        level: 0,
        baseElevation: 0,
        floorThickness: 5,
        hasRoof: true,
        elements: p.elements || [],
      },
    ];
  }
  const activeFloorId = p.activeFloorId || floors[0].id;
  const activeFloor = floors.find((f) => f.id === activeFloorId) || floors[0];

  // Ensure wall nodes and heights
  const currentElements = activeFloor.elements || [];
  const walls = currentElements.filter((e): e is WallElement => e.type === 'wall');
  const { walls: wallsWithNodes, nodes } = ensureWallNodes(walls, p.wallNodes || []);

  const normalizedElements = currentElements.map((el) => {
    if (el.type === 'wall') {
      const match = wallsWithNodes.find((w) => w.id === el.id);
      return match ? { ...match, height: match.height || 120 } : { ...el, height: (el as WallElement).height || 120 };
    }
    if (el.type === 'box') {
      const b = el as any;
      return { ...b, height3d: b.height3d || 120 };
    }
    if (el.type === 'circle') {
      const c = el as any;
      return { ...c, height3d: c.height3d || 120 };
    }
    if (el.type === 'door') {
      const d = el as any;
      return { ...d, height: d.height || 84, sillHeight: d.sillHeight !== undefined ? d.sillHeight : 0, isOpen: d.isOpen || false };
    }
    if (el.type === 'window') {
      const w = el as any;
      return { ...w, height: w.height || 48, sillHeight: w.sillHeight !== undefined ? w.sillHeight : 36 };
    }
    return el;
  });

  const normalizedFloors = floors.map((f) => ({
    ...f,
    baseElevation: f.baseElevation !== undefined ? f.baseElevation : f.level * 120,
    floorThickness: f.floorThickness || 5,
    hasRoof: f.hasRoof !== false,
    elements: f.id === activeFloor.id ? normalizedElements : f.elements,
  }));

  return {
    ...p,
    wallNodes: nodes,
    floors: normalizedFloors,
    activeFloorId: activeFloor.id,
    elements: normalizedElements,
    guides: p.guides || [],
  };
}

function loadProjectsFromStorage(): { projects: Project[]; activeId: string } {
  try {
    const raw = localStorage.getItem(STORAGE_PROJECTS_KEY);
    const storedActiveId = localStorage.getItem(STORAGE_ACTIVE_ID_KEY);

    if (raw) {
      const parsed: Project[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const normalized = parsed.map(normalizeProject);
        const activeProject =
          normalized.find((p) => p.id === storedActiveId) || normalized[0];
        return { projects: normalized, activeId: activeProject.id };
      }
    }
  } catch {
    // Ignore storage errors
  }

  // First time launch: initialize with Starter Project
  const initialElements = getStarterPlan();
  const initialFloor: Floor = {
    id: 'floor-ground',
    name: 'Ground Floor',
    level: 0,
    elements: initialElements,
  };

  const initialProject: Project = {
    id: 'project-default',
    name: '5 Marla Ghar Ka Naqsha',
    ownerName: 'Chaudhry Sahib',
    elements: initialElements,
    floors: [initialFloor],
    activeFloorId: initialFloor.id,
    guides: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  try {
    localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify([initialProject]));
    localStorage.setItem(STORAGE_ACTIVE_ID_KEY, initialProject.id);
  } catch {
    // Ignore
  }

  return { projects: [initialProject], activeId: initialProject.id };
}

function cloneElements(elements: PlanElement[]): PlanElement[] {
  return JSON.parse(JSON.stringify(elements));
}

export interface AppState {
  // Project & Elements
  project: Project;
  projectsList: ProjectSummary[];
  isSaving: boolean;

  // History for Undo/Redo
  past: PlanElement[][];
  future: PlanElement[][];

  // Tool & Selection
  activeTool: ToolType;
  selectedIds: string[];
  clipboard: PlanElement[];

  // Viewport
  zoom: number;
  pan: Point2D;

  // Preferences / Settings
  unitSystem: UnitSystem;
  areaUnit: AreaUnit;
  language: Language;
  theme: ThemeMode;
  showGrid: boolean;
  snapToGrid: boolean;
  snapToObjects: boolean;
  gridSize: number; // inches
  showDimensions: boolean;
  clickThroughLocked: boolean;

  // Layers state
  layers: Record<LayerType, LayerConfig>;
  activeLayer: LayerType;

  // Measure tool temporary points
  measurePoints: Point2D[];

  // Auto-detected rooms
  detectedRooms: DetectedRoom[];

  // Vehicle Entry Check state & actions
  isVehicleCheckOpen: boolean;
  activeVehicleCheckId: string | null;
  vehicleCheckPlaybackProgress: number;
  isVehicleCheckPlaying: boolean;
  manualDrivePose?: { x: number; y: number; heading: number; steerAngle: number };
  setVehicleCheckOpen: (open: boolean) => void;
  setActiveVehicleCheckId: (id: string | null) => void;
  createVehicleCheck: (presetKey?: string, name?: string) => string;
  updateActiveVehicleCheck: (patch: Partial<VehicleCheckSession>) => void;
  addWaypointToActiveVehicleCheck: (point: Point2D, isReverse?: boolean) => void;
  removeWaypointFromActiveVehicleCheck: (id: string) => void;
  clearWaypointsInActiveVehicleCheck: () => void;
  runVehicleCheckSimulation: () => void;
  runAutoPath: () => void;
  setVehicleCheckPlaybackProgress: (progress: number) => void;
  setVehicleCheckPlaying: (isPlaying: boolean) => void;
  setManualDrivePose: (pose?: { x: number; y: number; heading: number; steerAngle: number }) => void;
  deleteVehicleCheck: (id: string) => void;

  // Action methods
  setActiveTool: (tool: ToolType) => void;
  selectElement: (id: string | null, multi?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setSelectedIds: (ids: string[]) => void;

  // Locking & Visibility
  toggleLock: (ids?: string[]) => void;
  toggleVisibility: (ids?: string[]) => void;
  lockAll: () => void;
  unlockAll: () => void;
  toggleClickThroughLocked: () => void;

  // Layer management
  toggleLayerVisibility: (layer: LayerType) => void;
  toggleLayerLock: (layer: LayerType) => void;
  setActiveLayer: (layer: LayerType) => void;

  // 3D View and navigation
  view3dMode: View3DMode;
  setView3dMode: (mode: View3DMode) => void;
  cameraMode3d: 'orbit' | 'walkthrough';
  setCameraMode3d: (mode: 'orbit' | 'walkthrough') => void;
  floorViewMode3d: 'all' | 'active' | 'explode';
  setFloorViewMode3d: (mode: 'all' | 'active' | 'explode') => void;
  sunTimeOfDay: number;
  setSunTimeOfDay: (time: number) => void;
  sectionCutHeight: number;
  setSectionCutHeight: (height: number) => void;
  wireframe3d: boolean;
  toggleWireframe3d: () => void;
  show3dDimensions: boolean;
  toggle3dDimensions: () => void;

  // History & Mutation
  pushHistory: () => void;
  commitHistoryStep: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Elements CRUD & Interactive updates
  addElement: (element: PlanElement) => void;
  updateElement: (id: string, patch: Partial<PlanElement>, commitHistory?: boolean) => void;
  updateElements: (patches: { id: string; patch: Partial<PlanElement> }[], commitHistory?: boolean) => void;
  moveWallNode: (nodeId: string, newPos: Point2D, detach?: boolean, commitHistory?: boolean) => void;
  splitWallAt: (
    wallId: string,
    splitPoint: Point2D,
    branchWallId?: string,
    branchWallEnd?: 'start' | 'end',
    mode?: TJunctionMode
  ) => string | undefined;
  splitWallAtPointAction: (wallId: string, splitPoint: Point2D) => { success: boolean; message?: string };
  joinSelectedWalls: () => { success: boolean; message?: string };
  mergeCloseNodes: (nodeId1: string, nodeId2: string) => { success: boolean; message?: string };
  disconnectWallAtNode: (wallId: string, nodeId: string) => { success: boolean; message?: string };
  trimCrossingWalls: (wallId1: string, wallId2: string) => { success: boolean; message?: string };
  splitRoadAtPointAction: (roadId: string, splitPoint: Point2D) => { success: boolean; message?: string };
  joinSelectedRoads: () => { success: boolean; message?: string };
  healWalls: () => boolean;

  // T-junction mode & visual feedback state
  tJunctionMode: TJunctionMode;
  setTJunctionMode: (mode: TJunctionMode) => void;
  cycleTJunctionMode: () => void;
  recentJunctionToast: { id: string; message: string; type: 'success' | 'warning' | 'info'; timestamp: number } | null;
  setRecentJunctionToast: (toast: { id: string; message: string; type: 'success' | 'warning' | 'info' } | null) => void;
  pulseNodePoint: Point2D | null;
  setPulseNodePoint: (pt: Point2D | null) => void;
  nudgeSelected: (deltaX: number, deltaY: number) => void;
  deleteElements: (ids: string[]) => void;
  duplicateElement: (id: string) => void;
  setElements: (elements: PlanElement[], recordHistory?: boolean) => void;

  // Clipboard (Copy / Paste)
  copySelection: () => void;
  pasteClipboard: () => void;

  // Alignment, Distribution, Mirror, Rotation
  alignElements: (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeElements: (axis: 'horizontal' | 'vertical') => void;
  rotateSelected: (angleDeg: number) => void;
  mirrorSelected: (axis: 'horizontal' | 'vertical') => void;

  // Door/Window specific additions
  addDoorToWall: (wallId: string, customOffset?: number) => string | null;
  addWindowToWall: (wallId: string, customOffset?: number) => string | null;

  // Auto-dimension walls
  autoDimensionWalls: () => void;

  // Floor management
  addFloor: (name: string, copyFromCurrent?: boolean) => void;
  switchFloor: (floorId: string) => void;
  renameFloor: (floorId: string, name: string) => void;
  deleteFloor: (floorId: string) => void;

  // Guides management
  addGuide: (orientation: 'horizontal' | 'vertical', position: number) => void;
  removeGuide: (id: string) => void;
  clearGuides: () => void;

  // Room detection
  refreshDetectedRooms: () => void;
  updateDetectedRoomName: (id: string, name: string) => void;

  // Viewport transforms
  setZoom: (zoom: number) => void;
  setPan: (pan: Point2D) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  zoomToFit: (viewWidth?: number, viewHeight?: number) => void;
  zoomToSelection: (viewWidth?: number, viewHeight?: number) => void;

  // Preferences toggles
  setUnitSystem: (unit: UnitSystem) => void;
  setAreaUnit: (unit: AreaUnit) => void;
  setLanguage: (lang: Language) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  toggleDimensions: () => void;

  // Project management
  saveCurrentProject: () => void;
  createNewProject: (name: string) => void;
  switchProject: (id: string) => void;
  renameProject: (id: string, newName: string) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  importProject: (projectData: Project) => void;

  // Measure tool helper
  setMeasurePoints: (points: Point2D[]) => void;
  clearMeasure: () => void;
}

const { projects: initialProjects, activeId: initialActiveId } = loadProjectsFromStorage();
const initialActiveProject =
  initialProjects.find((p) => p.id === initialActiveId) || initialProjects[0];
const initialPrefs = loadStoredPrefs();

export const useStore = create<AppState>((set, get) => ({
  project: initialActiveProject,
  projectsList: initialProjects.map((p) => ({
    id: p.id,
    name: p.name,
    elementCount: p.elements.length,
    updatedAt: p.updatedAt,
  })),
  isSaving: false,

  past: [],
  future: [],

  activeTool: 'select',
  selectedIds: [],
  clipboard: [],

  zoom: 1.0,
  pan: { x: 80, y: 80 },

  unitSystem: initialPrefs.unitSystem,
  areaUnit: initialPrefs.areaUnit,
  language: initialPrefs.language,
  theme: initialPrefs.theme,
  showGrid: initialPrefs.showGrid,
  snapToGrid: initialPrefs.snapToGrid,
  snapToObjects: initialPrefs.snapToObjects,
  gridSize: 12, // 1 foot grid spacing
  showDimensions: initialPrefs.showDimensions,
  clickThroughLocked: initialPrefs.clickThroughLocked,

  // 3D View properties
  view3dMode: '2d',
  setView3dMode: (mode) => set({ view3dMode: mode }),
  cameraMode3d: 'orbit',
  setCameraMode3d: (mode) => set({ cameraMode3d: mode }),
  floorViewMode3d: 'all',
  setFloorViewMode3d: (mode) => set({ floorViewMode3d: mode }),
  sunTimeOfDay: 14, // 2 PM
  setSunTimeOfDay: (time) => set({ sunTimeOfDay: time }),
  sectionCutHeight: 500, // No cut default
  setSectionCutHeight: (height) => set({ sectionCutHeight: height }),
  wireframe3d: false,
  toggleWireframe3d: () => set((state) => ({ wireframe3d: !state.wireframe3d })),
  show3dDimensions: true,
  toggle3dDimensions: () => set((state) => ({ show3dDimensions: !state.show3dDimensions })),

  layers: { ...DEFAULT_LAYERS },
  activeLayer: 'walls',

  measurePoints: [],
  detectedRooms: detectRoomsFromWalls(
    initialActiveProject.elements.filter((e): e is WallElement => e.type === 'wall')
  ),

  // T-junction mode & visual feedback state
  tJunctionMode: loadStoredTJMode(),
  setTJunctionMode: (mode) => {
    try {
      localStorage.setItem(STORAGE_TJ_MODE_KEY, mode);
    } catch {
      // Ignore storage errors
    }
    set({ tJunctionMode: mode });
  },
  cycleTJunctionMode: () => {
    const current = get().tJunctionMode;
    const next: TJunctionMode = current === 'join' ? 'split' : current === 'split' ? 'cross' : 'join';
    get().setTJunctionMode(next);
  },
  recentJunctionToast: null,
  setRecentJunctionToast: (toast) => {
    set({
      recentJunctionToast: toast ? { ...toast, timestamp: Date.now() } : null,
    });
  },
  pulseNodePoint: null,
  setPulseNodePoint: (pt) => {
    set({ pulseNodePoint: pt });
    if (pt) {
      setTimeout(() => {
        if (get().pulseNodePoint === pt) {
          set({ pulseNodePoint: null });
        }
      }, 500);
    }
  },

  isVehicleCheckOpen: false,
  activeVehicleCheckId: null,
  vehicleCheckPlaybackProgress: 0,
  isVehicleCheckPlaying: false,
  manualDrivePose: undefined,

  commitHistoryStep: () => {
    get().pushHistory();
    get().saveCurrentProject();
  },

  setActiveTool: (tool) => {
    set({ activeTool: tool });
    if (tool !== 'select') {
      get().clearSelection();
    }
    if (tool !== 'measure') {
      set({ measurePoints: [] });
    }
  },

  selectElement: (id, multi = false) => {
    if (!id) {
      set({ selectedIds: [] });
      return;
    }
    if (multi) {
      const current = get().selectedIds;
      if (current.includes(id)) {
        set({ selectedIds: current.filter((x) => x !== id) });
      } else {
        set({ selectedIds: [...current, id] });
      }
    } else {
      set({ selectedIds: [id] });
    }
  },

  selectAll: () => {
    const allIds = get().project.elements.map((e) => e.id);
    set({ selectedIds: allIds });
  },

  clearSelection: () => set({ selectedIds: [] }),

  setSelectedIds: (ids) => set({ selectedIds: ids }),

  toggleLock: (targetIds) => {
    const ids = targetIds || get().selectedIds;
    if (ids.length === 0) return;
    get().pushHistory();

    const current = get().project;
    const shouldLock = current.elements.some((el) => ids.includes(el.id) && !el.locked);

    const updated = current.elements.map((el) => {
      if (ids.includes(el.id)) {
        return { ...el, locked: shouldLock };
      }
      return el;
    });

    set({ project: { ...current, elements: updated, updatedAt: Date.now() } });
    get().saveCurrentProject();
  },

  toggleVisibility: (targetIds) => {
    const ids = targetIds || get().selectedIds;
    if (ids.length === 0) return;
    get().pushHistory();

    const current = get().project;
    const shouldHide = current.elements.some((el) => ids.includes(el.id) && !el.hidden);

    const updated = current.elements.map((el) => {
      if (ids.includes(el.id)) {
        return { ...el, hidden: shouldHide };
      }
      return el;
    });

    set({ project: { ...current, elements: updated, updatedAt: Date.now() } });
    get().saveCurrentProject();
  },

  lockAll: () => {
    get().pushHistory();
    const current = get().project;
    const updated = current.elements.map((el) => ({ ...el, locked: true }));
    set({ project: { ...current, elements: updated, updatedAt: Date.now() } });
    get().saveCurrentProject();
  },

  unlockAll: () => {
    get().pushHistory();
    const current = get().project;
    const updated = current.elements.map((el) => ({ ...el, locked: false }));
    set({ project: { ...current, elements: updated, updatedAt: Date.now() } });
    get().saveCurrentProject();
  },

  toggleClickThroughLocked: () => {
    set((state) => {
      const clickThroughLocked = !state.clickThroughLocked;
      const prefs = { ...loadStoredPrefs(), clickThroughLocked };
      localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(prefs));
      return { clickThroughLocked };
    });
  },

  toggleLayerVisibility: (layerId) => {
    set((state) => {
      const lyr = state.layers[layerId];
      if (!lyr) return state;
      const nextVisible = !lyr.visible;
      const updatedLayers = {
        ...state.layers,
        [layerId]: { ...lyr, visible: nextVisible },
      };
      return {
        layers: updatedLayers,
        ...(layerId === 'dimensions' ? { showDimensions: nextVisible } : {}),
      };
    });
  },

  toggleLayerLock: (layerId) => {
    set((state) => {
      const lyr = state.layers[layerId];
      if (!lyr) return state;
      const newLocked = !lyr.locked;
      const updatedLayers = {
        ...state.layers,
        [layerId]: { ...lyr, locked: newLocked },
      };

      // Also update locked property on elements belonging to this layer
      const current = state.project;
      const updatedElements = current.elements.map((el) => {
        const elLayer = el.layer || getDefaultLayerForType(el.type);
        if (elLayer === layerId) {
          return { ...el, locked: newLocked };
        }
        return el;
      });

      return {
        layers: updatedLayers,
        project: { ...current, elements: updatedElements },
      };
    });
    get().saveCurrentProject();
  },

  setActiveLayer: (layer) => set({ activeLayer: layer }),

  pushHistory: () => {
    const currentElements = cloneElements(get().project.elements);
    const past = get().past;
    const newPast = [...past, currentElements].slice(-MAX_HISTORY);
    set({ past: newPast, future: [] });
  },

  undo: () => {
    const { past, future, project } = get();
    if (past.length === 0) return;

    const previousElements = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    const currentElements = cloneElements(project.elements);
    const newFuture = [currentElements, ...future].slice(0, MAX_HISTORY);

    set({
      past: newPast,
      future: newFuture,
      project: {
        ...project,
        elements: previousElements,
        updatedAt: Date.now(),
      },
      selectedIds: [],
    });
    get().refreshDetectedRooms();
    get().saveCurrentProject();
  },

  redo: () => {
    const { past, future, project } = get();
    if (future.length === 0) return;

    const nextElements = future[0];
    const newFuture = future.slice(1);
    const currentElements = cloneElements(project.elements);
    const newPast = [...past, currentElements].slice(-MAX_HISTORY);

    set({
      past: newPast,
      future: newFuture,
      project: {
        ...project,
        elements: nextElements,
        updatedAt: Date.now(),
      },
    });
    get().refreshDetectedRooms();
    get().saveCurrentProject();
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  addElement: (element) => {
    get().pushHistory();
    const current = get().project;
    const assignedLayer = element.layer || getDefaultLayerForType(element.type);
    const finalElement = { ...element, layer: assignedLayer };
    const updatedElements = [...current.elements, finalElement];

    // Keep active floor updated
    const activeFloorId = current.activeFloorId || 'floor-ground';
    const updatedFloors = (current.floors || []).map((f) =>
      f.id === activeFloorId ? { ...f, elements: updatedElements } : f
    );

    set({
      project: {
        ...current,
        elements: updatedElements,
        floors: updatedFloors,
        updatedAt: Date.now(),
      },
      selectedIds: [finalElement.id],
    });
    get().refreshDetectedRooms();
    get().saveCurrentProject();
  },

  updateElement: (id, patch, commitHistory = true) => {
    const current = get().project;
    const target = current.elements.find((e) => e.id === id);
    if (!target) return;

    // Disallow spatial/structural edits on locked elements (unless toggling locked itself)
    if (target.locked && !('locked' in patch) && !('hidden' in patch)) {
      return;
    }

    if (commitHistory) {
      get().pushHistory();
    }
    const oldElement = target;

    let updatedElements = current.elements.map((el) => {
      if (el.id === id) {
        return { ...el, ...patch } as PlanElement;
      }
      return el;
    });

    // If a wall was updated, validate and adjust any attached doors and windows
    if (oldElement && (oldElement.type === 'wall' || oldElement.type === 'curve_wall')) {
      const updatedWall = updatedElements.find((e) => e.id === id) as
        | WallElement
        | CurveWallElement;

      if (updatedWall) {
        const wallLen =
          updatedWall.type === 'wall'
            ? getWallLength(updatedWall)
            : getCurveWallArc(updatedWall).length;

        updatedElements = updatedElements.map((el) => {
          if ((el.type === 'door' || el.type === 'window') && el.wallId === id) {
            const clamped = clampOffset(el.offset, el.width, wallLen);
            if (clamped !== el.offset) {
              return { ...el, offset: clamped };
            }
          }
          return el;
        });
      }
    }

    const activeFloorId = current.activeFloorId || 'floor-ground';
    const updatedFloors = (current.floors || []).map((f) =>
      f.id === activeFloorId ? { ...f, elements: updatedElements } : f
    );

    set({
      project: {
        ...current,
        elements: updatedElements,
        floors: updatedFloors,
        updatedAt: Date.now(),
      },
    });

    if (oldElement.type === 'wall' && commitHistory) {
      const healResult = healCollinearWalls(updatedElements, current.wallNodes || []);
      if (healResult.healedCount > 0) {
        updatedElements = healResult.elements;
        const updatedFloorsAfterHeal = (current.floors || []).map((f) =>
          f.id === activeFloorId ? { ...f, elements: updatedElements } : f
        );
        set({
          project: {
            ...current,
            elements: updatedElements,
            wallNodes: healResult.wallNodes,
            floors: updatedFloorsAfterHeal,
            updatedAt: Date.now(),
          },
        });
      }
      get().refreshDetectedRooms();
    }
    if (commitHistory) {
      get().saveCurrentProject();
    }
  },

  updateElements: (patches, commitHistory = true) => {
    if (patches.length === 0) return;
    if (commitHistory) {
      get().pushHistory();
    }
    const current = get().project;
    const patchMap = new Map(patches.map((p) => [p.id, p.patch]));

    const nodeUpdates = new Map<string, Point2D>();
    let updatedElements = current.elements.map((el) => {
      const patch = patchMap.get(el.id);
      if (patch && (!el.locked || 'locked' in patch || 'hidden' in patch)) {
        const updated = { ...el, ...patch } as PlanElement;
        if (updated.type === 'wall') {
          const w = updated as WallElement;
          const p = patch as Partial<WallElement>;
          if (p.start && w.startNodeId) nodeUpdates.set(w.startNodeId, p.start);
          if (p.end && w.endNodeId) nodeUpdates.set(w.endNodeId, p.end);
        }
        return updated;
      }
      return el;
    });

    let updatedNodes = current.wallNodes || [];
    if (nodeUpdates.size > 0) {
      updatedNodes = updatedNodes.map((n: WallNode) => {
        const pos = nodeUpdates.get(n.id);
        return pos ? { ...n, x: pos.x, y: pos.y } : n;
      });
    }

    if (commitHistory) {
      const healResult = healCollinearWalls(updatedElements, updatedNodes);
      if (healResult.healedCount > 0) {
        updatedElements = healResult.elements;
        updatedNodes = healResult.wallNodes;
      }
    }

    const activeFloorId = current.activeFloorId || 'floor-ground';
    const updatedFloors = (current.floors || []).map((f) =>
      f.id === activeFloorId ? { ...f, elements: updatedElements } : f
    );

    set({
      project: {
        ...current,
        elements: updatedElements,
        wallNodes: updatedNodes,
        floors: updatedFloors,
        updatedAt: Date.now(),
      },
    });

    if (commitHistory) {
      get().refreshDetectedRooms();
      get().saveCurrentProject();
    }
  },

  moveWallNode: (nodeId, newPos, detach = false, commitHistory = true) => {
    const current = get().project;
    const selectedIds = get().selectedIds;
    const existingNodes = current.wallNodes || [];

    if (commitHistory) {
      get().pushHistory();
    }

    let updatedNodes = [...existingNodes];
    let updatedElements = [...current.elements];

    // Find all straight walls connected to this nodeId
    const connectedWalls = updatedElements.filter(
      (el): el is WallElement => el.type === 'wall' && (el.startNodeId === nodeId || el.endNodeId === nodeId)
    );

    // Which of these connected walls are currently selected?
    const selectedConnectedWalls = connectedWalls.filter((w) => selectedIds.includes(w.id));

    // If only 1 wall connected to this node is selected (or detach is true), ONLY resize that selected wall!
    // When 2 or more connected walls are selected, stretch them together!
    const resizeSingleWallOnly = detach || (selectedConnectedWalls.length === 1 && connectedWalls.length > 1);

    if (resizeSingleWallOnly && selectedConnectedWalls.length > 0) {
      // Detach and resize ONLY the selected wall; other walls at this corner stay untouched!
      const targetWall = selectedConnectedWalls[0];
      const { node: newNode, updatedNodes: newNodesList } = getOrCreateWallNode(newPos, updatedNodes, 1);
      updatedNodes = newNodesList;

      updatedElements = updatedElements.map((el) => {
        if (el.id === targetWall.id && el.type === 'wall') {
          const isStart = el.startNodeId === nodeId;
          const isEnd = el.endNodeId === nodeId;
          return {
            ...el,
            start: isStart ? { ...newPos } : el.start,
            end: isEnd ? { ...newPos } : el.end,
            startNodeId: isStart ? newNode.id : el.startNodeId,
            endNodeId: isEnd ? newNode.id : el.endNodeId,
          };
        }
        return el;
      });
    } else {
      // Check if newPos is close to another existing node to auto-merge into a shared corner node
      const mergeThreshold = 6; // inches
      const targetMergeNode = updatedNodes.find(
        (n) => n.id !== nodeId && Math.hypot(n.x - newPos.x, n.y - newPos.y) <= mergeThreshold
      );

      if (targetMergeNode) {
        // Merge nodeId into targetMergeNode (clean corner weld)
        const mergePos = { x: targetMergeNode.x, y: targetMergeNode.y };
        updatedNodes = updatedNodes.filter((n) => n.id !== nodeId);

        updatedElements = updatedElements.map((el) => {
          if (el.type === 'wall') {
            const isStart = el.startNodeId === nodeId;
            const isEnd = el.endNodeId === nodeId;
            if (isStart || isEnd) {
              return {
                ...el,
                start: isStart ? mergePos : el.start,
                end: isEnd ? mergePos : el.end,
                startNodeId: isStart ? targetMergeNode.id : el.startNodeId,
                endNodeId: isEnd ? targetMergeNode.id : el.endNodeId,
              };
            }
          }
          return el;
        });
      } else {
        // Stretch all walls connected to this node together
        updatedNodes = updatedNodes.map((n) => (n.id === nodeId ? { ...n, x: newPos.x, y: newPos.y } : n));

        updatedElements = updatedElements.map((el) => {
          if (el.type === 'wall') {
            const isStart = el.startNodeId === nodeId;
            const isEnd = el.endNodeId === nodeId;
            if (isStart || isEnd) {
              const newStart = isStart ? { ...newPos } : el.start;
              const newEnd = isEnd ? { ...newPos } : el.end;
              return {
                ...el,
                start: newStart,
                end: newEnd,
              };
            }
          }
          return el;
        });
      }
    }

    // Adjust any attached doors and windows on modified walls
    updatedElements = updatedElements.map((el) => {
      if (el.type === 'door' || el.type === 'window') {
        const hostWall = updatedElements.find((w) => w.id === el.wallId && w.type === 'wall') as WallElement | undefined;
        if (hostWall) {
          const wallLen = distance(hostWall.start, hostWall.end);
          const clamped = clampOffset(el.offset, el.width, wallLen);
          if (clamped !== el.offset) {
            return { ...el, offset: clamped };
          }
        }
      }
      return el;
    });

    // Automatically heal any collinear walls if a node was detached or moved away from a joint
    const healResult = healCollinearWalls(updatedElements, updatedNodes);
    updatedElements = healResult.elements;
    updatedNodes = healResult.wallNodes;

    const activeFloorId = current.activeFloorId || 'floor-ground';
    const updatedFloors = (current.floors || []).map((f) =>
      f.id === activeFloorId ? { ...f, elements: updatedElements } : f
    );

    set({
      project: {
        ...current,
        elements: updatedElements,
        wallNodes: updatedNodes,
        floors: updatedFloors,
        updatedAt: Date.now(),
      },
    });

    if (commitHistory) {
      get().refreshDetectedRooms();
      get().saveCurrentProject();
    }
  },

  splitWallAt: (wallId, splitPoint, branchWallId, branchWallEnd = 'end', mode) => {
    const current = get().project;
    const effectiveMode = mode || get().tJunctionMode;

    if (effectiveMode === 'cross') {
      return undefined;
    }

    const wall = current.elements.find(
      (e) => e.id === wallId && (e.type === 'wall' || e.type === 'curve_wall')
    ) as WallElement | CurveWallElement | undefined;

    if (!wall) return undefined;

    if (wall.locked) {
      const lang = get().language;
      const t = translations[lang];
      get().setRecentJunctionToast({
        id: `toast-locked-${Date.now()}`,
        message: t.junctions.targetLockedWarning,
        type: 'warning',
      });
      return undefined;
    }

    get().pushHistory();

    const doors = current.elements.filter((e): e is DoorElement => e.type === 'door');
    const windows = current.elements.filter((e): e is WindowElement => e.type === 'window');

    const splitNodeId = `node-split-${Date.now().toString(36)}`;
    const splitResult = splitWallAtPoint(wall, splitPoint, splitNodeId, doors, windows);

    const otherElements = current.elements.filter(
      (e) => e.id !== wallId && e.type !== 'door' && e.type !== 'window'
    );

    let updatedElements = [
      ...otherElements,
      splitResult.firstWall,
      splitResult.secondWall,
      ...splitResult.reassignedDoors,
      ...splitResult.reassignedWindows,
    ];

    if (branchWallId && effectiveMode === 'join') {
      updatedElements = updatedElements.map((el) => {
        if (el.id === branchWallId && el.type === 'wall') {
          if (branchWallEnd === 'start') {
            return {
              ...el,
              start: { x: splitResult.splitNode.x, y: splitResult.splitNode.y },
              startNodeId: splitNodeId,
            };
          } else {
            return {
              ...el,
              end: { x: splitResult.splitNode.x, y: splitResult.splitNode.y },
              endNodeId: splitNodeId,
            };
          }
        }
        return el;
      });
    }

    const updatedNodes = [...(current.wallNodes || []), splitResult.splitNode];
    const activeFloorId = current.activeFloorId || 'floor-ground';
    const updatedFloors = (current.floors || []).map((f) =>
      f.id === activeFloorId ? { ...f, elements: updatedElements } : f
    );

    set({
      project: {
        ...current,
        elements: updatedElements,
        wallNodes: updatedNodes,
        floors: updatedFloors,
        updatedAt: Date.now(),
      },
      selectedIds: branchWallId ? [branchWallId] : [splitResult.firstWall.id, splitResult.secondWall.id],
    });

    get().setPulseNodePoint({ x: splitResult.splitNode.x, y: splitResult.splitNode.y });
    const lang = get().language;
    const t = translations[lang];
    get().setRecentJunctionToast({
      id: `toast-split-${Date.now()}`,
      message: t.junctions.wallSplitToast,
      type: 'success',
    });

    get().refreshDetectedRooms();
    get().saveCurrentProject();
    return splitNodeId;
  },

  splitWallAtPointAction: (wallId, splitPoint) => {
    const res = get().splitWallAt(wallId, splitPoint);
    if (!res) {
      return { success: false, message: 'Could not split wall' };
    }
    const t = translations[get().language];
    return { success: true, message: t.junctions.wallSplitToast };
  },

  joinSelectedWalls: () => {
    const { project, selectedIds, language } = get();
    const t = translations[language];

    const selectedWalls = project.elements.filter(
      (e): e is WallElement => selectedIds.includes(e.id) && e.type === 'wall'
    );

    if (selectedWalls.length !== 2) {
      const msg = 'Please select exactly 2 walls to join';
      get().setRecentJunctionToast({
        id: `toast-join-err-${Date.now()}`,
        message: msg,
        type: 'warning',
      });
      return { success: false, message: msg };
    }

    const [w1, w2] = selectedWalls;
    const allWalls = project.elements.filter((e): e is WallElement | CurveWallElement => e.type === 'wall' || e.type === 'curve_wall');
    const allDoors = project.elements.filter((e): e is DoorElement => e.type === 'door');
    const allWindows = project.elements.filter((e): e is WindowElement => e.type === 'window');

    const result = joinCollinearWalls(w1, w2, allWalls, allDoors, allWindows, project.wallNodes || []);

    if (!result.success || !result.mergedWall) {
      let msg = t.junctions.cannotJoinNotCollinear;
      if (result.reason === 'third_wall_attached') {
        msg = t.junctions.cannotJoinThirdWall;
      } else if (result.reason === 'locked') {
        msg = t.junctions.targetLockedWarning;
      }
      get().setRecentJunctionToast({
        id: `toast-join-err-${Date.now()}`,
        message: msg,
        type: 'warning',
      });
      return { success: false, message: msg };
    }

    get().pushHistory();

    const otherElements = project.elements.filter(
      (e) => e.id !== w1.id && e.id !== w2.id && e.type !== 'door' && e.type !== 'window'
    );

    const updatedElements = [
      ...otherElements,
      result.mergedWall,
      ...(result.reassignedDoors || []),
      ...(result.reassignedWindows || []),
    ];

    const activeFloorId = project.activeFloorId || 'floor-ground';
    const updatedFloors = (project.floors || []).map((f) =>
      f.id === activeFloorId ? { ...f, elements: updatedElements } : f
    );

    set({
      project: {
        ...project,
        elements: updatedElements,
        wallNodes: result.remainingNodes,
        floors: updatedFloors,
        updatedAt: Date.now(),
      },
      selectedIds: [result.mergedWall.id],
    });

    get().setPulseNodePoint({ x: result.mergedWall.start.x, y: result.mergedWall.start.y });
    get().setRecentJunctionToast({
      id: `toast-join-${Date.now()}`,
      message: t.junctions.wallsJoinedToast,
      type: 'success',
    });

    get().refreshDetectedRooms();
    get().saveCurrentProject();
    return { success: true, message: t.junctions.wallsJoinedToast };
  },

  mergeCloseNodes: (nodeId1, nodeId2) => {
    const { project } = get();
    const n1 = (project.wallNodes || []).find((n) => n.id === nodeId1);
    const n2 = (project.wallNodes || []).find((n) => n.id === nodeId2);
    if (!n1 || !n2) return { success: false, message: 'Node not found' };

    get().pushHistory();

    const walls = project.elements.filter((e): e is WallElement | CurveWallElement => e.type === 'wall' || e.type === 'curve_wall');
    const roads = project.elements.filter((e): e is RoadElement => e.type === 'road');
    const targetPoint = { x: (n1.x + n2.x) / 2, y: (n1.y + n2.y) / 2 };

    const { updatedWalls, updatedRoads, updatedNodes } = mergeNodes(
      nodeId1,
      nodeId2,
      targetPoint,
      walls,
      roads,
      project.wallNodes || []
    );

    const otherElements = project.elements.filter((e) => e.type !== 'wall' && e.type !== 'curve_wall' && e.type !== 'road');
    const updatedElements = [...otherElements, ...updatedWalls, ...updatedRoads];

    const activeFloorId = project.activeFloorId || 'floor-ground';
    const updatedFloors = (project.floors || []).map((f) =>
      f.id === activeFloorId ? { ...f, elements: updatedElements } : f
    );

    set({
      project: {
        ...project,
        elements: updatedElements,
        wallNodes: updatedNodes,
        floors: updatedFloors,
        updatedAt: Date.now(),
      },
    });

    get().setPulseNodePoint(targetPoint);
    const t = translations[get().language];
    get().setRecentJunctionToast({
      id: `toast-merge-${Date.now()}`,
      message: t.junctions.nodesMergedToast,
      type: 'success',
    });

    get().refreshDetectedRooms();
    get().saveCurrentProject();
    return { success: true, message: t.junctions.nodesMergedToast };
  },

  disconnectWallAtNode: (wallId, nodeId) => {
    const { project } = get();
    const walls = project.elements.filter((e): e is WallElement | CurveWallElement => e.type === 'wall' || e.type === 'curve_wall');
    const targetWall = walls.find((w) => w.id === wallId);
    if (!targetWall) return { success: false, message: 'Wall not found' };

    get().pushHistory();

    const { updatedWalls, updatedNodes, newNode } = disconnectAtNode(
      nodeId,
      wallId,
      walls,
      project.wallNodes || []
    );

    const otherElements = project.elements.filter((e) => e.type !== 'wall' && e.type !== 'curve_wall');
    const updatedElements = [...otherElements, ...updatedWalls];

    const activeFloorId = project.activeFloorId || 'floor-ground';
    const updatedFloors = (project.floors || []).map((f) =>
      f.id === activeFloorId ? { ...f, elements: updatedElements } : f
    );

    set({
      project: {
        ...project,
        elements: updatedElements,
        wallNodes: updatedNodes,
        floors: updatedFloors,
        updatedAt: Date.now(),
      },
    });

    get().setPulseNodePoint({ x: newNode.x, y: newNode.y });
    const t = translations[get().language];
    get().setRecentJunctionToast({
      id: `toast-disc-${Date.now()}`,
      message: t.junctions.disconnectedToast,
      type: 'info',
    });

    get().refreshDetectedRooms();
    get().saveCurrentProject();
    return { success: true, message: t.junctions.disconnectedToast };
  },

  trimCrossingWalls: (wallId1, wallId2) => {
    const { project } = get();
    const w1 = project.elements.find((e): e is WallElement => e.id === wallId1 && e.type === 'wall');
    const w2 = project.elements.find((e): e is WallElement => e.id === wallId2 && e.type === 'wall');
    if (!w1 || !w2) return { success: false, message: 'Walls not found' };
    if (w1.locked || w2.locked) {
      const t = translations[get().language];
      get().setRecentJunctionToast({
        id: `toast-locked-${Date.now()}`,
        message: t.junctions.targetLockedWarning,
        type: 'warning',
      });
      return { success: false, message: t.junctions.targetLockedWarning };
    }

    const doors = project.elements.filter((e): e is DoorElement => e.type === 'door');
    const windows = project.elements.filter((e): e is WindowElement => e.type === 'window');
    const splitNodeId = `node-x-${Date.now().toString(36)}`;

    const res = splitWallsAtCrossing(w1, w2, splitNodeId, doors, windows);
    if (!res) return { success: false, message: 'Walls do not cross' };

    get().pushHistory();

    const otherElements = project.elements.filter(
      (e) => e.id !== wallId1 && e.id !== wallId2 && e.type !== 'door' && e.type !== 'window'
    );

    const updatedElements = [
      ...otherElements,
      ...res.walls,
      ...res.reassignedDoors,
      ...res.reassignedWindows,
    ];

    const updatedNodes = [...(project.wallNodes || []), res.splitNode];
    const activeFloorId = project.activeFloorId || 'floor-ground';
    const updatedFloors = (project.floors || []).map((f) =>
      f.id === activeFloorId ? { ...f, elements: updatedElements } : f
    );

    set({
      project: {
        ...project,
        elements: updatedElements,
        wallNodes: updatedNodes,
        floors: updatedFloors,
        updatedAt: Date.now(),
      },
      selectedIds: res.walls.map((w) => w.id),
    });

    get().setPulseNodePoint({ x: res.splitNode.x, y: res.splitNode.y });
    const t = translations[get().language];
    get().setRecentJunctionToast({
      id: `toast-x-${Date.now()}`,
      message: t.junctions.wallSplitToast,
      type: 'success',
    });

    get().refreshDetectedRooms();
    get().saveCurrentProject();
    return { success: true, message: t.junctions.wallSplitToast };
  },

  splitRoadAtPointAction: (roadId, splitPoint) => {
    const { project } = get();
    const road = project.elements.find((e): e is RoadElement => e.id === roadId && e.type === 'road');
    if (!road) return { success: false, message: 'Road not found' };
    if (road.locked) {
      const t = translations[get().language];
      get().setRecentJunctionToast({
        id: `toast-locked-${Date.now()}`,
        message: t.junctions.targetLockedWarning,
        type: 'warning',
      });
      return { success: false, message: t.junctions.targetLockedWarning };
    }

    get().pushHistory();

    const res = splitRoadAtPoint(road, splitPoint);
    const otherElements = project.elements.filter((e) => e.id !== roadId);
    const updatedElements = [...otherElements, res.firstRoad, res.secondRoad];

    const activeFloorId = project.activeFloorId || 'floor-ground';
    const updatedFloors = (project.floors || []).map((f) =>
      f.id === activeFloorId ? { ...f, elements: updatedElements } : f
    );

    set({
      project: {
        ...project,
        elements: updatedElements,
        floors: updatedFloors,
        updatedAt: Date.now(),
      },
      selectedIds: [res.firstRoad.id, res.secondRoad.id],
    });

    get().setPulseNodePoint(res.splitPoint);
    const t = translations[get().language];
    get().setRecentJunctionToast({
      id: `toast-road-split-${Date.now()}`,
      message: t.junctions.wallSplitToast,
      type: 'success',
    });

    get().saveCurrentProject();
    return { success: true, message: t.junctions.wallSplitToast };
  },

  joinSelectedRoads: () => {
    const { project, selectedIds } = get();
    const selectedRoads = project.elements.filter(
      (e): e is RoadElement => selectedIds.includes(e.id) && e.type === 'road'
    );
    if (selectedRoads.length !== 2) {
      return { success: false, message: 'Select 2 roads to join' };
    }

    const [r1, r2] = selectedRoads;
    const res = joinCollinearRoads(r1, r2);
    if (!res.success || !res.mergedRoad) {
      return { success: false, message: 'Roads cannot be joined' };
    }

    get().pushHistory();

    const otherElements = project.elements.filter((e) => e.id !== r1.id && e.id !== r2.id);
    const updatedElements = [...otherElements, res.mergedRoad];

    const activeFloorId = project.activeFloorId || 'floor-ground';
    const updatedFloors = (project.floors || []).map((f) =>
      f.id === activeFloorId ? { ...f, elements: updatedElements } : f
    );

    set({
      project: {
        ...project,
        elements: updatedElements,
        floors: updatedFloors,
        updatedAt: Date.now(),
      },
      selectedIds: [res.mergedRoad.id],
    });

    const t = translations[get().language];
    get().setRecentJunctionToast({
      id: `toast-road-join-${Date.now()}`,
      message: t.junctions.wallsJoinedToast,
      type: 'success',
    });

    get().saveCurrentProject();
    return { success: true, message: t.junctions.wallsJoinedToast };
  },

  healWalls: () => {
    const current = get().project;
    const { elements, wallNodes, healedCount } = healCollinearWalls(
      current.elements,
      current.wallNodes || []
    );
    if (healedCount > 0) {
      get().pushHistory();
      const activeFloorId = current.activeFloorId || 'floor-ground';
      const updatedFloors = (current.floors || []).map((f) =>
        f.id === activeFloorId ? { ...f, elements } : f
      );
      set({
        project: {
          ...current,
          elements,
          wallNodes,
          floors: updatedFloors,
          updatedAt: Date.now(),
        },
      });
      get().refreshDetectedRooms();
      get().saveCurrentProject();
      return true;
    }
    return false;
  },

  nudgeSelected: (deltaX, deltaY) => {
    const { selectedIds, project } = get();
    if (selectedIds.length === 0) return;

    get().pushHistory();

    const updatedNodes = [...(project.wallNodes || [])];

    const updatedElements = project.elements.map((el) => {
      if (!selectedIds.includes(el.id) || el.locked) return el;

      if (el.type === 'wall' || el.type === 'curve_wall') {
        const newStart = { x: el.start.x + deltaX, y: el.start.y + deltaY };
        const newEnd = { x: el.end.x + deltaX, y: el.end.y + deltaY };

        // Update corresponding nodes if present
        if (el.startNodeId) {
          const sn = updatedNodes.find((n) => n.id === el.startNodeId);
          if (sn) { sn.x = newStart.x; sn.y = newStart.y; }
        }
        if (el.endNodeId) {
          const en = updatedNodes.find((n) => n.id === el.endNodeId);
          if (en) { en.x = newEnd.x; en.y = newEnd.y; }
        }

        return { ...el, start: newStart, end: newEnd };
      }

      if ('x' in el && 'y' in el) {
        return { ...el, x: el.x + deltaX, y: el.y + deltaY } as PlanElement;
      }

      if (el.type === 'dimension') {
        return {
          ...el,
          start: { x: el.start.x + deltaX, y: el.start.y + deltaY },
          end: { x: el.end.x + deltaX, y: el.end.y + deltaY },
        };
      }

      return el;
    });

    const activeFloorId = project.activeFloorId || 'floor-ground';
    const updatedFloors = (project.floors || []).map((f) =>
      f.id === activeFloorId ? { ...f, elements: updatedElements } : f
    );

    set({
      project: {
        ...project,
        elements: updatedElements,
        wallNodes: updatedNodes,
        floors: updatedFloors,
        updatedAt: Date.now(),
      },
    });

    get().refreshDetectedRooms();
    get().saveCurrentProject();
  },

  deleteElements: (idsToDelete) => {
    if (idsToDelete.length === 0) return;
    const current = get().project;

    // Prevent deletion of locked objects
    const deletableIds = idsToDelete.filter((id) => {
      const el = current.elements.find((e) => e.id === id);
      return el && !el.locked;
    });

    if (deletableIds.length === 0) return;
    get().pushHistory();

    const idSet = new Set(deletableIds);

    // If wall is deleted, cascade delete attached doors and windows
    current.elements.forEach((el) => {
      if ((el.type === 'door' || el.type === 'window') && idSet.has(el.wallId)) {
        idSet.add(el.id);
      }
    });

    const remainingElements = current.elements.filter((el) => !idSet.has(el.id));
    // Automatically heal any collinear walls that were previously split by the deleted wall
    const { elements: healedElements, wallNodes: healedNodes } = healCollinearWalls(
      remainingElements,
      current.wallNodes || []
    );

    const activeFloorId = current.activeFloorId || 'floor-ground';
    const updatedFloors = (current.floors || []).map((f) =>
      f.id === activeFloorId ? { ...f, elements: healedElements } : f
    );

    set({
      project: {
        ...current,
        elements: healedElements,
        wallNodes: healedNodes,
        floors: updatedFloors,
        updatedAt: Date.now(),
      },
      selectedIds: [],
    });
    get().refreshDetectedRooms();
    get().saveCurrentProject();
  },

  duplicateElement: (id) => {
    const current = get().project;
    const el = current.elements.find((e) => e.id === id);
    if (!el || el.locked) return;

    get().pushHistory();
    const newId = `${el.type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const offsetDelta = 24; // 2 ft offset

    let duplicate: PlanElement;

    if (el.type === 'box') {
      duplicate = {
        ...el,
        id: newId,
        x: el.x + offsetDelta,
        y: el.y + offsetDelta,
        label: el.label ? `${el.label} (Copy)` : undefined,
      };
    } else if (el.type === 'circle') {
      duplicate = {
        ...el,
        id: newId,
        x: el.x + offsetDelta,
        y: el.y + offsetDelta,
        label: el.label ? `${el.label} (Copy)` : undefined,
      };
    } else if (el.type === 'wall') {
      duplicate = {
        ...el,
        id: newId,
        start: { x: el.start.x + offsetDelta, y: el.start.y + offsetDelta },
        end: { x: el.end.x + offsetDelta, y: el.end.y + offsetDelta },
        label: el.label ? `${el.label} (Copy)` : undefined,
      };
    } else if (el.type === 'curve_wall') {
      duplicate = {
        ...el,
        id: newId,
        start: { x: el.start.x + offsetDelta, y: el.start.y + offsetDelta },
        end: { x: el.end.x + offsetDelta, y: el.end.y + offsetDelta },
        label: el.label ? `${el.label} (Copy)` : undefined,
      };
    } else if (el.type === 'door' || el.type === 'window') {
      duplicate = {
        ...el,
        id: newId,
        offset: el.offset + 12,
        label: el.label ? `${el.label} (Copy)` : undefined,
      };
    } else if (el.type === 'furniture' || el.type === 'plot' || el.type === 'text') {
      duplicate = {
        ...el,
        id: newId,
        x: el.x + offsetDelta,
        y: el.y + offsetDelta,
      };
    } else if (el.type === 'dimension') {
      duplicate = {
        ...el,
        id: newId,
        start: { x: el.start.x + offsetDelta, y: el.start.y + offsetDelta },
        end: { x: el.end.x + offsetDelta, y: el.end.y + offsetDelta },
      };
    } else {
      return;
    }

    const updatedElements = [...current.elements, duplicate];
    set({
      project: {
        ...current,
        elements: updatedElements,
        updatedAt: Date.now(),
      },
      selectedIds: [newId],
    });
    get().saveCurrentProject();
  },

  setElements: (elements, recordHistory = true) => {
    if (recordHistory) {
      get().pushHistory();
    }
    const current = get().project;
    set({
      project: {
        ...current,
        elements,
        updatedAt: Date.now(),
      },
    });
    get().refreshDetectedRooms();
    get().saveCurrentProject();
  },

  copySelection: () => {
    const current = get().project;
    const selected = current.elements.filter((e) => get().selectedIds.includes(e.id));
    if (selected.length > 0) {
      set({ clipboard: cloneElements(selected) });
    }
  },

  pasteClipboard: () => {
    const { clipboard, project } = get();
    if (clipboard.length === 0) return;
    get().pushHistory();

    const offset = 24;
    const newElements: PlanElement[] = [];
    const newIds: string[] = [];

    clipboard.forEach((item) => {
      const newId = `${item.type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      newIds.push(newId);

      if (item.type === 'wall' || item.type === 'curve_wall') {
        newElements.push({
          ...item,
          id: newId,
          start: { x: item.start.x + offset, y: item.start.y + offset },
          end: { x: item.end.x + offset, y: item.end.y + offset },
          locked: false,
        });
      } else if ('x' in item && 'y' in item) {
        newElements.push({
          ...item,
          id: newId,
          x: item.x + offset,
          y: item.y + offset,
          locked: false,
        } as PlanElement);
      } else {
        newElements.push({
          ...item,
          id: newId,
          locked: false,
        });
      }
    });

    const updated = [...project.elements, ...newElements];
    set({
      project: { ...project, elements: updated, updatedAt: Date.now() },
      selectedIds: newIds,
    });
    get().refreshDetectedRooms();
    get().saveCurrentProject();
  },

  alignElements: (direction) => {
    const { project, selectedIds } = get();
    if (selectedIds.length < 2) return;
    get().pushHistory();

    const selected = project.elements.filter((e) => selectedIds.includes(e.id) && !e.locked);
    if (selected.length < 2) return;

    // Get bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    selected.forEach((el) => {
      if ('x' in el && 'y' in el) {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        const w = 'width' in el ? el.width : ('radius' in el ? el.radius * 2 : 24);
        const h = 'height' in el ? el.height : ('radius' in el ? el.radius * 2 : 24);
        maxX = Math.max(maxX, el.x + w);
        maxY = Math.max(maxY, el.y + h);
      } else if (el.type === 'wall' || el.type === 'curve_wall') {
        minX = Math.min(minX, el.start.x, el.end.x);
        maxX = Math.max(maxX, el.start.x, el.end.x);
        minY = Math.min(minY, el.start.y, el.end.y);
        maxY = Math.max(maxY, el.start.y, el.end.y);
      }
    });

    const updated = project.elements.map((el) => {
      if (!selectedIds.includes(el.id) || el.locked) return el;

      if ('x' in el && 'y' in el) {
        let newX = el.x;
        let newY = el.y;
        const w = 'width' in el ? el.width : 24;
        const h = 'height' in el ? el.height : 24;

        if (direction === 'left') newX = minX;
        if (direction === 'center') newX = (minX + maxX) / 2 - w / 2;
        if (direction === 'right') newX = maxX - w;
        if (direction === 'top') newY = minY;
        if (direction === 'middle') newY = (minY + maxY) / 2 - h / 2;
        if (direction === 'bottom') newY = maxY - h;

        return { ...el, x: Math.round(newX), y: Math.round(newY) } as PlanElement;
      }
      return el;
    });

    set({ project: { ...project, elements: updated, updatedAt: Date.now() } });
    get().saveCurrentProject();
  },

  distributeElements: (axis) => {
    const { project, selectedIds } = get();
    if (selectedIds.length < 3) return;
    get().pushHistory();

    const selected = project.elements
      .filter((e) => selectedIds.includes(e.id) && !e.locked && 'x' in e && 'y' in e)
      .sort((a: any, b: any) => (axis === 'horizontal' ? a.x - b.x : a.y - b.y));

    if (selected.length < 3) return;

    const first: any = selected[0];
    const last: any = selected[selected.length - 1];

    if (axis === 'horizontal') {
      const totalSpan = last.x - first.x;
      const step = totalSpan / (selected.length - 1);
      const updated = project.elements.map((el) => {
        const idx = selected.findIndex((s) => s.id === el.id);
        if (idx > 0 && idx < selected.length - 1) {
          return { ...el, x: Math.round(first.x + idx * step) } as PlanElement;
        }
        return el;
      });
      set({ project: { ...project, elements: updated, updatedAt: Date.now() } });
    } else {
      const totalSpan = last.y - first.y;
      const step = totalSpan / (selected.length - 1);
      const updated = project.elements.map((el) => {
        const idx = selected.findIndex((s) => s.id === el.id);
        if (idx > 0 && idx < selected.length - 1) {
          return { ...el, y: Math.round(first.y + idx * step) } as PlanElement;
        }
        return el;
      });
      set({ project: { ...project, elements: updated, updatedAt: Date.now() } });
    }
    get().saveCurrentProject();
  },

  rotateSelected: (angleDeltaDeg) => {
    const { project, selectedIds } = get();
    if (selectedIds.length === 0) return;
    get().pushHistory();

    const updated = project.elements.map((el) => {
      if (!selectedIds.includes(el.id) || el.locked) return el;
      if ('rotation' in el) {
        const newRot = ((el.rotation || 0) + angleDeltaDeg) % 360;
        return { ...el, rotation: newRot >= 0 ? newRot : newRot + 360 };
      }
      return el;
    });

    set({ project: { ...project, elements: updated, updatedAt: Date.now() } });
    get().saveCurrentProject();
  },

  mirrorSelected: (axis) => {
    const { project, selectedIds } = get();
    if (selectedIds.length === 0) return;
    get().pushHistory();

    // Find center of selected group
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    project.elements.forEach((el) => {
      if (!selectedIds.includes(el.id)) return;
      if ('x' in el && 'y' in el) {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        const w = 'width' in el ? el.width : 24;
        const h = 'height' in el ? el.height : 24;
        maxX = Math.max(maxX, el.x + w);
        maxY = Math.max(maxY, el.y + h);
      } else if (el.type === 'wall') {
        minX = Math.min(minX, el.start.x, el.end.x);
        maxX = Math.max(maxX, el.start.x, el.end.x);
        minY = Math.min(minY, el.start.y, el.end.y);
        maxY = Math.max(maxY, el.start.y, el.end.y);
      }
    });

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const updated = project.elements.map((el) => {
      if (!selectedIds.includes(el.id) || el.locked) return el;

      if (el.type === 'wall' || el.type === 'curve_wall') {
        if (axis === 'horizontal') {
          return {
            ...el,
            start: { x: centerX - (el.start.x - centerX), y: el.start.y },
            end: { x: centerX - (el.end.x - centerX), y: el.end.y },
          };
        } else {
          return {
            ...el,
            start: { x: el.start.x, y: centerY - (el.start.y - centerY) },
            end: { x: el.end.x, y: centerY - (el.end.y - centerY) },
          };
        }
      } else if ('x' in el && 'y' in el) {
        const w = 'width' in el ? el.width : 24;
        const h = 'height' in el ? el.height : 24;
        if (axis === 'horizontal') {
          return { ...el, x: centerX - (el.x + w - centerX) } as PlanElement;
        } else {
          return { ...el, y: centerY - (el.y + h - centerY) } as PlanElement;
        }
      }
      return el;
    });

    set({ project: { ...project, elements: updated, updatedAt: Date.now() } });
    get().refreshDetectedRooms();
    get().saveCurrentProject();
  },

  addDoorToWall: (wallId, customOffset) => {
    const wall = get().project.elements.find(
      (e) => e.id === wallId && (e.type === 'wall' || e.type === 'curve_wall')
    ) as WallElement | CurveWallElement | undefined;

    if (!wall) return null;

    const wallLen =
      wall.type === 'wall' ? getWallLength(wall) : getCurveWallArc(wall).length;
    const doorWidth = 36; // 3ft default
    const defaultOffset =
      customOffset !== undefined
        ? clampOffset(customOffset, doorWidth, wallLen)
        : Math.max(0, (wallLen - doorWidth) / 2);

    const doorId = `door-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const newDoor: DoorElement = {
      id: doorId,
      type: 'door',
      wallId,
      offset: defaultOffset,
      width: doorWidth,
      height: 84, // 7ft
      swingDirection: 'inside_left',
      openAngle: 90,
      label: 'Darwaza',
      layer: 'doors_windows',
    };

    get().addElement(newDoor);
    return doorId;
  },

  addWindowToWall: (wallId, customOffset) => {
    const wall = get().project.elements.find(
      (e) => e.id === wallId && (e.type === 'wall' || e.type === 'curve_wall')
    ) as WallElement | CurveWallElement | undefined;

    if (!wall) return null;

    const wallLen =
      wall.type === 'wall' ? getWallLength(wall) : getCurveWallArc(wall).length;
    const windowWidth = 48; // 4ft default
    const defaultOffset =
      customOffset !== undefined
        ? clampOffset(customOffset, windowWidth, wallLen)
        : Math.max(0, (wallLen - windowWidth) / 2);

    const winId = `win-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const newWindow: WindowElement = {
      id: winId,
      type: 'window',
      wallId,
      offset: defaultOffset,
      width: windowWidth,
      height: 48,
      depth: wall.thickness || 9,
      label: 'Khidki',
      layer: 'doors_windows',
    };

    get().addElement(newWindow);
    return winId;
  },

  autoDimensionWalls: () => {
    const current = get().project;
    const walls = current.elements.filter((e): e is WallElement => e.type === 'wall');
    if (walls.length === 0) return;

    get().pushHistory();
    const existingAutoIds = new Set(
      current.elements
        .filter((e): e is DimensionElement => e.type === 'dimension' && !!e.autoWallId)
        .map((d) => d.autoWallId)
    );

    const newDims: DimensionElement[] = [];

    walls.forEach((w) => {
      if (existingAutoIds.has(w.id)) return;
      newDims.push({
        id: `dim-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'dimension',
        start: { ...w.start },
        end: { ...w.end },
        offset: (w.thickness || 9) / 2 + 14,
        autoWallId: w.id,
        layer: 'dimensions',
      });
    });

    if (newDims.length > 0) {
      set({
        project: {
          ...current,
          elements: [...current.elements, ...newDims],
          updatedAt: Date.now(),
        },
      });
      get().saveCurrentProject();
    }
  },

  addFloor: (name, copyFromCurrent = false) => {
    const current = get().project;
    const newId = `floor-${Date.now().toString(36)}`;
    const existingFloors = current.floors || [];
    const elementsToUse = copyFromCurrent
      ? cloneElements(current.elements).map((el) => ({
          ...el,
          id: `${el.type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        }))
      : [];

    const newFloor: Floor = {
      id: newId,
      name: name.trim() || `Floor ${existingFloors.length + 1}`,
      level: existingFloors.length,
      elements: elementsToUse,
    };

    const updatedFloors = [...existingFloors, newFloor];

    set({
      project: {
        ...current,
        floors: updatedFloors,
        activeFloorId: newId,
        elements: elementsToUse,
        updatedAt: Date.now(),
      },
      selectedIds: [],
    });
    get().refreshDetectedRooms();
    get().saveCurrentProject();
  },

  switchFloor: (floorId) => {
    const current = get().project;
    const target = (current.floors || []).find((f) => f.id === floorId);
    if (!target) return;

    set({
      project: {
        ...current,
        activeFloorId: target.id,
        elements: target.elements || [],
        updatedAt: Date.now(),
      },
      selectedIds: [],
    });
    get().refreshDetectedRooms();
  },

  renameFloor: (floorId, name) => {
    const current = get().project;
    const updatedFloors = (current.floors || []).map((f) =>
      f.id === floorId ? { ...f, name } : f
    );
    set({
      project: { ...current, floors: updatedFloors, updatedAt: Date.now() },
    });
    get().saveCurrentProject();
  },

  deleteFloor: (floorId) => {
    const current = get().project;
    const floors = current.floors || [];
    if (floors.length <= 1) return; // Keep at least one floor

    get().pushHistory();
    const remaining = floors.filter((f) => f.id !== floorId);
    const wasActive = current.activeFloorId === floorId;
    const nextActive = wasActive
      ? remaining[0]
      : remaining.find((f) => f.id === current.activeFloorId) || remaining[0];

    set({
      project: {
        ...current,
        floors: remaining,
        activeFloorId: nextActive.id,
        elements: wasActive ? (nextActive.elements || []) : current.elements,
        updatedAt: Date.now(),
      },
      selectedIds: wasActive ? [] : get().selectedIds,
    });
    get().refreshDetectedRooms();
    get().saveCurrentProject();
  },

  addGuide: (orientation, position) => {
    const current = get().project;
    const newGuide: GuideLine = {
      id: `guide-${Date.now().toString(36)}`,
      orientation,
      position: Math.round(position),
    };
    const updatedGuides = [...(current.guides || []), newGuide];
    set({ project: { ...current, guides: updatedGuides } });
    get().saveCurrentProject();
  },

  removeGuide: (id) => {
    const current = get().project;
    const updatedGuides = (current.guides || []).filter((g) => g.id !== id);
    set({ project: { ...current, guides: updatedGuides } });
    get().saveCurrentProject();
  },

  clearGuides: () => {
    const current = get().project;
    set({ project: { ...current, guides: [] } });
    get().saveCurrentProject();
  },

  refreshDetectedRooms: () => {
    const current = get().project;
    const walls = current.elements.filter((e): e is WallElement => e.type === 'wall');
    const rooms = detectRoomsFromWalls(walls);
    set({ detectedRooms: rooms });
  },

  updateDetectedRoomName: (id, name) => {
    set((state) => ({
      detectedRooms: state.detectedRooms.map((r) =>
        r.id === id ? { ...r, name } : r
      ),
    }));
  },

  setZoom: (zoom) => set({ zoom: Math.max(0.15, Math.min(zoom, 6.0)) }),
  setPan: (pan) => set({ pan }),
  zoomIn: () => set((state) => ({ zoom: Math.min(state.zoom * 1.25, 6.0) })),
  zoomOut: () => set((state) => ({ zoom: Math.max(state.zoom / 1.25, 0.15) })),
  resetZoom: () => set({ zoom: 1.0, pan: { x: 80, y: 80 } }),

  zoomToFit: (viewWidth = 800, viewHeight = 600) => {
    const { elements } = get().project;
    if (elements.length === 0) {
      get().resetZoom();
      return;
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    elements.forEach((el) => {
      if (el.type === 'wall' || el.type === 'curve_wall') {
        minX = Math.min(minX, el.start.x, el.end.x);
        maxX = Math.max(maxX, el.start.x, el.end.x);
        minY = Math.min(minY, el.start.y, el.end.y);
        maxY = Math.max(maxY, el.start.y, el.end.y);
      } else if ('x' in el && 'y' in el) {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        const w = 'width' in el ? el.width : 24;
        const h = 'height' in el ? el.height : 24;
        maxX = Math.max(maxX, el.x + w);
        maxY = Math.max(maxY, el.y + h);
      }
    });

    const planWidth = Math.max(50, maxX - minX);
    const planHeight = Math.max(50, maxY - minY);
    const padding = 60;

    const scaleX = (viewWidth - padding * 2) / planWidth;
    const scaleY = (viewHeight - padding * 2) / planHeight;
    const newZoom = Math.max(0.2, Math.min(Math.min(scaleX, scaleY), 2.5));

    const newPan = {
      x: (viewWidth - planWidth * newZoom) / 2 - minX * newZoom,
      y: (viewHeight - planHeight * newZoom) / 2 - minY * newZoom,
    };

    set({ zoom: newZoom, pan: newPan });
  },

  zoomToSelection: (viewWidth = 800, viewHeight = 600) => {
    const { project, selectedIds } = get();
    const selected = project.elements.filter((e) => selectedIds.includes(e.id));
    if (selected.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    selected.forEach((el) => {
      if (el.type === 'wall' || el.type === 'curve_wall') {
        minX = Math.min(minX, el.start.x, el.end.x);
        maxX = Math.max(maxX, el.start.x, el.end.x);
        minY = Math.min(minY, el.start.y, el.end.y);
        maxY = Math.max(maxY, el.start.y, el.end.y);
      } else if ('x' in el && 'y' in el) {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        const w = 'width' in el ? el.width : 24;
        const h = 'height' in el ? el.height : 24;
        maxX = Math.max(maxX, el.x + w);
        maxY = Math.max(maxY, el.y + h);
      }
    });

    const selWidth = Math.max(30, maxX - minX);
    const selHeight = Math.max(30, maxY - minY);
    const padding = 80;

    const scaleX = (viewWidth - padding * 2) / selWidth;
    const scaleY = (viewHeight - padding * 2) / selHeight;
    const newZoom = Math.max(0.3, Math.min(Math.min(scaleX, scaleY), 3.0));

    const newPan = {
      x: (viewWidth - selWidth * newZoom) / 2 - minX * newZoom,
      y: (viewHeight - selHeight * newZoom) / 2 - minY * newZoom,
    };

    set({ zoom: newZoom, pan: newPan });
  },

  setUnitSystem: (unit) => {
    set({ unitSystem: unit });
    const prefs = { ...loadStoredPrefs(), unitSystem: unit };
    localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(prefs));
  },

  setAreaUnit: (unit) => {
    set({ areaUnit: unit });
    const prefs = { ...loadStoredPrefs(), areaUnit: unit };
    localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(prefs));
  },

  setLanguage: (lang) => {
    set({ language: lang });
    const prefs = { ...loadStoredPrefs(), language: lang };
    localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(prefs));
  },

  setTheme: (theme) => {
    set({ theme });
    const prefs = { ...loadStoredPrefs(), theme };
    localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(prefs));
  },

  toggleGrid: () => {
    set((state) => {
      const showGrid = !state.showGrid;
      const prefs = { ...loadStoredPrefs(), showGrid };
      localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(prefs));
      return { showGrid };
    });
  },

  toggleSnap: () => {
    set((state) => {
      const snapToGrid = !state.snapToGrid;
      const prefs = { ...loadStoredPrefs(), snapToGrid };
      localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(prefs));
      return { snapToGrid };
    });
  },

  toggleDimensions: () => {
    set((state) => {
      const showDimensions = !state.showDimensions;
      const prefs = { ...loadStoredPrefs(), showDimensions };
      localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(prefs));
      const dimLyr = state.layers.dimensions;
      const updatedLayers = dimLyr
        ? { ...state.layers, dimensions: { ...dimLyr, visible: showDimensions } }
        : state.layers;
      return { showDimensions, layers: updatedLayers };
    });
  },

  saveCurrentProject: () => {
    const current = get().project;
    try {
      set({ isSaving: true });
      const raw = localStorage.getItem(STORAGE_PROJECTS_KEY);
      let projects: Project[] = raw ? JSON.parse(raw) : [];
      const index = projects.findIndex((p) => p.id === current.id);

      if (index >= 0) {
        projects[index] = current;
      } else {
        projects.push(current);
      }

      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
      localStorage.setItem(STORAGE_ACTIVE_ID_KEY, current.id);

      set({
        projectsList: projects.map((p) => ({
          id: p.id,
          name: p.name,
          elementCount: p.elements.length,
          updatedAt: p.updatedAt,
        })),
        isSaving: false,
      });
    } catch {
      set({ isSaving: false });
    }
  },

  createNewProject: (name) => {
    const newId = `project-${Date.now().toString(36)}`;
    const defaultFloor: Floor = {
      id: 'floor-ground',
      name: 'Ground Floor',
      level: 0,
      elements: [],
    };

    const newProject: Project = {
      id: newId,
      name: name.trim() || 'Naya Naqsha',
      elements: [],
      floors: [defaultFloor],
      activeFloorId: defaultFloor.id,
      guides: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const currentList = get().projectsList;
    set({
      project: newProject,
      past: [],
      future: [],
      selectedIds: [],
      activeTool: 'wall',
      zoom: 1.0,
      pan: { x: 80, y: 80 },
      detectedRooms: [],
      projectsList: [
        ...currentList,
        {
          id: newId,
          name: newProject.name,
          elementCount: 0,
          updatedAt: newProject.updatedAt,
        },
      ],
    });
    get().saveCurrentProject();
  },

  switchProject: (id) => {
    try {
      const raw = localStorage.getItem(STORAGE_PROJECTS_KEY);
      if (!raw) return;
      const projects: Project[] = JSON.parse(raw);
      const target = projects.find((p) => p.id === id);
      if (target) {
        const normalized = normalizeProject(target);
        set({
          project: normalized,
          past: [],
          future: [],
          selectedIds: [],
          zoom: 1.0,
          pan: { x: 80, y: 80 },
        });
        get().refreshDetectedRooms();
        localStorage.setItem(STORAGE_ACTIVE_ID_KEY, target.id);
      }
    } catch {
      // Ignore
    }
  },

  renameProject: (id, newName) => {
    const raw = localStorage.getItem(STORAGE_PROJECTS_KEY);
    if (!raw) return;
    try {
      const projects: Project[] = JSON.parse(raw);
      const p = projects.find((x) => x.id === id);
      if (p) {
        p.name = newName;
        p.updatedAt = Date.now();
        localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
        if (get().project.id === id) {
          set({ project: { ...get().project, name: newName, updatedAt: p.updatedAt } });
        }
        set({
          projectsList: projects.map((item) => ({
            id: item.id,
            name: item.name,
            elementCount: item.elements.length,
            updatedAt: item.updatedAt,
          })),
        });
      }
    } catch {
      // Ignore
    }
  },

  deleteProject: (id) => {
    try {
      const raw = localStorage.getItem(STORAGE_PROJECTS_KEY);
      if (!raw) return;
      let projects: Project[] = JSON.parse(raw);
      projects = projects.filter((p) => p.id !== id);

      if (projects.length === 0) {
        const fresh: Project = {
          id: 'project-default',
          name: 'Naya Naqsha',
          elements: [],
          floors: [{ id: 'floor-ground', name: 'Ground Floor', level: 0, elements: [] }],
          activeFloorId: 'floor-ground',
          guides: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        projects = [fresh];
      }

      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
      const nextActive = normalizeProject(projects[0]);
      localStorage.setItem(STORAGE_ACTIVE_ID_KEY, nextActive.id);

      set({
        project: nextActive,
        past: [],
        future: [],
        selectedIds: [],
        projectsList: projects.map((p) => ({
          id: p.id,
          name: p.name,
          elementCount: p.elements.length,
          updatedAt: p.updatedAt,
        })),
      });
      get().refreshDetectedRooms();
    } catch {
      // Ignore
    }
  },

  duplicateProject: (id) => {
    try {
      const raw = localStorage.getItem(STORAGE_PROJECTS_KEY);
      if (!raw) return;
      const projects: Project[] = JSON.parse(raw);
      const target = projects.find((p) => p.id === id);
      if (!target) return;

      const dupId = `project-${Date.now().toString(36)}`;
      const duplicated: Project = {
        ...target,
        id: dupId,
        name: `${target.name} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      projects.push(duplicated);
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
      localStorage.setItem(STORAGE_ACTIVE_ID_KEY, dupId);

      const normalized = normalizeProject(duplicated);
      set({
        project: normalized,
        past: [],
        future: [],
        selectedIds: [],
        projectsList: projects.map((p) => ({
          id: p.id,
          name: p.name,
          elementCount: p.elements.length,
          updatedAt: p.updatedAt,
        })),
      });
      get().refreshDetectedRooms();
    } catch {
      // Ignore
    }
  },

  importProject: (projectData) => {
    get().pushHistory();
    const newId = `project-import-${Date.now().toString(36)}`;
    const normalized = normalizeProject(projectData);
    const imported: Project = {
      ...normalized,
      id: newId,
      name: normalized.name || 'Imported Naqsha',
      updatedAt: Date.now(),
    };

    const currentList = get().projectsList;
    set({
      project: imported,
      past: [],
      future: [],
      selectedIds: [],
      projectsList: [
        ...currentList,
        {
          id: newId,
          name: imported.name,
          elementCount: imported.elements.length,
          updatedAt: imported.updatedAt,
        },
      ],
    });
    get().refreshDetectedRooms();
    get().saveCurrentProject();
  },

  setVehicleCheckOpen: (open) => set({ isVehicleCheckOpen: open }),
  setActiveVehicleCheckId: (id) => set({ activeVehicleCheckId: id }),

  createVehicleCheck: (presetKey = 'car', name) => {
    const current = get().project;
    const vehicle = createVehicleFromPreset(presetKey);
    const newSession: VehicleCheckSession = {
      id: `check-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      name: name || `${vehicle.name} Entry Check`,
      vehicle,
      waypoints: [],
      allowFootpath: false,
      safetyMargin: 12,
      playbackProgress: 0,
      isPlaying: false,
      speed: 1,
    };

    const existingChecks = current.vehicleChecks || [];
    const updatedChecks = [...existingChecks, newSession];

    set({
      project: {
        ...current,
        vehicleChecks: updatedChecks,
        activeVehicleCheckId: newSession.id,
      },
      activeVehicleCheckId: newSession.id,
      isVehicleCheckOpen: true,
      vehicleCheckPlaybackProgress: 0,
      isVehicleCheckPlaying: false,
    });
    get().saveCurrentProject();
    return newSession.id;
  },

  updateActiveVehicleCheck: (patch) => {
    const { project, activeVehicleCheckId } = get();
    if (!activeVehicleCheckId) return;

    const checks = project.vehicleChecks || [];
    const updated = checks.map((c) => (c.id === activeVehicleCheckId ? { ...c, ...patch } : c));

    set({ project: { ...project, vehicleChecks: updated } });
    get().saveCurrentProject();

    // If vehicle, waypoints, or flags changed, re-run simulation automatically
    if (patch.vehicle || patch.waypoints || patch.allowFootpath !== undefined || patch.safetyMargin !== undefined) {
      get().runVehicleCheckSimulation();
    }
  },

  addWaypointToActiveVehicleCheck: (point, isReverse = false) => {
    const { project, activeVehicleCheckId } = get();
    if (!activeVehicleCheckId) return;

    const checks = project.vehicleChecks || [];
    const target = checks.find((c) => c.id === activeVehicleCheckId);
    if (!target) return;

    const newWp: PathWaypoint = {
      id: `wp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      x: point.x,
      y: point.y,
      isReverse,
    };

    const updatedWaypoints = [...target.waypoints, newWp];
    get().updateActiveVehicleCheck({ waypoints: updatedWaypoints });
  },

  removeWaypointFromActiveVehicleCheck: (id) => {
    const { project, activeVehicleCheckId } = get();
    if (!activeVehicleCheckId) return;

    const checks = project.vehicleChecks || [];
    const target = checks.find((c) => c.id === activeVehicleCheckId);
    if (!target) return;

    const updatedWaypoints = target.waypoints.filter((w) => w.id !== id);
    get().updateActiveVehicleCheck({ waypoints: updatedWaypoints });
  },

  clearWaypointsInActiveVehicleCheck: () => {
    get().updateActiveVehicleCheck({ waypoints: [], result: undefined });
    set({ vehicleCheckPlaybackProgress: 0, isVehicleCheckPlaying: false });
  },

  runVehicleCheckSimulation: () => {
    const { project, activeVehicleCheckId } = get();
    if (!activeVehicleCheckId) return;

    const checks = project.vehicleChecks || [];
    const target = checks.find((c) => c.id === activeVehicleCheckId);
    if (!target || target.waypoints.length < 2) return;

    // Simulate kinematics
    const { poses, sweptPolygon } = simulateVehiclePath(target.vehicle, target.waypoints, 8.0);

    // Extract collision targets from project elements
    const walls = project.elements.filter(
      (e): e is WallElement | CurveWallElement => e.type === 'wall' || e.type === 'curve_wall'
    );
    const gates = project.elements.filter((e): e is GateElement => e.type === 'gate');
    const obstacles = project.elements.filter((e): e is ObstacleElement => e.type === 'obstacle');
    const roads = project.elements.filter((e): e is RoadElement => e.type === 'road');

    const result = evaluateVehicleCheck(
      target.vehicle,
      poses,
      walls,
      gates,
      obstacles,
      roads,
      {
        allowFootpath: target.allowFootpath,
        safetyMargin: target.safetyMargin,
      }
    );
    result.sweptPolygon = sweptPolygon;

    const updatedChecks = checks.map((c) =>
      c.id === activeVehicleCheckId ? { ...c, result } : c
    );

    set({ project: { ...project, vehicleChecks: updatedChecks } });
    get().saveCurrentProject();
  },

  runAutoPath: () => {
    const { project, activeVehicleCheckId } = get();
    if (!activeVehicleCheckId) return;

    const checks = project.vehicleChecks || [];
    const target = checks.find((c) => c.id === activeVehicleCheckId);
    if (!target) return;

    // Locate road and gate in project elements
    const roads = project.elements.filter((e): e is RoadElement => e.type === 'road');
    const gates = project.elements.filter((e): e is GateElement => e.type === 'gate');
    const walls = project.elements.filter((e): e is WallElement => e.type === 'wall');

    let roadStart: Point2D = { x: 50, y: 100 };
    let roadHeading = 0;
    if (roads.length > 0) {
      roadStart = { ...roads[0].start };
      roadHeading = Math.atan2(roads[0].end.y - roads[0].start.y, roads[0].end.x - roads[0].start.x);
    }

    let gateCenter: Point2D = { x: 300, y: 250 };
    let gateNormal = Math.PI / 2;

    if (gates.length > 0) {
      const g = gates[0];
      const hostWall = walls.find((w) => w.id === g.wallId);
      if (hostWall) {
        const wallLen = Math.hypot(hostWall.end.x - hostWall.start.x, hostWall.end.y - hostWall.start.y) || 1;
        const dx = (hostWall.end.x - hostWall.start.x) / wallLen;
        const dy = (hostWall.end.y - hostWall.start.y) / wallLen;
        const midOffset = g.offset + g.width / 2;
        gateCenter = {
          x: hostWall.start.x + dx * midOffset,
          y: hostWall.start.y + dy * midOffset,
        };
        // Perpendicular into plot
        gateNormal = Math.atan2(dx, -dy);
      }
    } else if (walls.length > 0) {
      gateCenter = {
        x: (walls[0].start.x + walls[0].end.x) / 2,
        y: (walls[0].start.y + walls[0].end.y) / 2,
      };
    }

    const autoWaypoints = generateAutoPath(roadStart, roadHeading, gateCenter, gateNormal, target.vehicle);
    get().updateActiveVehicleCheck({ waypoints: autoWaypoints });
  },

  setVehicleCheckPlaybackProgress: (progress) =>
    set({ vehicleCheckPlaybackProgress: Math.max(0, Math.min(1, progress)) }),

  setVehicleCheckPlaying: (isPlaying) => set({ isVehicleCheckPlaying: isPlaying }),

  setManualDrivePose: (pose) => set({ manualDrivePose: pose }),

  deleteVehicleCheck: (id) => {
    const { project, activeVehicleCheckId } = get();
    const checks = (project.vehicleChecks || []).filter((c) => c.id !== id);
    const nextActiveId = activeVehicleCheckId === id ? (checks[0]?.id || null) : activeVehicleCheckId;
    set({
      project: { ...project, vehicleChecks: checks },
      activeVehicleCheckId: nextActiveId,
    });
    get().saveCurrentProject();
  },

  setMeasurePoints: (points) => set({ measurePoints: points }),
  clearMeasure: () => set({ measurePoints: [] }),
}));
