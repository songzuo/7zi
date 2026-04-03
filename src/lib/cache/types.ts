/**
 * Distributed Cache System - Type Definitions
 * 
 * Enterprise-grade distributed cache with multi-level architecture,
 * multiple eviction strategies, and Redis cluster support.
 * 
 * @module lib/cache/types
 * @version 1.10.0
 */

// ============================================
// Core Types
// ============================================

/**
 * Cache eviction strategy types
 */
export type EvictionStrategy = 'lru' | 'lfu' | 'fifo' | 'ttl' | 'custom'

/**
 * Cache level in multi-tier architecture
 * - L1: Local in-memory cache (fastest, smallest)
 * - L2: Local disk cache (medium speed)
 * - L3: Distributed cache (Redis cluster)
 */
export type CacheLevel = 'L1' | 'L2' | 'L3'

/**
 * Cache entry status
 */
export type CacheEntryStatus = 'active' | 'expired' | 'evicted' | 'pending'

// ============================================
// Cache Entry Types
// ============================================

/**
 * Base cache entry interface
 */
export interface CacheEntry<T = unknown> {
  /** The cached value */
  value: T
  /** Key identifier */
  key: string
  /** Creation timestamp (ms) */
  createdAt: number
  /** Expiration timestamp (ms) */
  expiresAt: number
  /** Last access timestamp (ms) */
  lastAccessedAt: number
  /** Access count for LFU strategy */
  accessCount: number
  /** Current status */
  status: CacheEntryStatus
  /** Cache level where entry is stored */
  level: CacheLevel
  /** Entry size in bytes (approximate) */
  size: number
  /** Custom metadata */
  metadata?: Record<string, unknown>
  /** Tags for group operations */
  tags?: string[]
}

/**
 * Cache entry options when setting values
 */
export interface CacheSetOptions {
  /** Time-to-live in milliseconds */
  ttl?: number
  /** Cache level to store at */
  level?: CacheLevel
  /** Tags for group invalidation */
  tags?: string[]
  /** Custom metadata */
  metadata?: Record<string, unknown>
  /** Skip L1 cache (for large objects) */
  skipL1?: boolean
  /** Force refresh even if exists */
  forceRefresh?: boolean
  /** Compression enabled */
  compress?: boolean
  /** Priority (higher = less likely to evict) */
  priority?: number
}

/**
 * Cache get options
 */
export interface CacheGetOptions {
  /** Update access time on hit */
  updateAccess?: boolean
  /** Accept stale data if valid */
  acceptStale?: boolean
  /** Stale threshold in ms */
  staleThreshold?: number
  /** Fetch from specific level only */
  level?: CacheLevel
}

// ============================================
// Strategy Configuration
// ============================================

/**
 * Base strategy configuration
 */
export interface StrategyConfig {
  /** Strategy type */
  type: EvictionStrategy
  /** Maximum entries */
  maxSize: number
  /** Maximum memory in bytes */
  maxMemory?: number
  /** Default TTL in ms */
  defaultTTL: number
  /** Enable statistics */
  enableStats: boolean
}

/**
 * LRU (Least Recently Used) strategy config
 */
export interface LRUConfig extends StrategyConfig {
  type: 'lru'
  /** Number of entries to evict when full */
  evictCount?: number
}

/**
 * LFU (Least Frequently Used) strategy config
 */
export interface LFUConfig extends StrategyConfig {
  type: 'lfu'
  /** Decay factor for access frequency */
  decayFactor?: number
  /** Minimum access count to be promoted */
  promotionThreshold?: number
}

/**
 * FIFO (First In First Out) strategy config
 */
export interface FIFOConfig extends StrategyConfig {
  type: 'fifo'
  /** Eviction batch size */
  batchSize?: number
}

/**
 * TTL-only strategy config
 */
export interface TTLConfig extends StrategyConfig {
  type: 'ttl'
  /** Cleanup interval in ms */
  cleanupInterval?: number
}

/**
 * Custom strategy config
 */
export interface CustomStrategyConfig extends StrategyConfig {
  type: 'custom'
  /** Custom eviction function */
  evictFn?: (entries: CacheEntry[]) => string[]
}

/**
 * Union of all strategy configs
 */
export type AnyStrategyConfig = LRUConfig | LFUConfig | FIFOConfig | TTLConfig | CustomStrategyConfig

// ============================================
// Multi-Level Cache Configuration
// ============================================

/**
 * L1 (Local Memory) cache configuration
 */
export interface L1Config {
  /** Enable L1 cache */
  enabled: boolean
  /** Maximum entries */
  maxSize: number
  /** Maximum memory in MB */
  maxMemoryMB: number
  /** Default TTL in ms */
  defaultTTL: number
  /** Eviction strategy */
  strategy: EvictionStrategy
  /** Clone objects on get (safer but slower) */
  cloneOnGet: boolean
}

/**
 * L2 (Disk/Local) cache configuration
 */
export interface L2Config {
  /** Enable L2 cache */
  enabled: boolean
  /** Storage path */
  storagePath?: string
  /** Maximum disk size in MB */
  maxDiskMB: number
  /** Default TTL in ms */
  defaultTTL: number
  /** Compression enabled */
  compression: boolean
  /** Compression threshold in bytes */
  compressionThreshold: number
}

/**
 * L3 (Distributed/Redis) cache configuration
 */
export interface L3Config {
  /** Enable L3 cache */
  enabled: boolean
  /** Redis cluster nodes */
  nodes?: RedisNodeConfig[]
  /** Single Redis URL */
  url?: string
  /** Key prefix for namespacing */
  keyPrefix: string
  /** Default TTL in ms */
  defaultTTL: number
  /** Connection timeout in ms */
  connectionTimeout: number
  /** Enable TLS */
  tls?: boolean
  /** Password */
  password?: string
  /** Username */
  username?: string
}

/**
 * Redis cluster node configuration
 */
export interface RedisNodeConfig {
  /** Node host */
  host: string
  /** Node port */
  port: number
  /** Node password (if different) */
  password?: string
}

/**
 * Multi-level cache configuration
 */
export interface MultiLevelCacheConfig {
  /** L1 configuration */
  l1: L1Config
  /** L2 configuration */
  l2: L2Config
  /** L3 configuration */
  l3: L3Config
  /** Enable cache warming on startup */
  warmupEnabled: boolean
  /** Enable read-through (fetch from lower level) */
  readThrough: boolean
  /** Enable write-through (sync to lower levels) */
  writeThrough: boolean
  /** Enable write-behind (async sync) */
  writeBehind: boolean
  /** Write-behind delay in ms */
  writeBehindDelay?: number
}

// ============================================
// Distributed Cache Configuration
// ============================================

/**
 * Consistent hash ring configuration
 */
export interface HashRingConfig {
  /** Number of virtual nodes per server */
  virtualNodes: number
  /** Hash function to use */
  hashFunction?: 'md5' | 'sha1' | 'crc32' | 'murmur'
  /** Replica assignment strategy */
  replicaStrategy: 'uniform' | 'weighted'
}

/**
 * Distributed cache node
 */
export interface CacheNode {
  /** Node identifier */
  id: string
  /** Node address */
  address: string
  /** Node port */
  port: number
  /** Node password (if different) */
  password?: string
  /** Node weight for weighted distribution */
  weight?: number
  /** Node status */
  status: 'online' | 'offline' | 'syncing' | 'error'
  /** Last heartbeat timestamp */
  lastHeartbeat?: number
  /** Current load (0-1) */
  load?: number
}

/**
 * Distributed cache configuration
 */
export interface DistributedCacheConfig {
  /** Cluster name */
  clusterName: string
  /** Cache nodes */
  nodes: CacheNode[]
  /** Hash ring configuration */
  hashRing: HashRingConfig
  /** Enable replication */
  replication: boolean
  /** Replication factor */
  replicationFactor: number
  /** Sync strategy */
  syncStrategy: 'async' | 'sync' | 'eventual'
  /** Node timeout in ms */
  nodeTimeout: number
  /** Heartbeat interval in ms */
  heartbeatInterval: number
}

// ============================================
// Cache Metrics
// ============================================

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total hits */
  hits: number
  /** Total misses */
  misses: number
  /** Hit rate (0-1) */
  hitRate: number
  /** Total entries */
  entries: number
  /** Total memory usage in bytes */
  memoryUsage: number
  /** Average access time in ms */
  avgAccessTime: number
  /** Evictions count */
  evictions: number
  /** Expired entries count */
  expired: number
  /** Errors count */
  errors: number
  /** Last reset timestamp */
  lastReset: number
}

/**
 * Cache level statistics
 */
export interface LevelStats extends CacheStats {
  /** Cache level */
  level: CacheLevel
  /** Level-specific metrics */
  levelMetrics: {
    /** L1: Memory pressure */
    memoryPressure?: number
    /** L2: Disk I/O */
    diskIO?: number
    /** L3: Network latency */
    networkLatency?: number
    /** L3: Reconnection count */
    reconnects?: number
  }
}

/**
 * Distributed cache metrics
 */
export interface DistributedCacheMetrics {
  /** Per-node statistics */
  nodeStats: Map<string, CacheStats>
  /** Cluster-wide statistics */
  clusterStats: CacheStats
  /** Sync lag in ms */
  syncLag: number
  /** Partition events count */
  partitionEvents: number
  /** Leader node */
  leaderNode?: string
  /** Cluster health status */
  clusterHealth: 'healthy' | 'degraded' | 'critical'
}

// ============================================
// Events and Callbacks
// ============================================

/**
 * Cache event types
 */
export type CacheEventType =
  | 'hit'
  | 'miss'
  | 'set'
  | 'delete'
  | 'evict'
  | 'expire'
  | 'clear'
  | 'level-promote'
  | 'level-demote'
  | 'sync-start'
  | 'sync-complete'
  | 'error'

/**
 * Cache event payload
 */
export interface CacheEvent<T = unknown> {
  /** Event type */
  type: CacheEventType
  /** Affected key */
  key?: string
  /** Entry involved */
  entry?: CacheEntry<T>
  /** Cache level */
  level?: CacheLevel
  /** Timestamp */
  timestamp: number
  /** Additional data */
  data?: Record<string, unknown>
  /** Error if applicable */
  error?: Error
}

/**
 * Cache event listener
 */
export type CacheEventListener = (event: CacheEvent) => void | Promise<void>

// ============================================
// Cache Interface
// ============================================

/**
 * Base cache interface
 */
export interface ICache {
  /** Get value by key */
  get<T>(key: string, options?: CacheGetOptions): Promise<T | null>
  /** Set value */
  set<T>(key: string, value: T, options?: CacheSetOptions): Promise<boolean>
  /** Delete entry */
  delete(key: string): Promise<boolean>
  /** Check if key exists */
  has(key: string): Promise<boolean>
  /** Clear all entries */
  clear(): Promise<void>
  /** Get entry metadata */
  getEntry<T>(key: string): Promise<CacheEntry<T> | null>
  /** Get statistics */
  getStats(): CacheStats
  /** Get all keys */
  keys(): Promise<string[]>
  /** Get entries count */
  size(): Promise<number>
}

/**
 * Multi-level cache interface
 */
export interface IMultiLevelCache extends ICache {
  /** Get from specific level */
  getFromLevel<T>(key: string, level: CacheLevel): Promise<T | null>
  /** Set to specific level */
  setToLevel<T>(key: string, value: T, level: CacheLevel, options?: CacheSetOptions): Promise<boolean>
  /** Invalidate across all levels */
  invalidate(key: string): Promise<void>
  /** Invalidate by tag */
  invalidateByTag(tag: string): Promise<void>
  /** Promote entry to higher level */
  promote(key: string): Promise<boolean>
  /** Demote entry to lower level */
  demote(key: string): Promise<boolean>
  /** Get level-specific stats */
  getLevelStats(level: CacheLevel): LevelStats
  /** Warmup cache */
  warmup(keys: string[]): Promise<void>
}

/**
 * Distributed cache interface
 */
export interface IDistributedCache extends IMultiLevelCache {
  /** Add cache node */
  addNode(node: CacheNode): Promise<void>
  /** Remove cache node */
  removeNode(nodeId: string): Promise<void>
  /** Get node responsible for key */
  getNodeForKey(key: string): CacheNode | null
  /** Sync cache across nodes */
  sync(): Promise<void>
  /** Get distributed metrics */
  getDistributedMetrics(): DistributedCacheMetrics
  /** Subscribe to cache events */
  subscribe(listener: CacheEventListener): () => void
}

// ============================================
// Utility Types
// ============================================

/**
 * Cache operation result
 */
export interface CacheResult<T> {
  /** Success flag */
  success: boolean
  /** Retrieved value */
  value?: T
  /** Source level */
  source?: CacheLevel
  /** Error if failed */
  error?: Error
  /** Duration in ms */
  duration: number
}

/**
 * Batch operation result
 */
export interface BatchResult<T> {
  /** Successful operations */
  successful: string[]
  /** Failed operations with errors */
  failed: Array<{ key: string; error: Error }>
  /** Results map */
  results?: Map<string, T>
  /** Total duration in ms */
  duration: number
}

/**
 * Cache warmup configuration
 */
export interface WarmupConfig {
  /** Keys to warmup */
  keys: string[]
  /** Batch size */
  batchSize?: number
  /** Concurrency limit */
  concurrency?: number
  /** Fetch function for missing entries */
  fetchFn?: (key: string) => Promise<unknown>
  /** Callback on progress */
  onProgress?: (loaded: number, total: number) => void
}

/**
 * Cache invalidation rule
 */
export interface InvalidationRule {
  /** Rule name */
  name: string
  /** Key pattern (glob or regex) */
  pattern: string | RegExp
  /** Tags to invalidate */
  tags?: string[]
  /** Invalidation strategy */
  strategy: 'immediate' | 'lazy' | 'scheduled'
  /** Schedule for lazy invalidation (cron) */
  schedule?: string
}

// ============================================
// Constants
// ============================================

/**
 * Default cache configurations
 */
export const DEFAULT_L1_CONFIG: L1Config = {
  enabled: true,
  maxSize: 10000,
  maxMemoryMB: 100,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  strategy: 'lru',
  cloneOnGet: true,
}

export const DEFAULT_L2_CONFIG: L2Config = {
  enabled: false,
  maxDiskMB: 1024, // 1GB
  defaultTTL: 60 * 60 * 1000, // 1 hour
  compression: true,
  compressionThreshold: 1024, // 1KB
}

export const DEFAULT_L3_CONFIG: L3Config = {
  enabled: false,
  keyPrefix: 'cache:',
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  connectionTimeout: 5000,
}

export const DEFAULT_STRATEGY_CONFIG: StrategyConfig = {
  type: 'lru',
  maxSize: 10000,
  defaultTTL: 5 * 60 * 1000,
  enableStats: true,
}

/**
 * Cache level priorities (higher = faster access)
 */
export const LEVEL_PRIORITY: Record<CacheLevel, number> = {
  L1: 3,
  L2: 2,
  L3: 1,
}

/**
 * TTL presets in milliseconds
 */
export const TTL_PRESETS = {
  /** 5 seconds */
  REALTIME: 5 * 1000,
  /** 30 seconds */
  SHORT: 30 * 1000,
  /** 1 minute */
  MEDIUM: 60 * 1000,
  /** 5 minutes */
  LONG: 5 * 60 * 1000,
  /** 1 hour */
  HOUR: 60 * 60 * 1000,
  /** 24 hours */
  DAY: 24 * 60 * 60 * 1000,
  /** 1 week */
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const
