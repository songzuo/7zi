/**
 * Performance Monitor Integration
 * Enhanced monitoring that sends metrics to the performance API
 */

import { logger } from '@/lib/logger';
import type { PerformanceMetric } from '../api/performance/metrics/route';

// ========================================
// Constants
// ========================================

const API_ENDPOINT = '/api/performance/metrics';
const BATCH_SIZE = 10; // Send metrics in batches
const BATCH_TIMEOUT = 5000; // Send batch after 5 seconds if not full

// ========================================
// Types
// ========================================

interface QueuedMetric {
  metric: PerformanceMetric;
  metadata: {
    url: string;
    route: string;
    deviceType: string;
    connectionType: string;
    viewportWidth: number;
    viewportHeight: number;
  };
}

// ========================================
// State
// ========================================

let metricQueue: QueuedMetric[] = [];
let batchTimeout: NodeJS.Timeout | null = null;

// ========================================
// Helper Functions
// ========================================

function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';

  const ua = navigator.userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk|kindle|android(?!.*mobi)/i.test(ua)) return 'tablet';
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(ua)) return 'mobile';
  return 'desktop';
}

function getConnectionType(): string {
  if (typeof navigator === 'undefined') return 'unknown';

  const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  return conn?.effectiveType || 'unknown';
}

// ========================================
// Metric Collection
// ========================================

/**
 * Queue a performance metric for batch sending
 */
export function queueMetric(
  name: string,
  value: number,
  rating: 'good' | 'needs-improvement' | 'poor'
) {
  if (typeof window === 'undefined') return;

  const metric: PerformanceMetric = {
    id: `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    value,
    rating,
    timestamp: Date.now(),
    route: window.location.pathname,
    deviceType: getDeviceType(),
    connectionType: getConnectionType(),
  };

  const metadata = {
    url: window.location.href,
    route: window.location.pathname,
    deviceType: getDeviceType(),
    connectionType: getConnectionType(),
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  };

  metricQueue.push({ metric, metadata });

  // Log to existing logger
  logger.info('Performance metric collected', {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    route: metric.route,
    deviceType: metric.deviceType,
  });

  // Check if batch is ready to send
  if (metricQueue.length >= BATCH_SIZE) {
    flushMetrics();
  } else if (!batchTimeout) {
    // Set timeout to send batch even if not full
    batchTimeout = setTimeout(() => {
      flushMetrics();
      batchTimeout = null;
    }, BATCH_TIMEOUT);
  }
}

// ========================================
// Metric Sending
// ========================================

/**
 * Flush queued metrics to the API
 */
export async function flushMetrics() {
  if (metricQueue.length === 0) return;

  const batch = [...metricQueue];
  metricQueue = [];

  if (batchTimeout) {
    clearTimeout(batchTimeout);
    batchTimeout = null;
  }

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metrics: batch.map(q => q.metric),
        metadata: batch[0]?.metadata,
      }),
      keepalive: true, // Ensure send even on page unload
    });

    if (!response.ok) {
      logger.warn('Failed to send performance metrics', {
        status: response.status,
        count: batch.length,
      });
    } else {
      logger.info('Performance metrics sent successfully', {
        count: batch.length,
      });
    }
  } catch (error) {
    logger.warn('Error sending performance metrics', { error });
    // Re-queue metrics on error (up to a limit)
    if (metricQueue.length < 100) {
      metricQueue.unshift(...batch);
    }
  }
}

// ========================================
// Initialization
// ========================================

/**
 * Initialize enhanced performance monitoring
 */
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') return;

  // Send metrics on page unload
  window.addEventListener('beforeunload', () => {
    flushMetrics();
  });

  // Send metrics when page is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushMetrics();
    }
  });

  // Import and initialize Web Vitals monitoring
  import('@/lib/monitoring/web-vitals').then(({ onLCP, onFID, onCLS, onTTFB, onFCP, onINP }) => {
    onLCP((metric) => {
      const rating = metric.value <= 2500 ? 'good' : metric.value <= 4000 ? 'needs-improvement' : 'poor';
      queueMetric('LCP', metric.value, rating);
    });

    onFID((metric) => {
      const rating = metric.value <= 100 ? 'good' : metric.value <= 300 ? 'needs-improvement' : 'poor';
      queueMetric('FID', metric.value, rating);
    });

    onCLS((metric) => {
      const rating = metric.value <= 0.1 ? 'good' : metric.value <= 0.25 ? 'needs-improvement' : 'poor';
      queueMetric('CLS', metric.value, rating);
    });

    onTTFB((metric) => {
      const rating = metric.value <= 800 ? 'good' : metric.value <= 1800 ? 'needs-improvement' : 'poor';
      queueMetric('TTFB', metric.value, rating);
    });

    onFCP((metric) => {
      const rating = metric.value <= 1800 ? 'good' : metric.value <= 3000 ? 'needs-improvement' : 'poor';
      queueMetric('FCP', metric.value, rating);
    });

    onINP((metric) => {
      const rating = metric.value <= 200 ? 'good' : metric.value <= 500 ? 'needs-improvement' : 'poor';
      queueMetric('INP', metric.value, rating);
    });

    logger.info('Enhanced performance monitoring initialized');
  }).catch((error) => {
    logger.error('Failed to initialize Web Vitals monitoring', { error });
  });
}

// ========================================
// Manual Metrics
// ========================================

/**
 * Manually record a custom performance metric
 */
export function recordCustomMetric(
  name: string,
  value: number,
  rating: 'good' | 'needs-improvement' | 'poor' = 'needs-improvement'
) {
  queueMetric(name, value, rating);
}

/**
 * Record API response time
 */
export function recordApiResponse(endpoint: string, duration: number) {
  const rating = duration <= 200 ? 'good' : duration <= 1000 ? 'needs-improvement' : 'poor';
  queueMetric(`API-${endpoint}`, duration, rating);
}

/**
 * Record component render time
 */
export function recordComponentRender(componentName: string, duration: number) {
  const rating = duration <= 16 ? 'good' : duration <= 100 ? 'needs-improvement' : 'poor';
  queueMetric(`Render-${componentName}`, duration, rating);
}

// ========================================
// Exports
// ========================================

export {
  flushMetrics,
  initPerformanceMonitoring as default,
};
