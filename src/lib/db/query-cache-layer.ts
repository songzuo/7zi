/**
 * Database Query Cache Layer
 *
 * Multi-level caching architecture for database queries:
 * - L1: In-memory cache (fastest, limited size)
 * - L2: Redis cache (shared across instances, larger capacity)
 *
 * Features:
 * - Query result caching
 * - Cache invalidation strategies
 * - Hit rate monitoring
 * - Hot data warmup
 * - Automatic expiration
 */

import { getRedisClient, isRedisAvailable } from '@/lib/redis/client'
import { logger } from '@/lib/logger'

// ============================================
// Types
// ============================================

export interface QueryCacheEntry<T = unknown> {
  key: string
  value: T
  timestamp: number
  ttl: number
  hitCount: number
  size: number
  tags?: string[]
}

export interface QueryCacheStats {
  l1: {
    hits: number
    misses: number
    hitRate: number
    entries: number
    totalSize: number
    evictions: number
  }
  l2: {
    hits: number
    misses: number
    hitRate: number
    entries: number
    errors: number
  }
  overall: {
    hits: number
    misses: number
    hitRate: number
    avgResponseTime: number
  }
}

export interface QueryCacheConfig {
  // L1 (Memory) config
  l1MaxSize: number
  l1DefaultTTL: number
  l1MaxMemoryMB: number

  // L2 (Redis) config
  l2Enabled: boolean
  l2DefaultTTL: number
  l2KeyPrefix: string

  // Monitoring
  enableMonitoring: boolean
  monitoringInterval: number

  // Warmup
  warmupEnabled: boolean
  warmupOnStartup: boolean
}

export interface CacheInvalidationRule {
  pattern: string // Glob pattern for cache keys
  tables: string[] // Database tables that trigger invalidation
  tags?: string[] // Tags to invalidate
}

export interface WarmupConfig {
  queries: Array<{
    key: string
    query: () => Promise<unknown>
    priority: number // Higher priority = warmup first
  }>
  batchSize: number
  concurrency: number
}

// ============================================
// L1 Cache (In-Memory)
// ============================================

class L1QueryCache {
  private cache: Map<string, QueryCacheEntry> = new Map()
  private stats = { hits: 0, misses: 0, evictions: 0 }
  private currentMemoryUsage = 0
  private config: Pick<QueryCacheConfig, 'l1MaxSize' | 'l1DefaultTTL' | 'l1MaxMemoryMB'>

  constructor(config: Pick<QueryCacheConfig, 'l1MaxSize' | 'l1DefaultTTL' | 'l1MaxMemoryMB'>) {
    this.config = config
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      return null
    }

    // Check expiration
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.delete(key)
      this.stats.misses++
      return null
    }

    entry.hitCount++
    this.stats.hits++

    // Move to end (LRU)
    this.cache.delete(key)
    this.cache.set(key, entry)

    return entry.value as T
  }

  set<T>(key: string, value: T, ttl?: number): void {
    const entryTTL = ttl ?? this.config.l1DefaultTTL
    const estimatedSize = this.estimateSize(value)

    // Check memory limit
    if (this.currentMemoryUsage + estimatedSize > this.config.l1MaxMemoryMB * 1024 * 1024) {
      this.evictForSize(estimatedSize)
    }

    // Delete old entry if exists
    const oldEntry = this.cache.get(key)
    if (oldEntry) {
      this.currentMemoryUsage -= oldEntry.size
      this.cache.delete(key)
    }

    // Check max entries
    if (this.cache.size >= this.config.l1MaxSize) {
      this.evictLRU()
    }

    const entry: QueryCacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      ttl: entryTTL,
      hitCount: 0,
      size: estimatedSize,
    }

    this.cache.set(key, entry)
    this.currentMemoryUsage += estimatedSize
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (entry) {
      this.currentMemoryUsage -= entry.size
    }
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0, evictions: 0 }
    this.currentMemoryUsage = 0
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      entries: this.cache.size,
      totalSize: this.currentMemoryUsage,
      evictions: this.stats.evictions,
    }
  }

  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  getEntry<T>(key: string): QueryCacheEntry<T> | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.delete(key)
      return null
    }
    return entry as QueryCacheEntry<T>
  }

  cleanExpired(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.delete(key)
        cleaned++
      }
    }

    return cleaned
  }

  private evictLRU(): void {
    const firstKey = this.cache.keys().next().value
    if (firstKey) {
      this.delete(firstKey)
      this.stats.evictions++
    }
  }

  private evictForSize(requiredSize: number): void {
    let freed = 0
    const keys = Array.from(this.cache.keys())

    for (const key of keys) {
      if (freed >= requiredSize) break
      const entry = this.cache.get(key)
      if (entry) {
        freed += entry.size
        this.delete(key)
        this.stats.evictions++
      }
    }
  }

  private estimateSize(value: unknown): number {
    if (value === null || value === undefined) return 8
    if (typeof value === 'boolean') return 8
    if (typeof value === 'number') return 16
    if (typeof value === 'string') return value.length * 2 + 16
    if (Array.isArray(value)) {
      return value.reduce((sum, item) => sum + this.estimateSize(item), 16)
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value).length * 2 + 32
      } catch {
        return 1024
      }
    }
    return 128
  }
}

// ============================================
// L2 Cache (Redis)
// ============================================

class L2QueryCache {
  private stats = { hits: 0, misses: 0, errors: 0 }
  private config: Pick<QueryCacheConfig, 'l2Enabled' | 'l2DefaultTTL' | 'l2KeyPrefix'>

  constructor(config: Pick<QueryCacheConfig, 'l2Enabled' | 'l2DefaultTTL' | 'l2KeyPrefix'>) {
    this.config = config
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.config.l2Enabled) return null

    const redis = getRedisClient()
    if (!redis) return null

    try {
      const redisKey = `${this.config.l2KeyPrefix}:${key}`
      const data = await redis.get(redisKey)

      if (!data) {
        this.stats.misses++
        return null
      }

      const entry = JSON.parse(data) as QueryCacheEntry<T>

      // Check expiration
      if (Date.now() > entry.timestamp + entry.ttl) {
        await this.delete(key)
        this.stats.misses++
        return null
      }

      entry.hitCount++
      this.stats.hits++

      return entry.value
    } catch (error) {
      this.stats.errors++
      logger.error('[L2QueryCache] Get failed', { error, key })
      return null
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    if (!this.config.l2Enabled) return false

    const redis = getRedisClient()
    if (!redis) return false

    try {
      const redisKey = `${this.config.l2KeyPrefix}:${key}`
      const entryTTL = ttl ?? this.config.l2DefaultTTL

      const entry: QueryCacheEntry<T> = {
        key,
        value,
        timestamp: Date.now(),
        ttl: entryTTL,
        hitCount: 0,
        size: 0, // Not tracked in Redis
      }

      const data = JSON.stringify(entry)
      await redis.setex(redisKey, Math.ceil(entryTTL / 1000), data)

      return true
    } catch (error) {
      this.stats.errors++
      logger.error('[L2QueryCache] Set failed', { error, key })
      return false
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.config.l2Enabled) return false

    const redis = getRedisClient()
    if (!redis) return false

    try {
      const redisKey = `${this.config.l2KeyPrefix}:${key}`
      await redis.del(redisKey)
      return true
    } catch (error) {
      this.stats.errors++
      logger.error('[L2QueryCache] Delete failed', { error, key })
      return false
    }
  }

  async clear(): Promise<void> {
    if (!this.config.l2Enabled) return

    const redis = getRedisClient()
    if (!redis) return

    try {
      const pattern = `${this.config.l2KeyPrefix}:*`
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
      this.stats = { hits: 0, misses: 0, errors: 0 }
    } catch (error) {
      logger.error('[L2QueryCache] Clear failed', { error })
    }
  }

  async getEntriesCount(): Promise<number> {
    if (!this.config.l2Enabled) return 0

    const redis = getRedisClient()
    if (!redis) return 0

    try {
      const pattern = `${this.config.l2KeyPrefix}:*`
      const keys = await redis.keys(pattern)
      return keys.length
    } catch (error) {
      logger.error('[L2QueryCache] Get entries count failed', { error })
      return 0
    }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      entries: 0, // Would need to query Redis
      errors: this.stats.errors,
    }
  }

  async invalidateByPattern(pattern: string): Promise<number> {
    if (!this.config.l2Enabled) return 0

    const redis = getRedisClient()
    if (!redis) return 0

    try {
      const redisPattern = `${this.config.l2KeyPrefix}:${pattern}`
      const keys = await redis.keys(redisPattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
      return keys.length
    } catch (error) {
      logger.error('[L2QueryCache] Invalidate by pattern failed', { error, pattern })
      return 0
    }
  }
}

// ============================================
// Query Cache Manager
// ============================================

export class QueryCacheManager {
  private l1: L1QueryCache
  private l2: L2QueryCache
  private config: QueryCacheConfig
  private invalidationRules: CacheInvalidationRule[] = []
  private responseTimes: number[] = []
  private monitoringInterval?: NodeJS.Timeout

  constructor(config: Partial<QueryCacheConfig> = {}) {
    this.config = {
      l1MaxSize: 1000,
      l1DefaultTTL: 5 * 60 * 1000, // 5 minutes
      l1MaxMemoryMB: 50,
      l2Enabled: true,
      l2DefaultTTL: 10 * 60 * 1000, // 10 minutes
      l2KeyPrefix: 'db:query',
      enableMonitoring: true,
      monitoringInterval: 60 * 1000, // 1 minute
      warmupEnabled: true,
      warmupOnStartup: false,
      ...config,
    }

    this.l1 = new L1QueryCache({
      l1MaxSize: this.config.l1MaxSize,
      l1DefaultTTL: this.config.l1DefaultTTL,
      l1MaxMemoryMB: this.config.l1MaxMemoryMB,
    })

    this.l2 = new L2QueryCache({
      l2Enabled: this.config.l2Enabled,
      l2DefaultTTL: this.config.l2DefaultTTL,
      l2KeyPrefix: this.config.l2KeyPrefix,
    })

    if (this.config.enableMonitoring) {
      this.startMonitoring()
    }
  }

  /**
   * Get cached query result
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now()

    // Try L1 first
    let value = this.l1.get<T>(key)
    if (value !== null) {
      this.recordResponseTime(Date.now() - startTime)
      return value
    }

    // Try L2
    value = await this.l2.get<T>(key)
    if (value !== null) {
      // Promote to L1
      this.l1.set(key, value)
      this.recordResponseTime(Date.now() - startTime)
      return value
    }

    this.recordResponseTime(Date.now() - startTime)
    return null
  }

  /**
   * Set query result in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Set in L1
    this.l1.set(key, value, ttl)

    // Set in L2 (write-through)
    await this.l2.set(key, value, ttl)
  }

  /**
   * Delete cached query result
   */
  async delete(key: string): Promise<void> {
    this.l1.delete(key)
    await this.l2.delete(key)
  }

  /**
   * Clear all cached query results
   */
  async clear(): Promise<void> {
    this.l1.clear()
    await this.l2.clear()
  }

  /**
   * Get or set pattern (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Execute query
    const result = await queryFn()

    // Cache result
    await this.set(key, result, ttl)

    return result
  }

  /**
   * Get cache statistics
   */
  getStats(): QueryCacheStats {
    const l1Stats = this.l1.getStats()
    const l2Stats = this.l2.getStats()

    const overallHits = l1Stats.hits + l2Stats.hits
    const overallMisses = l1Stats.misses + l2Stats.misses
    const overallTotal = overallHits + overallMisses

    return {
      l1: l1Stats,
      l2: l2Stats,
      overall: {
        hits: overallHits,
        misses: overallMisses,
        hitRate: overallTotal > 0 ? overallHits / overallTotal : 0,
        avgResponseTime: this.getAverageResponseTime(),
      },
    }
  }

  /**
   * Add cache invalidation rule
   */
  addInvalidationRule(rule: CacheInvalidationRule): void {
    this.invalidationRules.push(rule)
  }

  /**
   * Invalidate cache by table change
   */
  async invalidateByTable(tableName: string): Promise<number> {
    let invalidated = 0

    for (const rule of this.invalidationRules) {
      if (rule.tables.includes(tableName)) {
        // Invalidate by pattern in L1
        const l1Keys = this.l1.keys()
        for (const key of l1Keys) {
          if (this.matchPattern(key, rule.pattern)) {
            this.l1.delete(key)
            invalidated++
          }
        }

        // Invalidate by pattern in L2
        invalidated += await this.l2.invalidateByPattern(rule.pattern)
      }
    }

    logger.info(`[QueryCache] Invalidated ${invalidated} entries for table: ${tableName}`)
    return invalidated
  }

  /**
   * Invalidate cache by tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    let invalidated = 0

    // L1: Find entries with matching tags
    const l1Keys = this.l1.keys()
    for (const key of l1Keys) {
      const entry = this.l1.get<unknown>(key)
      if (entry && this.l1.getEntry?.(key)?.tags?.includes(tag)) {
        this.l1.delete(key)
        invalidated++
      }
    }

    // L2: Would need to store tags in Redis metadata
    // For now, we'll skip this

    logger.info(`[QueryCache] Invalidated ${invalidated} entries for tag: ${tag}`)
    return invalidated
  }

  /**
   * Warm up cache with hot data
   */
  async warmup(config: WarmupConfig): Promise<void> {
    if (!this.config.warmupEnabled) {
      logger.info('[QueryCache] Warmup is disabled')
      return
    }

    logger.info(`[QueryCache] Starting warmup for ${config.queries.length} queries`)

    // Sort by priority (higher first)
    const sortedQueries = [...config.queries].sort((a, b) => b.priority - a.priority)

    // Process in batches
    const batches = this.chunk(sortedQueries, config.batchSize)
    let loaded = 0

    for (const batch of batches) {
      const promises = batch
        .slice(0, config.concurrency)
        .map(async ({ key, query }) => {
          try {
            const result = await query()
            if (result !== null && result !== undefined) {
              await this.set(key, result)
            }
            loaded++
          } catch (error) {
            logger.error(`[QueryCache] Warmup failed for key: ${key}`, { error })
          }
        })

      await Promise.all(promises)
      logger.info(`[QueryCache] Warmup progress: ${loaded}/${sortedQueries.length}`)
    }

    logger.info(`[QueryCache] Warmup complete: ${loaded}/${sortedQueries.length} loaded`)
  }

  /**
   * Clean expired entries
   */
  async cleanExpired(): Promise<number> {
    const l1Cleaned = this.l1.cleanExpired()
    // L2 handles expiration automatically via TTL
    return l1Cleaned
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      const stats = this.getStats()
      logger.info('[QueryCache] Statistics', {
        category: 'cache',
        data: stats,
      })

      // Clean expired entries
      this.cleanExpired().then(cleaned => {
        if (cleaned > 0) {
          logger.info(`[QueryCache] Cleaned ${cleaned} expired entries`)
        }
      })
    }, this.config.monitoringInterval)
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
    }
  }

  /**
   * Record response time
   */
  private recordResponseTime(time: number): void {
    this.responseTimes.push(time)
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift()
    }
  }

  /**
   * Get average response time
   */
  private getAverageResponseTime(): number {
    if (this.responseTimes.length === 0) return 0
    const sum = this.responseTimes.reduce((a, b) => a + b, 0)
    return sum / this.responseTimes.length
  }

  /**
   * Match glob pattern
   */
  private matchPattern(str: string, pattern: string): boolean {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    )
    return regex.test(str)
  }

  /**
   * Chunk array
   */
  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
}

// ============================================
// Singleton Instance
// ============================================

let queryCacheInstance: QueryCacheManager | null = null

export function getQueryCache(config?: Partial<QueryCacheConfig>): QueryCacheManager {
  if (!queryCacheInstance) {
    queryCacheInstance = new QueryCacheManager(config)
  }
  return queryCacheInstance
}

// ============================================
// Cache Key Generators
// ============================================

export class QueryCacheKeys {
  static agent(agentId: string): string {
    return `agent:${agentId}`
  }

  static agentsList(filters?: Record<string, unknown>): string {
    return `agents:list:${JSON.stringify(filters)}`
  }

  static agentStats(): string {
    return 'stats:agents'
  }

  static wallet(agentId: string): string {
    return `wallet:${agentId}`
  }

  static walletTransactions(agentId: string, options?: Record<string, unknown>): string {
    return `wallet:transactions:${agentId}:${JSON.stringify(options)}`
  }

  static approval(approvalId: string): string {
    return `approval:${approvalId}`
  }

  static approvalList(query?: Record<string, unknown>): string {
    return `approvals:list:${JSON.stringify(query)}`
  }

  static custom(prefix: string, params: Record<string, unknown>): string {
    return `${prefix}:${JSON.stringify(params)}`
  }
}

// ============================================
// Decorators
// ============================================

/**
 * Cache query result decorator
 */
export function CachedQuery(keyPrefix: string, ttl?: number) {
  return function (
    target: unknown,
    propertyName: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      const cache = getQueryCache()
      const key = `${keyPrefix}:${JSON.stringify(args)}`

      return cache.getOrSet(key, () => originalMethod.apply(this, args), ttl)
    }

    return descriptor
  }
}

// ============================================
// Export
// ============================================

export default {
  getQueryCache,
  QueryCacheManager,
  QueryCacheKeys,
  CachedQuery,
}