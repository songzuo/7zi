/**
 * Web Vitals Monitoring
 * Collects and reports Core Web Vitals (Sentry stub - module not installed)
 */

// Type for web vitals metric
interface Metric {
  name: string;
  value: number;
  id: string;
  rating: 'good' | 'needs-improvement' | 'poor';
  navigationType: string;
}

// Thresholds for Web Vitals ratings
// Note: FID removed in v5 - replaced by INP
const thresholds = {
  LCP: { good: 2500, poor: 4000 },
  CLS: { good: 0.1, poor: 0.25 },
  TTFB: { good: 800, poor: 1800 },
  FCP: { good: 1800, poor: 3000 },
  INP: { good: 200, poor: 500 },
};

/**
 * Get rating for a metric value
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = thresholds[name as keyof typeof thresholds];
  if (!threshold) return 'good';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Report metric (Sentry stub)
 */
function reportMetric(metric: Metric) {
  // Log warnings for poor metrics
  if (metric.rating === 'poor') {
    console.warn(`[Web Vitals] Poor ${metric.name}: ${metric.value}`, {
      rating: metric.rating,
      threshold: thresholds[metric.name as keyof typeof thresholds]?.poor,
      route: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
    });
  }
  // In production, this would send to an analytics service
}

/**
 * Initialize Web Vitals monitoring
 */
export function initWebVitalsMonitoring() {
  if (typeof window === 'undefined') return;

  // Use web-vitals library (v5 - onFID removed, use INP instead)
  import('web-vitals').then(({ onLCP, onCLS, onTTFB, onFCP, onINP }) => {
    // Largest Contentful Paint
    onLCP((metric) => {
      reportMetric({
        ...metric,
        name: 'LCP',
        rating: getRating('LCP', metric.value),
      });
    });

    // Cumulative Layout Shift
    onCLS((metric) => {
      reportMetric({
        ...metric,
        name: 'CLS',
        rating: getRating('CLS', metric.value),
      });
    });

    // Time to First Byte
    onTTFB((metric) => {
      reportMetric({
        ...metric,
        name: 'TTFB',
        rating: getRating('TTFB', metric.value),
      });
    });

    // First Contentful Paint
    onFCP((metric) => {
      reportMetric({
        ...metric,
        name: 'FCP',
        rating: getRating('FCP', metric.value),
      });
    });

    // Interaction to Next Paint (replaces FID in v5)
    onINP((metric) => {
      reportMetric({
        ...metric,
        name: 'INP',
        rating: getRating('INP', metric.value),
      });
    });
  });
}

/**
 * Get current Web Vitals status (for debugging)
 */
export async function getCurrentVitals() {
  if (typeof window === 'undefined') {
    return null;
  }

  const { onLCP, onCLS, onTTFB, onFCP, onINP } = await import('web-vitals');

  return new Promise((resolve) => {
    const vitals: Record<string, number> = {};

    const checkComplete = () => {
      if (Object.keys(vitals).length >= 4) {
        resolve(vitals);
      }
    };

    onLCP((m) => { vitals.LCP = m.value; checkComplete(); });
    onCLS((m) => { vitals.CLS = m.value; checkComplete(); });
    onTTFB((m) => { vitals.TTFB = m.value; checkComplete(); });
    onFCP((m) => { vitals.FCP = m.value; checkComplete(); });
    onINP((m) => { vitals.INP = m.value; checkComplete(); });
  });
}

/**
 * Performance Observer for custom metrics
 */
export function observePerformance() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  // Observe long tasks (production monitoring)
  try {
    const longTaskObserver = new PerformanceObserver(() => {
      // Long task entries would be reported to monitoring service
    });
    longTaskObserver.observe({ type: 'longtask', buffered: true });
  } catch {
    // Long Task API not supported
  }

  // Observe layout shifts (production monitoring)
  try {
    const layoutShiftObserver = new PerformanceObserver(() => {
      // Layout shift entries would be reported to monitoring service
    });
    layoutShiftObserver.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // Layout Shift API not supported
  }
}