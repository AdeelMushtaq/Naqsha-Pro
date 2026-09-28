import { describe, it, expect } from 'vitest';
import {
  parseLengthInput,
  formatArchitectural,
  formatLength,
  formatArea,
  formatPerimeter,
} from '../units';

describe('units.ts', () => {
  describe('parseLengthInput', () => {
    it('parses feet and inches string like 10\'6"', () => {
      expect(parseLengthInput('10\'6"')).toBe(126);
      expect(parseLengthInput('10\' 6"')).toBe(126);
      expect(parseLengthInput('10 ft 6 in')).toBe(126);
      expect(parseLengthInput('10ft 6in')).toBe(126);
    });

    it('parses feet with fractional inches like 10\' 6 1/2"', () => {
      expect(parseLengthInput('10\' 6 1/2"')).toBe(126.5);
      expect(parseLengthInput('10\' 6.5"')).toBe(126.5);
    });

    it('parses explicit feet only like 10\' and 10 ft', () => {
      expect(parseLengthInput('10\'')).toBe(120);
      expect(parseLengthInput('10 ft')).toBe(120);
      expect(parseLengthInput('10.5 ft')).toBe(126);
    });

    it('parses explicit inches only like 126" and 126 in', () => {
      expect(parseLengthInput('126"')).toBe(126);
      expect(parseLengthInput('126 in')).toBe(126);
      expect(parseLengthInput('126.5"')).toBe(126.5);
      expect(parseLengthInput('6 1/2"')).toBe(6.5);
    });

    it('parses naked numbers based on current unit system', () => {
      // In feet mode, 10 means 10 feet = 120 inches
      expect(parseLengthInput('10', 'ft')).toBe(120);
      expect(parseLengthInput(10, 'ft')).toBe(120);
      expect(parseLengthInput('10.5', 'ft')).toBe(126);

      // In inches mode, 10 means 10 inches
      expect(parseLengthInput('10', 'in')).toBe(10);
      expect(parseLengthInput(10, 'in')).toBe(10);
      expect(parseLengthInput('126', 'in')).toBe(126);
    });

    it('handles zero and invalid inputs gracefully', () => {
      expect(parseLengthInput('')).toBe(0);
      expect(parseLengthInput('invalid')).toBe(0);
      expect(parseLengthInput(0)).toBe(0);
    });
  });

  describe('formatArchitectural and formatLength', () => {
    it('formats exact feet and inches properly', () => {
      expect(formatArchitectural(126)).toBe('10\' 6"');
      expect(formatArchitectural(120)).toBe('10\' 0"');
      expect(formatArchitectural(6)).toBe('6"');
      expect(formatArchitectural(0)).toBe('0"');
    });

    it('formats fractional inches to nearest 1/8"', () => {
      expect(formatArchitectural(126.5)).toBe('10\' 6 1/2"');
      expect(formatArchitectural(126.25)).toBe('10\' 6 1/4"');
    });

    it('formats according to unit system', () => {
      expect(formatLength(126, 'ft')).toBe('10\' 6"');
      expect(formatLength(126, 'in')).toBe('126"');
      expect(formatLength(126, 'ft', 'decimal')).toBe('10.5 ft');
    });
  });

  describe('formatArea & formatPerimeter', () => {
    it('calculates and formats area correctly', () => {
      // 10 ft x 10 ft = 120" x 120" = 14400 sq inches = 100 sq ft
      expect(formatArea(14400, 'ft')).toBe('100 sq ft');
      expect(formatArea(144, 'ft')).toBe('1 sq ft');
      expect(formatArea(100, 'in')).toBe('100 sq in');
    });

    it('formats perimeter correctly', () => {
      expect(formatPerimeter(120, 'ft')).toBe('10\' 0"');
      expect(formatPerimeter(120, 'in')).toBe('120"');
    });
  });
});
