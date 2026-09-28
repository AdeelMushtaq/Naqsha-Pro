import { PlanElement, WallElement, CurveWallElement } from '../models/types';
import { getWallLength, getCurveWallArc } from './geometry';

export interface EstimatorSettings {
  wallHeightFt: number; // default 10 ft
  brickLengthIn: number; // default 9 in
  brickWidthIn: number; // default 4.5 in
  brickHeightIn: number; // default 3 in
  wastagePercent: number; // default 5%
}

export const defaultEstimatorSettings: EstimatorSettings = {
  wallHeightFt: 10,
  brickLengthIn: 9,
  brickWidthIn: 4.5,
  brickHeightIn: 3,
  wastagePercent: 5,
};

export interface WallThicknessBreakdown {
  thicknessInches: number;
  linearLengthFt: number;
  grossAreaSqFt: number;
  openingsAreaSqFt: number;
  netAreaSqFt: number;
  brickCount: number;
  plasterAreaSqFt: number;
}

export interface MaterialEstimationResult {
  breakdown: WallThicknessBreakdown[];
  totalLinearLengthFt: number;
  totalGrossAreaSqFt: number;
  totalOpeningsAreaSqFt: number;
  totalNetWallAreaSqFt: number;
  totalBricks: number;
  totalPlasterSqFt: number;
  estimatedCementBags: number;
  estimatedSandCft: number;
}

/**
 * Calculates contractor material estimates for the floor plan
 */
export function calculateEstimates(
  elements: PlanElement[],
  settings: EstimatorSettings = defaultEstimatorSettings
): MaterialEstimationResult {
  const heightFt = settings.wallHeightFt;
  const wasteMultiplier = 1 + settings.wastagePercent / 100;

  // Group walls by thickness
  const thicknessMap = new Map<number, { lengthInches: number; wallIds: string[] }>();

  elements.forEach((el) => {
    if (el.type === 'wall') {
      const len = getWallLength(el);
      const th = Math.round((el.thickness || 9) * 10) / 10;
      const current = thicknessMap.get(th) || { lengthInches: 0, wallIds: [] };
      current.lengthInches += len;
      current.wallIds.push(el.id);
      thicknessMap.set(th, current);
    } else if (el.type === 'curve_wall') {
      const arc = getCurveWallArc(el);
      const th = Math.round((el.thickness || 9) * 10) / 10;
      const current = thicknessMap.get(th) || { lengthInches: 0, wallIds: [] };
      current.lengthInches += arc.length;
      current.wallIds.push(el.id);
      thicknessMap.set(th, current);
    }
  });

  // Calculate opening areas by wallId
  const openingsAreaByWall = new Map<string, number>();

  elements.forEach((el) => {
    if (el.type === 'door') {
      const areaSqFt = (el.width * el.height) / 144;
      const prev = openingsAreaByWall.get(el.wallId) || 0;
      openingsAreaByWall.set(el.wallId, prev + areaSqFt);
    } else if (el.type === 'window') {
      const areaSqFt = (el.width * el.height) / 144;
      const prev = openingsAreaByWall.get(el.wallId) || 0;
      openingsAreaByWall.set(el.wallId, prev + areaSqFt);
    }
  });

  // Bricks per sq ft formula for standard 9" x 4.5" x 3" brick (with mortar joint ~3/8"):
  // Nominal standard rule of thumb: ~13.5 bricks/sq ft for 9" wall; ~6.75 for 4.5" wall; ~20.25 for 13.5" wall
  const baseRatePerSqFt9Inch = 13.5;

  const breakdown: WallThicknessBreakdown[] = [];
  let totalLinearLengthFt = 0;
  let totalGrossAreaSqFt = 0;
  let totalOpeningsAreaSqFt = 0;
  let totalNetWallAreaSqFt = 0;
  let totalBricks = 0;
  let totalPlasterSqFt = 0;

  thicknessMap.forEach((data, th) => {
    const linFt = data.lengthInches / 12;
    const grossArea = linFt * heightFt;

    // Sum openings on these walls
    let openings = 0;
    data.wallIds.forEach((id) => {
      openings += openingsAreaByWall.get(id) || 0;
    });

    const netArea = Math.max(0, grossArea - openings);
    const brickRate = (th / 9) * baseRatePerSqFt9Inch;
    const rawBricks = netArea * brickRate * wasteMultiplier;
    const bricks = Math.round(rawBricks);
    const plasterArea = Math.round(netArea * 2 * 10) / 10; // both sides

    breakdown.push({
      thicknessInches: th,
      linearLengthFt: Math.round(linFt * 10) / 10,
      grossAreaSqFt: Math.round(grossArea * 10) / 10,
      openingsAreaSqFt: Math.round(openings * 10) / 10,
      netAreaSqFt: Math.round(netArea * 10) / 10,
      brickCount: bricks,
      plasterAreaSqFt: plasterArea,
    });

    totalLinearLengthFt += linFt;
    totalGrossAreaSqFt += grossArea;
    totalOpeningsAreaSqFt += openings;
    totalNetWallAreaSqFt += netArea;
    totalBricks += bricks;
    totalPlasterSqFt += plasterArea;
  });

  // Sort by thickness ascending
  breakdown.sort((a, b) => a.thicknessInches - b.thicknessInches);

  // Cement bags estimate:
  // Masonry: ~1 bag per 100 bricks
  // Plaster: ~1 bag per 100 sq ft plaster
  const cementBagsMasonry = totalBricks / 100;
  const cementBagsPlaster = totalPlasterSqFt / 100;
  const totalCementBags = Math.round((cementBagsMasonry + cementBagsPlaster) * 1.1); // 10% safety margin

  // Sand: ~15 cft per 100 bricks + ~15 cft per 100 sq ft plaster
  const sandCft = Math.round((totalBricks / 100) * 15 + (totalPlasterSqFt / 100) * 15);

  return {
    breakdown,
    totalLinearLengthFt: Math.round(totalLinearLengthFt * 10) / 10,
    totalGrossAreaSqFt: Math.round(totalGrossAreaSqFt * 10) / 10,
    totalOpeningsAreaSqFt: Math.round(totalOpeningsAreaSqFt * 10) / 10,
    totalNetWallAreaSqFt: Math.round(totalNetWallAreaSqFt * 10) / 10,
    totalBricks,
    totalPlasterSqFt: Math.round(totalPlasterSqFt * 10) / 10,
    estimatedCementBags: totalCementBags,
    estimatedSandCft: sandCft,
  };
}

/**
 * Generates downloadable CSV content
 */
export function generateEstimatesCSV(
  projectName: string,
  result: MaterialEstimationResult,
  settings: EstimatorSettings
): string {
  const rows: string[][] = [
    ['NAQSHA - Materials & Masonry Estimation Sheet'],
    ['Project Name', projectName],
    ['Date', new Date().toLocaleDateString()],
    ['Assumed Wall Height (ft)', String(settings.wallHeightFt)],
    ['Brick Size (L x W x H inches)', `${settings.brickLengthIn} x ${settings.brickWidthIn} x ${settings.brickHeightIn}`],
    ['Wastage Allowance (%)', `${settings.wastagePercent}%`],
    [],
    [
      'Wall Thickness (in)',
      'Linear Length (ft)',
      'Gross Elevation (sq ft)',
      'Openings Deduction (sq ft)',
      'Net Elevation (sq ft)',
      'Bricks Count',
      'Plaster Area (sq ft)',
    ],
  ];

  result.breakdown.forEach((b) => {
    rows.push([
      `${b.thicknessInches}"`,
      String(b.linearLengthFt),
      String(b.grossAreaSqFt),
      String(b.openingsAreaSqFt),
      String(b.netAreaSqFt),
      String(b.brickCount),
      String(b.plasterAreaSqFt),
    ]);
  });

  rows.push([]);
  rows.push(['TOTALS & SUMMARY']);
  rows.push(['Total Wall Linear Length (ft)', String(result.totalLinearLengthFt)]);
  rows.push(['Total Net Wall Elevation Area (sq ft)', String(result.totalNetWallAreaSqFt)]);
  rows.push(['Total Estimated Bricks (with wastage)', String(result.totalBricks)]);
  rows.push(['Total Plaster Area (sq ft, 2 sides)', String(result.totalPlasterSqFt)]);
  rows.push(['Estimated Cement Bags', String(result.estimatedCementBags)]);
  rows.push(['Estimated Sand (cft)', String(result.estimatedSandCft)]);

  return rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
}

/**
 * Downloads CSV file in browser
 */
export function exportEstimatesToCSV(
  projectName: string,
  result: MaterialEstimationResult,
  settings: EstimatorSettings
): void {
  const csvContent = generateEstimatesCSV(projectName, result, settings);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = projectName.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'naqsha';
  link.download = `${safeName}_material_estimation.csv`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
