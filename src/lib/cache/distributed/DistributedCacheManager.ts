/**
 * Distributed Cache Manager
 * 
 * Coordinates distributed caching across multiple nodes with Redis cluster support.
 * 
 * @module lib/cache/distributed/DistributedCacheManager
 */

import type {
  CacheNode,
  DistributedCacheConfig,
  DistributedCacheMetrics,
  CacheEventListener,
  CacheEvent,
  CacheSetOptions,
  CacheGetOptions,
  CacheStats,
  CacheEntry,
  CacheResult,
  BatchResult,
  HashRingConfig,
  L3Config,
  ICache,
} from '../types'
import { DEFAULT_L1_CONFIG, DEFAULT_L2_CONFIG, DEFAULT_L3_CONFIG } from '../types'
import { HashRing } from './HashRing'
import { RedisClusterClient } from './RedisClusterClient'
import { MultiLevelCache } from '../MultiLevelCache'
import { logger } from '../../logger'

/**
 * Default hash ring configuration
 */
const DEFAULT_HASH_RING_CONFIG: HashRingConfig = {
  virtualNodes: 150,
  hashFunction: 'murmur',
  replicaStrategy: 'uniform',
}

/**
 * Default distributed cache configuration
 */
const DEFAULT_DISTRIBUTED_CONFIG: DistributedCacheConfig = {
  clusterName: 'default',
  nodes: [],
  hashRing: DEFAULT_HASH_RING_CONFIG,
  replication: false,
  replicationFactor: 2,
  syncStrategy: 'async',
  nodeTimeout: 5000,
  heartbeatInterval: 10000,
}

/**
 * Distributed Cache Manager
 * Manages cache distribution across multiple nodes with consistent hashing
 */
export class DistributedCacheManager implements ICache {
  private distributedConfig: DistributedCacheConfig
  private hashRing: HashRing
  private redisClients: Map<string, RedisClusterClient> = new Map()
  private metrics: DistributedCacheMetrics
  private listeners: Set<CacheEventListener> = new Set()
  private heartbeatInterval: NodeJS.Timeout | null = null
  private localCache: Map<string, { value: unknown; expiresAt: number }> = new Map()
  
  constructor(config: Partial<DistributedCacheConfig> = {}) {
    this.distributedConfig = { ...DEFAULT_DISTRIBUTED_CONFIG, ...config }
    this.hashRing = new HashRing(this.distributedConfig.hashRing)
    
    this.metrics = {
      nodeStats: new Map(),
      clusterStats: this.createEmptyStats(),
      syncLag: 0,
      partitionEvents: 0,
      clusterHealth: 'healthy',
    }
    
    // Initialize nodes
    this.initializeNodes()
    
    // Start heartbeat
    this.startHeartbeat()
  }
  
  /**
   * Add a cache node to the cluster
   */
  async addNode(node: CacheNode): Promise<void> {
    // Add to hash ring
    this.hashRing.addNode(node)
    
    // Create Redis client for this node
    const l3Config: L3Config = {
      enabled: true,
      nodes: [{ host: node.address, port: node.port, password: node.password }],
      keyPrefix: `cache:${this.distributedConfig.clusterName}:`,
      defaultTTL: 5 * 60 * 1000,
      connectionTimeout: this.distributedConfig.nodeTimeout,
      password: node.password,
    }
    
    const client = new RedisClusterClient(l3Config)
    await client.connect()
    
    this.redisClients.set(node.id, client)
    
    logger.info(`[DistributedCache] Added node ${node.id}`, { category: 'cache' })
    
    // Trigger rebalance
    await this.rebalance()
  }
  
  /**
   * Remove a cache node from the cluster
   */
  async removeNode(nodeId: string): Promise<void> {
    // Disconnect client
    const client = this.redisClients.get(nodeId)
    if (client) {
      await client.disconnect()
      this.redisClients.delete(nodeId)
    }
    
    // Remove from hash ring
    this.hashRing.removeNode(nodeId)
    
    logger.info(`[DistributedCache] Removed node ${nodeId}`, { category: 'cache' })
    
    // Trigger rebalance
    await this.rebalance()
  }
  
  /**
   * Get value from distributed cache
   */
  async get<T>(key: string, options?: CacheGetOptions): Promise<T | null> {
    // Try local cache first
    const localEntry = this.localCache.get(key)
    if (localEntry && Date.now() < localEntry.expiresAt) {
      this.emit({ type: 'hit', key, level: 'L1', timestamp: Date.now() })
      return localEntry.value as T
    }
    
    // Find the node responsible for this key
    const node = this.hashRing.getNodeForKey(key)
    if (!node) {
      return null
    }
    
    const client = this.redisClients.get(node.id)
    if (!client || !client.isConnected()) {
      // Try replica nodes if replication is enabled
      if (this.distributedConfig.replication) {
        return this.getFromReplicas<T>(key, options)
      }
      return null
    }
    
    const value = await client.get<T>(key)
    
    if (value !== null) {
      // Promote to local cache
      this.localCache.set(key, {
        value,
        expiresAt: Date.now() + 60000, // 1 minute local TTL
      })
      this.emit({ type: 'hit', key, level: 'L3', timestamp: Date.now() })
    } else {
      this.emit({ type: 'miss', key, timestamp: Date.now() })
    }
    
    return value
  }
  
  /**
   * Set value in distributed cache
   */
  async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<boolean> {
    // Set in local cache
    const ttl = options?.ttl || 60000
    this.localCache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    })
    
    // Find nodes responsible for this key
    const nodes = this.hashRing.getNodesForKey(
      key, 
      this.distributedConfig.replication ? this.distributedConfig.replicationFactor : 1
    )
    
    const promises: Promise<boolean>[] = []
    
    for (const node of nodes) {
      const client = this.redisClients.get(node.id)
      if (client && client.isConnected()) {
        promises.push(client.set(key, value, options?.ttl))
      }
    }
    
    const results = await Promise.allSettled(promises)
    const success = results.every(r => r.status === 'fulfilled' && r.value)
    
    if (success) {
      this.emit({ type: 'set', key, timestamp: Date.now() })
    }
    
    return success
  }
  
  /**
   * Delete value from distributed cache
   */
  async delete(key: string): Promise<boolean> {
    // Delete from local cache
    this.localCache.delete(key)
    
    // Delete from all responsible nodes
    const nodes = this.hashRing.getNodesForKey(key, this.redisClients.size)
    
    const promises: Promise<boolean>[] = []
    
    for (const node of nodes) {
      const client = this.redisClients.get(node.id)
      if (client && client.isConnected()) {
        promises.push(client.delete(key))
      }
    }
    
    await Promise.allSettled(promises)
    
    this.emit({ type: 'delete', key, timestamp: Date.now() })
    return true
  }
  
  /**
   * Batch get operations
   */
  async batchGet<T>(keys: string[]): Promise<BatchResult<T>> {
    const startTime = Date.now()
    const results = new Map<string, T>()
    const successful: string[] = []
    const failed: Array<{ key: string; error: Error }> = []
    
    // Group keys by node
    const keysByNode = this.groupKeysByNode(keys)
    
    for (const [nodeId, nodeKeys] of Array.from(keysByNode.entries())) {
      const client = this.redisClients.get(nodeId)
      if (!client || !client.isConnected()) {
        nodeKeys.forEach(key => {
          failed.push({ key, error: new Error('Node unavailable') })
        })
        continue
      }
      
      try {
        const nodeResults = await client.mget<T>(nodeKeys)
        
        for (const [key, value] of Array.from(nodeResults.entries())) {
          results.set(key, value)
          successful.push(key)
        }
      } catch (error) {
        nodeKeys.forEach(key => {
          failed.push({ key, error: error as Error })
        })
      }
    }
    
    return {
      successful,
      failed,
      results,
      duration: Date.now() - startTime,
    }
  }
  
  /**
   * Batch set operations
   */
  async batchSet<T>(entries: Record<string, T>, ttl?: number): Promise<BatchResult<void>> {
    const startTime = Date.now()
    const successful: string[] = []
    const failed: Array<{ key: string; error: Error }> = []
    
    // Group entries by node
    const entriesByNode = this.groupEntriesByNode(entries)
    
    for (const [nodeId, nodeEntries] of Array.from(entriesByNode.entries())) {
      const client = this.redisClients.get(nodeId)
      if (!client || !client.isConnected()) {
        Object.keys(nodeEntries).forEach(key => {
          failed.push({ key, error: new Error('Node unavailable') })
        })
        continue
      }
      
      try {
        const success = await client.mset(nodeEntries, ttl)
        
        if (success) {
          successful.push(...Object.keys(nodeEntries))
        }
      } catch (error) {
        Object.keys(nodeEntries).forEach(key => {
          failed.push({ key, error: error as Error })
        })
      }
    }
    
    return {
      successful,
      failed,
      duration: Date.now() - startTime,
    }
  }
  
  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key)
    return value !== null
  }
  
  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.localCache.clear()
    
    for (const [, client] of Array.from(this.redisClients.entries())) {
      await client.clear()
    }
    
    this.emit({ type: 'clear', timestamp: Date.now() })
  }
  
  /**
   * Get cache entry
   */
  async getEntry<T>(key: string): Promise<CacheEntry<T> | null> {
    const value = await this.get<T>(key)
    if (value === null) return null
    
    return {
      key,
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + 60000,
      lastAccessedAt: Date.now(),
      accessCount: 1,
      status: 'active',
      level: 'L1',
      size: JSON.stringify(value).length * 2,
    }
  }
  
  /**
   * Get statistics
   */
  getStats(): CacheStats {
    return this.metrics.clusterStats
  }
  
  /**
   * Get all keys
   */
  async keys(): Promise<string[]> {
    return Array.from(this.localCache.keys())
  }
  
  /**
   * Get entries count
   */
  async size(): Promise<number> {
    return this.localCache.size
  }
  
  /**
   * Get node responsible for a key
   */
  getNodeForKey(key: string): CacheNode | null {
    return this.hashRing.getNodeForKey(key)
  }
  
  /**
   * Sync cache across all nodes
   */
  async sync(): Promise<void> {
    this.emit({ type: 'sync-start', timestamp: Date.now() })
    
    const startTime = Date.now()
    
    // For each node, sync with its replicas
    // This is a simplified sync - real implementation would need
    // more sophisticated conflict resolution
    
    logger.info('[DistributedCache] Starting sync', { category: 'cache' })
    
    // Wait for all pending writes
    await new Promise(resolve => setTimeout(resolve, 100))
    
    this.metrics.syncLag = Date.now() - startTime
    
    this.emit({ type: 'sync-complete', timestamp: Date.now() })
  }
  
  /**
   * Get distributed metrics
   */
  getDistributedMetrics(): DistributedCacheMetrics {
    // Update node stats
    for (const [nodeId, client] of Array.from(this.redisClients.entries())) {
      this.metrics.nodeStats.set(nodeId, client.getStats())
    }
    
    // Calculate cluster stats
    this.metrics.clusterStats = this.calculateClusterStats()
    
    // Determine cluster health
    this.metrics.clusterHealth = this.determineClusterHealth()
    
    return {
      ...this.metrics,
      nodeStats: new Map(this.metrics.nodeStats),
    }
  }
  
  /**
   * Subscribe to cache events
   */
  subscribe(listener: CacheEventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  
  /**
   * Shutdown the distributed cache
   */
  async shutdown(): Promise<void> {
    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    
    // Disconnect all Redis clients
    for (const [nodeId, client] of Array.from(this.redisClients.entries())) {
      await client.disconnect()
      logger.info(`[DistributedCache] Disconnected from node ${nodeId}`, { category: 'cache' })
    }
    
    this.redisClients.clear()
  }
  
  // ============================================
  // Private Methods
  // ============================================
  
  private initializeNodes(): void {
    for (const node of this.distributedConfig.nodes) {
      this.hashRing.addNode(node)
    }
  }
  
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.checkNodeHealth()
    }, this.distributedConfig.heartbeatInterval)
  }
  
  private async checkNodeHealth(): Promise<void> {
    for (const [nodeId, client] of Array.from(this.redisClients.entries())) {
      const connected = client.isConnected()
      
      if (!connected) {
        logger.warn(`[DistributedCache] Node ${nodeId} is disconnected`, { category: 'cache' })
        this.metrics.partitionEvents++
      }
    }
  }
  
  private async rebalance(): Promise<void> {
    // Rebalance keys when nodes are added/removed
    // This would involve migrating keys to new responsible nodes
    logger.info('[DistributedCache] Rebalancing cache...', { category: 'cache' })
  }
  
  private async getFromReplicas<T>(key: string, options?: CacheGetOptions): Promise<T | null> {
    const nodes = this.hashRing.getNodesForKey(key, this.distributedConfig.replicationFactor)
    
    for (const node of nodes) {
      const client = this.redisClients.get(node.id)
      if (client && client.isConnected()) {
        const value = await client.get<T>(key)
        if (value !== null) {
          return value
        }
      }
    }
    
    return null
  }
  
  private groupKeysByNode(keys: string[]): Map<string, string[]> {
    const result = new Map<string, string[]>()
    
    for (const key of keys) {
      const node = this.hashRing.getNodeForKey(key)
      if (node) {
        const nodeKeys = result.get(node.id) || []
        nodeKeys.push(key)
        result.set(node.id, nodeKeys)
      }
    }
    
    return result
  }
  
  private groupEntriesByNode<T>(entries: Record<string, T>): Map<string, Record<string, T>> {
    const result = new Map<string, Record<string, T>>()
    
    for (const [key, value] of Object.entries(entries)) {
      const node = this.hashRing.getNodeForKey(key)
      if (node) {
        const nodeEntries = result.get(node.id) || {}
        nodeEntries[key] = value
        result.set(node.id, nodeEntries)
      }
    }
    
    return result
  }
  
  private createEmptyStats(): CacheStats {
    return {
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
  }
  
  private calculateClusterStats(): CacheStats {
    const clusterStats = this.createEmptyStats()
    
    for (const [, nodeStats] of Array.from(this.metrics.nodeStats.entries())) {
      clusterStats.hits += nodeStats.hits
      clusterStats.misses += nodeStats.misses
      clusterStats.entries += nodeStats.entries
      clusterStats.memoryUsage += nodeStats.memoryUsage
      clusterStats.evictions += nodeStats.evictions
      clusterStats.expired += nodeStats.expired
      clusterStats.errors += nodeStats.errors
    }
    
    const total = clusterStats.hits + clusterStats.misses
    clusterStats.hitRate = total > 0 ? clusterStats.hits / total : 0
    
    return clusterStats
  }
  
  private determineClusterHealth(): 'healthy' | 'degraded' | 'critical' {
    const totalNodes = this.redisClients.size
    let healthyNodes = 0
    
    for (const [, client] of Array.from(this.redisClients.entries())) {
      if (client.isConnected()) {
        healthyNodes++
      }
    }
    
    if (totalNodes === 0) return 'critical'
    if (healthyNodes === totalNodes) return 'healthy'
    if (healthyNodes >= Math.ceil(totalNodes * 0.5)) return 'degraded'
    return 'critical'
  }
  
  private emit(event: CacheEvent): void {
    for (const listener of Array.from(this.listeners)) {
      try {
        listener(event)
      } catch (error) {
        logger.error('[DistributedCache] Event listener error', { 
          category: 'cache', 
          data: { error: String(error) } 
        })
      }
    }
  }
}

// Singleton instance
let distributedCacheInstance: DistributedCacheManager | null = null

export function getDistributedCache(
  config?: Partial<DistributedCacheConfig>
): DistributedCacheManager {
  if (!distributedCacheInstance) {
    distributedCacheInstance = new DistributedCacheManager(config)
  }
  return distributedCacheInstance
}

// Re-export types
export type { CacheNode, DistributedCacheConfig, DistributedCacheMetrics }
