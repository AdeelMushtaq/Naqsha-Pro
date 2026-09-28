import { Point2D, WallElement, CurveWallElement, DoorElement, WindowElement } from '../models/types';

export function distance(p1: Point2D, p2: Point2D): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

export function angleRad(p1: Point2D, p2: Point2D): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

export function angleDeg(p1: Point2D, p2: Point2D): number {
  const deg = (angleRad(p1, p2) * 180) / Math.PI;
  return deg < 0 ? deg + 360 : deg;
}

/**
 * Calculates length of straight or curved wall
 */
export function getWallLength(wall: WallElement | CurveWallElement): number {
  if (wall.type === 'curve_wall') {
    return getCurveWallArc(wall).length;
  }
  return distance(wall.start, wall.end);
}

/**
 * Normal vector perpendicular to wall direction (unit vector pointing to the left of p1->p2)
 */
export function getWallNormal(p1: Point2D, p2: Point2D): Point2D {
  const d = distance(p1, p2);
  if (d === 0) return { x: 0, y: 1 };
  const dx = (p2.x - p1.x) / d;
  const dy = (p2.y - p1.y) / d;
  return { x: -dy, y: dx };
}

/**
 * Calculates the 4 corner points of a thick straight wall polygon
 */
export function getWallPolygon(wall: WallElement): Point2D[] {
  const len = getWallLength(wall);
  if (len === 0) return [wall.start, wall.start, wall.start, wall.start];

  const halfThickness = wall.thickness / 2;
  const normal = getWallNormal(wall.start, wall.end);

  const nx = normal.x * halfThickness;
  const ny = normal.y * halfThickness;

  return [
    { x: wall.start.x + nx, y: wall.start.y + ny },
    { x: wall.end.x + nx, y: wall.end.y + ny },
    { x: wall.end.x - nx, y: wall.end.y - ny },
    { x: wall.start.x - nx, y: wall.start.y - ny },
  ];
}

/**
 * Geometry for curved wall with bulge (arc)
 * Bulge: perpendicular offset distance at midpoint of chord.
 */
export interface ArcGeometry {
  center: Point2D;
  radius: number;
  startAngle: number; // radians
  endAngle: number;   // radians
  counterClockwise: boolean;
  length: number;     // arc length in inches
  chordLength: number;
}

export function getCurveWallArc(wall: CurveWallElement): ArcGeometry {
  const p1 = wall.start;
  const p2 = wall.end;
  const chordLen = distance(p1, p2);

  if (chordLen === 0 || Math.abs(wall.bulge) < 0.001) {
    // Degenerate arc (straight line)
    return {
      center: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
      radius: chordLen / 2,
      startAngle: angleRad(p1, p2),
      endAngle: angleRad(p1, p2),
      counterClockwise: false,
      length: chordLen,
      chordLength: chordLen,
    };
  }

  const h = wall.bulge;
  const d = chordLen / 2;
  // Radius from chord length and sagitta: R = (d^2 + h^2) / (2 * |h|)
  const radius = (d * d + h * h) / (2 * Math.abs(h));

  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  const normal = getWallNormal(p1, p2);

  // Center is offset from midpoint along normal by (radius - |h|) * sign(h)
  const distToCenter = (radius - Math.abs(h)) * (h > 0 ? -1 : 1);
  const center: Point2D = {
    x: midX + normal.x * distToCenter,
    y: midY + normal.y * distToCenter,
  };

  const startAngle = Math.atan2(p1.y - center.y, p1.x - center.x);
  const endAngle = Math.atan2(p2.y - center.y, p2.x - center.x);

  // Arc angle
  const theta = 2 * Math.asin(Math.min(1, Math.max(-1, d / radius)));
  const arcLength = radius * theta;

  return {
    center,
    radius,
    startAngle,
    endAngle,
    counterClockwise: h > 0,
    length: arcLength,
    chordLength: chordLen,
  };
}

/**
 * Projects a point onto straight line segment.
 * Returns projection point, distance, and offset along segment from p1.
 */
export function projectPointOntoSegment(
  p: Point2D,
  p1: Point2D,
  p2: Point2D
): { point: Point2D; offset: number; distance: number; t: number } {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return { point: p1, offset: 0, distance: distance(p, p1), t: 0 };
  }

  // Parameter t of projection onto line
  const t = Math.max(0, Math.min(1, ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / lenSq));
  const projPoint: Point2D = {
    x: p1.x + t * dx,
    y: p1.y + t * dy,
  };

  const totalLen = Math.sqrt(lenSq);
  return {
    point: projPoint,
    offset: t * totalLen,
    distance: distance(p, projPoint),
    t,
  };
}

/**
 * Clamps door or window offset to ensure it fits entirely on the wall.
 */
export function clampOffset(offset: number, itemWidth: number, wallLength: number): number {
  if (wallLength <= itemWidth) return 0;
  return Math.max(0, Math.min(offset, wallLength - itemWidth));
}

/**
 * Computes world transform and points for a door attached to a wall.
 */
export function getDoorWorldPosition(
  wall: WallElement | CurveWallElement,
  door: DoorElement
): {
  center: Point2D;
  startPoint: Point2D;
  endPoint: Point2D;
  angleDeg: number;
  swingArcStart: Point2D;
  swingArcEnd: Point2D;
} {
  const wallLen =
    wall.type === 'wall' ? getWallLength(wall) : getCurveWallArc(wall).length;
  const safeOffset = clampOffset(door.offset, door.width, wallLen);

  if (wall.type === 'wall') {
    const totalDist = distance(wall.start, wall.end);
    const u = totalDist > 0 ? safeOffset / totalDist : 0;
    const u2 = totalDist > 0 ? (safeOffset + door.width) / totalDist : 0;

    const startPoint: Point2D = {
      x: wall.start.x + (wall.end.x - wall.start.x) * u,
      y: wall.start.y + (wall.end.y - wall.start.y) * u,
    };
    const endPoint: Point2D = {
      x: wall.start.x + (wall.end.x - wall.start.x) * u2,
      y: wall.start.y + (wall.end.y - wall.start.y) * u2,
    };

    const center: Point2D = {
      x: (startPoint.x + endPoint.x) / 2,
      y: (startPoint.y + endPoint.y) / 2,
    };

    const wallAngle = angleDeg(wall.start, wall.end);

    return {
      center,
      startPoint,
      endPoint,
      angleDeg: wallAngle,
      swingArcStart: startPoint,
      swingArcEnd: endPoint,
    };
  } else {
    // Curved wall door position
    const arc = getCurveWallArc(wall);
    const angleRange = arc.counterClockwise
      ? (arc.endAngle - arc.startAngle + Math.PI * 2) % (Math.PI * 2)
      : (arc.startAngle - arc.endAngle + Math.PI * 2) % (Math.PI * 2);

    const t = arc.length > 0 ? safeOffset / arc.length : 0;
    const angle1 = arc.startAngle + (arc.counterClockwise ? 1 : -1) * t * angleRange;
    const t2 = arc.length > 0 ? (safeOffset + door.width) / arc.length : 0;
    const angle2 = arc.startAngle + (arc.counterClockwise ? 1 : -1) * t2 * angleRange;

    const startPoint: Point2D = {
      x: arc.center.x + Math.cos(angle1) * arc.radius,
      y: arc.center.y + Math.sin(angle1) * arc.radius,
    };
    const endPoint: Point2D = {
      x: arc.center.x + Math.cos(angle2) * arc.radius,
      y: arc.center.y + Math.sin(angle2) * arc.radius,
    };

    return {
      center: { x: (startPoint.x + endPoint.x) / 2, y: (startPoint.y + endPoint.y) / 2 },
      startPoint,
      endPoint,
      angleDeg: angleDeg(startPoint, endPoint),
      swingArcStart: startPoint,
      swingArcEnd: endPoint,
    };
  }
}

/**
 * Computes world transform and points for a window attached to a wall.
 */
export function getWindowWorldPosition(
  wall: WallElement | CurveWallElement,
  window: WindowElement
): {
  center: Point2D;
  startPoint: Point2D;
  endPoint: Point2D;
  angleDeg: number;
} {
  const wallLen =
    wall.type === 'wall' ? getWallLength(wall) : getCurveWallArc(wall).length;
  const safeOffset = clampOffset(window.offset, window.width, wallLen);

  if (wall.type === 'wall') {
    const totalDist = distance(wall.start, wall.end);
    const u1 = totalDist > 0 ? safeOffset / totalDist : 0;
    const u2 = totalDist > 0 ? (safeOffset + window.width) / totalDist : 0;

    const startPoint: Point2D = {
      x: wall.start.x + (wall.end.x - wall.start.x) * u1,
      y: wall.start.y + (wall.end.y - wall.start.y) * u1,
    };
    const endPoint: Point2D = {
      x: wall.start.x + (wall.end.x - wall.start.x) * u2,
      y: wall.start.y + (wall.end.y - wall.start.y) * u2,
    };

    return {
      center: { x: (startPoint.x + endPoint.x) / 2, y: (startPoint.y + endPoint.y) / 2 },
      startPoint,
      endPoint,
      angleDeg: angleDeg(wall.start, wall.end),
    };
  } else {
    const arc = getCurveWallArc(wall);
    const angleRange = arc.counterClockwise
      ? (arc.endAngle - arc.startAngle + Math.PI * 2) % (Math.PI * 2)
      : (arc.startAngle - arc.endAngle + Math.PI * 2) % (Math.PI * 2);

    const t1 = arc.length > 0 ? safeOffset / arc.length : 0;
    const a1 = arc.startAngle + (arc.counterClockwise ? 1 : -1) * t1 * angleRange;
    const t2 = arc.length > 0 ? (safeOffset + window.width) / arc.length : 0;
    const a2 = arc.startAngle + (arc.counterClockwise ? 1 : -1) * t2 * angleRange;

    const startPoint: Point2D = {
      x: arc.center.x + Math.cos(a1) * arc.radius,
      y: arc.center.y + Math.sin(a1) * arc.radius,
    };
    const endPoint: Point2D = {
      x: arc.center.x + Math.cos(a2) * arc.radius,
      y: arc.center.y + Math.sin(a2) * arc.radius,
    };

    return {
      center: { x: (startPoint.x + endPoint.x) / 2, y: (startPoint.y + endPoint.y) / 2 },
      startPoint,
      endPoint,
      angleDeg: angleDeg(startPoint, endPoint),
    };
  }
}

/**
 * Area & Perimeter calculations
 */
export function calculateBoxArea(width: number, height: number): number {
  return Math.abs(width * height);
}

export function calculateBoxPerimeter(width: number, height: number): number {
  return 2 * (Math.abs(width) + Math.abs(height));
}

export function calculateCircleArea(radius: number): number {
  return Math.PI * radius * radius;
}

export function calculateCirclePerimeter(radius: number): number {
  return 2 * Math.PI * radius;
}
