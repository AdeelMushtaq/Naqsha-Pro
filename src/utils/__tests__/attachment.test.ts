import { describe, it, expect } from 'vitest';
import { clampOffset, getDoorWorldPosition, getWindowWorldPosition } from '../geometry';
import { WallElement, DoorElement, WindowElement } from '../../models/types';

describe('door and window attachment logic', () => {
  const wall: WallElement = {
    id: 'wall-1',
    type: 'wall',
    start: { x: 0, y: 0 },
    end: { x: 120, y: 0 }, // 10 ft wall
    thickness: 9,
  };

  it('clamps door offset properly within wall bounds', () => {
    const doorWidth = 36; // 3 ft door
    const wallLength = 120; // 10 ft wall

    // Within bounds
    expect(clampOffset(20, doorWidth, wallLength)).toBe(20);
    // Negative offset should clamp to 0
    expect(clampOffset(-10, doorWidth, wallLength)).toBe(0);
    // Overflowing offset should clamp to wallLength - doorWidth (84)
    expect(clampOffset(100, doorWidth, wallLength)).toBe(84);
  });

  it('calculates world coordinates for door attached to wall', () => {
    const door: DoorElement = {
      id: 'd1',
      type: 'door',
      wallId: 'wall-1',
      offset: 24, // 2 ft in
      width: 36,  // 3 ft wide
      height: 84,
      swingDirection: 'inside_left',
      openAngle: 90,
    };

    const pos = getDoorWorldPosition(wall, door);
    expect(pos.startPoint.x).toBeCloseTo(24);
    expect(pos.startPoint.y).toBeCloseTo(0);
    expect(pos.endPoint.x).toBeCloseTo(60);
    expect(pos.endPoint.y).toBeCloseTo(0);
    expect(pos.center.x).toBeCloseTo(42);
    expect(pos.angleDeg).toBeCloseTo(0);
  });

  it('calculates world coordinates for window attached to wall', () => {
    const win: WindowElement = {
      id: 'win-1',
      type: 'window',
      wallId: 'wall-1',
      offset: 30,
      width: 48,
      height: 48,
      depth: 9,
    };

    const pos = getWindowWorldPosition(wall, win);
    expect(pos.startPoint.x).toBeCloseTo(30);
    expect(pos.endPoint.x).toBeCloseTo(78);
    expect(pos.center.x).toBeCloseTo(54);
  });

  it('moves door world coordinates when wall is translated', () => {
    const movedWall: WallElement = {
      ...wall,
      start: { x: 50, y: 100 },
      end: { x: 170, y: 100 },
    };

    const door: DoorElement = {
      id: 'd1',
      type: 'door',
      wallId: 'wall-1',
      offset: 24,
      width: 36,
      height: 84,
      swingDirection: 'inside_left',
      openAngle: 90,
    };

    const pos = getDoorWorldPosition(movedWall, door);
    expect(pos.startPoint.x).toBeCloseTo(74); // 50 + 24
    expect(pos.startPoint.y).toBeCloseTo(100);
    expect(pos.endPoint.x).toBeCloseTo(110);  // 50 + 60
    expect(pos.endPoint.y).toBeCloseTo(100);
  });
});
