/**
 * Cache utilities
 *
 * @module lib/cache
 */

export { LRUCache, createCache } from './lru-cache';
export { L1Cache, createL1Cache } from './l1-cache';
export type { L1CacheOptions, CacheEntry, CacheStats } from './l1-cache';
