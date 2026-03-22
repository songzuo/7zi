/**
 * User Timing API Utilities
 * 提供精确的性能标记和测量功能
 * 
 * 功能：
 * - Performance Mark 精确计时
 * - Performance Measure 跨标记测量
 * - 获取 Performance Observer 数据
 * - 自定义时间线记录
 */

import { useEffect, useRef, useCallback } from 'react';

// ============================================
// 类型定义
// ============================================

export interface TimingMark {
  name: string;
  startTime: number;
  duration?: number;
  detail?: Record<string, unknown>;
}

export interface TimingMeasure {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  detail?: Record<string, unknown>;
}

export interface TimingEntry {
  entryType: 'mark' | 'measure';
  name: string;
  startTime: number;
  duration?: number;
  detail?: Record<string, unknown>;
}

// ============================================
// 浏览器支持检测
// ============================================

const isPerformanceSupported = typeof performance !== 'undefined';
const isPerformanceObserverSupported = typeof PerformanceObserver !== 'undefined';

// ============================================
// Performance Mark API
// ============================================

export function performanceMark(
  name: string,
  options?: PerformanceMarkOptions
): PerformanceMark | null {
  if (!isPerformanceSupported) {
    console.warn('[UserTiming] performance.mark not supported');
    return null;
  }

  try {
    const mark = performance.mark(name, options);
    return mark;
  } catch (error) {
    console.error('[UserTiming] Failed to create mark:', error);
    return null;
  }
}

export function performanceClearMark(name?: string): void {
  if (!isPerformanceSupported) return;

  try {
    if (name) {
      performance.clearMarks(name);
    } else {
      performance.clearMarks();
    }
  } catch (error) {
    console.error('[UserTiming] Failed to clear mark:', error);
  }
}

// ============================================
// Performance Measure API
// ============================================

export function performanceMeasure(
  name: string,
  startMark: string,
  endMark?: string
): PerformanceMeasure | null {
  if (!isPerformanceSupported) {
    console.warn('[UserTiming] performance.measure not supported');
    return null;
  }

  try {
    const measure = endMark 
      ? performance.measure(name, startMark, endMark)
      : performance.measure(name, startMark);
    return measure;
  } catch (error) {
    console.error('[UserTiming] Failed to create measure:', error);
    return null;
  }
}

export function performanceClearMeasure(name?: string): void {
  if (!isPerformanceSupported) return;

  try {
    if (name) {
      performance.clearMeasures(name);
    } else {
      performance.clearMeasures();
    }
  } catch (error) {
    console.error('[UserTiming] Failed to clear measure:', error);
  }
}

// ============================================
// 获取 Performance Entries
// ============================================

export function getEntriesByType(type: string): PerformanceEntry[] {
  if (!isPerformanceSupported) return [];

  try {
    return performance.getEntriesByType(type);
  } catch (error) {
    console.error('[UserTiming] Failed to get entries:', error);
    return [];
  }
}

export function getEntriesByName(name: string, type?: string): PerformanceEntry[] {
  if (!isPerformanceSupported) return [];

  try {
    if (type) {
      return performance.getEntriesByName(name, type);
    }
    return performance.getEntriesByName(name);
  } catch (error) {
    console.error('[UserTiming] Failed to get entries by name:', error);
    return [];
  }
}

export function getMarks(name?: string): PerformanceMark[] {
  return getEntriesByType('mark') as PerformanceMark[];
}

export function getMeasures(name?: string): PerformanceMeasure[] {
  return getEntriesByType('measure') as PerformanceMeasure[];
}

// ============================================
// Performance Observer
// ============================================

type PerformanceObserverCallback = (entries: PerformanceEntry[]) => void;

export function observePerformance(
  entryTypes: string[],
  callback: PerformanceObserverCallback
): PerformanceObserver | null {
  if (!isPerformanceObserverSupported) {
    console.warn('[UserTiming] PerformanceObserver not supported');
    return null;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      callback(list.getEntries());
    });

    entryTypes.forEach((type) => {
      observer.observe({ type, buffered: true });
    });

    return observer;
  } catch (error) {
    console.error('[UserTiming] Failed to create observer:', error);
    return null;
  }
}

// ============================================
// React Hooks
// ============================================

/**
 * Hook for using Performance Marks
 */
export function usePerformanceMark(name: string, enabled: boolean = true) {
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || !isPerformanceSupported) return;

    startTimeRef.current = performance.now();

    performanceMark(`${name}-start`);

    return () => {
      performanceMark(`${name}-end`);
    };
  }, [name, enabled]);

  const measure = useCallback(() => {
    if (!isPerformanceSupported) return null;

    return performanceMeasure(
      `${name}-duration`,
      `${name}-start`,
      `${name}-end`
    );
  }, [name]);

  return { measure };
}

/**
 * Hook for measuring component render time
 */
export function useRenderTiming(componentName: string) {
  const markStart = `${componentName}-render-start`;
  const markEnd = `${componentName}-render-end`;

  useEffect(() => {
    if (!isPerformanceSupported) return;

    performanceMark(markStart);

    return () => {
      performanceMark(markEnd);
    };
  }, [markStart, markEnd]);

  const getRenderDuration = useCallback(() => {
    if (!isPerformanceSupported) return 0;

    const entries = getEntriesByName(markEnd, 'mark');
    if (entries.length === 0) return 0;

    return entries[entries.length - 1].startTime;
  }, [markEnd]);

  return { getRenderDuration };
}

/**
 * Hook for observing long tasks
 */
export function useLongTaskObserver(callback: (duration: number) => void) {
  useEffect(() => {
    if (!isPerformanceObserverSupported) return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'longtask' && entry.duration > 50) {
          callback(entry.duration);
        }
      });
    });

    observer.observe({ type: 'longtask', buffered: true });

    return () => observer.disconnect();
  }, [callback]);
}

/**
 * Hook for observing layout shifts
 */
export function useLayoutShiftObserver(callback: (value: number) => void) {
  useEffect(() => {
    if (!isPerformanceObserverSupported) return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const lsEntry = entry as PerformanceEntry & { value: number; hadRecentInput?: boolean };
        if (!lsEntry.hadRecentInput) {
          callback(lsEntry.value);
        }
      });
    });

    observer.observe({ type: 'layout-shift', buffered: true });

    return () => observer.disconnect();
  }, [callback]);
}

/**
 * Hook for timing async operations
 */
export function useAsyncTiming(operationName: string) {
  const startRef = useRef<number>(0);

  const startTiming = useCallback(() => {
    if (isPerformanceSupported) {
      startRef.current = performance.now();
      performanceMark(`${operationName}-async-start`);
    }
  }, [operationName]);

  const endTiming = useCallback(() => {
    if (!isPerformanceSupported || startRef.current === 0) return 0;

    performanceMark(`${operationName}-async-end`);

    const measure = performanceMeasure(
      `${operationName}-async-duration`,
      `${operationName}-async-start`,
      `${operationName}-async-end`
    );

    startRef.current = 0;
    return measure?.duration || 0;
  }, [operationName]);

  return { startTiming, endTiming };
}

// ============================================
// Timing Utilities
// ============================================

/**
 * 高阶函数：自动计时装饰器
 */
export function withTiming<T extends (...args: unknown[]) => unknown>(
  fn: T,
  name: string
): T {
  return ((...args: Parameters<T>) => {
    if (!isPerformanceSupported) {
      return fn(...args);
    }

    const startMark = `${name}-start`;
    const endMark = `${name}-end`;

    performanceMark(startMark);

    try {
      const result = fn(...args);

      // 处理 Promise 返回值
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        return (result as Promise<unknown>).then((value: unknown) => {
          performanceMark(endMark);
          performanceMeasure(`${name}-duration`, startMark, endMark);
          return value;
        }).catch((error: unknown) => {
          performanceMark(endMark);
          performanceMeasure(`${name}-duration`, startMark, endMark);
          throw error;
        });
      }

      performanceMark(endMark);
      performanceMeasure(`${name}-duration`, startMark, endMark);
      return result;
    } catch (error) {
      performanceMark(endMark);
      performanceMeasure(`${name}-duration`, startMark, endMark);
      throw error;
    }
  }) as T;
}

/**
 * 创建带计时的 API 请求函数
 */
export function createTimedFetch(name: string) {
  return async function timedFetch(
    input: RequestInfo,
    init?: RequestInit
  ): Promise<Response> {
    if (!isPerformanceSupported) {
      return fetch(input, init);
    }

    const startMark = `${name}-fetch-start`;
    const endMark = `${name}-fetch-end`;

    performanceMark(startMark);

    try {
      const response = await fetch(input, init);
      performanceMark(endMark);
      performanceMeasure(`${name}-fetch-duration`, startMark, endMark);
      return response;
    } catch (error) {
      performanceMark(endMark);
      performanceMeasure(`${name}-fetch-duration`, startMark, endMark);
      throw error;
    }
  };
}

/**
 * 获取 Navigation Timing 数据
 */
export function getNavigationTiming(): PerformanceNavigationTiming | null {
  if (!isPerformanceSupported) return null;

  const entries = performance.getEntriesByType('navigation');
  return entries.length > 0 ? entries[0] as PerformanceNavigationTiming : null;
}

/**
 * 获取 Resource Timing 数据
 */
export function getResourceTiming(urlPattern?: string): PerformanceResourceTiming[] {
  if (!isPerformanceSupported) return [];

  let entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

  if (urlPattern) {
    const regex = new RegExp(urlPattern);
    entries = entries.filter((entry) => regex.test(entry.name));
  }

  return entries;
}

/**
 * 格式化 Duration
 */
export function formatDuration(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(0)}μs`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(1)}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${(ms / 60000).toFixed(1)}min`;
}

// ============================================
// 导出
// ============================================

export default {
  // Mark APIs
  mark: performanceMark,
  clearMark: performanceClearMark,
  
  // Measure APIs
  measure: performanceMeasure,
  clearMeasure: performanceClearMeasure,
  
  // Entries
  getEntriesByType,
  getEntriesByName,
  getMarks,
  getMeasures,
  
  // Observer
  observe: observePerformance,
  
  // Hooks
  usePerformanceMark,
  useRenderTiming,
  useLongTaskObserver,
  useLayoutShiftObserver,
  useAsyncTiming,
  
  // Utilities
  withTiming,
  createTimedFetch,
  getNavigationTiming,
  getResourceTiming,
  formatDuration,
};
