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
const thresholds = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
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
 * Report metric to console (Sentry stub)
 */
function reportMetric(metric: Metric) {
  // Log to console for debugging
  if (metric.rating === 'poor') {
    console.warn(`[Web Vitals] Poor ${metric.name}: ${metric.value}`, {
      rating: metric.rating,
      threshold: thresholds[metric.name as keyof typeof thresholds]?.poor,
      route: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
    });
  } else {
    console.log(`[Web Vitals] ${metric.name}: ${metric.value} (${metric.rating})`);
  }
}

/**
 * Initialize Web Vitals monitoring
 */
export function initWebVitalsMonitoring() {
  if (typeof window === 'undefined') return;

  // Use web-vitals library
  import('web-vitals').then(({ onLCP, onFID, onCLS, onTTFB, onFCP, onINP }) => {
    // Largest Contentful Paint
    onLCP((metric) => {
      reportMetric({
        ...metric,
        name: 'LCP',
        rating: getRating('LCP', metric.value),
      });
    });

    // First Input Delay
    onFID((metric) => {
      reportMetric({
        ...metric,
        name: 'FID',
        rating: getRating('FID', metric.value),
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

    // Interaction to Next Paint
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

  const { onLCP, onFID, onCLS, onTTFB, onFCP, onINP } = await import('web-vitals');

  return new Promise((resolve) => {
    const vitals: Record<string, number> = {};

    const checkComplete = () => {
      if (Object.keys(vitals).length >= 4) {
        resolve(vitals);
      }
    };

    onLCP((m) => { vitals.LCP = m.value; checkComplete(); });
    onFID((m) => { vitals.FID = m.value; checkComplete(); });
    onCLS((m) => { vitals.CLS = m.value; checkComplete(); });
    onTTFB((m) => { vitals.TTFB = m.value; checkComplete(); });
  });
}

/**
 * Performance Observer for custom metrics
 */
export function observePerformance() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  // Observe long tasks
  try {
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.log('[Performance] Long task:', entry.duration, 'ms');
      }
    });
    longTaskObserver.observe({ type: 'longtask', buffered: true });
  } catch (e) {
    // Long Task API not supported
  }

  // Observe layout shifts
  try {
    const layoutShiftObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if ('value' in entry && (entry as any).value > 0) {
          console.log('[Performance] Layout shift:', (entry as any).value);
        }
      }
    });
    layoutShiftObserver.observe({ type: 'layout-shift', buffered: true });
  } catch (e) {
    // Layout Shift API not supported
  }
}