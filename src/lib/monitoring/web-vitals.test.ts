import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getRating,
  thresholds,
} from './web-vitals';

// Mock the web-vitals library
vi.mock('web-vitals', () => ({
  onLCP: vi.fn((cb) => cb({ name: 'LCP', value: 2000, id: 'test-id' })),
  onCLS: vi.fn((cb) => cb({ name: 'CLS', value: 0.05, id: 'test-id' })),
  onTTFB: vi.fn((cb) => cb({ name: 'TTFB', value: 600, id: 'test-id' })),
  onFCP: vi.fn((cb) => cb({ name: 'FCP', value: 1500, id: 'test-id' })),
  onINP: vi.fn((cb) => cb({ name: 'INP', value: 100, id: 'test-id' })),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('Web Vitals Monitoring', () => {
  describe('getRating', () => {
    it('should return "good" for LCP under 2500ms', () => {
      const rating = getRating('LCP', 2000);
      expect(rating).toBe('good');
    });

    it('should return "needs-improvement" for LCP between 2500 and 4000ms', () => {
      const rating = getRating('LCP', 3000);
      expect(rating).toBe('needs-improvement');
    });

    it('should return "poor" for LCP over 4000ms', () => {
      const rating = getRating('LCP', 5000);
      expect(rating).toBe('poor');
    });

    it('should return "good" for CLS under 0.1', () => {
      const rating = getRating('CLS', 0.05);
      expect(rating).toBe('good');
    });

    it('should return "needs-improvement" for CLS between 0.1 and 0.25', () => {
      const rating = getRating('CLS', 0.15);
      expect(rating).toBe('needs-improvement');
    });

    it('should return "poor" for CLS over 0.25', () => {
      const rating = getRating('CLS', 0.3);
      expect(rating).toBe('poor');
    });

    it('should return "good" for TTFB under 800ms', () => {
      const rating = getRating('TTFB', 500);
      expect(rating).toBe('good');
    });

    it('should return "needs-improvement" for TTFB between 800 and 1800ms', () => {
      const rating = getRating('TTFB', 1200);
      expect(rating).toBe('needs-improvement');
    });

    it('should return "poor" for TTFB over 1800ms', () => {
      const rating = getRating('TTFB', 2000);
      expect(rating).toBe('poor');
    });

    it('should return "good" for FCP under 1800ms', () => {
      const rating = getRating('FCP', 1500);
      expect(rating).toBe('good');
    });

    it('should return "needs-improvement" for FCP between 1800 and 3000ms', () => {
      const rating = getRating('FCP', 2000);
      expect(rating).toBe('needs-improvement');
    });

    it('should return "poor" for FCP over 3000ms', () => {
      const rating = getRating('FCP', 3500);
      expect(rating).toBe('poor');
    });

    it('should return "good" for INP under 200ms', () => {
      const rating = getRating('INP', 100);
      expect(rating).toBe('good');
    });

    it('should return "needs-improvement" for INP between 200 and 500ms', () => {
      const rating = getRating('INP', 300);
      expect(rating).toBe('needs-improvement');
    });

    it('should return "poor" for INP over 500ms', () => {
      const rating = getRating('INP', 600);
      expect(rating).toBe('poor');
    });

    it('should return "good" for unknown metric names', () => {
      const rating = getRating('UNKNOWN', 1000);
      expect(rating).toBe('good');
    });

    it('should handle edge case values at threshold boundaries', () => {
      // LCP at exactly 2500 (good threshold)
      expect(getRating('LCP', 2500)).toBe('good');
      // LCP at exactly 4000 (needs-improvement threshold)
      expect(getRating('LCP', 4000)).toBe('needs-improvement');
      // LCP at 4001 (poor)
      expect(getRating('LCP', 4001)).toBe('poor');
    });
  });

  describe('thresholds', () => {
    it('should have correct thresholds for LCP', () => {
      expect(thresholds.LCP).toEqual({ good: 2500, poor: 4000 });
    });

    it('should have correct thresholds for CLS', () => {
      expect(thresholds.CLS).toEqual({ good: 0.1, poor: 0.25 });
    });

    it('should have correct thresholds for TTFB', () => {
      expect(thresholds.TTFB).toEqual({ good: 800, poor: 1800 });
    });

    it('should have correct thresholds for FCP', () => {
      expect(thresholds.FCP).toEqual({ good: 1800, poor: 3000 });
    });

    it('should have correct thresholds for INP', () => {
      expect(thresholds.INP).toEqual({ good: 200, poor: 500 });
    });
  });

  describe('initWebVitalsMonitoring', () => {
    let originalWindow: typeof window;

    beforeEach(() => {
      originalWindow = global.window;
    });

    afterEach(() => {
      global.window = originalWindow;
    });

    it('should not run on server side (no window)', async () => {
      // @ts-expect-error - Testing server-side
      delete global.window;

      const { initWebVitalsMonitoring } = await import('./web-vitals');

      // Should not throw
      expect(() => initWebVitalsMonitoring()).not.toThrow();
    });

    it('should initialize web vitals on client side', async () => {
      // Mock window
      global.window = {} as typeof window;

      const { initWebVitalsMonitoring } = await import('./web-vitals');

      // Should not throw when window exists
      expect(() => initWebVitalsMonitoring()).not.toThrow();
    });
  });

  describe('getCurrentVitals', () => {
    let originalWindow: typeof window;

    beforeEach(() => {
      originalWindow = global.window;
    });

    afterEach(() => {
      global.window = originalWindow;
      vi.resetModules();
    });

    it('should return null on server side', async () => {
      // @ts-expect-error - Testing server-side
      delete global.window;

      const { getCurrentVitals } = await import('./web-vitals');

      const vitals = await getCurrentVitals();

      expect(vitals).toBeNull();
    });

    it('should return vitals object on client side', async () => {
      global.window = {} as typeof window;

      const { getCurrentVitals } = await import('./web-vitals');

      const vitals = await getCurrentVitals();

      expect(vitals).toBeDefined();
    });
  });

  describe('observePerformance', () => {
    let originalWindow: typeof window;
    let originalPerformanceObserver: typeof PerformanceObserver;

    beforeEach(() => {
      originalWindow = global.window;
      originalPerformanceObserver = global.PerformanceObserver;
    });

    afterEach(() => {
      global.window = originalWindow;
      global.PerformanceObserver = originalPerformanceObserver;
    });

    it('should not run on server side', async () => {
      // @ts-expect-error - Testing server-side
      delete global.window;

      const { observePerformance } = await import('./web-vitals');

      // Should not throw
      expect(() => observePerformance()).not.toThrow();
    });

    it('should handle missing PerformanceObserver gracefully', async () => {
      global.window = {} as typeof window;
      // @ts-expect-error - Testing missing PerformanceObserver
      delete global.PerformanceObserver;

      const { observePerformance } = await import('./web-vitals');

      // Should not throw
      expect(() => observePerformance()).not.toThrow();
    });

    it('should set up performance observers when available', async () => {
      const mockObserve = vi.fn();
      const MockPerformanceObserver = vi.fn(() => ({
        observe: mockObserve,
      }));

      global.window = {} as typeof window;
      global.PerformanceObserver = MockPerformanceObserver as unknown as typeof PerformanceObserver;

      const { observePerformance } = await import('./web-vitals');

      observePerformance();

      // Should create observers for longtask and layout-shift
      expect(MockPerformanceObserver).toHaveBeenCalled();
    });

    it('should handle unsupported entry types gracefully', async () => {
      const mockObserve = vi.fn(() => {
        throw new Error('Entry type not supported');
      });
      const MockPerformanceObserver = vi.fn(() => ({
        observe: mockObserve,
      }));

      global.window = {} as typeof window;
      global.PerformanceObserver = MockPerformanceObserver as unknown as typeof PerformanceObserver;

      const { observePerformance } = await import('./web-vitals');

      // Should not throw when entry type is not supported
      expect(() => observePerformance()).not.toThrow();
    });
  });
});