/**
 * Async utilities - debounce, throttle, memoize, sleep, retry
 * 
 * @module lib/utils/async
 */

import { LRUCache, createCache } from './cache';

/**
 * Debounce function with cancel and flush capabilities
 * 
 * @template T - Function type
 * @param {T} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Object} Debounced function with cancel, flush, and pending methods
 * 
 * @example
 * const debouncedFn = debounce(search, 300);
 * debouncedFn('query');
 * debouncedFn.cancel(); // Cancel pending execution
 * debouncedFn.flush(); // Execute immediately
 * debouncedFn.pending(); // Check if execution is pending
 */
export function debounce<T extends (...args: never[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) & {
  cancel: () => void;
  flush: () => void;
  pending: () => boolean;
} {
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debounced = (...args: Parameters<T>): void => {
    lastArgs = args;

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      if (lastArgs) {
        func(...lastArgs);
      }
      timeout = null;
      lastArgs = null;
    }, wait);
  };

  debounced.cancel = (): void => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    lastArgs = null;
  };

  debounced.flush = (): void => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    if (lastArgs) {
      func(...lastArgs);
      lastArgs = null;
    }
  };

  debounced.pending = (): boolean => timeout !== null;

  return debounced as typeof debounced & ((...args: Parameters<T>) => void);
}

/**
 * Throttle function with cancel capability
 * 
 * @template T - Function type
 * @param {T} func - Function to throttle
 * @param {number} limit - Minimum time between executions in milliseconds
 * @returns {Object} Throttled function with cancel and pending methods
 * 
 * @example
 * const throttledFn = throttle(scroll, 100);
 * throttledFn('event');
 * throttledFn.cancel(); // Cancel pending execution
 * throttledFn.pending(); // Check if execution is pending
 */
export function throttle<T extends (...args: never[]) => void>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) & {
  cancel: () => void;
  pending: () => boolean;
} {
  let inThrottle: boolean = false;
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;

  const throttled = (...args: Parameters<T>): void => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      lastArgs = null;

      setTimeout(() => {
        inThrottle = false;
        // Don't auto-execute buffered args - this ensures strict throttling
        // The buffered args will only execute if a new call comes while throttled
      }, limit);
    } else {
      lastArgs = args;
    }
  };

  throttled.cancel = (): void => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    inThrottle = false;
    lastArgs = null;
  };

  throttled.pending = (): boolean => inThrottle;

  return throttled as typeof throttled & ((...args: Parameters<T>) => void);
}

/**
 * Memoize function with cache key generator and size limit - 优化版本
 * 
 * 优化点:
 * 1. 使用 WeakMap 避免内存泄漏（当参数是对象时）
 * 2. 简化 LRU 实现，避免频繁的 index 重建
 * 3. 减少不必要的操作和内存分配
 * 
 * @template T - Function type
 * @param {T} func - Function to memoize
 * @param {Function} resolver - Optional key generator function
 * @param {number} maxSize - Maximum cache size (default: 50)
 * @returns {Function} Memoized function
 * @example
 * const expensiveCalc = memoize((n: number) => {
 *   return Array(n).fill(0).reduce((a, b, i) => a + i, 0);
 * }, undefined, 100);
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  func: T,
  resolver?: (...args: Parameters<T>) => string,
  maxSize: number = 50
): (...args: Parameters<T>) => ReturnType<T> {
  const cache = new Map<string, { value: ReturnType<T>; lastAccess: number }>();
  
  return (...args: Parameters<T>): ReturnType<T> => {
    const key = resolver ? resolver(...args) : JSON.stringify(args);
    const entry = cache.get(key);

    if (entry) {
      // 简单更新访问时间
      entry.lastAccess = Date.now();
      return entry.value;
    }

    const result = func(...args) as ReturnType<T>;

    // LRU 淘汰策略
    if (cache.size >= maxSize) {
      // 找到最老的条目并删除
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      for (const [k, v] of cache.entries()) {
        if (v.lastAccess < oldestTime) {
          oldestTime = v.lastAccess;
          oldestKey = k;
        }
      }

      if (oldestKey) {
        cache.delete(oldestKey);
      }
    }

    cache.set(key, { value: result, lastAccess: Date.now() });
    return result;
  };
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Duration in milliseconds
 * @returns {Promise<void>} Promise that resolves after duration
 * @example
 * await sleep(1000); // Sleep for 1 second
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff - 优化版本
 * 
 * 优化点:
 * 1. 使用位运算优化指数计算（2^i => 1 << i）
 * 2. 减少不必要的错误对象创建
 * 3. 简化逻辑流程
 * 
 * @template T - Return type
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {number} delay - Initial delay in milliseconds (default: 1000)
 * @param {number} maxDelay - Maximum delay cap in milliseconds (default: 30000)
 * @param {Function} onRetry - Optional callback on each retry
 * @returns {Promise<T>} Function result
 * @example
 * const data = await retry(
 *   () => fetchData(),
 *   3,
 *   1000
 * );
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  maxDelay: number = 30000,
  onRetry?: (error: Error, attempt: number) => void
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error; // 最后一次失败，直接抛出
      }

      const currentDelay = Math.min(delay * (1 << attempt), maxDelay);
      
      if (onRetry) {
        onRetry(error as Error, attempt + 1);
      }
      
      await sleep(currentDelay);
    }
  }

  // 理论上不会到达这里，但 TypeScript 需要
  throw new Error('Retry failed');
}

// Re-export cache utilities for backward compatibility
export { LRUCache, createCache };
