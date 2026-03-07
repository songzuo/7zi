/**
 * 性能监控 Hook
 * 用于测量组件渲染时间和性能指标
 */

import { useEffect, useRef, useCallback, useState } from 'react';

export interface PerformanceMetrics {
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  totalRenderTime: number;
}

/**
 * 测量组件渲染性能
 */
export function useRenderPerformance(componentName: string, enabled = true) {
  const renderCount = useRef(0);
  const startTime = useRef(0);
  const totalRenderTime = useRef(0);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
    totalRenderTime: 0,
  });

  useEffect(() => {
    if (!enabled) return;

    // 记录渲染开始时间
    startTime.current = performance.now();

    return () => {
      // 记录渲染结束时间
      const endTime = performance.now();
      const renderTime = endTime - startTime.current;
      
      renderCount.current += 1;
      totalRenderTime.current += renderTime;

      const newMetrics: PerformanceMetrics = {
        renderCount: renderCount.current,
        averageRenderTime: totalRenderTime.current / renderCount.current,
        lastRenderTime: renderTime,
        totalRenderTime: totalRenderTime.current,
      };

      setMetrics(newMetrics);

      // 开发模式下输出性能日志
      if (process.env.NODE_ENV === 'development' && renderTime > 16) {
        console.warn(`[Performance] ${componentName} render took ${renderTime.toFixed(2)}ms (>16ms)`);
      }
    };
  });
}

/**
 * 测量函数执行时间
 */
export function useMeasureCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  label: string
): T {
  return useCallback(
    ((...args: Parameters<T>) => {
      const start = performance.now();
      const result = callback(...args);
      const end = performance.now();
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
      }
      
      return result;
    }) as T,
    [callback, label]
  );
}

/**
 * 防抖 Hook
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 节流 Hook
 */
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

/**
 * 报告性能指标
 */
export function reportPerformanceMetrics(componentName: string, metrics: PerformanceMetrics) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance Report] ${componentName}`, {
      'Render Count': metrics.renderCount,
      'Average Render Time': `${metrics.averageRenderTime.toFixed(2)}ms`,
      'Last Render Time': `${metrics.lastRenderTime.toFixed(2)}ms`,
      'Total Render Time': `${metrics.totalRenderTime.toFixed(2)}ms`,
    });
  }
}

/**
 * 性能监控 Hook (默认导出，用于测试)
 * 返回性能指标和辅助函数
 */
export function usePerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
    totalRenderTime: 0,
  });

  const measureRender = useCallback((componentName: string) => {
    const start = performance.now();
    return () => {
      const end = performance.now();
      const renderTime = end - start;
      setMetrics(prev => ({
        renderCount: prev.renderCount + 1,
        averageRenderTime: (prev.totalRenderTime + renderTime) / (prev.renderCount + 1),
        lastRenderTime: renderTime,
        totalRenderTime: prev.totalRenderTime + renderTime,
      }));
    };
  }, []);

  return {
    metrics,
    measureRender,
  };
}
