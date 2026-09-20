/**
 * LRU Cache Implementation
 *
 * A thread-safe, efficient LRU (Least Recently Used) cache with TTL support.
 * Combines features from multiple implementations into a unified solution.
 *
 * @module lib/cache/lru-cache
 * @version 1.0.0
 * @author 7zi Team
 * @license MIT
 *
 * @example
 * import { LRUCache, createCache } from '@/lib/cache/lru-cache';
 *
 * const cache = new LRUCache<string>(100);
 * cache.set('key', 'value', 60000); // 1 minute TTL
 * const value = cache.get('key');
 */

/**
 * LRU Cache with TTL support
 *
 * Features:
 * - TTL (Time-To-Live) for automatic expiration
 * - LRU eviction when size limit is reached
 * - O(1) get/set operations using Map
 * - Thread-safe for single-threaded JS environments
 *
 * @template T - Type of cached values
 * @example
 * const cache = new LRUCache<MyType>(100);
 * cache.set('key', value, 60000);
 * const value = cache.get('key');
 */
export class LRUCache<T> {
  private store: Map<string, { value: T; expiresAt: number; lastAccess: number }>
  private maxSize: number

  /**
   * Creates a new LRU cache
   * @param {number} maxSize - Maximum number of entries (default: 100)
   */
  constructor(maxSize: number = 100) {
    this.store = new Map()
    this.maxSize = maxSize
  }

  /**
   * Stores a value in the cache
   * @param {string} key - Cache key
   * @param {T} value - Value to cache
   * @param {number} ttl - Time-to-live in milliseconds (default: 5 minutes)
   */
  set(key: string, value: T, ttl: number = 5 * 60 * 1000): void {
    const now = Date.now()
    const expiresAt = now + ttl

    // Remove oldest entry if at capacity (and not updating existing key)
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      this.evictLRU()
    }

    // For existing key, delete first to update order (Map preserves insertion order)
    if (this.store.has(key)) {
      this.store.delete(key)
    }

    this.store.set(key, {
      value,
      expiresAt,
      lastAccess: now,
    })
  }

  /**
   * Retrieves a value from the cache
   * Updates the last access time for LRU tracking
   * @param {string} key - Cache key
   * @returns {T | null} Cached value or null if not found/expired
   */
  get(key: string): T | null {
    const entry = this.store.get(key)

    if (!entry) {
      return null
    }

    const now = Date.now()

    // Check if expired
    if (now > entry.expiresAt) {
      this.delete(key)
      return null
    }

    // Update last access time (move to end of Map)
    entry.lastAccess = now
    this.store.delete(key)
    this.store.set(key, entry)

    return entry.value
  }

  /**
   * Deletes a specific entry from the cache
   * @param {string} key - Cache key
   */
  delete(key: string): void {
    this.store.delete(key)
  }

  /**
   * Clears all entries from the cache
   */
  clear(): void {
    this.store.clear()
  }

  /**
   * Checks if a key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.store.get(key)
    if (!entry) return false

    const now = Date.now()
    if (now > entry.expiresAt) {
      this.delete(key)
      return false
    }

    return true
  }

  /**
   * Removes the least recently used entry
   * @private
   */
  private evictLRU(): void {
    if (this.store.size === 0) return

    // Map preserves insertion order, so the first key is the LRU
    const lruKey = this.store.keys().next().value
    if (lruKey) {
      this.delete(lruKey)
    }
  }

  /**
   * Gets the current number of entries in the cache
   * @returns {number} Cache size
   */
  get size(): number {
    return this.store.size
  }

  /**
   * Get cache size (method version for internal use)
   * @returns {number} Cache size
   */
  getCacheSize(): number {
    return this.store.size
  }
}

// Global LRU cache instance shared by createCache()
const globalCache = new LRUCache<unknown>(200)

/**
 * Creates a cache instance with a specific TTL
 * Wraps the global cache with a fixed TTL
 *
 * @template T - Type of cached values
 * @param {number} ttl - Time-to-live in milliseconds (default: 5 minutes)
 * @returns {Object} Cache interface with set, get, delete, has methods
 *
 * @example
 * const cache = createCache<MyType>(60000);
 * cache.set('key', value);
 * const value = cache.get('key');
 */
export function createCache<T>(ttl: number = 5 * 60 * 1000) {
  return {
    set: (key: string, value: T) => globalCache.set(key, value, ttl),
    get: (key: string) => globalCache.get(key) as T | null,
    delete: (key: string) => globalCache.delete(key),
    has: (key: string) => globalCache.has(key),
    clear: () => globalCache.clear(),
    get size(): number {
      return globalCache.size
    },
  }
}
