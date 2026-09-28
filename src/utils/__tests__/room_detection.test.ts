import { describe, it, expect } from 'vitest';
import { detectRoomsFromWalls, polygonArea, polygonCentroid } from '../roomDetection';
import { WallElement } from '../../models/types';

describe('Room Detection (Closed wall loop finding)', () => {
  it('calculates polygon area and centroid accurately using Shoelace formula', () => {
    // 10ft x 10ft room = 120" x 120"
    const squareVertices = [
      { x: 0, y: 0 },
      { x: 120, y: 0 },
      { x: 120, y: 120 },
      { x: 0, y: 120 },
    ];

    const area = Math.abs(polygonArea(squareVertices));
    expect(area).toBe(120 * 120); // 14,400 sq in

    const centroid = polygonCentroid(squareVertices);
    expect(centroid.x).toBe(60);
    expect(centroid.y).toBe(60);
  });

  it('detects a closed room from 4 connected walls', () => {
    // 4 walls forming a 120" x 120" room (10ft x 10ft)
    const walls: WallElement[] = [
      {
        id: 'w1',
        type: 'wall',
        start: { x: 0, y: 0 },
        end: { x: 120, y: 0 },
        thickness: 9,
      },
      {
        id: 'w2',
        type: 'wall',
        start: { x: 120, y: 0 },
        end: { x: 120, y: 120 },
        thickness: 9,
      },
      {
        id: 'w3',
        type: 'wall',
        start: { x: 120, y: 120 },
        end: { x: 0, y: 120 },
        thickness: 9,
      },
      {
        id: 'w4',
        type: 'wall',
        start: { x: 0, y: 120 },
        end: { x: 0, y: 0 },
        thickness: 9,
      },
    ];

    const rooms = detectRoomsFromWalls(walls);
    expect(rooms.length).toBe(1);

    const room = rooms[0];
    expect(room.name).toBe('Kamra 1');
    // Area is ~14400 sq inches
    expect(Math.round(room.areaSqInches)).toBe(14400);
    // Perimeter is 120 * 4 = 480 inches
    expect(Math.round(room.perimeterInches)).toBe(480);
    // Centroid is at (60, 60)
    expect(Math.round(room.centroid.x)).toBe(60);
    expect(Math.round(room.centroid.y)).toBe(60);
  });

  it('does not detect rooms when walls do not form a closed loop', () => {
    // 3 walls forming an open U-shape
    const openWalls: WallElement[] = [
      {
        id: 'w1',
        type: 'wall',
        start: { x: 0, y: 0 },
        end: { x: 120, y: 0 },
        thickness: 9,
      },
      {
        id: 'w2',
        type: 'wall',
        start: { x: 120, y: 0 },
        end: { x: 120, y: 120 },
        thickness: 9,
      },
      {
        id: 'w3',
        type: 'wall',
        start: { x: 120, y: 120 },
        end: { x: 0, y: 120 },
        thickness: 9,
      },
    ];

    const rooms = detectRoomsFromWalls(openWalls);
    expect(rooms.length).toBe(0);
  });
});
