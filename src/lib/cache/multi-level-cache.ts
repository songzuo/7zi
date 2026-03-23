/**
 * Multi-Level Cache Manager (L1 + L2)
 *
 * Hierarchical cache with L1 (in-memory) and L2 (Redis) layers.
 * Automatic promotion/demotion, write-through, and read-through strategies.
 *
 * @module lib/cache/multi-level-cache
 * @version 1.0.0
 * @author 7zi Team
 * @license MIT
 *
 * @example
 * import { MultiLevelCache } from '@/lib/cache/multi-level-cache';
 *
 * const cache = new MultiLevelCache({
 *   l1: { maxSize: 1000, defaultTTL: 60000 },
 *   l2: { prefix: 'app', defaultTTL: 3600000 }
 * });
 *
 * await cache.set('key', value);
 * const value = await cache.get('key'); // Returns from L1 if available, else L2
 */

import { L1Cache, type L1CacheOptions } from './l1-cache';
import { L2Cache, type L2CacheOptions } from './l2-cache';
import { logger } from '@/lib/logger';

export interface MultiLevelCacheOptions {
  /** L1 cache configuration */
  l1?: L1CacheOptions;
  /** L2 cache configuration */
  l2?: L2CacheOptions;
  /** Enable L2 fallback when L1 misses (default: true) */
  enableL2?: boolean;
  /** Enable write-through to L2 (default: true) */
  writeThrough?: boolean;
  /** Enable write-back/behind to L2 (default: false) */
  writeBehind?: boolean;
  /** Write-behind delay in milliseconds (default: 1000) */
  writeBehindDelay?: number;
}

export interface MultiLevelCacheStats {
  l1: any;
  l2: any;
  l1Hits: number;
  l2Hits: number;
  misses: number;
  totalHitRate: number;
}

/**
 * Multi-Level Cache Manager
 *
 * Features:
 * - L1 (fast in-memory) + L2 (Redis) hierarchy
 * - Read-through: L1 miss → L2 check
 * - Write-through: Write to both L1 and L2
 * - Write-behind: Write to L1, async to L2
 * - Automatic promotion (L2 → L1 on L1 miss)
 * - Separate TTL management per level
 * - Combined statistics
 *
 * @template T - Type of cached values
 * @example
 * const cache = new MultiLevelCache({
 *   l1: { maxSize: 1000, defaultTTL: 60000 },
 *   l2: { prefix: 'app', defaultTTL: 3600000 }
 * });
 */
export class MultiLevelCache<T = unknown> {
  private l1: L1Cache<T>;
  private l2: L2Cache<T> | null;
  private enableL2: boolean;
  private writeThrough: boolean;
  private writeBehind: boolean;
  private writeBehindDelay: number;
  private writeBehindQueue: Map<string, NodeJS.Timeout>;
  private stats: Omit<MultiLevelCacheStats, 'l1' | 'l2'>;

  constructor(options: MultiLevelCacheOptions = {}) {
    const {
      l1 = {},
      l2 = {},
      enableL2 = true,
      writeThrough = true,
      writeBehind = false,
      writeBehindDelay = 1000,
    } = options;

    this.l1 = new L1Cache<T>(l1);
    this.l2 = enableL2 ? new L2Cache<T>(l2) : null;
    this.enableL2 = enableL2;
    this.writeThrough = writeThrough;
    this.writeBehind = writeBehind;
    this.writeBehindDelay = writeBehindDelay;
    this.writeBehindQueue = new Map();
    this.stats = {
      l1Hits: 0,
      l2Hits: 0,
      misses: 0,
      totalHitRate: 0,
    };
  }

  /**
   * Get value from cache (L1 → L2 fallback)
   */
  async get(key: string): Promise<T | null> {
    // Try L1 first
    const l1Value = await this.l1.get(key);

    if (l1Value !== null) {
      this.stats.l1Hits++;
      this.updateHitRate();
      return l1Value;
    }

    // L1 miss, try L2 if enabled
    if (this.enableL2 && this.l2) {
      const l2Value = await this.l2.get(key);

      if (l2Value !== null) {
        // Promote to L1 (write-through on L2 hit)
        await this.l1.set(key, l2Value);

        this.stats.l2Hits++;
        this.updateHitRate();

        logger.debug(`Cache L2 hit, promoted to L1: ${key}`);

        return l2Value;
      }
    }

    // Miss in both levels
    this.stats.misses++;
    this.updateHitRate();

    return null;
  }

  /**
   * Set value in cache (L1 + L2 based on strategy)
   */
  async set(key: string, value: T, ttl?: { l1?: number; l2?: number }): Promise<void> {
    // Always set in L1
    await this.l1.set(key, value, ttl?.l1);

    // Set in L2 based on strategy
    if (this.enableL2 && this.l2) {
      if (this.writeBehind) {
        // Write-behind: async to L2 with delay
        this.scheduleWriteBehind(key, value, ttl?.l2);
      } else if (this.writeThrough) {
        // Write-through: immediate to L2
        await this.l2.set(key, value, ttl?.l2);
      }
    }
  }

  /**
   * Delete value from cache (both levels)
   */
  async delete(key: string): Promise<void> {
    // Cancel any pending write-behind
    this.cancelWriteBehind(key);

    // Delete from L1
    await this.l1.delete(key);

    // Delete from L2
    if (this.enableL2 && this.l2) {
      await this.l2.delete(key);
    }
  }

  /**
   * Clear all cache entries (both levels)
   */
  async clear(): Promise<void> {
    // Cancel all pending write-behind operations
    this.writeBehindQueue.forEach((timeout) => clearTimeout(timeout));
    this.writeBehindQueue.clear();

    // Clear L1
    this.l1.clear();

    // Clear L2
    if (this.enableL2 && this.l2) {
      await this.l2.clear();
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    // Check L1 first
    const l1Exists = await this.l1.has(key);

    if (l1Exists) {
      return true;
    }

    // Check L2 if enabled
    if (this.enableL2 && this.l2) {
      return await this.l2.exists(key);
    }

    return false;
  }

  /**
   * Get or set pattern with multi-level caching
   */
  async getOrSet(
    key: string,
    fn: () => Promise<T>,
    ttl?: { l1?: number; l2?: number }
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get(key);

    if (cached !== null) {
      return cached;
    }

    // Not in cache, fetch and set
    const data = await fn();

    await this.set(key, data, ttl);

    return data;
  }

  /**
   * Get multiple values
   */
  async mget(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>();

    for (const key of keys) {
      const value = await this.get(key);
      result.set(key, value);
    }

    return result;
  }

  /**
   * Set multiple values
   */
  async mset(entries: Map<string, T>, ttl?: { l1?: number; l2?: number }): Promise<void> {
    // Set in L1
    for (const [key, value] of entries.entries()) {
      await this.l1.set(key, value, ttl?.l1);
    }

    // Set in L2 based on strategy
    if (this.enableL2 && this.l2) {
      if (this.writeBehind) {
        // Write-behind: async each entry
        for (const [key, value] of entries.entries()) {
          this.scheduleWriteBehind(key, value, ttl?.l2);
        }
      } else if (this.writeThrough) {
        // Write-through: immediate batch to L2
        await this.l2.mset(entries, ttl?.l2);
      }
    }
  }

  /**
   * Flush write-behind queue immediately
   */
  async flushWriteBehind(): Promise<void> {
    if (!this.enableL2 || !this.l2) {
      return;
    }

    // Clear all timeouts
    this.writeBehindQueue.forEach((timeout) => clearTimeout(timeout));

    logger.debug(`Flushed ${this.writeBehindQueue.size} write-behind operations`);

    this.writeBehindQueue.clear();
  }

  /**
   * Get combined statistics
   */
  getStats(): MultiLevelCacheStats {
    return {
      l1: this.l1.getStats(),
      l2: this.l2?.getStats(),
      ...this.stats,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.l1.resetStats();
    this.l2?.resetStats();

    this.stats = {
      l1Hits: 0,
      l2Hits: 0,
      misses: 0,
      totalHitRate: 0,
    };
  }

  /**
   * Check if L2 cache is available
   */
  async isL2Available(): Promise<boolean> {
    if (!this.l2) {
      return false;
    }

    return await this.l2.isAvailable();
  }

  /**
   * Schedule write-behind operation
   */
  private scheduleWriteBehind(key: string, value: T, ttl?: number): void {
    // Cancel any existing pending write for this key
    this.cancelWriteBehind(key);

    // Schedule new write-behind
    const timeout = setTimeout(async () => {
      if (this.l2) {
        try {
          await this.l2.set(key, value, ttl);
          logger.debug(`Write-behind completed for key: ${key}`);
        } catch (error) {
          logger.error(`Write-behind failed for key: ${key}`, { error });
        }
      }
      this.writeBehindQueue.delete(key);
    }, this.writeBehindDelay);

    this.writeBehindQueue.set(key, timeout);
  }

  /**
   * Cancel pending write-behind for a key
   */
  private cancelWriteBehind(key: string): void {
    const timeout = this.writeBehindQueue.get(key);

    if (timeout) {
      clearTimeout(timeout);
      this.writeBehindQueue.delete(key);
    }
  }

  /**
   * Update total hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.l1Hits + this.stats.l2Hits + this.stats.misses;
    this.stats.totalHitRate = total === 0 ? 0 : (this.stats.l1Hits + this.stats.l2Hits) / total;
  }

  /**
   * Cleanup on instance destruction
   */
  destroy(): void {
    // Cancel all pending write-behind operations
    this.writeBehindQueue.forEach((timeout) => clearTimeout(timeout));
    this.writeBehindQueue.clear();

    // Destroy L1 cache
    this.l1.destroy();
  }
}

/**
 * Create multi-level cache instance
 */
export function createMultiLevelCache<T = unknown>(
  options?: MultiLevelCacheOptions
): MultiLevelCache<T> {
  return new MultiLevelCache<T>(options);
}
