/**
 * performance-optimization.ts Tests
 * Performance Optimization Module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  preloadCriticalResources,
  preconnectToDomains,
  removeUnusedCSS,
  runInChunks,
  deferNonCriticalScripts,
  scheduleIdleTask,
  cancelIdleTask,
  performanceMark,
  performanceMeasure,
} from './performance-optimization';

describe('performance-optimization.ts', () => {
  beforeEach(() => {
    // Mock document and window if not available
    if (typeof document === 'undefined') {
      global.document = {
        createElement: vi.fn(),
        head: {
          appendChild: vi.fn(),
        },
        body: {
          appendChild: vi.fn(),
        },
        querySelector: vi.fn(),
        querySelectorAll: vi.fn(() => []),
      } as unknown as Document;
    }

    if (typeof window === 'undefined') {
      global.window = {} as Window & typeof globalThis;
    }

    // Mock performance if not available
    if (typeof performance === 'undefined') {
      global.performance = {
        now: vi.fn(() => Date.now()),
        mark: vi.fn(),
        measure: vi.fn(),
        getEntriesByName: vi.fn(() => []),
      } as unknown as Performance;
    }

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('preloadCriticalResources', () => {
    it('should handle the function gracefully', () => {
      // Just verify it doesn't crash
      expect(() => {
        preloadCriticalResources({
          images: ['/test.jpg'],
        });
      }).not.toThrow();
    });

    it('should preload images', () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      const appendChildSpy = vi.spyOn(document.head, 'appendChild');
      const querySelectorSpy = vi.spyOn(document, 'querySelector').mockReturnValue(null);

      preloadCriticalResources({
        images: ['/test1.jpg', '/test2.png'],
      });

      expect(createElementSpy).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalled();
      expect(querySelectorSpy).toHaveBeenCalled();
    });

    it('should preload fonts', () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      const appendChildSpy = vi.spyOn(document.head, 'appendChild');
      const querySelectorSpy = vi.spyOn(document, 'querySelector').mockReturnValue(null);

      preloadCriticalResources({
        fonts: ['/font1.woff2', '/font2.woff2'],
      });

      expect(createElementSpy).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalled();
    });

    it('should preload stylesheets', () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      const appendChildSpy = vi.spyOn(document.head, 'appendChild');
      const querySelectorSpy = vi.spyOn(document, 'querySelector').mockReturnValue(null);

      preloadCriticalResources({
        stylesheets: ['/style1.css', '/style2.css'],
      });

      expect(createElementSpy).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalled();
    });

    it('should preload scripts', () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      const appendChildSpy = vi.spyOn(document.head, 'appendChild');
      const querySelectorSpy = vi.spyOn(document, 'querySelector').mockReturnValue(null);

      preloadCriticalResources({
        scripts: ['/script1.js', '/script2.js'],
      });

      expect(createElementSpy).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalled();
    });

    it('should not duplicate preloaded resources', () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      const appendChildSpy = vi.spyOn(document.head, 'appendChild');
      const querySelectorSpy = vi.spyOn(document, 'querySelector').mockReturnValue({} as any);

      preloadCriticalResources({
        images: ['/test.jpg'],
      });

      // Should not append if resource already exists
      expect(appendChildSpy).not.toHaveBeenCalled();
    });

    it('should handle empty resources', () => {
      const appendChildSpy = vi.spyOn(document.head, 'appendChild');

      expect(() => {
        preloadCriticalResources({});
      }).not.toThrow();
    });
  });

  describe('preconnectToDomains', () => {
    it('should handle the function gracefully', () => {
      // Just verify it doesn't crash
      expect(() => {
        preconnectToDomains(['https://example.com']);
      }).not.toThrow();
    });

    it('should preconnect to domains', () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      const appendChildSpy = vi.spyOn(document.head, 'appendChild');

      preconnectToDomains(['https://example.com', 'https://cdn.example.com']);

      expect(createElementSpy).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalled();
    });

    it('should handle empty domains list', () => {
      const appendChildSpy = vi.spyOn(document.head, 'appendChild');

      expect(() => {
        preconnectToDomains([]);
      }).not.toThrow();
    });

    it('should handle single domain', () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      const appendChildSpy = vi.spyOn(document.head, 'appendChild');

      preconnectToDomains(['https://example.com']);

      expect(createElementSpy).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalled();
    });
  });

  describe('removeUnusedCSS', () => {
    it('should handle the function gracefully', () => {
      // The function checks for document and window.performance
      // Just verify it doesn't crash
      expect(() => {
        removeUnusedCSS();
      }).not.toThrow();
    });
  });

  describe('runInChunks', () => {
    it('should execute synchronous tasks', async () => {
      const task = vi.fn(() => 42);

      const result = await runInChunks(task);

      expect(task).toHaveBeenCalled();
      expect(result).toBe(42);
    });

    it('should handle tasks that complete quickly', async () => {
      const task = vi.fn(() => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      });

      const result = await runInChunks(task, { maxDuration: 100 });

      expect(result).toBe(499500);
    });

    it('should handle custom options', async () => {
      const task = vi.fn(() => 'test');

      const result = await runInChunks(task, {
        maxDuration: 50,
        yieldDuration: 10,
      });

      expect(result).toBe('test');
    });

    it('should handle task errors', async () => {
      const task = vi.fn(() => {
        throw new Error('Task failed');
      });

      await expect(runInChunks(task)).rejects.toThrow('Task failed');
    });

    it('should work with async-like tasks', async () => {
      const task = vi.fn(() => {
        return { success: true };
      });

      const result = await runInChunks(task);

      expect(result).toEqual({ success: true });
    });
  });

  describe('deferNonCriticalScripts', () => {
    it('should handle the function gracefully', () => {
      // Just verify it doesn't crash
      expect(() => {
        deferNonCriticalScripts();
      }).not.toThrow();
    });

    it('should add event listener for window load', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      expect(() => {
        deferNonCriticalScripts();
      }).not.toThrow();

      expect(addEventListenerSpy).toHaveBeenCalledWith('load', expect.any(Function));
    });
  });

  describe('scheduleIdleTask', () => {
    it('should schedule idle task when requestIdleCallback is available', () => {
      const callback = vi.fn();
      const mockRequestIdleCallback = vi.fn((cb) => setTimeout(cb, 10) as unknown as number);
      global.requestIdleCallback = mockRequestIdleCallback;

      const handle = scheduleIdleTask(callback, { timeout: 1000 });

      expect(mockRequestIdleCallback).toHaveBeenCalledWith(callback, { timeout: 1000 });
      expect(typeof handle).toBe('number');
    });

    it('should fallback to setTimeout when requestIdleCallback is not available', () => {
      const originalRIC = global.requestIdleCallback;
      // @ts-ignore
      delete global.requestIdleCallback;

      const callback = vi.fn();
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      const handle = scheduleIdleTask(callback);

      expect(setTimeoutSpy).toHaveBeenCalled();
      expect(typeof handle).toBe('number');

      global.requestIdleCallback = originalRIC;
    });

    it('should handle callback without options', () => {
      const callback = vi.fn();
      const mockRequestIdleCallback = vi.fn((cb) => 123 as unknown as number);
      global.requestIdleCallback = mockRequestIdleCallback;

      const handle = scheduleIdleTask(callback);

      expect(mockRequestIdleCallback).toHaveBeenCalledWith(callback, undefined);
      expect(handle).toBe(123);
    });
  });

  describe('cancelIdleTask', () => {
    it('should cancel task when cancelIdleCallback is available', () => {
      const mockCancelIdleCallback = vi.fn();
      global.cancelIdleCallback = mockCancelIdleCallback;

      expect(() => {
        cancelIdleTask(123);
      }).not.toThrow();

      expect(mockCancelIdleCallback).toHaveBeenCalledWith(123);
    });

    it('should fallback to clearTimeout when cancelIdleCallback is not available', () => {
      const originalCIC = global.cancelIdleCallback;
      // @ts-ignore
      delete global.cancelIdleCallback;

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      expect(() => {
        cancelIdleTask(123);
      }).not.toThrow();

      expect(clearTimeoutSpy).toHaveBeenCalledWith(123);

      global.cancelIdleCallback = originalCIC;
    });
  });

  describe('performanceMark', () => {
    it('should create performance mark when performance.mark exists', () => {
      const markSpy = vi.fn();
      Object.defineProperty(performance, 'mark', {
        value: markSpy,
        writable: true,
        configurable: true,
      });

      expect(() => {
        performanceMark('test-mark');
      }).not.toThrow();

      if (markSpy) {
        expect(markSpy).toHaveBeenCalled();
      }
    });

    it('should create performance mark with detail when performance.mark exists', () => {
      const markSpy = vi.fn();
      Object.defineProperty(performance, 'mark', {
        value: markSpy,
        writable: true,
        configurable: true,
      });
      const detail = { test: 'data' };

      expect(() => {
        performanceMark('test-mark', detail);
      }).not.toThrow();

      if (markSpy) {
        expect(markSpy).toHaveBeenCalledWith('test-mark', { detail });
      }
    });

    it('should handle mark creation errors', () => {
      const markSpy = vi.fn(() => {
        throw new Error('Mark exists');
      });
      Object.defineProperty(performance, 'mark', {
        value: markSpy,
        writable: true,
        configurable: true,
      });
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(() => {
        performanceMark('test-mark');
      }).not.toThrow();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('performanceMeasure', () => {
    it('should create performance measure when performance.measure exists', () => {
      const measureSpy = vi.fn();
      const getEntriesSpy = vi.fn(() => []);
      Object.defineProperty(performance, 'measure', {
        value: measureSpy,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(performance, 'getEntriesByName', {
        value: getEntriesSpy,
        writable: true,
        configurable: true,
      });

      expect(() => {
        performanceMeasure('test-measure', 'start-mark', 'end-mark');
      }).not.toThrow();

      if (measureSpy) {
        expect(measureSpy).toHaveBeenCalled();
      }
    });

    it('should create performance measure with only start mark when performance.measure exists', () => {
      const measureSpy = vi.fn();
      const getEntriesSpy = vi.fn(() => []);
      Object.defineProperty(performance, 'measure', {
        value: measureSpy,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(performance, 'getEntriesByName', {
        value: getEntriesSpy,
        writable: true,
        configurable: true,
      });

      expect(() => {
        performanceMeasure('test-measure', 'start-mark');
      }).not.toThrow();

      if (measureSpy) {
        expect(measureSpy).toHaveBeenCalledWith('test-measure', 'start-mark', undefined);
      }
    });

    it('should handle measure creation errors', () => {
      const measureSpy = vi.fn(() => {
        throw new Error('Measure failed');
      });
      Object.defineProperty(performance, 'measure', {
        value: measureSpy,
        writable: true,
        configurable: true,
      });
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(() => {
        performanceMeasure('test-measure', 'start-mark', 'end-mark');
      }).not.toThrow();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('integration tests', () => {
    it('should handle multiple preloads', () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      const appendChildSpy = vi.spyOn(document.head, 'appendChild');
      const querySelectorSpy = vi.spyOn(document, 'querySelector').mockReturnValue(null);

      preloadCriticalResources({
        images: ['/img.jpg'],
        fonts: ['/font.woff2'],
        stylesheets: ['/style.css'],
        scripts: ['/script.js'],
      });

      expect(appendChildSpy).toHaveBeenCalled();
    });

    it('should handle idle task lifecycle', () => {
      const callback = vi.fn();
      const mockRIC = vi.fn((cb) => {
        cb({ didTimeout: false, timeRemaining: () => 50 });
        return 123;
      });
      const mockCIC = vi.fn();
      global.requestIdleCallback = mockRIC;
      global.cancelIdleCallback = mockCIC;

      const handle = scheduleIdleTask(callback);

      expect(callback).toHaveBeenCalled();

      cancelIdleTask(handle);

      expect(mockCIC).toHaveBeenCalledWith(123);
    });

    it('should handle performance measurement workflow', () => {
      const markSpy = vi.fn();
      const measureSpy = vi.fn();
      const getEntriesSpy = vi.fn(() => []);

      Object.defineProperty(performance, 'mark', {
        value: markSpy,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(performance, 'measure', {
        value: measureSpy,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(performance, 'getEntriesByName', {
        value: getEntriesSpy,
        writable: true,
        configurable: true,
      });

      performanceMark('task-start');
      performanceMark('task-end');
      performanceMeasure('task', 'task-start', 'task-end');

      if (markSpy) {
        expect(markSpy).toHaveBeenCalled();
      }
      if (measureSpy) {
        expect(measureSpy).toHaveBeenCalled();
      }
    });
  });
});
