/**
 * Report Data Aggregator
 * 报表数据聚合器
 *
 * 从数据库聚合关键指标，支持多种时间范围和多层缓存机制
 */

import { InMemoryStorage } from '@/lib/db/storage'

/**
 * 时间范围类型
 */
export type TimeRange = 'day' | 'week' | 'month' | 'year' | 'custom'

/**
 * 时间范围配置
 */
export interface TimeRangeConfig {
  type: TimeRange
  startDate?: Date
  endDate?: Date
}

/**
 * 聚合指标类型
 */
export interface AggregatedMetric {
  name: string
  value: number
  change?: number
  changePercent?: number
  trend?: 'up' | 'down' | 'stable'
}

/**
 * 聚合数据结果
 */
export interface AggregatedData {
  timeRange: TimeRangeConfig
  metrics: AggregatedMetric[]
  breakdown?: Record<string, AggregatedMetric[]>
  timestamp: number
}

/**
 * 数据源接口
 */
export interface DataSource {
  name: string
  fetchMetrics: (config: TimeRangeConfig) => Promise<AggregatedMetric[]>
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  enabled: boolean
  ttl: number // Time to live in milliseconds
  maxSize: number
}

/**
 * 聚合器配置
 */
export interface AggregatorConfig {
  dataSources: DataSource[]
  cache?: CacheConfig
}

/**
 * 默认缓存配置
 */
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 100,
}

/**
 * 报表数据聚合器类
 */
export class ReportDataAggregator {
  private dataSources: Map<string, DataSource>
  private cache: InMemoryStorage<AggregatedData>
  private cacheConfig: CacheConfig

  constructor(config: AggregatorConfig) {
    this.dataSources = new Map()
    config.dataSources.forEach(source => {
      this.dataSources.set(source.name, source)
    })

    this.cacheConfig = config.cache || DEFAULT_CACHE_CONFIG
    this.cache = new InMemoryStorage<AggregatedData>({
      ttl: this.cacheConfig.ttl,
    })
  }

  /**
   * 聚合数据
   */
  async aggregate(
    sourceName: string,
    timeRange: TimeRangeConfig
  ): Promise<AggregatedData> {
    // 检查缓存
    if (this.cacheConfig.enabled) {
      const cacheKey = this.getCacheKey(sourceName, timeRange)
      const cached = this.cache.get(cacheKey)
      if (cached) {
        return cached
      }
    }

    // 获取数据源
    const source = this.dataSources.get(sourceName)
    if (!source) {
      throw new Error(`Data source not found: ${sourceName}`)
    }

    // 聚合指标
    const metrics = await source.fetchMetrics(timeRange)

    // 计算趋势
    const metricsWithTrend = this.calculateTrends(metrics)

    const result: AggregatedData = {
      timeRange,
      metrics: metricsWithTrend,
      timestamp: Date.now(),
    }

    // 缓存结果
    if (this.cacheConfig.enabled) {
      const cacheKey = this.getCacheKey(sourceName, timeRange)
      this.cache.set(cacheKey, result)

      // 清理过期缓存
      this.cleanupCache()
    }

    return result
  }

  /**
   * 聚合多个数据源
   */
  async aggregateMultiple(
    sourceNames: string[],
    timeRange: TimeRangeConfig
  ): Promise<Record<string, AggregatedData>> {
    const results: Record<string, AggregatedData> = {}

    await Promise.all(
      sourceNames.map(async sourceName => {
        try {
          results[sourceName] = await this.aggregate(sourceName, timeRange)
        } catch (error) {
          console.error(`Failed to aggregate ${sourceName}:`, error)
        }
      })
    )

    return results
  }

  /**
   * 计算趋势
   */
  private calculateTrends(metrics: AggregatedMetric[]): AggregatedMetric[] {
    return metrics.map(metric => {
      if (metric.change === undefined || metric.changePercent === undefined) {
        return metric
      }

      let trend: 'up' | 'down' | 'stable' = 'stable'
      const threshold = 0.01 // 1% threshold

      if (metric.changePercent > threshold) {
        trend = 'up'
      } else if (metric.changePercent < -threshold) {
        trend = 'down'
      }

      return {
        ...metric,
        trend,
      }
    })
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(sourceName: string, timeRange: TimeRangeConfig): string {
    const key = `${sourceName}:${timeRange.type}`
    if (timeRange.startDate && timeRange.endDate) {
      return `${key}:${timeRange.startDate.getTime()}-${timeRange.endDate.getTime()}`
    }
    return key
  }

  /**
   * 清理过期缓存
   */
  private cleanupCache(): void {
    const stats = this.cache.getStats()
    if (stats.itemCount > this.cacheConfig.maxSize) {
      // 删除最旧的缓存项
      const keys = stats.keys
      const keysToDelete = keys.slice(0, keys.length - this.cacheConfig.maxSize)
      this.cache.deleteMany(keysToDelete)
    }
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return this.cache.getStats()
  }

  /**
   * 添加数据源
   */
  addDataSource(source: DataSource): void {
    this.dataSources.set(source.name, source)
  }

  /**
   * 移除数据源
   */
  removeDataSource(sourceName: string): void {
    this.dataSources.delete(sourceName)
  }

  /**
   * 获取所有数据源名称
   */
  getDataSources(): string[] {
    return Array.from(this.dataSources.keys())
  }
}

/**
 * 创建时间范围配置
 */
export function createTimeRange(
  type: TimeRange,
  startDate?: Date,
  endDate?: Date
): TimeRangeConfig {
  const config: TimeRangeConfig = { type }

  if (type === 'custom' && startDate && endDate) {
    config.startDate = startDate
    config.endDate = endDate
  } else {
    // 自动计算时间范围
    const now = new Date()
    const end = new Date(now)

    switch (type) {
      case 'day':
        config.startDate = new Date(now.setHours(0, 0, 0, 0))
        config.endDate = end
        break
      case 'week':
        config.startDate = new Date(now.setDate(now.getDate() - 7))
        config.endDate = end
        break
      case 'month':
        config.startDate = new Date(now.setMonth(now.getMonth() - 1))
        config.endDate = end
        break
      case 'year':
        config.startDate = new Date(now.setFullYear(now.getFullYear() - 1))
        config.endDate = end
        break
    }
  }

  return config
}

/**
 * 示例数据源：用户活动数据
 */
export class UserActivityDataSource implements DataSource {
  name = 'user-activity'

  async fetchMetrics(timeRange: TimeRangeConfig): Promise<AggregatedMetric[]> {
    // 这里应该是实际的数据库查询
    // 示例数据
    return [
      {
        name: 'active_users',
        value: Math.floor(Math.random() * 1000) + 500,
        change: Math.floor(Math.random() * 100) - 50,
        changePercent: Math.random() * 0.2 - 0.1,
      },
      {
        name: 'new_users',
        value: Math.floor(Math.random() * 100) + 20,
        change: Math.floor(Math.random() * 20) - 10,
        changePercent: Math.random() * 0.3 - 0.15,
      },
      {
        name: 'sessions',
        value: Math.floor(Math.random() * 5000) + 2000,
        change: Math.floor(Math.random() * 500) - 250,
        changePercent: Math.random() * 0.15 - 0.075,
      },
    ]
  }
}

/**
 * 示例数据源：性能数据
 */
export class PerformanceDataSource implements DataSource {
  name = 'performance'

  async fetchMetrics(timeRange: TimeRangeConfig): Promise<AggregatedMetric[]> {
    return [
      {
        name: 'avg_response_time',
        value: Math.random() * 500 + 100,
        change: Math.random() * 50 - 25,
        changePercent: Math.random() * 0.1 - 0.05,
      },
      {
        name: 'error_rate',
        value: Math.random() * 0.05,
        change: Math.random() * 0.01 - 0.005,
        changePercent: Math.random() * 0.2 - 0.1,
      },
      {
        name: 'throughput',
        value: Math.floor(Math.random() * 10000) + 5000,
        change: Math.floor(Math.random() * 1000) - 500,
        changePercent: Math.random() * 0.15 - 0.075,
      },
    ]
  }
}

/**
 * 创建默认聚合器实例
 */
export function createDefaultAggregator(): ReportDataAggregator {
  return new ReportDataAggregator({
    dataSources: [
      new UserActivityDataSource(),
      new PerformanceDataSource(),
    ],
    cache: DEFAULT_CACHE_CONFIG,
  })
}