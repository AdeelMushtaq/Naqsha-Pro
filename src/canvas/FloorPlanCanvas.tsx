import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Line, Circle } from 'react-konva';
import Konva from 'konva';
import { useStore, getDefaultLayerForType } from '../store/useStore';
import {
  Point2D,
  WallElement,
  CurveWallElement,
  DoorElement,
  WindowElement,
  BoxElement,
  CircleElement,
  FurnitureElement,
  PlotElement,
  DimensionElement,
  TextElement,
  PlanElement,
  LayerType,
  StairElement,
  RoadElement,
  GateElement,
  ObstacleElement,
  SnapFeedback,
} from '../models/types';
import { GridLayer } from './GridLayer';
import { WallRenderer } from './WallRenderer';
import { WallJunctionRenderer } from './WallJunctionRenderer';
import { DoorRenderer } from './DoorRenderer';
import { WindowRenderer } from './WindowRenderer';
import { BoxRenderer } from './BoxRenderer';
import { CircleRenderer } from './CircleRenderer';
import { FurnitureRenderer } from './FurnitureRenderer';
import { PlotRenderer } from './PlotRenderer';
import { DimensionRenderer } from './DimensionRenderer';
import { TextRenderer } from './TextRenderer';
import { StairRenderer } from './StairRenderer';
import { RoadRenderer } from './RoadRenderer';
import { GateRenderer } from './GateRenderer';
import { ObstacleRenderer } from './ObstacleRenderer';
import { VehicleCheckRenderer } from './VehicleCheckRenderer';
import { calculateStairParameters } from '../utils/stairs';
import { DetectedRoomBadge } from './DetectedRoomBadge';
import { DrawingPreview } from './DrawingPreview';
import { Ruler } from './Ruler';
import { ScaleBar } from './ScaleBar';
import { Minimap } from './Minimap';
import { SelectionTransformer } from './interaction/SelectionTransformer';
import {
  snapToGrid,
  snapToEndpoints,
  snapToMidpoints,
  snapAngle,
} from '../utils/snapping';
import {
  projectPointOntoSegment,
  getWallLength,
  distance,
  clampOffset,
} from '../utils/geometry';
import {
  isPointOnWallInterior,
  getOrCreateWallNode,
  findWallJunctions,
  getConnectedEndpointsMap,
} from '../utils/wallJoin';
import { formatLength, formatAreaWithUnit } from '../utils/units';

interface FloorPlanCanvasProps {
  stageRef: React.RefObject<Konva.Stage | null>;
  onOpenLibrary?: () => void;
}

export const FloorPlanCanvas: React.FC<FloorPlanCanvasProps> = ({
  stageRef,
  onOpenLibrary,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Store bindings
  const {
    project,
    activeTool,
    selectedIds,
    zoom,
    pan,
    unitSystem,
    areaUnit,
    theme,
    showGrid,
    snapToGrid: enableGridSnap,
    snapToObjects: enableObjectSnap,
    gridSize,
    showDimensions,
    layers,
    detectedRooms,
    clickThroughLocked,
    setActiveTool,
    selectElement,
    setSelectedIds,
    clearSelection,
    selectAll,
    addElement,
    updateElement,
    updateElements,
    setZoom,
    setPan,
    addGuide,
    removeGuide,
    updateDetectedRoomName,
    moveWallNode,
    splitWallAt,
    nudgeSelected,
    activeVehicleCheckId,
    isVehicleCheckOpen,
    vehicleCheckPlaybackProgress,
    manualDrivePose,
    updateActiveVehicleCheck,
    setManualDrivePose,
  } = useStore();

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<Point2D | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<Point2D | null>(null);
  const [snapGuidePoint, setSnapGuidePoint] = useState<SnapFeedback | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  // Live transform and handle info message
  const [liveInfo, setLiveInfo] = useState<string | null>(null);

  // Wall Chain Drawing state
  const chainStartNodeRef = useRef<string | null>(null);
  const chainFirstNodeRef = useRef<string | null>(null);

  // Marquee selection box state
  const [marqueeStart, setMarqueeStart] = useState<Point2D | null>(null);
  const [marqueeCurrent, setMarqueeCurrent] = useState<Point2D | null>(null);

  // Touch tracking for pinch-to-zoom & two-finger pan
  const lastTouchDistRef = useRef<number | null>(null);
  const lastTouchCenterRef = useRef<Point2D | null>(null);

  // Tab cycling over overlapping elements
  const overlapCycleIndexRef = useRef<number>(0);

  // Resize observer to fill container
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth || 800,
          height: containerRef.current.clientHeight || 600,
        });
      }
    };
    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Keyboard modifiers & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }
      if (e.shiftKey) {
        setIsShiftPressed(true);
      }

      // Escape stops drawing chain or clears selection
      if (e.key === 'Escape') {
        setIsDrawing(false);
        setDrawStart(null);
        chainStartNodeRef.current = null;
        chainFirstNodeRef.current = null;
        setMarqueeStart(null);
        setMarqueeCurrent(null);
        clearSelection();
        setActiveTool('select');
      }

      // Arrow keys nudge
      if (
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight'
      ) {
        if (selectedIds.length > 0) {
          e.preventDefault();
          const step = e.shiftKey ? gridSize : Math.max(1, gridSize / 4);
          let dx = 0;
          let dy = 0;
          if (e.key === 'ArrowUp') dy = -step;
          if (e.key === 'ArrowDown') dy = step;
          if (e.key === 'ArrowLeft') dx = -step;
          if (e.key === 'ArrowRight') dx = step;
          nudgeSelected(dx, dy);
        }
      }

      // Tab key cycles through overlapping elements
      if (e.key === 'Tab') {
        e.preventDefault();
        const selectableElements = project.elements.filter((el) => !el.hidden && !el.locked);
        if (selectableElements.length === 0) return;

        overlapCycleIndexRef.current = (overlapCycleIndexRef.current + 1) % selectableElements.length;
        const target = selectableElements[overlapCycleIndexRef.current];
        if (target) {
          selectElement(target.id, false);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
      if (!e.shiftKey) {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    selectedIds,
    gridSize,
    nudgeSelected,
    project.elements,
    selectElement,
    clearSelection,
    setActiveTool,
  ]);

  // Convert screen coordinates to world coordinates (inches)
  const getPointerWorldPos = useCallback((): Point2D => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const pos = stage.getPointerPosition();
    if (!pos) return { x: 0, y: 0 };

    return {
      x: (pos.x - pan.x) / zoom,
      y: (pos.y - pan.y) / zoom,
    };
  }, [pan, zoom, stageRef]);

  // Snapping logic with endpoints, T-junctions, midpoints, angle, and grid
  const processSnapping = useCallback(
    (
      rawPoint: Point2D,
      startOrigin: Point2D | null = null
    ): { point: Point2D; snappedGuide: SnapFeedback | null } => {
      let p = { ...rawPoint };

      // 1. Angle snap (0, 45, 90 deg) if Shift is pressed or drawing straight lines
      if (startOrigin && (isShiftPressed || activeTool === 'wall')) {
        const angleResult = snapAngle(startOrigin, p, 45, isShiftPressed ? 180 : 8);
        if (angleResult.snapped) {
          p = angleResult.point;
        }
      }

      // 2. Object endpoint / corner snap (HIGHEST PRIORITY - Real Corners)
      if (enableObjectSnap) {
        const snapRadius = Math.max(18, 22 / zoom);
        const endSnap = snapToEndpoints(p, project.elements, snapRadius);
        if (endSnap.snapped) {
          return {
            point: endSnap.point,
            snappedGuide: {
              point: endSnap.point,
              type: 'corner',
              label: 'Corner Connected',
              targetElementId: endSnap.targetElementId,
            },
          };
        }

        // 3. T-junction snap onto existing wall bodies
        for (const el of project.elements) {
          if (el.type === 'wall' && !el.locked) {
            const interior = isPointOnWallInterior(p, el as WallElement, Math.max(12, 16 / zoom), 8);
            if (interior.onInterior) {
              return {
                point: interior.splitPoint,
                snappedGuide: {
                  point: interior.splitPoint,
                  type: 't_junction',
                  label: 'T-Junction',
                  targetElementId: el.id,
                },
              };
            }
          }
        }

        // 4. Object midpoint snap
        const midSnap = snapToMidpoints(p, project.elements, Math.max(12, 14 / zoom));
        if (midSnap.snapped) {
          return {
            point: midSnap.point,
            snappedGuide: {
              point: midSnap.point,
              type: 'midpoint',
              label: 'Midpoint',
              targetElementId: midSnap.targetElementId,
            },
          };
        }
      }

      // 5. Grid snap (LOWEST PRIORITY - Subtle alignment, no false corner badge)
      if (enableGridSnap) {
        const gridSnap = snapToGrid(p, gridSize, 6 / zoom);
        if (gridSnap.snapped) {
          return {
            point: gridSnap.point,
            snappedGuide: {
              point: gridSnap.point,
              type: 'grid',
              label: 'Grid',
            },
          };
        }
      }

      return { point: p, snappedGuide: null };
    },
    [
      enableGridSnap,
      enableObjectSnap,
      gridSize,
      isShiftPressed,
      activeTool,
      project.elements,
      zoom,
    ]
  );

  // Mouse wheel zoom centered on cursor
  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldZoom = zoom;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.12;
    const newZoom =
      e.evt.deltaY < 0 ? Math.min(oldZoom * scaleBy, 6.0) : Math.max(oldZoom / scaleBy, 0.15);

    const mousePointTo = {
      x: (pointer.x - pan.x) / oldZoom,
      y: (pointer.y - pan.y) / oldZoom,
    };

    const newPan = {
      x: pointer.x - mousePointTo.x * newZoom,
      y: pointer.y - mousePointTo.y * newZoom,
    };

    setZoom(newZoom);
    setPan(newPan);
  };

  // Touch gesture handling
  const handleTouchMove = (e: any) => {
    const evt = e.evt;
    if (evt.touches.length === 2) {
      evt.preventDefault();
      const t1 = evt.touches[0];
      const t2 = evt.touches[1];

      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const center: Point2D = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };

      if (lastTouchDistRef.current && lastTouchCenterRef.current) {
        const scaleFactor = dist / lastTouchDistRef.current;
        const newZoom = Math.max(0.15, Math.min(6.0, zoom * scaleFactor));

        const stage = stageRef.current;
        if (stage) {
          const rect = containerRef.current?.getBoundingClientRect();
          const offsetX = center.x - (rect?.left || 0);
          const offsetY = center.y - (rect?.top || 0);

          const mousePointTo = {
            x: (offsetX - pan.x) / zoom,
            y: (offsetY - pan.y) / zoom,
          };

          const newPan = {
            x: offsetX - mousePointTo.x * newZoom + (center.x - lastTouchCenterRef.current.x),
            y: offsetY - mousePointTo.y * newZoom + (center.y - lastTouchCenterRef.current.y),
          };

          setZoom(newZoom);
          setPan(newPan);
        }
      }

      lastTouchDistRef.current = dist;
      lastTouchCenterRef.current = center;
    }
  };

  const handleTouchEnd = () => {
    lastTouchDistRef.current = null;
    lastTouchCenterRef.current = null;
  };

  // Find nearest wall for Door or Window placement
  const findNearestWall = (pos: Point2D) => {
    let closestWall: WallElement | null = null;
    let closestOffset = 0;
    let minDistance = 24 / zoom;

    project.elements.forEach((el) => {
      if (el.type === 'wall' && !el.hidden) {
        const proj = projectPointOntoSegment(pos, el.start, el.end);
        if (proj.distance < minDistance) {
          minDistance = proj.distance;
          closestWall = el;
          closestOffset = proj.offset;
        }
      }
    });

    return { wall: closestWall as WallElement | null, offset: closestOffset };
  };

  // Stage pointer down (Mouse, Touch, Pen)
  const handleStagePointerDown = (e: any) => {
    if (activeTool === 'pan' || isSpacePressed || e.evt?.button === 1) {
      return;
    }

    const clickedOnStage = e.target === stageRef.current;
    const rawPos = getPointerWorldPos();

    if (activeTool === 'select') {
      if (clickedOnStage) {
        clearSelection();
        // Start marquee drag selection
        setMarqueeStart(rawPos);
        setMarqueeCurrent(rawPos);
      }
      return;
    }

    if (activeTool === 'furniture') {
      if (onOpenLibrary) onOpenLibrary();
      return;
    }

    if (activeTool === 'door') {
      const { wall, offset } = findNearestWall(rawPos);
      if (wall) {
        const doorWidth = 36;
        const wallLen = getWallLength(wall);
        const safeOffset = clampOffset(offset - doorWidth / 2, doorWidth, wallLen);
        const newDoor: DoorElement = {
          id: `door-${Date.now().toString(36)}`,
          type: 'door',
          wallId: wall.id,
          offset: safeOffset,
          width: doorWidth,
          height: 84,
          sillHeight: 0,
          isOpen: false,
          swingDirection: 'inside_left',
          openAngle: 90,
          label: 'Darwaza',
          locked: false,
          layer: 'doors_windows',
        };
        addElement(newDoor);
        setActiveTool('select');
      }
      return;
    }

    if (activeTool === 'window') {
      const { wall, offset } = findNearestWall(rawPos);
      if (wall) {
        const winWidth = 48;
        const wallLen = getWallLength(wall);
        const safeOffset = clampOffset(offset - winWidth / 2, winWidth, wallLen);
        const newWindow: WindowElement = {
          id: `win-${Date.now().toString(36)}`,
          type: 'window',
          wallId: wall.id,
          offset: safeOffset,
          width: winWidth,
          height: 48,
          sillHeight: 36,
          depth: wall.thickness || 9,
          label: 'Khidki',
          locked: false,
          layer: 'doors_windows',
        };
        addElement(newWindow);
        setActiveTool('select');
      }
      return;
    }

    if (activeTool === 'text') {
      const textVal = prompt('Enter Note / Label:', 'Note');
      if (textVal && textVal.trim()) {
        const newText: TextElement = {
          id: `text-${Date.now().toString(36)}`,
          type: 'text',
          x: Math.round(rawPos.x),
          y: Math.round(rawPos.y),
          text: textVal.trim(),
          fontSize: 14,
          rotation: 0,
          locked: false,
          layer: 'notes',
        };
        addElement(newText);
        setActiveTool('select');
      }
      return;
    }

    if (activeTool === 'gate') {
      const { wall, offset } = findNearestWall(rawPos);
      if (wall) {
        const gateWidth = 144; // 12ft clear opening
        const wallLen = getWallLength(wall);
        const safeOffset = clampOffset(offset - gateWidth / 2, gateWidth, wallLen);
        const newGate: GateElement = {
          id: `gate-${Date.now().toString(36)}`,
          type: 'gate',
          wallId: wall.id,
          offset: safeOffset,
          width: gateWidth,
          height: 120, // 10ft clear height
          gateType: 'sliding',
          postThickness: 18,
          label: 'Main Gate',
          locked: false,
          layer: 'doors_windows',
        };
        addElement(newGate);
        setActiveTool('select');
      }
      return;
    }

    if (activeTool === 'obstacle') {
      const newObs: ObstacleElement = {
        id: `obs-${Date.now().toString(36)}`,
        type: 'obstacle',
        obstacleType: 'pole',
        x: Math.round(rawPos.x),
        y: Math.round(rawPos.y),
        width: 36,
        height: 36,
        rotation: 0,
        height3d: 96,
        label: 'Electric Pole',
        locked: false,
        layer: 'roads_access',
      };
      addElement(newObs);
      setActiveTool('select');
      return;
    }

    if (activeTool === 'vehicle_check') {
      const state = useStore.getState();
      let checkId = state.activeVehicleCheckId;
      if (!checkId) {
        checkId = state.createVehicleCheck('car');
      }
      state.addWaypointToActiveVehicleCheck(
        { x: Math.round(rawPos.x), y: Math.round(rawPos.y) },
        e.evt?.altKey || isShiftPressed
      );
      return;
    }

    // Drag-drawing tools: wall, curve_wall, box, circle, dimension, plot, measure, stair, road
    const { point } = processSnapping(rawPos, drawStart);
    setIsDrawing(true);
    if (!drawStart) {
      setDrawStart(point);
    }
    setCurrentMousePos(point);
  };

  // Stage pointer move
  const handleStagePointerMove = (e: any) => {
    const rawPos = getPointerWorldPos();

    if (marqueeStart) {
      setMarqueeCurrent(rawPos);
      return;
    }

    const { point, snappedGuide } = processSnapping(rawPos, drawStart);
    setCurrentMousePos(point);
    setSnapGuidePoint(snappedGuide);
  };

  // Stage pointer up
  const handleStagePointerUp = (e: any) => {
    // 1. Finish marquee selection
    if (marqueeStart && marqueeCurrent) {
      const minX = Math.min(marqueeStart.x, marqueeCurrent.x);
      const maxX = Math.max(marqueeStart.x, marqueeCurrent.x);
      const minY = Math.min(marqueeStart.y, marqueeCurrent.y);
      const maxY = Math.max(marqueeStart.y, marqueeCurrent.y);

      if (maxX - minX > 5 || maxY - minY > 5) {
        const enclosedIds: string[] = [];
        project.elements.forEach((el) => {
          if (el.hidden) return;
          if (el.type === 'wall' || el.type === 'curve_wall') {
            if (
              el.start.x >= minX &&
              el.start.x <= maxX &&
              el.start.y >= minY &&
              el.start.y <= maxY &&
              el.end.x >= minX &&
              el.end.x <= maxX &&
              el.end.y >= minY &&
              el.end.y <= maxY
            ) {
              enclosedIds.push(el.id);
            }
          } else if ('x' in el && 'y' in el) {
            if (el.x >= minX && el.x <= maxX && el.y >= minY && el.y <= maxY) {
              enclosedIds.push(el.id);
            }
          }
        });
        if (enclosedIds.length > 0) {
          setSelectedIds(enclosedIds);
        }
      }
      setMarqueeStart(null);
      setMarqueeCurrent(null);
      return;
    }

    if (!isDrawing || !drawStart || !currentMousePos) {
      setIsDrawing(false);
      setDrawStart(null);
      return;
    }

    const start = drawStart;
    const end = currentMousePos;
    const dist = distance(start, end);

    if (dist >= 4) {
      const idPrefix = `${activeTool}-${Date.now().toString(36)}`;

      if (activeTool === 'wall') {
        // Wall auto-connect & node assignment with generous magnetic snap
        const existingNodes = project.wallNodes || [];
        const snapTol = Math.max(16, 20 / zoom);
        const { node: startNode } = getOrCreateWallNode(start, existingNodes, snapTol);
        const { node: endNode } = getOrCreateWallNode(end, existingNodes, snapTol);

        const newWall: WallElement = {
          id: idPrefix,
          type: 'wall',
          start: { x: startNode.x, y: startNode.y },
          end: { x: endNode.x, y: endNode.y },
          startNodeId: startNode.id,
          endNodeId: endNode.id,
          thickness: 9,
          height: 120,
          label: 'Deewar',
          locked: false,
          layer: 'walls',
        };
        addElement(newWall);

        // Check if start lands on another wall interior (T-junction split & connect)
        for (const otherEl of project.elements) {
          if (otherEl.type === 'wall' && otherEl.id !== newWall.id && !otherEl.locked) {
            const interior = isPointOnWallInterior(start, otherEl, 10 / zoom, 12 / zoom);
            if (interior.onInterior) {
              splitWallAt(otherEl.id, interior.splitPoint, newWall.id, 'start');
              break;
            }
          }
        }

        // Check if endpoint lands on another wall interior (T-junction split & connect)
        let splitEndNodeId: string | undefined = undefined;
        for (const otherEl of project.elements) {
          if (otherEl.type === 'wall' && otherEl.id !== newWall.id && !otherEl.locked) {
            const interior = isPointOnWallInterior(end, otherEl, 10 / zoom, 12 / zoom);
            if (interior.onInterior) {
              splitEndNodeId = splitWallAt(otherEl.id, interior.splitPoint, newWall.id, 'end');
              break;
            }
          }
        }

        // Chain drawing: next wall continues from this endpoint!
        if (!chainFirstNodeRef.current) {
          chainFirstNodeRef.current = startNode.id;
        }

        // If closed loop back to first node:
        if (endNode.id === chainFirstNodeRef.current) {
          setIsDrawing(false);
          setDrawStart(null);
          chainFirstNodeRef.current = null;
          setActiveTool('select');
          return;
        }

        setDrawStart({ x: endNode.x, y: endNode.y });
        chainStartNodeRef.current = endNode.id;
        return;
      } else if (activeTool === 'curve_wall') {
        const chordLen = distance(start, end);
        const newCurveWall: CurveWallElement = {
          id: idPrefix,
          type: 'curve_wall',
          start,
          end,
          bulge: chordLen * 0.2,
          thickness: 9,
          height: 120,
          label: 'Gol Deewar',
          locked: false,
          layer: 'walls',
        };
        addElement(newCurveWall);
      } else if (activeTool === 'box') {
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);

        const newBox: BoxElement = {
          id: idPrefix,
          type: 'box',
          x,
          y,
          width,
          height,
          height3d: 120,
          rotation: 0,
          fillColor: 'rgba(56, 189, 248, 0.05)',
          strokeColor: '#38bdf8',
          strokeWidth: 1.5,
          label: 'Kamra',
          locked: false,
          layer: 'furniture',
        };
        addElement(newBox);
      } else if (activeTool === 'circle') {
        const radius = Math.round(distance(start, end));
        const newCircle: CircleElement = {
          id: idPrefix,
          type: 'circle',
          x: start.x,
          y: start.y,
          radius,
          height3d: 120,
          fillColor: 'rgba(168, 85, 247, 0.05)',
          strokeColor: '#a855f7',
          strokeWidth: 1.5,
          label: 'Gol Kamra',
          locked: false,
          layer: 'furniture',
        };
        addElement(newCircle);
      } else if (activeTool === 'dimension') {
        const newDim: DimensionElement = {
          id: idPrefix,
          type: 'dimension',
          start,
          end,
          offset: 16,
          locked: false,
          layer: 'dimensions',
        };
        addElement(newDim);
      } else if (activeTool === 'plot') {
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);

        const newPlot: PlotElement = {
          id: idPrefix,
          type: 'plot',
          x,
          y,
          width,
          height,
          label: 'PLOT BOUNDARY',
          locked: false,
          layer: 'plot',
        };
        addElement(newPlot);
      } else if (activeTool === 'stair') {
        const width = 42; // 3ft 6in default stair width
        const runDist = Math.max(80, Math.round(distance(start, end)));
        const totalHeight = 120; // default 10ft floor height
        const stairCalc = calculateStairParameters(totalHeight, 6.0, 10.0);
        const angle = Math.round((Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI);

        const newStair: StairElement = {
          id: idPrefix,
          type: 'stair',
          x: Math.round(start.x),
          y: Math.round(start.y),
          stairType: 'straight',
          width,
          length: runDist,
          flight2Length: 80,
          landingSize: 42,
          totalHeight,
          targetRiser: 6.0,
          treadDepth: 10.0,
          calculatedRiser: stairCalc.calculatedRiser,
          numSteps: stairCalc.numSteps,
          handrail: true,
          direction: 'up',
          rotation: angle,
          locked: false,
          layer: 'stairs',
          label: 'Seerhiyan (Stairs)',
        };
        addElement(newStair);
      } else if (activeTool === 'road') {
        const newRoad: RoadElement = {
          id: idPrefix,
          type: 'road',
          start: { x: Math.round(start.x), y: Math.round(start.y) },
          end: { x: Math.round(end.x), y: Math.round(end.y) },
          width: 240, // 20ft road default
          hasFootpath: true,
          footpathWidth: 36,
          name: 'Main Street 20ft',
          locked: false,
          layer: 'roads_access',
        };
        addElement(newRoad);
      }
    }

    setIsDrawing(false);
    setDrawStart(null);
    chainFirstNodeRef.current = null;
    chainStartNodeRef.current = null;

    if (activeTool !== 'measure') {
      setActiveTool('select');
    }
  };

  // Double click on canvas: deselect everything and cancel drawing chain
  const handleStageDblClick = (e: any) => {
    if (e.target === stageRef.current) {
      clearSelection();
      setIsDrawing(false);
      setDrawStart(null);
      chainFirstNodeRef.current = null;
      chainStartNodeRef.current = null;
      setActiveTool('select');
    }
  };

  // Group elements into separate categories and respect layer visibility
  const isDimensionsLayerVisible = layers.dimensions?.visible !== false;
  const effectiveShowDimensions = showDimensions && isDimensionsLayerVisible;

  const isLayerVisible = (type: PlanElement['type'], elLayer?: LayerType) => {
    if (type === 'dimension' && !effectiveShowDimensions) return false;
    const lKey = elLayer || getDefaultLayerForType(type);
    return layers[lKey]?.visible !== false;
  };

  const isLayerLocked = (type: PlanElement['type'], elLayer?: LayerType) => {
    const lKey = elLayer || getDefaultLayerForType(type);
    return layers[lKey]?.locked === true;
  };

  const walls: (WallElement | CurveWallElement)[] = [];
  const doors: DoorElement[] = [];
  const windows: WindowElement[] = [];
  const boxes: BoxElement[] = [];
  const circles: CircleElement[] = [];
  const furniture: FurnitureElement[] = [];
  const plots: PlotElement[] = [];
  const dimensionsList: DimensionElement[] = [];
  const texts: TextElement[] = [];
  const stairs: StairElement[] = [];
  const roads: RoadElement[] = [];
  const gates: GateElement[] = [];
  const obstacles: ObstacleElement[] = [];

  project.elements.forEach((el) => {
    if (el.hidden) return;
    if (!isLayerVisible(el.type, el.layer)) return;

    if (el.type === 'wall' || el.type === 'curve_wall') walls.push(el);
    else if (el.type === 'door') doors.push(el);
    else if (el.type === 'window') windows.push(el);
    else if (el.type === 'box') boxes.push(el);
    else if (el.type === 'circle') circles.push(el);
    else if (el.type === 'furniture') furniture.push(el);
    else if (el.type === 'plot') plots.push(el);
    else if (el.type === 'dimension') dimensionsList.push(el);
    else if (el.type === 'text') texts.push(el);
    else if (el.type === 'stair') stairs.push(el);
    else if (el.type === 'road') roads.push(el);
    else if (el.type === 'gate') gates.push(el);
    else if (el.type === 'obstacle') obstacles.push(el);
  });

  const connectedEndpointsMap = getConnectedEndpointsMap(walls, 6);
  const wallJunctions = findWallJunctions(walls, 6);

  const isPanActive = activeTool === 'pan' || isSpacePressed;

  // Live drawing length / area calculations for cursor banner
  let liveDrawingInfo = liveInfo || '';
  if (!liveInfo && isDrawing && drawStart && currentMousePos) {
    const d = distance(drawStart, currentMousePos);
    if (activeTool === 'wall' || activeTool === 'curve_wall' || activeTool === 'dimension') {
      liveDrawingInfo = `L: ${formatLength(d, unitSystem)}`;
    } else if (activeTool === 'box' || activeTool === 'plot') {
      const w = Math.abs(currentMousePos.x - drawStart.x);
      const h = Math.abs(currentMousePos.y - drawStart.y);
      const a = w * h;
      liveDrawingInfo = `${formatLength(w, unitSystem)} × ${formatLength(h, unitSystem)} (${formatAreaWithUnit(a, areaUnit)})`;
    } else if (activeTool === 'circle') {
      liveDrawingInfo = `R: ${formatLength(d, unitSystem)} (${formatAreaWithUnit(Math.PI * d * d, areaUnit)})`;
    }
  }

  // Cursor style determination
  let cursorClass = 'cursor-default';
  if (isPanActive) {
    cursorClass = 'cursor-grab active:cursor-grabbing';
  } else if (activeTool === 'select') {
    cursorClass = 'cursor-default';
  } else {
    cursorClass = 'cursor-crosshair';
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none outline-none ${cursorClass}`}
      style={{ touchAction: 'none' }}
    >
      {/* Top and Left Rulers with Guides */}
      <Ruler
        width={dimensions.width}
        height={dimensions.height}
        zoom={zoom}
        pan={pan}
        unitSystem={unitSystem}
        theme={theme}
        mousePos={currentMousePos}
        guides={project.guides || []}
        onAddGuide={addGuide}
        onRemoveGuide={removeGuide}
      />

      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        scaleX={zoom}
        scaleY={zoom}
        x={pan.x}
        y={pan.y}
        draggable={isPanActive}
        onWheel={handleWheel}
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        onDblClick={handleStageDblClick}
        onDblTap={handleStageDblClick}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            setPan({ x: e.target.x(), y: e.target.y() });
          }
        }}
      >
        {/* Background & CAD Grid */}
        <GridLayer
          width={dimensions.width}
          height={dimensions.height}
          zoom={zoom}
          pan={pan}
          gridSize={gridSize}
          showGrid={showGrid}
          theme={theme}
        />

        {/* Guides Layer */}
        <Layer listening={false}>
          {(project.guides || []).map((guide) => {
            const isHoriz = guide.orientation === 'horizontal';
            const points = isHoriz
              ? [-10000, guide.position, 10000, guide.position]
              : [guide.position, -10000, guide.position, 10000];
            return (
              <Line
                key={guide.id}
                points={points}
                stroke="#38bdf8"
                strokeWidth={1 / zoom}
                dash={[6 / zoom, 6 / zoom]}
                opacity={0.6}
              />
            );
          })}
        </Layer>

        {/* Plot Boundary Layer */}
        <Layer>
          {plots.map((plot) => (
            <PlotRenderer
              key={plot.id}
              element={{
                ...plot,
                locked: plot.locked || isLayerLocked(plot.type, plot.layer),
              }}
              isSelected={selectedIds.includes(plot.id)}
              unitSystem={unitSystem}
              areaUnit={areaUnit}
              theme={theme}
              onSelect={(e) => {
                e.cancelBubble = true;
                selectElement(plot.id, e.evt?.shiftKey);
              }}
              onChange={(patch) => updateElement(plot.id, patch, true)}
            />
          ))}
        </Layer>

        {/* Access Roads & Streets Layer */}
        <Layer>
          {roads.map((road) => (
            <RoadRenderer
              key={road.id}
              road={{
                ...road,
                locked: road.locked || isLayerLocked(road.type, road.layer),
              }}
              isSelected={selectedIds.includes(road.id)}
              unitSystem={unitSystem}
              theme={theme}
              onSelect={(e) => {
                e.cancelBubble = true;
                selectElement(road.id, e.evt?.shiftKey);
              }}
              onChange={(patch) => updateElement(road.id, patch, true)}
            />
          ))}
        </Layer>

        {/* Environmental Obstacles Layer */}
        <Layer>
          {obstacles.map((obs) => (
            <ObstacleRenderer
              key={obs.id}
              obstacle={{
                ...obs,
                locked: obs.locked || isLayerLocked(obs.type, obs.layer),
              }}
              isSelected={selectedIds.includes(obs.id)}
              unitSystem={unitSystem}
              theme={theme}
              onSelect={(e) => {
                e.cancelBubble = true;
                selectElement(obs.id, e.evt?.shiftKey);
              }}
              onChange={(patch) => updateElement(obs.id, patch, true)}
            />
          ))}
        </Layer>

        {/* Room Boxes & Shapes Layer */}
        <Layer>
          {boxes.map((b) => (
            <BoxRenderer
              key={b.id}
              box={{
                ...b,
                locked: b.locked || isLayerLocked(b.type, b.layer),
              }}
              isSelected={selectedIds.includes(b.id)}
              unitSystem={unitSystem}
              theme={theme}
              showDimensions={showDimensions}
              onSelect={(e) => {
                e.cancelBubble = true;
                selectElement(b.id, e.evt?.shiftKey);
              }}
              onChange={(patch) => updateElement(b.id, patch, true)}
            />
          ))}

          {circles.map((c) => (
            <CircleRenderer
              key={c.id}
              circle={{
                ...c,
                locked: c.locked || isLayerLocked(c.type, c.layer),
              }}
              isSelected={selectedIds.includes(c.id)}
              unitSystem={unitSystem}
              theme={theme}
              showDimensions={showDimensions}
              onSelect={(e) => {
                e.cancelBubble = true;
                selectElement(c.id, e.evt?.shiftKey);
              }}
              onChange={(patch) => updateElement(c.id, patch, true)}
            />
          ))}
        </Layer>

        {/* Furniture & Fixtures Layer */}
        <Layer>
          {furniture.map((f) => (
            <FurnitureRenderer
              key={f.id}
              element={{
                ...f,
                locked: f.locked || isLayerLocked(f.type, f.layer),
              }}
              isSelected={selectedIds.includes(f.id)}
              unitSystem={unitSystem}
              theme={theme}
              onSelect={(e) => {
                e.cancelBubble = true;
                selectElement(f.id, e.evt?.shiftKey);
              }}
              onChange={(patch) => updateElement(f.id, patch, true)}
            />
          ))}
        </Layer>

        {/* Parametric Stairs Layer */}
        <Layer>
          {stairs.map((stair) => (
            <StairRenderer
              key={stair.id}
              element={{
                ...stair,
                locked: stair.locked || isLayerLocked(stair.type, stair.layer),
              }}
              isSelected={selectedIds.includes(stair.id)}
              unitSystem={unitSystem}
              theme={theme}
              showDimensions={showDimensions}
              onSelect={(e) => {
                e.cancelBubble = true;
                selectElement(stair.id, e.evt?.shiftKey);
              }}
              onChange={(patch) => updateElement(stair.id, patch, true)}
            />
          ))}
        </Layer>

        {/* Architectural Walls Layer */}
        <Layer>
          {walls.map((w) => {
            const attachedDoors = doors.filter((d) => d.wallId === w.id);
            const attachedWindows = windows.filter((win) => win.wallId === w.id);
            const conn = connectedEndpointsMap.get(w.id);

            return (
              <WallRenderer
                key={w.id}
                wall={{
                  ...w,
                  locked: w.locked || isLayerLocked(w.type, w.layer),
                }}
                doors={attachedDoors}
                windows={attachedWindows}
                isSelected={selectedIds.includes(w.id)}
                isStartConnected={conn?.start}
                isEndConnected={conn?.end}
                unitSystem={unitSystem}
                theme={theme}
                showDimensions={effectiveShowDimensions}
                onSelect={(e) => {
                  e.cancelBubble = true;
                  selectElement(w.id, e.evt?.shiftKey);
                }}
                onBulgeChange={(newBulge) => {
                  updateElement(w.id, { bulge: newBulge } as Partial<CurveWallElement>, true);
                }}
                onLiveInfo={setLiveInfo}
                onDimensionOffsetChange={(newOffset) => {
                  updateElement(w.id, { dimensionOffset: newOffset }, true);
                }}
                onMoveDelta={(dx, dy) => {
                  if (selectedIds.length > 1 && selectedIds.includes(w.id)) {
                    const patches: { id: string; patch: any }[] = [];
                    selectedIds.forEach((id) => {
                      const el = project.elements.find((e) => e.id === id);
                      if (!el || el.locked) return;
                      if (el.type === 'wall' || el.type === 'curve_wall') {
                        const wallEl = el as WallElement;
                        patches.push({
                          id,
                          patch: {
                            start: { x: wallEl.start.x + dx, y: wallEl.start.y + dy },
                            end: { x: wallEl.end.x + dx, y: wallEl.end.y + dy },
                          },
                        });
                      } else if ('x' in el && 'y' in el) {
                        patches.push({
                          id,
                          patch: {
                            x: (el as any).x + dx,
                            y: (el as any).y + dy,
                          },
                        });
                      }
                    });
                    if (patches.length > 0) {
                      updateElements(patches, true);
                    }
                  } else {
                    updateElement(
                      w.id,
                      {
                        start: { x: w.start.x + dx, y: w.start.y + dy },
                        end: { x: w.end.x + dx, y: w.end.y + dy },
                      },
                      true
                    );
                  }
                }}
              />
            );
          })}

          {/* Seamless Architectural Wall Corner and T-Junctions */}
          <WallJunctionRenderer
            junctions={wallJunctions}
            selectedIds={selectedIds}
            theme={theme}
          />
        </Layer>

        {/* Openings (Doors & Windows) Layer */}
        <Layer>
          {doors.map((d) => {
            const hostWall = walls.find((w) => w.id === d.wallId);
            if (!hostWall) return null;
            return (
              <DoorRenderer
                key={d.id}
                door={{
                  ...d,
                  locked: d.locked || isLayerLocked(d.type, d.layer),
                }}
                wall={hostWall}
                isSelected={selectedIds.includes(d.id)}
                unitSystem={unitSystem}
                theme={theme}
                showDimensions={effectiveShowDimensions}
                onSelect={(e) => {
                  e.cancelBubble = true;
                  selectElement(d.id, e.evt?.shiftKey);
                }}
                onOffsetChange={(newOffset) => {
                  updateElement(d.id, { offset: newOffset }, true);
                }}
                onLiveInfo={setLiveInfo}
              />
            );
          })}

          {windows.map((win) => {
            const hostWall = walls.find((w) => w.id === win.wallId);
            if (!hostWall) return null;
            return (
              <WindowRenderer
                key={win.id}
                windowElem={{
                  ...win,
                  locked: win.locked || isLayerLocked(win.type, win.layer),
                }}
                wall={hostWall}
                isSelected={selectedIds.includes(win.id)}
                unitSystem={unitSystem}
                theme={theme}
                showDimensions={effectiveShowDimensions}
                onSelect={(e) => {
                  e.cancelBubble = true;
                  selectElement(win.id, e.evt?.shiftKey);
                }}
                onOffsetChange={(newOffset) => {
                  updateElement(win.id, { offset: newOffset }, true);
                }}
                onLiveInfo={setLiveInfo}
              />
            );
          })}

          {gates.map((g) => {
            const hostWall = walls.find((w) => w.id === g.wallId);
            if (!hostWall) return null;
            return (
              <GateRenderer
                key={g.id}
                gate={{
                  ...g,
                  locked: g.locked || isLayerLocked(g.type, g.layer),
                }}
                wall={hostWall}
                isSelected={selectedIds.includes(g.id)}
                unitSystem={unitSystem}
                theme={theme}
                showDimensions={effectiveShowDimensions}
                onSelect={(e) => {
                  e.cancelBubble = true;
                  selectElement(g.id, e.evt?.shiftKey);
                }}
                onOffsetChange={(newOffset) => {
                  updateElement(g.id, { offset: newOffset }, true);
                }}
                onLiveInfo={setLiveInfo}
              />
            );
          })}
        </Layer>

        {/* Auto-detected Closed Room Badges Layer */}
        <Layer>
          {detectedRooms.map((room) => (
            <DetectedRoomBadge
              key={room.id}
              room={room}
              unitSystem={unitSystem}
              areaUnit={areaUnit}
              theme={theme}
              onRename={updateDetectedRoomName}
            />
          ))}
        </Layer>

        {/* Permanent Dimensions Layer */}
        {effectiveShowDimensions && (
          <Layer>
            {dimensionsList.map((dim) => (
              <DimensionRenderer
                key={dim.id}
                element={{
                  ...dim,
                  locked: dim.locked || isLayerLocked(dim.type, dim.layer),
                }}
                isSelected={selectedIds.includes(dim.id)}
                unitSystem={unitSystem}
                theme={theme}
                onSelect={(e) => {
                  e.cancelBubble = true;
                  selectElement(dim.id, e.evt?.shiftKey);
                }}
                onChange={(patch) => updateElement(dim.id, patch, true)}
              />
            ))}
          </Layer>
        )}

        {/* Text Labels & Notes Layer */}
        <Layer>
          {texts.map((tItem) => (
            <TextRenderer
              key={tItem.id}
              element={{
                ...tItem,
                locked: tItem.locked || isLayerLocked(tItem.type, tItem.layer),
              }}
              isSelected={selectedIds.includes(tItem.id)}
              theme={theme}
              onSelect={(e) => {
                e.cancelBubble = true;
                selectElement(tItem.id, e.evt?.shiftKey);
              }}
              onChange={(patch) => updateElement(tItem.id, patch, true)}
            />
          ))}
        </Layer>

        {/* Marquee Selection Box */}
        {marqueeStart && marqueeCurrent && (
          <Layer listening={false}>
            <Rect
              x={Math.min(marqueeStart.x, marqueeCurrent.x)}
              y={Math.min(marqueeStart.y, marqueeCurrent.y)}
              width={Math.abs(marqueeCurrent.x - marqueeStart.x)}
              height={Math.abs(marqueeCurrent.y - marqueeStart.y)}
              fill="rgba(56, 189, 248, 0.12)"
              stroke="#38bdf8"
              strokeWidth={1 / zoom}
              dash={[4 / zoom, 4 / zoom]}
            />
          </Layer>
        )}

        {/* Active Vehicle Entry Check Simulation Layer */}
        {(() => {
          const activeVehicleCheckSession =
            project.vehicleChecks?.find((c) => c.id === activeVehicleCheckId) ||
            (isVehicleCheckOpen || activeTool === 'vehicle_check' ? project.vehicleChecks?.[0] : null);

          if (!activeVehicleCheckSession) return null;

          return (
            <Layer>
              <VehicleCheckRenderer
                session={activeVehicleCheckSession}
                unitSystem={unitSystem}
                theme={theme}
                playbackProgress={vehicleCheckPlaybackProgress}
                manualPose={manualDrivePose}
                onWaypointDrag={(idx, newPos) => {
                  const wps = [...activeVehicleCheckSession.waypoints];
                  wps[idx] = { ...wps[idx], x: newPos.x, y: newPos.y };
                  updateActiveVehicleCheck({ waypoints: wps });
                }}
                onManualDriveMove={setManualDrivePose}
              />
            </Layer>
          );
        })()}

        {/* Selection Transformer (Corner/edge resize handles, rotation handle) */}
        <Layer>
          <SelectionTransformer
            stageRef={stageRef}
            onLiveTransform={setLiveInfo}
          />
        </Layer>

        {/* Drawing Preview Layer */}
        <Layer listening={false}>
          <DrawingPreview
            tool={activeTool}
            startPoint={drawStart}
            currentPoint={currentMousePos}
            unitSystem={unitSystem}
            theme={theme}
            snapGuide={snapGuidePoint}
          />
        </Layer>
      </Stage>

      {/* Live Measurement Chip next to drawing / resize cursor */}
      {liveDrawingInfo && currentMousePos && (
        <div
          className="absolute z-30 pointer-events-none px-2.5 py-1 rounded-lg bg-slate-900/90 border border-sky-500/50 text-sky-300 font-mono text-[11px] font-bold shadow-xl backdrop-blur-sm"
          style={{
            left: `${Math.min(dimensions.width - 150, Math.max(20, pan.x + currentMousePos.x * zoom + 18))}px`,
            top: `${Math.min(dimensions.height - 40, Math.max(20, pan.y + currentMousePos.y * zoom + 18))}px`,
          }}
        >
          {liveDrawingInfo}
        </div>
      )}

      {/* Tool Hint Bar at bottom */}
      <div className="absolute bottom-2 left-6 z-20 pointer-events-none hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/80 text-slate-300 text-[11px] shadow-lg backdrop-blur-sm">
        <span className="font-semibold text-sky-400 capitalize">{activeTool}:</span>
        <span>
          {activeTool === 'select' && 'Click element to select, drag to move, drag handles to resize, Delete to remove'}
          {activeTool === 'wall' && 'Click & drag or click to start, next wall chains automatically, Esc stops'}
          {activeTool === 'door' && 'Click near a wall to place architectural door with swing arc'}
          {activeTool === 'window' && 'Click near a wall to attach architectural window'}
          {activeTool === 'box' && 'Click & drag to draw rectangular room, resize with handles'}
          {activeTool === 'circle' && 'Click & drag from center to draw circular room'}
          {activeTool === 'dimension' && 'Click & drag two points for permanent CAD measurement'}
          {activeTool === 'pan' && 'Click & drag canvas to pan, scroll wheel to zoom'}
          {activeTool === 'text' && 'Click anywhere to place note, double click to edit text'}
          {activeTool === 'plot' && 'Click & drag to mark plot boundary'}
          {activeTool === 'measure' && 'Click two points to measure temporary tape distance'}
          {activeTool === 'stair' && 'Click & drag to place stairs, change flight/riser in properties panel'}
          {activeTool === 'road' && 'Click & drag two points outside plot to lay access street'}
          {activeTool === 'gate' && 'Click near a boundary wall to place entrance gate'}
          {activeTool === 'obstacle' && 'Click outside or inside plot to place pole, tree, wire, or neighbor wall'}
          {activeTool === 'vehicle_check' && 'Click on street to plot vehicle approach path to gate, or click Auto Path'}
        </span>
      </div>

      {/* Scale Bar (e.g. "10 ft" that updates with zoom) */}
      <ScaleBar zoom={zoom} unitSystem={unitSystem} theme={theme} />

      {/* Minimap for large plans in bottom-right corner */}
      <Minimap
        elements={project.elements}
        zoom={zoom}
        pan={pan}
        viewportWidth={dimensions.width}
        viewportHeight={dimensions.height}
        theme={theme}
        onPanTo={setPan}
      />
    </div>
  );
};
