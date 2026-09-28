import { Point2D, WallElement, DetectedRoom } from '../models/types';
import { distance } from './geometry';

/**
 * Calculates signed polygon area using Shoelace formula.
 * Positive = Counter-Clockwise (CCW), Negative = Clockwise (CW).
 */
export function calculatePolygonSignedArea(points: Point2D[]): number {
  const n = points.length;
  if (n < 3) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    sum += p1.x * p2.y - p2.x * p1.y;
  }
  return sum / 2;
}

/**
 * Calculates absolute polygon area.
 */
export function calculatePolygonArea(points: Point2D[]): number {
  return Math.abs(calculatePolygonSignedArea(points));
}

/**
 * Calculates polygon perimeter in inches.
 */
export function calculatePolygonPerimeter(points: Point2D[]): number {
  const n = points.length;
  if (n < 2) return 0;
  let perim = 0;
  for (let i = 0; i < n; i++) {
    perim += distance(points[i], points[(i + 1) % n]);
  }
  return perim;
}

/**
 * Calculates polygon centroid (center of mass).
 */
export function calculatePolygonCentroid(points: Point2D[]): Point2D {
  const n = points.length;
  if (n === 0) return { x: 0, y: 0 };
  if (n === 1) return { ...points[0] };
  if (n === 2) return { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };

  const signedArea = calculatePolygonSignedArea(points);
  if (Math.abs(signedArea) < 0.001) {
    // Degenerate polygon: fallback to average
    let sumX = 0, sumY = 0;
    points.forEach((p) => {
      sumX += p.x;
      sumY += p.y;
    });
    return { x: sumX / n, y: sumY / n };
  }

  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const factor = p1.x * p2.y - p2.x * p1.y;
    cx += (p1.x + p2.x) * factor;
    cy += (p1.y + p2.y) * factor;
  }

  const factor6A = 6 * signedArea;
  return {
    x: cx / factor6A,
    y: cy / factor6A,
  };
}

/**
 * Detects closed planar loops formed by straight walls.
 * Tolerance is endpoint snap radius in inches (default 6 in).
 */
export function detectRoomsFromWalls(
  walls: WallElement[],
  toleranceInches = 6
): DetectedRoom[] {
  if (walls.length < 3) return [];

  // Step 1: Cluster endpoints to find unique vertex nodes
  interface VertexNode {
    id: number;
    point: Point2D;
  }
  const vertices: VertexNode[] = [];

  function getOrCreateVertex(pt: Point2D): number {
    for (const v of vertices) {
      if (distance(v.point, pt) <= toleranceInches) {
        return v.id;
      }
    }
    const newId = vertices.length;
    vertices.push({ id: newId, point: { x: pt.x, y: pt.y } });
    return newId;
  }

  // Step 2: Build graph edges
  interface Edge {
    from: number;
    to: number;
    angle: number; // angle from 'from' to 'to'
  }

  const adjacency: Map<number, Edge[]> = new Map();

  for (const wall of walls) {
    const v1 = getOrCreateVertex(wall.start);
    const v2 = getOrCreateVertex(wall.end);
    if (v1 === v2) continue; // skip degenerate zero-length walls

    const p1 = vertices[v1].point;
    const p2 = vertices[v2].point;

    const angle12 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const angle21 = Math.atan2(p1.y - p2.y, p1.x - p2.x);

    if (!adjacency.has(v1)) adjacency.set(v1, []);
    if (!adjacency.has(v2)) adjacency.set(v2, []);

    adjacency.get(v1)!.push({ from: v1, to: v2, angle: angle12 });
    adjacency.get(v2)!.push({ from: v2, to: v1, angle: angle21 });
  }

  // Sort outgoing edges around each vertex in counter-clockwise order
  for (const edges of adjacency.values()) {
    edges.sort((a, b) => a.angle - b.angle);
  }

  // Step 3: Extract planar faces using "leftmost turn" (CCW walk)
  const visitedDirectedEdges = new Set<string>();
  const edgeKey = (from: number, to: number) => `${from}->${to}`;

  const detectedCycles: Point2D[][] = [];

  for (const [u, edges] of adjacency.entries()) {
    for (const edge of edges) {
      const startKey = edgeKey(edge.from, edge.to);
      if (visitedDirectedEdges.has(startKey)) continue;

      // Follow next counter-clockwise edge
      const cycleVertices: number[] = [];
      let currFrom = edge.from;
      let currTo = edge.to;
      let isLoop = false;

      const pathEdges: string[] = [];

      for (let step = 0; step < 100; step++) {
        cycleVertices.push(currFrom);
        const currKey = edgeKey(currFrom, currTo);
        pathEdges.push(currKey);

        if (currTo === edge.from) {
          isLoop = true;
          break;
        }

        // At currTo, find the incoming edge angle (reverse of currFrom -> currTo)
        const incomingAngle = Math.atan2(
          vertices[currFrom].point.y - vertices[currTo].point.y,
          vertices[currFrom].point.x - vertices[currTo].point.x
        );

        const outEdges = adjacency.get(currTo);
        if (!outEdges || outEdges.length === 0) break;

        // Pick next edge: immediate counter-clockwise turn from incoming edge
        let bestEdge: Edge | null = null;
        let smallestTurn = Infinity;

        for (const outEdge of outEdges) {
          // Calculate turn angle relative to incoming angle in [0, 2pi)
          let turn = outEdge.angle - incomingAngle;
          while (turn <= 0) turn += 2 * Math.PI;
          while (turn > 2 * Math.PI) turn -= 2 * Math.PI;

          if (turn < smallestTurn) {
            smallestTurn = turn;
            bestEdge = outEdge;
          }
        }

        if (!bestEdge) break;

        currFrom = bestEdge.from;
        currTo = bestEdge.to;

        if (pathEdges.includes(edgeKey(currFrom, currTo))) {
          // Detected repeated sub-cycle
          break;
        }
      }

      if (isLoop && cycleVertices.length >= 3) {
        // Mark all traversed directed edges as visited
        pathEdges.forEach((k) => visitedDirectedEdges.add(k));

        const poly = cycleVertices.map((idx) => vertices[idx].point);
        const signedArea = calculatePolygonSignedArea(poly);

        // Counter-clockwise polygon with positive signed area corresponds to interior room face
        // Min area: ~15 sq ft = 2,160 sq in
        if (signedArea > 2160) {
          detectedCycles.push(poly);
        }
      }
    }
  }

  // Deduplicate overlapping detected rooms
  const rooms: DetectedRoom[] = [];
  let roomCount = 1;

  for (const poly of detectedCycles) {
    const area = calculatePolygonArea(poly);
    const perimeter = calculatePolygonPerimeter(poly);
    const centroid = calculatePolygonCentroid(poly);

    // Check if duplicate of already added room (similar centroid within 12 inches)
    const exists = rooms.some(
      (r) => distance(r.centroid, centroid) < 12 && Math.abs(r.areaSqInches - area) < 200
    );

    if (!exists) {
      rooms.push({
        id: `room-${roomCount}`,
        name: `Kamra ${roomCount}`,
        points: poly,
        centroid,
        areaSqInches: area,
        perimeterInches: perimeter,
      });
      roomCount++;
    }
  }

  return rooms;
}

export const polygonArea = calculatePolygonArea;
export const polygonCentroid = calculatePolygonCentroid;
