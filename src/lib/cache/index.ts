/**
 * Cache utilities
 *
 * @module lib/cache
 */

// L1: In-memory cache
export { LRUCache, createCache } from './lru-cache';
export { L1Cache, createL1Cache } from './l1-cache';
export type { L1CacheOptions, CacheEntry, CacheStats } from './l1-cache';

// L2: Redis cache
export { L2Cache, createL2Cache } from './l2-cache';
export type { L2CacheOptions, L2CacheStats } from './l2-cache';

// Multi-level: L1 + L2
export { MultiLevelCache, createMultiLevelCache } from './multi-level-cache';
export type { MultiLevelCacheOptions, MultiLevelCacheStats } from './multi-level-cache';

// Legacy cache manager
export { CacheManager, getCacheManager, CachePresets } from './CacheManager';
