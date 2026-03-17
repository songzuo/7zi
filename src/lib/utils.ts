/**
 * 7zi Project Utility Functions
 * 
 * A comprehensive collection of utility functions for common programming tasks,
 * including caching, debouncing, throttling, data manipulation, DOM helpers,
 * and environment detection.
 * 
 * @module lib/utils
 * @version 1.0.0
 * @author 7zi Team
 * @license MIT
 * 
 * @example
 * // Import specific functions
 * import { debounce, deepClone, generateId } from '@/lib/utils';
 * 
 * @example
 * // Import all utilities
 * import * as Utils from '@/lib/utils';
 * 
 * // Use debounce for search input
 * const search = debounce((query: string) => {
 *   console.log('Searching for:', query);
 * }, 300);
 */

/**
 * Cache entry with value, timestamp, and TTL
 * @interface CacheEntry
 * @template T
 */
interface CacheEntry<T> {
  /** Cached value */
  value: T;
  /** Creation timestamp in milliseconds */
  timestamp: number;
  /** Time-to-live in milliseconds */
  ttl: number;
  /** Access timestamp for LRU tracking */
  lastAccess: number;
}

/**
 * LRU Cache with TTL support and size limits
 * @class LRUCache
 * @template T
 */
export class LRUCache<T> {
  private store: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private accessOrder: Map<string, number> = new Map(); // key -> index
  private keyOrder: string[] = [];

  /**
   * Creates a new LRU cache
   * @param {number} maxSize - Maximum number of entries (default: 100)
   */
  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /**
   * Stores a value in the cache
   * @param {string} key - Cache key
   * @param {T} value - Value to cache
   * @param {number} ttl - Time-to-live in milliseconds (default: 5 minutes)
   */
  set(key: string, value: T, ttl: number = 5 * 60 * 1000): void {
    const now = Date.now();

    // Remove oldest entry if at capacity
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      this.evictLRU();
    }

    this.store.set(key, {
      value,
      timestamp: now,
      ttl,
      lastAccess: now,
    });

    // Update access order (O(1) operation)
    this.updateAccessOrder(key);
  }

  /**
   * Retrieves a value from the cache
   * @param {string} key - Cache key
   * @returns {T | null} Cached value or null if not found/expired
   */
  get(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if expired
    if (age > entry.ttl) {
      this.delete(key);
      return null;
    }

    // Update last access time
    entry.lastAccess = now;
    this.updateAccessOrder(key);

    return entry.value;
  }

  /**
   * Deletes a specific entry from the cache
   * @param {string} key - Cache key
   */
  delete(key: string): void {
    this.store.delete(key);
    // O(1) deletion using Map
    const index = this.accessOrder.get(key);
    if (index !== undefined) {
      this.keyOrder.splice(index, 1);
      this.accessOrder.delete(key);
      // Rebuild indices after deletion (O(n) but only happens on delete)
      this.rebuildIndices();
    }
  }

  /**
   * Clears all entries from the cache
   */
  clear(): void {
    this.store.clear();
    this.accessOrder.clear();
    this.keyOrder = [];
  }

  /**
   * Checks if a key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Removes the least recently used entry
   * @private
   */
  private evictLRU(): void {
    if (this.keyOrder.length === 0) return;

    const lruKey = this.keyOrder[0];
    this.delete(lruKey);
  }

  /**
   * Updates the access order for a key (O(1) amortized)
   * @private
   */
  private updateAccessOrder(key: string): void {
    const existingIndex = this.accessOrder.get(key);
    
    if (existingIndex !== undefined) {
      // Move to end: remove from current position, add to end
      this.keyOrder.splice(existingIndex, 1);
    }
    
    // Add to end as most recently used
    this.keyOrder.push(key);
    
    // Update indices (O(n) but only needed when moving existing key)
    this.rebuildIndices();
  }

  /**
   * Rebuilds the index Map for O(1) lookups
   * @private
   */
  private rebuildIndices(): void {
    this.accessOrder.clear();
    this.keyOrder.forEach((key, index) => {
      this.accessOrder.set(key, index);
    });
  }

  /**
   * Gets the current number of entries in the cache
   * @returns {number} Cache size
   */
  get size(): number {
    return this.store.size;
  }
}

// Global LRU cache instance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalCache = new LRUCache<any>(200);

/**
 * Creates a cache with a specific TTL
 * @template T
 * @param {number} ttl - Time-to-live in milliseconds (default: 5 minutes)
 * @returns {Object} Cache interface with set, get, delete, has methods
 */
export function createCache<T>(ttl: number = 5 * 60 * 1000) {
  return {
    set: (key: string, value: T) => globalCache.set(key, value, ttl),
    get: (key: string) => globalCache.get(key) as T | null,
    delete: (key: string) => globalCache.delete(key),
    has: (key: string) => globalCache.has(key),
    clear: () => globalCache.clear(),
    get size(): number {
      return globalCache.size;
    },
  };
}

/**
 * Advanced debounced function with cancel and flush capabilities
 * @template T - Function type
 * @param {T} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Object} Debounced function with additional methods
 * @example
 * const debouncedFn = advancedDebounce(search, 300);
 * debouncedFn('query');
 * debouncedFn.cancel(); // Cancel pending execution
 * debouncedFn.flush(); // Execute immediately
 */
export function advancedDebounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
  pending: () => boolean;
} {
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debounced = (...args: Parameters<T>) => {
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

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    lastArgs = null;
  };

  debounced.flush = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    if (lastArgs) {
      func(...lastArgs);
      lastArgs = null;
    }
  };

  debounced.pending = () => timeout !== null;

  return debounced as any;
}

/**
 * Backward-compatible debounce function
 * @template T - Function type
 * @param {T} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 * @deprecated Use advancedDebounce for better functionality
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  const advanced = advancedDebounce(func, wait);
  return advanced;
}

/**
 * Advanced throttled function with cancel capability
 * @template T - Function type
 * @param {T} func - Function to throttle
 * @param {number} limit - Minimum time between executions in milliseconds
 * @returns {Object} Throttled function with additional methods
 * @example
 * const throttledFn = advancedThrottle(scroll, 100);
 * throttledFn('event');
 * throttledFn.cancel(); // Cancel pending execution
 */
export function advancedThrottle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): {
  (...args: Parameters<T>): void;
  cancel: () => void;
  pending: () => boolean;
} {
  let inThrottle: boolean = false;
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;

  const throttled = (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      lastArgs = null;

      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          func(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  };

  throttled.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    inThrottle = false;
    lastArgs = null;
  };

  throttled.pending = () => inThrottle;

  return throttled as any;
}

/**
 * Backward-compatible throttle function
 * @template T - Function type
 * @param {T} func - Function to throttle
 * @param {number} limit - Minimum time between executions in milliseconds
 * @returns {Function} Throttled function
 * @deprecated Use advancedThrottle for better functionality
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  const advanced = advancedThrottle(func, limit);
  return advanced;
}

/**
 * Memoize function with cache key generator and size limit
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
  const cache = new Map<string, ReturnType<T>>();
  const accessOrder: string[] = [];
  const accessIndex = new Map<string, number>(); // O(1) index lookup

  return (...args: Parameters<T>): ReturnType<T> => {
    const key = resolver ? resolver(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      // Update access order (O(1) using Map for index lookup)
      const currentIndex = accessIndex.get(key);
      if (currentIndex !== undefined) {
        accessOrder.splice(currentIndex, 1);
      }
      accessOrder.push(key);
      
      // Rebuild indices (O(n) but only on cache hit)
      accessIndex.clear();
      accessOrder.forEach((k, i) => accessIndex.set(k, i));
      
      return cache.get(key)!;
    }

    const result = func(...args) as ReturnType<T>;

    // Evict LRU if at capacity
    if (cache.size >= maxSize) {
      const lruKey = accessOrder.shift();
      if (lruKey) {
        cache.delete(lruKey);
        accessIndex.delete(lruKey);
      }
      // Rebuild indices after eviction
      accessIndex.clear();
      accessOrder.forEach((k, i) => accessIndex.set(k, i));
    }

    cache.set(key, result);
    accessOrder.push(key);
    accessIndex.set(key, accessOrder.length - 1);

    return result;
  };
}

/**
 * Deep clone an object, handling circular references
 * @template T - Type of the object to clone
 * @param {T} obj - Object to clone
 * @param {WeakMap} seen - Internal use for circular reference tracking
 * @returns {T} Deep cloned object
 * @example
 * const original = { a: 1, b: { c: 2 } };
 * const cloned = deepClone(original);
 * cloned.b.c = 3; // Does not affect original
 */
export function deepClone<T>(obj: T, seen: WeakMap<object, unknown> = new WeakMap()): T {
  // Handle primitives, null, and undefined
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle Date
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  // Handle RegExp
  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as T;
  }

  // Handle Map
  if (obj instanceof Map) {
    const cloned = new Map();
    obj.forEach((value, key) => {
      cloned.set(deepClone(key, seen), deepClone(value, seen));
    });
    return cloned as T;
  }

  // Handle Set
  if (obj instanceof Set) {
    const cloned = new Set();
    obj.forEach(value => {
      cloned.add(deepClone(value, seen));
    });
    return cloned as T;
  }

  // Handle Array
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item, seen)) as T;
  }

  // Handle circular references
  if (seen.has(obj)) {
    return seen.get(obj) as T;
  }

  // Handle plain objects
  const cloned = {} as T;
  seen.set(obj, cloned);

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      (cloned as any)[key] = deepClone((obj as any)[key], seen);
    }
  }

  return cloned;
}

/**
 * Format file size in human-readable format
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted file size
 * @example
 * formatFileSize(1024) // "1.0 KB"
 * formatFileSize(1048576) // "1.0 MB"
 */
export function formatFileSize(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${units[i]}`;
}

/**
 * Format number with thousands separator
 * @param {number} num - Number to format
 * @param {string} separator - Thousands separator (default: ",")
 * @returns {string} Formatted number
 * @example
 * formatNumber(1000000) // "1,000,000"
 * formatNumber(1000000, ".") // "1.000.000"
 */
export function formatNumber(num: number, separator: string = ','): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/**
 * Generate a unique ID (UUID v4)
 * @param {string} prefix - Optional prefix
 * @returns {string} Unique ID
 * @example
 * generateId() // "550e8400-e29b-41d4-a716-446655440000"
 * generateId('user') // "user-550e8400-e29b-41d4-a716-446655440000"
 */
export function generateId(prefix: string = ''): string {
  // Use crypto.randomUUID if available (modern browsers/Node.js)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return prefix ? `${prefix}-${crypto.randomUUID()}` : crypto.randomUUID();
  }
  
  // Fallback to manual UUID generation
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  return prefix ? `${prefix}-${uuid}` : uuid;
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param {unknown} value - Value to check
 * @returns {boolean} True if value is empty
 * @example
 * isEmpty(null) // true
 * isEmpty('') // true
 * isEmpty([]) // true
 * isEmpty({}) // true
 * isEmpty('hello') // false
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
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
 * Retry a function with exponential backoff
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
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const currentDelay = Math.min(delay * Math.pow(2, i), maxDelay);
        if (onRetry) {
          onRetry(lastError, i + 1);
        }
        await sleep(currentDelay);
      }
    }
  }

  throw lastError;
}

/**
 * Batch array into chunks of specified size
 * @template T - Array item type
 * @param {Array<T>} array - Array to batch
 * @param {number} size - Chunk size
 * @returns {Array<Array<T>>} Batched arrays
 * @example
 * batch([1, 2, 3, 4, 5], 2) // [[1, 2], [3, 4], [5]]
 */
export function batch<T>(array: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    batches.push(array.slice(i, i + size));
  }
  return batches;
}

/**
 * Shuffle array in place
 * @template T - Array item type
 * @param {Array<T>} array - Array to shuffle
 * @returns {Array<T>} Shuffled array
 * @example
 * shuffle([1, 2, 3, 4, 5]) // [3, 1, 5, 2, 4] (random order)
 */
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Get a random item from array
 * @template T - Array item type
 * @param {Array<T>} array - Array to pick from
 * @returns {T} Random item
 * @example
 * randomItem([1, 2, 3]) // 2 (random)
 */
export function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Remove duplicates from array
 * @template T - Array item type
 * @param {Array<T>} array - Array to deduplicate
 * @returns {Array<T>} Array without duplicates
 * @example
 * unique([1, 2, 2, 3, 3, 3]) // [1, 2, 3]
 */
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

/**
 * Group array items by a key function
 * @template T - Array item type
 * @template K - Key type
 * @param {Array<T>} array - Array to group
 * @param {Function} keyFn - Function to extract grouping key
 * @returns {Map<K, Array<T>>} Grouped items
 * @example
 * groupBy(
 *   [{ id: 1, type: 'a' }, { id: 2, type: 'b' }, { id: 3, type: 'a' }],
 *   item => item.type
 * ) // Map { 'a' => [{ id: 1 }, { id: 3 }], 'b' => [{ id: 2 }] }
 */
export function groupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of array) {
    const key = keyFn(item);
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  }
  return groups;
}

/**
 * Pick specified keys from an object
 * @template T - Object type
 * @template K - Key type
 * @param {T} obj - Source object
 * @param {Array<K>} keys - Keys to pick
 * @returns {Pick<T, K>} Object with only specified keys
 * @example
 * pick({ a: 1, b: 2, c: 3 }, ['a', 'c']) // { a: 1, c: 3 }
 */
export function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omit specified keys from an object
 * @template T - Object type
 * @template K - Key type
 * @param {T} obj - Source object
 * @param {Array<K>} keys - Keys to omit
 * @returns {Omit<T, K>} Object without specified keys
 * @example
 * omit({ a: 1, b: 2, c: 3 }, ['b']) // { a: 1, c: 3 }
 */
export function omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

/**
 * Clamp a number between min and max values
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 * @example
 * clamp(5, 0, 10) // 5
 * clamp(-5, 0, 10) // 0
 * clamp(15, 0, 10) // 10
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Map a value from one range to another
 * @param {number} value - Value to map
 * @param {number} inMin - Input range minimum
 * @param {number} inMax - Input range maximum
 * @param {number} outMin - Output range minimum
 * @param {number} outMax - Output range maximum
 * @returns {number} Mapped value
 * @example
 * mapRange(5, 0, 10, 0, 100) // 50
 * mapRange(0.5, 0, 1, 0, 360) // 180
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Linear interpolation between two values
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 * @example
 * lerp(0, 100, 0.5) // 50
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Check if code is running on the client side
 * @returns {boolean} True if running on client
 */
export function isClient(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Check if code is running on the server side
 * @returns {boolean} True if running on server
 */
export function isServer(): boolean {
  return typeof window === 'undefined';
}

/**
 * Check if code is running in a browser
 * @returns {boolean} True if running in a browser
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Check if code is running in a Node.js environment
 * @returns {boolean} True if running in Node.js
 */
export function isNode(): boolean {
  return typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
}

/**
 * Check if an element is in the viewport
 * @param {Element} element - Element to check
 * @param {number} offset - Offset from viewport edges (default: 0)
 * @returns {boolean} True if element is in viewport
 * @example
 * isInViewport(document.getElementById('myElement'))
 */
export function isInViewport(element: Element, offset: number = 0): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= offset &&
    rect.left >= offset &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) - offset &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth) - offset
  );
}

/**
 * Scroll an element into view smoothly
 * @param {Element} element - Element to scroll to
 * @param {boolean} center - Whether to center the element (default: false)
 * @example
 * scrollToElement(document.getElementById('myElement'), true)
 */
export function scrollToElement(element: Element, center: boolean = false): void {
  element.scrollIntoView({
    behavior: 'smooth',
    block: center ? 'center' : 'start',
  });
}

/**
 * Add event listener with automatic cleanup
 * @template T - Event type
 * @param {EventTarget} target - Event target
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @param {AddEventListenerOptions} options - Event listener options
 * @returns {Function} Cleanup function
 * @example
 * const cleanup = addEventListener(window, 'resize', () => console.log('resized'));
 * // Later: cleanup()
 */
export function addEventListener<T extends Event>(
  target: EventTarget,
  event: string,
  handler: (event: T) => void,
  options?: AddEventListenerOptions
): () => void {
  target.addEventListener(event, handler as EventListener, options);
  return () => target.removeEventListener(event, handler as EventListener);
}

/**
 * Get element by ID with type safety
 * @template T - Element type
 * @param {string} id - Element ID
 * @returns {T | null} Element or null if not found
 * @example
 * const button = getElementById<HTMLButtonElement>('myButton');
 */
export function getElementById<T extends Element>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/**
 * Get all elements by selector with type safety
 * @template T - Element type
 * @param {string} selector - CSS selector
 * @returns {NodeList<T>} Elements matching selector
 * @example
 * const buttons = querySelectorAll<HTMLButtonElement>('button.primary');
 */
export function querySelectorAll<T extends Element>(selector: string): NodeList<T> {
  return document.querySelectorAll(selector) as unknown as NodeList<T>;
}

/**
 * Get first element by selector with type safety
 * @template T - Element type
 * @param {string} selector - CSS selector
 * @returns {T | null} First matching element or null
 * @example
 * const button = querySelector<HTMLButtonElement>('button.primary');
 */
export function querySelector<T extends Element>(selector: string): T | null {
  return document.querySelector(selector) as T | null;
}

/**
 * Create a debounced DOM event handler
 * @template T - Event type
 * @param {Function} handler - Event handler
 * @param {number} delay - Debounce delay in milliseconds (default: 100)
 * @returns {Function} Debounced handler
 * @example
 * const handleResize = debounceDOM((e: Event) => console.log(e), 100);
 */
export function debounceDOM<T extends Event>(
  handler: (event: T) => void,
  delay: number = 100
): (event: T) => void {
  return advancedDebounce(handler, delay) as any;
}

/**
 * Create a throttled DOM event handler
 * @template T - Event type
 * @param {Function} handler - Event handler
 * @param {number} limit - Throttle limit in milliseconds (default: 100)
 * @returns {Function} Throttled handler
 * @example
 * const handleScroll = throttleDOM((e: Event) => console.log(e), 100);
 */
export function throttleDOM<T extends Event>(
  handler: (event: T) => void,
  limit: number = 100
): (event: T) => void {
  return advancedThrottle(handler, limit) as any;
}

/**
 * Observe element intersection
 * @param {Element} element - Element to observe
 * @param {Function} callback - Callback when intersection changes
 * @param {IntersectionObserverInit} options - Observer options
 * @returns {Function} Cleanup function
 * @example
 * const cleanup = observeIntersection(
 *   element,
 *   (entries) => console.log(entries)
 * );
 */
export function observeIntersection(
  element: Element,
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
): () => void {
  const observer = new IntersectionObserver(callback, options);
  observer.observe(element);
  return () => observer.disconnect();
}

/**
 * Observe element resize
 * @param {Element} element - Element to observe
 * @param {Function} callback - Callback when size changes
 * @returns {Function} Cleanup function
 * @example
 * const cleanup = observeResize(
 *   element,
 *   (entries) => console.log(entries)
 * );
 */
export function observeResize(
  element: Element,
  callback: (entries: ResizeObserverEntry[]) => void
): () => void {
  if (typeof ResizeObserver === 'undefined') {
    return () => {};
  }

  const observer = new ResizeObserver(callback);
  observer.observe(element);
  return () => observer.disconnect();
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} True if successful
 * @example
 * await copyToClipboard('Hello, world!');
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!isClient()) return false;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      return true;
    } finally {
      document.body.removeChild(textArea);
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Read text from clipboard
 * @returns {Promise<string | null>} Clipboard content or null
 * @example
 * const text = await readFromClipboard();
 */
export async function readFromClipboard(): Promise<string | null> {
  if (!isClient()) return null;

  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      return await navigator.clipboard.readText();
    }
    return null;
  } catch (error) {
    console.error('Failed to read from clipboard:', error);
    return null;
  }
}

/**
 * Download a file from URL
 * @param {string} url - File URL
 * @param {string} filename - Optional filename
 * @example
 * downloadFile('https://example.com/file.pdf', 'document.pdf');
 */
export function downloadFile(url: string, filename?: string): void {
  const link = document.createElement('a');
  link.href = url;
  if (filename) {
    link.download = filename;
  }
  link.click();
  link.remove();
}

/**
 * Get the current query parameters as an object
 * @returns {Record<string, string>} Query parameters
 * @example
 * // URL: ?search=hello&page=1
 * getQueryParams() // { search: "hello", page: "1" }
 */
export function getQueryParams(): Record<string, string> {
  if (!isClient()) return {};

  const params = new URLSearchParams(window.location.search);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

/**
 * Update query parameters in URL
 * @param {Record<string, string | number | boolean | undefined | null>} params - Parameters to update
 * @param {boolean} replace - Whether to replace current history state (default: true)
 * @example
 * updateQueryParams({ search: 'hello', page: 2 });
 */
export function updateQueryParams(
  params: Record<string, string | number | boolean | undefined | null>,
  replace: boolean = true
): void {
  if (!isClient()) return;

  const url = new URL(window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, String(value));
    }
  });

  const method = replace ? 'replaceState' : 'pushState';
  window.history[method]({ path: url.href }, '', url.href);
}

/**
 * Check if user prefers reduced motion
 * @returns {boolean} True if prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if user prefers dark mode
 * @returns {boolean} True if prefers dark mode
 */
export function prefersDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Check if user prefers light mode
 * @returns {boolean} True if prefers light mode
 */
export function prefersLightMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: light)').matches;
}

/**
 * Check if device supports touch
 * @returns {boolean} True if touch device
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - vendor prefixed property
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * Get device type based on user agent
 * @returns {'desktop' | 'tablet' | 'mobile'} Device type
 */
export function getDeviceType(): 'desktop' | 'tablet' | 'mobile' {
  if (typeof window === 'undefined') return 'desktop';

  const ua = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua) && !isMobile;

  if (isTablet) return 'tablet';
  if (isMobile) return 'mobile';
  return 'desktop';
}

/**
 * Get viewport dimensions
 * @returns {Object} Viewport width and height
 */
export function getViewportSize(): { width: number; height: number } {
  if (typeof window === 'undefined') return { width: 0, height: 0 };

  return {
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight,
  };
}

/**
 * Get element's computed style
 * @param {Element} element - Target element
 * @param {string} property - CSS property name
 * @returns {string} Computed style value
 * @example
 * getComputedStyleValue(element, 'color') // "rgb(255, 255, 255)"
 */
export function getComputedStyleValue(element: Element, property: string): string {
  return window.getComputedStyle(element).getPropertyValue(property);
}

/**
 * Add CSS class to element with delay
 * @param {Element} element - Target element
 * @param {string} className - Class name to add
 * @param {number} delay - Delay in milliseconds (default: 0)
 * @returns {Function} Cleanup function
 * @example
 * const cleanup = addClassWithDelay(element, 'active', 100);
 * // Later: cleanup()
 */
export function addClassWithDelay(
  element: Element,
  className: string,
  delay: number = 0
): () => void {
  const timeout = setTimeout(() => {
    element.classList.add(className);
  }, delay);

  return () => {
    clearTimeout(timeout);
    element.classList.remove(className);
  };
}

/**
 * Toggle CSS class on element
 * @param {Element} element - Target element
 * @param {string} className - Class name to toggle
 * @param {boolean} force - Optional force state
 * @returns {boolean} New class state
 * @example
 * toggleClass(element, 'active', true); // Force add
 * toggleClass(element, 'active'); // Toggle
 */
export function toggleClass(element: Element, className: string, force?: boolean): boolean {
  if (force !== undefined) {
    if (force) {
      element.classList.add(className);
    } else {
      element.classList.remove(className);
    }
    return force;
  }
  return element.classList.toggle(className);
}

/**
 * Check if element has all specified classes
 * @param {Element} element - Target element
 * @param {Array<string>} classNames - Class names to check
 * @returns {boolean} True if element has all classes
 * @example
 * hasAllClasses(element, ['active', 'visible'])
 */
export function hasAllClasses(element: Element, classNames: string[]): boolean {
  return classNames.every(className => element.classList.contains(className));
}

/**
 * Check if element has any of the specified classes
 * @param {Element} element - Target element
 * @param {Array<string>} classNames - Class names to check
 * @returns {boolean} True if element has any class
 * @example
 * hasAnyClass(element, ['active', 'disabled'])
 */
export function hasAnyClass(element: Element, classNames: string[]): boolean {
  return classNames.some(className => element.classList.contains(className));
}

/**
 * Optimize image URL with Next.js Image Optimization
 * @param {string} url - Original image URL
 * @param {number} width - Desired width (default: 800)
 * @param {number} quality - Image quality 1-100 (default: 75)
 * @returns {string} Optimized image URL
 * @example
 * optimizeImageUrl('https://example.com/image.jpg', 1200, 85)
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
 * Preload important resources
 * @param {Array<{ href: string; as?: string; type?: string }>} resources - Resources to preload
 * @example
 * preloadResources([
 *   { href: '/styles.css', as: 'style' },
 *   { href: '/app.js', as: 'script' }
 * ])
 */
export function preloadResources(
  resources: Array<{ href: string; as?: string; type?: string }>
): void {
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
 * Lazy load a component
 * @template T - Component props type
 * @param {Function} importFunc - Dynamic import function
 * @returns {Promise<{ default: React.ComponentType<T> }>} Component module
 * @example
 * const LazyComponent = lazyLoadComponent(() => import('./Component'));
 */
export function lazyLoadComponent<T>(
  importFunc: () => Promise<{ default: React.ComponentType<T> }>
) {
  return importFunc;
}

/**
 * Re-export date utilities from dedicated module
 */
export { formatTimeAgo, formatDate, formatDateTime, isToday, isYesterday } from './date';

/**
 * Validate email address
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 * @example
 * isValidEmail('user@example.com') // true
 * isValidEmail('invalid-email') // false
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  // RFC 5322 compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL format
 * @example
 * isValidUrl('https://example.com') // true
 * isValidUrl('not-a-url') // false
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  try {
    const parsed = new URL(url);
    // Must have a protocol (http, https, ftp, etc.)
    return ['http:', 'https:', 'ftp:', 'ftps:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
