/**
 * Format Utility Tests
 * Tests for utils/format.ts - formatting utilities
 */

import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatFileSize,
} from '../utils/format';

describe('Format Utilities', () => {
  describe('formatNumber', () => {
    it('should format numbers with default separator', () => {
      expect(formatNumber(1234.56)).toBe('1,234.56');
    });

    it('should format integers', () => {
      expect(formatNumber(1000)).toBe('1,000');
    });

    it('should format negative numbers', () => {
      expect(formatNumber(-1234.56)).toBe('-1,234.56');
    });

    it('should format with custom separator', () => {
      expect(formatNumber(1234.56, '.')).toBe('1.234.56');
      expect(formatNumber(1234.56, ' ')).toBe('1 234.56');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('should handle very large numbers', () => {
      expect(formatNumber(1000000000)).toBe('1,000,000,000');
    });

    it('should handle very small numbers', () => {
      expect(formatNumber(0.0001)).toBe('0.0001');
    });

    it('should handle decimal numbers', () => {
      expect(formatNumber(1234567.89)).toBe('1,234,567.89');
    });

    it('should format single digit numbers', () => {
      expect(formatNumber(5)).toBe('5');
    });

    it('should format numbers with multiple decimal places', () => {
      expect(formatNumber(1234.56789)).toBe('1,234.56789');
    });
  });

  describe('formatFileSize', () => {
    it('should format zero bytes', () => {
      expect(formatFileSize(0)).toBe('0.0 B');
    });

    it('should format bytes', () => {
      expect(formatFileSize(512)).toBe('512.0 B');
      expect(formatFileSize(1023)).toBe('1023.0 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(2048)).toBe('2.0 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
      expect(formatFileSize(2097152)).toBe('2.0 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1.0 GB');
      expect(formatFileSize(1610612736)).toBe('1.5 GB');
    });

    it('should format terabytes', () => {
      expect(formatFileSize(1099511627776)).toBe('1.0 TB');
    });

    it('should format petabytes', () => {
      expect(formatFileSize(1125899906842624)).toBe('1.0 PB');
    });

    it('should format with custom decimals', () => {
      expect(formatFileSize(1536, 0)).toBe('2 KB');
      expect(formatFileSize(1536, 1)).toBe('1.5 KB');
      expect(formatFileSize(1536, 2)).toBe('1.50 KB');
      expect(formatFileSize(1536, 3)).toBe('1.500 KB');
    });

    it('should handle NaN', () => {
      expect(formatFileSize(NaN)).toBe('NaN B');
    });

    it('should handle Infinity', () => {
      expect(formatFileSize(Infinity)).toBe('Infinity B');
    });

    it('should handle very large values', () => {
      const veryLarge = 1125899906842624 * 1000; // 1000 PB
      expect(formatFileSize(veryLarge)).toMatch(/^\d+(\.\d+)? (PB|EB|ZB|YB)$/);
    });

    it('should handle fractional values in different units', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
      expect(formatFileSize(1610612736)).toBe('1.5 GB');
    });

    it('should format exact boundaries', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(1073741824)).toBe('1.0 GB');
      expect(formatFileSize(1099511627776)).toBe('1.0 TB');
    });

    it('should handle negative values', () => {
      expect(formatFileSize(-1024)).toBe('-1.0 KB');
      expect(formatFileSize(-1048576)).toBe('-1.0 MB');
    });
  });
});
