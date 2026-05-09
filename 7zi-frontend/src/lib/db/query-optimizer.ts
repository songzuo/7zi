/**
 * Query Optimizer - 数据库查询优化
 *
 * 提供自动 N+1 查询检测和优化、查询结果缓存、批量操作优化等功能
 */

import { InMemoryStorage } from '../db/storage'
import { generateSecureId } from '@/core/utils'

/**
 * 查询类型
 */
export type QueryType = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'BATCH'

/**
 * 查询日志接口
 */
export interface QueryLog {
  id: string
  query: string
  type: QueryType
  duration: number
  timestamp: number
  params?: unknown[]
  isN1: boolean
  relatedQueryId?: string
}

/**
 * 查询优化建议
 */
export interface OptimizationSuggestion {
  type: 'N1' | 'CACHING' | 'INDEX' | 'BATCH' | 'OTHER'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  queryId: string
  suggestion: string
  estimatedImprovement: string
}

/**
 * 查询缓存配置
 */
export interface QueryCacheConfig {
  enabled: boolean
  ttl: number
  maxSize: number
  cacheKey: (query: string, params?: unknown[]) => string
}

/**
 * 批量操作配置
 */
export interface BatchConfig {
  enabled: boolean
  batchSize: number
  maxWaitTime: number // 毫秒
}

/**
 * 查询统计接口
 */
export interface QueryStats {
  totalQueries: number
  n1Queries: number
  cachedQueries: number
  batchQueries: number
  averageDuration: number
  slowQueries: number
  cacheHitRate: number
}

/**
 * N+1 查询检测配置
 */
interface N1DetectionConfig {
  enabled: boolean
  maxQueries: number
  timeWindow: number // 毫秒
  similarityThreshold: number // 0-1
}

/**
 * 查询优化器类
 */
export class QueryOptimizer {
  private queryLogs: Map<string, QueryLog> = new Map()
  private queryCache: InMemoryStorage<{ data: unknown; timestamp: number }>
  private cacheConfig: Required<QueryCacheConfig>
  private batchConfig: Required<BatchConfig>
  private n1Config: N1DetectionConfig
  private batchQueue: Map<string, Array<{ params: unknown[]; resolve: (result: unknown) => void }>> = new Map()
  private batchTimers: Map<string, NodeJS.Timeout> = new Map()
  private stats: QueryStats = {
    totalQueries: 0,
    n1Queries: 0,
    cachedQueries: 0,
    batchQueries: 0,
    averageDuration: 0,
    slowQueries: 0,
    cacheHitRate: 0,
  }

  constructor(config?: {
    cache?: Partial<QueryCacheConfig>
    batch?: Partial<BatchConfig>
  }) {
    this.cacheConfig = {
      enabled: config?.cache?.enabled ?? true,
      ttl: config?.cache?.ttl ?? 5 * 60 * 1000, // 5分钟
      maxSize: config?.cache?.maxSize ?? 1000,
      cacheKey: config?.cache?.cacheKey ?? this.defaultCacheKey,
    }

    this.batchConfig = {
      enabled: config?.batch?.enabled ?? true,
      batchSize: config?.batch?.batchSize ?? 100,
      maxWaitTime: config?.batch?.maxWaitTime ?? 100, // 100ms
    }

    this.n1Config = {
      enabled: true,
      maxQueries: 10,
      timeWindow: 100, // 100ms
      similarityThreshold: 0.8,
    }

    this.queryCache = new InMemoryStorage<{ data: unknown; timestamp: number }>()

    // 定期清理日志
    setInterval(() => this.cleanupOldLogs(), 60000) // 每分钟清理一次
  }

  /**
   * 默认缓存键生成函数
   */
  private defaultCacheKey(query: string, params?: unknown[]): string {
    const normalizedQuery = query.replace(/\s+/g, ' ').trim()
    const paramsStr = params ? JSON.stringify(params) : ''
    return `${normalizedQuery}:${paramsStr}`
  }

  /**
   * 执行查询
   */
  async executeQuery<T = unknown>(
    queryFn: () => Promise<T>,
    query: string,
    params?: unknown[],
    options?: { cacheable?: boolean; batchable?: boolean }
  ): Promise<T> {
    const queryId = this.generateQueryId()
    const startTime = Date.now()

    // 检查缓存
    if (options?.cacheable !== false && this.cacheConfig.enabled) {
      const cacheKey = this.cacheConfig.cacheKey(query, params)
      const cached = this.queryCache.get(cacheKey)

      if (cached && Date.now() - cached.timestamp < this.cacheConfig.ttl) {
        this.stats.cachedQueries++
        this.stats.totalQueries++
        return cached.data as T
      }
    }

    // 执行查询
    let result: T
    let error: Error | null = null

    try {
      result = await queryFn()
    } catch (e) {
      error = e as Error
      throw error
    } finally {
      const duration = Date.now() - startTime
      this.logQuery(queryId, query, 'SELECT', duration, params)
      this.updateStats(duration)
    }

    // 缓存结果
    if (options?.cacheable !== false && this.cacheConfig.enabled && !error) {
      const cacheKey = this.cacheConfig.cacheKey(query, params)
      this.queryCache.set(cacheKey, { data: result, timestamp: Date.now() })
    }

    return result
  }

  /**
   * 批量操作
   */
  async batchExecute<T = unknown>(
    batchKey: string,
    params: unknown[],
    batchFn: (allParams: unknown[][]) => Promise<T[]>
  ): Promise<T> {
    if (!this.batchConfig.enabled) {
      const allParams = [params]
      const results = await batchFn(allParams)
      return results[0]
    }

    return new Promise((resolve) => {
      // 初始化批次队列
      if (!this.batchQueue.has(batchKey)) {
        this.batchQueue.set(batchKey, [])
      }

      const queue = this.batchQueue.get(batchKey)!
      queue.push({ params, resolve })

      // 清除之前的定时器
      if (this.batchTimers.has(batchKey)) {
        clearTimeout(this.batchTimers.get(batchKey)!)
      }

      // 设置新的定时器
      const timer = setTimeout(() => this.flushBatch(batchKey, batchFn), this.batchConfig.maxWaitTime)
      this.batchTimers.set(batchKey, timer)

      // 检查是否达到批大小
      if (queue.length >= this.batchConfig.batchSize) {
        clearTimeout(timer)
        this.flushBatch(batchKey, batchFn)
      }
    })
  }

  /**
   * 刷新批次
   */
  private async flushBatch<T>(
    batchKey: string,
    batchFn: (allParams: unknown[][]) => Promise<T[]>
  ): Promise<void> {
    const queue = this.batchQueue.get(batchKey)
    if (!queue || queue.length === 0) return

    // 移除队列
    this.batchQueue.delete(batchKey)
    this.batchTimers.delete(batchKey)

    const startTime = Date.now()

    try {
      const allParams = queue.map(item => item.params)
      const results = await batchFn(allParams)

      // 分发结果
      results.forEach((result, index) => {
        queue[index].resolve(result)
      })

      const duration = Date.now() - startTime
      this.stats.batchQueries++
      this.stats.totalQueries++

      // 记录批量查询
      const queryId = this.generateQueryId()
      this.logQuery(queryId, `BATCH:${batchKey}`, 'BATCH', duration, allParams)
    } catch (error) {
      // 分发错误
      queue.forEach(item => {
        item.resolve(Promise.reject(error))
      })
    }
  }

  /**
   * 记录查询
   */
  private logQuery(
    queryId: string,
    query: string,
    type: QueryType,
    duration: number,
    params?: unknown[]
  ): void {
    const log: QueryLog = {
      id: queryId,
      query,
      type,
      duration,
      timestamp: Date.now(),
      params,
      isN1: this.detectN1(queryId, query, type),
    }

    this.queryLogs.set(queryId, log)
  }

  /**
   * 检测 N+1 查询
   */
  private detectN1(queryId: string, query: string, type: QueryType): boolean {
    if (!this.n1Config.enabled || type !== 'SELECT') {
      return false
    }

    const now = Date.now()
    const recentQueries = Array.from(this.queryLogs.values()).filter(
      log => log.type === 'SELECT' && now - log.timestamp < this.n1Config.timeWindow
    )

    if (recentQueries.length >= this.n1Config.maxQueries) {
      // 检查查询相似性
      const similarity = this.calculateQuerySimilarity(query, recentQueries[0].query)

      if (similarity >= this.n1Config.similarityThreshold) {
        // 标记为 N+1 查询
        for (const log of recentQueries) {
          log.isN1 = true
          log.relatedQueryId = queryId
        }

        this.stats.n1Queries += recentQueries.length
        return true
      }
    }

    return false
  }

  /**
   * 计算查询相似度
   */
  private calculateQuerySimilarity(query1: string, query2: string): number {
    const q1 = this.normalizeQuery(query1)
    const q2 = this.normalizeQuery(query2)

    // 计算编辑距离
    const distance = this.levenshteinDistance(q1, q2)
    const maxLength = Math.max(q1.length, q2.length)

    return maxLength > 0 ? 1 - distance / maxLength : 1
  }

  /**
   * 规范化查询
   */
  private normalizeQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')
      .replace(/\d+/g, '?')
      .replace(/'[^']*'/g, '?')
      .replace(/"[^"]*"/g, '?')
      .trim()
      .toLowerCase()
  }

  /**
   * 计算编辑距离
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length
    const n = str2.length
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1]
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1, // 删除
            dp[i][j - 1] + 1, // 插入
            dp[i - 1][j - 1] + 1 // 替换
          )
        }
      }
    }

    return dp[m][n]
  }

  /**
   * 更新统计信息
   */
  private updateStats(duration: number): void {
    this.stats.totalQueries++
    this.stats.averageDuration =
      (this.stats.averageDuration * (this.stats.totalQueries - 1) + duration) /
      this.stats.totalQueries

    if (duration > 1000) { // 超过 1 秒视为慢查询
      this.stats.slowQueries++
    }

    // 更新缓存命中率
    this.stats.cacheHitRate =
      this.stats.totalQueries > 0 ? this.stats.cachedQueries / this.stats.totalQueries : 0
  }

  /**
   * 生成查询 ID
   */
  private generateQueryId(): string {
    return generateSecureId('q')
  }

  /**
   * 清理旧日志
   */
  private cleanupOldLogs(): void {
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 小时

    for (const [id, log] of this.queryLogs.entries()) {
      if (now - log.timestamp > maxAge) {
        this.queryLogs.delete(id)
      }
    }
  }

  /**
   * 获取优化建议
   */
  getOptimizationSuggestions(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []

    // 检测 N+1 查询
    const n1Queries = Array.from(this.queryLogs.values()).filter(log => log.isN1)
    const n1Groups = new Map<string, QueryLog[]>()

    for (const log of n1Queries) {
      const key = this.normalizeQuery(log.query)
      if (!n1Groups.has(key)) {
        n1Groups.set(key, [])
      }
      n1Groups.get(key)!.push(log)
    }

    for (const [_, logs] of n1Groups.entries()) {
      if (logs.length > 1) {
        suggestions.push({
          type: 'N1',
          severity: logs.length > 5 ? 'critical' : logs.length > 3 ? 'high' : 'medium',
          description: `检测到 N+1 查询问题，${logs.length} 个相似查询在短时间窗口内执行`,
          queryId: logs[0].id,
          suggestion: '使用 JOIN 查询或批量加载来减少查询次数',
          estimatedImprovement: `可减少 ${logs.length - 1} 次数据库查询`,
        })
      }
    }

    // 检测慢查询
    const slowQueries = Array.from(this.queryLogs.values()).filter(log => log.duration > 1000)
    for (const log of slowQueries.slice(0, 10)) {
      suggestions.push({
        type: 'INDEX',
        severity: log.duration > 5000 ? 'critical' : log.duration > 2000 ? 'high' : 'medium',
        description: `慢查询检测：查询耗时 ${log.duration}ms`,
        queryId: log.id,
        suggestion: '考虑添加索引或优化查询语句',
        estimatedImprovement: '预计可减少 50-90% 的查询时间',
      })
    }

    // 检测缓存机会
    const frequentQueries = this.getMostFrequentQueries(5)
    for (const query of frequentQueries) {
      if (!this.isQueryCached(query.query)) {
        suggestions.push({
          type: 'CACHING',
          severity: 'low',
          description: `高频查询检测：查询执行 ${query.count} 次`,
          queryId: query.id,
          suggestion: '考虑缓存此查询的结果',
          estimatedImprovement: '可减少 80-100% 的数据库访问',
        })
      }
    }

    return suggestions
  }

  /**
   * 获取最频繁的查询
   */
  private getMostFrequentQueries(limit: number): Array<{ id: string; query: string; count: number }> {
    const queryCount = new Map<string, { id: string; count: number }>()

    for (const log of this.queryLogs.values()) {
      const key = this.normalizeQuery(log.query)
      if (!queryCount.has(key)) {
        queryCount.set(key, { id: log.id, count: 0 })
      }
      queryCount.get(key)!.count++
    }

    return Array.from(queryCount.entries())
      .map(([key, data]) => ({ id: data.id, query: key, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  /**
   * 检查查询是否缓存
   */
  private isQueryCached(query: string): boolean {
    const key = this.cacheConfig.cacheKey(query)
    return this.queryCache.has(key)
  }

  /**
   * 获取统计信息
   */
  getStats(): QueryStats {
    return { ...this.stats }
  }

  /**
   * 获取查询日志
   */
  getQueryLogs(filter?: {
    type?: QueryType
    isN1?: boolean
    minDuration?: number
    limit?: number
  }): QueryLog[] {
    let logs = Array.from(this.queryLogs.values())

    if (filter?.type) {
      logs = logs.filter(log => log.type === filter.type)
    }

    if (filter?.isN1 !== undefined) {
      logs = logs.filter(log => log.isN1 === filter.isN1)
    }

    if (filter?.minDuration) {
      logs = logs.filter(log => log.duration >= filter.minDuration!)
    }

    logs.sort((a, b) => b.timestamp - a.timestamp)

    if (filter?.limit) {
      logs = logs.slice(0, filter.limit)
    }

    return logs
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.queryCache.clear()
  }

  /**
   * 清除查询日志
   */
  clearLogs(): void {
    this.queryLogs.clear()
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalQueries: 0,
      n1Queries: 0,
      cachedQueries: 0,
      batchQueries: 0,
      averageDuration: 0,
      slowQueries: 0,
      cacheHitRate: 0,
    }
  }
}

/**
 * 创建默认的查询优化器实例
 */
export const createQueryOptimizer = (config?: {
  cache?: Partial<QueryCacheConfig>
  batch?: Partial<BatchConfig>
}): QueryOptimizer => {
  return new QueryOptimizer(config)
}

/**
 * 预定义的配置
 */
export const QueryOptimizerPresets = {
  // 开发环境：详细日志，低缓存
  DEVELOPMENT: {
    cache: {
      enabled: false,
      ttl: 0,
      maxSize: 0,
    },
    batch: {
      enabled: false,
      batchSize: 1,
      maxWaitTime: 0,
    },
  },

  // 生产环境：高缓存，批量优化
  PRODUCTION: {
    cache: {
      enabled: true,
      ttl: 5 * 60 * 1000, // 5分钟
      maxSize: 1000,
    },
    batch: {
      enabled: true,
      batchSize: 100,
      maxWaitTime: 100,
    },
  },

  // 高性能：最大缓存，大批量
  HIGH_PERFORMANCE: {
    cache: {
      enabled: true,
      ttl: 30 * 60 * 1000, // 30分钟
      maxSize: 5000,
    },
    batch: {
      enabled: true,
      batchSize: 500,
      maxWaitTime: 50,
    },
  },
}