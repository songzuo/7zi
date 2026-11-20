/**
 * Distributed Cache Module
 * 
 * Exports for distributed caching components.
 * 
 * @module lib/cache/distributed
 */

export { HashRing } from './HashRing'
export { RedisClusterClient } from './RedisClusterClient'
export { 
  DistributedCacheManager, 
  getDistributedCache 
} from './DistributedCacheManager'

// Re-export relevant types
export type {
  CacheNode,
  DistributedCacheConfig,
  DistributedCacheMetrics,
  HashRingConfig,
  L3Config,
  RedisNodeConfig,
} from '../types'
