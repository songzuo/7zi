/**
 * Web Vitals Monitoring (Enhanced)
 * Collects and reports Core Web Vitals with real system integration
 *
 * 功能：
 * - Core Web Vitals 收集 (LCP, FID, CLS, TTFB, FCP, INP)
 * - 连接到实际性能上报系统 (API + Sentry)
 * - User Timing API 标记
 * - LCP/FID/INP 优化建议
 */

// performance is available globally in browser, no need to import
declare const performance: Performance;

// ============================================
// 类型定义
// ============================================

interface Metric {
  name: string;
  value: number;
  id: string;
  rating: 'good' | 'needs-improvement' | 'poor';
  navigationType: string;
  delta?: number;
  entries?: PerformanceEntry[];
}

interface WebVitalsConfig {
  // 上报配置
  reportUrl?: string;
  enableSentry?: boolean;
  enableConsole?: boolean;
  sampleRate?: number;
  
  // 调试配置
  debug?: boolean;
  verbose?: boolean;

  // 优化配置
  onLCP?: (metric: Metric) => void;
  // onFID is deprecated, use onINP instead
  onCLS?: (metric: Metric) => void;
  onTTFB?: (metric: Metric) => void;
  onFCP?: (metric: Metric) => void;
  onINP?: (metric: Metric) => void;
}

// ============================================
// 常量
// ============================================

const THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000, poor: 4000 },
  FID: { good: 100, needsImprovement: 300, poor: 300 },
  CLS: { good: 0.1, needsImprovement: 0.25, poor: 0.25 },
  TTFB: { good: 800, needsImprovement: 1800, poor: 1800 },
  FCP: { good: 1800, needsImprovement: 3000, poor: 3000 },
  INP: { good: 200, needsImprovement: 500, poor: 500 },
};

// ============================================
// User Timing API 标记
// ============================================

export function markTiming(name: string, description?: string) {
  if (typeof performance === 'undefined' || !('mark' in performance)) return;
  
  try {
    performance.mark(`${name}-start`, {
      detail: { description, timestamp: Date.now() },
    });
  } catch (e) {
    console.warn('[WebVitals] Failed to mark timing:', e);
  }
}

export function measureTiming(name: string, startMark: string, endMark?: string) {
  if (typeof performance === 'undefined' || !('measure' in performance)) return;
  
  try {
    const detail = { description: `Measure: ${name}`, timestamp: Date.now() };
    
    if (endMark) {
      performance.measure(name, startMark, endMark);
    } else {
      performance.measure(name, startMark);
    }
  } catch (e) {
    console.warn('[WebVitals] Failed to measure timing:', e);
  }
}

export function getTimingEntries(): PerformanceEntry[] {
  if (typeof performance === 'undefined' || !('getEntriesByType' in performance)) {
    return [];
  }
  
  try {
    return performance.getEntriesByType('measure');
  } catch {
    return [];
  }
}

export function clearTiming(name?: string) {
  if (typeof performance === 'undefined' || !('clearMarks' in performance)) return;
  
  try {
    if (name) {
      performance.clearMarks(`${name}-start`);
      performance.clearMarks(`${name}-end`);
    } else {
      performance.clearMarks();
    }
  } catch {
    // Ignore
  }
}

// ============================================
// LCP 优化
// ============================================

export function optimizeLCP() {
  if (typeof document === 'undefined') return;

  // 1. 预加载 Largest Contentful Paint 图片
  const lcpImage = document.querySelector('img[data-lcp], .hero-image img, main img') as HTMLImageElement;
  if (lcpImage && lcpImage.src) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = lcpImage.src;
    link.fetchPriority = 'high';
    document.head.appendChild(link);
  }

  // 2. 确保 LCP 图片的 fetchpriority 高
  const images = document.querySelectorAll('img');
  images.forEach((img) => {
    if (img.dataset.lcp === 'true') {
      img.fetchPriority = 'high';
    }
  });

  // 3. 移除阻塞渲染的 CSS
  const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
  stylesheets.forEach((link) => {
    const stylesheet = link as HTMLLinkElement;
    if (!stylesheet.media || stylesheet.media === 'all') {
      stylesheet.media = 'print';
      stylesheet.addEventListener('load', () => {
        stylesheet.media = 'all';
      });
    }
  });
}

// ============================================
// FID/INP 优化
// ============================================

export function optimizeFID_INP() {
  if (typeof document === 'undefined') return;

  // 1. 分解长任务
  function yieldToMain() {
    return new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }

  // 2. 延迟非关键交互
  function deferNonCriticalWork() {
    // 使用 requestIdleCallback 如果可用
    const schedule = (callback: () => void) => {
      if ('requestIdleCallback' in window) {
        (window as Window & { requestIdleCallback: Function }).requestIdleCallback(callback);
      } else {
        setTimeout(callback, 1);
      }
    };

    // 延迟第三方脚本加载
    const thirdPartyScripts = document.querySelectorAll('script[data-third-party]');
    thirdPartyScripts.forEach((script) => {
      const clone = script.cloneNode(true) as HTMLElement;
      script.remove();
      schedule(() => {
        document.head.appendChild(clone);
      });
    });

    // 延迟 analytics 等非关键脚本
    const analyticsScripts = document.querySelectorAll('script[async]');
    analyticsScripts.forEach((script) => {
      const htmlScript = script as HTMLScriptElement;
      if (htmlScript.src && (
        htmlScript.src.includes('analytics') ||
        htmlScript.src.includes('tracking') ||
        htmlScript.src.includes('hotjar')
      )) {
        const clone = script.cloneNode(true) as HTMLElement;
        script.remove();
        schedule(() => {
          document.head.appendChild(clone);
        });
      }
    });
  }

  // 3. 监听长任务并发出警告
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn(`[FID/INP] Long task detected: ${entry.duration.toFixed(0)}ms`);
            
            // 发出自定义事件供分析
            window.dispatchEvent(new CustomEvent('longtask', {
              detail: { duration: entry.duration, startTime: entry.startTime }
            }));
          }
        }
      });
      observer.observe({ type: 'longtask', buffered: true });
    } catch {
      // Long Task API not supported
    }
  }

  // 执行优化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', deferNonCriticalWork);
  } else {
    deferNonCriticalWork();
  }
}

// ============================================
// 获取评分
// ============================================

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
  if (!threshold) return 'good';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

// ============================================
// 上报指标
// ============================================

async function reportMetricToAPI(metric: Metric) {
  const reportUrl = process.env.NEXT_PUBLIC_WEB_VITALS_API_URL || '/api/web-vitals';
  
  try {
    await fetch(reportUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metrics: [{
          id: metric.id,
          name: metric.name as Metric['name'],
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta || metric.value,
          navigationType: metric.navigationType,
          timestamp: Date.now(),
          route: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
        }],
        metadata: {
          url: typeof window !== 'undefined' ? window.location.href : 'unknown',
          viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
          viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
          deviceType: getDeviceType(),
          connectionType: getConnectionType(),
        },
      }),
      // 使用 keepalive 确保页面卸载时也能发送
      keepalive: true,
    });
  } catch (error) {
    console.warn('[WebVitals] Failed to report metric:', error);
  }
}

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

// ============================================
// 控制台输出
// ============================================

function logToConsole(metric: Metric, config: WebVitalsConfig) {
  if (!config.enableConsole && !config.debug) return;
  
  const emoji = metric.rating === 'poor' ? '🚨' : metric.rating === 'needs-improvement' ? '⚠️' : '✅';
  const method = metric.rating === 'poor' ? 'error' : metric.rating === 'needs-improvement' ? 'warn' : 'log';
  
  const prefix = config.debug ? `[WebVitals DEBUG]` : `[Web Vitals]`;
  const message = `${prefix} ${emoji} ${metric.name}: ${metric.value.toFixed(0)}ms (${metric.rating})`;
  
  if (typeof console !== 'undefined') {
    console[method](message, {
      id: metric.id,
      navigationType: metric.navigationType,
      route: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      threshold: THRESHOLDS[metric.name as keyof typeof THRESHOLDS],
    });
  }
}

// ============================================
// 初始化 Web Vitals 监控
// ============================================

let isInitialized = false;

export function initWebVitalsMonitoring(config: WebVitalsConfig = {}) {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  const {
    enableSentry = true,
    enableConsole = process.env.NODE_ENV === 'development',
    sampleRate = 1.0,
    debug = false,
    verbose = false,
    onLCP,
    onCLS,
    onTTFB,
    onFCP,
    onINP,
  } = config;

  // 标记性能开始
  markTiming('web-vitals-init');

  // 采样检查
  const shouldSample = () => Math.random() < sampleRate;

  // Use web-vitals library
  import('web-vitals').then(({ onLCP: onLCPWeb, onCLS: onCLSWeb, onTTFB: onTTFBWeb, onFCP: onFCPWeb, onINP: onINPWeb }) => {
    // Largest Contentful Paint
    onLCPWeb((metric) => {
      const enhancedMetric: Metric = {
        ...metric,
        name: 'LCP',
        rating: getRating('LCP', metric.value),
      };

      logToConsole(enhancedMetric, { enableConsole, debug });
      onLCP?.(enhancedMetric);

      if (shouldSample()) {
        reportMetricToAPI(enhancedMetric);
      }
    });

    // First Input Delay (deprecated, using INP instead)
    // onFIDWeb - FID is deprecated, use onINP instead

    // Cumulative Layout Shift
    onCLSWeb((metric) => {
      const enhancedMetric: Metric = {
        ...metric,
        name: 'CLS',
        rating: getRating('CLS', metric.value),
      };

      logToConsole(enhancedMetric, { enableConsole, debug });
      onCLS?.(enhancedMetric);
      
      if (shouldSample()) {
        reportMetricToAPI(enhancedMetric);
      }
    });

    // Time to First Byte
    onTTFBWeb((metric) => {
      const enhancedMetric: Metric = {
        ...metric,
        name: 'TTFB',
        rating: getRating('TTFB', metric.value),
      };

      logToConsole(enhancedMetric, { enableConsole, debug });
      onTTFB?.(enhancedMetric);
      
      if (shouldSample()) {
        reportMetricToAPI(enhancedMetric);
      }
    });

    // First Contentful Paint
    onFCPWeb((metric) => {
      const enhancedMetric: Metric = {
        ...metric,
        name: 'FCP',
        rating: getRating('FCP', metric.value),
      };

      logToConsole(enhancedMetric, { enableConsole, debug });
      onFCP?.(enhancedMetric);
      
      if (shouldSample()) {
        reportMetricToAPI(enhancedMetric);
      }
    });

    // Interaction to Next Paint
    onINPWeb((metric) => {
      const enhancedMetric: Metric = {
        ...metric,
        name: 'INP',
        rating: getRating('INP', metric.value),
      };

      logToConsole(enhancedMetric, { enableConsole, debug });
      onINP?.(enhancedMetric);
      
      if (shouldSample()) {
        reportMetricToAPI(enhancedMetric);
      }
    });

    // 标记初始化完成
    measureTiming('web-vitals-init', 'web-vitals-init');
  }).catch((error) => {
    console.error('[WebVitals] Failed to load web-vitals library:', error);
  });
}

// ============================================
// 便捷函数
// ============================================

/**
 * 获取当前 Web Vitals 状态 (for debugging)
 */
export async function getCurrentVitals() {
  if (typeof window === 'undefined') {
    return null;
  }

  const { onLCP: onLCPWeb, onCLS: onCLSWeb, onTTFB: onTTFBWeb, onINP: onINPWeb } = await import('web-vitals');

  return new Promise<Record<string, number>>((resolve) => {
    const vitals: Record<string, number> = {};

    const checkComplete = () => {
      if (Object.keys(vitals).length >= 4) {
        resolve(vitals);
      }
    };

    // 设置超时
    setTimeout(() => {
      resolve(vitals);
    }, 10000);

    onLCPWeb((m) => { vitals.LCP = m.value; checkComplete(); });
    // FID is deprecated, using INP instead
    onCLSWeb((m) => { vitals.CLS = m.value; checkComplete(); });
    onTTFBWeb((m) => { vitals.TTFB = m.value; checkComplete(); });
    onINPWeb((m) => { vitals.INP = m.value; checkComplete(); });
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
      list.getEntries().forEach((entry) => {
        console.warn('[Performance] Long task:', entry.duration);
      });
    });
    longTaskObserver.observe({ type: 'longtask', buffered: true });
  } catch {
    // Long Task API not supported
  }

  // Observe layout shifts
  try {
    const layoutShiftObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (!(entry as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput) {
          console.warn('[Performance] Layout shift:', entry);
        }
      });
    });
    layoutShiftObserver.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // Layout Shift API not supported
  }
}

// ============================================
// 导出
// ============================================

export {
  // Legacy export for backwards compatibility
  initWebVitalsMonitoring as initMonitoring,
};
