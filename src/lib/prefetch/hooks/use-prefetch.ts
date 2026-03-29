/**
 * usePrefetch Hook
 * 
 * 手动预加载指定路径
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { PredictivePrefetcher, globalPrefetcher } from '../predictive-prefetcher';
import { PrefetchContext } from '../prefetch-provider';

export interface UsePrefetchOptions {
  /** 预加载触发条件 */
  trigger?: 'immediate' | 'on-hover' | 'on-focus' | 'manual';
  /** 延迟时间 (ms) */
  delay?: number;
  /** 预加载优先级 */
  priority?: 'high' | 'medium' | 'low';
  /** 回调函数 */
  onComplete?: (path: string, success: boolean, duration: number) => void;
  /** 预加载数据 */
  prefetchData?: boolean;
  /** 预加载资源 */
  prefetchResources?: boolean;
}

export interface PrefetchResult {
  path: string;
  success: boolean;
  duration: number;
  timestamp: number;
  error?: string;
}

/**
 * 手动预加载 Hook
 */
export function usePrefetch(path: string, options: UsePrefetchOptions = {}) {
  const {
    trigger = 'manual',
    delay = 0,
    priority = 'medium',
    onComplete,
    prefetchData = true,
    prefetchResources = true,
  } = options;

  const isPrefetchedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prefetcherRef = useRef<PredictivePrefetcher>(globalPrefetcher);

  // 执行预加载
  const prefetch = useCallback(async () => {
    if (isPrefetchedRef.current) {
      return;
    }

    const startTime = performance.now();
    
    try {
      // 预加载路由
      const results = await prefetcherRef.current.prefetch([path]);
      const result = results[0];

      const duration = performance.now() - startTime;

      if (result.success) {
        isPrefetchedRef.current = true;

        // 预加载数据和资源
        if (prefetchData) {
          await prefetchRouteData(path);
        }

        if (prefetchResources) {
          await prefetchRouteResources(path);
        }
      }

      if (onComplete) {
        onComplete(
          path,
          result.success,
          duration
        );
      }

      return {
        path,
        success: result.success,
        duration,
        timestamp: Date.now(),
        error: result.error,
      } as PrefetchResult;
    } catch (error) {
      const duration = performance.now() - startTime;
      const result: PrefetchResult = {
        path,
        success: false,
        duration,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      if (onComplete) {
        onComplete(path, false, duration);
      }

      return result;
    }
  }, [path, prefetchData, prefetchResources, onComplete]);

  // 立即预加载
  useEffect(() => {
    if (trigger === 'immediate') {
      const timeout = setTimeout(() => {
        prefetch();
      }, delay);

      return () => clearTimeout(timeout);
    }
  }, [trigger, delay, prefetch]);

  // 悬停预加载
  useEffect(() => {
    if (trigger !== 'on-hover') return;

    const handleMouseOver = () => {
      const timeout = setTimeout(() => {
        prefetch();
      }, delay);

      timeoutRef.current = timeout;
    };

    const handleMouseOut = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    // 查找对应的元素
    const element = document.querySelector(`a[href="${path}"]`) as HTMLAnchorElement;
    if (element) {
      element.addEventListener('mouseover', handleMouseOver);
      element.addEventListener('mouseout', handleMouseOut);

      return () => {
        element.removeEventListener('mouseover', handleMouseOver);
        element.removeEventListener('mouseout', handleMouseOut);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [trigger, delay, path, prefetch]);

  // 焦点预加载
  useEffect(() => {
    if (trigger !== 'on-focus') return;

    const handleFocus = () => {
      const timeout = setTimeout(() => {
        prefetch();
      }, delay);

      timeoutRef.current = timeout;
    };

    const handleBlur = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    // 查找对应的元素
    const element = document.querySelector(`a[href="${path}"]`) as HTMLAnchorElement;
    if (element) {
      element.addEventListener('focus', handleFocus);
      element.addEventListener('blur', handleBlur);

      return () => {
        element.removeEventListener('focus', handleFocus);
        element.removeEventListener('blur', handleBlur);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [trigger, delay, path, prefetch]);

  return {
    prefetch,
    isPrefetched: isPrefetchedRef.current,
  };
}

/**
 * 批量预加载 Hook
 */
export function useBatchPrefetch(paths: string[], options: UsePrefetchOptions = {}) {
  const prefetchedRef = useRef<Set<string>>(new Set());
  const isPrefetchingRef = useRef(false);

  const prefetch = useCallback(async () => {
    if (isPrefetchingRef.current) return;

    isPrefetchingRef.current = true;

    try {
      const results: PrefetchResult[] = [];

      for (const path of paths) {
        if (!prefetchedRef.current.has(path)) {
          const hook = usePrefetch(path, { ...options, trigger: 'manual' });
          const result = await hook.prefetch();
          if (result) {
            results.push(result);
          }
          prefetchedRef.current.add(path);
        }
      }

      return results;
    } finally {
      isPrefetchingRef.current = false;
    }
  }, [paths, options]);

  return {
    prefetch,
    isPrefetching: isPrefetchingRef.current,
    prefetchedPaths: Array.from(prefetchedRef.current),
  };
}

/**
 * 预加载数据
 */
async function prefetchRouteData(path: string): Promise<void> {
  const dataMap: Record<string, string[]> = {
    '/dashboard': ['/api/dashboard/stats', '/api/notifications'],
    '/tasks': ['/api/tasks', '/api/tasks/stats'],
    '/settings': ['/api/user/preferences'],
    '/projects': ['/api/projects'],
  };

  const endpoints = dataMap[path] || [];

  for (const endpoint of endpoints) {
    try {
      // 使用 fetch 触发预加载（不消费数据）
      await fetch(endpoint, { method: 'HEAD' });
    } catch (error) {
      // 忽略预加载错误
    }
  }
}

/**
 * 预加载资源
 */
async function prefetchRouteResources(path: string): Promise<void> {
  if (typeof document === 'undefined') return;

  const resourceMap: Record<string, { images?: string[]; fonts?: string[] }> = {
    '/dashboard': {
      images: ['/images/dashboard-bg.webp'],
    },
    '/tasks': {
      images: ['/images/tasks-placeholder.webp'],
    },
  };

  const resources = resourceMap[path] || {};

  // 预加载图片
  if (resources.images) {
    for (const image of resources.images) {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'image';
      link.href = image;
      document.head.appendChild(link);
    }
  }
}

export default usePrefetch;
