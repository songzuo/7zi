'use client';

/**
 * Web Vitals Client Hook
 * 浏览器 Web Vitals 指标收集
 *
 * 支持：
 * - Largest Contentful Paint (LCP)
 * - First Input Delay (FID)
 * - Cumulative Layout Shift (CLS)
 * - Interaction to Next Paint (INP)
 * - First Contentful Paint (FCP)
 * - Time to First Byte (TTFB)
 */

import { useEffect, useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

// ============================================
// Type Definitions
// ============================================

export interface WebVitalsMetrics {
  LCP?: number;
  FID?: number;
  CLS?: number;
  INP?: number;
  FCP?: number;
  TTFB?: number;
}

export interface MetricEntry {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

// ============================================
// Rating Thresholds (from web-vitals library)
// ============================================

const RATING_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // ms
  FID: { good: 100, poor: 300 },  // ms
  CLS: { good: 0.1, poor: 0.25 }, // score
  INP: { good: 200, poor: 500 },  // ms
  FCP: { good: 1800, poor: 3000 }, // ms
  TTFB: { good: 800, poor: 1800 }, // ms
};

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = RATING_THRESHOLDS[name as keyof typeof RATING_THRESHOLDS];
  if (!thresholds) return 'good';

  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

// ============================================
// Web Vitals Collection
// ============================================

/**
 * Dynamic import web-vitals library
 */
async function getWebVitals() {
  try {
    const webVitals = await import('web-vitals');
    return webVitals;
  } catch (_error) {
    logger.warn('[useWebVitals] web-vitals library not available', { error });
    return null;
  }
}

/**
 * Report metric to API
 */
async function reportMetric(metric: MetricEntry) {
  try {
    await fetch('/api/performance/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metrics: [
          {
            id: `${metric.name}-${Date.now()}`,
            name: metric.name,
            value: metric.value,
            rating: metric.rating,
            timestamp: metric.timestamp,
          },
        ],
        metadata: {
          route: window.location.pathname,
          deviceType: getDeviceType(),
          connectionType: getEffectiveConnectionType(),
          userAgent: navigator.userAgent,
        },
      }),
    });
  } catch (_error) {
    logger.warn('[useWebVitals] Failed to report metric', { error, metric });
  }
}

function getDeviceType(): string {
  const width = window.innerWidth;
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function getEffectiveConnectionType(): string {
  const connection = (navigator as any).connection;
  return connection?.effectiveType || 'unknown';
}

// ============================================
// Main Hook
// ============================================

export interface UseWebVitalsOptions {
  /** 是否自动上报指标到 API */
  reportToApi?: boolean;
  /** 指标收集后的回调 */
  onMetric?: (metric: MetricEntry) => void;
  /** 是否收集特定指标（默认全部） */
  enabledMetrics?: Array<'LCP' | 'FID' | 'CLS' | 'INP' | 'FCP' | 'TTFB'>;
}

export function useWebVitals(options: UseWebVitalsOptions = {}) {
  const {
    reportToApi = true,
    onMetric,
    enabledMetrics = ['LCP', 'FID', 'CLS', 'INP', 'FCP', 'TTFB'],
  } = options;

  const [metrics, setMetrics] = useState<WebVitalsMetrics>({});
  const [history, setHistory] = useState<MetricEntry[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);

  const startCollection = useCallback(async () => {
    if (isCollecting) return;
    setIsCollecting(true);

    const webVitals = await getWebVitals();
    if (!webVitals) {
      setIsCollecting(false);
      return;
    }

    const processMetric = (name: string, value: number) => {
      const rating = getRating(name, value);
      const entry: MetricEntry = {
        name,
        value,
        rating,
        timestamp: Date.now(),
      };

      // Update current metrics
      setMetrics(prev => ({ ...prev, [name]: value }));

      // Update history
      setHistory(prev => [...prev.slice(-99), entry]);

      // Report to API
      if (reportToApi) {
        reportMetric(entry);
      }

      // Call callback
      if (onMetric) {
        onMetric(entry);
      }

      // Log
      logger.debug('[useWebVitals] Metric collected', { name, value, rating });
    };

    // Setup metric handlers
    if (enabledMetrics.includes('LCP')) {
      webVitals.onLCP((metric) => {
        processMetric('LCP', metric.value);
      });
    }

    // FID is deprecated in web-vitals 5.x, replaced by INP
    // Keeping it for backward compatibility with old metric data
    // if (enabledMetrics.includes('FID')) {
    //   webVitals.onFID((metric) => {
    //     processMetric('FID', metric.value);
    //   });
    // }

    if (enabledMetrics.includes('CLS')) {
      webVitals.onCLS((metric) => {
        processMetric('CLS', metric.value);
      });
    }

    if (enabledMetrics.includes('INP')) {
      webVitals.onINP((metric) => {
        processMetric('INP', metric.value);
      });
    }

    if (enabledMetrics.includes('FCP')) {
      webVitals.onFCP((metric) => {
        processMetric('FCP', metric.value);
      });
    }

    if (enabledMetrics.includes('TTFB')) {
      webVitals.onTTFB((metric) => {
        processMetric('TTFB', metric.value);
      });
    }
  }, [isCollecting, reportToApi, onMetric, enabledMetrics]);

  useEffect(() => {
    startCollection();
  }, [startCollection]);

  return {
    metrics,
    history,
    isCollecting,
  };
}

/**
 * Hook for real-time metrics updates via WebSocket
 */
export interface UseRealtimePerformanceOptions {
  /** WebSocket URL */
  wsUrl?: string;
  /** 更新间隔（毫秒） */
  updateInterval?: number;
  /** 是否启用 */
  enabled?: boolean;
}

export function useRealtimePerformance(options: UseRealtimePerformanceOptions = {}) {
  const { wsUrl, updateInterval = 5000, enabled = true } = options;

  const [realtimeData, setRealtimeData] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!enabled || !wsUrl) return;

    let ws: WebSocket | null = null;
    let intervalId: NodeJS.Timeout | null = null;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl!);

        ws.onopen = () => {
          setIsConnected(true);
          logger.info('[useRealtimePerformance] Connected');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'performance_update') {
              setRealtimeData(data.data);
              setLastUpdate(new Date());
            }
          } catch (_error) {
            logger.warn('[useRealtimePerformance] Failed to parse message', { error });
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          // Reconnect after 5 seconds
          intervalId = setTimeout(connect, 5000);
        };

        ws.onerror = (error) => {
          logger.error('[useRealtimePerformance] WebSocket error', { error });
        };
      } catch (_error) {
        logger.error('[useRealtimePerformance] Failed to connect', { error });
      }
    };

    connect();

    // Poll API as fallback
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/metrics/performance?category=system');
        const result = await response.json();
        if (result.success && result.data.system) {
          setRealtimeData(result.data);
          setLastUpdate(new Date());
        }
      } catch (_error) {
        logger.warn('[useRealtimePerformance] Failed to poll metrics', { error });
      }
    }, updateInterval);

    return () => {
      if (ws) ws.close();
      if (intervalId) clearTimeout(intervalId);
      clearInterval(pollInterval);
    };
  }, [wsUrl, updateInterval, enabled]);

  return {
    data: realtimeData,
    isConnected,
    lastUpdate,
  };
}
