import { describe, it, expect } from 'vitest';
import {
  calculateEstimates,
  generateEstimatesCSV,
  defaultEstimatorSettings,
  EstimatorSettings,
} from '../estimator';
import { WallElement, DoorElement, WindowElement, PlanElement } from '../../models/types';

describe('Contractor Material Estimator', () => {
  it('calculates wall linear length, gross area, and brick count correctly', () => {
    // Single 9-inch wall, 10 feet long (120 inches)
    const elements: PlanElement[] = [
      {
        id: 'w1',
        type: 'wall',
        start: { x: 0, y: 0 },
        end: { x: 120, y: 0 },
        thickness: 9,
      },
    ];

    const settings: EstimatorSettings = {
      wallHeightFt: 10,
      brickLengthIn: 9,
      brickWidthIn: 4.5,
      brickHeightIn: 3,
      wastagePercent: 0, // 0% waste for deterministic check
    };

    const result = calculateEstimates(elements, settings);

    expect(result.totalLinearLengthFt).toBe(10);
    // 10 ft length x 10 ft height = 100 sq ft gross
    expect(result.totalGrossAreaSqFt).toBe(100);
    expect(result.totalNetWallAreaSqFt).toBe(100);

    // Standard 9" wall: ~13.5 bricks per sq ft -> 100 * 13.5 = 1350 bricks
    expect(result.totalBricks).toBe(1350);

    // Plaster both sides: 100 * 2 = 200 sq ft
    expect(result.totalPlasterSqFt).toBe(200);

    // Cement bags: 1350/100 (13.5) + 200/100 (2) = 15.5 * 1.1 = 17
    expect(result.estimatedCementBags).toBeGreaterThanOrEqual(16);
  });

  it('deducts door and window openings from net wall area', () => {
    // 20 ft long wall (240 inches)
    const wall: WallElement = {
      id: 'w1',
      type: 'wall',
      start: { x: 0, y: 0 },
      end: { x: 240, y: 0 },
      thickness: 9,
    };

    // Door: 3ft x 7ft (36" x 84") = 21 sq ft
    const door: DoorElement = {
      id: 'd1',
      type: 'door',
      wallId: 'w1',
      offset: 24,
      width: 36,
      height: 84,
      swingDirection: 'inside_left',
      openAngle: 90,
    };

    // Window: 4ft x 4ft (48" x 48") = 16 sq ft
    const window: WindowElement = {
      id: 'win1',
      type: 'window',
      wallId: 'w1',
      offset: 120,
      width: 48,
      height: 48,
      depth: 9,
    };

    const elements: PlanElement[] = [wall, door, window];
    const settings = { ...defaultEstimatorSettings, wastagePercent: 0 };
    const result = calculateEstimates(elements, settings);

    // Gross area: 20ft * 10ft = 200 sq ft
    expect(result.totalGrossAreaSqFt).toBe(200);

    // Total openings deducted: 21 (door) + 16 (window) = 37 sq ft
    expect(result.totalOpeningsAreaSqFt).toBe(37);

    // Net area: 200 - 37 = 163 sq ft
    expect(result.totalNetWallAreaSqFt).toBe(163);

    // Bricks based on net area: 163 * 13.5 = 2200.5 -> 2201 bricks
    expect(result.totalBricks).toBe(Math.round(163 * 13.5));
  });

  it('generates well-formatted CSV with project name and table rows', () => {
    const elements: PlanElement[] = [
      {
        id: 'w1',
        type: 'wall',
        start: { x: 0, y: 0 },
        end: { x: 120, y: 0 },
        thickness: 9,
      },
    ];

    const result = calculateEstimates(elements);
    const csv = generateEstimatesCSV('Chaudhry Villa', result, defaultEstimatorSettings);

    expect(csv).toContain('NAQSHA - Materials & Masonry Estimation Sheet');
    expect(csv).toContain('Chaudhry Villa');
    expect(csv).toContain('Wall Thickness (in)');
    expect(csv).toContain('TOTALS & SUMMARY');
  });
});
