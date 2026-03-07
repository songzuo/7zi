/**
 * Performance Monitoring React Hooks
 * 性能监控 React Hooks
 */

'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import {
  performanceCollector,
  onPerformanceMetric,
  onPerformanceAlert,
  recordCustomMetric,
  getPerformanceSummary,
  type PerformanceMetric,
  type PerformanceAlert,
  type CustomMetric,
} from './index';
import { CUSTOM_METRICS_CONFIG } from './performance.config';

// ============================================
// Types
// ============================================

interface PerformanceSummary {
  [key: string]: {
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    count: number;
  };
}

interface UsePerformanceMonitorOptions {
  autoInit?: boolean;
  listenAlerts?: boolean;
  listenMetrics?: boolean;
}

interface UsePerformanceMonitorReturn {
  summary: PerformanceSummary;
  alerts: PerformanceAlert[];
  metrics: PerformanceMetric[];
  isInitialized: boolean;
  recordMetric: (name: string, value: number, category: CustomMetric['category']) => void;
  getScore: () => number;
}

// ============================================
// Main Hook
// ============================================

export function usePerformanceMonitor(
  options: UsePerformanceMonitorOptions = {}
): UsePerformanceMonitorReturn {
  const { autoInit = true, listenAlerts = true, listenMetrics = true } = options;

  const [summary, setSummary] = useState<PerformanceSummary>({});
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const metricsRef = useRef<PerformanceMetric[]>([]);
  const alertsRef = useRef<PerformanceAlert[]>([]);

  useEffect(() => {
    if (!autoInit) return;
    performanceCollector.init().then(() => setIsInitialized(true));
  }, [autoInit]);

  useEffect(() => {
    if (!listenMetrics) return;
    const unsubscribe = onPerformanceMetric((metric) => {
      metricsRef.current = [...metricsRef.current.slice(-49), metric];
      setMetrics(metricsRef.current);
      setSummary(getPerformanceSummary());
    });
    return unsubscribe;
  }, [listenMetrics]);

  useEffect(() => {
    if (!listenAlerts) return;
    const unsubscribe = onPerformanceAlert((alert) => {
      alertsRef.current = [...alertsRef.current.slice(-19), alert];
      setAlerts(alertsRef.current);
    });
    return unsubscribe;
  }, [listenAlerts]);

  const recordMetric = useCallback(
    (name: string, value: number, category: CustomMetric['category']) => {
      recordCustomMetric(name, value, category);
    },
    []
  );

  const getScore = useCallback((): number => {
    const weights: Record<string, number> = {
      LCP: 0.25,
      INP: 0.25,
      CLS: 0.25,
      FCP: 0.15,
      TTFB: 0.1,
    };

    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(summary).forEach(([name, data]) => {
      const weight = weights[name];
      if (!weight) return;

      let score = 100;
      if (data.rating === 'needs-improvement') score = 50;
      else if (data.rating === 'poor') score = 0;

      totalScore += score * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }, [summary]);

  return { summary, alerts, metrics, isInitialized, recordMetric, getScore };
}

// ============================================
// Render Performance Hook
// ============================================

export function useRenderPerformance(componentName: string): {
  renderTime: number | null;
  isSlowRender: boolean;
} {
  const [renderTime, setRenderTime] = useState<number | null>(null);
  // 使用 ref 存储开始时间，避免在渲染期间调用 performance.now()
  const startTimeRef = useRef<number | null>(null);
  const componentNameRef = useRef(componentName);

  // 在 effect 中初始化和更新开始时间
  useEffect(() => {
    startTimeRef.current = performance.now();
    componentNameRef.current = componentName;
  });

  useEffect(() => {
    if (startTimeRef.current === null) return;

    const endTime = performance.now();
    const duration = endTime - startTimeRef.current;
    setRenderTime(duration);

    recordCustomMetric(`render.${componentNameRef.current}`, duration, 'rendering', {
      component: componentNameRef.current,
    });

    const config = CUSTOM_METRICS_CONFIG.rendering.componentRenderTime;
    if (duration > config.warning) {
      console.warn(`[Performance] Slow render: ${componentNameRef.current} took ${duration.toFixed(1)}ms`);
    }
  }, [renderTime]);

  useEffect(() => {
    startTime.current = performance.now();
  });

  const isSlowRender =
    renderTime !== null &&
    renderTime > CUSTOM_METRICS_CONFIG.rendering.componentRenderTime.warning;

  return { renderTime, isSlowRender };
}

// ============================================
// API Performance Hook
// ============================================

interface ApiStats {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  avgDuration: number;
  lastDuration: number | null;
}

interface UseApiPerformanceOptions {
  apiName: string;
  recordSuccess?: boolean;
  recordFailure?: boolean;
}

export function useApiPerformance(options: UseApiPerformanceOptions) {
  const { apiName, recordSuccess = true, recordFailure = true } = options;

  const [stats, setStats] = useState<ApiStats>({
    totalRequests: 0,
    successCount: 0,
    failureCount: 0,
    avgDuration: 0,
    lastDuration: null,
  });

  const durationsRef = useRef<number[]>([]);

  const trackRequest = useCallback(
    async <T,>(request: Promise<T>): Promise<T> => {
      const start = performance.now();
      let success = true;

      try {
        return await request;
      } catch (error) {
        success = false;
        throw error;
      } finally {
        const duration = performance.now() - start;
        durationsRef.current.push(duration);

        if (durationsRef.current.length > 100) {
          durationsRef.current.shift();
        }

        const shouldRecord = (success && recordSuccess) || (!success && recordFailure);
        if (shouldRecord) {
          recordCustomMetric(`api.${apiName}`, duration, 'api', { success });
        }

        setStats((prev) => {
          const newTotal = prev.totalRequests + 1;
          const newSuccess = prev.successCount + (success ? 1 : 0);
          const newFailure = prev.failureCount + (success ? 0 : 1);
          const newAvg =
            durationsRef.current.reduce((a, b) => a + b, 0) / durationsRef.current.length;

          return {
            totalRequests: newTotal,
            successCount: newSuccess,
            failureCount: newFailure,
            avgDuration: newAvg,
            lastDuration: duration,
          };
        });
      }
    },
    [apiName, recordSuccess, recordFailure]
  );

  return { trackRequest, stats };
}

// ============================================
// Route Change Performance Hook
// ============================================

export function useRouteChangePerformance(): {
  lastRouteChangeTime: number | null;
  isSlowNavigation: boolean;
} {
  const [lastRouteChangeTime, setLastRouteChangeTime] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const startTime = performance.now();

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const duration = performance.now() - startTime;
          setLastRouteChangeTime(duration);
          recordCustomMetric('routeChange', duration, 'navigation', {
            url: window.location.pathname,
          });
        }
      });
    });

    try {
      observer.observe({ type: 'navigation', buffered: true });
    } catch {
      // Navigation Timing API not supported
    }

    return () => observer.disconnect();
  }, []);

  const config = CUSTOM_METRICS_CONFIG.navigation.routeChangeTime;
  const isSlowNavigation = lastRouteChangeTime !== null && lastRouteChangeTime > config.warning;

  return { lastRouteChangeTime, isSlowNavigation };
}

// ============================================
// Memory Usage Hook
// ============================================

interface MemoryInfo {
  usedJSHeapSize: number | null;
  totalJSHeapSize: number | null;
  usagePercentage: number | null;
}

export function useMemoryUsage(): MemoryInfo & { isHighMemory: boolean } {
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo>({
    usedJSHeapSize: null,
    totalJSHeapSize: null,
    usagePercentage: null,
  });

  useEffect(() => {
    const checkMemory = () => {
      const perf = performance as Performance & {
        memory?: { usedJSHeapSize: number; totalJSHeapSize: number };
      };
      const memory = perf.memory;
      if (!memory) return;

      const usedMB = memory.usedJSHeapSize / (1024 * 1024);
      const totalMB = memory.totalJSHeapSize / (1024 * 1024);
      const percentage = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;

      setMemoryInfo({
        usedJSHeapSize: usedMB,
        totalJSHeapSize: totalMB,
        usagePercentage: percentage,
      });

      recordCustomMetric('heapSize', usedMB, 'memory', { total: totalMB, percentage });
    };

    checkMemory();
    const interval = setInterval(checkMemory, 30000);
    return () => clearInterval(interval);
  }, []);

  const config = CUSTOM_METRICS_CONFIG.memory.heapSize;
  const isHighMemory = memoryInfo.usedJSHeapSize !== null && memoryInfo.usedJSHeapSize > config.warning;

  return { ...memoryInfo, isHighMemory };
}

// ============================================
// Performance Score Display Component
// ============================================

interface PerformanceScoreProps {
  score: number;
}

export function PerformanceScore({ score }: PerformanceScoreProps): React.ReactElement {
  const getColor = (s: number): string => {
    if (s >= 90) return '#0cce6b';
    if (s >= 50) return '#ffa400';
    return '#ff4e42';
  };

  const getLabel = (s: number): string => {
    if (s >= 90) return '优秀';
    if (s >= 50) return '需改进';
    return '差';
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 12px',
        borderRadius: '16px',
        backgroundColor: `${getColor(score)}20`,
        color: getColor(score),
        fontWeight: 600,
        fontSize: '14px',
      }}
    >
      <span>{score}</span>
      <span style={{ fontSize: '12px', opacity: 0.8 }}>{getLabel(score)}</span>
    </div>
  );
}

// Type exports
export type { PerformanceSummary, UsePerformanceMonitorOptions, UsePerformanceMonitorReturn, ApiStats, UseApiPerformanceOptions, MemoryInfo };