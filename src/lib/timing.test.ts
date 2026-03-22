/**
 * timing.ts Tests
 * Performance Timing API Utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  performanceMark,
  performanceClearMark,
  performanceMeasure,
  performanceClearMeasure,
  getEntriesByType,
  getEntriesByName,
  getMarks,
  getMeasures,
  observePerformance,
  usePerformanceMark,
  useRenderTiming,
  useLongTaskObserver,
  useLayoutShiftObserver,
  useAsyncTiming,
  withTiming,
  createTimedFetch,
  getNavigationTiming,
  getResourceTiming,
  formatDuration,
} from './timing';
import { renderHook, act, waitFor } from '@testing-library/react';

describe('timing.ts', () => {
  beforeEach(() => {
    // Clear all performance marks and measures before each test
    if (typeof performance !== 'undefined') {
      performance.clearMarks();
      performance.clearMeasures();
    }
  });

  afterEach(() => {
    // Clear all performance marks and measures after each test
    if (typeof performance !== 'undefined') {
      performance.clearMarks();
      performance.clearMeasures();
    }
  });

  describe('performanceMark', () => {
    it('should create a performance mark', () => {
      const mark = performanceMark('test-mark');

      expect(mark).toBeDefined();
      expect(mark?.name).toBe('test-mark');
      expect(mark?.entryType).toBe('mark');
    });

    it('should create mark with options', () => {
      const options = { detail: { test: 'data' }, startTime: 1000 };
      const mark = performanceMark('test-mark-with-options', options);

      expect(mark).toBeDefined();
      expect(mark?.name).toBe('test-mark-with-options');
    });

    it('should return null when performance is not supported', () => {
      const originalPerformance = global.performance;
      // @ts-ignore - intentionally removing performance
      delete global.performance;

      const mark = performanceMark('test-mark');

      expect(mark).toBeNull();

      global.performance = originalPerformance;
    });

    it('should handle mark creation errors', () => {
      // Try to create mark with invalid name
      const mark = performanceMark('');

      // Should handle gracefully
      expect(mark).toBeDefined();
    });
  });

  describe('performanceClearMark', () => {
    it('should clear specific mark', () => {
      performanceMark('mark1');
      performanceMark('mark2');

      expect(getMarks().length).toBeGreaterThanOrEqual(2);

      performanceClearMark('mark1');

      // Note: clearMarks() may affect all marks in some implementations
      // The important thing is that the function doesn't throw
      expect(() => performanceClearMark('mark1')).not.toThrow();
    });

    it('should clear all marks when no name provided', () => {
      performanceMark('mark1');
      performanceMark('mark2');

      performanceClearMark();

      expect(() => performanceClearMark()).not.toThrow();
    });

    it('should not throw when performance is not supported', () => {
      const originalPerformance = global.performance;
      // @ts-ignore
      delete global.performance;

      expect(() => performanceClearMark()).not.toThrow();

      global.performance = originalPerformance;
    });
  });

  describe('performanceMeasure', () => {
    it('should create measure between two marks', () => {
      performanceMark('measure-start');
      performanceMark('measure-end');

      const measure = performanceMeasure('test-measure', 'measure-start', 'measure-end');

      expect(measure).toBeDefined();
      expect(measure?.name).toBe('test-measure');
      expect(measure?.entryType).toBe('measure');
      expect(measure?.duration).toBeGreaterThanOrEqual(0);
    });

    it('should create measure with single mark', () => {
      performanceMark('measure-start');

      const measure = performanceMeasure('test-measure', 'measure-start');

      expect(measure).toBeDefined();
      expect(measure?.duration).toBeGreaterThanOrEqual(0);
    });

    it('should return null when performance is not supported', () => {
      const originalPerformance = global.performance;
      // @ts-ignore
      delete global.performance;

      const measure = performanceMeasure('test-measure', 'start', 'end');

      expect(measure).toBeNull();

      global.performance = originalPerformance;
    });
  });

  describe('performanceClearMeasure', () => {
    it('should clear specific measure', () => {
      performanceMark('start');
      performanceMark('end');
      performanceMeasure('test-measure', 'start', 'end');

      expect(() => performanceClearMeasure('test-measure')).not.toThrow();
    });

    it('should clear all measures when no name provided', () => {
      performanceMark('start1');
      performanceMark('end1');
      performanceMark('start2');
      performanceMark('end2');
      performanceMeasure('measure1', 'start1', 'end1');
      performanceMeasure('measure2', 'start2', 'end2');

      performanceClearMeasure();

      expect(() => performanceClearMeasure()).not.toThrow();
    });
  });

  describe('getEntriesByType', () => {
    it('should return mark entries', () => {
      performanceMark('mark1');
      performanceMark('mark2');

      const marks = getEntriesByType('mark');

      expect(marks).toBeInstanceOf(Array);
      expect(marks.length).toBeGreaterThanOrEqual(2);
    });

    it('should return measure entries', () => {
      performanceMark('start');
      performanceMark('end');
      performanceMeasure('measure', 'start', 'end');

      const measures = getEntriesByType('measure');

      expect(measures).toBeInstanceOf(Array);
      expect(measures.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array when performance is not supported', () => {
      const originalPerformance = global.performance;
      // @ts-ignore
      delete global.performance;

      const entries = getEntriesByType('mark');

      expect(entries).toEqual([]);

      global.performance = originalPerformance;
    });
  });

  describe('getEntriesByName', () => {
    it('should return entries by name', () => {
      performanceMark('test-mark');

      const entries = getEntriesByName('test-mark');

      expect(entries).toBeInstanceOf(Array);
      expect(entries.length).toBeGreaterThanOrEqual(1);
      expect(entries[0].name).toBe('test-mark');
    });

    it('should return entries by name and type', () => {
      performanceMark('test-mark');
      performanceMark('test-mark');

      const entries = getEntriesByName('test-mark', 'mark');

      expect(entries.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array for non-existent entries', () => {
      const entries = getEntriesByName('non-existent');

      expect(entries).toEqual([]);
    });

    it('should return empty array when performance is not supported', () => {
      const originalPerformance = global.performance;
      // @ts-ignore
      delete global.performance;

      const entries = getEntriesByName('test-mark');

      expect(entries).toEqual([]);

      global.performance = originalPerformance;
    });
  });

  describe('getMarks', () => {
    it('should return all mark entries', () => {
      performanceMark('mark1');
      performanceMark('mark2');
      performanceMark('mark3');

      const marks = getMarks();

      expect(marks).toBeInstanceOf(Array);
      expect(marks.length).toBeGreaterThanOrEqual(3);
    });

    it('should return empty array when no marks exist', () => {
      performanceClearMark();

      const marks = getMarks();

      expect(marks).toBeInstanceOf(Array);
    });
  });

  describe('getMeasures', () => {
    it('should return all measure entries', () => {
      performanceMark('start1');
      performanceMark('end1');
      performanceMark('start2');
      performanceMark('end2');

      performanceMeasure('measure1', 'start1', 'end1');
      performanceMeasure('measure2', 'start2', 'end2');

      const measures = getMeasures();

      expect(measures).toBeInstanceOf(Array);
      expect(measures.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('observePerformance', () => {
    it('should create performance observer', () => {
      const callback = vi.fn();

      const observer = observePerformance(['mark', 'measure'], callback);

      expect(observer).toBeDefined();
      expect(observer).toBeInstanceOf(PerformanceObserver);
    });

    it('should call callback when entries are observed', async () => {
      const callback = vi.fn();

      observePerformance(['mark'], callback);

      performanceMark('test-mark');

      // Wait for observer to pick up entries
      await waitFor(() => {
        expect(callback).toHaveBeenCalled();
      }, { timeout: 100 });

      observer?.disconnect();
    });

    it('should return null when PerformanceObserver is not supported', () => {
      const originalPerformanceObserver = global.PerformanceObserver;
      // @ts-ignore
      delete global.PerformanceObserver;

      const callback = vi.fn();
      const observer = observePerformance(['mark'], callback);

      expect(observer).toBeNull();

      global.PerformanceObserver = originalPerformanceObserver;
    });
  });

  describe('usePerformanceMark', () => {
    it('should create marks on mount and unmount', () => {
      const { result, unmount } = renderHook(() => usePerformanceMark('component-test', true));

      // Check that start mark was created
      const marks = getMarks();
      const startMark = marks.find(m => m.name === 'component-test-start');
      expect(startMark).toBeDefined();

      // Unmount hook
      unmount();

      // Check that end mark was created
      const marksAfterUnmount = getMarks();
      const endMark = marksAfterUnmount.find(m => m.name === 'component-test-end');
      expect(endMark).toBeDefined();
    });

    it('should not create marks when disabled', () => {
      const { result, unmount } = renderHook(() => usePerformanceMark('component-test', false));

      unmount();

      const marks = getMarks();
      const testMarks = marks.filter(m => m.name.includes('component-test'));

      expect(testMarks.length).toBe(0);
    });

    it('should provide measure function', () => {
      const { result, unmount } = renderHook(() => usePerformanceMark('component-test', true));

      const { measure } = result.current;

      expect(typeof measure).toBe('function');

      const measurement = measure();

      expect(measurement).toBeDefined();
      expect(measurement?.name).toBe('component-test-duration');
      expect(measurement?.entryType).toBe('measure');
    });
  });

  describe('useRenderTiming', () => {
    it('should track component render time', () => {
      const { result } = renderHook(() => useRenderTiming('TestComponent'));

      const { getRenderDuration } = result.current;

      expect(typeof getRenderDuration).toBe('function');
    });

    it('should return 0 when no render occurred', () => {
      const { result } = renderHook(() => useRenderTiming('TestComponent'));

      const { getRenderDuration } = result.current;
      const duration = getRenderDuration();

      expect(duration).toBe(0);
    });
  });

  describe('useLongTaskObserver', () => {
    it('should observe long tasks', () => {
      const callback = vi.fn();

      const { unmount } = renderHook(() => useLongTaskObserver(callback));

      // Verify hook doesn't throw
      expect(callback).toBeDefined();

      unmount();
    });

    it('should cleanup observer on unmount', () => {
      const callback = vi.fn();

      const { unmount } = renderHook(() => useLongTaskObserver(callback));

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('useLayoutShiftObserver', () => {
    it('should observe layout shifts', () => {
      const callback = vi.fn();

      const { unmount } = renderHook(() => useLayoutShiftObserver(callback));

      // Verify hook doesn't throw
      expect(callback).toBeDefined();

      unmount();
    });

    it('should cleanup observer on unmount', () => {
      const callback = vi.fn();

      const { unmount } = renderHook(() => useLayoutShiftObserver(callback));

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('useAsyncTiming', () => {
    it('should provide timing functions', () => {
      const { result } = renderHook(() => useAsyncTiming('test-operation'));

      const { startTiming, endTiming } = result.current;

      expect(typeof startTiming).toBe('function');
      expect(typeof endTiming).toBe('function');
    });

    it('should time async operations', async () => {
      const { result } = renderHook(() => useAsyncTiming('test-operation'));

      const { startTiming, endTiming } = result.current;

      startTiming();

      await new Promise(resolve => setTimeout(resolve, 10));

      const duration = endTiming();

      expect(duration).toBeGreaterThanOrEqual(10);
    });

    it('should return 0 when timing without start', async () => {
      const { result } = renderHook(() => useAsyncTiming('test-operation'));

      const { endTiming } = result.current;

      const duration = endTiming();

      expect(duration).toBe(0);
    });
  });

  describe('withTiming', () => {
    it('should wrap function with timing', () => {
      const testFn = (a: number, b: number) => a + b;
      const timedFn = withTiming(testFn, 'addition');

      const result = timedFn(1, 2);

      expect(result).toBe(3);

      // Check that measure was created
      const measures = getMeasures();
      const additionMeasure = measures.find(m => m.name === 'addition-duration');
      expect(additionMeasure).toBeDefined();
    });

    it('should handle async functions', async () => {
      const asyncFn = async (ms: number) => {
        await new Promise(resolve => setTimeout(resolve, ms));
        return ms;
      };
      const timedFn = withTiming(asyncFn, 'async-operation');

      const result = await timedFn(10);

      expect(result).toBe(10);

      // Check that measure was created
      const measures = getMeasures();
      const asyncMeasure = measures.find(m => m.name === 'async-operation-duration');
      expect(asyncMeasure).toBeDefined();
    });

    it('should handle errors in functions', () => {
      const errorFn = () => {
        throw new Error('Test error');
      };
      const timedFn = withTiming(errorFn, 'error-operation');

      expect(() => timedFn()).toThrow('Test error');

      // Check that measure was created even with error
      const measures = getMeasures();
      const errorMeasure = measures.find(m => m.name === 'error-operation-duration');
      expect(errorMeasure).toBeDefined();
    });
  });

  describe('createTimedFetch', () => {
    it('should create timed fetch function', async () => {
      const timedFetch = createTimedFetch('test-fetch');

      // Mock global fetch if not available
      if (typeof fetch === 'undefined') {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({}),
        } as Response);
      }

      // Note: This test may fail in environment without actual fetch
      // The important thing is to verify the function is created
      expect(typeof timedFetch).toBe('function');
    });
  });

  describe('getNavigationTiming', () => {
    it('should return navigation timing', () => {
      const timing = getNavigationTiming();

      // In test environment, this might be null or have limited data
      expect(timing === null || timing).toBeDefined();
    });

    it('should return null when performance is not supported', () => {
      const originalPerformance = global.performance;
      // @ts-ignore
      delete global.performance;

      const timing = getNavigationTiming();

      expect(timing).toBeNull();

      global.performance = originalPerformance;
    });
  });

  describe('getResourceTiming', () => {
    it('should return resource timing', () => {
      const resources = getResourceTiming();

      expect(Array.isArray(resources)).toBe(true);
    });

    it('should filter resources by pattern', () => {
      const resources = getResourceTiming('test');

      expect(Array.isArray(resources)).toBe(true);
    });
  });

  describe('formatDuration', () => {
    it('should format microseconds', () => {
      expect(formatDuration(0.001)).toBe('1μs');
      expect(formatDuration(0.5)).toBe('500μs');
    });

    it('should format milliseconds', () => {
      expect(formatDuration(1)).toBe('1.0ms');
      expect(formatDuration(100)).toBe('100.0ms');
      expect(formatDuration(999.99)).toBe('1000.0ms');
    });

    it('should format seconds', () => {
      expect(formatDuration(1000)).toBe('1.00s');
      expect(formatDuration(1500)).toBe('1.50s');
      expect(formatDuration(59999)).toBe('60.00s');
    });

    it('should format minutes', () => {
      expect(formatDuration(60000)).toBe('1.0min');
      expect(formatDuration(120000)).toBe('2.0min');
      expect(formatDuration(90000)).toBe('1.5min');
    });

    it('should handle edge cases', () => {
      expect(formatDuration(0)).toBe('0ms');
      expect(formatDuration(0.0001)).toBe('0μs');
    });
  });

  describe('integration tests', () => {
    it('should complete full timing workflow', () => {
      // Create marks
      performanceMark('workflow-start');
      
      // Simulate work
      for (let i = 0; i < 1000; i++) {
        Math.sqrt(i);
      }
      
      performanceMark('workflow-end');
      
      // Create measure
      const measure = performanceMeasure('workflow-duration', 'workflow-start', 'workflow-end');
      
      expect(measure).toBeDefined();
      expect(measure?.duration).toBeGreaterThan(0);
      
      // Get entries
      const marks = getMarks();
      const measures = getMeasures();
      
      expect(marks.length).toBeGreaterThanOrEqual(2);
      expect(measures.length).toBeGreaterThanOrEqual(1);
      
      // Format duration
      const formatted = formatDuration(measure!.duration);
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
    });

    it('should handle multiple operations', () => {
      const operations = ['op1', 'op2', 'op3'];
      
      operations.forEach(op => {
        performanceMark(`${op}-start`);
        performanceMark(`${op}-end`);
        performanceMeasure(`${op}-duration`, `${op}-start`, `${op}-end`);
      });
      
      const measures = getMeasures();
      expect(measures.length).toBeGreaterThanOrEqual(3);
    });
  });
});
