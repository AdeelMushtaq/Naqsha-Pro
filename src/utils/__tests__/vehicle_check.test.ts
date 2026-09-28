import { describe, it, expect } from 'vitest';
import { simulateVehiclePath, getVehicleBodyPolygon } from '../sweptPath';
import {
  satPolygonsOverlap,
  evaluateVehicleCheck,
  getGateGeometry,
} from '../collision';
import { VEHICLE_PRESETS } from '../../models/vehiclePresets';
import { GateElement, WallElement, ObstacleElement, PathWaypoint } from '../../models/types';

describe('Vehicle Swept Path and Entry Check Engine', () => {
  const car = {
    id: 'test-car',
    ...VEHICLE_PRESETS.car,
  };

  const truck10w = {
    id: 'test-truck',
    ...VEHICLE_PRESETS.truck_10wheel,
  };

  it('generates body polygon with mirrors extending beyond body width', () => {
    const poly = getVehicleBodyPolygon({ x: 0, y: 0, heading: 0 }, car);
    expect(poly.length).toBe(8);

    // Car width is 70", mirrorExtraWidth is 8" -> Total width across mirrors is 70 + 16 = 86"
    // Find min and max Y across polygon points
    const ys = poly.map((p) => p.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    expect(maxY - minY).toBeCloseTo(car.width + car.mirrorExtraWidth * 2, 0);
  });

  it('simulates swept path around a 90-degree turn respecting wheelbase', () => {
    const waypoints: PathWaypoint[] = [
      { id: '1', x: 0, y: 0 },
      { id: '2', x: 300, y: 0 },
      { id: '3', x: 300, y: 300 },
    ];

    const { poses, sweptPolygon } = simulateVehiclePath(car, waypoints, 12);
    expect(poses.length).toBeGreaterThan(10);
    expect(sweptPolygon.length).toBeGreaterThan(0);

    // Verify poses smoothly transitioned from heading 0 to ~PI/2 (90 deg)
    const initialHeading = poses[0].heading;
    const finalHeading = poses[poses.length - 1].heading;
    expect(initialHeading).toBeCloseTo(0, 1);
    expect(finalHeading).toBeCloseTo(Math.PI / 2, 1);
  });

  it('detects SAT overlap between overlapping polygons and disjoint polygons', () => {
    const squareA = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
      { x: 0, y: 50 },
    ];
    const squareB = [
      { x: 30, y: 30 },
      { x: 80, y: 30 },
      { x: 80, y: 80 },
      { x: 30, y: 80 },
    ];
    const squareFar = [
      { x: 200, y: 200 },
      { x: 250, y: 200 },
      { x: 250, y: 250 },
      { x: 200, y: 250 },
    ];

    expect(satPolygonsOverlap(squareA, squareB)).toBe(true);
    expect(satPolygonsOverlap(squareA, squareFar)).toBe(false);
  });

  it('gives "Ja sakti hai" for small car and "Nahi ja sakti" for 10-wheeler truck through narrow 8ft gate', () => {
    // Wall running along X=300 from Y=0 to Y=600
    const wall: WallElement = {
      id: 'boundary-wall',
      type: 'wall',
      start: { x: 300, y: 0 },
      end: { x: 300, y: 600 },
      thickness: 9,
    };

    // Gate in the wall: offset 200, width 96" (8 ft)
    const narrowGate: GateElement = {
      id: 'gate-1',
      type: 'gate',
      wallId: 'boundary-wall',
      offset: 200,
      width: 96, // 8 ft wide
      height: 120, // 10 ft high
      gateType: 'sliding',
      postThickness: 18,
    };

    // Straight entry path through the gate center (Y = 248)
    const gateCenterY = 200 + 96 / 2; // 248
    const waypoints: PathWaypoint[] = [
      { id: 'wp-1', x: 100, y: gateCenterY },
      { id: 'wp-2', x: 500, y: gateCenterY },
    ];

    // Evaluate small car (width 70", with mirrors 86" < 96" gate)
    const carSim = simulateVehiclePath(car, waypoints, 10);
    const carResult = evaluateVehicleCheck(
      car,
      carSim.poses,
      [wall],
      [narrowGate],
      [],
      [],
      { safetyMargin: 4 }
    );
    expect(carResult.collisions.filter((c) => c.type === 'gate_post')).toHaveLength(0);
    expect(carResult.verdict).not.toBe('fail');

    // Evaluate 10-wheeler truck (width 98" > 96" gate width -> guaranteed to hit gate post!)
    const truckSim = simulateVehiclePath(truck10w, waypoints, 10);
    const truckResult = evaluateVehicleCheck(
      truck10w,
      truckSim.poses,
      [wall],
      [narrowGate],
      [],
      [],
      { safetyMargin: 12 }
    );
    expect(truckResult.verdict).toBe('fail');
    expect(truckResult.collisions.some((c) => c.type === 'gate_post')).toBe(true);
    expect(truckResult.suggestions.some((s) => s.includes('Minimum gate width'))).toBe(true);
  });

  it('detects low overhead wire collision when vehicle height exceeds obstacle elevation', () => {
    // Low hanging cable at height 108" (9 ft) across path
    const wireObstacle: ObstacleElement = {
      id: 'obs-wire',
      type: 'obstacle',
      obstacleType: 'hanging_wire',
      x: 200,
      y: 200,
      width: 20,
      height: 200,
      rotation: 0,
      height3d: 6,
      elevation: 108, // 9 ft hanging wire
      isOverhead: true,
      label: 'Hanging Electric Cable',
    };

    const path: PathWaypoint[] = [
      { id: '1', x: 100, y: 200 },
      { id: '2', x: 300, y: 200 },
    ];

    // Truck height is 135" (11.25 ft) > 108" -> collision!
    const truckSim = simulateVehiclePath(truck10w, path, 10);
    const result = evaluateVehicleCheck(
      truck10w,
      truckSim.poses,
      [],
      [],
      [wireObstacle],
      []
    );

    expect(result.verdict).toBe('fail');
    expect(result.collisions.some((c) => c.type === 'overhead')).toBe(true);
    expect(result.minOverheadClearance).toBeLessThan(0);
  });
});
