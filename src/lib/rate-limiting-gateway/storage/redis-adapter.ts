/**
 * Redis Storage Adapter for Rate Limiting Gateway
 * 
 * High-performance Redis adapter supporting both standalone and cluster mode.
 * Implements the IStorageAdapter interface.
 * 
 * @version 1.10.0
 */

import Redis, { Cluster } from 'ioredis'
import type { IStorageAdapter, StorageBackend, PipelineCommand } from '../types'
import { StorageError } from '../types'

/**
 * Redis adapter configuration
 */
export interface RedisAdapterConfig {
  /** Redis connection URL */
  url?: string
  /** Redis cluster nodes (for cluster mode) */
  clusterNodes?: Array<{ host: string; port: number }>
  /** Standalone client (use existing connection) */
  client?: Redis
  /** Cluster client (use existing cluster connection) */
  cluster?: Cluster
  /** Key prefix for all rate limit keys */
  keyPrefix?: string
  /** Connection timeout in ms */
  timeout?: number
  /** Max retries for connection */
  maxRetries?: number
  /** Enable offline queue */
  enableOfflineQueue?: boolean
  /** Enable ready check */
  enableReadyCheck?: boolean
}

/**
 * Redis Storage Adapter
 * 
 * Supports both standalone and cluster mode for distributed rate limiting.
 */
export class RedisAdapter implements IStorageAdapter {
  private client: Redis | Cluster
  private keyPrefix: string
  private isCluster: boolean
  private connectionPromise: Promise<void> | null = null

  constructor(config: RedisAdapterConfig = {}) {
    this.keyPrefix = config.keyPrefix ?? 'rl:'

    // Use existing cluster connection
    if (config.cluster) {
      this.client = config.cluster
      this.isCluster = true
      return
    }

    // Use existing standalone connection
    if (config.client) {
      this.client = config.client
      this.isCluster = false
      return
    }

    // Create cluster connection
    if (config.clusterNodes && config.clusterNodes.length > 0) {
      this.client = new Cluster(config.clusterNodes, {
        redisOptions: {
          keyPrefix: this.keyPrefix,
          enableReadyCheck: config.enableReadyCheck ?? false,
          maxRetriesPerRequest: config.maxRetries ?? 3
        },
        scaleReads: 'slave'
      })
      this.isCluster = true
      return
    }

    // Create standalone connection
    const url = config.url ?? process.env.REDIS_URL ?? 'redis://localhost:6379'
    this.client = new Redis(url, {
      keyPrefix: this.keyPrefix,
      enableOfflineQueue: config.enableOfflineQueue ?? true,
      enableReadyCheck: config.enableReadyCheck ?? true,
      maxRetriesPerRequest: config.maxRetries ?? 3,
      connectTimeout: config.timeout ?? 10000,
      lazyConnect: true
    })
    this.isCluster = false
  }

  /**
   * Initialize connection (for lazy connections)
   */
  async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      const client = this.client as Redis

      client.once('ready', () => {
        resolve()
      })

      client.once('error', (err) => {
        reject(new StorageError('Redis connection failed', err))
      })

      // Trigger connection
      if (client.status === 'wait') {
        client.connect().catch(reject)
      }
    })

    return this.connectionPromise
  }

  /**
   * Get a value from Redis
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key)
    } catch (error) {
      throw new StorageError('Redis GET failed', error instanceof Error ? error : undefined)
    }
  }

  /**
   * Set a value in Redis with optional TTL
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.client.setex(key, ttl, value)
      } else {
        await this.client.set(key, value)
      }
    } catch (error) {
      throw new StorageError('Redis SET failed', error instanceof Error ? error : undefined)
    }
  }

  /**
   * Delete a key from Redis
   */
  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key)
      return result > 0
    } catch (error) {
      throw new StorageError('Redis DEL failed', error instanceof Error ? error : undefined)
    }
  }

  /**
   * Increment a value in Redis
   */
  async increment(key: string): Promise<number> {
    try {
      return await this.client.incr(key)
    } catch (error) {
      throw new StorageError('Redis INCR failed', error instanceof Error ? error : undefined)
    }
  }

  /**
   * Add to sorted set
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    try {
      return await this.client.zadd(key, score, member)
    } catch (error) {
      throw new StorageError('Redis ZADD failed', error instanceof Error ? error : undefined)
    }
  }

  /**
   * Remove from sorted set by score range
   */
  async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    try {
      return await this.client.zremrangebyscore(key, min, max)
    } catch (error) {
      throw new StorageError('Redis ZREMRANGEBYSCORE failed', error instanceof Error ? error : undefined)
    }
  }

  /**
   * Get sorted set cardinality
   */
  async zcard(key: string): Promise<number> {
    try {
      return await this.client.zcard(key)
    } catch (error) {
      throw new StorageError('Redis ZCARD failed', error instanceof Error ? error : undefined)
    }
  }

  /**
   * Get sorted set range
   */
  async zrange(key: string, start: number, stop: number, withScores?: boolean): Promise<string[]> {
    try {
      if (withScores) {
        return await this.client.zrange(key, start, stop, 'WITHSCORES')
      }
      return await this.client.zrange(key, start, stop)
    } catch (error) {
      throw new StorageError('Redis ZRANGE failed', error instanceof Error ? error : undefined)
    }
  }

  /**
   * Execute Lua script
   */
  async eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown> {
    try {
      // ioredis uses different eval signature: eval(script, numKeys, ...keys, ...args)
      const numKeys = keys.length
      return await this.client.eval(script, numKeys, ...keys, ...args)
    } catch (error) {
      throw new StorageError('Redis EVAL failed', error instanceof Error ? error : undefined)
    }
  }

  /**
   * Execute pipeline commands
   */
  async pipeline(commands: PipelineCommand[]): Promise<unknown[]> {
    try {
      const pipeline = this.client.pipeline()
      const pipelineMethods = pipeline as unknown as Record<string, (...args: unknown[]) => void>

      for (const { command, args } of commands) {
        pipelineMethods[command](...args)
      }

      const results = await pipeline.exec()

      if (!results) {
        return []
      }

      // ioredis returns [[error, result], ...]
      return results.map(([error, result]) => {
        if (error) {
          throw error
        }
        return result
      })
    } catch (error) {
      throw new StorageError('Redis PIPELINE failed', error instanceof Error ? error : undefined)
    }
  }

  /**
   * Check if Redis is connected
   */
  async isConnected(): Promise<boolean> {
    try {
      const result = await this.client.ping()
      return result === 'PONG'
    } catch {
      return false
    }
  }

  /**
   * Get storage type
   */
  getType(): StorageBackend {
    return this.isCluster ? 'redis-cluster' : 'redis'
  }

  /**
   * Get raw Redis client
   */
  getClient(): Redis | Cluster {
    return this.client
  }

  /**
   * Get key prefix
   */
  getKeyPrefix(): string {
    return this.keyPrefix
  }

  /**
   * Generate full key with prefix
   */
  getFullKey(key: string): string {
    return this.keyPrefix + key
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.quit()
    } catch {
      // Ignore disconnect errors
    }
  }

  /**
   * Get Redis info
   */
  async getInfo(): Promise<Record<string, string>> {
    try {
      const info = await this.client.info()
      const result: Record<string, string> = {}

      info.split('\r\n').forEach(line => {
        const [key, value] = line.split(':')
        if (key && value) {
          result[key] = value
        }
      })

      return result
    } catch {
      return {}
    }
  }

  /**
   * Get memory usage
   */
  async getMemoryUsage(): Promise<{
    usedMemory: number
    totalMemory: number
    fragmentationRatio: number
  }> {
    try {
      const info = await this.getInfo()
      
      return {
        usedMemory: parseInt(info['used_memory'] ?? '0', 10),
        totalMemory: parseInt(info['total_system_memory'] ?? '0', 10),
        fragmentationRatio: parseFloat(info['mem_fragmentation_ratio'] ?? '1')
      }
    } catch {
      return {
        usedMemory: 0,
        totalMemory: 0,
        fragmentationRatio: 1
      }
    }
  }

  /**
   * Scan keys matching pattern
   */
  async scanKeys(pattern: string, count = 100): Promise<string[]> {
    try {
      const keys: string[] = []
      let cursor = '0'

      do {
        const result = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', count)
        cursor = result[0]
        keys.push(...result[1])
      } while (cursor !== '0')

      return keys
    } catch (error) {
      throw new StorageError('Redis SCAN failed', error instanceof Error ? error : undefined)
    }
  }

  /**
   * Delete keys matching pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.scanKeys(pattern)
      
      if (keys.length === 0) {
        return 0
      }

      // Delete in batches of 1000 to avoid blocking
      const batchSize = 1000
      let deleted = 0

      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize)
        deleted += await this.client.del(...batch)
      }

      return deleted
    } catch (error) {
      throw new StorageError('Redis delete pattern failed', error instanceof Error ? error : undefined)
    }
  }
}

/**
 * Create a Redis adapter from environment
 */
export function createRedisAdapterFromEnv(): RedisAdapter {
  const redisUrl = process.env.REDIS_URL
  const redisClusterNodes = process.env.REDIS_CLUSTER_NODES
  const keyPrefix = process.env.RATE_LIMIT_KEY_PREFIX

  // Parse cluster nodes if provided
  let clusterNodes: Array<{ host: string; port: number }> | undefined
  if (redisClusterNodes) {
    clusterNodes = redisClusterNodes.split(',').map(node => {
      const [host, port] = node.trim().split(':')
      return { host, port: parseInt(port, 10) || 6379 }
    })
  }

  return new RedisAdapter({
    url: redisUrl,
    clusterNodes,
    keyPrefix
  })
}

export default RedisAdapter
