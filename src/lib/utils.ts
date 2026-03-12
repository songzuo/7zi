/**
 * @fileoverview Utility functions for caching, function composition, and formatting.
 * @module lib/utils
 * 
 * @description
 * This module provides commonly used utility functions including:
 * - In-memory caching with TTL support
 * - Function composition helpers (debounce, throttle, memoize)
 * - Formatting utilities (file size, time ago)
 * - Performance optimization helpers (lazy loading, preloading)
 * - User preference detection (reduced motion, dark mode)
 */

/**
 * Internal cache entry structure.
 * @template T - The type of the cached value
 */
interface CacheEntry<T> {
  /** The cached value */
  value: T;
  /** Timestamp when the entry was created (milliseconds since epoch) */
  timestamp: number;
  /** Time-to-live in milliseconds */
  ttl: number;
}

/**
 * Generic in-memory cache with TTL (Time To Live) support.
 * 
 * @description
 * Provides a simple key-value cache with automatic expiration.
 * Entries are stored in memory and automatically removed when accessed
 * after their TTL has expired.
 * 
 * @template T - The type of values stored in the cache
 * 
 * @example
 * ```typescript
 * const cache = new Cache<string>();
 * cache.set('key', 'value', 60000); // Cache for 60 seconds
 * console.log(cache.get('key')); // 'value'
 * console.log(cache.has('key')); // true
 * ```
 */
class Cache<T> {
  private store: Map<string, CacheEntry<T>> = new Map();

  /**
   * Store a value in the cache with an optional TTL.
   * 
   * @param key - The cache key
   * @param value - The value to cache
   * @param ttl - Time-to-live in milliseconds (default: 5 minutes)
   * 
   * @example
   * ```typescript
   * cache.set('user:123', userData, 300000); // 5 minutes
   * ```
   */
  set(key: string, value: T, ttl: number = 5 * 60 * 1000): void {
    this.store.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Retrieve a value from the cache.
   * Returns null if the key doesn't exist or has expired.
   * 
   * @param key - The cache key
   * @returns The cached value or null if not found/expired
   * 
   * @example
   * ```typescript
   * const value = cache.get('user:123');
   * if (value) {
   *   console.log('Cache hit:', value);
   * }
   * ```
   */
  get(key: string): T | null {
    const entry = this.store.get(key);
    
    if (!entry) {
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Remove a specific entry from the cache.
   * 
   * @param key - The cache key to delete
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all entries from the cache.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Check if a key exists in the cache and hasn't expired.
   * 
   * @param key - The cache key to check
   * @returns true if the key exists and is valid, false otherwise
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.store.delete(key);
      return false;
    }

    return true;
  }
}

/**
 * Global cache instance for application-wide caching.
 * Uses unknown type for flexibility; typed at retrieval via createCache.
 */
const globalCache = new Cache<unknown>();

/**
 * Create a typed cache interface for a specific data type.
 * 
 * @description
 * Factory function that creates a type-safe cache interface.
 * Useful for creating domain-specific caches with consistent TTL.
 * 
 * @template T - The type of values to cache
 * @param ttl - Default time-to-live in milliseconds (default: 5 minutes)
 * @returns A typed cache interface
 * 
 * @example
 * ```typescript
 * // Create a user cache with 10-minute TTL
 * const userCache = createCache<User>(600000);
 * 
 * userCache.set('user:123', { id: '123', name: 'John' });
 * const user = userCache.get('user:123');
 * ```
 */
export function createCache<T>(ttl: number = 5 * 60 * 1000) {
  return {
    set: (key: string, value: T) => globalCache.set(key, value, ttl),
    get: (key: string): T | null => globalCache.get(key) as T | null,
    delete: (key: string) => globalCache.delete(key),
    has: (key: string) => globalCache.has(key),
  };
}

/**
 * Create a debounced version of a function.
 * 
 * @description
 * Returns a debounced function that delays invoking `func` until after
 * `wait` milliseconds have elapsed since the last call. Useful for
 * rate-limiting expensive operations like API calls or DOM updates.
 * 
 * @template T - The function type to debounce
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns A debounced version of the function
 * 
 * @example
 * ```typescript
 * // Debounce search input to avoid excessive API calls
 * const debouncedSearch = debounce((query: string) => {
 *   fetchSearchResults(query);
 * }, 300);
 * 
 * input.addEventListener('input', (e) => {
 *   debouncedSearch(e.target.value);
 * });
 * ```
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };
}

/**
 * Create a throttled version of a function.
 * 
 * @description
 * Returns a throttled function that only invokes `func` at most once
 * per `limit` milliseconds. Useful for rate-limiting functions that
 * fire continuously like scroll or resize handlers.
 * 
 * @template T - The function type to throttle
 * @param func - The function to throttle
 * @param limit - The minimum time between invocations in milliseconds
 * @returns A throttled version of the function
 * 
 * @example
 * ```typescript
 * // Throttle scroll handler to run at most once per 100ms
 * const throttledScroll = throttle(() => {
 *   updateScrollPosition();
 * }, 100);
 * 
 * window.addEventListener('scroll', throttledScroll);
 * ```
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Create a memoized version of a function.
 * 
 * @description
 * Returns a memoized function that caches results based on arguments.
 * Subsequent calls with the same arguments return the cached result
 * instead of recomputing. Useful for expensive pure functions.
 * 
 * @template TArgs - Tuple type of function arguments
 * @template TReturn - The return type of the function
 * @param func - The function to memoize
 * @param resolver - Optional function to generate cache keys from arguments
 * @returns A memoized version of the function
 * 
 * @example
 * ```typescript
 * // Memoize expensive computation
 * const memoizedFib = memoize((n: number): number => {
 *   if (n <= 1) return n;
 *   return memoizedFib(n - 1) + memoizedFib(n - 2);
 * });
 * 
 * // With custom key resolver for object arguments
 * const memoizedFetch = memoize(
 *   (options: RequestOptions) => fetchData(options),
 *   (options) => `${options.method}:${options.url}`
 * );
 * ```
 */
export function memoize<TArgs extends unknown[], TReturn>(
  func: (...args: TArgs) => TReturn,
  resolver?: (...args: TArgs) => string
): (...args: TArgs) => TReturn {
  const cache = new Map<string, TReturn>();

  return (...args: TArgs): TReturn => {
    const key = resolver ? resolver(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = func(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Format a byte size into a human-readable string.
 * 
 * @description
 * Converts a byte count into a readable format with appropriate units
 * (B, KB, MB, GB, TB). Automatically selects the best unit for
 * readability.
 * 
 * @param bytes - The size in bytes
 * @returns A formatted string with size and unit
 * 
 * @example
 * ```typescript
 * formatFileSize(500); // '500.0 B'
 * formatFileSize(1024); // '1.0 KB'
 * formatFileSize(1536000); // '1.5 MB'
 * formatFileSize(1073741824); // '1.0 GB'
 * ```
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Format a date as a relative time string.
 * 
 * @description
 * Converts a date into a human-readable relative time format.
 * Supports Chinese locale output for common time ranges.
 * 
 * @param date - The date to format (Date object or ISO string)
 * @returns A human-readable relative time string
 * 
 * @example
 * ```typescript
 * formatTimeAgo(new Date()); // '刚刚'
 * formatTimeAgo(Date.now() - 30000); // '刚刚' (30 seconds ago)
 * formatTimeAgo(Date.now() - 180000); // '3分钟前'
 * formatTimeAgo(Date.now() - 7200000); // '2小时前'
 * formatTimeAgo(Date.now() - 172800000); // '2天前'
 * ```
 */
export function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  
  return then.toLocaleDateString('zh-CN');
}

/**
 * Generate an optimized image URL for Next.js Image Optimization.
 * 
 * @description
 * Creates a URL for the Next.js image optimization API endpoint.
 * Useful for optimizing external images on-the-fly.
 * 
 * @param url - The original image URL
 * @param width - Desired width in pixels (default: 800)
 * @param quality - Image quality 1-100 (default: 75)
 * @returns The optimized image API URL
 * 
 * @example
 * ```typescript
 * const optimizedUrl = optimizeImageUrl(
 *   'https://example.com/large-image.jpg',
 *   400,
 *   80
 * );
 * // Returns: '/api/image?url=https%3A%2F%2Fexample.com%2Flarge-image.jpg&w=400&q=80'
 * ```
 */
export function optimizeImageUrl(
  url: string,
  width: number = 800,
  quality: number = 75
): string {
  // For external images, use Next.js image optimization
  return `/api/image?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`;
}

/**
 * Preload resources to improve performance.
 * 
 * @description
 * Creates and injects preload link elements into the document head.
 * Useful for preloading critical assets like fonts, images, or scripts.
 * 
 * @param resources - Array of resources to preload
 * @param resources[].href - The resource URL
 * @param resources[].as - The resource type (script, style, image, font, etc.)
 * @param resources[].type - Optional MIME type for the resource
 * 
 * @example
 * ```typescript
 * // Preload critical assets
 * preloadResources([
 *   { href: '/fonts/inter.woff2', as: 'font', type: 'font/woff2' },
 *   { href: '/images/hero.webp', as: 'image' },
 *   { href: '/scripts/critical.js', as: 'script' }
 * ]);
 * ```
 */
export function preloadResources(resources: Array<{ href: string; as?: string; type?: string }>): void {
  if (typeof document === 'undefined') return;

  resources.forEach(({ href, as, type }) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    if (as) link.setAttribute('as', as);
    if (type) link.setAttribute('type', type);
    document.head.appendChild(link);
  });
}

/**
 * Create a lazy-loaded component import function.
 * 
 * @description
 * Wrapper for dynamic component imports. Returns the import function
 * for use with React.lazy or Next.js dynamic imports.
 * 
 * @template T - The component props type
 * @param importFunc - The dynamic import function
 * @returns The same import function for use with lazy loading
 * 
 * @example
 * ```typescript
 * // Use with React.lazy
 * const LazyComponent = React.lazy(
 *   lazyLoadComponent(() => import('./HeavyComponent'))
 * );
 * 
 * // Or with Next.js dynamic
 * const DynamicComponent = dynamic(
 *   lazyLoadComponent(() => import('./HeavyComponent'))
 * );
 * ```
 */
export function lazyLoadComponent<T>(
  importFunc: () => Promise<{ default: React.ComponentType<T> }>
) {
  return importFunc;
}

/**
 * Check if the user prefers reduced motion.
 * 
 * @description
 * Detects the user's motion preference via the prefers-reduced-motion
 * media query. Use this to disable or reduce animations for accessibility.
 * 
 * @returns true if the user prefers reduced motion, false otherwise
 * 
 * @example
 * ```typescript
 * if (!prefersReducedMotion()) {
 *   animateElement(element);
 * }
 * 
 * // Or conditionally apply styles
 * const transition = prefersReducedMotion() ? 'none' : 'all 0.3s ease';
 * ```
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if the user prefers dark mode.
 * 
 * @description
 * Detects the user's color scheme preference via the prefers-color-scheme
 * media query. Use this for initial theme detection.
 * 
 * @returns true if the user prefers dark mode, false otherwise
 * 
 * @example
 * ```typescript
 * const initialTheme = prefersDarkMode() ? 'dark' : 'light';
 * setTheme(initialTheme);
 * 
 * // Listen for changes
 * window.matchMedia('(prefers-color-scheme: dark)')
 *   .addEventListener('change', (e) => {
 *     setTheme(e.matches ? 'dark' : 'light');
 *   });
 * ```
 */
export function prefersDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}