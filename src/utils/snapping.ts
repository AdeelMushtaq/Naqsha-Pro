import { Point2D, PlanElement, WallElement } from '../models/types';
import { distance } from './geometry';

export interface SnapResult {
  point: Point2D;
  snapped: boolean;
  type?: 'grid' | 'endpoint' | 'angle' | 'midpoint';
  targetElementId?: string;
  guide?: {
    from: Point2D;
    to: Point2D;
  };
}

/**
 * Snaps a coordinate point to grid
 */
export function snapToGrid(
  point: Point2D,
  gridSizeInches: number = 12,
  thresholdInches: number = 4
): SnapResult {
  const snappedX = Math.round(point.x / gridSizeInches) * gridSizeInches;
  const snappedY = Math.round(point.y / gridSizeInches) * gridSizeInches;

  const dx = Math.abs(point.x - snappedX);
  const dy = Math.abs(point.y - snappedY);

  const shouldSnapX = dx <= thresholdInches;
  const shouldSnapY = dy <= thresholdInches;

  if (shouldSnapX || shouldSnapY) {
    return {
      point: {
        x: shouldSnapX ? snappedX : point.x,
        y: shouldSnapY ? snappedY : point.y,
      },
      snapped: true,
      type: 'grid',
    };
  }

  return { point, snapped: false };
}

/**
 * Snaps a point to wall endpoints or shape corners
 */
export function snapToEndpoints(
  point: Point2D,
  elements: PlanElement[],
  thresholdInches: number = 6,
  ignoreId?: string
): SnapResult {
  let closestDist = thresholdInches;
  let bestPoint: Point2D | null = null;
  let targetId: string | undefined = undefined;

  for (const el of elements) {
    if (el.id === ignoreId) continue;

    if (el.type === 'wall' || el.type === 'curve_wall') {
      const d1 = distance(point, el.start);
      if (d1 < closestDist) {
        closestDist = d1;
        bestPoint = { ...el.start };
        targetId = el.id;
      }
      const d2 = distance(point, el.end);
      if (d2 < closestDist) {
        closestDist = d2;
        bestPoint = { ...el.end };
        targetId = el.id;
      }
    } else if (el.type === 'box') {
      const corners: Point2D[] = [
        { x: el.x, y: el.y },
        { x: el.x + el.width, y: el.y },
        { x: el.x + el.width, y: el.y + el.height },
        { x: el.x, y: el.y + el.height },
      ];
      for (const corner of corners) {
        const d = distance(point, corner);
        if (d < closestDist) {
          closestDist = d;
          bestPoint = corner;
          targetId = el.id;
        }
      }
    } else if (el.type === 'circle') {
      const d = distance(point, { x: el.x, y: el.y });
      if (d < closestDist) {
        closestDist = d;
        bestPoint = { x: el.x, y: el.y };
        targetId = el.id;
      }
    }
  }

  if (bestPoint) {
    return {
      point: bestPoint,
      snapped: true,
      type: 'endpoint',
      targetElementId: targetId,
    };
  }

  return { point, snapped: false };
}

/**
 * Snaps a point to wall midpoints
 */
export function snapToMidpoints(
  point: Point2D,
  elements: PlanElement[],
  thresholdInches: number = 6,
  ignoreId?: string
): SnapResult {
  let closestDist = thresholdInches;
  let bestPoint: Point2D | null = null;
  let targetId: string | undefined = undefined;

  for (const el of elements) {
    if (el.id === ignoreId) continue;

    if (el.type === 'wall') {
      const mid: Point2D = {
        x: (el.start.x + el.end.x) / 2,
        y: (el.start.y + el.end.y) / 2,
      };
      const d = distance(point, mid);
      if (d < closestDist) {
        closestDist = d;
        bestPoint = mid;
        targetId = el.id;
      }
    } else if (el.type === 'box') {
      const midpoints: Point2D[] = [
        { x: el.x + el.width / 2, y: el.y },
        { x: el.x + el.width, y: el.y + el.height / 2 },
        { x: el.x + el.width / 2, y: el.y + el.height },
        { x: el.x, y: el.y + el.height / 2 },
      ];
      for (const mid of midpoints) {
        const d = distance(point, mid);
        if (d < closestDist) {
          closestDist = d;
          bestPoint = mid;
          targetId = el.id;
        }
      }
    }
  }

  if (bestPoint) {
    return {
      point: bestPoint,
      snapped: true,
      type: 'midpoint',
      targetElementId: targetId,
    };
  }

  return { point, snapped: false };
}

/**
 * Snaps angle to 0, 45, 90, 135, 180, etc. relative to origin
 */
export function snapAngle(
  origin: Point2D,
  target: Point2D,
  angleIncrementDeg: number = 45,
  thresholdDeg: number = 6
): SnapResult {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const dist = Math.hypot(dx, dy);

  if (dist === 0) return { point: target, snapped: false };

  let currentAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (currentAngle < 0) currentAngle += 360;

  const nearestSnapAngle = Math.round(currentAngle / angleIncrementDeg) * angleIncrementDeg;
  const angleDiff = Math.abs(currentAngle - nearestSnapAngle);

  if (angleDiff <= thresholdDeg || 360 - angleDiff <= thresholdDeg) {
    const rad = (nearestSnapAngle * Math.PI) / 180;
    return {
      point: {
        x: origin.x + Math.cos(rad) * dist,
        y: origin.y + Math.sin(rad) * dist,
      },
      snapped: true,
      type: 'angle',
    };
  }

  return { point: target, snapped: false };
}
