/**
 * Parametric Stairs calculations, comfort/code validation, and geometry generators.
 * All dimensions are in INCHES.
 */

import { Point2D, StairElement, StairType } from '../models/types';

export interface StairCalculationResult {
  numSteps: number;
  calculatedRiser: number; // inches
  treadDepth: number; // inches
  totalRun: number; // inches
  blondelValue: number; // 2R + T (ideal 24" - 25.5")
  warnings: string[];
  comfortGrade: 'ideal' | 'acceptable' | 'steep' | 'narrow';
}

export function calculateStairParameters(
  totalHeight: number,
  targetRiser: number = 6.0,
  treadDepth: number = 10.0
): StairCalculationResult {
  const safeHeight = Math.max(12, totalHeight);
  const safeTargetRiser = Math.max(3, Math.min(12, targetRiser));
  const safeTread = Math.max(6, treadDepth);

  const numSteps = Math.max(1, Math.round(safeHeight / safeTargetRiser));
  const calculatedRiser = safeHeight / numSteps;
  const totalRun = (numSteps - 1) * safeTread;
  const blondelValue = 2 * calculatedRiser + safeTread;

  const warnings: string[] = [];

  if (calculatedRiser > 7.5) {
    warnings.push(`Riser too steep (${calculatedRiser.toFixed(1)}" > 7.5" max code). Climbing will be tiring.`);
  } else if (calculatedRiser < 4.0) {
    warnings.push(`Riser very low (${calculatedRiser.toFixed(1)}" < 4.0").`);
  }

  if (safeTread < 9.0) {
    warnings.push(`Tread too narrow (${safeTread.toFixed(1)}" < 9.0" min code). Risk of slipping.`);
  }

  let comfortGrade: StairCalculationResult['comfortGrade'] = 'ideal';
  if (calculatedRiser > 7.5 || safeTread < 9.0) {
    comfortGrade = calculatedRiser > 7.5 ? 'steep' : 'narrow';
  } else if (blondelValue < 22 || blondelValue > 26.5) {
    comfortGrade = 'acceptable';
  }

  return {
    numSteps,
    calculatedRiser,
    treadDepth: safeTread,
    totalRun,
    blondelValue,
    warnings,
    comfortGrade,
  };
}

export interface TreadLine2D {
  start: Point2D;
  end: Point2D;
  index: number;
}

export interface LandingPolygon2D {
  points: Point2D[];
}

export interface StairGeometry2D {
  outline: Point2D[];
  treads: TreadLine2D[];
  landing?: LandingPolygon2D;
  breakLine?: { start: Point2D; end: Point2D };
  arrow: {
    start: Point2D;
    end: Point2D;
    head1: Point2D;
    head2: Point2D;
    labelPos: Point2D;
  };
}

/**
 * Calculates 2D plan projection geometry (relative to stair origin (x, y))
 */
export function generateStairGeometry2D(stair: StairElement): StairGeometry2D {
  const { stairType, width, length, flight2Length = 80, landingSize = 42, numSteps } = stair;
  const treadDepth = stair.treadDepth || 10;
  const safeWidth = Math.max(24, width);

  const treads: TreadLine2D[] = [];
  let outline: Point2D[] = [];
  let landing: LandingPolygon2D | undefined;

  if (stairType === 'straight') {
    const run = Math.max(treadDepth * (numSteps - 1), length || 120);
    const stepCount = Math.max(2, Math.floor(run / treadDepth));
    const stepSpacing = run / stepCount;

    outline = [
      { x: 0, y: 0 },
      { x: run, y: 0 },
      { x: run, y: safeWidth },
      { x: 0, y: safeWidth },
    ];

    for (let i = 1; i < stepCount; i++) {
      const tx = i * stepSpacing;
      treads.push({
        start: { x: tx, y: 0 },
        end: { x: tx, y: safeWidth },
        index: i,
      });
    }

    const midY = safeWidth / 2;
    const arrowStart = { x: run * 0.15, y: midY };
    const arrowEnd = { x: run * 0.85, y: midY };
    const headLen = 10;
    const headAngle = Math.PI / 6;

    return {
      outline,
      treads,
      breakLine: {
        start: { x: run * 0.5 - 6, y: -4 },
        end: { x: run * 0.5 + 6, y: safeWidth + 4 },
      },
      arrow: {
        start: arrowStart,
        end: arrowEnd,
        head1: {
          x: arrowEnd.x - headLen * Math.cos(-headAngle),
          y: arrowEnd.y - headLen * Math.sin(-headAngle),
        },
        head2: {
          x: arrowEnd.x - headLen * Math.cos(headAngle),
          y: arrowEnd.y - headLen * Math.sin(headAngle),
        },
        labelPos: { x: run * 0.5, y: midY - 8 },
      },
    };
  }

  if (stairType === 'l_shape') {
    const flight1Steps = Math.ceil(numSteps / 2);
    const flight2Steps = numSteps - flight1Steps;
    const f1Run = Math.max(treadDepth * (flight1Steps - 1), length);
    const f2Run = Math.max(treadDepth * (flight2Steps - 1), flight2Length);
    const land = Math.max(safeWidth, landingSize);

    // Flight 1 treads (along X)
    const f1StepSpacing = f1Run / Math.max(1, flight1Steps);
    for (let i = 1; i <= flight1Steps; i++) {
      const tx = i * f1StepSpacing;
      treads.push({
        start: { x: tx, y: 0 },
        end: { x: tx, y: safeWidth },
        index: i,
      });
    }

    // Landing box
    landing = {
      points: [
        { x: f1Run, y: 0 },
        { x: f1Run + land, y: 0 },
        { x: f1Run + land, y: land },
        { x: f1Run, y: land },
      ],
    };

    // Flight 2 treads (going up in +Y from landing)
    const f2StepSpacing = f2Run / Math.max(1, flight2Steps);
    for (let j = 1; j <= flight2Steps; j++) {
      const ty = land + j * f2StepSpacing;
      treads.push({
        start: { x: f1Run + land - safeWidth, y: ty },
        end: { x: f1Run + land, y: ty },
        index: flight1Steps + j,
      });
    }

    outline = [
      { x: 0, y: 0 },
      { x: f1Run + land, y: 0 },
      { x: f1Run + land, y: land + f2Run },
      { x: f1Run + land - safeWidth, y: land + f2Run },
      { x: f1Run + land - safeWidth, y: safeWidth },
      { x: 0, y: safeWidth },
    ];

    const arrowEnd = { x: f1Run + land - safeWidth / 2, y: land + f2Run * 0.85 };
    return {
      outline,
      treads,
      landing,
      arrow: {
        start: { x: f1Run * 0.2, y: safeWidth / 2 },
        end: arrowEnd,
        head1: { x: arrowEnd.x - 6, y: arrowEnd.y - 10 },
        head2: { x: arrowEnd.x + 6, y: arrowEnd.y - 10 },
        labelPos: { x: f1Run + land / 2, y: land / 2 },
      },
    };
  }

  if (stairType === 'u_shape') {
    const flightSteps = Math.ceil(numSteps / 2);
    const fRun = Math.max(treadDepth * (flightSteps - 1), length);
    const land = Math.max(safeWidth, landingSize);
    const gap = 8; // gap between flights

    const stepSpacing = fRun / Math.max(1, flightSteps);
    // Flight 1 (forward)
    for (let i = 1; i <= flightSteps; i++) {
      const tx = i * stepSpacing;
      treads.push({
        start: { x: tx, y: 0 },
        end: { x: tx, y: safeWidth },
        index: i,
      });
    }

    // Landing
    landing = {
      points: [
        { x: fRun, y: 0 },
        { x: fRun + land, y: 0 },
        { x: fRun + land, y: safeWidth * 2 + gap },
        { x: fRun, y: safeWidth * 2 + gap },
      ],
    };

    // Flight 2 (backward returning)
    for (let j = 1; j <= flightSteps; j++) {
      const tx = fRun - j * stepSpacing;
      treads.push({
        start: { x: tx, y: safeWidth + gap },
        end: { x: tx, y: safeWidth * 2 + gap },
        index: flightSteps + j,
      });
    }

    outline = [
      { x: 0, y: 0 },
      { x: fRun + land, y: 0 },
      { x: fRun + land, y: safeWidth * 2 + gap },
      { x: 0, y: safeWidth * 2 + gap },
      { x: 0, y: safeWidth + gap },
      { x: fRun, y: safeWidth + gap },
      { x: fRun, y: safeWidth },
      { x: 0, y: safeWidth },
    ];

    const arrowEnd = { x: fRun * 0.2, y: safeWidth + gap + safeWidth / 2 };
    return {
      outline,
      treads,
      landing,
      arrow: {
        start: { x: fRun * 0.2, y: safeWidth / 2 },
        end: arrowEnd,
        head1: { x: arrowEnd.x + 8, y: arrowEnd.y - 6 },
        head2: { x: arrowEnd.x + 8, y: arrowEnd.y + 6 },
        labelPos: { x: fRun + land / 2, y: safeWidth + gap / 2 },
      },
    };
  }

  // Spiral or Winder fallback
  const radius = Math.max(36, safeWidth);
  const center = { x: radius, y: radius };
  const totalAngle = (stairType === 'spiral' ? 360 : 180) * (Math.PI / 180);
  const angleStep = totalAngle / Math.max(1, numSteps);

  for (let i = 0; i < numSteps; i++) {
    const a = i * angleStep;
    treads.push({
      start: { x: center.x + 6 * Math.cos(a), y: center.y + 6 * Math.sin(a) },
      end: { x: center.x + radius * Math.cos(a), y: center.y + radius * Math.sin(a) },
      index: i + 1,
    });
  }

  outline = [
    { x: 0, y: 0 },
    { x: radius * 2, y: 0 },
    { x: radius * 2, y: radius * 2 },
    { x: 0, y: radius * 2 },
  ];

  return {
    outline,
    treads,
    arrow: {
      start: { x: center.x + radius * 0.6, y: center.y },
      end: { x: center.x, y: center.y + radius * 0.6 },
      head1: { x: center.x - 4, y: center.y + radius * 0.5 },
      head2: { x: center.x + 6, y: center.y + radius * 0.5 },
      labelPos: { x: center.x, y: center.y },
    },
  };
}

/**
 * Checks headroom clearance for stairs against a floor slab or overhead beams.
 * Standard residential/commercial requirement: minimum 80 inches (6 ft 8 in).
 */
export function checkStairHeadroom(
  floorToFloorHeight: number,
  stairOpeningLength: number,
  treadDepth: number,
  riserHeight: number,
  requiredHeadroom: number = 80
): { hasWarning: boolean; clearance: number; message: string } {
  // If the slab cut starts after step K, at that step the riser elevation is K * R.
  // Headroom = FloorToFloorHeight - (K * R).
  // If stair opening length covers L inches, steps under the slab start at X = L.
  const stepsBeforeSlab = Math.max(1, Math.floor(stairOpeningLength / treadDepth));
  const stepRiseUnderSlab = stepsBeforeSlab * riserHeight;
  const actualHeadroom = floorToFloorHeight - stepRiseUnderSlab;

  if (actualHeadroom < requiredHeadroom) {
    return {
      hasWarning: true,
      clearance: actualHeadroom,
      message: `Headroom warning: Only ${(actualHeadroom / 12).toFixed(1)} ft (${Math.round(
        actualHeadroom
      )}") under slab. Minimum code is 6'-8" (80"). Increase upper floor opening.`,
    };
  }

  return {
    hasWarning: false,
    clearance: actualHeadroom,
    message: `Headroom OK: ${(actualHeadroom / 12).toFixed(1)} ft (${Math.round(actualHeadroom)}") clearance.`,
  };
}
