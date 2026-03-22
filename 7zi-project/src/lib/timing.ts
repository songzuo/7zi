/**
 * Timing Utilities
 * Performance timing and measurement utilities
 */

// ============================================================================
// Types
// ============================================================================

interface TimingMeasure {
  name: string;
  duration: number;
  startTime: number;
  entries: PerformanceEntry[];
}

// ============================================================================
// Marking and Measuring
// ============================================================================

/**
 * Create a performance mark
 */
export function mark(name: string): void {
  if (typeof performance !== 'undefined' && performance.mark) {
    try {
      performance.mark(name);
    } catch (error) {
      // Mark already exists or error occurred
      console.warn(`Failed to create mark "${name}":`, error);
    }
  }
}

/**
 * Create a performance measure between two marks
 */
export function measure(name: string, startMark: string, endMark?: string): number {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      performance.measure(name, startMark, endMark);
      const entries = performance.getEntriesByName(name, 'measure');
      return entries.length > 0 ? entries[0].duration : 0;
    } catch (error) {
      console.warn(`Failed to create measure "${name}":`, error);
      return 0;
    }
  }
  return 0;
}

/**
 * Get all performance entries by type
 */
export function getEntriesByType(type: string): PerformanceEntry[] {
  if (typeof performance !== 'undefined' && performance.getEntriesByType) {
    return Array.from(performance.getEntriesByType(type));
  }
  return [];
}

/**
 * Get performance entries by name
 */
export function getEntriesByName(name: string, type?: string): PerformanceEntry[] {
  if (typeof performance !== 'undefined' && performance.getEntriesByName) {
    return Array.from(performance.getEntriesByName(name, type));
  }
  return [];
}

/**
 * Clear all performance marks
 */
export function clearMarks(name?: string): void {
  if (typeof performance !== 'undefined' && performance.clearMarks) {
    performance.clearMarks(name);
  }
}

/**
 * Alias for clearMarks
 */
export function performanceClearMark(name?: string): void {
  clearMarks(name);
}

/**
 * Clear all performance measures
 */
export function clearMeasures(name?: string): void {
  if (typeof performance !== 'undefined' && performance.clearMeasures) {
    performance.clearMeasures(name);
  }
}

/**
 * Alias for clearMeasures
 */
export function performanceClearMeasure(name?: string): void {
  clearMeasures(name);
}

/**
 * Get all timing measurements
 */
export function getAllMeasurements(): TimingMeasure[] {
  const measures = getEntriesByType('measure');
  const uniqueNames = Array.from(new Set(measures.map((m) => m.name)));

  return uniqueNames.map((name) => {
    const entries = measures.filter((m) => m.name === name);
    const totalDuration = entries.reduce((sum, e) => sum + e.duration, 0);
    const avgDuration = totalDuration / entries.length;

    return {
      name,
      duration: avgDuration,
      startTime: entries[0].startTime,
      entries,
    };
  });
}

/**
 * Get all marks
 */
export function getMarks(): PerformanceEntry[] {
  return getEntriesByType('mark');
}

/**
 * Get all measures
 */
export function getMeasures(): PerformanceEntry[] {
  return getEntriesByType('measure');
}

/**
 * Get navigation timing
 */
export function getNavigationTiming(): PerformanceNavigationTiming | null {
  if (typeof performance === 'undefined' || !performance.getEntriesByType) {
    return null;
  }
  const entries = performance.getEntriesByType('navigation');
  return entries.length > 0 ? entries[0] as PerformanceNavigationTiming : null;
}

/**
 * Get resource timing
 */
export function getResourceTiming(): PerformanceResourceTiming[] {
  if (typeof performance === 'undefined' || !performance.getEntriesByType) {
    return [];
  }
  return performance.getEntriesByType('resource') as PerformanceResourceTiming[];
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Create a timed fetch
 */
export async function createTimedFetch(url: string, options?: RequestInit): Promise<{
  response: Response;
  duration: number;
}> {
  const startTime = performance.now();
  const response = await fetch(url, options);
  const duration = performance.now() - startTime;

  return { response, duration };
}

/**
 * Wrapper to add timing to a function
 */
export function withTiming<T extends (...args: unknown[]) => unknown>(
  fn: T,
  name: string
): T {
  return ((...args: unknown[]) => {
    const startMark = `${name}-start`;
    const endMark = `${name}-end`;

    mark(startMark);
    const result = fn(...args);
    mark(endMark);
    measure(name, startMark, endMark);

    clearMarks(startMark);
    clearMarks(endMark);
    clearMeasures(name);

    return result;
  }) as T;
}

/**
 * Time a function execution
 */
export async function timeFunction<T>(
  fn: () => T | Promise<T>,
  markName?: string
): Promise<{ result: T; duration: number }> {
  const startMark = `${markName || 'function'}-start`;
  const endMark = `${markName || 'function'}-end`;
  const measureName = markName || 'function';

  mark(startMark);

  const result = await fn();

  mark(endMark);
  const duration = measure(measureName, startMark, endMark);

  // Cleanup
  clearMarks(startMark);
  clearMarks(endMark);
  clearMeasures(measureName);

  return { result, duration };
}

/**
 * Create a performance observer
 */
export function createPerformanceObserver(
  callback: (list: PerformanceObserverEntryList) => void,
  options?: PerformanceObserverInit
): PerformanceObserver | null {
  if (typeof PerformanceObserver !== 'undefined') {
    try {
      const observer = new PerformanceObserver(callback);
      observer.observe(options || { entryTypes: ['measure', 'mark'] });
      return observer;
    } catch (error) {
      console.warn('Failed to create PerformanceObserver:', error);
      return null;
    }
  }
  return null;
}

/**
 * Get page load timing
 */
export function getPageLoadTiming(): {
  domContentLoaded?: number;
  loadComplete?: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
} | null {
  if (typeof performance === 'undefined' || !performance.timing) {
    return null;
  }

  const timing = performance.timing;

  return {
    domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
    loadComplete: timing.loadEventEnd - timing.loadEventStart,
  };
}

/**
 * Measure frame rate
 */
export function measureFrameRate(callback: (fps: number) => void): () => void {
  let frameCount = 0;
  let lastTime = performance.now();
  let animationFrameId: number;

  const measure = () => {
    frameCount++;
    const currentTime = performance.now();
    const elapsed = currentTime - lastTime;

    if (elapsed >= 1000) {
      const fps = Math.round((frameCount * 1000) / elapsed);
      callback(fps);
      frameCount = 0;
      lastTime = currentTime;
    }

    animationFrameId = requestAnimationFrame(measure);
  };

  animationFrameId = requestAnimationFrame(measure);

  // Return cleanup function
  return () => {
    cancelAnimationFrame(animationFrameId);
  };
}
