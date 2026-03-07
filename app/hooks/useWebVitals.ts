'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Web Vitals 性能监控 Hook
 * 
 * 监控 Core Web Vitals 指标：
 * - LCP (Largest Contentful Paint) - 最大内容绘制
 * - FID (First Input Delay) - 首次输入延迟
 * - CLS (Cumulative Layout Shift) - 累积布局偏移
 * - FCP (First Contentful Paint) - 首次内容绘制
 * - TTFB (Time to First Byte) - 首字节时间
 */
interface WebVitalsHookOptions {
  reportFn?: (metric: Metric) => void;
  debug?: boolean;
}

interface Metric {
  name: string;
  value: number;
  id: string;
  delta?: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
}

export function useWebVitals(options: WebVitalsHookOptions = {}) {
  const { reportFn, debug = false } = options;
  const metricsRef = useRef<Metric[]>([]);

  // 发送指标到服务器
  const sendToAnalytics = useCallback((metric: Metric) => {
    // 添加到本地存储
    metricsRef.current.push(metric);

    // 如果有自定义报告函数
    if (reportFn) {
      reportFn(metric);
    }

    // 生产环境发送到分析服务
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      // 发送到 Google Analytics 4 (如果配置了)
      if (window.gtag) {
        window.gtag('event', metric.name, {
          event_category: 'Web Vitals',
          event_label: metric.id,
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          non_interaction: true,
        });
      }

      // 发送到服务器端点
      if (window.navigator.sendBeacon) {
        try {
          const payload = JSON.stringify({
            ...metric,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
          });
          window.navigator.sendBeacon('/api/metrics', payload);
        } catch (e) {
          // 忽略发送失败
        }
      }
    }

    // 调试模式输出到控制台
    if (debug) {
      console.log(`[Web Vitals] ${metric.name}:`, metric);
    }
  }, [reportFn, debug]);

  useEffect(() => {
    // 只在浏览器环境执行
    if (typeof window === 'undefined') return;

    // CLS 监控
    let clsValue = 0;
    let clsEntries: PerformanceEntry[] = [];

    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShiftEntry = entry as unknown as { hadRecentInput?: boolean; value?: number };
        if (!layoutShiftEntry.hadRecentInput) {
          clsEntries.push(entry);
          clsValue += layoutShiftEntry.value || 0;
        }
      }
    });

    try {
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      // 浏览器不支持
    }

    // LCP 监控
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      sendToAnalytics({
        name: 'LCP',
        value: lastEntry.renderTime || lastEntry.loadTime,
        id: 'lcp',
      });
    });

    try {
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      // 浏览器不支持
    }

    // FCP 监控
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find(e => e.name === 'first-contentful-paint') as any;
      if (fcpEntry) {
        sendToAnalytics({
          name: 'FCP',
          value: fcpEntry.startTime,
          id: 'fcp',
        });
      }
    });

    try {
      fcpObserver.observe({ type: 'paint', buffered: true });
    } catch (e) {
      // 浏览器不支持
    }

    // FID 监控
    const fidObserver = new PerformanceObserver((list) => {
      const firstEntry = list.getEntries()[0] as any;
      if (firstEntry) {
        sendToAnalytics({
          name: 'FID',
          value: firstEntry.processingStart - firstEntry.startTime,
          id: 'fid',
        });
      }
    });

    try {
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      // 浏览器不支持
    }

    // TTFB 监控
    const navigationEntry = performance.getEntriesByType('navigation')[0] as any;
    if (navigationEntry) {
      sendToAnalytics({
        name: 'TTFB',
        value: navigationEntry.responseStart,
        id: 'ttfb',
      });
    }

    // 页面卸载时发送 CLS
    const handleBeforeUnload = () => {
      if (clsValue > 0) {
        sendToAnalytics({
          name: 'CLS',
          value: clsValue,
          id: 'cls',
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // 清理
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clsObserver.disconnect();
      lcpObserver.disconnect();
      fcpObserver.disconnect();
      fidObserver.disconnect();
    };
  }, [sendToAnalytics]);

  return {
    metrics: metricsRef.current,
  };
}

// 声明全局 gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export default useWebVitals;
