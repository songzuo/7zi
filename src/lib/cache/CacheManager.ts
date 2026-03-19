/**
 * Simple In-Memory Cache Manager for API Routes
 *
 * Features:
 * - TTL-based expiration
 * - Automatic cleanup
 * - Type-safe storage
 * - Singleton pattern
 */

import { logger } from '../logger';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 60000 = 1 minute)
  key?: string; // Custom cache key (default: auto-generated from args)
}

export class CacheManager {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private stats: CacheStats = { hits: 0, misses: 0, size: 0 };
  private cleanupInterval: NodeJS.Timeout | null = null;
  private cleanupIntervalMs: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.startCleanup();
  }

  /**
   * Get data from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateSize();
      return null;
    }

    this.stats.hits++;
    return entry.data as T;
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, ttl: number = 60000): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      createdAt: now,
      expiresAt: now + ttl,
    };

    this.cache.set(key, entry as CacheEntry<unknown>);
    this.updateSize();
  }

  /**
   * Delete specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
  }

  /**
   * Get or set pattern - returns cached data or executes function to fetch it
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = 60000
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fn();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get hit rate (0-1)
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total === 0 ? 0 : this.stats.hits / total;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    this.updateSize();
    return cleaned;
  }

  /**
   * Update cache size in stats
   */
  private updateSize(): void {
    this.stats.size = this.cache.size;
  }

  /**
   * Start automatic cleanup interval
   */
  private startCleanup(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      const cleaned = this.cleanup();
      if (cleaned > 0) {
        logger.debug(`[CacheManager] Cleaned up ${cleaned} expired entries`, { category: 'cache' });
      }
    }, this.cleanupIntervalMs);
  }

  /**
   * Stop automatic cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Generate cache key from arguments
   */
  static generateKey(prefix: string, ...args: (string | number | boolean)[]): string {
    return `${prefix}:${args.join(':')}`;
  }
}

// Singleton instance
let cacheManagerInstance: CacheManager | null = null;

export function getCacheManager(): CacheManager {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new CacheManager();
  }
  return cacheManagerInstance;
}

/**
 * Cache configuration presets for different use cases
 */
export const CachePresets = {
  // Very short cache for real-time data (5 seconds)
  REALTIME: 5 * 1000,

  // Short cache for frequently changing data (30 seconds)
  SHORT: 30 * 1000,

  // Medium cache for semi-static data (1 minute)
  MEDIUM: 60 * 1000,

  // Long cache for static data (5 minutes)
  LONG: 5 * 60 * 1000,

  // Very long cache for rarely changing data (30 minutes)
  VERY_LONG: 30 * 60 * 1000,
};
