/**
 * Distributed Cache System
 * 
 * Enterprise-grade distributed cache with multi-level architecture,
 * multiple eviction strategies, and Redis cluster support.
 * 
 * @module lib/cache
 * @version 1.10.0
 * @author 7zi Team
 * @license MIT
 */

// ============================================
// Core Types
// ============================================

export type {
  // Core types
  EvictionStrategy,
  CacheLevel,
  CacheEntryStatus,
  CacheEntry,
  CacheSetOptions,
  CacheGetOptions,
  
  // Strategy configs
  StrategyConfig,
  LRUConfig,
  LFUConfig,
  FIFOConfig,
  TTLConfig,
  CustomStrategyConfig,
  AnyStrategyConfig,
  
  // Multi-level configs
  L1Config,
  L2Config,
  L3Config,
  RedisNodeConfig,
  MultiLevelCacheConfig,
  
  // Distributed configs
  HashRingConfig,
  CacheNode,
  DistributedCacheConfig,
  
  // Metrics
  CacheStats,
  LevelStats,
  DistributedCacheMetrics,
  
  // Events
  CacheEventType,
  CacheEvent,
  CacheEventListener,
  
  // Interfaces
  ICache,
  IMultiLevelCache,
  IDistributedCache,
  
  // Utility types
  CacheResult,
  BatchResult,
  WarmupConfig,
  InvalidationRule,
} from './types'

// Constants
export {
  DEFAULT_L1_CONFIG,
  DEFAULT_L2_CONFIG,
  DEFAULT_L3_CONFIG,
  DEFAULT_STRATEGY_CONFIG,
  LEVEL_PRIORITY,
  TTL_PRESETS,
} from './types'

// ============================================
// Strategies
// ============================================

export {
  // Strategy classes
  LRUStrategy,
  LFUStrategy,
  FIFOStrategy,
  TTLStrategy,
  
  // Strategy factory
  createStrategy,
  
  // Strategy types
  type IEvictionStrategy,
} from './strategies'

// ============================================
// Cache Managers
// ============================================

// Simple LRU Cache
export { LRUCache, createCache } from './lru-cache'

// Simple Cache Manager (for API routes)
export { 
  CacheManager, 
  getCacheManager, 
  CachePresets 
} from './CacheManager'

// Multi-Level Cache
export { 
  MultiLevelCache, 
  getMultiLevelCache 
} from './MultiLevelCache'

// Distributed Cache
export { 
  DistributedCacheManager, 
  getDistributedCache 
} from './distributed/DistributedCacheManager'

// Hash Ring
export { HashRing } from './distributed/HashRing'

// Redis Cluster Client
export { RedisClusterClient } from './distributed/RedisClusterClient'

// ============================================
// Monitoring
// ============================================

export {
  CacheMonitor,
  getCacheMonitor,
  
  // Monitoring types
  type CacheHealthStatus,
  type HealthCheckResult,
  type CacheAlert,
  type AlertRule,
} from './Monitoring'

// ============================================
// Convenience Functions
// ============================================

import { getCacheManager } from './CacheManager'
import { getMultiLevelCache } from './MultiLevelCache'
import { getDistributedCache } from './distributed/DistributedCacheManager'
import { getCacheMonitor } from './Monitoring'

/**
 * Initialize the cache system with configuration
 */
export function initializeCache(options?: {
  enableL1?: boolean
  enableL2?: boolean
  enableL3?: boolean
  distributed?: boolean
  monitoring?: boolean
}): {
  cache: ReturnType<typeof getCacheManager>
  multiLevel: ReturnType<typeof getMultiLevelCache>
  distributed: ReturnType<typeof getDistributedCache>
  monitor: ReturnType<typeof getCacheMonitor>
} {
  const cache = getCacheManager()
  const multiLevel = getMultiLevelCache()
  const distributed = getDistributedCache()
  const monitor = getCacheMonitor()
  
  // Start monitoring if enabled
  if (options?.monitoring !== false) {
    monitor.startMonitoring()
  }
  
  return { cache, multiLevel, distributed, monitor }
}

/**
 * Quick cache operation helper
 */
export const Cache = {
  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const cache = getCacheManager()
    return cache.get<T>(key)
  },
  
  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const cache = getCacheManager()
    cache.set(key, value, ttl)
  },
  
  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    const cache = getCacheManager()
    return cache.delete(key)
  },
  
  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    const cache = getCacheManager()
    const value = await cache.get(key)
    return value !== null
  },
  
  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    const cache = getCacheManager()
    cache.clear()
  },
  
  /**
   * Get cache statistics
   */
  getStats() {
    const cache = getCacheManager()
    return cache.getStats()
  },
  
  /**
   * Get or set pattern
   */
  async getOrSet<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    const cache = getCacheManager()
    return cache.getOrSet(key, fn, ttl)
  },
}

/**
 * Decorator for caching method results
 */
export function Cached(ttl: number = 60000) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    const cache = getCacheManager()
    
    descriptor.value = async function (...args: unknown[]) {
      const key = `${String(propertyKey)}:${JSON.stringify(args)}`
      return cache.getOrSet(key, () => originalMethod.apply(this, args), ttl)
    }
    
    return descriptor
  }
}

// Default export
export default Cache
