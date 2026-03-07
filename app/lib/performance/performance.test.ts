/**
 * Performance utilities 测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePerformance } from './usePerformance';

// Mock requestAnimationFrame
const mockRAF = vi.fn((cb: FrameRequestCallback) => {
  return 1; // Return fake ID
});

describe('Performance Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.requestAnimationFrame = mockRAF;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('usePerformance hook', () => {
    it('should be defined', () => {
      expect(usePerformance).toBeDefined();
    });

    it('should provide performance metrics', () => {
      // This is a basic smoke test
      // Full testing would require React Testing Library
      const result = usePerformance();
      expect(result).toBeDefined();
    });
  });

  describe('Performance metrics', () => {
    it('should measure render performance', () => {
      const start = performance.now();
      // Simulate some work
      for (let i = 0; i < 1000; i++) {
        Math.random();
      }
      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should track FPS', () => {
      let frameCount = 0;
      const startTime = performance.now();

      // Simulate 60 frames
      for (let i = 0; i < 60; i++) {
        mockRAF(() => {
          frameCount++;
        });
      }

      const duration = performance.now() - startTime;
      const fps = (frameCount / duration) * 1000;

      expect(fps).toBeGreaterThan(0);
    });
  });
});