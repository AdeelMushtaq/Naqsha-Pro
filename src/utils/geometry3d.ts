/**
 * 3D Geometry generation utilities for Naqsha CAD.
 * Pure mathematical functions for extrusions, wall openings (lintels, sills, and interstitial segments),
 * floor stacking elevations, and parametric furniture geometry.
 * Single source of truth is 2D plan in INCHES.
 */

import {
  WallElement,
  CurveWallElement,
  DoorElement,
  WindowElement,
  Floor,
  Point2D,
} from '../models/types';
import { getWallLength, distance, getWallNormal, getCurveWallArc } from './geometry';

export interface WallSegment3D {
  type: 'solid' | 'sill' | 'lintel';
  startOffset: number;
  endOffset: number;
  bottomElevation: number; // inches from floor slab
  topElevation: number; // inches from floor slab
  thickness: number;
}

export interface Wall3DOpeningsResult {
  segments: WallSegment3D[];
  windowFrames: {
    offset: number;
    width: number;
    sillHeight: number;
    height: number;
    depth: number;
  }[];
  doorPanels: {
    offset: number;
    width: number;
    height: number;
    thickness: number;
    isOpen: boolean;
  }[];
}

/**
 * Splits a straight or curved wall into solid 3D segments around door and window openings.
 * Avoids heavy CSG booleans for extreme speed and robustness.
 */
export function buildWall3DOpenings(
  wall: WallElement | CurveWallElement,
  doors: DoorElement[],
  windows: WindowElement[],
  defaultWallHeight: number = 120
): Wall3DOpeningsResult {
  const wallLen =
    wall.type === 'wall' ? getWallLength(wall) : getCurveWallArc(wall).length;
  const wallHeight = wall.height || defaultWallHeight;
  const thickness = wall.thickness || 9;

  interface OpeningEntry {
    type: 'door' | 'window';
    id: string;
    start: number;
    end: number;
    width: number;
    sillHeight: number;
    height: number;
    rawElement: DoorElement | WindowElement;
  }

  const openings: OpeningEntry[] = [];

  for (const d of doors) {
    if (d.wallId === wall.id) {
      const dHeight = d.height || 84;
      const dWidth = d.width || 36;
      const sill = d.sillHeight || 0;
      openings.push({
        type: 'door',
        id: d.id,
        start: d.offset,
        end: Math.min(wallLen, d.offset + dWidth),
        width: dWidth,
        sillHeight: sill,
        height: dHeight,
        rawElement: d,
      });
    }
  }

  for (const w of windows) {
    if (w.wallId === wall.id) {
      const wHeight = w.height || 48;
      const wWidth = w.width || 48;
      const sill = w.sillHeight !== undefined ? w.sillHeight : 36;
      openings.push({
        type: 'window',
        id: w.id,
        start: w.offset,
        end: Math.min(wallLen, w.offset + wWidth),
        width: wWidth,
        sillHeight: sill,
        height: wHeight,
        rawElement: w,
      });
    }
  }

  // Sort openings along wall length
  openings.sort((a, b) => a.start - b.start);

  const segments: WallSegment3D[] = [];
  const windowFrames: Wall3DOpeningsResult['windowFrames'] = [];
  const doorPanels: Wall3DOpeningsResult['doorPanels'] = [];

  let currentOffset = 0;

  for (const op of openings) {
    // 1. Full height solid segment before opening
    if (op.start > currentOffset + 0.5) {
      segments.push({
        type: 'solid',
        startOffset: currentOffset,
        endOffset: op.start,
        bottomElevation: 0,
        topElevation: wallHeight,
        thickness,
      });
    }

    // 2. Sill segment (under window)
    if (op.type === 'window' && op.sillHeight > 0) {
      segments.push({
        type: 'sill',
        startOffset: op.start,
        endOffset: op.end,
        bottomElevation: 0,
        topElevation: op.sillHeight,
        thickness,
      });
    }

    // 3. Lintel segment (above opening)
    const openingTop = op.sillHeight + op.height;
    if (openingTop < wallHeight) {
      segments.push({
        type: 'lintel',
        startOffset: op.start,
        endOffset: op.end,
        bottomElevation: openingTop,
        topElevation: wallHeight,
        thickness,
      });
    }

    // 4. Record window frame / glass pane
    if (op.type === 'window') {
      const wElem = op.rawElement as WindowElement;
      windowFrames.push({
        offset: op.start,
        width: op.width,
        sillHeight: op.sillHeight,
        height: op.height,
        depth: wElem.depth || thickness,
      });
    }

    // 5. Record door panel
    if (op.type === 'door') {
      const dElem = op.rawElement as DoorElement;
      doorPanels.push({
        offset: op.start,
        width: op.width,
        height: op.height,
        thickness: 1.75, // 1-3/4 inch standard architectural solid door
        isOpen: dElem.isOpen || false,
      });
    }

    currentOffset = Math.max(currentOffset, op.end);
  }

  // 6. Remaining full height solid wall segment after last opening
  if (currentOffset < wallLen - 0.5) {
    segments.push({
      type: 'solid',
      startOffset: currentOffset,
      endOffset: wallLen,
      bottomElevation: 0,
      topElevation: wallHeight,
      thickness,
    });
  }

  return {
    segments,
    windowFrames,
    doorPanels,
  };
}

/**
 * Calculates floor elevation and vertical offset based on level and view mode (all, single, explode).
 */
export function calculateFloorElevation(
  floors: Floor[],
  floorId: string,
  viewMode: 'all' | 'active' | 'explode' = 'all',
  activeFloorId?: string,
  explodeDistance: number = 60 // 5 ft vertical gap in explode view
): { elevation: number; isVisible: boolean } {
  const floorIndex = floors.findIndex((f) => f.id === floorId);
  if (floorIndex === -1) return { elevation: 0, isVisible: true };

  const floor = floors[floorIndex];
  const baseElev = floor.baseElevation !== undefined ? floor.baseElevation : floor.level * 120;

  if (viewMode === 'active') {
    const isTarget = floor.id === (activeFloorId || floors[0]?.id);
    return {
      elevation: 0,
      isVisible: isTarget,
    };
  }

  if (viewMode === 'explode') {
    return {
      elevation: baseElev + floorIndex * explodeDistance,
      isVisible: true,
    };
  }

  // 'all' mode: normal stacked floors
  return {
    elevation: baseElev,
    isVisible: true,
  };
}

/**
 * Converts inches to 3D world units (1 inch = 0.0254 meters).
 * Using 1 inch = 1 unit or metric conversion for scale consistency.
 * In our CAD Three.js scene, we can use 1 unit = 1 inch for exact 1:1 precision,
 * or 1 unit = 1 foot (1/12). 1 unit = 1 inch keeps all coordinates integers and avoids float precision issues.
 */
export const INCH_TO_3D = 1; // 1 unit = 1 inch
