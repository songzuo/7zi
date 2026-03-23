/**
 * L1 Memory Cache Implementation
 *
 * High-performance in-memory cache with LRU eviction and TTL support.
 * Designed for high-frequency data like sessions, permissions, and configurations.
 *
 * @module lib/cache/l1-cache
 * @version 1.1.0
 * @author 7zi Team
 * @license MIT
 *
 * @example
 * import { L1Cache } from '@/lib/cache/l1-cache';
 *
 * const cache = new L1Cache<MyType>({ maxSize: 1000, defaultTTL: 60000 });
 * cache.set('key', value);
 * const value = await cache.get('key');
 */

export interface L1CacheOptions {
  /** Maximum number of entries (default: 1000) */
  maxSize?: number;
  /** Default TTL in milliseconds (default: 5 minutes) */
  defaultTTL?: number;
  /** Enable automatic cleanup interval (default: 60 seconds) */
  cleanupInterval?: number;
  /** Enable statistics tracking (default: true) */
  enableStats?: boolean;
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  lastAccess: number;
  accessCount: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  currentSize: number;
  hitRate: number;
}

/**
 * L1 Memory Cache with LRU eviction and TTL support
 *
 * Features:
 * - LRU (Least Recently Used) eviction policy
 * - Configurable TTL (Time-To-Live) per entry
 * - Automatic periodic cleanup of expired entries
 * - Statistics tracking for monitoring
 * - Batch operations support
 * - Async API for non-blocking operations
 * - Memory-efficient using JavaScript Map
 *
 * @template T - Type of cached values
 * @example
 * const cache = new L1Cache<MyType>({ maxSize: 1000, defaultTTL: 60000 });
 * await cache.set('key', value);
 * const value = await cache.get('key');
 */
export class L1Cache<T = unknown> {
  private store: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private defaultTTL: number;
  private cleanupInterval: number | null;
  private stats: CacheStats;

  constructor(options: L1CacheOptions = {}) {
    const {
      maxSize = 1000,
      defaultTTL = 5 * 60 * 1000, // 5 minutes
      cleanupInterval = 60 * 1000, // 60 seconds
      enableStats = true,
    } = options;

    this.store = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.stats = enableStats
      ? {
          hits: 0,
          misses: 0,
          sets: 0,
          deletes: 0,
          evictions: 0,
          currentSize: 0,
          hitRate: 0,
        }
      : {
          hits: 0,
          misses: 0,
          sets: 0,
          deletes: 0,
          evictions: 0,
          currentSize: 0,
          hitRate: 0,
        };

    // Start automatic cleanup if interval is specified
    if (cleanupInterval > 0) {
      // Use global setInterval (works in both Node.js and browser)
      const globalInterval = typeof window !== 'undefined' ? window.setInterval : setInterval;
      this.cleanupInterval = globalInterval?.(() => {
        this.cleanupExpired();
      }, cleanupInterval) as unknown as number;
    } else {
      this.cleanupInterval = null;
    }
  }

  /**
   * Stores a value in the cache (async)
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Optional TTL in milliseconds (uses default if not provided)
   */
  async set(key: string, value: T, ttl?: number): Promise<void> {
    const now = Date.now();
    const expiresAt = now + (ttl ?? this.defaultTTL);

    // Remove oldest entry if at capacity (and not updating existing key)
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      this.evictLRU();
    }

    // For existing key, delete first to update order (Map preserves insertion order)
    if (this.store.has(key)) {
      this.store.delete(key);
    }

    this.store.set(key, {
      value,
      expiresAt,
      lastAccess: now,
      accessCount: 0,
    });

    this.stats.sets++;
    this.updateCurrentSize();
  }

  /**
   * Stores a value in the cache (sync)
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Optional TTL in milliseconds
   */
  setSync(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl ?? this.defaultTTL);

    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      this.evictLRU();
    }

    if (this.store.has(key)) {
      this.store.delete(key);
    }

    this.store.set(key, {
      value,
      expiresAt,
      lastAccess: now,
      accessCount: 0,
    });

    this.stats.sets++;
    this.updateCurrentSize();
  }

  /**
   * Retrieves a value from the cache (async)
   * @param key - Cache key
   * @returns Cached value or null if not found/expired
   */
  async get(key: string): Promise<T | null> {
    const entry = this.store.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    const now = Date.now();

    // Check if expired
    if (now > entry.expiresAt) {
      this.deleteSync(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update last access time (move to end of Map)
    entry.lastAccess = now;
    entry.accessCount++;
    this.store.delete(key);
    this.store.set(key, entry);

    this.stats.hits++;
    this.updateHitRate();
    return entry.value;
  }

  /**
   * Retrieves a value from the cache (sync)
   * @param key - Cache key
   * @returns Cached value or null if not found/expired
   */
  getSync(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    const now = Date.now();

    if (now > entry.expiresAt) {
      this.deleteSync(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    entry.lastAccess = now;
    entry.accessCount++;
    this.store.delete(key);
    this.store.set(key, entry);

    this.stats.hits++;
    this.updateHitRate();
    return entry.value;
  }

  /**
   * Deletes a specific entry from the cache (async)
   * @param key - Cache key
   */
  async delete(key: string): Promise<void> {
    this.deleteSync(key);
  }

  /**
   * Deletes a specific entry from the cache (sync)
   * @param key - Cache key
   */
  deleteSync(key: string): void {
    if (this.store.delete(key)) {
      this.stats.deletes++;
      this.updateCurrentSize();
    }
  }

  /**
   * Clears all entries from the cache (async)
   */
  async clear(): Promise<void> {
    this.clearSync();
  }

  /**
   * Clears all entries from the cache (sync)
   */
  clearSync(): void {
    this.store.clear();
    this.stats.currentSize = 0;
  }

  /**
   * Checks if a key exists and is not expired (async)
   * @param key - Cache key
   * @returns True if key exists and is valid
   */
  async has(key: string): Promise<boolean> {
    return this.hasSync(key);
  }

  /**
   * Checks if a key exists and is not expired (sync)
   * @param key - Cache key
   * @returns True if key exists and is valid
   */
  hasSync(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.deleteSync(key);
      return false;
    }

    return true;
  }

  /**
   * Batch set operation (async)
   * @param entries - Array of [key, value, ttl?] tuples
   */
  async setMany(entries: Array<[string, T, number?]>): Promise<void> {
    await Promise.all(
      entries.map(([key, value, ttl]) => this.set(key, value, ttl))
    );
  }

  /**
   * Batch get operation (async)
   * @param keys - Array of cache keys
   * @returns Map of key to value (only for found/valid entries)
   */
  async getMany(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    const values = await Promise.all(
      keys.map(async (key) => {
        const value = await this.get(key);
        return { key, value };
      })
    );

    for (const { key, value } of values) {
      if (value !== null) {
        results.set(key, value);
      }
    }

    return results;
  }

  /**
   * Batch delete operation (async)
   * @param keys - Array of cache keys to delete
   */
  async deleteMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.delete(key)));
  }

  /**
   * Gets the current number of entries in the cache
   */
  get size(): number {
    return this.store.size;
  }

  /**
   * Gets cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Resets statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      currentSize: this.store.size,
      hitRate: 0,
    };
  }

  /**
   * Cleans up expired entries
   */
  cleanupExpired(): void {
    const now = Date.now();
    let cleaned = 0;

    // Use Array.from for broader TypeScript compatibility
    const entries = Array.from(this.store.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.updateCurrentSize();
    }
  }

  /**
   * Destroys the cache and stops cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval !== null) {
      const globalClearInterval = typeof window !== 'undefined' ? window.clearInterval : clearInterval;
      globalClearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clearSync();
  }

  /**
   * Removes the least recently used entry
   * @private
   */
  private evictLRU(): void {
    if (this.store.size === 0) return;

    // Map preserves insertion order, so the first key is the LRU
    const lruKey = this.store.keys().next().value;
    if (lruKey) {
      this.deleteSync(lruKey);
      this.stats.evictions++;
    }
  }

  /**
   * Updates current size in stats
   * @private
   */
  private updateCurrentSize(): void {
    this.stats.currentSize = this.store.size;
  }

  /**
   * Updates hit rate
   * @private
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

/**
 * Creates an L1 cache instance with default settings
 * @template T - Type of cached values
 * @param options - Cache configuration options
 * @returns L1 cache instance
 */
export function createL1Cache<T = unknown>(options?: L1CacheOptions): L1Cache<T> {
  return new L1Cache<T>(options);
}


