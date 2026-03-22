/**
 * Monitoring Utilities
 * 监控工具函数
 */

import { monitor } from './monitor';

/**
 * Higher-order function to track async operations
 * 追踪异步操作的高阶函数
 */
export async function withPerformanceTracking<T>(
  operationName: string,
  operation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const operationId = monitor.startOperation(operationName);
  const startTime = Date.now();

  try {
    const result = await operation();
    await monitor.endOperation(operationId, true, {
      ...metadata,
      duration: Date.now() - startTime,
    });
    return result;
  } catch (error) {
    await monitor.endOperation(operationId, false, {
      ...metadata,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Wrap fetch with monitoring
 * 包装 fetch 以添加监控
 */
export async function monitoredFetch(
  input: RequestInfo | URL,
  init?: RequestInit & { metadata?: Record<string, any> }
): Promise<Response> {
  const method = (init?.method || 'GET') as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const startTime = Date.now();

  try {
    const response = await fetch(input, init);
    const responseTime = Date.now() - startTime;

    await monitor.trackAPIRequest(
      method,
      url,
      response.status,
      responseTime,
      init?.metadata
    );

    return response;
  } catch (error) {
    const responseTime = Date.now() - startTime;

    await monitor.trackAPIRequest(method, url, 0, responseTime, {
      ...init?.metadata,
      error: error instanceof Error ? error.message : String(error),
    });

    await monitor.trackError(
      'FetchError',
      error instanceof Error ? error.message : String(error),
      error instanceof Error ? error.stack : undefined,
      { url, method }
    );

    throw error;
  }
}

/**
 * Track React error boundary error
 * 追踪 React 错误边界错误
 */
export function trackReactError(
  error: Error,
  errorInfo: {
    componentStack: string;
    digest?: string;
  }
): void {
  monitor.trackError('ReactError', error.message, error.stack, {
    componentStack: errorInfo.componentStack,
    digest: errorInfo.digest,
  });
}

/**
 * Create a performance tracking hook
 * 创建性能追踪钩子
 */
export function createPerformanceTracker(name: string) {
  return {
    start: () => monitor.startOperation(name),
    end: (id: string, success: boolean = true, metadata?: Record<string, any>) =>
      monitor.endOperation(id, success, metadata),
    async track<T>(fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
      return withPerformanceTracking(name, fn, metadata);
    },
  };
}

/**
 * Log browser performance metrics
 * 记录浏览器性能指标
 */
export function logBrowserMetrics(): void {
  if (typeof window === 'undefined') return;

  // Web Vitals
  if (window.performance && (window.performance as any).getEntriesByType) {
    const navigation = (window.performance as any)
      .getEntriesByType('navigation')
      .pop() as PerformanceNavigationTiming | undefined;

    if (navigation) {
      monitor.trackCustomMetric('page_load_time', navigation.loadEventEnd - navigation.fetchStart, 'ms');
      monitor.trackCustomMetric('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart, 'ms');
      monitor.trackCustomMetric('first_paint', navigation.responseStart - navigation.fetchStart, 'ms');
    }
  }

  // Paint timing
  const paintEntries = (window.performance as any).getEntriesByType('paint');
  paintEntries.forEach((entry: any) => {
    monitor.trackCustomMetric(`paint_${entry.name}`, entry.startTime, 'ms');
  });
}

/**
 * Initialize browser performance tracking
 * 初始化浏览器性能追踪
 */
export function initBrowserTracking(): void {
  if (typeof window === 'undefined') return;

  // Track initial page load
  if (document.readyState === 'complete') {
    logBrowserMetrics();
  } else {
    window.addEventListener('load', logBrowserMetrics);
  }

  // Track route changes (for Next.js)
  if (typeof window !== 'undefined' && (window as any).next) {
    // Next.js router events
  }
}

/**
 * React Hook for performance tracking
 * 性能追踪的 React Hook
 */
export function usePerformanceTracker(operationName: string) {
  const startTracking = () => {
    return monitor.startOperation(operationName);
  };

  return { startTracking, monitor };
}
