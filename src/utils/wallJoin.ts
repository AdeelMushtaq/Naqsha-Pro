/**
 * Wall Join, Node Connection, and Junction Geometry Utilities for Naqsha.
 * Pure mathematical functions for L, T, X wall junctions and node management.
 * All units in INCHES.
 */

import { Point2D, WallElement, WallNode, DoorElement, WindowElement, PlanElement } from '../models/types';
import { distance, projectPointOntoSegment, clampOffset, getWallNormal } from './geometry';

export interface MiterJoint {
  p1: Point2D;
  p2: Point2D;
  p3: Point2D;
  p4: Point2D;
}

export interface WallSegmentSplitResult {
  firstWall: WallElement;
  secondWall: WallElement;
  splitNode: WallNode;
  reassignedDoors: DoorElement[];
  reassignedWindows: WindowElement[];
}

/**
 * Calculates mitered corners for two walls meeting at an angle.
 */
export function calculateMiterCorner(
  pCommon: Point2D,
  pArm1: Point2D,
  pArm2: Point2D,
  thickness1: number,
  thickness2: number
): { innerCorner: Point2D; outerCorner: Point2D } {
  // Vector along arm 1
  const d1 = distance(pCommon, pArm1);
  const v1 = d1 > 0 ? { x: (pArm1.x - pCommon.x) / d1, y: (pArm1.y - pCommon.y) / d1 } : { x: 1, y: 0 };

  // Vector along arm 2
  const d2 = distance(pCommon, pArm2);
  const v2 = d2 > 0 ? { x: (pArm2.x - pCommon.x) / d2, y: (pArm2.y - pCommon.y) / d2 } : { x: 0, y: 1 };

  // Normals
  const n1 = { x: -v1.y, y: v1.x };
  const n2 = { x: -v2.y, y: v2.x };

  // Bisector vector
  const bisectorX = v1.x + v2.x;
  const bisectorY = v1.y + v2.y;
  const bisectorLen = Math.hypot(bisectorX, bisectorY);

  const tAvg = (thickness1 + thickness2) / 4;

  if (bisectorLen < 0.001) {
    // Collinear or 180 degrees
    return {
      innerCorner: { x: pCommon.x + n1.x * (thickness1 / 2), y: pCommon.y + n1.y * (thickness1 / 2) },
      outerCorner: { x: pCommon.x - n1.x * (thickness1 / 2), y: pCommon.y - n1.y * (thickness1 / 2) },
    };
  }

  const bNorm = { x: bisectorX / bisectorLen, y: bisectorY / bisectorLen };
  // Limit miter length to prevent extreme spikes on very acute angles
  const cosHalfAngle = (v1.x * bNorm.x + v1.y * bNorm.y);
  const miterScale = Math.min(3.0, 1.0 / Math.max(0.2, Math.abs(cosHalfAngle)));

  const offsetDist = tAvg * miterScale;

  return {
    innerCorner: { x: pCommon.x + bNorm.x * offsetDist, y: pCommon.y + bNorm.y * offsetDist },
    outerCorner: { x: pCommon.x - bNorm.x * offsetDist, y: pCommon.y - bNorm.y * offsetDist },
  };
}

/**
 * Finds or creates a node at a given point, snapping to existing nodes within tolerance.
 */
export function getOrCreateWallNode(
  point: Point2D,
  existingNodes: WallNode[],
  toleranceInches: number = 6
): { node: WallNode; isNew: boolean; updatedNodes: WallNode[] } {
  let closestNode: WallNode | null = null;
  let minD = toleranceInches;

  for (const n of existingNodes) {
    const d = distance(point, { x: n.x, y: n.y });
    if (d < minD) {
      minD = d;
      closestNode = n;
    }
  }

  if (closestNode) {
    return {
      node: closestNode,
      isNew: false,
      updatedNodes: existingNodes,
    };
  }

  const newNode: WallNode = {
    id: `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    x: Math.round(point.x * 10) / 10,
    y: Math.round(point.y * 10) / 10,
  };

  return {
    node: newNode,
    isNew: true,
    updatedNodes: [...existingNodes, newNode],
  };
}

/**
 * Finds walls connected to a given node ID.
 */
export function getWallsConnectedToNode(
  nodeId: string,
  walls: WallElement[]
): { wall: WallElement; isStart: boolean }[] {
  const result: { wall: WallElement; isStart: boolean }[] = [];
  for (const w of walls) {
    if (w.startNodeId === nodeId) {
      result.push({ wall: w, isStart: true });
    } else if (w.endNodeId === nodeId) {
      result.push({ wall: w, isStart: false });
    }
  }
  return result;
}

/**
 * Checks if a point lies on a wall segment (not near its endpoints) within tolerance.
 * Returns the projected point and offset along the wall.
 */
export function isPointOnWallInterior(
  point: Point2D,
  wall: WallElement,
  toleranceInches: number = 8,
  endMarginInches: number = 8
): { onInterior: boolean; splitPoint: Point2D; offset: number } {
  const proj = projectPointOntoSegment(point, wall.start, wall.end);
  const wallLen = distance(wall.start, wall.end);

  if (
    proj.distance <= toleranceInches &&
    proj.offset >= endMarginInches &&
    proj.offset <= wallLen - endMarginInches
  ) {
    return {
      onInterior: true,
      splitPoint: proj.point,
      offset: proj.offset,
    };
  }

  return {
    onInterior: false,
    splitPoint: point,
    offset: proj.offset,
  };
}

/**
 * Splits a wall at a given interior point into two connected walls (T-junction),
 * reassigning attached doors and windows to the correct segment with updated offsets.
 */
export function splitWallAtPoint(
  wall: WallElement,
  splitPoint: Point2D,
  splitNodeId: string,
  doors: DoorElement[],
  windows: WindowElement[]
): WallSegmentSplitResult {
  const proj = projectPointOntoSegment(splitPoint, wall.start, wall.end);
  const splitOffset = proj.offset;

  const firstWallId = wall.id;
  const secondWallId = `${wall.id}-split-${Date.now().toString(36)}`;

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

  // Reassign doors
  const reassignedDoors = doors.map((d) => {
    if (d.wallId !== wall.id) return d;
    if (d.offset + d.width / 2 < splitOffset) {
      // Belongs to first wall
      return {
        ...d,
        wallId: firstWallId,
        offset: clampOffset(d.offset, d.width, firstLen),
      };
    } else {
      // Belongs to second wall
      const newOffset = d.offset - splitOffset;
      return {
        ...d,
        wallId: secondWallId,
        offset: clampOffset(newOffset, d.width, secondLen),
      };
    }
  });

  // Reassign windows
  const reassignedWindows = windows.map((w) => {
    if (w.wallId !== wall.id) return w;
    if (w.offset + w.width / 2 < splitOffset) {
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
 * Automatically detects and heals/merges collinear wall segments that meet end-to-end
 * where no 3rd wall is connected (e.g. from previously split T-junctions or disconnected walls).
 * Returns the healed elements list, the updated wallNodes list, and the count of healed merges.
 */
export function healCollinearWalls(
  elements: PlanElement[],
  wallNodes: WallNode[] = []
): { elements: PlanElement[]; wallNodes: WallNode[]; healedCount: number } {
  let currentElements = [...elements];
  let currentNodes = [...wallNodes];
  let totalHealed = 0;

  // Run healing passes until no more candidate pairs can be merged
  let passFound = true;
  while (passFound) {
    passFound = false;

    // Filter active straight walls
    const walls = currentElements.filter(
      (el): el is WallElement => el.type === 'wall' && !el.locked && !el.hidden
    );

    for (let i = 0; i < walls.length; i++) {
      const w1 = walls[i];
      const len1 = distance(w1.start, w1.end);
      if (len1 < 1) continue;

      for (let j = i + 1; j < walls.length; j++) {
        const w2 = walls[j];
        if (w1.id === w2.id) continue;
        const len2 = distance(w2.start, w2.end);
        if (len2 < 1) continue;

        // Check compatibility (same thickness, height, layer)
        if (Math.abs(w1.thickness - w2.thickness) > 0.1) continue;
        if (w1.layer !== w2.layer) continue;
        if ((w1.height || 120) !== (w2.height || 120)) continue;

        // Determine how they meet (4 possible connection combinations)
        let meetType: 'w1end_w2start' | 'w1end_w2end' | 'w1start_w2start' | 'w1start_w2end' | null = null;
        let meetPt: Point2D | null = null;
        let meetNodeId: string | undefined = undefined;
        const tol = 6; // 6 inches tolerance

        if ((w1.endNodeId && w1.endNodeId === w2.startNodeId) || distance(w1.end, w2.start) <= tol) {
          meetType = 'w1end_w2start';
          meetPt = w1.end;
          meetNodeId = w1.endNodeId || w2.startNodeId;
        } else if ((w1.endNodeId && w1.endNodeId === w2.endNodeId) || distance(w1.end, w2.end) <= tol) {
          meetType = 'w1end_w2end';
          meetPt = w1.end;
          meetNodeId = w1.endNodeId || w2.endNodeId;
        } else if ((w1.startNodeId && w1.startNodeId === w2.startNodeId) || distance(w1.start, w2.start) <= tol) {
          meetType = 'w1start_w2start';
          meetPt = w1.start;
          meetNodeId = w1.startNodeId || w2.startNodeId;
        } else if ((w1.startNodeId && w1.startNodeId === w2.endNodeId) || distance(w1.start, w2.end) <= tol) {
          meetType = 'w1start_w2end';
          meetPt = w1.start;
          meetNodeId = w1.startNodeId || w2.endNodeId;
        }

        if (!meetType || !meetPt) continue;

        // Check if ANY OTHER straight wall endpoint touches meetPt or references meetNodeId
        // (meaning a 3rd wall is attached as T or corner)
        let otherTouchCount = 0;
        for (const wOther of walls) {
          if (wOther.id === w1.id || wOther.id === w2.id) continue;
          const touchesByNode = meetNodeId && (wOther.startNodeId === meetNodeId || wOther.endNodeId === meetNodeId);
          const touchesByDist = distance(wOther.start, meetPt) <= tol || distance(wOther.end, meetPt) <= tol;
          if (touchesByNode || touchesByDist) {
            otherTouchCount++;
            break;
          }
        }
        if (otherTouchCount > 0) continue; // Cannot heal if another wall branches here!

        // Check collinearity: are w1 and w2 pointing in the same line?
        const v1 = { x: (w1.end.x - w1.start.x) / len1, y: (w1.end.y - w1.start.y) / len1 };
        const v2 = { x: (w2.end.x - w2.start.x) / len2, y: (w2.end.y - w2.start.y) / len2 };

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

        // In collinear meeting, dir1 and dir2 should be parallel in continuous line (dot ~ 1.0)
        if (cross > 0.08 || dot < 0.92) continue; // Not collinear!

        // MERGE W1 and W2!
        let newStart: Point2D;
        let newEnd: Point2D;
        let newStartNodeId = w1.startNodeId;
        let newEndNodeId = w2.endNodeId;

        if (meetType === 'w1end_w2start') {
          newStart = { ...w1.start };
          newEnd = { ...w2.end };
          newStartNodeId = w1.startNodeId;
          newEndNodeId = w2.endNodeId;
        } else if (meetType === 'w1end_w2end') {
          newStart = { ...w1.start };
          newEnd = { ...w2.start };
          newStartNodeId = w1.startNodeId;
          newEndNodeId = w2.startNodeId;
        } else if (meetType === 'w1start_w2start') {
          newStart = { ...w1.end };
          newEnd = { ...w2.end };
          newStartNodeId = w1.endNodeId;
          newEndNodeId = w2.endNodeId;
        } else {
          newStart = { ...w2.start };
          newEnd = { ...w1.end };
          newStartNodeId = w2.startNodeId;
          newEndNodeId = w1.endNodeId;
        }

        const mergedLen = distance(newStart, newEnd);
        const mergedWall: WallElement = {
          ...w1,
          id: w1.id,
          start: newStart,
          end: newEnd,
          startNodeId: newStartNodeId,
          endNodeId: newEndNodeId,
        };

        // Re-project doors and windows onto the merged wall to preserve exact physical position
        const reprojectItem = (el: DoorElement | WindowElement, oldHost: WallElement) => {
          const oldLen = distance(oldHost.start, oldHost.end);
          const t = oldLen > 0 ? (el.offset + el.width / 2) / oldLen : 0.5;
          const centerPos: Point2D = {
            x: oldHost.start.x + (oldHost.end.x - oldHost.start.x) * t,
            y: oldHost.start.y + (oldHost.end.y - oldHost.start.y) * t,
          };
          const proj = projectPointOntoSegment(centerPos, newStart, newEnd);
          const newCenterDist = proj.offset;
          const newOffset = clampOffset(newCenterDist - el.width / 2, el.width, mergedLen);
          return { ...el, wallId: w1.id, offset: newOffset };
        };

        currentElements = currentElements
          .filter((el) => el.id !== w2.id)
          .map((el) => {
            if (el.id === w1.id) return mergedWall;
            if (el.type === 'door' || el.type === 'window') {
              const dw = el as DoorElement | WindowElement;
              if (dw.wallId === w1.id) return reprojectItem(dw, w1);
              if (dw.wallId === w2.id) return reprojectItem(dw, w2);
            }
            return el;
          });

        if (meetNodeId) {
          currentNodes = currentNodes.filter((n) => n.id !== meetNodeId);
        }

        totalHealed++;
        passFound = true;
        break; // Re-scan with updated elements
      }
      if (passFound) break;
    }
  }

  return { elements: currentElements, wallNodes: currentNodes, healedCount: totalHealed };
}

/**
 * Ensures all walls have startNodeId and endNodeId, creating or matching nodes for existing walls.
 */
export function ensureWallNodes(
  walls: WallElement[],
  existingNodes: WallNode[] = []
): { walls: WallElement[]; nodes: WallNode[] } {
  let nodes = [...existingNodes];
  const updatedWalls: WallElement[] = [];

  for (const w of walls) {
    let startNodeId = w.startNodeId;
    let endNodeId = w.endNodeId;

    if (!startNodeId) {
      const { node, updatedNodes } = getOrCreateWallNode(w.start, nodes, 4);
      startNodeId = node.id;
      nodes = updatedNodes;
    }

    if (!endNodeId) {
      const { node, updatedNodes } = getOrCreateWallNode(w.end, nodes, 4);
      endNodeId = node.id;
      nodes = updatedNodes;
    }

    updatedWalls.push({
      ...w,
      startNodeId,
      endNodeId,
    });
  }

  return { walls: updatedWalls, nodes };
}

export interface WallJunction {
  id: string;
  point: Point2D;
  wallIds: string[];
  type: 'L' | 'T' | 'X';
  fillPoints: number[];
  strokeLines: number[][];
}

/**
 * Calculates intersection point of two 2D lines defined by a point and direction vector.
 */
export function intersectLines(
  p1: Point2D,
  dir1: Point2D,
  p2: Point2D,
  dir2: Point2D
): Point2D {
  const det = dir1.x * dir2.y - dir1.y * dir2.x;
  if (Math.abs(det) < 0.0001) {
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  }
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const t = (dx * dir2.y - dy * dir2.x) / det;
  return {
    x: p1.x + t * dir1.x,
    y: p1.y + t * dir1.y,
  };
}

/**
 * Maps which wall endpoints (start / end) are connected to other walls.
 */
export function getConnectedEndpointsMap(
  walls: (WallElement | any)[],
  tolerance: number = 14
): Map<string, { start: boolean; end: boolean }> {
  const straightWalls = walls.filter((w): w is WallElement => w.type === 'wall' && !w.hidden);
  const result = new Map<string, { start: boolean; end: boolean }>();

  straightWalls.forEach((w) => {
    result.set(w.id, { start: false, end: false });
  });

  for (let i = 0; i < straightWalls.length; i++) {
    const w1 = straightWalls[i];
    const map1 = result.get(w1.id)!;

    for (let j = 0; j < straightWalls.length; j++) {
      if (i === j) continue;
      const w2 = straightWalls[j];
      const map2 = result.get(w2.id)!;

      // Check w1.start with w2.start or w2.end
      if (distance(w1.start, w2.start) <= tolerance) {
        map1.start = true;
        map2.start = true;
      }
      if (distance(w1.start, w2.end) <= tolerance) {
        map1.start = true;
        map2.end = true;
      }
      // Check w1.end with w2.start or w2.end
      if (distance(w1.end, w2.start) <= tolerance) {
        map1.end = true;
        map2.start = true;
      }
      if (distance(w1.end, w2.end) <= tolerance) {
        map1.end = true;
        map2.end = true;
      }

      // Check if w1.start or w1.end lands on w2 interior (T-junction)
      const t2 = (w2.thickness || 9) / 2 + tolerance;
      const len2 = distance(w2.start, w2.end);
      const projStart = projectPointOntoSegment(w1.start, w2.start, w2.end);
      if (projStart.distance <= t2 && projStart.offset >= 2 && projStart.offset <= len2 - 2) {
        map1.start = true;
      }
      const projEnd = projectPointOntoSegment(w1.end, w2.start, w2.end);
      if (projEnd.distance <= t2 && projEnd.offset >= 2 && projEnd.offset <= len2 - 2) {
        map1.end = true;
      }
    }
  }

  return result;
}

/**
 * Finds and calculates all architectural wall junctions (corners, miters, L, T, X joints)
 * so walls connect seamlessly with matching fills and continuous mitered border strokes.
 */
export function findWallJunctions(
  walls: (WallElement | any)[],
  tolerance: number = 14
): WallJunction[] {
  const straightWalls = walls.filter((w): w is WallElement => w.type === 'wall' && !w.hidden);
  if (straightWalls.length < 2) return [];

  interface EndpointInfo {
    wall: WallElement;
    isStart: boolean;
    point: Point2D;
    other: Point2D;
  }

  const endpoints: EndpointInfo[] = [];
  straightWalls.forEach((w) => {
    endpoints.push({ wall: w, isStart: true, point: { ...w.start }, other: { ...w.end } });
    endpoints.push({ wall: w, isStart: false, point: { ...w.end }, other: { ...w.start } });
  });

  // Cluster endpoints that meet at the same junction
  const visited = new Set<number>();
  const clusters: EndpointInfo[][] = [];

  for (let i = 0; i < endpoints.length; i++) {
    if (visited.has(i)) continue;
    const cluster: EndpointInfo[] = [endpoints[i]];
    visited.add(i);

    for (let j = i + 1; j < endpoints.length; j++) {
      if (visited.has(j)) continue;
      if (endpoints[i].wall.id === endpoints[j].wall.id) continue;

      if (distance(endpoints[i].point, endpoints[j].point) <= tolerance) {
        cluster.push(endpoints[j]);
        visited.add(j);
      }
    }

    if (cluster.length >= 2) {
      clusters.push(cluster);
    }
  }

  const junctions: WallJunction[] = [];

  clusters.forEach((cluster, cIdx) => {
    // Average center point
    const avgX = cluster.reduce((sum, e) => sum + e.point.x, 0) / cluster.length;
    const avgY = cluster.reduce((sum, e) => sum + e.point.y, 0) / cluster.length;
    const P: Point2D = { x: Math.round(avgX * 10) / 10, y: Math.round(avgY * 10) / 10 };
    const wallIds = Array.from(new Set(cluster.map((c) => c.wall.id)));

    // CASE 1: Exactly 2 walls meeting (Corner / L-joint)
    if (cluster.length === 2) {
      const arm1 = cluster[0];
      const arm2 = cluster[1];
      const w1 = arm1.wall;
      const w2 = arm2.wall;

      const len1 = distance(P, arm1.other);
      const len2 = distance(P, arm2.other);
      if (len1 < 1 || len2 < 1) return;

      // Unit vector: Arm 1 entering P (from other towards P)
      const d1 = { x: (P.x - arm1.other.x) / len1, y: (P.y - arm1.other.y) / len1 };
      // Unit vector: Arm 2 leaving P (from P towards other)
      const d2 = { x: (arm2.other.x - P.x) / len2, y: (arm2.other.y - P.y) / len2 };

      // Left normal for vector entering P: (-dy, dx)
      const n1Left = { x: -d1.y, y: d1.x };
      const n1Right = { x: d1.y, y: -d1.x };

      // Left normal for vector leaving P: (-dy, dx)
      const n2Left = { x: -d2.y, y: d2.x };
      const n2Right = { x: d2.y, y: -d2.x };

      const t1 = (w1.thickness || 9) / 2;
      const t2 = (w2.thickness || 9) / 2;

      // Arm 1 boundary lines
      const p1Left = { x: P.x + n1Left.x * t1, y: P.y + n1Left.y * t1 };
      const p1Right = { x: P.x + n1Right.x * t1, y: P.y + n1Right.y * t1 };

      // Arm 2 boundary lines
      const p2Left = { x: P.x + n2Left.x * t2, y: P.y + n2Left.y * t2 };
      const p2Right = { x: P.x + n2Right.x * t2, y: P.y + n2Right.y * t2 };

      // Left boundary meets left boundary; right boundary meets right boundary
      let iLeft = intersectLines(p1Left, d1, p2Left, d2);
      let iRight = intersectLines(p1Right, d1, p2Right, d2);

      // Clamp extreme miter spike on very acute angles
      const maxMiter = 2.5 * Math.max(t1, t2);
      if (distance(P, iLeft) > maxMiter) {
        const d = distance(P, iLeft);
        iLeft = { x: P.x + ((iLeft.x - P.x) / d) * maxMiter, y: P.y + ((iLeft.y - P.y) / d) * maxMiter };
      }
      if (distance(P, iRight) > maxMiter) {
        const d = distance(P, iRight);
        iRight = { x: P.x + ((iRight.x - P.x) / d) * maxMiter, y: P.y + ((iRight.y - P.y) / d) * maxMiter };
      }

      // Extension along each wall
      const ext1 = Math.min(t1, len1 * 0.4);
      const ext2 = Math.min(t2, len2 * 0.4);

      // Points on wall 1 (ext1 back along -d1)
      const w1Left = { x: p1Left.x - d1.x * ext1, y: p1Left.y - d1.y * ext1 };
      const w1Right = { x: p1Right.x - d1.x * ext1, y: p1Right.y - d1.y * ext1 };

      // Points on wall 2 (ext2 forward along +d2)
      const w2Left = { x: p2Left.x + d2.x * ext2, y: p2Left.y + d2.y * ext2 };
      const w2Right = { x: p2Right.x + d2.x * ext2, y: p2Right.y + d2.y * ext2 };

      // Fill polygon covering the corner (inner and outer corners)
      const fillPoints = [
        iLeft.x, iLeft.y,
        w2Left.x, w2Left.y,
        w2Right.x, w2Right.y,
        iRight.x, iRight.y,
        w1Right.x, w1Right.y,
        w1Left.x, w1Left.y,
      ];

      // Continuous boundary strokes turning around the corner
      const strokeLines = [
        [w1Left.x, w1Left.y, iLeft.x, iLeft.y, w2Left.x, w2Left.y],
        [w1Right.x, w1Right.y, iRight.x, iRight.y, w2Right.x, w2Right.y],
      ];

      junctions.push({
        id: `junc-L-${cIdx}-${Math.round(P.x)}-${Math.round(P.y)}`,
        point: P,
        wallIds,
        type: 'L',
        fillPoints,
        strokeLines,
      });
    } else {
      // CASE 2: 3 or more walls meeting (T or X junction at endpoint cluster)
      const sortedArms = cluster.map((arm) => {
        const len = distance(P, arm.other);
        const v = len > 0 ? { x: (arm.other.x - P.x) / len, y: (arm.other.y - P.y) / len } : { x: 1, y: 0 };
        const angle = Math.atan2(v.y, v.x);
        return { ...arm, v, angle, len, t: (arm.wall.thickness || 9) / 2 };
      });
      sortedArms.sort((a, b) => a.angle - b.angle);

      const fillPoints: number[] = [];
      const strokeLines: number[][] = [];

      for (let k = 0; k < sortedArms.length; k++) {
        const curr = sortedArms[k];
        const next = sortedArms[(k + 1) % sortedArms.length];

        const nCurr = { x: -curr.v.y, y: curr.v.x };
        const nNext = { x: -next.v.y, y: next.v.x };

        const pCurr = { x: P.x + nCurr.x * curr.t, y: P.y + nCurr.y * curr.t };
        const pNext = { x: P.x - nNext.x * next.t, y: P.y - nNext.y * next.t };

        let cornerPt = intersectLines(pCurr, curr.v, pNext, next.v);
        const maxM = 2.0 * Math.max(curr.t, next.t);
        if (distance(P, cornerPt) > maxM) {
          const d = distance(P, cornerPt);
          cornerPt = { x: P.x + ((cornerPt.x - P.x) / d) * maxM, y: P.y + ((cornerPt.y - P.y) / d) * maxM };
        }

        const extCurr = Math.min(curr.t, curr.len * 0.3);
        const extNext = Math.min(next.t, next.len * 0.3);

        const aCurr = { x: pCurr.x + curr.v.x * extCurr, y: pCurr.y + curr.v.y * extCurr };
        const aNext = { x: pNext.x + next.v.x * extNext, y: pNext.y + next.v.y * extNext };

        fillPoints.push(aCurr.x, aCurr.y, cornerPt.x, cornerPt.y, aNext.x, aNext.y);
        strokeLines.push([aCurr.x, aCurr.y, cornerPt.x, cornerPt.y, aNext.x, aNext.y]);
      }

      junctions.push({
        id: `junc-TX-${cIdx}-${Math.round(P.x)}-${Math.round(P.y)}`,
        point: P,
        wallIds,
        type: cluster.length === 3 ? 'T' : 'X',
        fillPoints,
        strokeLines,
      });
    }
  });

  // CASE 3: T-Junctions where a wall endpoint lands on another wall's body
  const clusteredWallEndIds = new Set<string>();
  clusters.forEach((cl) => {
    cl.forEach((ep) => clusteredWallEndIds.add(`${ep.wall.id}-${ep.isStart ? 'start' : 'end'}`));
  });

  let tCount = 0;
  straightWalls.forEach((stem) => {
    const tStem = (stem.thickness || 9) / 2;
    const checkEndpoints = [
      { pt: stem.start, isStart: true, other: stem.end },
      { pt: stem.end, isStart: false, other: stem.start },
    ];

    checkEndpoints.forEach(({ pt, isStart, other }) => {
      if (clusteredWallEndIds.has(`${stem.id}-${isStart ? 'start' : 'end'}`)) return;

      straightWalls.forEach((host) => {
        if (host.id === stem.id) return;
        const hostLen = distance(host.start, host.end);
        if (hostLen < 2) return;

        const proj = projectPointOntoSegment(pt, host.start, host.end);
        const hostHalfThick = (host.thickness || 9) / 2;

        if (proj.distance <= hostHalfThick + tolerance && proj.offset >= 4 && proj.offset <= hostLen - 4) {
          // Found T-junction!
          tCount++;
          const hostNormal = getWallNormal(host.start, host.end);
          // Direction from host centerline to stem pt
          const toStemX = pt.x - proj.point.x;
          const toStemY = pt.y - proj.point.y;
          const dot = toStemX * hostNormal.x + toStemY * hostNormal.y;
          const nearFaceSign = dot >= 0 ? 1 : -1;

          // Point on host wall's near face
          const faceCenter = {
            x: proj.point.x + hostNormal.x * hostHalfThick * nearFaceSign,
            y: proj.point.y + hostNormal.y * hostHalfThick * nearFaceSign,
          };

          const hostDir = {
            x: (host.end.x - host.start.x) / hostLen,
            y: (host.end.y - host.start.y) / hostLen,
          };

          const stemLen = distance(pt, other);
          const stemDir = stemLen > 0
            ? { x: (other.x - pt.x) / stemLen, y: (other.y - pt.y) / stemLen }
            : { x: 0, y: 1 };
          const stemNorm = { x: -stemDir.y, y: stemDir.x };

          const fLeft = {
            x: faceCenter.x - hostDir.x * tStem,
            y: faceCenter.y - hostDir.y * tStem,
          };
          const fRight = {
            x: faceCenter.x + hostDir.x * tStem,
            y: faceCenter.y + hostDir.y * tStem,
          };

          const sLeft = {
            x: pt.x + stemNorm.x * tStem + stemDir.x * Math.min(tStem, 8),
            y: pt.y + stemNorm.y * tStem + stemDir.y * Math.min(tStem, 8),
          };
          const sRight = {
            x: pt.x - stemNorm.x * tStem + stemDir.x * Math.min(tStem, 8),
            y: pt.y - stemNorm.y * tStem + stemDir.y * Math.min(tStem, 8),
          };

          junctions.push({
            id: `junc-T-stem-${tCount}-${stem.id}-${host.id}`,
            point: faceCenter,
            wallIds: [stem.id, host.id],
            type: 'T',
            fillPoints: [fLeft.x, fLeft.y, sLeft.x, sLeft.y, sRight.x, sRight.y, fRight.x, fRight.y],
            strokeLines: [
              [sLeft.x, sLeft.y, fLeft.x, fLeft.y, fLeft.x - hostDir.x * 6, fLeft.y - hostDir.y * 6],
              [sRight.x, sRight.y, fRight.x, fRight.y, fRight.x + hostDir.x * 6, fRight.y + hostDir.y * 6],
            ],
          });
        }
      });
    });
  });

  return junctions;
}

