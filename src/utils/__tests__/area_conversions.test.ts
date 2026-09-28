import { describe, it, expect } from 'vitest';
import {
  convertArea,
  formatAreaWithUnit,
  SQ_FT_PER_MARLA,
  SQ_FT_PER_KANAL,
  SQ_FT_PER_SQ_YD,
  SQ_FT_PER_SQ_M,
  MARLA_PER_KANAL,
} from '../units';

describe('Area Conversions (Marla, Kanal, Sq Ft, Sq Yd, Sq M)', () => {
  it('verifies standard Pakistani cadastral constants', () => {
    expect(SQ_FT_PER_MARLA).toBe(272.25);
    expect(MARLA_PER_KANAL).toBe(20);
    expect(SQ_FT_PER_KANAL).toBe(272.25 * 20); // 5445 sq ft
    expect(SQ_FT_PER_SQ_YD).toBe(9);
  });

  it('converts sq inches to sq ft accurately', () => {
    // 1 sq ft = 144 sq in
    expect(convertArea(144, 'sqft')).toBe(1);
    expect(convertArea(14400, 'sqft')).toBe(100);
  });

  it('converts to Marla and Kanal accurately', () => {
    // 5 Marla = 5 * 272.25 * 144 sq in
    const fiveMarlaSqInches = 5 * 272.25 * 144;
    expect(convertArea(fiveMarlaSqInches, 'marla')).toBe(5);

    // 10 Marla
    const tenMarlaSqInches = 10 * 272.25 * 144;
    expect(convertArea(tenMarlaSqInches, 'marla')).toBe(10);

    // 1 Kanal = 20 Marla = 5445 sq ft
    const oneKanalSqInches = 5445 * 144;
    expect(convertArea(oneKanalSqInches, 'kanal')).toBe(1);
    expect(convertArea(oneKanalSqInches, 'marla')).toBe(20);
  });

  it('converts to Square Yards and Square Meters', () => {
    // 9 sq ft = 1 sq yd = 9 * 144 sq in
    const oneSqYdSqInches = 9 * 144;
    expect(convertArea(oneSqYdSqInches, 'sqyd')).toBe(1);

    // 1 sq meter = 10.7639 sq ft
    const oneSqMSqInches = SQ_FT_PER_SQ_M * 144;
    expect(Math.round(convertArea(oneSqMSqInches, 'sqm'))).toBe(1);
  });

  it('formats area with correct unit suffix', () => {
    const fiveMarlaSqInches = 5 * 272.25 * 144;
    expect(formatAreaWithUnit(fiveMarlaSqInches, 'marla')).toBe('5 Marla');
    expect(formatAreaWithUnit(fiveMarlaSqInches, 'sqft')).toBe('1,361.3 sq ft');
    expect(formatAreaWithUnit(5445 * 144, 'kanal')).toBe('1 Kanal');
  });
});
