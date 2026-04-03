/**
 * Redis Cluster Client for Distributed Cache
 * 
 * Provides Redis cluster support with automatic failover and reconnection.
 * 
 * @module lib/cache/distributed/RedisClusterClient
 */

import type { RedisNodeConfig, L3Config, CacheStats, CacheEntry } from '../types'
import { logger } from '../../logger'

/**
 * Redis client interface (compatible with ioredis)
 */
interface RedisClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, mode?: string, duration?: number): Promise<'OK' | null>
  del(key: string): Promise<number>
  exists(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<number>
  ttl(key: string): Promise<number>
  keys(pattern: string): Promise<string[]>
  mget(keys: string[]): Promise<(string | null)[]>
  mset(values: Record<string, string>): Promise<'OK'>
  incr(key: string): Promise<number>
  decr(key: string): Promise<number>
  ping(): Promise<'PONG'>
  quit(): Promise<'OK'>
  on(event: string, listener: (...args: any[]) => void): this
  disconnect?: () => void
}

/**
 * Redis connection options
 */
interface RedisOptions {
  host?: string
  port?: number
  password?: string
  username?: string
  db?: number
  keyPrefix?: string
  connectTimeout?: number
  lazyConnect?: boolean
  maxRetriesPerRequest?: number
  retryDelayOnFailover?: number
  enableReadyCheck?: boolean
  tls?: boolean
}

/**
 * Mock Redis client for development
 */
class MockRedisClient implements RedisClient {
  private store: Map<string, { value: string; expiresAt?: number }> = new Map()
  private keyPrefix: string
  
  constructor(options: RedisOptions = {}) {
    this.keyPrefix = options.keyPrefix || ''
  }
  
  async get(key: string): Promise<string | null> {
    const fullKey = this.keyPrefix + key
    const entry = this.store.get(fullKey)
    
    if (!entry) return null
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(fullKey)
      return null
    }
    
    return entry.value
  }
  
  async set(key: string, value: string, mode?: string, duration?: number): Promise<'OK'> {
    const fullKey = this.keyPrefix + key
    const entry: { value: string; expiresAt?: number } = { value }
    
    if (mode === 'EX' && duration) {
      entry.expiresAt = Date.now() + duration * 1000
    } else if (mode === 'PX' && duration) {
      entry.expiresAt = Date.now() + duration
    }
    
    this.store.set(fullKey, entry)
    return 'OK'
  }
  
  async del(key: string): Promise<number> {
    const fullKey = this.keyPrefix + key
    return this.store.delete(fullKey) ? 1 : 0
  }
  
  async exists(key: string): Promise<number> {
    const fullKey = this.keyPrefix + key
    const entry = this.store.get(fullKey)
    
    if (!entry) return 0
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(fullKey)
      return 0
    }
    
    return 1
  }
  
  async expire(key: string, seconds: number): Promise<number> {
    const fullKey = this.keyPrefix + key
    const entry = this.store.get(fullKey)
    
    if (!entry) return 0
    
    entry.expiresAt = Date.now() + seconds * 1000
    return 1
  }
  
  async ttl(key: string): Promise<number> {
    const fullKey = this.keyPrefix + key
    const entry = this.store.get(fullKey)
    
    if (!entry) return -2
    if (!entry.expiresAt) return -1
    
    const ttl = Math.floor((entry.expiresAt - Date.now()) / 1000)
    return ttl > 0 ? ttl : -2
  }
  
  async keys(pattern: string): Promise<string[]> {
    const fullPattern = this.keyPrefix + pattern
    const regex = new RegExp('^' + fullPattern.replace(/\*/g, '.*') + '$')
    
    return Array.from(this.store.keys()).filter(k => regex.test(k))
  }
  
  async mget(keys: string[]): Promise<(string | null)[]> {
    return Promise.all(keys.map(k => this.get(k)))
  }
  
  async mset(values: Record<string, string>): Promise<'OK'> {
    for (const [key, value] of Object.entries(values)) {
      await this.set(key, value)
    }
    return 'OK'
  }
  
  async incr(key: string): Promise<number> {
    const value = await this.get(key)
    const newValue = (parseInt(value || '0', 10) + 1).toString()
    await this.set(key, newValue)
    return parseInt(newValue, 10)
  }
  
  async decr(key: string): Promise<number> {
    const value = await this.get(key)
    const newValue = (parseInt(value || '0', 10) - 1).toString()
    await this.set(key, newValue)
    return parseInt(newValue, 10)
  }
  
  async ping(): Promise<'PONG'> {
    return 'PONG'
  }
  
  async quit(): Promise<'OK'> {
    return 'OK'
  }
  
  on(_event: string, _listener: (...args: any[]) => void): this {
    return this
  }
  
  disconnect(): void {
    this.store.clear()
  }
}

/**
 * Redis Cluster Client
 * Handles connections to Redis cluster with failover support
 */
export class RedisClusterClient {
  private client: RedisClient | null = null
  private config: L3Config
  private connected: boolean = false
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    entries: 0,
    memoryUsage: 0,
    avgAccessTime: 0,
    evictions: 0,
    expired: 0,
    errors: 0,
    lastReset: Date.now(),
  }
  
  constructor(config: L3Config) {
    this.config = config
  }
  
  /**
   * Connect to Redis cluster
   */
  async connect(): Promise<boolean> {
    try {
      // Try to use ioredis if available
      const Redis = await this.loadIORedis()
      
      if (Redis) {
        const RedisClass = Redis.default || Redis
        if (this.config.nodes && this.config.nodes.length > 0) {
          // Cluster mode
          const RedisCluster = (Redis as any).Cluster
          if (RedisCluster) {
            this.client = new RedisCluster(
              this.config.nodes.map(n => ({ host: n.host, port: n.port })),
              {
                redisOptions: {
                  password: this.config.password,
                  keyPrefix: this.config.keyPrefix,
                  connectTimeout: this.config.connectionTimeout,
                  enableReadyCheck: true,
                },
              }
            ) as unknown as RedisClient
          } else {
            // Fallback to single node if Cluster is not available
            const firstNode = this.config.nodes[0]
            this.client = new RedisClass({
              host: firstNode.host,
              port: firstNode.port,
              password: this.config.password,
              keyPrefix: this.config.keyPrefix,
              connectTimeout: this.config.connectionTimeout,
            }) as unknown as RedisClient
          }
        } else if (this.config.url) {
          // Single node mode
          this.client = new RedisClass(this.config.url, {
            password: this.config.password,
            keyPrefix: this.config.keyPrefix,
            connectTimeout: this.config.connectionTimeout,
          }) as unknown as RedisClient
        } else {
          // Default localhost
          this.client = new RedisClass({
            host: 'localhost',
            port: 6379,
            password: this.config.password,
            keyPrefix: this.config.keyPrefix,
            connectTimeout: this.config.connectionTimeout,
          }) as unknown as RedisClient
        }
        
        // Set up event handlers
        this.client.on('error', (err: Error) => {
          logger.error('[RedisCluster] Connection error', { category: 'cache', data: { error: err.message } })
          this.connected = false
          this.stats.errors++
        })
        
        this.client.on('connect', () => {
          logger.info('[RedisCluster] Connected to Redis', { category: 'cache' })
          this.connected = true
          this.reconnectAttempts = 0
        })
        
        this.client.on('close', () => {
          logger.warn('[RedisCluster] Connection closed', { category: 'cache' })
          this.connected = false
        })
      } else {
        // Use mock client
        logger.info('[RedisCluster] Using mock Redis client (development mode)', { category: 'cache' })
        this.client = new MockRedisClient({
          keyPrefix: this.config.keyPrefix,
        })
        this.connected = true
      }
      
      // Test connection
      await this.client.ping()
      this.connected = true
      
      return true
    } catch (error) {
      logger.error('[RedisCluster] Failed to connect', { 
        category: 'cache', 
        data: { error: String(error) } 
      })
      this.connected = false
      return false
    }
  }
  
  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit()
      this.client = null
      this.connected = false
    }
  }
  
  /**
   * Get value by key
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.connected || !this.client) {
      return null
    }
    
    const startTime = Date.now()
    
    try {
      const value = await this.client.get(key)
      
      if (value === null) {
        this.stats.misses++
        return null
      }
      
      this.stats.hits++
      this.updateHitRate()
      this.updateAccessTime(startTime)
      
      return JSON.parse(value) as T
    } catch (error) {
      this.stats.errors++
      logger.error('[RedisCluster] Get error', { category: 'cache', data: { key, error: String(error) } })
      return null
    }
  }
  
  /**
   * Set value with TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    if (!this.connected || !this.client) {
      return false
    }
    
    try {
      const serialized = JSON.stringify(value)
      const ttlMs = ttl || this.config.defaultTTL
      const ttlSeconds = Math.floor(ttlMs / 1000)
      
      await this.client.set(key, serialized, 'EX', ttlSeconds)
      return true
    } catch (error) {
      this.stats.errors++
      logger.error('[RedisCluster] Set error', { category: 'cache', data: { key, error: String(error) } })
      return false
    }
  }
  
  /**
   * Delete key
   */
  async delete(key: string): Promise<boolean> {
    if (!this.connected || !this.client) {
      return false
    }
    
    try {
      const result = await this.client.del(key)
      return result > 0
    } catch (error) {
      this.stats.errors++
      return false
    }
  }
  
  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    if (!this.connected || !this.client) {
      return false
    }
    
    try {
      const result = await this.client.exists(key)
      return result === 1
    } catch (error) {
      return false
    }
  }
  
  /**
   * Get multiple values
   */
  async mget<T>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>()
    
    if (!this.connected || !this.client || keys.length === 0) {
      return result
    }
    
    try {
      const values = await this.client.mget(keys)
      
      for (let i = 0; i < keys.length; i++) {
        const value = values[i]
        if (value !== null) {
          result.set(keys[i], JSON.parse(value) as T)
        }
      }
      
      return result
    } catch (error) {
      this.stats.errors++
      return result
    }
  }
  
  /**
   * Set multiple values
   */
  async mset<T>(entries: Record<string, T>, ttl?: number): Promise<boolean> {
    if (!this.connected || !this.client) {
      return false
    }
    
    try {
      const serialized: Record<string, string> = {}
      
      for (const [key, value] of Object.entries(entries)) {
        serialized[key] = JSON.stringify(value)
      }
      
      await this.client.mset(serialized)
      
      // Set TTL for each key
      if (ttl) {
        const ttlSeconds = Math.floor(ttl / 1000)
        await Promise.all(
          Object.keys(entries).map(key => this.client!.expire(key, ttlSeconds))
        )
      }
      
      return true
    } catch (error) {
      this.stats.errors++
      return false
    }
  }
  
  /**
   * Clear all keys with prefix
   */
  async clear(): Promise<void> {
    if (!this.connected || !this.client) {
      return
    }
    
    try {
      const keys = await this.client.keys('*')
      
      if (keys.length > 0) {
        // Delete in batches
        const batchSize = 100
        for (let i = 0; i < keys.length; i += batchSize) {
          const batch = keys.slice(i, i + batchSize)
          await Promise.all(batch.map(k => this.client!.del(k)))
        }
      }
    } catch (error) {
      this.stats.errors++
    }
  }
  
  /**
   * Get statistics
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }
  
  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.connected
  }
  
  /**
   * Get raw client (for advanced operations)
   */
  getClient(): RedisClient | null {
    return this.client
  }
  
  /**
   * Load ioredis module
   */
  private async loadIORedis(): Promise<any> {
    try {
      const Redis = await import('ioredis')
      return Redis
    } catch {
      return null
    }
  }
  
  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0
  }
  
  /**
   * Update average access time
   */
  private updateAccessTime(startTime: number): void {
    const duration = Date.now() - startTime
    const total = this.stats.hits + this.stats.misses
    this.stats.avgAccessTime = 
      (this.stats.avgAccessTime * (total - 1) + duration) / total
  }
}

// Re-export types
export type { RedisNodeConfig, L3Config, CacheStats }
