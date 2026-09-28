import { describe, it, expect } from 'vitest';
import {
  snapToGrid,
  snapToEndpoints,
  snapToMidpoints,
  snapAngle,
} from '../snapping';
import {
  clampOffset,
  projectPointOntoSegment,
  distance,
} from '../geometry';
import {
  splitWallAtPoint,
  isPointOnWallInterior,
  getOrCreateWallNode,
} from '../wallJoin';
import { WallElement, DoorElement, WindowElement, BoxElement, CircleElement } from '../../models/types';

describe('Interaction Verification Unit Tests', () => {
  describe('1. Resize-to-Inches Conversion', () => {
    it('converts transform scale factor directly into inches for Box elements', () => {
      const originalBox: BoxElement = {
        id: 'box-1',
        type: 'box',
        x: 100,
        y: 100,
        width: 120, // 10 ft
        height: 144, // 12 ft
        rotation: 0,
      };

      // Simulating a 1.5x scale transform from Transformer
      const scaleX = 1.5;
      const scaleY = 2.0;

      const newWidth = Math.max(6, Math.round(originalBox.width * Math.abs(scaleX)));
      const newHeight = Math.max(6, Math.round(originalBox.height * Math.abs(scaleY)));

      expect(newWidth).toBe(180); // 15 ft in inches
      expect(newHeight).toBe(288); // 24 ft in inches
    });

    it('converts transform scale factor into exact radius inches for Circle elements', () => {
      const originalCircle: CircleElement = {
        id: 'circle-1',
        type: 'circle',
        x: 200,
        y: 200,
        radius: 60, // 5 ft radius (10 ft diameter)
      };

      const scaleX = 1.25;
      const scaleY = 1.25;
      const avgScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
      const newRadius = Math.max(4, Math.round(originalCircle.radius * avgScale));

      expect(newRadius).toBe(75); // 6.25 ft in inches
    });

    it('enforces minimum dimensions to prevent negative or inverted geometry', () => {
      const originalBox: BoxElement = {
        id: 'box-2',
        type: 'box',
        x: 50,
        y: 50,
        width: 24,
        height: 24,
        rotation: 0,
      };

      const tinyScale = 0.01;
      const newWidth = Math.max(6, Math.round(originalBox.width * Math.abs(tinyScale)));
      const newHeight = Math.max(6, Math.round(originalBox.height * Math.abs(tinyScale)));

      expect(newWidth).toBeGreaterThanOrEqual(6);
      expect(newHeight).toBeGreaterThanOrEqual(6);
    });
  });

  describe('2. Door / Window Constrained to Wall', () => {
    const testWall: WallElement = {
      id: 'wall-main',
      type: 'wall',
      start: { x: 0, y: 0 },
      end: { x: 240, y: 0 }, // 20 ft wall
      thickness: 9,
    };

    it('smoothly slides along wall line and clamps strictly within wall length', () => {
      const doorWidth = 36;
      const wallLen = 240;

      // Sliding at normal offset
      expect(clampOffset(60, doorWidth, wallLen)).toBe(60);

      // Attempt to slide past the start (< 0)
      expect(clampOffset(-40, doorWidth, wallLen)).toBe(0);

      // Attempt to slide past the end (> wallLen - width)
      expect(clampOffset(230, doorWidth, wallLen)).toBe(204); // 240 - 36
    });

    it('projects arbitrary drag point onto wall segment and finds valid offset', () => {
      // Dragging mouse slightly off the wall line (y = 15)
      const mousePos = { x: 90, y: 15 };
      const proj = projectPointOntoSegment(mousePos, testWall.start, testWall.end);

      expect(proj.offset).toBeCloseTo(90);
      expect(proj.distance).toBeCloseTo(15);

      const doorWidth = 36;
      const safeOffset = clampOffset(proj.offset - doorWidth / 2, doorWidth, 240);
      expect(safeOffset).toBe(72); // 90 - 18
    });
  });

  describe('3. Snapping Engine', () => {
    it('snaps point to grid within threshold and leaves free outside threshold', () => {
      const gridSize = 12; // 1 ft grid
      const snapDist = 4;

      // Point near grid line (x = 23, nearest is 24)
      const nearPoint = { x: 23, y: 37 }; // 24, 36
      const snapResult = snapToGrid(nearPoint, gridSize, snapDist);
      expect(snapResult.snapped).toBe(true);
      expect(snapResult.point.x).toBe(24);
      expect(snapResult.point.y).toBe(36);

      // Point far from grid line (x = 28, dist is 4 to 24 and 8 to 36)
      const farPoint = { x: 28, y: 28 };
      const farResult = snapToGrid(farPoint, gridSize, 2);
      expect(farResult.snapped).toBe(false);
    });

    it('snaps angle to standard CAD increments (0, 45, 90, 180 degrees)', () => {
      const origin = { x: 100, y: 100 };
      // Almost horizontal (dx = 100, dy = 3 -> angle ~ 1.7 deg)
      const nearlyHorizontal = { x: 200, y: 103 };
      const res0 = snapAngle(origin, nearlyHorizontal, 45, 5);
      expect(res0.snapped).toBe(true);
      expect(res0.point.y).toBeCloseTo(100);

      // Almost 45 degrees
      const nearly45 = { x: 200, y: 198 };
      const res45 = snapAngle(origin, nearly45, 45, 5);
      expect(res45.snapped).toBe(true);
      const dx = res45.point.x - origin.x;
      const dy = res45.point.y - origin.y;
      expect(Math.abs(dx - dy)).toBeLessThan(0.01);
    });

    it('snaps to endpoints and midpoints of existing walls', () => {
      const walls: WallElement[] = [
        {
          id: 'w1',
          type: 'wall',
          start: { x: 0, y: 0 },
          end: { x: 100, y: 0 },
          thickness: 9,
        },
      ];

      // Near endpoint (98, 2)
      const endSnap = snapToEndpoints({ x: 98, y: 2 }, walls, 5);
      expect(endSnap.snapped).toBe(true);
      expect(endSnap.point).toEqual({ x: 100, y: 0 });

      // Near midpoint (51, -1)
      const midSnap = snapToMidpoints({ x: 51, y: -1 }, walls, 5);
      expect(midSnap.snapped).toBe(true);
      expect(midSnap.point).toEqual({ x: 50, y: 0 });
    });
  });

  describe('4. T-Junction Splitting and Wall Node Connections', () => {
    it('detects point on wall interior and splits into two clean wall segments', () => {
      const hostWall: WallElement = {
        id: 'host',
        type: 'wall',
        start: { x: 0, y: 0 },
        end: { x: 200, y: 0 },
        thickness: 9,
        startNodeId: 'node-A',
        endNodeId: 'node-B',
      };

      const splitPt = { x: 80, y: 0 };
      const interiorCheck = isPointOnWallInterior(splitPt, hostWall, 5, 10);
      expect(interiorCheck.onInterior).toBe(true);

      const splitNodeId = 'node-junction-1';
      const result = splitWallAtPoint(hostWall, splitPt, splitNodeId, [], []);

      expect(result.firstWall.start).toEqual({ x: 0, y: 0 });
      expect(result.firstWall.end).toEqual({ x: 80, y: 0 });
      expect(result.firstWall.startNodeId).toBe('node-A');
      expect(result.firstWall.endNodeId).toBe('node-junction-1');

      expect(result.secondWall.start).toEqual({ x: 80, y: 0 });
      expect(result.secondWall.end).toEqual({ x: 200, y: 0 });
      expect(result.secondWall.startNodeId).toBe('node-junction-1');
      expect(result.secondWall.endNodeId).toBe('node-B');
    });

    it('correctly re-maps doors and windows when host wall is split', () => {
      const hostWall: WallElement = {
        id: 'host',
        type: 'wall',
        start: { x: 0, y: 0 },
        end: { x: 200, y: 0 },
        thickness: 9,
      };

      const doors: DoorElement[] = [
        {
          id: 'door-in-first-half',
          type: 'door',
          wallId: 'host',
          offset: 20,
          width: 36,
          height: 84,
        },
        {
          id: 'door-in-second-half',
          type: 'door',
          wallId: 'host',
          offset: 140,
          width: 36,
          height: 84,
        },
      ];

      const splitPt = { x: 100, y: 0 };
      const result = splitWallAtPoint(hostWall, splitPt, 'node-split', doors, []);

      // First door should stay attached to wall 1 with same offset 20
      expect(result.reassignedDoors).toHaveLength(2);
      const d1 = result.reassignedDoors.find((d) => d.id === 'door-in-first-half')!;
      expect(d1.wallId).toBe(result.firstWall.id);
      expect(d1.offset).toBe(20);

      // Second door should be reassigned to wall 2 with offset recomputed (140 - 100 = 40)
      const d2 = result.reassignedDoors.find((d) => d.id === 'door-in-second-half')!;
      expect(d2.wallId).toBe(result.secondWall.id);
      expect(d2.offset).toBe(40);
    });

    it('creates or finds existing wall node within threshold radius', () => {
      const nodes = [
        { id: 'n1', x: 0, y: 0 },
        { id: 'n2', x: 100, y: 100 },
      ];

      // Point very close to n2
      const nearN2 = { x: 102, y: 101 };
      const res = getOrCreateWallNode(nearN2, nodes, 8);
      expect(res.node.id).toBe('n2');
      expect(res.updatedNodes).toHaveLength(2);

      // Point far from any node
      const newPt = { x: 300, y: 400 };
      const resNew = getOrCreateWallNode(newPt, nodes, 8);
      expect(resNew.node.id).not.toBe('n1');
      expect(resNew.node.id).not.toBe('n2');
      expect(resNew.updatedNodes).toHaveLength(3);
    });
  });
});
