import { UnitSystem, AreaUnit } from '../models/types';

export const SQ_INCHES_PER_SQ_FT = 144;
export const SQ_FT_PER_SQ_YD = 9;
export const SQ_FT_PER_MARLA = 272.25;
export const MARLA_PER_KANAL = 20;
export const SQ_FT_PER_KANAL = SQ_FT_PER_MARLA * MARLA_PER_KANAL; // 5445 sq ft
export const SQ_FT_PER_SQ_M = 10.7639;

/**
 * Parses user input into inches (float).
 * Supports:
 * - Direct numbers: "10" or "10.5" (interpreted in current unitSystem if no explicit unit found)
 * - Feet & inches: "10' 6\"", "10'6\"", "10 ft 6 in", "10ft 6in", "10' 6.5\""
 * - Feet only: "10'", "10 ft", "10ft"
 * - Inches only: "126\"", "126 in", "126in"
 * - Fractions: "6 1/2\"", "10' 6 1/2\"", "1/4\""
 */
export function parseLengthInput(
  rawInput: string | number,
  currentUnit: UnitSystem = 'ft'
): number {
  if (typeof rawInput === 'number') {
    if (isNaN(rawInput)) return 0;
    return currentUnit === 'ft' ? rawInput * 12 : rawInput;
  }

  if (!rawInput || typeof rawInput !== 'string') return 0;

  const text = rawInput.trim().toLowerCase();
  if (text.length === 0) return 0;

  // Helper to parse fractions like "1/2" or "6 1/2"
  const parseFractionOrDecimal = (valStr: string): number => {
    valStr = valStr.trim();
    if (!valStr) return 0;

    // Check for mixed fraction: "6 1/2"
    if (valStr.includes(' ')) {
      const parts = valStr.split(/\s+/);
      if (parts.length === 2) {
        return parseFloat(parts[0]) + parseFractionOrDecimal(parts[1]);
      }
    }

    // Check for simple fraction: "1/2"
    if (valStr.includes('/')) {
      const [num, den] = valStr.split('/').map(Number);
      if (!isNaN(num) && !isNaN(den) && den !== 0) {
        return num / den;
      }
    }

    const n = parseFloat(valStr);
    return isNaN(n) ? 0 : n;
  };

  // 1. Check for Feet + Inches notation: 10' 6" or 10 ft 6 in or 10'6.5"
  // e.g., 10' 6", 10'6", 10 ft 6 in, 10ft 6.5in
  const feetInchesRegex =
    /^(-?\d+(?:\.\d+)?)\s*(?:'|ft|foot|feet)\s*([0-9\s/.]+)?\s*(?:"|in|inch|inches)?$/i;
  const feetInchesMatch = text.match(feetInchesRegex);
  if (feetInchesMatch) {
    const feet = parseFloat(feetInchesMatch[1]) || 0;
    const inchStr = feetInchesMatch[2];
    const inches = inchStr ? parseFractionOrDecimal(inchStr) : 0;
    const sign = feet < 0 ? -1 : 1;
    return feet * 12 + sign * inches;
  }

  // 2. Check for explicit feet only: e.g. "10'", "10 ft", "10.5 ft"
  const feetOnlyRegex = /^(-?\d+(?:\.\d+)?)\s*(?:'|ft|foot|feet)$/i;
  const feetOnlyMatch = text.match(feetOnlyRegex);
  if (feetOnlyMatch) {
    return (parseFloat(feetOnlyMatch[1]) || 0) * 12;
  }

  // 3. Check for explicit inches only: e.g. "126\"", "126 in", "126.5\"", "6 1/2\""
  const inchOnlyRegex = /^([0-9\s/.-]+)\s*(?:"|in|inch|inches)$/i;
  const inchOnlyMatch = text.match(inchOnlyRegex);
  if (inchOnlyMatch) {
    return parseFractionOrDecimal(inchOnlyMatch[1]);
  }

  // 4. Plain fraction or decimal without unit suffix
  const val = parseFractionOrDecimal(text);
  if (isNaN(val)) return 0;

  // If no unit symbol specified, apply currentUnit
  return currentUnit === 'ft' ? val * 12 : val;
}

/**
 * Format internal inches into architectural feet and inches:
 * e.g., 126 -> "10' 6\""
 * e.g., 126.5 -> "10' 6 1/2\""
 */
export function formatArchitectural(inches: number, precision: 8 | 16 = 8): string {
  if (isNaN(inches)) return '0"';

  const sign = inches < 0 ? '-' : '';
  const absInches = Math.abs(inches);

  const feet = Math.floor(absInches / 12);
  const remainingInches = absInches - feet * 12;

  // Whole inches and fraction
  const wholeInches = Math.floor(remainingInches);
  const fractionPart = remainingInches - wholeInches;

  // Round fraction to precision (e.g. 1/8)
  const steps = Math.round(fractionPart * precision);
  let finalInches = wholeInches;
  let fractionString = '';

  if (steps === precision) {
    finalInches += 1;
  } else if (steps > 0) {
    // Simplify fraction
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(steps, precision);
    const num = steps / divisor;
    const den = precision / divisor;
    fractionString = `${num}/${den}`;
  }

  let inchDisplay = '';
  if (finalInches > 0 && fractionString) {
    inchDisplay = `${finalInches} ${fractionString}"`;
  } else if (finalInches > 0) {
    inchDisplay = `${finalInches}"`;
  } else if (fractionString) {
    inchDisplay = `${fractionString}"`;
  } else {
    inchDisplay = '0"';
  }

  if (feet === 0) {
    return `${sign}${inchDisplay}`;
  }

  return `${sign}${feet}' ${inchDisplay}`;
}

/**
 * Formats length according to selected unit system.
 */
export function formatLength(
  inches: number,
  unitSystem: UnitSystem,
  style: 'architectural' | 'decimal' = 'architectural'
): string {
  if (isNaN(inches)) return unitSystem === 'ft' ? `0' 0"` : `0"`;

  if (unitSystem === 'in') {
    const rounded = Math.round(inches * 100) / 100;
    return `${rounded}"`;
  }

  // Feet system
  if (style === 'decimal') {
    const feetDecimal = Math.round((inches / 12) * 100) / 100;
    return `${feetDecimal} ft`;
  }

  return formatArchitectural(inches);
}

/**
 * Formats input placeholder or default input value for editors
 */
export function formatInputValue(inches: number, unitSystem: UnitSystem): string {
  if (unitSystem === 'in') {
    return `${Math.round(inches * 100) / 100}`;
  }
  const feet = Math.floor(inches / 12);
  const rem = Math.round((inches % 12) * 10) / 10;
  if (rem === 0) return `${feet}'`;
  return `${feet}' ${rem}"`;
}

/**
 * Formats area in square feet or square inches
 * 1 sq ft = 144 sq in
 */
export function formatArea(
  sqInches: number,
  unitSystem: UnitSystem,
  areaUnit?: AreaUnit
): string {
  if (isNaN(sqInches) || sqInches < 0) return '0';

  if (areaUnit) {
    return formatAreaWithUnit(sqInches, areaUnit);
  }

  if (unitSystem === 'in') {
    const rounded = Math.round(sqInches * 10) / 10;
    return `${rounded.toLocaleString()} sq in`;
  }

  const sqFt = sqInches / SQ_INCHES_PER_SQ_FT;
  const rounded = Math.round(sqFt * 10) / 10;
  return `${rounded.toLocaleString()} sq ft`;
}

/**
 * Converts internal square inches to target area unit
 */
export function convertArea(sqInches: number, targetUnit: AreaUnit): number {
  if (isNaN(sqInches) || sqInches <= 0) return 0;
  const sqFt = sqInches / SQ_INCHES_PER_SQ_FT;

  switch (targetUnit) {
    case 'sqft':
      return sqFt;
    case 'sqyd':
      return sqFt / SQ_FT_PER_SQ_YD;
    case 'marla':
      return sqFt / SQ_FT_PER_MARLA;
    case 'kanal':
      return sqFt / SQ_FT_PER_KANAL;
    case 'sqm':
      return sqFt / SQ_FT_PER_SQ_M;
    default:
      return sqFt;
  }
}

/**
 * Formats area with specific unit (sq ft, sq yd, marla, kanal, sq m)
 */
export function formatAreaWithUnit(sqInches: number, targetUnit: AreaUnit): string {
  const val = convertArea(sqInches, targetUnit);

  switch (targetUnit) {
    case 'sqft':
      return `${(Math.round(val * 10) / 10).toLocaleString()} sq ft`;
    case 'sqyd':
      return `${(Math.round(val * 10) / 10).toLocaleString()} sq yd`;
    case 'marla':
      return `${(Math.round(val * 100) / 100).toLocaleString()} Marla`;
    case 'kanal':
      return `${(Math.round(val * 1000) / 1000).toLocaleString()} Kanal`;
    case 'sqm':
      return `${(Math.round(val * 10) / 10).toLocaleString()} m²`;
  }
}

/**
 * Returns comprehensive breakdown of plot area in Marla, Kanal, Sq Ft, Sq Yd
 */
export function getPlotAreaBreakdown(sqInches: number): {
  sqFt: number;
  marla: number;
  kanal: number;
  sqYd: number;
  sqM: number;
} {
  return {
    sqFt: Math.round(convertArea(sqInches, 'sqft') * 10) / 10,
    marla: Math.round(convertArea(sqInches, 'marla') * 100) / 100,
    kanal: Math.round(convertArea(sqInches, 'kanal') * 1000) / 1000,
    sqYd: Math.round(convertArea(sqInches, 'sqyd') * 10) / 10,
    sqM: Math.round(convertArea(sqInches, 'sqm') * 10) / 10,
  };
}

/**
 * Formats perimeter
 */
export function formatPerimeter(inches: number, unitSystem: UnitSystem): string {
  return formatLength(inches, unitSystem, 'architectural');
}

