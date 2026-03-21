/**
 * @fileoverview Tests for math utilities
 */

import { describe, it, expect } from 'vitest';
import { clamp, mapRange, lerp } from '../math';

describe('math', () => {
  describe('clamp', () => {
    it('should return value within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(50, 0, 100)).toBe(50);
    });

    it('should clamp to minimum', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(-100, 0, 100)).toBe(0);
      expect(clamp(0, 0, 10)).toBe(0);
    });

    it('should clamp to maximum', () => {
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(100, 0, 100)).toBe(100);
      expect(clamp(1000, 0, 100)).toBe(100);
    });

    it('should handle negative ranges', () => {
      expect(clamp(-5, -10, 10)).toBe(-5);
      expect(clamp(-15, -10, 10)).toBe(-10);
      expect(clamp(15, -10, 10)).toBe(10);
    });

    it('should handle equal min and max', () => {
      expect(clamp(0, 5, 5)).toBe(5);
      expect(clamp(10, 5, 5)).toBe(5);
    });

    it('should handle decimals', () => {
      expect(clamp(5.5, 0, 10)).toBe(5.5);
      expect(clamp(0.5, 1, 10)).toBe(1);
      expect(clamp(9.5, 0, 9)).toBe(9);
    });

    it('should handle zero', () => {
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(-10, 0, 10)).toBe(0);
    });
  });

  describe('mapRange', () => {
    it('should map value between ranges', () => {
      expect(mapRange(5, 0, 10, 0, 100)).toBe(50);
      expect(mapRange(0, 0, 10, 0, 100)).toBe(0);
      expect(mapRange(10, 0, 10, 0, 100)).toBe(100);
    });

    it('should map negative input ranges', () => {
      expect(mapRange(0, -10, 10, 0, 100)).toBe(50);
      expect(mapRange(-10, -10, 10, 0, 100)).toBe(0);
      expect(mapRange(10, -10, 10, 0, 100)).toBe(100);
    });

    it('should map to negative output ranges', () => {
      expect(mapRange(5, 0, 10, -100, 100)).toBe(0);
      expect(mapRange(0, 0, 10, -100, 100)).toBe(-100);
      expect(mapRange(10, 0, 10, -100, 100)).toBe(100);
    });

    it('should handle inverted ranges', () => {
      expect(mapRange(0, 0, 10, 100, 0)).toBe(100);
      expect(mapRange(5, 0, 10, 100, 0)).toBe(50);
      expect(mapRange(10, 0, 10, 100, 0)).toBe(0);
    });

    it('should handle decimals', () => {
      expect(mapRange(0.5, 0, 1, 0, 360)).toBe(180);
      expect(mapRange(0.25, 0, 1, 0, 100)).toBe(25);
    });

    it('should handle different range sizes', () => {
      expect(mapRange(0.5, 0, 1, 0, 10)).toBe(5);
      expect(mapRange(50, 0, 100, 0, 1)).toBe(0.5);
    });
  });

  describe('lerp', () => {
    it('should interpolate between values', () => {
      expect(lerp(0, 100, 0.5)).toBe(50);
      expect(lerp(0, 100, 0)).toBe(0);
      expect(lerp(0, 100, 1)).toBe(100);
    });

    it('should handle t values outside [0, 1]', () => {
      expect(lerp(0, 100, 1.5)).toBe(150);
      expect(lerp(0, 100, -0.5)).toBe(-50);
    });

    it('should handle negative ranges', () => {
      expect(lerp(-100, 100, 0.5)).toBe(0);
      expect(lerp(0, -100, 0.5)).toBe(-50);
    });

    it('should handle decimals', () => {
      expect(lerp(0, 10, 0.25)).toBe(2.5);
      expect(lerp(0, 10, 0.75)).toBe(7.5);
    });

    it('should handle same start and end', () => {
      expect(lerp(50, 50, 0.5)).toBe(50);
      expect(lerp(100, 100, 0)).toBe(100);
    });

    it('should handle zero', () => {
      expect(lerp(0, 0, 0.5)).toBe(0);
    });
  });
});
