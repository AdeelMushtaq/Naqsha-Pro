/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pure mathematical functions for splitting, joining, and merging walls,
 * curved walls, and roads in Naqsha CAD.
 * Strict TypeScript, zero 'any'. All units in INCHES.
 */

import {
  Point2D,
  WallElement,
  CurveWallElement,
  DoorElement,
  WindowElement,
  RoadElement,
  WallNode,
  PlanElement,
} from '../models/types';
import {
  distance,
  projectPointOntoSegment,
  clampOffset,
  getWallNormal,
  getCurveWallArc,
} from './geometry';

export type TJunctionMode = 'join' | 'split' | 'cross';

export interface WallSplitResult {
  firstWall: WallElement | CurveWallElement;
  secondWall: WallElement | CurveWallElement;
  splitNode: WallNode;
  reassignedDoors: DoorElement[];
  reassignedWindows: WindowElement[];
}

export interface RoadSplitResult {
  firstRoad: RoadElement;
  secondRoad: RoadElement;
  splitPoint: Point2D;
}

export interface JoinWallResult {
  success: boolean;
  reason?: 'not_connected' | 'not_collinear' | 'third_wall_attached' | 'different_properties' | 'locked';
  mergedWall?: WallElement;
  removedWallId?: string;
  reassignedDoors?: DoorElement[];
  reassignedWindows?: WindowElement[];
  remainingNodes?: WallNode[];
  removedNodeId?: string;
}

export interface JoinRoadResult {
  success: boolean;
  reason?: 'not_connected' | 'not_collinear' | 'different_properties' | 'locked';
  mergedRoad?: RoadElement;
  removedRoadId?: string;
}

export interface CrossingSplitResult {
  walls: WallElement[];
  splitNode: WallNode;
  reassignedDoors: DoorElement[];
  reassignedWindows: WindowElement[];
}

/**
 * Splits a straight or curved wall at a given point, reassigning doors and windows
 * to the correct half with clamped offsets.
 */
export function splitWallAtPoint(
  wall: WallElement | CurveWallElement,
  splitPoint: Point2D,
  splitNodeId: string,
  doors: DoorElement[],
  windows: WindowElement[]
): WallSplitResult {
  const timestamp = Date.now().toString(36);
  const firstWallId = wall.id;
  const secondWallId = `${wall.id}-split-${timestamp}-${Math.random().toString(36).slice(2, 6)}`;

  if (wall.type === 'curve_wall') {
    return splitCurvedWall(wall, splitPoint, splitNodeId, firstWallId, secondWallId, doors, windows);
  }

  // Straight wall splitting
  const proj = projectPointOntoSegment(splitPoint, wall.start, wall.end);
  const splitOffset = proj.offset;

  const splitNode: WallNode = {
    id: splitNodeId,
    x: Math.round(proj.point.x * 10) / 10,
    y: Math.round(proj.point.y * 10) / 10,
  };

  const firstWall: WallElement = {
    ...wall,
    id: firstWallId,
    start: { ...wall.start },
    end: { x: splitNode.x, y: splitNode.y },
    startNodeId: wall.startNodeId,
    endNodeId: splitNode.id,
  };

  const secondWall: WallElement = {
    ...wall,
    id: secondWallId,
    start: { x: splitNode.x, y: splitNode.y },
    end: { ...wall.end },
    startNodeId: splitNode.id,
    endNodeId: wall.endNodeId,
  };

  const firstLen = distance(firstWall.start, firstWall.end);
  const secondLen = distance(secondWall.start, secondWall.end);

  const reassignedDoors = doors.map((d) => {
    if (d.wallId !== wall.id) return d;
    const center = d.offset + d.width / 2;
    if (center < splitOffset) {
      return {
        ...d,
        wallId: firstWallId,
        offset: clampOffset(d.offset, d.width, firstLen),
      };
    } else {
      const newOffset = d.offset - splitOffset;
      return {
        ...d,
        wallId: secondWallId,
        offset: clampOffset(newOffset, d.width, secondLen),
      };
    }
  });

  const reassignedWindows = windows.map((w) => {
    if (w.wallId !== wall.id) return w;
    const center = w.offset + w.width / 2;
    if (center < splitOffset) {
      return {
        ...w,
        wallId: firstWallId,
        offset: clampOffset(w.offset, w.width, firstLen),
      };
    } else {
      const newOffset = w.offset - splitOffset;
      return {
        ...w,
        wallId: secondWallId,
        offset: clampOffset(newOffset, w.width, secondLen),
      };
    }
  });

  return {
    firstWall,
    secondWall,
    splitNode,
    reassignedDoors,
    reassignedWindows,
  };
}

/**
 * Helper to split a curved wall into two curved walls with correct sub-arc bulges.
 */
function splitCurvedWall(
  wall: CurveWallElement,
  splitPoint: Point2D,
  splitNodeId: string,
  firstWallId: string,
  secondWallId: string,
  doors: DoorElement[],
  windows: WindowElement[]
): WallSplitResult {
  const arc = getCurveWallArc(wall);
  const R = arc.radius;
  const isStraight = Math.abs(wall.bulge) < 0.001 || R < 0.1;

  if (isStraight) {
    // Degenerate curve behaves like straight wall
    const straightWall: WallElement = { ...wall, type: 'wall' };
    const res = splitWallAtPoint(straightWall, splitPoint, splitNodeId, doors, windows);
    return {
      firstWall: { ...res.firstWall, type: 'curve_wall', bulge: 0 },
      secondWall: { ...res.secondWall, type: 'curve_wall', bulge: 0 },
      splitNode: res.splitNode,
      reassignedDoors: res.reassignedDoors,
      reassignedWindows: res.reassignedWindows,
    };
  }

  // Project splitPoint onto the circle
  const angleToSplit = Math.atan2(splitPoint.y - arc.center.y, splitPoint.x - arc.center.x);
  const projPointOnCircle: Point2D = {
    x: Math.round((arc.center.x + Math.cos(angleToSplit) * R) * 10) / 10,
    y: Math.round((arc.center.y + Math.sin(angleToSplit) * R) * 10) / 10,
  };

  const splitNode: WallNode = {
    id: splitNodeId,
    x: projPointOnCircle.x,
    y: projPointOnCircle.y,
  };

  // Compute sub-arc bulges:
  // Chord length L_sub and circle radius R give bulge: |b| = R - sqrt(max(0, R^2 - (L_sub/2)^2))
  const chord1 = distance(wall.start, projPointOnCircle);
  const chord2 = distance(projPointOnCircle, wall.end);

  const sign = Math.sign(wall.bulge) || 1;
  const halfChord1 = chord1 / 2;
  const halfChord2 = chord2 / 2;

  const bulge1Mag = halfChord1 < R ? R - Math.sqrt(Math.max(0, R * R - halfChord1 * halfChord1)) : wall.bulge / 2;
  const bulge2Mag = halfChord2 < R ? R - Math.sqrt(Math.max(0, R * R - halfChord2 * halfChord2)) : wall.bulge / 2;

  const bulge1 = Math.round(bulge1Mag * sign * 10) / 10;
  const bulge2 = Math.round(bulge2Mag * sign * 10) / 10;

  const firstWall: CurveWallElement = {
    ...wall,
    id: firstWallId,
    start: { ...wall.start },
    end: { ...projPointOnCircle },
    bulge: bulge1,
    startNodeId: wall.startNodeId,
    endNodeId: splitNode.id,
  };

  const secondWall: CurveWallElement = {
    ...wall,
    id: secondWallId,
    start: { ...projPointOnCircle },
    end: { ...wall.end },
    bulge: bulge2,
    startNodeId: splitNode.id,
    endNodeId: wall.endNodeId,
  };

  // Reassign doors and windows along the arc length
  const arc1 = getCurveWallArc(firstWall);
  const arc2 = getCurveWallArc(secondWall);
  const splitOffset = arc1.length;

  const reassignedDoors = doors.map((d) => {
    if (d.wallId !== wall.id) return d;
    const center = d.offset + d.width / 2;
    if (center < splitOffset) {
      return {
        ...d,
        wallId: firstWallId,
        offset: clampOffset(d.offset, d.width, arc1.length),
      };
    } else {
      const newOffset = d.offset - splitOffset;
      return {
        ...d,
        wallId: secondWallId,
        offset: clampOffset(newOffset, d.width, arc2.length),
      };
    }
  });

  const reassignedWindows = windows.map((w) => {
    if (w.wallId !== wall.id) return w;
    const center = w.offset + w.width / 2;
    if (center < splitOffset) {
      return {
        ...w,
        wallId: firstWallId,
        offset: clampOffset(w.offset, w.width, arc1.length),
      };
    } else {
      const newOffset = w.offset - splitOffset;
      return {
        ...w,
        wallId: secondWallId,
        offset: clampOffset(newOffset, w.width, arc2.length),
      };
    }
  });

  return {
    firstWall,
    secondWall,
    splitNode,
    reassignedDoors,
    reassignedWindows,
  };
}

/**
 * Splits a road element at a given point into two collinear segments.
 */
export function splitRoadAtPoint(road: RoadElement, splitPoint: Point2D): RoadSplitResult {
  const proj = projectPointOntoSegment(splitPoint, road.start, road.end);
  const p: Point2D = {
    x: Math.round(proj.point.x * 10) / 10,
    y: Math.round(proj.point.y * 10) / 10,
  };

  const timestamp = Date.now().toString(36);
  const firstRoad: RoadElement = {
    ...road,
    id: road.id,
    start: { ...road.start },
    end: { ...p },
  };

  const secondRoad: RoadElement = {
    ...road,
    id: `${road.id}-split-${timestamp}-${Math.random().toString(36).slice(2, 6)}`,
    start: { ...p },
    end: { ...road.end },
  };

  return {
    firstRoad,
    secondRoad,
    splitPoint: p,
  };
}

/**
 * Determines whether two walls can be joined.
 * Refuses if:
 * - either wall is locked
 * - walls do not meet at an endpoint
 * - walls are not collinear
 * - walls have different thickness
 * - a third wall is connected at the shared joint (Crucial safety invariant)
 */
export function canJoinWalls(
  wall1: WallElement,
  wall2: WallElement,
  allWalls: (WallElement | CurveWallElement)[]
): {
  canJoin: boolean;
  reason?: 'not_connected' | 'not_collinear' | 'third_wall_attached' | 'different_properties' | 'locked';
  meetPt?: Point2D;
  meetNodeId?: string;
  meetType?: 'w1end_w2start' | 'w1end_w2end' | 'w1start_w2start' | 'w1start_w2end';
} {
  if (wall1.locked || wall2.locked) {
    return { canJoin: false, reason: 'locked' };
  }

  if (Math.abs((wall1.thickness || 9) - (wall2.thickness || 9)) > 0.1) {
    return { canJoin: false, reason: 'different_properties' };
  }

  const tol = 6; // inches
  let meetType: 'w1end_w2start' | 'w1end_w2end' | 'w1start_w2start' | 'w1start_w2end' | undefined;
  let meetPt: Point2D | undefined;
  let meetNodeId: string | undefined;

  if ((wall1.endNodeId && wall1.endNodeId === wall2.startNodeId) || distance(wall1.end, wall2.start) <= tol) {
    meetType = 'w1end_w2start';
    meetPt = wall1.end;
    meetNodeId = wall1.endNodeId || wall2.startNodeId;
  } else if ((wall1.endNodeId && wall1.endNodeId === wall2.endNodeId) || distance(wall1.end, wall2.end) <= tol) {
    meetType = 'w1end_w2end';
    meetPt = wall1.end;
    meetNodeId = wall1.endNodeId || wall2.endNodeId;
  } else if ((wall1.startNodeId && wall1.startNodeId === wall2.startNodeId) || distance(wall1.start, wall2.start) <= tol) {
    meetType = 'w1start_w2start';
    meetPt = wall1.start;
    meetNodeId = wall1.startNodeId || wall2.startNodeId;
  } else if ((wall1.startNodeId && wall1.startNodeId === wall2.endNodeId) || distance(wall1.start, wall2.end) <= tol) {
    meetType = 'w1start_w2end';
    meetPt = wall1.start;
    meetNodeId = wall1.startNodeId || wall2.endNodeId;
  }

  if (!meetType || !meetPt) {
    return { canJoin: false, reason: 'not_connected' };
  }

  // Check if a 3rd wall is connected at this joint
  for (const other of allWalls) {
    if (other.id === wall1.id || other.id === wall2.id) continue;
    const touchesByNode = meetNodeId && (other.startNodeId === meetNodeId || other.endNodeId === meetNodeId);
    const touchesByDist = distance(other.start, meetPt) <= tol || distance(other.end, meetPt) <= tol;
    if (touchesByNode || touchesByDist) {
      return { canJoin: false, reason: 'third_wall_attached', meetPt, meetNodeId, meetType };
    }
  }

  // Check collinearity
  const len1 = distance(wall1.start, wall1.end);
  const len2 = distance(wall2.start, wall2.end);
  if (len1 < 1 || len2 < 1) {
    return { canJoin: false, reason: 'not_collinear' };
  }

  const v1 = { x: (wall1.end.x - wall1.start.x) / len1, y: (wall1.end.y - wall1.start.y) / len1 };
  const v2 = { x: (wall2.end.x - wall2.start.x) / len2, y: (wall2.end.y - wall2.start.y) / len2 };

  let dir1 = v1;
  let dir2 = v2;
  if (meetType === 'w1end_w2end') {
    dir2 = { x: -v2.x, y: -v2.y };
  } else if (meetType === 'w1start_w2start') {
    dir1 = { x: -v1.x, y: -v1.y };
  } else if (meetType === 'w1start_w2end') {
    dir1 = { x: -v1.x, y: -v1.y };
    dir2 = { x: -v2.x, y: -v2.y };
  }

  const cross = Math.abs(dir1.x * dir2.y - dir1.y * dir2.x);
  const dot = dir1.x * dir2.x + dir1.y * dir2.y;

  if (cross > 0.08 || dot < 0.92) {
    return { canJoin: false, reason: 'not_collinear', meetPt, meetNodeId, meetType };
  }

  return { canJoin: true, meetPt, meetNodeId, meetType };
}

/**
 * Merges two connected collinear walls into a single continuous wall,
 * preserving physical placement of doors and windows by re-projecting them.
 */
export function joinCollinearWalls(
  wall1: WallElement,
  wall2: WallElement,
  allWalls: (WallElement | CurveWallElement)[],
  allDoors: DoorElement[],
  allWindows: WindowElement[],
  allNodes: WallNode[] = []
): JoinWallResult {
  const check = canJoinWalls(wall1, wall2, allWalls);
  if (!check.canJoin || !check.meetType) {
    return { success: false, reason: check.reason };
  }

  const { meetType, meetNodeId } = check;

  let newStart: Point2D;
  let newEnd: Point2D;
  let newStartNodeId = wall1.startNodeId;
  let newEndNodeId = wall2.endNodeId;

  if (meetType === 'w1end_w2start') {
    newStart = { ...wall1.start };
    newEnd = { ...wall2.end };
    newStartNodeId = wall1.startNodeId;
    newEndNodeId = wall2.endNodeId;
  } else if (meetType === 'w1end_w2end') {
    newStart = { ...wall1.start };
    newEnd = { ...wall2.start };
    newStartNodeId = wall1.startNodeId;
    newEndNodeId = wall2.startNodeId;
  } else if (meetType === 'w1start_w2start') {
    newStart = { ...wall1.end };
    newEnd = { ...wall2.end };
    newStartNodeId = wall1.endNodeId;
    newEndNodeId = wall2.endNodeId;
  } else {
    newStart = { ...wall2.start };
    newEnd = { ...wall1.end };
    newStartNodeId = wall2.startNodeId;
    newEndNodeId = wall1.endNodeId;
  }

  const mergedLen = distance(newStart, newEnd);
  const mergedWall: WallElement = {
    ...wall1,
    id: wall1.id,
    start: newStart,
    end: newEnd,
    startNodeId: newStartNodeId,
    endNodeId: newEndNodeId,
  };

  // Re-project doors and windows from old host walls to merged wall
  const reprojectItem = <T extends DoorElement | WindowElement>(item: T, oldHost: WallElement): T => {
    const oldLen = distance(oldHost.start, oldHost.end);
    const t = oldLen > 0 ? (item.offset + item.width / 2) / oldLen : 0.5;
    const centerPos: Point2D = {
      x: oldHost.start.x + (oldHost.end.x - oldHost.start.x) * t,
      y: oldHost.start.y + (oldHost.end.y - oldHost.start.y) * t,
    };
    const proj = projectPointOntoSegment(centerPos, newStart, newEnd);
    const newOffset = clampOffset(proj.offset - item.width / 2, item.width, mergedLen);
    return { ...item, wallId: wall1.id, offset: newOffset };
  };

  const reassignedDoors = allDoors.map((d) => {
    if (d.wallId === wall1.id) return reprojectItem(d, wall1);
    if (d.wallId === wall2.id) return reprojectItem(d, wall2);
    return d;
  });

  const reassignedWindows = allWindows.map((w) => {
    if (w.wallId === wall1.id) return reprojectItem(w, wall1);
    if (w.wallId === wall2.id) return reprojectItem(w, wall2);
    return w;
  });

  // Remove the middle junction node only if no other wall uses it
  let remainingNodes = [...allNodes];
  if (meetNodeId) {
    const isNodeUsedByOther = allWalls.some(
      (w) => w.id !== wall1.id && w.id !== wall2.id && (w.startNodeId === meetNodeId || w.endNodeId === meetNodeId)
    );
    if (!isNodeUsedByOther) {
      remainingNodes = remainingNodes.filter((n) => n.id !== meetNodeId);
    }
  }

  return {
    success: true,
    mergedWall,
    removedWallId: wall2.id,
    reassignedDoors,
    reassignedWindows,
    remainingNodes,
    removedNodeId: meetNodeId,
  };
}

/**
 * Merges two connected collinear roads.
 */
export function joinCollinearRoads(
  road1: RoadElement,
  road2: RoadElement,
  _allRoads: RoadElement[] = []
): JoinRoadResult {
  if (road1.locked || road2.locked) {
    return { success: false, reason: 'locked' };
  }
  if (Math.abs(road1.width - road2.width) > 2) {
    return { success: false, reason: 'different_properties' };
  }

  const tol = 12; // inches
  let newStart: Point2D | undefined;
  let newEnd: Point2D | undefined;

  if (distance(road1.end, road2.start) <= tol) {
    newStart = road1.start;
    newEnd = road2.end;
  } else if (distance(road1.end, road2.end) <= tol) {
    newStart = road1.start;
    newEnd = road2.start;
  } else if (distance(road1.start, road2.start) <= tol) {
    newStart = road1.end;
    newEnd = road2.end;
  } else if (distance(road1.start, road2.end) <= tol) {
    newStart = road2.start;
    newEnd = road1.end;
  }

  if (!newStart || !newEnd) {
    return { success: false, reason: 'not_connected' };
  }

  const len1 = distance(road1.start, road1.end);
  const len2 = distance(road2.start, road2.end);
  const v1 = { x: (road1.end.x - road1.start.x) / len1, y: (road1.end.y - road1.start.y) / len1 };
  const v2 = { x: (road2.end.x - road2.start.x) / len2, y: (road2.end.y - road2.start.y) / len2 };

  const cross = Math.abs(v1.x * v2.y - v1.y * v2.x);
  if (cross > 0.12) {
    return { success: false, reason: 'not_collinear' };
  }

  const mergedRoad: RoadElement = {
    ...road1,
    start: newStart,
    end: newEnd,
  };

  return {
    success: true,
    mergedRoad,
    removedRoadId: road2.id,
  };
}

/**
 * Merges two close nodes into one, redirecting all referencing walls and roads.
 */
export function mergeNodes(
  nodeId1: string,
  nodeId2: string,
  targetPoint: Point2D,
  walls: (WallElement | CurveWallElement)[],
  roads: RoadElement[],
  nodes: WallNode[]
): {
  updatedWalls: (WallElement | CurveWallElement)[];
  updatedRoads: RoadElement[];
  updatedNodes: WallNode[];
} {
  const p: Point2D = {
    x: Math.round(targetPoint.x * 10) / 10,
    y: Math.round(targetPoint.y * 10) / 10,
  };

  const updatedNodes = nodes
    .filter((n) => n.id !== nodeId2)
    .map((n) => (n.id === nodeId1 ? { ...n, x: p.x, y: p.y } : n));

  const updatedWalls = walls.map((w) => {
    let changed = false;
    let s = { ...w.start };
    let e = { ...w.end };
    let sNode = w.startNodeId;
    let eNode = w.endNodeId;

    if (w.startNodeId === nodeId2 || w.startNodeId === nodeId1) {
      s = { ...p };
      sNode = nodeId1;
      changed = true;
    }
    if (w.endNodeId === nodeId2 || w.endNodeId === nodeId1) {
      e = { ...p };
      eNode = nodeId1;
      changed = true;
    }

    if (!changed) return w;
    return {
      ...w,
      start: s,
      end: e,
      startNodeId: sNode,
      endNodeId: eNode,
    };
  });

  const updatedRoads = roads.map((r) => {
    let s = { ...r.start };
    let e = { ...r.end };
    let changed = false;
    if (distance(r.start, p) <= 8) {
      s = { ...p };
      changed = true;
    }
    if (distance(r.end, p) <= 8) {
      e = { ...p };
      changed = true;
    }
    return changed ? { ...r, start: s, end: e } : r;
  });

  return { updatedWalls, updatedRoads, updatedNodes };
}

/**
 * Disconnects a specific wall at a junction node by assigning it a new unique node ID,
 * freeing it from other connected walls.
 */
export function disconnectAtNode(
  nodeId: string,
  wallIdToDisconnect: string,
  walls: (WallElement | CurveWallElement)[],
  nodes: WallNode[]
): {
  updatedWalls: (WallElement | CurveWallElement)[];
  updatedNodes: WallNode[];
  newNode: WallNode;
} {
  const existingNode = nodes.find((n) => n.id === nodeId);
  const pos: Point2D = existingNode ? { x: existingNode.x, y: existingNode.y } : { x: 0, y: 0 };

  const newNode: WallNode = {
    id: `node-disc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    x: pos.x,
    y: pos.y,
  };

  const updatedNodes = [...nodes, newNode];

  const updatedWalls = walls.map((w) => {
    if (w.id !== wallIdToDisconnect) return w;
    const isStart = w.startNodeId === nodeId;
    const isEnd = w.endNodeId === nodeId;
    return {
      ...w,
      startNodeId: isStart ? newNode.id : w.startNodeId,
      endNodeId: isEnd ? newNode.id : w.endNodeId,
    };
  });

  return { updatedWalls, updatedNodes, newNode };
}

/**
 * Tests if two straight walls cross in their interiors (X crossing).
 * Returns the intersection point if found.
 */
export function findWallCrossing(w1: WallElement, w2: WallElement): Point2D | null {
  const x1 = w1.start.x, y1 = w1.start.y;
  const x2 = w1.end.x, y2 = w1.end.y;
  const x3 = w2.start.x, y3 = w2.start.y;
  const x4 = w2.end.x, y4 = w2.end.y;

  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (Math.abs(denom) < 0.0001) return null; // Parallel or collinear

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  // Interior crossing margin (must not be at endpoints)
  const margin = 0.04;
  if (ua >= margin && ua <= 1 - margin && ub >= margin && ub <= 1 - margin) {
    return {
      x: Math.round((x1 + ua * (x2 - x1)) * 10) / 10,
      y: Math.round((y1 + ua * (y2 - y1)) * 10) / 10,
    };
  }

  return null;
}

/**
 * Trims two crossing walls into an X-junction (4 walls meeting at 1 shared node).
 */
export function splitWallsAtCrossing(
  w1: WallElement,
  w2: WallElement,
  splitNodeId: string,
  doors: DoorElement[],
  windows: WindowElement[]
): CrossingSplitResult | null {
  const crossingPt = findWallCrossing(w1, w2);
  if (!crossingPt) return null;

  const res1 = splitWallAtPoint(w1, crossingPt, splitNodeId, doors, windows);
  const res2 = splitWallAtPoint(w2, crossingPt, splitNodeId, res1.reassignedDoors, res1.reassignedWindows);

  return {
    walls: [
      res1.firstWall as WallElement,
      res1.secondWall as WallElement,
      res2.firstWall as WallElement,
      res2.secondWall as WallElement,
    ],
    splitNode: res1.splitNode,
    reassignedDoors: res2.reassignedDoors,
    reassignedWindows: res2.reassignedWindows,
  };
}
