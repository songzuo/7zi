/**
 * Performance Monitoring Utilities
 *
 * Core Web Vitals tracking and optimization helpers
 */

import { logger } from './logger';

export const PERFORMANCE_METRICS = {
  // Core Web Vitals thresholds (milliseconds)
  LCP: { good: 2500, needsImprovement: 4000 },
  FID: { good: 100, needsImprovement: 300 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FCP: { good: 1800, needsImprovement: 3000 },
  TTFB: { good: 600, needsImprovement: 1000 },
};

export interface MetricData {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

interface WebVitalsMetric {
  name: string;
  value: number;
  delta?: number;
  rating?: string;
  entries?: PerformanceEntry[];
}

// Extend global window interface for browser-specific APIs
declare global {
  interface Window {
    va?: (event: string, data: Record<string, unknown>) => void;
    webkitAudioContext?: typeof AudioContext;
  }

  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

/**
 * Get Core Web Vitals
 */
export async function getCoreWebVitals(): Promise<MetricData[]> {
  if (typeof window === 'undefined') {
    return [];
  }

  const metrics: MetricData[] = [];

  try {
    // Dynamic import of web-vitals to avoid SSR issues
    // web-vitals v4 uses onCLS, onFCP, onLCP, onTTFB, onINP (FID is deprecated)
    const { onCLS, onFCP, onLCP, onTTFB, onINP } = await import('web-vitals');

    const recordMetric = (name: string, value: number) => {
      const rating = getMetricRating(name, value);
      metrics.push({ name, value, rating, timestamp: Date.now() });
    };

    onCLS((metric: WebVitalsMetric) => recordMetric('CLS', metric.value));
    // FID is deprecated, using INP instead
    onFCP((metric: WebVitalsMetric) => recordMetric('FCP', metric.value));
    onLCP((metric: WebVitalsMetric) => recordMetric('LCP', metric.value));
    onTTFB((metric: WebVitalsMetric) => recordMetric('TTFB', metric.value));
    onINP((metric: WebVitalsMetric) => recordMetric('INP', metric.value));

    // Wait a bit for metrics to be collected
    await new Promise(resolve => setTimeout(resolve, 100));

    return metrics;
  } catch (_error) {
    logger.error('Failed to get core web vitals', error);
    return [];
  }
}

/**
 * Get rating for a metric
 */
function getMetricRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = PERFORMANCE_METRICS[name as keyof typeof PERFORMANCE_METRICS];
  if (!thresholds) return 'good';

  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.needsImprovement) return 'needs-improvement';
  return 'poor';
}

/**
 * Report metrics to analytics (placeholder)
 */
export function reportMetrics(metrics: MetricData[]) {
  // Send to your analytics service

  // Example: Send to Vercel Analytics
  if (typeof window !== 'undefined' && window.va) {
    window.va('event', {
      name: 'core-web-vitals',
      data: metrics,
    });
  }
}

/**
 * Check if all metrics are good
 */
export function areAllMetricsGood(metrics: MetricData[]): boolean {
  return metrics.every(m => m.rating === 'good');
}

/**
 * Get performance summary
 */
export function getPerformanceSummary(metrics: MetricData[]) {
  const summary: {
    total: number;
    good: number;
    needsImprovement: number;
    poor: number;
    issues: string[];
  } = {
    total: metrics.length,
    good: 0,
    needsImprovement: 0,
    poor: 0,
    issues: [],
  };

  metrics.forEach(m => {
    if (m.rating === 'good') {
      summary.good++;
    } else if (m.rating === 'needs-improvement') {
      summary.needsImprovement++;
    } else {
      summary.poor++;
    }
    if (m.rating !== 'good') {
      const thresholds = PERFORMANCE_METRICS[m.name as keyof typeof PERFORMANCE_METRICS];
      if (thresholds) {
        summary.issues.push(
          `${m.name}: ${m.value.toFixed(2)}ms (target: <${thresholds.good}ms)`
        );
      }
    }
  });

  return summary;
}

/**
 * Performance Observer for custom metrics
 */
export class PerformanceMonitor {
  private observers: PerformanceObserver[] = [];

  observe(type: string, callback: (list: PerformanceObserverEntryList) => void) {
    if (typeof window === 'undefined') return;

    try {
      const observer = new PerformanceObserver(callback);
      observer.observe({ type, buffered: true });
      this.observers.push(observer);
    } catch (e) {
      // Performance type not supported in this browser - silently skip
    }
  }

  disconnect() {
    this.observers.forEach(obs => obs.disconnect());
    this.observers = [];
  }
}

/**
 * Measure navigation timing
 */
export function measureNavigationTiming() {
  if (typeof window === 'undefined') return null;

  const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

  if (!timing) return null;

  return {
    domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
    loadComplete: timing.loadEventEnd - timing.loadEventStart,
    domReady: timing.domInteractive - timing.domContentLoadedEventEnd,
    firstPaint: timing.responseStart - timing.fetchStart,
    totalLoadTime: timing.loadEventEnd - timing.fetchStart,
  };
}

/**
 * Memory usage (Chrome only)
 */
export function getMemoryUsage() {
  if (typeof window === 'undefined') return null;

  if (!performance.memory) {
    return null;
  }

  const memory = performance.memory;

  return {
    usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1048576), // MB
    totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1048576), // MB
    jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
  };
}
