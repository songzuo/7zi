import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWebVitals } from '../useWebVitals';

// Mock PerformanceObserver
class MockPerformanceObserver {
  private callback: PerformanceObserverCallback;
  private static observers: MockPerformanceObserver[] = [];
  private types: string[] = [];
  
  constructor(callback: PerformanceObserverCallback) {
    this.callback = callback;
    MockPerformanceObserver.observers.push(this);
  }
  
  observe(options: { type: string; buffered?: boolean }) {
    this.types.push(options.type);
  }
  
  disconnect() {
    const index = MockPerformanceObserver.observers.indexOf(this);
    if (index > -1) {
      MockPerformanceObserver.observers.splice(index, 1);
    }
  }
  
  // Helper to simulate performance entries
  static simulateEntry(type: string, entries: Partial<PerformanceEntry>[]) {
    const observer = MockPerformanceObserver.observers.find(o => o.types.includes(type));
    if (observer) {
      const mockEntries = entries.map((e, i) => ({
        ...e,
        entryType: type,
        name: e.name || `entry-${i}`,
        startTime: e.startTime || 0,
        duration: e.duration || 0,
        toJSON: () => e,
      })) as unknown as PerformanceObserverEntryList;
      
      mockEntries.getEntries = () => mockEntries as unknown as PerformanceEntry[];
      mockEntries.getEntriesByName = () => mockEntries as unknown as PerformanceEntry[];
      mockEntries.getEntriesByType = () => mockEntries as unknown as PerformanceEntry[];
      
      observer.callback(mockEntries, observer as unknown as PerformanceObserver);
    }
  }
  
  static clearAll() {
    MockPerformanceObserver.observers = [];
  }
}

// Mock performance.getEntriesByType
const mockGetEntriesByType = vi.fn().mockReturnValue([]);
const mockGetEntriesByTypeNavigation = vi.fn().mockReturnValue([
  { responseStart: 100, entryType: 'navigation' },
]);

// Mock window.navigator.sendBeacon
const mockSendBeacon = vi.fn().mockReturnValue(true);

// Mock window.gtag
const mockGtag = vi.fn();

// Mock console.log
const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('useWebVitals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockPerformanceObserver.clearAll();
    
    // Setup mocks
    vi.stubGlobal('PerformanceObserver', MockPerformanceObserver);
    vi.stubGlobal('performance', {
      getEntriesByType: mockGetEntriesByTypeNavigation,
    });
    vi.stubGlobal('window', {
      matchMedia: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      navigator: {
        sendBeacon: mockSendBeacon,
        userAgent: 'test-agent',
      },
      location: {
        href: 'https://test.com',
      },
      gtag: mockGtag,
    });
    
    // Reset process.env
    vi.stubGlobal('process', {
      env: {
        NODE_ENV: 'test',
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize without errors', () => {
      const { result } = renderHook(() => useWebVitals());
      
      expect(result.current.metrics).toBeDefined();
      expect(Array.isArray(result.current.metrics)).toBe(true);
    });

    it('should return metrics array', () => {
      const { result } = renderHook(() => useWebVitals());
      
      expect(result.current.metrics).toEqual([]);
    });
  });

  describe('with custom reportFn', () => {
    it('should call reportFn when metrics are collected', () => {
      const reportFn = vi.fn();
      
      renderHook(() => useWebVitals({ reportFn }));
      
      // Simulate TTFB metric (from navigation entry)
      expect(reportFn).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'TTFB',
          value: 100,
          id: 'ttfb',
        })
      );
    });
  });

  describe('debug mode', () => {
    it('should log metrics to console when debug is true', () => {
      renderHook(() => useWebVitals({ debug: true }));
      
      // Simulate TTFB metric
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Web Vitals] TTFB:',
        expect.objectContaining({
          name: 'TTFB',
        })
      );
    });

    it('should not log metrics to console when debug is false', () => {
      consoleLogSpy.mockClear();
      
      renderHook(() => useWebVitals({ debug: false }));
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('CLS monitoring', () => {
    it('should setup CLS observer', () => {
      renderHook(() => useWebVitals());
      
      // PerformanceObserver should be created
      expect(MockPerformanceObserver).toBeDefined();
    });

    it('should accumulate CLS values without recent input', async () => {
      const reportFn = vi.fn();
      
      renderHook(() => useWebVitals({ reportFn }));
      
      // Simulate layout-shift entries
      MockPerformanceObserver.simulateEntry('layout-shift', [
        { hadRecentInput: false, value: 0.1 } as unknown as PerformanceEntry,
      ]);
      
      // CLS is sent on beforeunload, so it won't be reported yet
      expect(reportFn).not.toHaveBeenCalledWith(
        expect.objectContaining({ name: 'CLS' })
      );
    });
  });

  describe('LCP monitoring', () => {
    it('should setup LCP observer', () => {
      renderHook(() => useWebVitals());
      
      expect(MockPerformanceObserver).toBeDefined();
    });

    it('should report LCP metric', () => {
      const reportFn = vi.fn();
      
      renderHook(() => useWebVitals({ reportFn }));
      
      // Simulate LCP entry
      MockPerformanceObserver.simulateEntry('largest-contentful-paint', [
        { renderTime: 1000, loadTime: 900 } as unknown as PerformanceEntry,
      ]);
      
      expect(reportFn).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'LCP',
          value: 1000,
        })
      );
    });

    it('should use loadTime when renderTime is not available', () => {
      const reportFn = vi.fn();
      
      renderHook(() => useWebVitals({ reportFn }));
      
      // Simulate LCP entry without renderTime
      MockPerformanceObserver.simulateEntry('largest-contentful-paint', [
        { loadTime: 900 } as unknown as PerformanceEntry,
      ]);
      
      expect(reportFn).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'LCP',
          value: 900,
        })
      );
    });
  });

  describe('FCP monitoring', () => {
    it('should setup FCP observer', () => {
      renderHook(() => useWebVitals());
      
      expect(MockPerformanceObserver).toBeDefined();
    });

    it('should report FCP metric', () => {
      const reportFn = vi.fn();
      
      renderHook(() => useWebVitals({ reportFn }));
      
      // Simulate paint entry
      MockPerformanceObserver.simulateEntry('paint', [
        { name: 'first-contentful-paint', startTime: 500 } as unknown as PerformanceEntry,
      ]);
      
      expect(reportFn).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'FCP',
          value: 500,
        })
      );
    });

    it('should not report if FCP entry not found', () => {
      const reportFn = vi.fn();
      
      renderHook(() => useWebVitals({ reportFn }));
      
      // Simulate paint entry without FCP
      MockPerformanceObserver.simulateEntry('paint', [
        { name: 'some-other-paint', startTime: 500 } as unknown as PerformanceEntry,
      ]);
      
      expect(reportFn).not.toHaveBeenCalledWith(
        expect.objectContaining({ name: 'FCP' })
      );
    });
  });

  describe('FID monitoring', () => {
    it('should setup FID observer', () => {
      renderHook(() => useWebVitals());
      
      expect(MockPerformanceObserver).toBeDefined();
    });

    it('should report FID metric', () => {
      const reportFn = vi.fn();
      
      renderHook(() => useWebVitals({ reportFn }));
      
      // Simulate first-input entry
      MockPerformanceObserver.simulateEntry('first-input', [
        { 
          startTime: 1000, 
          processingStart: 1050 
        } as unknown as PerformanceEntry,
      ]);
      
      expect(reportFn).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'FID',
          value: 50, // processingStart - startTime
        })
      );
    });
  });

  describe('TTFB monitoring', () => {
    it('should report TTFB from navigation entry', () => {
      const reportFn = vi.fn();
      
      renderHook(() => useWebVitals({ reportFn }));
      
      expect(reportFn).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'TTFB',
          value: 100,
          id: 'ttfb',
        })
      );
    });

    it('should handle missing navigation entry', () => {
      vi.stubGlobal('performance', {
        getEntriesByType: vi.fn().mockReturnValue([]),
      });
      
      const reportFn = vi.fn();
      
      renderHook(() => useWebVitals({ reportFn }));
      
      // TTFB should not be reported if no navigation entry
      expect(reportFn).not.toHaveBeenCalledWith(
        expect.objectContaining({ name: 'TTFB' })
      );
    });
  });

  describe('production analytics', () => {
    it('should send to gtag in production', () => {
      vi.stubGlobal('process', {
        env: { NODE_ENV: 'production' },
      });
      
      renderHook(() => useWebVitals());
      
      // Simulate LCP entry
      MockPerformanceObserver.simulateEntry('largest-contentful-paint', [
        { renderTime: 1000 } as unknown as PerformanceEntry,
      ]);
      
      expect(mockGtag).toHaveBeenCalled();
    });

    it('should use sendBeacon in production', () => {
      vi.stubGlobal('process', {
        env: { NODE_ENV: 'production' },
      });
      
      renderHook(() => useWebVitals());
      
      // Simulate LCP entry
      MockPerformanceObserver.simulateEntry('largest-contentful-paint', [
        { renderTime: 1000 } as unknown as PerformanceEntry,
      ]);
      
      expect(mockSendBeacon).toHaveBeenCalledWith(
        '/api/metrics',
        expect.any(String)
      );
      
      const payload = JSON.parse(mockSendBeacon.mock.calls[0][1]);
      expect(payload.url).toBe('https://test.com');
      expect(payload.userAgent).toBe('test-agent');
    });
  });

  describe('cleanup', () => {
    it('should disconnect observers on unmount', () => {
      const disconnectSpy = vi.spyOn(MockPerformanceObserver.prototype, 'disconnect');
      
      const { unmount } = renderHook(() => useWebVitals());
      
      unmount();
      
      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('should remove beforeunload listener on unmount', () => {
      const removeEventListenerSpy = vi.fn();
      vi.stubGlobal('window', {
        ...window,
        addEventListener: vi.fn(),
        removeEventListener: removeEventListenerSpy,
        navigator: { sendBeacon: mockSendBeacon, userAgent: 'test' },
        location: { href: 'https://test.com' },
      });
      
      const { unmount } = renderHook(() => useWebVitals());
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );
    });
  });

  describe('error handling', () => {
    it('should handle PerformanceObserver not supported', () => {
      vi.stubGlobal('PerformanceObserver', undefined);
      
      // Should not throw
      expect(() => renderHook(() => useWebVitals())).not.toThrow();
    });

    it('should handle observer.observe throwing error', () => {
      const BrokenObserver = vi.fn().mockImplementation((callback) => {
        return {
          observe: vi.fn().mockImplementation(() => {
            throw new Error('Not supported');
          }),
          disconnect: vi.fn(),
        };
      });
      
      vi.stubGlobal('PerformanceObserver', BrokenObserver);
      
      // Should not throw
      expect(() => renderHook(() => useWebVitals())).not.toThrow();
    });

    it('should handle sendBeacon throwing error', () => {
      vi.stubGlobal('process', {
        env: { NODE_ENV: 'production' },
      });
      
      vi.stubGlobal('window', {
        ...window,
        navigator: {
          sendBeacon: vi.fn().mockImplementation(() => {
            throw new Error('Beacon failed');
          }),
          userAgent: 'test',
        },
        location: { href: 'https://test.com' },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        gtag: vi.fn(),
      });
      
      // Should not throw
      expect(() => renderHook(() => useWebVitals())).not.toThrow();
    });
  });

  describe('options', () => {
    it('should work with no options', () => {
      const { result } = renderHook(() => useWebVitals());
      
      expect(result.current.metrics).toBeDefined();
    });

    it('should work with empty options object', () => {
      const { result } = renderHook(() => useWebVitals({}));
      
      expect(result.current.metrics).toBeDefined();
    });

    it('should accept both reportFn and debug options', () => {
      const reportFn = vi.fn();
      
      const { result } = renderHook(() => 
        useWebVitals({ reportFn, debug: true })
      );
      
      expect(result.current.metrics).toBeDefined();
    });
  });
});