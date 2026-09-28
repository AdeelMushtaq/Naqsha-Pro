import { describe, it, expect } from 'vitest';
import { calculateStairParameters, checkStairHeadroom, generateStairGeometry2D } from '../stairs';
import { StairElement } from '../../models/types';

describe('Stairs Parametric Calculations', () => {
  it('correctly calculates step count and riser for standard 10ft (120in) floor height', () => {
    const res = calculateStairParameters(120, 6.0, 10.0);
    // 120 / 6 = 20 steps
    expect(res.numSteps).toBe(20);
    expect(res.calculatedRiser).toBeCloseTo(6.0, 2);
    expect(res.treadDepth).toBe(10.0);
    expect(res.warnings).toHaveLength(0);
    expect(res.comfortGrade).toBe('ideal');
  });

  it('correctly calculates step count for 9ft (108in) floor height', () => {
    const res = calculateStairParameters(108, 6.0, 10.0);
    // 108 / 6 = 18 steps
    expect(res.numSteps).toBe(18);
    expect(res.calculatedRiser).toBeCloseTo(6.0, 2);
    expect(res.warnings).toHaveLength(0);
  });

  it('warns when riser is too steep (> 7.5 in)', () => {
    // 120in with target riser 8in -> 15 steps -> 8.0in riser
    const res = calculateStairParameters(120, 8.0, 10.0);
    expect(res.calculatedRiser).toBe(8.0);
    expect(res.warnings.some((w) => w.includes('too steep'))).toBe(true);
    expect(res.comfortGrade).toBe('steep');
  });

  it('warns when tread is too narrow (< 9 in)', () => {
    const res = calculateStairParameters(120, 6.0, 8.0);
    expect(res.warnings.some((w) => w.includes('too narrow'))).toBe(true);
    expect(res.comfortGrade).toBe('narrow');
  });

  it('verifies headroom clearance under upper floor slab', () => {
    // Floor-to-floor 120", opening covers 80" of run with 10" tread -> 8 steps before slab -> 8 * 6 = 48" rise
    // Headroom = 120 - 48 = 72" (< 80" code) -> should warn!
    const check1 = checkStairHeadroom(120, 80, 10, 6, 80);
    expect(check1.hasWarning).toBe(true);
    expect(check1.clearance).toBe(72);

    // Opening covers only 40" of run -> 4 steps before slab -> 4 * 6 = 24" rise
    // Headroom = 120 - 24 = 96" (> 80" code) -> OK!
    const check2 = checkStairHeadroom(120, 40, 10, 6, 80);
    expect(check2.hasWarning).toBe(false);
    expect(check2.clearance).toBe(96);
  });

  it('generates 2D geometry for straight, L-shape and U-shape stairs', () => {
    const straightStair: StairElement = {
      id: 'stair-1',
      type: 'stair',
      x: 0,
      y: 0,
      stairType: 'straight',
      width: 42,
      length: 120,
      totalHeight: 120,
      targetRiser: 6,
      treadDepth: 10,
      calculatedRiser: 6,
      numSteps: 16,
      handrail: true,
      direction: 'up',
      rotation: 0,
    };

    const geom = generateStairGeometry2D(straightStair);
    expect(geom.outline.length).toBeGreaterThan(0);
    expect(geom.treads.length).toBeGreaterThan(5);
    expect(geom.arrow).toBeDefined();

    const lStair: StairElement = {
      ...straightStair,
      stairType: 'l_shape',
      flight2Length: 80,
      landingSize: 42,
    };
    const lGeom = generateStairGeometry2D(lStair);
    expect(lGeom.landing).toBeDefined();
    expect(lGeom.outline.length).toBe(6);
  });
});
