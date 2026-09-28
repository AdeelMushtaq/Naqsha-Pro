import { describe, it, expect } from 'vitest';
import {
  buildWall3DOpenings,
  calculateFloorElevation,
} from '../geometry3d';
import { WallElement, DoorElement, WindowElement, Floor } from '../../models/types';

describe('geometry3d tests', () => {
  it('correctly splits wall into solid segments, sills, and lintels around openings', () => {
    const wall: WallElement = {
      id: 'w1',
      type: 'wall',
      start: { x: 0, y: 0 },
      end: { x: 240, y: 0 }, // 20 ft wall
      thickness: 9,
      height: 120, // 10 ft high
    };

    const door: DoorElement = {
      id: 'd1',
      type: 'door',
      wallId: 'w1',
      offset: 36,
      width: 36,
      height: 84, // 7 ft
      sillHeight: 0,
      swingDirection: 'inside_left',
      openAngle: 90,
    };

    const win: WindowElement = {
      id: 'win1',
      type: 'window',
      wallId: 'w1',
      offset: 120,
      width: 48,
      height: 48,
      sillHeight: 36,
      depth: 9,
    };

    const result = buildWall3DOpenings(wall, [door], [win], 120);

    // Should have:
    // 1. Solid segment 0 to 36 (full height 120)
    // 2. Door lintel 36 to 72 (elevation 84 to 120)
    // 3. Solid segment 72 to 120 (full height 120)
    // 4. Window sill 120 to 168 (elevation 0 to 36)
    // 5. Window lintel 120 to 168 (elevation 84 to 120)
    // 6. Solid segment 168 to 240 (full height 120)
    expect(result.segments.length).toBe(6);

    const fullSegments = result.segments.filter((s) => s.type === 'solid');
    expect(fullSegments.length).toBe(3);

    const sills = result.segments.filter((s) => s.type === 'sill');
    expect(sills.length).toBe(1);
    expect(sills[0].bottomElevation).toBe(0);
    expect(sills[0].topElevation).toBe(36);

    const lintels = result.segments.filter((s) => s.type === 'lintel');
    expect(lintels.length).toBe(2);
    expect(result.doorPanels.length).toBe(1);
    expect(result.windowFrames.length).toBe(1);
  });

  it('calculates floor elevations in stacked and explode view modes', () => {
    const floors: Floor[] = [
      { id: 'f0', name: 'Ground Floor', level: 0, elements: [], baseElevation: 0 },
      { id: 'f1', name: 'First Floor', level: 1, elements: [], baseElevation: 120 },
      { id: 'f2', name: 'Second Floor', level: 2, elements: [], baseElevation: 240 },
    ];

    const stacked0 = calculateFloorElevation(floors, 'f0', 'all');
    const stacked1 = calculateFloorElevation(floors, 'f1', 'all');
    expect(stacked0.elevation).toBe(0);
    expect(stacked1.elevation).toBe(120);

    const explode1 = calculateFloorElevation(floors, 'f1', 'explode', undefined, 60);
    expect(explode1.elevation).toBe(120 + 1 * 60); // 180

    const activeMode = calculateFloorElevation(floors, 'f0', 'active', 'f1');
    expect(activeMode.isVisible).toBe(false);

    const activeModeTarget = calculateFloorElevation(floors, 'f1', 'active', 'f1');
    expect(activeModeTarget.isVisible).toBe(true);
    expect(activeModeTarget.elevation).toBe(0);
  });
});
