/**
 * 性能追踪组件
 * 在客户端测量和报告 Web Vitals 指标
 */

import { useEffect, useState } from 'react';

interface WebVitals {
  fcp: number | null;
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  ttfb: number | null;
}

export function useWebVitals() {
  const [vitals, setVitals] = useState<WebVitals>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
  });

  useEffect(() => {
    // TTFB
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      setVitals(prev => ({ ...prev, ttfb: navigation.responseStart }));
    }

    // FCP
    const fcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      for (const entry of entries) {
        if (entry.name === 'first-contentful-paint') {
          setVitals(prev => ({ ...prev, fcp: entry.startTime }));
        }
      }
    });
    fcpObserver.observe({ entryTypes: ['paint'] });

    // LCP
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      setVitals(prev => ({ ...prev, lcp: lastEntry.startTime }));
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // CLS
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          setVitals(prev => ({ ...prev, cls: clsValue }));
        }
      }
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // FID (使用 INP 作为替代)
    const fidObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.entryType === 'first-input') {
          setVitals(prev => ({ ...prev, fid: (entry as PerformanceEventTiming).duration }));
        }
      }
    });
    fidObserver.observe({ entryTypes: ['first-input'] });

    return () => {
      fcpObserver.disconnect();
      lcpObserver.disconnect();
      clsObserver.disconnect();
      fidObserver.disconnect();
    };
  }, []);

  return vitals;
}

export function getVitalsRating(value: number | null, type: keyof WebVitals): string {
  if (value === null) return '⚪ 未测量';

  const thresholds: Record<string, { good: number; needsImprovement: number }> = {
    fcp: { good: 1800, needsImprovement: 3000 },
    lcp: { good: 2500, needsImprovement: 4000 },
    fid: { good: 100, needsImprovement: 300 },
    cls: { good: 0.1, needsImprovement: 0.25 },
    ttfb: { good: 200, needsImprovement: 500 },
  };

  const threshold = thresholds[type];
  if (value <= threshold.good) return '🟢 优秀';
  if (value <= threshold.needsImprovement) return '🟡 需改进';
  return '🔴 差';
}

export default useWebVitals;
