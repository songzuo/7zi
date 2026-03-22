/**
 * Web Vitals Monitoring
 * 性能指标监控
 */

export interface WebVitalsReport {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  navigationType?: string;
}

export interface WebVitalsConfig {
  reportWebVitals?: (metric: WebVitalsReport) => void;
  allowedOrigins?: string[];
  analyticsId?: string;
}

let config: WebVitalsConfig = {};

/**
 * Initialize Web Vitals monitoring
 */
export function initWebVitalsMonitoring(options: WebVitalsConfig = {}): void {
  config = { ...options };

  if (typeof window !== 'undefined') {
    // Dynamic import to avoid SSR issues
    import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      onCLS(reportMetric);
      onINP(reportMetric);
      onFCP(reportMetric);
      onLCP(reportMetric);
      onTTFB(reportMetric);
    }).catch(() => {
      console.warn('Failed to load web-vitals');
    });
  }
}

/**
 * Report metric to configured handler
 */
function reportMetric(metric: any): void {
  const report: WebVitalsReport = {
    id: metric.id,
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    navigationType: metric.navigationType,
  };

  // Send to configured handler
  if (config.reportWebVitals) {
    config.reportWebVitals(report);
  }

  // Send to analytics if configured
  if (config.analyticsId && typeof window !== 'undefined') {
    // Integration with Google Analytics or similar
    if (window.gtag) {
      window.gtag('event', metric.name, {
        event_category: 'Web Vitals',
        event_label: metric.id,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        non_interaction: true,
      });
    }
  }
}

/**
 * Export for testing
 */
export { config as webVitalsConfig };
