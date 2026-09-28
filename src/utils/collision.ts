/**
 * 2D & Overhead Collision Detection and Clearance Verification for Vehicle Entry Check.
 * Uses Separating Axis Theorem (SAT) and distance metrics.
 * Pure unit-testable functions without external physics engine dependencies.
 */

import {
  Point2D,
  Vehicle,
  GateElement,
  ObstacleElement,
  RoadElement,
  WallElement,
  CurveWallElement,
  VehiclePose,
  CollisionDetail,
  VehicleCheckResult,
} from '../models/types';
import { getWallLength, distance } from './geometry';

/**
 * Projects a polygon onto an axis and returns [min, max]
 */
function projectPolygonOnAxis(poly: Point2D[], axis: Point2D): [number, number] {
  let min = poly[0].x * axis.x + poly[0].y * axis.y;
  let max = min;
  for (let i = 1; i < poly.length; i++) {
    const val = poly[i].x * axis.x + poly[i].y * axis.y;
    if (val < min) min = val;
    if (val > max) max = val;
  }
  return [min, max];
}

/**
 * Separating Axis Theorem (SAT) to check if two convex polygons overlap
 */
export function satPolygonsOverlap(polyA: Point2D[], polyB: Point2D[]): boolean {
  const polys = [polyA, polyB];
  for (let p = 0; p < 2; p++) {
    const currentPoly = polys[p];
    for (let i = 0; i < currentPoly.length; i++) {
      const p1 = currentPoly[i];
      const p2 = currentPoly[(i + 1) % currentPoly.length];
      const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
      const edgeLen = Math.hypot(edge.x, edge.y);
      if (edgeLen < 1e-6) continue;
      // Perpendicular normal axis
      const axis = { x: -edge.y / edgeLen, y: edge.x / edgeLen };

      const [minA, maxA] = projectPolygonOnAxis(polyA, axis);
      const [minB, maxB] = projectPolygonOnAxis(polyB, axis);

      if (maxA < minB || maxB < minA) {
        return false; // Separating axis found
      }
    }
  }
  return true; // Overlap on all axes
}

/**
 * Calculates distance from point to line segment
 */
export function distPointToSegment(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(p, a);

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

/**
 * Minimum distance between polygon points and a line segment
 */
export function minDistancePolyToSegment(poly: Point2D[], a: Point2D, b: Point2D): number {
  let minD = Infinity;
  for (const pt of poly) {
    const d = distPointToSegment(pt, a, b);
    if (d < minD) minD = d;
  }
  return minD;
}

/**
 * Minimum distance between two polygons
 */
export function minDistanceBetweenPolys(polyA: Point2D[], polyB: Point2D[]): number {
  let minD = Infinity;
  for (let i = 0; i < polyB.length; i++) {
    const b1 = polyB[i];
    const b2 = polyB[(i + 1) % polyB.length];
    const d = minDistancePolyToSegment(polyA, b1, b2);
    if (d < minD) minD = d;
  }
  for (let j = 0; j < polyA.length; j++) {
    const a1 = polyA[j];
    const a2 = polyA[(j + 1) % polyA.length];
    const d = minDistancePolyToSegment(polyB, a1, a2);
    if (d < minD) minD = d;
  }
  return minD;
}

export interface GateGeometry {
  gate: GateElement;
  wall: WallElement | CurveWallElement;
  postLeft: Point2D[]; // 4 corners of left pillar
  postRight: Point2D[]; // 4 corners of right pillar
  clearOpeningCenter: Point2D;
  leftPostInnerEdge: Point2D;
  rightPostInnerEdge: Point2D;
}

/**
 * Calculates world positions and pillar bounding boxes of a gate in a wall
 */
export function getGateGeometry(
  gate: GateElement,
  wall: WallElement | CurveWallElement
): GateGeometry | null {
  const wallLen = getWallLength(wall);
  if (wallLen <= 0) return null;

  const dx = (wall.end.x - wall.start.x) / wallLen;
  const dy = (wall.end.y - wall.start.y) / wallLen;
  const perpX = -dy;
  const perpY = dx;

  const postThickness = gate.postThickness || 18;
  const postDepth = (wall.thickness || 9) + 4;

  const gateStartX = wall.start.x + dx * gate.offset;
  const gateStartY = wall.start.y + dy * gate.offset;
  const gateEndX = wall.start.x + dx * (gate.offset + gate.width);
  const gateEndY = wall.start.y + dy * (gate.offset + gate.width);

  // Left post (from offset - postThickness to offset)
  const lp1 = {
    x: gateStartX - dx * postThickness - perpX * (postDepth / 2),
    y: gateStartY - dy * postThickness - perpY * (postDepth / 2),
  };
  const lp2 = {
    x: gateStartX - perpX * (postDepth / 2),
    y: gateStartY - perpY * (postDepth / 2),
  };
  const lp3 = {
    x: gateStartX + perpX * (postDepth / 2),
    y: gateStartY + perpY * (postDepth / 2),
  };
  const lp4 = {
    x: gateStartX - dx * postThickness + perpX * (postDepth / 2),
    y: gateStartY - dy * postThickness + perpY * (postDepth / 2),
  };

  // Right post (from offset + width to offset + width + postThickness)
  const rp1 = {
    x: gateEndX - perpX * (postDepth / 2),
    y: gateEndY - perpY * (postDepth / 2),
  };
  const rp2 = {
    x: gateEndX + dx * postThickness - perpX * (postDepth / 2),
    y: gateEndY + dy * postThickness - perpY * (postDepth / 2),
  };
  const rp3 = {
    x: gateEndX + dx * postThickness + perpX * (postDepth / 2),
    y: gateEndY + dy * postThickness + perpY * (postDepth / 2),
  };
  const rp4 = {
    x: gateEndX + perpX * (postDepth / 2),
    y: gateEndY + perpY * (postDepth / 2),
  };

  return {
    gate,
    wall,
    postLeft: [lp1, lp2, lp3, lp4],
    postRight: [rp1, rp2, rp3, rp4],
    clearOpeningCenter: {
      x: (gateStartX + gateEndX) / 2,
      y: (gateStartY + gateEndY) / 2,
    },
    leftPostInnerEdge: { x: gateStartX, y: gateStartY },
    rightPostInnerEdge: { x: gateEndX, y: gateEndY },
  };
}

export interface ObstaclePolygon {
  obstacle: ObstacleElement;
  points: Point2D[];
}

export function getObstaclePolygon(obstacle: ObstacleElement): ObstaclePolygon {
  const { x, y, width, height, rotation = 0 } = obstacle;
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const halfW = width / 2;
  const halfH = height / 2;

  const corners: Point2D[] = [
    { x: -halfW, y: -halfH },
    { x: halfW, y: -halfH },
    { x: halfW, y: halfH },
    { x: -halfW, y: halfH },
  ].map((c) => ({
    x: x + c.x * cos - c.y * sin,
    y: y + c.x * sin + c.y * cos,
  }));

  return { obstacle, points: corners };
}

/**
 * Full Collision and Clearance Evaluation across all simulated poses
 */
export function evaluateVehicleCheck(
  vehicle: Vehicle,
  poses: VehiclePose[],
  walls: (WallElement | CurveWallElement)[],
  gates: GateElement[],
  obstacles: ObstacleElement[],
  roads: RoadElement[],
  options: {
    allowFootpath?: boolean;
    safetyMargin?: number; // default 12 inches
  } = {}
): VehicleCheckResult {
  const { allowFootpath = false, safetyMargin = 12 } = options;
  const collisions: CollisionDetail[] = [];
  const suggestions: string[] = [];

  let minSideClearance = Infinity;
  let minSideClearancePoint: Point2D | undefined;

  let minGateClearance = Infinity;
  let minGateClearancePoint: Point2D | undefined;

  let minOverheadClearance = Infinity;
  let minOverheadClearancePoint: Point2D | undefined;
  let overheadObstacleName: string | undefined;

  // Prepare Gate Geometries
  const gateGeoms: GateGeometry[] = [];
  for (const g of gates) {
    const hostWall = walls.find((w) => w.id === g.wallId);
    if (hostWall) {
      const gg = getGateGeometry(g, hostWall);
      if (gg) gateGeoms.push(gg);
    }
  }

  // Prepare Obstacle Polygons
  const obstaclePolys = obstacles.map((ob) => getObstaclePolygon(ob));

  // Build wall segment exclusion windows where gates exist
  const wallSegmentsWithGaps: { wall: WallElement | CurveWallElement; p1: Point2D; p2: Point2D }[] = [];
  for (const w of walls) {
    const wallGates = gates.filter((g) => g.wallId === w.id);
    const wallLen = getWallLength(w);
    if (wallLen <= 0) continue;

    if (wallGates.length === 0) {
      wallSegmentsWithGaps.push({ wall: w, p1: w.start, p2: w.end });
    } else {
      const dx = (w.end.x - w.start.x) / wallLen;
      const dy = (w.end.y - w.start.y) / wallLen;

      // Sort gates by offset
      wallGates.sort((a, b) => a.offset - b.offset);
      let curOffset = 0;
      for (const g of wallGates) {
        if (g.offset > curOffset + 2) {
          wallSegmentsWithGaps.push({
            wall: w,
            p1: { x: w.start.x + dx * curOffset, y: w.start.y + dy * curOffset },
            p2: { x: w.start.x + dx * g.offset, y: w.start.y + dy * g.offset },
          });
        }
        curOffset = Math.max(curOffset, g.offset + g.width);
      }
      if (curOffset < wallLen - 2) {
        wallSegmentsWithGaps.push({
          wall: w,
          p1: { x: w.start.x + dx * curOffset, y: w.start.y + dy * curOffset },
          p2: w.end,
        });
      }
    }
  }

  // Iterate over vehicle poses along path
  for (let i = 0; i < poses.length; i++) {
    const pose = poses[i];
    const carPoly = pose.corners;

    // 1. Collision with Gate Posts
    for (const gg of gateGeoms) {
      // Check left post
      if (satPolygonsOverlap(carPoly, gg.postLeft)) {
        collisions.push({
          x: gg.leftPostInnerEdge.x,
          y: gg.leftPostInnerEdge.y,
          obstacleId: gg.gate.id,
          obstacleName: `${gg.gate.label || 'Gate'} (Left Pillar)`,
          type: 'gate_post',
          description: `Gari gate ke bayen pillar (Left post) se takra rahi hai`,
        });
      }
      // Check right post
      if (satPolygonsOverlap(carPoly, gg.postRight)) {
        collisions.push({
          x: gg.rightPostInnerEdge.x,
          y: gg.rightPostInnerEdge.y,
          obstacleId: gg.gate.id,
          obstacleName: `${gg.gate.label || 'Gate'} (Right Pillar)`,
          type: 'gate_post',
          description: `Gari gate ke dayen pillar (Right post) se takra rahi hai`,
        });
      }

      // Check Gate Side Clearances
      const dLeft = minDistancePolyToSegment(carPoly, gg.leftPostInnerEdge, gg.leftPostInnerEdge);
      const dRight = minDistancePolyToSegment(carPoly, gg.rightPostInnerEdge, gg.rightPostInnerEdge);
      const gateCl = Math.min(dLeft, dRight);
      if (gateCl < minGateClearance) {
        minGateClearance = gateCl;
        minGateClearancePoint = dLeft < dRight ? gg.leftPostInnerEdge : gg.rightPostInnerEdge;
      }

      // Check Gate Overhead Clearance
      const gateClearHeight = gg.gate.height || 120;
      const overheadCl = gateClearHeight - vehicle.height;
      if (overheadCl < minOverheadClearance) {
        minOverheadClearance = overheadCl;
        minOverheadClearancePoint = gg.clearOpeningCenter;
        overheadObstacleName = `${gg.gate.label || 'Gate'} Top Arch`;
      }
      if (overheadCl < 0) {
        collisions.push({
          x: gg.clearOpeningCenter.x,
          y: gg.clearOpeningCenter.y,
          obstacleId: gg.gate.id,
          obstacleName: `${gg.gate.label || 'Gate'} Top Beam`,
          type: 'overhead',
          description: `Gari ki unchayi (${(vehicle.height / 12).toFixed(1)}ft) gate ki clear unchayi (${(gateClearHeight / 12).toFixed(1)}ft) se zyada hai!`,
        });
      }
    }

    // 2. Collision with Walls
    for (const seg of wallSegmentsWithGaps) {
      const d = minDistancePolyToSegment(carPoly, seg.p1, seg.p2);
      if (d < minSideClearance) {
        minSideClearance = d;
        minSideClearancePoint = { x: (seg.p1.x + seg.p2.x) / 2, y: (seg.p1.y + seg.p2.y) / 2 };
      }
      const wallHalfThick = (seg.wall.thickness || 9) / 2;
      if (d < wallHalfThick) {
        collisions.push({
          x: (seg.p1.x + seg.p2.x) / 2,
          y: (seg.p1.y + seg.p2.y) / 2,
          obstacleId: seg.wall.id,
          obstacleName: seg.wall.label || 'Wall',
          type: 'wall',
          description: `Gari deewar (Wall) se takra rahi hai`,
        });
      }
    }

    // 3. Collision with Obstacles
    for (const obPoly of obstaclePolys) {
      const ob = obPoly.obstacle;
      const isOverlap = satPolygonsOverlap(carPoly, obPoly.points);

      // Overhead check if obstacle is elevated (e.g., hanging wire, balcony, arch)
      if (ob.isOverhead || ob.elevation !== undefined) {
        const elevation = ob.elevation || 0;
        const clearance = elevation - vehicle.height;
        if (isOverlap) {
          if (clearance < minOverheadClearance) {
            minOverheadClearance = clearance;
            minOverheadClearancePoint = { x: ob.x, y: ob.y };
            overheadObstacleName = ob.label || ob.obstacleType;
          }
          if (clearance < 0) {
            collisions.push({
              x: ob.x,
              y: ob.y,
              obstacleId: ob.id,
              obstacleName: ob.label || ob.obstacleType,
              type: 'overhead',
              description: `Gari ooper latki cheez (${ob.label || ob.obstacleType}) se takra rahi hai. Clearance: ${(clearance / 12).toFixed(1)}ft`,
            });
          }
        }
      } else {
        // Ground obstacle
        const d = minDistanceBetweenPolys(carPoly, obPoly.points);
        if (d < minSideClearance) {
          minSideClearance = d;
          minSideClearancePoint = { x: ob.x, y: ob.y };
        }
        if (isOverlap) {
          collisions.push({
            x: ob.x,
            y: ob.y,
            obstacleId: ob.id,
            obstacleName: ob.label || ob.obstacleType,
            type: 'obstacle',
            description: `Gari obstacle (${ob.label || ob.obstacleType}) se takra rahi hai`,
          });
        }
      }
    }

    // 4. Road Edge and Footpath Boundary Check
    if (!allowFootpath && roads.length > 0) {
      // Check if vehicle body leaves roads
      for (const road of roads) {
        const roadLen = distance(road.start, road.end);
        if (roadLen > 0) {
          const rdx = (road.end.x - road.start.x) / roadLen;
          const rdy = (road.end.y - road.start.y) / roadLen;
          const rPerpX = -rdy;
          const rPerpY = rdx;
          const halfRoadW = road.width / 2;
          const footpathW = road.footpathWidth || 36;

          // Road footpath edges
          const curbLeft1 = {
            x: road.start.x - rPerpX * (halfRoadW - (road.hasFootpath ? footpathW : 0)),
            y: road.start.y - rPerpY * (halfRoadW - (road.hasFootpath ? footpathW : 0)),
          };
          const curbLeft2 = {
            x: road.end.x - rPerpX * (halfRoadW - (road.hasFootpath ? footpathW : 0)),
            y: road.end.y - rPerpY * (halfRoadW - (road.hasFootpath ? footpathW : 0)),
          };

          // If car is close to the road and hits footpath
          const distToRoadCenter = distPointToSegment(
            { x: pose.x, y: pose.y },
            road.start,
            road.end
          );
          if (distToRoadCenter < road.width * 1.5) {
            const dLeft = minDistancePolyToSegment(carPoly, curbLeft1, curbLeft2);
            if (dLeft < 0) {
              collisions.push({
                x: pose.x,
                y: pose.y,
                obstacleName: `${road.name || 'Road'} Footpath`,
                type: 'road_edge',
                description: `Gari footpath / patri ke upar charh rahi hai`,
              });
            }
          }
        }
      }
    }
  }

  // Deduplicate collisions by proximity
  const uniqueCollisions: CollisionDetail[] = [];
  for (const c of collisions) {
    const isDuplicate = uniqueCollisions.some(
      (uc) => uc.obstacleName === c.obstacleName && Math.hypot(uc.x - c.x, uc.y - c.y) < 36
    );
    if (!isDuplicate) {
      uniqueCollisions.push(c);
    }
  }

  // Architectural Recommendations / Suggestions
  const totalVehicleWidthWithMirrors = vehicle.width + (vehicle.mirrorExtraWidth || 8) * 2;
  const suggestedGateWidth = Math.ceil((totalVehicleWidthWithMirrors + safetyMargin * 2) / 12) * 12;

  if (gates.length > 0) {
    const activeGate = gates[0];
    if (activeGate.width < suggestedGateWidth) {
      suggestions.push(
        `Minimum gate width needed: ${(suggestedGateWidth / 12).toFixed(1)} ft (${suggestedGateWidth}") — current gate is ${(activeGate.width / 12).toFixed(1)} ft.`
      );
    }
  }

  if (roads.length > 0) {
    const minStreetWidthNeeded = Math.ceil((vehicle.minTurningRadius * 0.9) / 12) * 12;
    if (roads[0].width < minStreetWidthNeeded) {
      suggestions.push(
        `Minimum street width needed: ${(minStreetWidthNeeded / 12).toFixed(1)} ft for turning without reversing.`
      );
    }
  }

  if (minGateClearance < safetyMargin && minGateClearance >= 0) {
    suggestions.push(
      `Gate corner radius / chamfer needed: 1.5 ft (18 in) cut at boundary wall to provide safe turning margin.`
    );
  }

  // Check if turn requires multi-point reversing
  const hasReverseWaypoint = poses.some((p) => p.isReverse);
  if (uniqueCollisions.length > 0 && !hasReverseWaypoint) {
    suggestions.push(
      `Turn is too sharp in single forward move. Try a 3-point turn / reverse segment in the path.`
    );
  }

  // Determine Verdict
  let verdict: VehicleCheckResult['verdict'] = 'pass';
  if (uniqueCollisions.length > 0 || minOverheadClearance < 0) {
    verdict = 'fail';
  } else if (
    minSideClearance < safetyMargin ||
    minGateClearance < safetyMargin ||
    minOverheadClearance < 12
  ) {
    verdict = 'tight';
  }

  return {
    verdict,
    minSideClearance: Number.isFinite(minSideClearance) ? minSideClearance : 999,
    minSideClearancePoint,
    minGateClearance: Number.isFinite(minGateClearance) ? minGateClearance : 999,
    minGateClearancePoint,
    minOverheadClearance: Number.isFinite(minOverheadClearance) ? minOverheadClearance : 999,
    minOverheadClearancePoint,
    overheadObstacleName,
    collisions: uniqueCollisions,
    suggestions,
    sweptPolygon: [],
    simulatedPoses: poses,
  };
}
