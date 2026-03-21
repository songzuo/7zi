'use client';

/**
 * Performance Optimizer Component
 * 客户端性能优化组件 - 初始化所有性能监控和优化
 * 
 * 功能：
 * - 初始化 Web Vitals 监控
 * - 执行 LCP 优化
 * - 执行 FID/INP 优化
 * - 注册 Service Worker
 * - 提供性能调试信息
 */

import { useEffect, useRef, useState } from 'react';
import { 
  initWebVitalsMonitoring, 
  optimizeLCP, 
  optimizeFID_INP,
  markTiming,
  measureTiming 
} from '@/lib/monitoring/web-vitals';

interface PerformanceOptimizerProps {
  /** 是否启用详细调试 */
  debug?: boolean;
  /** 是否预加载关键资源 */
  preloadCritical?: boolean;
  /** 自定义上报 URL */
  reportUrl?: string;
  /** 采样率 */
  sampleRate?: number;
}

/**
 * 性能优化组件
 * 
 * 使用方法:
 * ```tsx
 * // 在 layout.tsx 中
 * <body>
 *   <PerformanceOptimizer />
 *   // ...其他组件
 * </body>
 * ```
 */
export function PerformanceOptimizer({
  debug = process.env.NODE_ENV === 'development',
  preloadCritical = true,
  reportUrl,
  sampleRate = 1.0,
}: PerformanceOptimizerProps) {
  const initialized = useRef(false);

  useEffect(() => {
    // 避免重复初始化
    if (initialized.current) return;
    initialized.current = true;

    // 标记开始
    markTiming('performance-optimization');

    // 1. 初始化 Web Vitals 监控
    initWebVitalsMonitoring({
      enableConsole: debug,
      enableSentry: true,
      sampleRate,
      reportUrl,
      debug,
      verbose: debug,
    });

    // 2. LCP 优化
    if (preloadCritical) {
      optimizeLCP();
    }

    // 3. FID/INP 优化
    optimizeFID_INP();

    // 4. 注册性能优化事件监听
    if (debug) {
      registerDebugListeners();
    }

    // 标记结束
    measureTiming('performance-optimization', 'performance-optimization');

    // 输出初始化完成信息
    if (debug) {
      console.log('[PerformanceOptimizer] Initialized', {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        connection: (navigator as any).connection?.effectiveType || 'unknown',
      });
    }

    // 清理函数
    return () => {
      // 清理工作
    };
  }, [debug, preloadCritical, reportUrl, sampleRate]);

  return null; // 无渲染输出
}

/**
 * 注册调试监听器
 */
function registerDebugListeners() {
  // 监听长任务
  window.addEventListener('longtask', ((event: CustomEvent) => {
    console.log('[Performance] Long task detected:', {
      duration: event.detail.duration,
      startTime: event.detail.startTime,
    });
  }) as EventListener);

  // 监听布局偏移
  window.addEventListener('layoutshift', ((event: CustomEvent) => {
    console.log('[Performance] Layout shift:', {
      value: event.detail.value,
      hadRecentInput: event.detail.hadRecentInput,
    });
  }) as EventListener);

  // 监听页面可见性变化
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      console.log('[Performance] Page hidden - sending pending data...');
      // 可以在这里发送待发送的性能数据
    }
  });

  // 监听网络状态变化
  if ('connection' in navigator) {
    (navigator as any).connection?.addEventListener('change', () => {
      console.log('[Performance] Connection changed:', {
        effectiveType: (navigator as any).connection?.effectiveType,
        downlink: (navigator as any).connection?.downlink,
      });
    });
  }
}

/**
 * React Hook: 组件渲染性能追踪
 * 
 * 使用方法:
 * ```tsx
 * function MyComponent() {
 *   const { start, end, getDuration } = useComponentRenderTiming('MyComponent');
 *   
 *   start();
 *   // ... 组件逻辑
 *   end();
 *   
 *   return <div>{getDuration()}ms</div>;
 * }
 * ```
 */
export function useComponentRenderTiming(componentName: string) {
  const startRef = useRef<number>(0);
  const endRef = useRef<number>(0);

  const start = () => {
    startRef.current = performance.now();
    markTiming(`${componentName}-render-start`);
  };

  const end = () => {
    endRef.current = performance.now();
    markTiming(`${componentName}-render-end`);
    measureTiming(`${componentName}-render-duration`, `${componentName}-render-start`, `${componentName}-render-end`);
  };

  const getDuration = () => {
    return endRef.current - startRef.current;
  };

  return { start, end, getDuration };
}

/**
 * React Hook: API 请求性能追踪
 * 
 * 使用方法:
 * ```tsx
 * function MyComponent() {
 *   const { request, isLoading } = useApiTiming('/api/data');
 *   
 *   useEffect(() => {
 *     request();
 *   }, []);
 *   
 *   return isLoading ? <Loading /> : <Data />;
 * }
 * ```
 */
export function useApiTiming(apiUrl: string) {
  const startRef = useRef<number>(0);
  const endRef = useRef<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [duration, setDuration] = useState<number>(0);

  const request = async (url: string, init?: RequestInit) => {
    setIsLoading(true);
    setError(null);
    startRef.current = performance.now();
    markTiming(`api-${apiUrl}-start`);

    try {
      const response = await fetch(url, init);
      endRef.current = performance.now();
      markTiming(`api-${apiUrl}-end`);
      measureTiming(`api-${apiUrl}-duration`, `api-${apiUrl}-start`, `api-${apiUrl}-end`);
      setDuration(endRef.current - startRef.current);
      return response;
    } catch (e) {
      endRef.current = performance.now();
      markTiming(`api-${apiUrl}-error`);
      measureTiming(`api-${apiUrl}-duration`, `api-${apiUrl}-start`, `api-${apiUrl}-error`);
      setError(e as Error);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  return { request, isLoading, error, duration };
}

/**
 * React Hook: 资源加载性能追踪
 */
export function useResourceTiming(resourceUrl: string) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadTime, setLoadTime] = useState<number>(0);

  useEffect(() => {
    const start = performance.now();

    const handleLoad = () => {
      const end = performance.now();
      setLoadTime(end - start);
      setIsLoaded(true);
      markTiming(`resource-${resourceUrl}-loaded`);
      measureTiming(`resource-${resourceUrl}-load`, `resource-${resourceUrl}-loaded`);
    };

    const handleError = () => {
      const end = performance.now();
      setLoadTime(end - start);
      markTiming(`resource-${resourceUrl}-error`);
    };

    // 检查资源是否已经加载
    const resource = document.querySelector(`script[src="${resourceUrl}"], link[href="${resourceUrl}"]`);
    
    if (resource) {
      if ((resource as any).complete) {
        handleLoad();
      } else {
        resource.addEventListener('load', handleLoad);
        resource.addEventListener('error', handleError);
      }
    }

    return () => {
      if (resource) {
        resource.removeEventListener('load', handleLoad);
        resource.removeEventListener('error', handleError);
      }
    };
  }, [resourceUrl]);

  return { isLoaded, loadTime };
}

export default PerformanceOptimizer;
