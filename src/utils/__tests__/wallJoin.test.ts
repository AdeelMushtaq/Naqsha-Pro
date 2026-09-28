import { describe, it, expect } from 'vitest';
import {
  calculateMiterCorner,
  getOrCreateWallNode,
  splitWallAtPoint,
  isPointOnWallInterior,
  findWallJunctions,
  getConnectedEndpointsMap,
  healCollinearWalls,
} from '../wallJoin';
import { WallElement, DoorElement, WindowElement } from '../../models/types';

describe('wallJoin tests', () => {
  it('calculates miter corner between two perpendicular walls', () => {
    const common = { x: 100, y: 100 };
    const arm1 = { x: 200, y: 100 };
    const arm2 = { x: 100, y: 200 };
    const miter = calculateMiterCorner(common, arm1, arm2, 9, 9);

    expect(miter.innerCorner).toBeDefined();
    expect(miter.outerCorner).toBeDefined();
    expect(miter.innerCorner.x).toBeGreaterThan(100);
    expect(miter.innerCorner.y).toBeGreaterThan(100);
    expect(miter.outerCorner.x).toBeLessThan(100);
    expect(miter.outerCorner.y).toBeLessThan(100);
  });

  it('snaps to existing wall node within tolerance or creates new one', () => {
    const existing = [
      { id: 'node-1', x: 50, y: 50 },
      { id: 'node-2', x: 150, y: 150 },
    ];

    const snapResult = getOrCreateWallNode({ x: 52, y: 51 }, existing, 6);
    expect(snapResult.isNew).toBe(false);
    expect(snapResult.node.id).toBe('node-1');

    const newResult = getOrCreateWallNode({ x: 300, y: 300 }, existing, 6);
    expect(newResult.isNew).toBe(true);
    expect(newResult.node.x).toBe(300);
    expect(newResult.node.y).toBe(300);
    expect(newResult.updatedNodes.length).toBe(3);
  });

  it('splits wall at T-junction and reassigns doors and windows with correct offsets', () => {
    const wall: WallElement = {
      id: 'wall-main',
      type: 'wall',
      start: { x: 0, y: 0 },
      end: { x: 200, y: 0 },
      thickness: 9,
    };

    const door1: DoorElement = {
      id: 'door-1',
      type: 'door',
      wallId: 'wall-main',
      offset: 30,
      width: 36,
      height: 84,
      swingDirection: 'inside_left',
      openAngle: 90,
    };

    const win2: WindowElement = {
      id: 'win-2',
      type: 'window',
      wallId: 'wall-main',
      offset: 140,
      width: 48,
      height: 48,
      depth: 9,
    };

    const split = splitWallAtPoint(
      wall,
      { x: 100, y: 0 },
      'node-split',
      [door1],
      [win2]
    );

    expect(split.firstWall.id).toBe('wall-main');
    expect(split.firstWall.end.x).toBe(100);
    expect(split.secondWall.start.x).toBe(100);
    expect(split.secondWall.end.x).toBe(200);

    // Door was at offset 30, so belongs to first wall (len 100)
    const reDoor = split.reassignedDoors[0];
    expect(reDoor.wallId).toBe('wall-main');
    expect(reDoor.offset).toBe(30);

    // Window was at offset 140, so belongs to second wall with offset 140 - 100 = 40
    const reWin = split.reassignedWindows[0];
    expect(reWin.wallId).toBe(split.secondWall.id);
    expect(reWin.offset).toBe(40);
  });

  it('detects interior points on wall for splitting', () => {
    const wall: WallElement = {
      id: 'wall-1',
      type: 'wall',
      start: { x: 0, y: 0 },
      end: { x: 200, y: 0 },
      thickness: 9,
    };

    const interior = isPointOnWallInterior({ x: 80, y: 2 }, wall, 5, 10);
    expect(interior.onInterior).toBe(true);
    expect(interior.splitPoint.x).toBe(80);
    expect(interior.splitPoint.y).toBe(0);

    // Point near end within margin should NOT be considered interior
    const nearEnd = isPointOnWallInterior({ x: 195, y: 1 }, wall, 5, 10);
    expect(nearEnd.onInterior).toBe(false);
  });

  it('detects wall junctions and connected endpoints at corners', () => {
    const wallA: WallElement = {
      id: 'w-north',
      type: 'wall',
      start: { x: 100, y: 100 },
      end: { x: 400, y: 100 },
      thickness: 9,
    };
    const wallB: WallElement = {
      id: 'w-east',
      type: 'wall',
      start: { x: 400, y: 100 },
      end: { x: 400, y: 300 },
      thickness: 9,
    };

    const junctions = findWallJunctions([wallA, wallB], 4);
    expect(junctions.length).toBe(1);
    expect(junctions[0].type).toBe('L');
    expect(junctions[0].point.x).toBe(400);
    expect(junctions[0].point.y).toBe(100);
    expect(junctions[0].fillPoints.length).toBeGreaterThan(0);
    expect(junctions[0].strokeLines.length).toBe(2); // Two corner bends (outer & inner)

    const connMap = getConnectedEndpointsMap([wallA, wallB], 4);
    expect(connMap.get('w-north')?.end).toBe(true);
    expect(connMap.get('w-north')?.start).toBe(false);
    expect(connMap.get('w-east')?.start).toBe(true);
    expect(connMap.get('w-east')?.end).toBe(false);
  });

  it('heals two collinear split walls back into one continuous wall when disconnected', () => {
    const wall1: WallElement = {
      id: 'w1',
      type: 'wall',
      start: { x: 0, y: 100 },
      end: { x: 100, y: 100 },
      thickness: 9,
      layer: 'walls',
    };
    const wall2: WallElement = {
      id: 'w2',
      type: 'wall',
      start: { x: 100, y: 100 },
      end: { x: 250, y: 100 },
      thickness: 9,
      layer: 'walls',
    };
    const doorOnW2: DoorElement = {
      id: 'd-test',
      type: 'door',
      wallId: 'w2',
      offset: 30,
      width: 36,
      height: 84,
      swingDirection: 'inside_left',
      openAngle: 90,
    };

    const result = healCollinearWalls([wall1, wall2, doorOnW2]);
    expect(result.healedCount).toBe(1);
    expect(result.elements.length).toBe(2); // 1 merged wall + 1 door

    const merged = result.elements.find((e) => e.type === 'wall') as WallElement;
    expect(merged.start.x).toBe(0);
    expect(merged.end.x).toBe(250);

    const reassignedDoor = result.elements.find((e) => e.type === 'door') as DoorElement;
    expect(reassignedDoor.wallId).toBe('w1');
    expect(reassignedDoor.offset).toBe(130); // 100 (len of w1) + 30
  });

  it('does NOT heal collinear walls if a third wall connects at the joint', () => {
    const wall1: WallElement = {
      id: 'w1',
      type: 'wall',
      start: { x: 0, y: 100 },
      end: { x: 100, y: 100 },
      thickness: 9,
      layer: 'walls',
    };
    const wall2: WallElement = {
      id: 'w2',
      type: 'wall',
      start: { x: 100, y: 100 },
      end: { x: 250, y: 100 },
      thickness: 9,
      layer: 'walls',
    };
    const branchWall: WallElement = {
      id: 'w-branch',
      type: 'wall',
      start: { x: 100, y: 100 },
      end: { x: 100, y: 200 },
      thickness: 9,
      layer: 'walls',
    };

    const result = healCollinearWalls([wall1, wall2, branchWall]);
    expect(result.healedCount).toBe(0);
    expect(result.elements.length).toBe(3);
  });
});
