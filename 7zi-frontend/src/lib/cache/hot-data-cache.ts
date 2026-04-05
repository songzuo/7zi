/**
 * Hot Data Cache Layer - API 级别响应缓存
 *
 * 提供高性能的 API 响应缓存，支持租户/用户隔离、TTL 自动过期、缓存统计等功能
 */

import { InMemoryStorage, StorageItem } from '../db/storage'

/**
 * 缓存键配置接口
 */
export interface CacheKeyConfig {
  tenantId?: string
  userId?: string
  endpoint: string
  params?: Record<string, unknown>
  version?: string
}

/**
 * 缓存配置接口
 */
export interface CacheConfig {
  ttl: number // 默认 TTL（毫秒）
  maxSize?: number // 最大缓存条目数
  maxMemory?: number // 最大内存使用（字节）
  enableStats?: boolean // 是否启用统计
  enableCompression?: boolean // 是否启用压缩
}

/**
 * 缓存统计接口
 */
export interface CacheStats {
  hits: number
  misses: number
  hitRate: number
  size: number
  memoryUsage: number
  keys: string[]
  topHitKeys: Array<{ key: string; hits: number }>
}

/**
 * 缓存项元数据
 */
interface CacheMetadata {
  hits: number
  lastAccessed: number
  compressed?: boolean
}

/**
 * 热点数据缓存类
 */
export class HotDataCache<T = unknown> {
  private storage: InMemoryStorage<{ value: T; metadata: CacheMetadata }>
  private config: Required<CacheConfig>
  private stats: Map<string, number> = new Map() // 键级命中统计
  private globalHits: number = 0
  private globalMisses: number = 0

  constructor(config: CacheConfig) {
    this.config = {
      ttl: config.ttl,
      maxSize: config.maxSize || 1000,
      maxMemory: config.maxMemory || 100 * 1024 * 1024, // 100MB
      enableStats: config.enableStats ?? true,
      enableCompression: config.enableCompression ?? false,
    }

    this.storage = new InMemoryStorage<{ value: T; metadata: CacheMetadata }>()

    // 定期清理过期项
    setInterval(() => this.cleanup(), 60000) // 每分钟清理一次
  }

  /**
   * 生成缓存键
   */
  private generateKey(config: CacheKeyConfig): string {
    const parts: string[] = []

    if (config.tenantId) {
      parts.push(`tenant:${config.tenantId}`)
    }

    if (config.userId) {
      parts.push(`user:${config.userId}`)
    }

    parts.push(`endpoint:${config.endpoint}`)

    if (config.params) {
      const sortedParams = Object.keys(config.params)
        .sort()
        .map(key => `${key}=${JSON.stringify(config.params![key])}`)
        .join('&')
      parts.push(`params:${sortedParams}`)
    }

    if (config.version) {
      parts.push(`v:${config.version}`)
    }

    return parts.join('|')
  }

  /**
   * 获取缓存值
   */
  get(keyConfig: CacheKeyConfig): T | undefined {
    const key = this.generateKey(keyConfig)
    const item = this.storage.get(key)

    if (!item) {
      this.globalMisses++
      return undefined
    }

    // 更新元数据
    item.metadata.lastAccessed = Date.now()
    item.metadata.hits++

    // 更新键级统计
    if (this.config.enableStats) {
      this.stats.set(key, (this.stats.get(key) || 0) + 1)
    }

    this.globalHits++
    return item.value
  }

  /**
   * 设置缓存值
   */
  set(keyConfig: CacheKeyConfig, value: T, ttl?: number): void {
    const key = this.generateKey(keyConfig)

    // 检查缓存大小限制
    if (this.config.maxSize && this.storage.size() >= this.config.maxSize) {
      this.evictLRU()
    }

    // 检查内存限制
    if (this.config.maxMemory) {
      const currentMemory = this.getMemoryUsage()
      const itemSize = this.estimateItemSize(key, value)

      if (currentMemory + itemSize > this.config.maxMemory) {
        this.evictLRU()
      }
    }

    const metadata: CacheMetadata = {
      hits: 0,
      lastAccessed: Date.now(),
    }

    this.storage.set(key, { value, metadata }, ttl || this.config.ttl)
  }

  /**
   * 删除缓存值
   */
  delete(keyConfig: CacheKeyConfig): boolean {
    const key = this.generateKey(keyConfig)
    const deleted = this.storage.delete(key)

    if (deleted) {
      this.stats.delete(key)
    }

    return deleted
  }

  /**
   * 检查缓存是否存在
   */
  has(keyConfig: CacheKeyConfig): boolean {
    const key = this.generateKey(keyConfig)
    return this.storage.has(key)
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.storage.clear()
    this.stats.clear()
    this.globalHits = 0
    this.globalMisses = 0
  }

  /**
   * 按模式删除缓存
   */
  deleteByPattern(pattern: RegExp): number {
    const keys = this.storage.keys()
    let count = 0

    for (const key of keys) {
      if (pattern.test(key)) {
        this.storage.delete(key)
        this.stats.delete(key)
        count++
      }
    }

    return count
  }

  /**
   * 按租户删除缓存
   */
  deleteByTenant(tenantId: string): number {
    return this.deleteByPattern(new RegExp(`^tenant:${tenantId}\\|`))
  }

  /**
   * 按用户删除缓存
   */
  deleteByUser(userId: string): number {
    return this.deleteByPattern(new RegExp(`\\|user:${userId}\\|`))
  }

  /**
   * 按端点删除缓存
   */
  deleteByEndpoint(endpoint: string): number {
    return this.deleteByPattern(new RegExp(`\\|endpoint:${endpoint}\\|`))
  }

  /**
   * 清理过期项
   */
  cleanup(): number {
    return this.storage.cleanup()
  }

  /**
   * LRU 淘汰策略
   */
  private evictLRU(): void {
    const keys = this.storage.keys()
    if (keys.length === 0) return

    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const key of keys) {
      const item = this.storage.get(key)
      if (item && item.metadata.lastAccessed < oldestTime) {
        oldestTime = item.metadata.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.storage.delete(oldestKey)
      this.stats.delete(oldestKey)
    }
  }

  /**
   * 估算项目大小
   */
  private estimateItemSize(key: string, value: T): number {
    return key.length + JSON.stringify(value).length + 100 // 元数据开销
  }

  /**
   * 获取内存使用量
   */
  private getMemoryUsage(): number {
    const keys = this.storage.keys()
    let total = 0

    for (const key of keys) {
      const item = this.storage.get(key)
      if (item) {
        total += this.estimateItemSize(key, item.value)
      }
    }

    return total
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    const keys = this.storage.keys()
    const totalRequests = this.globalHits + this.globalMisses

    // 获取热门键
    const topHitKeys = Array.from(this.stats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, hits]) => ({ key, hits }))

    return {
      hits: this.globalHits,
      misses: this.globalMisses,
      hitRate: totalRequests > 0 ? this.globalHits / totalRequests : 0,
      size: keys.length,
      memoryUsage: this.getMemoryUsage(),
      keys,
      topHitKeys,
    }
  }

  /**
   * 获取缓存键列表
   */
  getKeys(): string[] {
    return this.storage.keys()
  }

  /**
   * 预热缓存
   */
  warmup(items: Array<{ keyConfig: CacheKeyConfig; value: T; ttl?: number }>): void {
    for (const item of items) {
      this.set(item.keyConfig, item.value, item.ttl)
    }
  }

  /**
   * 批量获取
   */
  getMany(keyConfigs: CacheKeyConfig[]): Map<string, T> {
    const result = new Map<string, T>()

    for (const keyConfig of keyConfigs) {
      const key = this.generateKey(keyConfig)
      const value = this.get(keyConfig)
      if (value !== undefined) {
        result.set(key, value)
      }
    }

    return result
  }

  /**
   * 批量设置
   */
  setMany(items: Array<{ keyConfig: CacheKeyConfig; value: T; ttl?: number }>): void {
    for (const item of items) {
      this.set(item.keyConfig, item.value, item.ttl)
    }
  }

  /**
   * 批量删除
   */
  deleteMany(keyConfigs: CacheKeyConfig[]): number {
    let count = 0

    for (const keyConfig of keyConfigs) {
      if (this.delete(keyConfig)) {
        count++
      }
    }

    return count
  }

  /**
   * 导出缓存数据
   */
  export(): Record<string, { value: T; metadata: CacheMetadata }> {
    const result: Record<string, { value: T; metadata: CacheMetadata }> = {}

    for (const key of this.storage.keys()) {
      const item = this.storage.get(key)
      if (item) {
        result[key] = item
      }
    }

    return result
  }

  /**
   * 导入缓存数据
   */
  import(data: Record<string, { value: T; metadata: CacheMetadata }>): void {
    this.clear()

    for (const [key, item] of Object.entries(data)) {
      this.storage.set(key, item)
    }
  }
}

/**
 * 创建默认的缓存实例
 */
export const createHotDataCache = <T = unknown>(config: CacheConfig): HotDataCache<T> => {
  return new HotDataCache<T>(config)
}

/**
 * 预定义的缓存配置
 */
export const CachePresets = {
  // 短期缓存（5分钟）
  SHORT: { ttl: 5 * 60 * 1000, maxSize: 500, maxMemory: 50 * 1024 * 1024 },

  // 中期缓存（30分钟）
  MEDIUM: { ttl: 30 * 60 * 1000, maxSize: 1000, maxMemory: 100 * 1024 * 1024 },

  // 长期缓存（2小时）
  LONG: { ttl: 2 * 60 * 60 * 1000, maxSize: 2000, maxMemory: 200 * 1024 * 1024 },

  // 静态数据缓存（24小时）
  STATIC: { ttl: 24 * 60 * 60 * 1000, maxSize: 5000, maxMemory: 500 * 1024 * 1024 },
}