import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock performance API
const mockPerformance = {
  mark: vi.fn(),
  measure: vi.fn(),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
  getEntriesByType: vi.fn().mockReturnValue([]),
  getEntriesByName: vi.fn().mockReturnValue([]),
  observer: null as PerformanceObserver | null,
};

vi.stubGlobal('performance', mockPerformance);

// Mock document
const mockDocument = {
  querySelectorAll: vi.fn().mockReturnValue([]),
  createElement: vi.fn().mockReturnValue({
    rel: '',
    href: '',
    crossOrigin: '',
    appendChild: vi.fn(),
    remove: vi.fn(),
  }),
  head: {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
  },
};

vi.stubGlobal('document', mockDocument);

import {
  preloadCriticalResources,
  preconnectToDomains,
  performanceMark,
  performanceMeasure,
  clearPerformanceMarks,
  clearPerformanceMeasures,
  getPerformanceMeasures,
  runInChunks,
  lazyLoadImages,
} from '@/lib/performance-optimization';

describe('Performance Optimization Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('performanceMark', () => {
    it('should create a performance mark with given name', () => {
      performanceMark('test-mark');
      expect(mockPerformance.mark).toHaveBeenCalledWith('test-mark', undefined);
    });

    it('should create a performance mark with detail', () => {
      performanceMark('test-mark', { id: 123 });
      expect(mockPerformance.mark).toHaveBeenCalledWith('test-mark', {
        detail: { id: 123 },
      });
    });
  });

  describe('performanceMeasure', () => {
    it('should create a performance measure', () => {
      performanceMeasure('test-measure', 'start', 'end');
      expect(mockPerformance.measure).toHaveBeenCalledWith(
        'test-measure',
        'start',
        'end'
      );
    });
  });

  describe('clearPerformanceMarks', () => {
    it('should clear all marks when no name provided', () => {
      clearPerformanceMarks();
      expect(mockPerformance.clearMarks).toHaveBeenCalledWith();
    });

    it('should clear specific mark when name provided', () => {
      clearPerformanceMarks('test-mark');
      expect(mockPerformance.clearMarks).toHaveBeenCalledWith('test-mark');
    });
  });

  describe('clearPerformanceMeasures', () => {
    it('should clear all measures when no name provided', () => {
      clearPerformanceMeasures();
      expect(mockPerformance.clearMeasures).toHaveBeenCalledWith();
    });

    it('should clear specific measure when name provided', () => {
      clearPerformanceMeasures('test-measure');
      expect(mockPerformance.clearMeasures).toHaveBeenCalledWith('test-measure');
    });
  });

  describe('getPerformanceMeasures', () => {
    it('should return performance measures', () => {
      const mockEntry = {
        name: 'test-measure',
        entryType: 'measure',
        duration: 100,
      } as PerformanceEntry;
      
      mockPerformance.getEntriesByType.mockReturnValue([mockEntry]);
      
      const measures = getPerformanceMeasures();
      expect(measures).toHaveLength(1);
      expect(measures[0].name).toBe('test-measure');
    });
  });

  describe('preloadCriticalResources', () => {
    it('should preconnect to domains', () => {
      const link = {
        rel: '',
        href: '',
        crossOrigin: '',
        appendChild: vi.fn(),
      };
      mockDocument.createElement.mockReturnValue(link);
      mockDocument.head.appendChild.mockResolvedValue(undefined);

      preconnectToDomains(['https://api.example.com']);

      expect(mockDocument.createElement).toHaveBeenCalledWith('link');
    });
  });

  describe('runInChunks', () => {
    it('should process items in chunks', async () => {
      const items = [1, 2, 3, 4, 5];
      const results: number[] = [];

      await runInChunks(items, async (item) => {
        results.push(item);
        return item * 2;
      });

      expect(results).toEqual([1, 2, 3, 4, 5]);
    });

    it('should respect chunk size option', async () => {
      const items = [1, 2, 3, 4];
      let processCount = 0;

      await runInChunks(items, async (item) => {
        processCount++;
        return item;
      }, { chunkSize: 2 });

      expect(processCount).toBe(4);
    });
  });

  describe('lazyLoadImages', () => {
    it('should find images with data-src attribute', () => {
      const mockImages = [
        { dataset: { src: '/image1.png' }, loading: '' },
        { dataset: { src: '/image2.png' }, loading: '' },
      ];
      
      mockDocument.querySelectorAll.mockReturnValue(mockImages);

      lazyLoadImages();

      expect(mockDocument.querySelectorAll).toHaveBeenCalledWith(
        'img[data-src]'
      );
    });
  });
});
