'use client';

/**
 * @fileoverview 性能监控组件
 * @description 监控和报告 Web Vitals 及其他性能指标
 */

import { useEffect, useRef, useState } from 'react';

// 类型定义
interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number;
  startTime: number;
}

interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

// 性能指标类型
interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  // 其他指标
  fcp: number | null; // First Contentful Paint
  ttfb: number | null; // Time to First Byte
  inp: number | null; // Interaction to Next Paint
}

// 性能评级
type Rating = 'good' | 'needs-improvement' | 'poor';

// 性能阈值
const THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 },
  fid: { good: 100, poor: 300 },
  cls: { good: 0.1, poor: 0.25 },
  fcp: { good: 1800, poor: 3000 },
  ttfb: { good: 800, poor: 1800 },
  inp: { good: 200, poor: 500 },
};

/**
 * 获取性能评级
 */
function getRating(name: keyof typeof THRESHOLDS, value: number): Rating {
  const threshold = THRESHOLDS[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * 性能监控组件 (仅开发模式)
 */
export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
    inp: null,
  });
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<PerformanceObserver | null>(null);

  useEffect(() => {
    // 只在生产环境的开发工具中显示
    if (process.env.NODE_ENV === 'production') return;

    // 观察 Web Vitals
    const observePerformance = () => {
      // LCP
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          setMetrics((prev) => ({ ...prev, lcp: lastEntry.startTime }));
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch {
        // Browser doesn't support this API
      }

      // FID
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const firstEntry = entries[0] as PerformanceEventTiming;
          setMetrics((prev) => ({ ...prev, fid: firstEntry.processingStart - firstEntry.startTime }));
        });
        fidObserver.observe({ type: 'first-input', buffered: true });
      } catch {
        // Browser doesn't support this API
      }

      // CLS
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutShift = entry as LayoutShift;
            if (!layoutShift.hadRecentInput) {
              clsValue += layoutShift.value;
            }
          }
          setMetrics((prev) => ({ ...prev, cls: clsValue }));
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch {
        // Browser doesn't support this API
      }

      // Navigation timing for FCP and TTFB
      const navigationEntries = performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0) {
        const nav = navigationEntries[0] as PerformanceNavigationTiming;
        setMetrics((prev) => ({
          ...prev,
          fcp: nav.domContentLoadedEventStart,
          ttfb: nav.responseStart,
        }));
      }
    };

    observePerformance();

    // 键盘快捷键显示/隐藏 (Ctrl+Shift+P)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      const observer = observerRef.current;
      observer?.disconnect();
    };
  }, []);

  if (!isVisible || process.env.NODE_ENV === 'production') return null;

  return (
    <div className="fixed bottom-4 left-4 z-[9999] bg-black/90 text-white text-xs p-4 rounded-lg shadow-2xl font-mono max-w-xs">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-cyan-400">Performance Monitor</span>
        <button onClick={() => setIsVisible(false)} className="text-gray-400 hover:text-white">
          ✕
        </button>
      </div>
      <div className="space-y-1">
        {Object.entries(metrics).map(([key, value]) => {
          if (value === null) return null;
          const name = key.toUpperCase() as keyof typeof THRESHOLDS;
          const rating = getRating(name, value);
          const color = rating === 'good' ? 'text-green-400' : rating === 'needs-improvement' ? 'text-yellow-400' : 'text-red-400';

          return (
            <div key={key} className="flex justify-between">
              <span className="text-gray-400">{name}:</span>
              <span className={color}>
                {typeof value === 'number' ? value.toFixed(2) : value}
                {key === 'cls' ? '' : 'ms'}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-700 text-gray-500 text-[10px]">
        Press Ctrl+Shift+P to toggle
      </div>
    </div>
  );
}

interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

/**
 * 资源加载时间监控
 */
export function ResourceTimingMonitor() {
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resource = entry as PerformanceResourceTiming;
        
        // Warn about slow resources in development only
        if (process.env.NODE_ENV === 'development' && resource.duration > 1000) {
          console.warn(`Slow resource: ${resource.name} took ${resource.duration.toFixed(0)}ms`);
        }
      }
    });

    try {
      observer.observe({ type: 'resource', buffered: true });
    } catch {
      // API not supported
    }

    return () => observer.disconnect();
  }, []);

  return null;
}

export default PerformanceMonitor;