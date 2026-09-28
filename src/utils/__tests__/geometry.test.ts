import { describe, it, expect } from 'vitest';
import {
  distance,
  angleDeg,
  getWallLength,
  getWallNormal,
  getWallPolygon,
  projectPointOntoSegment,
  calculateBoxArea,
  calculateBoxPerimeter,
  calculateCircleArea,
  calculateCirclePerimeter,
} from '../geometry';
import { WallElement } from '../../models/types';

describe('geometry.ts', () => {
  it('calculates distance between points correctly', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(distance({ x: 10, y: 10 }, { x: 10, y: 20 })).toBe(10);
  });

  it('calculates angle in degrees correctly', () => {
    expect(angleDeg({ x: 0, y: 0 }, { x: 10, y: 0 })).toBe(0);
    expect(angleDeg({ x: 0, y: 0 }, { x: 0, y: 10 })).toBe(90);
    expect(angleDeg({ x: 0, y: 0 }, { x: -10, y: 0 })).toBe(180);
    expect(angleDeg({ x: 0, y: 0 }, { x: 0, y: -10 })).toBe(270);
  });

  it('calculates straight wall length', () => {
    const wall: WallElement = {
      id: 'w1',
      type: 'wall',
      start: { x: 0, y: 0 },
      end: { x: 120, y: 0 },
      thickness: 9,
    };
    expect(getWallLength(wall)).toBe(120);
  });

  it('computes wall normal perpendicular vector', () => {
    const normal = getWallNormal({ x: 0, y: 0 }, { x: 100, y: 0 });
    // Perpendicular vector should have length 1 and be orthogonal to (1, 0)
    expect(normal.x).toBeCloseTo(0);
    expect(normal.y).toBeCloseTo(1);
  });

  it('computes wall 4-point polygon with correct thickness', () => {
    const wall: WallElement = {
      id: 'w1',
      type: 'wall',
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 },
      thickness: 10,
    };
    const poly = getWallPolygon(wall);
    expect(poly).toHaveLength(4);
    // Left side should be y = +5, right side y = -5
    expect(poly[0].y).toBeCloseTo(5);
    expect(poly[1].y).toBeCloseTo(5);
    expect(poly[2].y).toBeCloseTo(-5);
    expect(poly[3].y).toBeCloseTo(-5);
  });

  it('projects point onto line segment correctly', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 100, y: 0 };
    const proj = projectPointOntoSegment({ x: 40, y: 20 }, p1, p2);
    expect(proj.point.x).toBeCloseTo(40);
    expect(proj.point.y).toBeCloseTo(0);
    expect(proj.offset).toBeCloseTo(40);
    expect(proj.distance).toBeCloseTo(20);
  });

  it('calculates area and perimeter for rectangle and circle', () => {
    // 10' x 12' = 120" x 144"
    expect(calculateBoxArea(120, 144)).toBe(17280);
    expect(calculateBoxPerimeter(120, 144)).toBe(528);

    // Circle radius 60"
    expect(calculateCircleArea(60)).toBeCloseTo(Math.PI * 3600);
    expect(calculateCirclePerimeter(60)).toBeCloseTo(2 * Math.PI * 60);
  });
});
