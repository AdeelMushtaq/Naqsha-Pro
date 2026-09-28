/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  splitWallAtPoint,
  canJoinWalls,
  joinCollinearWalls,
  splitRoadAtPoint,
  joinCollinearRoads,
  mergeNodes,
  disconnectAtNode,
  findWallCrossing,
  splitWallsAtCrossing,
} from '../wallSplitJoin';
import {
  WallElement,
  CurveWallElement,
  DoorElement,
  WindowElement,
  RoadElement,
  WallNode,
} from '../../models/types';
import { useStore } from '../../store/useStore';

describe('wallSplitJoin utility tests', () => {
  it('splits straight wall and reassigns attached doors and windows to the correct segment', () => {
    const wall: WallElement = {
      id: 'w1',
      type: 'wall',
      start: { x: 0, y: 0 },
      end: { x: 200, y: 0 },
      thickness: 9,
      height: 120,
      layer: 'walls',
      startNodeId: 'node-start',
      endNodeId: 'node-end',
    };

    const door1: DoorElement = {
      id: 'd1',
      type: 'door',
      wallId: 'w1',
      offset: 20,
      width: 36,
      height: 84,
    };

    const door2: DoorElement = {
      id: 'd2',
      type: 'door',
      wallId: 'w1',
      offset: 130,
      width: 36,
      height: 84,
    };

    const win1: WindowElement = {
      id: 'win1',
      type: 'window',
      wallId: 'w1',
      offset: 140,
      width: 48,
      height: 48,
      depth: 9,
    };

    const splitPt = { x: 100, y: 0 };
    const res = splitWallAtPoint(wall, splitPt, 'node-split-1', [door1, door2], [win1]);

    expect(res.firstWall.id).toBe('w1');
    expect(res.firstWall.start).toEqual({ x: 0, y: 0 });
    expect(res.firstWall.end).toEqual({ x: 100, y: 0 });
    expect(res.firstWall.startNodeId).toBe('node-start');
    expect(res.firstWall.endNodeId).toBe('node-split-1');

    expect(res.secondWall.start).toEqual({ x: 100, y: 0 });
    expect(res.secondWall.end).toEqual({ x: 200, y: 0 });
    expect(res.secondWall.startNodeId).toBe('node-split-1');
    expect(res.secondWall.endNodeId).toBe('node-end');

    // Door 1 center is 20 + 18 = 38 < 100 -> stays on first wall
    const reassignedD1 = res.reassignedDoors.find((d) => d.id === 'd1')!;
    expect(reassignedD1.wallId).toBe('w1');
    expect(reassignedD1.offset).toBe(20);

    // Door 2 center is 130 + 18 = 148 >= 100 -> moves to second wall with offset 130 - 100 = 30
    const reassignedD2 = res.reassignedDoors.find((d) => d.id === 'd2')!;
    expect(reassignedD2.wallId).toBe(res.secondWall.id);
    expect(reassignedD2.offset).toBe(30);

    // Window 1 center is 140 + 24 = 164 >= 100 -> moves to second wall with offset 140 - 100 = 40
    const reassignedWin1 = res.reassignedWindows.find((w) => w.id === 'win1')!;
    expect(reassignedWin1.wallId).toBe(res.secondWall.id);
    expect(reassignedWin1.offset).toBe(40);
  });

  it('splits curved wall into two correct sub-arcs inheriting bulge, thickness, and properties', () => {
    const curveWall: CurveWallElement = {
      id: 'cw1',
      type: 'curve_wall',
      start: { x: 0, y: 0 },
      end: { x: 200, y: 0 },
      bulge: 40,
      thickness: 9,
      height: 120,
      layer: 'walls',
    };

    const splitPt = { x: 100, y: 40 }; // apex of the curve
    const res = splitWallAtPoint(curveWall, splitPt, 'node-cw-split', [], []);

    expect(res.firstWall.type).toBe('curve_wall');
    expect(res.secondWall.type).toBe('curve_wall');

    const cw1 = res.firstWall as CurveWallElement;
    const cw2 = res.secondWall as CurveWallElement;

    expect(cw1.thickness).toBe(9);
    expect(cw2.thickness).toBe(9);
    expect(cw1.height).toBe(120);
    expect(cw2.height).toBe(120);

    // Sub-arc bulges should be positive and smaller than original bulge
    expect(cw1.bulge).toBeGreaterThan(0);
    expect(cw1.bulge).toBeLessThan(40);
    expect(cw2.bulge).toBeGreaterThan(0);
    expect(cw2.bulge).toBeLessThan(40);

    // Connected at split node
    expect(cw1.endNodeId).toBe('node-cw-split');
    expect(cw2.startNodeId).toBe('node-cw-split');
  });

  it('joins collinear walls and recalculates door/window offsets', () => {
    const wall1: WallElement = {
      id: 'w1',
      type: 'wall',
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 },
      thickness: 9,
      layer: 'walls',
      startNodeId: 'n1',
      endNodeId: 'n2',
    };

    const wall2: WallElement = {
      id: 'w2',
      type: 'wall',
      start: { x: 100, y: 0 },
      end: { x: 250, y: 0 },
      thickness: 9,
      layer: 'walls',
      startNodeId: 'n2',
      endNodeId: 'n3',
    };

    const doorOnW2: DoorElement = {
      id: 'd-test',
      type: 'door',
      wallId: 'w2',
      offset: 30,
      width: 36,
      height: 84,
    };

    const nodes: WallNode[] = [
      { id: 'n1', x: 0, y: 0 },
      { id: 'n2', x: 100, y: 0 },
      { id: 'n3', x: 250, y: 0 },
    ];

    const result = joinCollinearWalls(wall1, wall2, [wall1, wall2], [doorOnW2], [], nodes);
    expect(result.success).toBe(true);
    expect(result.mergedWall).toBeDefined();
    expect(result.mergedWall!.start).toEqual({ x: 0, y: 0 });
    expect(result.mergedWall!.end).toEqual({ x: 250, y: 0 });
    expect(result.removedWallId).toBe('w2');

    // Middle node n2 should be removed since no other wall uses it
    expect(result.remainingNodes?.some((n) => n.id === 'n2')).toBe(false);

    // Door on w2 should be re-mapped to w1 at offset 100 + 30 = 130
    const remappedDoor = result.reassignedDoors?.find((d) => d.id === 'd-test');
    expect(remappedDoor?.wallId).toBe('w1');
    expect(remappedDoor?.offset).toBe(130);
  });

  it('refuses join when a third wall shares the node', () => {
    const wall1: WallElement = {
      id: 'w1',
      type: 'wall',
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 },
      thickness: 9,
      layer: 'walls',
      endNodeId: 'n-joint',
    };

    const wall2: WallElement = {
      id: 'w2',
      type: 'wall',
      start: { x: 100, y: 0 },
      end: { x: 200, y: 0 },
      thickness: 9,
      layer: 'walls',
      startNodeId: 'n-joint',
    };

    // Third perpendicular wall branching off the junction
    const wall3: WallElement = {
      id: 'w3',
      type: 'wall',
      start: { x: 100, y: 0 },
      end: { x: 100, y: 100 },
      thickness: 9,
      layer: 'walls',
      startNodeId: 'n-joint',
    };

    const check = canJoinWalls(wall1, wall2, [wall1, wall2, wall3]);
    expect(check.canJoin).toBe(false);
    expect(check.reason).toBe('third_wall_attached');

    const result = joinCollinearWalls(wall1, wall2, [wall1, wall2, wall3], [], []);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('third_wall_attached');
  });

  it('refuses join when walls are not collinear or have different thickness', () => {
    const wall1: WallElement = {
      id: 'w1',
      type: 'wall',
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 },
      thickness: 9,
      layer: 'walls',
    };

    // Perpendicular corner
    const wallCorner: WallElement = {
      id: 'w2',
      type: 'wall',
      start: { x: 100, y: 0 },
      end: { x: 100, y: 100 },
      thickness: 9,
      layer: 'walls',
    };

    expect(canJoinWalls(wall1, wallCorner, [wall1, wallCorner]).canJoin).toBe(false);
    expect(canJoinWalls(wall1, wallCorner, [wall1, wallCorner]).reason).toBe('not_collinear');

    // Different thickness
    const wallThick: WallElement = {
      id: 'w3',
      type: 'wall',
      start: { x: 100, y: 0 },
      end: { x: 200, y: 0 },
      thickness: 4.5,
      layer: 'walls',
    };

    expect(canJoinWalls(wall1, wallThick, [wall1, wallThick]).canJoin).toBe(false);
    expect(canJoinWalls(wall1, wallThick, [wall1, wallThick]).reason).toBe('different_properties');
  });

  it('refuses join when either wall is locked', () => {
    const wall1: WallElement = {
      id: 'w1',
      type: 'wall',
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 },
      thickness: 9,
      locked: true,
      layer: 'walls',
    };
    const wall2: WallElement = {
      id: 'w2',
      type: 'wall',
      start: { x: 100, y: 0 },
      end: { x: 200, y: 0 },
      thickness: 9,
      layer: 'walls',
    };

    const check = canJoinWalls(wall1, wall2, [wall1, wall2]);
    expect(check.canJoin).toBe(false);
    expect(check.reason).toBe('locked');
  });

  it('merges close nodes into one and updates connected walls', () => {
    const w1: WallElement = {
      id: 'w1',
      type: 'wall',
      start: { x: 0, y: 0 },
      end: { x: 99.5, y: 0.2 },
      startNodeId: 'n1',
      endNodeId: 'n2',
      thickness: 9,
    };
    const w2: WallElement = {
      id: 'w2',
      type: 'wall',
      start: { x: 100.5, y: -0.1 },
      end: { x: 200, y: 0 },
      startNodeId: 'n3',
      endNodeId: 'n4',
      thickness: 9,
    };

    const nodes: WallNode[] = [
      { id: 'n1', x: 0, y: 0 },
      { id: 'n2', x: 99.5, y: 0.2 },
      { id: 'n3', x: 100.5, y: -0.1 },
      { id: 'n4', x: 200, y: 0 },
    ];

    const targetPos = { x: 100, y: 0 };
    const res = mergeNodes('n2', 'n3', targetPos, [w1, w2], [], nodes);

    expect(res.updatedNodes.find((n) => n.id === 'n3')).toBeUndefined();
    const mergedNode = res.updatedNodes.find((n) => n.id === 'n2')!;
    expect(mergedNode.x).toBe(100);
    expect(mergedNode.y).toBe(0);

    const updatedW1 = res.updatedWalls.find((w) => w.id === 'w1') as WallElement;
    const updatedW2 = res.updatedWalls.find((w) => w.id === 'w2') as WallElement;

    expect(updatedW1.endNodeId).toBe('n2');
    expect(updatedW1.end).toEqual({ x: 100, y: 0 });
    expect(updatedW2.startNodeId).toBe('n2');
    expect(updatedW2.start).toEqual({ x: 100, y: 0 });
  });

  it('disconnects wall at node by assigning a new separate node', () => {
    const w1: WallElement = {
      id: 'w1',
      type: 'wall',
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 },
      startNodeId: 'n1',
      endNodeId: 'n-shared',
      thickness: 9,
    };
    const w2: WallElement = {
      id: 'w2',
      type: 'wall',
      start: { x: 100, y: 0 },
      end: { x: 100, y: 100 },
      startNodeId: 'n-shared',
      endNodeId: 'n2',
      thickness: 9,
    };

    const nodes: WallNode[] = [
      { id: 'n1', x: 0, y: 0 },
      { id: 'n-shared', x: 100, y: 0 },
      { id: 'n2', x: 100, y: 100 },
    ];

    const res = disconnectAtNode('n-shared', 'w2', [w1, w2], nodes);

    const updatedW1 = res.updatedWalls.find((w) => w.id === 'w1') as WallElement;
    const updatedW2 = res.updatedWalls.find((w) => w.id === 'w2') as WallElement;

    // w1 keeps n-shared
    expect(updatedW1.endNodeId).toBe('n-shared');
    // w2 gets the new node
    expect(updatedW2.startNodeId).toBe(res.newNode.id);
    expect(updatedW2.startNodeId).not.toBe('n-shared');
  });

  it('splits and joins roads properly', () => {
    const road: RoadElement = {
      id: 'r1',
      type: 'road',
      start: { x: 0, y: 0 },
      end: { x: 500, y: 0 },
      width: 240,
      hasFootpath: true,
      footpathWidth: 36,
      name: 'Main Boulevard',
    };

    const splitRes = splitRoadAtPoint(road, { x: 200, y: 0 });
    expect(splitRes.firstRoad.start).toEqual({ x: 0, y: 0 });
    expect(splitRes.firstRoad.end).toEqual({ x: 200, y: 0 });
    expect(splitRes.secondRoad.start).toEqual({ x: 200, y: 0 });
    expect(splitRes.secondRoad.end).toEqual({ x: 500, y: 0 });
    expect(splitRes.firstRoad.width).toBe(240);
    expect(splitRes.secondRoad.width).toBe(240);

    const joinRes = joinCollinearRoads(splitRes.firstRoad, splitRes.secondRoad);
    expect(joinRes.success).toBe(true);
    expect(joinRes.mergedRoad?.start).toEqual({ x: 0, y: 0 });
    expect(joinRes.mergedRoad?.end).toEqual({ x: 500, y: 0 });
  });

  it('detects interior X crossing between two walls and trims into 4 walls sharing one node', () => {
    const w1: WallElement = {
      id: 'w1',
      type: 'wall',
      start: { x: 0, y: 50 },
      end: { x: 100, y: 50 },
      thickness: 9,
    };
    const w2: WallElement = {
      id: 'w2',
      type: 'wall',
      start: { x: 50, y: 0 },
      end: { x: 50, y: 100 },
      thickness: 9,
    };

    const crossingPt = findWallCrossing(w1, w2);
    expect(crossingPt).toEqual({ x: 50, y: 50 });

    const trimRes = splitWallsAtCrossing(w1, w2, 'node-x-crossing', [], []);
    expect(trimRes).not.toBeNull();
    expect(trimRes!.walls.length).toBe(4);
    expect(trimRes!.splitNode.x).toBe(50);
    expect(trimRes!.splitNode.y).toBe(50);

    for (const piece of trimRes!.walls) {
      const touchesNode = piece.startNodeId === 'node-x-crossing' || piece.endNodeId === 'node-x-crossing';
      expect(touchesNode).toBe(true);
    }
  });

  it('undo is exactly one step for split and join actions in useStore', () => {
    const store = useStore.getState();

    // Create a pristine test wall
    const wallId = 'test-wall-undo';
    const testWall: WallElement = {
      id: wallId,
      type: 'wall',
      start: { x: 0, y: 500 },
      end: { x: 300, y: 500 },
      thickness: 9,
      layer: 'walls',
    };

    store.addElement(testWall);
    const pastLenBeforeSplit = useStore.getState().past.length;

    // Split wall at x: 150
    const splitNodeId = store.splitWallAt(wallId, { x: 150, y: 500 });
    expect(splitNodeId).toBeDefined();

    const pastLenAfterSplit = useStore.getState().past.length;
    // Exactly one history step was pushed
    expect(pastLenAfterSplit).toBe(pastLenBeforeSplit + 1);

    // Calling undo once should restore original wall
    store.undo();
    const restored = useStore.getState().project.elements.find((e) => e.id === wallId);
    expect(restored).toBeDefined();
    expect(restored?.type).toBe('wall');
    expect((restored as WallElement).end.x).toBe(300);
  });

  it('locked walls are untouched when target of split or join', () => {
    const store = useStore.getState();
    const lockedWallId = 'test-locked-wall';
    const lockedWall: WallElement = {
      id: lockedWallId,
      type: 'wall',
      start: { x: 0, y: 700 },
      end: { x: 300, y: 700 },
      thickness: 9,
      locked: true,
      layer: 'walls',
    };

    store.addElement(lockedWall);

    // Attempting to split a locked wall should return undefined / do nothing
    const splitResult = store.splitWallAt(lockedWallId, { x: 150, y: 700 });
    expect(splitResult).toBeUndefined();

    // Wall should remain completely unchanged
    const wallAfter = useStore.getState().project.elements.find((e) => e.id === lockedWallId) as WallElement;
    expect(wallAfter.start.x).toBe(0);
    expect(wallAfter.end.x).toBe(300);
  });
});
