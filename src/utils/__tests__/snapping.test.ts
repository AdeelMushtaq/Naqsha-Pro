import { describe, it, expect } from 'vitest';
import { snapToGrid, snapToEndpoints, snapAngle } from '../snapping';
import { WallElement } from '../../models/types';

describe('snapping.ts', () => {
  it('snaps coordinates to nearest grid interval within threshold', () => {
    // 12" grid, threshold 4"
    const res1 = snapToGrid({ x: 23.5, y: 11.8 }, 12, 4);
    expect(res1.snapped).toBe(true);
    expect(res1.point.x).toBe(24);
    expect(res1.point.y).toBe(12);

    // Beyond threshold
    const res2 = snapToGrid({ x: 18, y: 18 }, 12, 2);
    expect(res2.snapped).toBe(false);
  });

  it('snaps to wall endpoints within threshold', () => {
    const wall: WallElement = {
      id: 'w1',
      type: 'wall',
      start: { x: 50, y: 50 },
      end: { x: 150, y: 50 },
      thickness: 9,
    };

    const res = snapToEndpoints({ x: 52, y: 51 }, [wall], 6);
    expect(res.snapped).toBe(true);
    expect(res.point.x).toBe(50);
    expect(res.point.y).toBe(50);
  });

  it('snaps angle to 0, 45, 90 degrees', () => {
    const origin = { x: 0, y: 0 };
    // Near 90 degrees
    const near90 = { x: 1, y: 100 };
    const res = snapAngle(origin, near90, 45, 10);
    expect(res.snapped).toBe(true);
    expect(res.point.x).toBeCloseTo(0);
    expect(res.point.y).toBeCloseTo(100);
  });
});
