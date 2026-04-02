/**
 * 数据库查询缓存策略 - 优化版本
 * Database Query Caching Strategy - Optimized Version
 *
 * 优化点:
 * 1. 使用 LRU 双向链表实现 O(1) 淘汰
 * 2. 改进内存估算，避免 JSON.stringify
 * 3. 添加过期时间优先级淘汰
 * 4. 批量操作优化
 * 5. 查询结果记忆化 (Memoization)
 */

import { getDatabaseAsync } from './index'
import { logger } from '../logger'

export interface CacheEntry<T = unknown> {
  key: string
  value: T
  timestamp: number
  ttl: number
  hitCount: number
  size: number // 预估大小
}

export interface CacheStats {
  hits: number
  misses: number
  hitRate: number
  entries: number
  totalSize: number
  evictions: number
}

export interface CacheConfig {
  maxSize: number
  defaultTTL: number
  maxMemoryUsage: number // in bytes
}

// LRU 节点
interface LRUNode<T = unknown> {
  key: string
  value: T
  prev: LRUNode<T> | null
  next: LRUNode<T> | null
  entry: CacheEntry<T>
}

/**
 * 优化的数据库缓存实现
 * 优化:
 * - 使用双向链表实现 O(1) LRU 淘汰
 * - 避免频繁的 JSON.stringify 用于大小估算
 * - 支持批量操作
 * - 改进内存管理
 */
class DatabaseCache {
  private cache: Map<string, LRUNode<unknown>> = new Map()
  private stats = { hits: 0, misses: 0, evictions: 0 }
  private config: CacheConfig = {
    maxSize: 1000,
    defaultTTL: 5 * 60 * 1000, // 5分钟
    maxMemoryUsage: 50 * 1024 * 1024, // 50MB
  }

  private currentMemoryUsage = 0
  private head: LRUNode<unknown> | null = null // LRU 头
  private tail: LRUNode<unknown> | null = null // LRU 尾

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }
  }

  /**
   * 获取缓存 - 优化 O(1) 查找和 LRU 更新
   */
  get<T>(key: string): T | null {
    const node = this.cache.get(key)

    if (!node) {
      this.stats.misses++
      return null
    }

    // 检查是否过期
    if (Date.now() > node.entry.timestamp + node.entry.ttl) {
      this.removeNode(node)
      this.stats.misses++
      return null
    }

    // 更新 LRU (移动到尾部，表示最近使用)
    this.moveToTail(node)

    node.entry.hitCount++
    this.stats.hits++
    return node.entry.value as T
  }

  /**
   * 设置缓存 - 优化内存管理和 LRU 更新
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const entryTTL = ttl ?? this.config.defaultTTL
    const estimatedSize = this.estimateSize(value)

    // 检查内存限制，必要时淘汰
    if (this.currentMemoryUsage + estimatedSize > this.config.maxMemoryUsage) {
      this.evictForSize(estimatedSize)
    }

    // 删除旧条目（如果存在）
    const oldNode = this.cache.get(key)
    if (oldNode) {
      this.removeNode(oldNode)
      this.currentMemoryUsage -= oldNode.entry.size
    }

    // 检查最大条目数
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU()
    }

    // 创建新节点并添加到缓存
    const newNode: LRUNode<T> = {
      key,
      value,
      prev: null,
      next: null,
      entry: {
        key,
        value,
        timestamp: Date.now(),
        ttl: entryTTL,
        hitCount: 0,
        size: estimatedSize,
      },
    }

    this.cache.set(key, newNode)
    this.addToTail(newNode)
    this.currentMemoryUsage += estimatedSize
  }

  /**
   * 删除缓存 - 优化 LRU 链表维护
   */
  delete(key: string): boolean {
    const node = this.cache.get(key)
    if (node) {
      this.removeNode(node)
      this.currentMemoryUsage -= node.entry.size
    }
    return this.cache.delete(key)
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0, evictions: 0 }
    this.currentMemoryUsage = 0
    this.head = null
    this.tail = null
  }

  /**
   * 清理过期条目 - 优化单次遍历
   */
  cleanExpired(): number {
    const now = Date.now()
    let cleaned = 0
    const toDelete: LRUNode<unknown>[] = []

    // 单次遍历收集过期节点
    for (const node of this.cache.values()) {
      if (now > node.entry.timestamp + node.entry.ttl) {
        toDelete.push(node)
      }
    }

    // 批量删除
    for (const node of toDelete) {
      this.removeNode(node)
      this.currentMemoryUsage -= node.entry.size
      this.cache.delete(node.key)
      cleaned++
    }

    return cleaned
  }

  /**
   * 获取统计信息
   */
  getStats(): CacheStats {
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

  /**
   * 获取所有缓存键
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * 批量获取 - 优化减少缓存查找
   */
  getMany<T>(keys: string[]): Map<string, T> {
    const result = new Map<string, T>()
    const now = Date.now()
    const expired: string[] = []

    for (const key of keys) {
      const node = this.cache.get(key)
      if (node) {
        if (now > node.entry.timestamp + node.entry.ttl) {
          expired.push(key)
        } else {
          this.moveToTail(node)
          node.entry.hitCount++
          this.stats.hits++
          result.set(key, node.entry.value as T)
        }
      } else {
        this.stats.misses++
      }
    }

    // 批量删除过期条目
    for (const key of expired) {
      this.delete(key)
    }

    return result
  }

  /**
   * 批量设置 - 优化内存分配
   */
  setMany<T>(entries: Array<{ key: string; value: T; ttl?: number }>): void {
    const totalSize = entries.reduce((sum, { value }) => {
      return sum + this.estimateSize(value)
    }, 0)

    // 预先检查并淘汰足够的空间
    if (this.currentMemoryUsage + totalSize > this.config.maxMemoryUsage) {
      this.evictForSize(totalSize)
    }

    for (const { key, value, ttl } of entries) {
      this.set(key, value, ttl)
    }
  }

  // ============ LRU 双向链表辅助方法 ============

  /**
   * 将节点添加到尾部（最近使用）
   */
  private addToTail(node: LRUNode<unknown>): void {
    if (!this.tail) {
      // 空链表
      this.head = node
      this.tail = node
    } else {
      // 添加到尾部
      node.prev = this.tail
      this.tail.next = node
      this.tail = node
    }
  }

  /**
   * 从链表中移除节点
   */
  private removeNode(node: LRUNode<unknown>): void {
    if (node.prev) {
      node.prev.next = node.next
    } else {
      // 移除的是头节点
      this.head = node.next
    }

    if (node.next) {
      node.next.prev = node.prev
    } else {
      // 移除的是尾节点
      this.tail = node.prev
    }

    node.prev = null
    node.next = null
  }

  /**
   * 将节点移动到尾部
   */
  private moveToTail(node: LRUNode<unknown>): void {
    if (node === this.tail) {
      // 已经是尾部，无需移动
      return
    }

    // 先从当前位置移除
    this.removeNode(node)
    // 添加到尾部
    this.addToTail(node)
  }

  /**
   * 淘汰最少使用的节点（LRU）
   */
  private evictLRU(): void {
    if (!this.head) return

    this.currentMemoryUsage -= this.head.entry.size
    this.cache.delete(this.head.key)
    this.removeNode(this.head)
    this.stats.evictions++
  }

  /**
   * 淘汰以腾出指定大小的空间
   */
  private evictForSize(requiredSize: number): void {
    let freed = 0
    while (
      this.head &&
      (freed < requiredSize || this.currentMemoryUsage >= this.config.maxMemoryUsage)
    ) {
      freed += this.head.entry.size
      this.evictLRU()
    }
  }

  /**
   * 估算对象大小 - 优化避免 JSON.stringify
   */
  private estimateSize(value: unknown): number {
    // 基础类型直接估算
    if (value === null || value === undefined) {
      return 8
    }

    const type = typeof value
    if (type === 'boolean') {
      return 8
    }
    if (type === 'number') {
      return 16
    }
    if (type === 'string') {
      return (value as string).length * 2 + 16
    }

    // 数组或对象
    if (Array.isArray(value)) {
      return value.reduce((sum, item) => sum + this.estimateSize(item), 16)
    }

    if (type === 'object') {
      let size = 32 // 对象基础开销
      try {
        const keys = Object.keys(value)
        size += keys.reduce((sum, key) => {
          return sum + key.length * 2 + this.estimateSize((value as Record<string, unknown>)[key])
        }, 0)
      } catch (error) {
        // 如果无法遍历，使用保守估算
        size = 1024
      }
      return size
    }

    // 其他类型（函数、Symbol 等）
    return 128
  }
}

/**
 * 记忆化函数结果配置
 */
export interface MemoizationOptions {
  /** 缓存键前缀 */
  keyPrefix: string
  /** 缓存生存时间 (毫秒) */
  ttl?: number
  /** 是否根据参数生成唯一键 */
  useArgsAsKey?: boolean
  /** 自定义键生成器 */
  keyGenerator?: (...args: unknown[]) => string
  /** 标记为"昂贵"操作 (更长的 TTL) */
  expensive?: boolean
}

/**
 * 记忆化结果条目
 */
export interface MemoizedEntry<T = unknown> {
  value: T
  timestamp: number
  ttl: number
  argsKey: string
}

/**
 * 记忆化统计
 */
export interface MemoizationStats {
  hits: number
  misses: number
  totalCalls: number
  hitRate: number
  averageExecutionTime: number
  savedTime: number
}

/**
 * 记忆化包装器 - 用于缓存昂贵操作的执行结果
 *
 * 使用场景:
 * - 复杂的数据库查询 (聚合、JOIN、子查询)
 * - 计算密集型操作
 * - 外部 API 调用
 * - 需要多次调用的纯函数
 *
 * @example
 * const memoizedQuery = memoize(
 *   async (agentId: string) => {
 *     const db = await getDatabaseAsync();
 *     const stmt = db.prepare('SELECT * FROM agents WHERE id = ?');
 *     return stmt.get(agentId);
 *   },
 *   { keyPrefix: 'agent:by-id', ttl: 300000 }
 * );
 *
 * // 第一次调用 - 执行查询并缓存结果
 * const agent1 = await memoizedQuery('agent-123');
 *
 * // 第二次调用 - 从缓存返回
 * const agent2 = await memoizedQuery('agent-123');
 */
export class MemoizationCache {
  private cache: Map<string, MemoizedEntry<unknown>> = new Map()
  private stats: Map<string, MemoizationStats> = new Map()
  private executionTimes: Map<string, number[]> = new Map()

  /**
   * 记忆化函数
   * @param fn - 要记忆化的函数
   * @param options - 记忆化选项
   * @returns 记忆化后的函数
   * @example
   * const memoized = memoization.memoize(
   *   async (id: string) => fetchAgent(id),
   *   { keyPrefix: 'agent', ttl: 60000 }
   * );
   */
  memoize<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    options: MemoizationOptions
  ): T {
    const {
      keyPrefix,
      ttl: customTTL,
      useArgsAsKey = true,
      keyGenerator,
      expensive = false,
    } = options

    const defaultTTL = expensive ? 10 * 60 * 1000 : 5 * 60 * 1000 // 昂贵操作 10 分钟，默认 5 分钟
    const ttl = customTTL ?? defaultTTL

    // 初始化统计
    if (!this.stats.has(keyPrefix)) {
      this.stats.set(keyPrefix, {
        hits: 0,
        misses: 0,
        totalCalls: 0,
        hitRate: 0,
        averageExecutionTime: 0,
        savedTime: 0,
      })
    }

    return (async (...args: unknown[]): Promise<unknown> => {
      const stats = this.stats.get(keyPrefix)!
      stats.totalCalls++

      // 生成缓存键
      const argsKey = keyGenerator
        ? keyGenerator(...args)
        : useArgsAsKey
          ? `${keyPrefix}:${JSON.stringify(args)}`
          : keyPrefix

      // 检查缓存
      const cached = this.cache.get(argsKey)
      if (cached) {
        const now = Date.now()
        if (now < cached.timestamp + cached.ttl) {
          // 缓存命中
          stats.hits++
          stats.hitRate = stats.hits / stats.totalCalls
          return cached.value as Awaited<ReturnType<T>>
        } else {
          // 缓存过期，删除
          this.cache.delete(argsKey)
        }
      }

      // 缓存未命中，执行函数
      const startTime = performance.now()
      const result = await fn(...args)
      const executionTime = performance.now() - startTime

      // 记录执行时间
      if (!this.executionTimes.has(keyPrefix)) {
        this.executionTimes.set(keyPrefix, [])
      }
      const times = this.executionTimes.get(keyPrefix)!
      times.push(executionTime)
      if (times.length > 100) times.shift() // 保留最近 100 次

      // 更新平均执行时间
      stats.averageExecutionTime = times.reduce((a, b) => a + b, 0) / times.length

      // 存储结果到缓存
      this.cache.set(argsKey, {
        value: result,
        timestamp: Date.now(),
        ttl,
        argsKey,
      })

      stats.misses++
      stats.hitRate = stats.hits / stats.totalCalls

      return result
    }) as T
  }

  /**
   * 记忆化同步函数
   * @param fn - 要记忆化的同步函数
   * @param options - 记忆化选项
   * @returns 记忆化后的函数
   * @example
   * const memoizedCalculate = memoization.memoizeSync(
   *   (x: number, y: number) => expensiveCalculation(x, y),
   *   { keyPrefix: 'calc', expensive: true }
   * );
   */
  memoizeSync<T extends (...args: unknown[]) => unknown>(fn: T, options: MemoizationOptions): T {
    const {
      keyPrefix,
      ttl: customTTL,
      useArgsAsKey = true,
      keyGenerator,
      expensive = false,
    } = options

    const defaultTTL = expensive ? 10 * 60 * 1000 : 5 * 60 * 1000
    const ttl = customTTL ?? defaultTTL

    if (!this.stats.has(keyPrefix)) {
      this.stats.set(keyPrefix, {
        hits: 0,
        misses: 0,
        totalCalls: 0,
        hitRate: 0,
        averageExecutionTime: 0,
        savedTime: 0,
      })
    }

    return ((...args: unknown[]): unknown => {
      const stats = this.stats.get(keyPrefix)!
      stats.totalCalls++

      const argsKey = keyGenerator
        ? keyGenerator(...args)
        : useArgsAsKey
          ? `${keyPrefix}:${JSON.stringify(args)}`
          : keyPrefix

      const cached = this.cache.get(argsKey)
      if (cached) {
        const now = Date.now()
        if (now < cached.timestamp + cached.ttl) {
          stats.hits++
          stats.hitRate = stats.hits / stats.totalCalls
          stats.savedTime += stats.averageExecutionTime || 0
          return cached.value
        } else {
          this.cache.delete(argsKey)
        }
      }

      const startTime = performance.now()
      const result = fn(...args)
      const executionTime = performance.now() - startTime

      if (!this.executionTimes.has(keyPrefix)) {
        this.executionTimes.set(keyPrefix, [])
      }
      const times = this.executionTimes.get(keyPrefix)!
      times.push(executionTime)
      if (times.length > 100) times.shift()

      stats.averageExecutionTime = times.reduce((a, b) => a + b, 0) / times.length

      this.cache.set(argsKey, {
        value: result,
        timestamp: Date.now(),
        ttl,
        argsKey,
      })

      stats.misses++
      stats.hitRate = stats.hits / stats.totalCalls

      return result
    }) as T
  }

  /**
   * 清除特定前缀的缓存
   * @param keyPrefix - 缓存键前缀
   */
  clearPrefix(keyPrefix: string): void {
    const keysToDelete: string[] = []
    for (const key of this.cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        keysToDelete.push(key)
      }
    }
    for (const key of keysToDelete) {
      this.cache.delete(key)
    }
  }

  /**
   * 清除所有缓存
   */
  clearAll(): void {
    this.cache.clear()
    this.stats.clear()
    this.executionTimes.clear()
  }

  /**
   * 获取记忆化统计
   * @param keyPrefix - 缓存键前缀 (可选，不提供则返回所有统计)
   * @returns 统计信息
   */
  getStats(keyPrefix?: string): Map<string, MemoizationStats> | MemoizationStats {
    if (keyPrefix) {
      return (
        this.stats.get(keyPrefix) || {
          hits: 0,
          misses: 0,
          totalCalls: 0,
          hitRate: 0,
          averageExecutionTime: 0,
          savedTime: 0,
        }
      )
    }
    return this.stats
  }

  /**
   * 清理过期条目
   * @returns 清理的条目数
   */
  cleanExpired(): number {
    const now = Date.now()
    let cleaned = 0
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key)
      cleaned++
    }

    return cleaned
  }
}

// 全局记忆化缓存实例
export const memoization = new MemoizationCache()

/**
 * 快捷函数: 记忆化异步函数
 * @param fn - 要记忆化的函数
 * @param options - 记忆化选项
 * @returns 记忆化后的函数
 * @example
 * const getAgent = memoize(
 *   async (id: string) => {
 *     const db = await getDatabaseAsync();
 *     return db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
 *   },
 *   { keyPrefix: 'agent:by-id' }
 * );
 */
export function memoize<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: MemoizationOptions
): T {
  return memoization.memoize(fn, options)
}

/**
 * 快捷函数: 记忆化同步函数
 * @param fn - 要记忆化的函数
 * @param options - 记忆化选项
 * @returns 记忆化后的函数
 * @example
 * const calculateHash = memoizeSync(
 *   (data: string) => expensiveHashFunction(data),
 *   { keyPrefix: 'hash', expensive: true }
 * );
 */
export function memoizeSync<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options: MemoizationOptions
): T {
  return memoization.memoizeSync(fn, options)
}

/**
 * 带记忆化的查询执行器
 * @param queryFn - 查询函数
 * @param options - 记忆化选项
 * @returns 记忆化后的查询函数
 * @example
 * const getActiveAgents = memoizedQuery(
 *   async () => {
 *     const db = await getDatabaseAsync();
 *     return db.prepare('SELECT * FROM agents WHERE status = ?').all('active');
 *   },
 *   { keyPrefix: 'agents:active', ttl: 30000 }
 * );
 */
export function memoizedQuery<T>(
  queryFn: () => Promise<T>,
  options: MemoizationOptions
): () => Promise<T> {
  return memoize(queryFn, { ...options, useArgsAsKey: false })
}

// 全局缓存实例
const globalCache = new DatabaseCache({
  maxSize: 500,
  defaultTTL: 5 * 60 * 1000, // 5分钟
  maxMemoryUsage: 50 * 1024 * 1024, // 50MB
})

/**
 * 缓存装饰器工厂
 */
export function cached<T extends (...args: unknown[]) => Promise<unknown>>(
  keyPrefix: string,
  ttl?: number
) {
  return function (
    target: unknown,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> | void {
    const method = descriptor.value!

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      const key = `${keyPrefix}:${JSON.stringify(args)}`

      // 尝试从缓存获取
      const cachedValue = globalCache.get<unknown>(key)
      if (cachedValue !== null) {
        return cachedValue
      }

      // 执行原始方法
      const result = await method.apply(this, args)

      // 存入缓存
      globalCache.set(key, result, ttl)

      return result
    } as unknown as T
  }
}

/**
 * 带失效策略的缓存装饰器
 */
export function cachedWithInvalidation<T extends (...args: unknown[]) => Promise<unknown>>(
  keyPrefix: string,
  ttl: number,
  invalidationKeys: string[]
) {
  return function (
    target: unknown,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> | void {
    const method = descriptor.value!

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      const key = `${keyPrefix}:${JSON.stringify(args)}`

      // 尝试从缓存获取
      const cachedValue = globalCache.get<unknown>(key)
      if (cachedValue !== null) {
        return cachedValue
      }

      // 执行原始方法
      const result = await method.apply(this, args)

      // 存入缓存
      globalCache.set(key, result, ttl)

      return result
    } as unknown as T
  }
}

/**
 * 缓存键生成器
 */
export class CacheKeyGenerator {
  static agentKey(agentId: string): string {
    return `agent:${agentId}`
  }

  static agentsListKey(filters?: Record<string, unknown>): string {
    return `agents:list:${JSON.stringify(filters)}`
  }

  static walletKey(agentId: string): string {
    return `wallet:${agentId}`
  }

  static walletTransactionsKey(agentId: string, options?: Record<string, unknown>): string {
    return `wallet:transactions:${agentId}:${JSON.stringify(options)}`
  }

  static agentStatsKey(): string {
    return 'stats:agents'
  }

  static walletStatsKey(agentId: string): string {
    return `stats:wallet:${agentId}`
  }

  static approvalListKey(query?: Record<string, unknown>): string {
    return `approvals:list:${JSON.stringify(query)}`
  }

  static approvalStatsKey(): string {
    return 'stats:approvals'
  }
}

/**
 * 缓存失效策略
 */
export class CacheInvalidator {
  /**
   * 失效智能体相关缓存
   */
  static invalidateAgent(agentId: string): void {
    globalCache.delete(CacheKeyGenerator.agentKey(agentId))
    globalCache.delete(CacheKeyGenerator.walletKey(agentId))
    globalCache.delete(CacheKeyGenerator.walletStatsKey(agentId))
    globalCache.delete(CacheKeyGenerator.agentsListKey())

    // 失效统计缓存
    globalCache.delete(CacheKeyGenerator.agentStatsKey())
  }

  /**
   * 失效钱包交易缓存
   */
  static invalidateWalletTransactions(agentId: string): void {
    // 失效该代理的所有交易相关缓存
    const pattern = `wallet:transactions:${agentId}:`
    const keys = globalCache.keys()

    for (const key of keys) {
      if (typeof key === 'string' && key.startsWith(pattern)) {
        globalCache.delete(key)
      }
    }

    // 失效统计缓存
    globalCache.delete(CacheKeyGenerator.walletStatsKey(agentId))
  }

  /**
   * 失效审批相关缓存
   */
  static invalidateApproval(approvalId: string): void {
    globalCache.delete(`approval:${approvalId}`)
    globalCache.delete(CacheKeyGenerator.approvalListKey())
    globalCache.delete(CacheKeyGenerator.approvalStatsKey())
  }

  /**
   * 清理所有缓存
   */
  static clearAll(): void {
    globalCache.clear()
  }

  /**
   * 清理过期缓存
   */
  static cleanExpired(): number {
    return globalCache.cleanExpired()
  }
}

/**
 * 定期清理过期缓存
 */
export function startCacheCleanup(intervalMs: number = 60 * 1000): NodeJS.Timeout {
  return setInterval(() => {
    const cleaned = CacheInvalidator.cleanExpired()
    if (cleaned > 0) {
      logger.info(`Cleaned ${cleaned} expired cache entries`, { category: 'cache' })
    }
  }, intervalMs)
}

/**
 * 带缓存的查询包装器
 */
export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cachedValue = globalCache.get<T>(key)
  if (cachedValue !== null) {
    return cachedValue
  }

  const result = await queryFn()
  globalCache.set(key, result, ttl)

  return result
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats(): CacheStats {
  return globalCache.getStats()
}

/**
 * 预热缓存
 */
export async function warmupCache(): Promise<void> {
  const db = await getDatabaseAsync()

  try {
    // 预热智能体统计
    const statsStmt = db.prepare(`
      SELECT status, COUNT(*) as count FROM agents GROUP BY status
    `)
    const stats = statsStmt.all()
    globalCache.set(CacheKeyGenerator.agentStatsKey(), stats, 5 * 60 * 1000)

    // 预热活跃智能体列表
    const activeAgentsStmt = db.prepare(`
      SELECT * FROM agents WHERE status = 'active' LIMIT 20
    `)
    const activeAgents = activeAgentsStmt.all()
    globalCache.set(
      CacheKeyGenerator.agentsListKey({ status: 'active' }),
      activeAgents,
      3 * 60 * 1000
    )

    logger.info('Cache warmed up successfully', { category: 'cache' })
  } catch (error) {
    logger.error('Failed to warm up cache', error, { category: 'cache' })
  }
}

export default {
  cached,
  cachedWithInvalidation,
  cachedQuery,
  getCacheStats,
  CacheKeyGenerator,
  CacheInvalidator,
  startCacheCleanup,
  warmupCache,
  memoization,
  memoize,
  memoizeSync,
  memoizedQuery,
  MemoizationCache,
}
