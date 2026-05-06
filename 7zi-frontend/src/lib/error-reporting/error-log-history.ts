/**
 * Error Log History Service
 * 错误日志历史记录服务 - 本地存储错误历史，支持查询和分析
 */

import { logger } from '../logger'
import { generateSecureId } from '@/lib/utils'

/**
 * 错误日志条目
 */
export interface ErrorLogEntry {
  id: string
  timestamp: number
  type: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: string
  stack?: string
  context: Record<string, unknown>
  url?: string
  userId?: string
  sessionId?: string
  resolved: boolean
  resolvedAt?: number
  resolvedBy?: string
}

/**
 * 错误日志查询选项
 */
export interface ErrorLogQueryOptions {
  /**
   * 开始时间戳
   */
  startTime?: number

  /**
   * 结束时间戳
   */
  endTime?: number

  /**
   * 错误类型
   */
  type?: string

  /**
   * 错误分类
   */
  category?: string

  /**
   * 严重级别
   */
  severity?: string

  /**
   * 是否已解决
   */
  resolved?: boolean

  /**
   * 会话 ID
   */
  sessionId?: string

  /**
   * 限制数量
   */
  limit?: number

  /**
   * 偏移量
   */
  offset?: number
}

/**
 * 错误日志统计
 */
export interface ErrorLogStats {
  total: number
  bySeverity: Record<string, number>
  byCategory: Record<string, number>
  byType: Record<string, number>
  resolved: number
  unresolved: number
}

/**
 * 错误日志历史配置
 */
export interface ErrorLogHistoryConfig {
  /**
   * 最大存储条目数
   * @default 1000
   */
  maxEntries: number

  /**
   * 存储键名
   * @default 'error-log-history'
   */
  storageKey: string

  /**
   * 是否启用持久化
   * @default true
   */
  persist: boolean

  /**
   * 自动清理天数
   * @default 30
   */
  autoCleanupDays: number
}

/**
 * 错误日志历史服务
 */
export class ErrorLogHistoryService {
  private config: ErrorLogHistoryConfig
  private logs: ErrorLogEntry[] = []
  private initialized = false

  constructor(config: Partial<ErrorLogHistoryConfig> = {}) {
    this.config = {
      maxEntries: 1000,
      storageKey: 'error-log-history',
      persist: true,
      autoCleanupDays: 30,
      ...config,
    }
  }

  /**
   * 初始化
   */
  init(): void {
    if (this.initialized) return

    try {
      // 从 localStorage 加载历史记录
      if (this.config.persist && typeof window !== 'undefined') {
        const stored = localStorage.getItem(this.config.storageKey)
        if (stored) {
          this.logs = JSON.parse(stored)
        }
      }

      // 自动清理过期记录
      this.cleanup()

      this.initialized = true
      logger.info('Error log history initialized', { count: this.logs.length })
    } catch (error) {
      logger.error('Failed to initialize error log history', error instanceof Error ? error : undefined)
      this.logs = []
      this.initialized = true
    }
  }

  /**
   * 添加错误日志
   */
  add(entry: Omit<ErrorLogEntry, 'id' | 'timestamp' | 'resolved'>): ErrorLogEntry {
    const logEntry: ErrorLogEntry = {
      ...entry,
      id: generateSecureId('log'),
      timestamp: Date.now(),
      resolved: false,
    }

    this.logs.unshift(logEntry)

    // 限制最大条目数
    if (this.logs.length > this.config.maxEntries) {
      this.logs = this.logs.slice(0, this.config.maxEntries)
    }

    // 持久化
    this.persist()

    return logEntry
  }

  /**
   * 标记错误为已解决
   */
  markResolved(id: string, resolvedBy?: string): boolean {
    const entry = this.logs.find(log => log.id === id)
    if (!entry) return false

    entry.resolved = true
    entry.resolvedAt = Date.now()
    entry.resolvedBy = resolvedBy

    this.persist()
    return true
  }

  /**
   * 批量标记错误为已解决
   */
  markResolvedBatch(ids: string[], resolvedBy?: string): number {
    let count = 0
    for (const id of ids) {
      if (this.markResolved(id, resolvedBy)) {
        count++
      }
    }
    return count
  }

  /**
   * 查询错误日志
   */
  query(options: ErrorLogQueryOptions = {}): ErrorLogEntry[] {
    let results = [...this.logs]

    // 时间范围过滤
    if (options.startTime) {
      results = results.filter(log => log.timestamp >= options.startTime!)
    }
    if (options.endTime) {
      results = results.filter(log => log.timestamp <= options.endTime!)
    }

    // 类型过滤
    if (options.type) {
      results = results.filter(log => log.type === options.type)
    }

    // 分类过滤
    if (options.category) {
      results = results.filter(log => log.category === options.category)
    }

    // 严重级别过滤
    if (options.severity) {
      results = results.filter(log => log.severity === options.severity)
    }

    // 解决状态过滤
    if (options.resolved !== undefined) {
      results = results.filter(log => log.resolved === options.resolved)
    }

    // 会话 ID 过滤
    if (options.sessionId) {
      results = results.filter(log => log.sessionId === options.sessionId)
    }

    // 分页
    if (options.offset) {
      results = results.slice(options.offset)
    }
    if (options.limit) {
      results = results.slice(0, options.limit)
    }

    return results
  }

  /**
   * 获取错误日志统计
   */
  getStats(): ErrorLogStats {
    const stats: ErrorLogStats = {
      total: this.logs.length,
      bySeverity: {},
      byCategory: {},
      byType: {},
      resolved: 0,
      unresolved: 0,
    }

    for (const log of this.logs) {
      // 按严重级别统计
      stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1

      // 按分类统计
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1

      // 按类型统计
      stats.byType[log.type] = (stats.byType[log.type] || 0) + 1

      // 解决状态统计
      if (log.resolved) {
        stats.resolved++
      } else {
        stats.unresolved++
      }
    }

    return stats
  }

  /**
   * 获取最近的错误
   */
  getRecent(limit: number = 10): ErrorLogEntry[] {
    return this.query({ limit })
  }

  /**
   * 获取未解决的错误
   */
  getUnresolved(limit?: number): ErrorLogEntry[] {
    return this.query({ resolved: false, limit })
  }

  /**
   * 获取特定错误
   */
  getById(id: string): ErrorLogEntry | undefined {
    return this.logs.find(log => log.id === id)
  }

  /**
   * 清理过期记录
   */
  cleanup(): void {
    const cutoffTime = Date.now() - this.config.autoCleanupDays * 24 * 60 * 60 * 1000
    const beforeCount = this.logs.length

    this.logs = this.logs.filter(log => log.timestamp >= cutoffTime)

    const afterCount = this.logs.length
    if (beforeCount !== afterCount) {
      logger.info(`Cleaned up ${beforeCount - afterCount} old error logs`)
      this.persist()
    }
  }

  /**
   * 清空所有日志
   */
  clear(): void {
    this.logs = []
    this.persist()
    logger.info('Error log history cleared')
  }

  /**
   * 导出日志
   */
  export(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  /**
   * 导入日志
   */
  import(data: string): void {
    try {
      const imported = JSON.parse(data) as ErrorLogEntry[]
      if (!Array.isArray(imported)) {
        throw new Error('Invalid data format')
      }

      // 合并日志，去重
      const existingIds = new Set(this.logs.map(log => log.id))
      const newLogs = imported.filter(log => !existingIds.has(log.id))

      this.logs = [...newLogs, ...this.logs]

      // 限制最大条目数
      if (this.logs.length > this.config.maxEntries) {
        this.logs = this.logs.slice(0, this.config.maxEntries)
      }

      this.persist()
      logger.info(`Imported ${newLogs.length} error logs`)
    } catch (error) {
      logger.error('Failed to import error logs', error instanceof Error ? error : undefined)
      throw error
    }
  }

  /**
   * 持久化到 localStorage
   */
  private persist(): void {
    if (!this.config.persist || typeof window === 'undefined') return

    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(this.logs))
    } catch (error) {
      logger.error('Failed to persist error logs', error instanceof Error ? error : undefined)
    }
  }

  /**
   * 获取日志数量
   */
  getCount(): number {
    return this.logs.length
  }
}

// 默认实例
export const errorLogHistory = new ErrorLogHistoryService()

/**
 * 初始化错误日志历史服务
 */
export function initErrorLogHistory(config?: Partial<ErrorLogHistoryConfig>): ErrorLogHistoryService {
  if (config) {
    errorLogHistory['config'] = { ...errorLogHistory['config'], ...config }
  }
  errorLogHistory.init()
  return errorLogHistory
}

/**
 * 添加错误日志的便捷函数
 */
export function addErrorLog(
  type: string,
  message: string,
  severity: ErrorLogEntry['severity'] = 'medium',
  category: string = 'other',
  context: Record<string, unknown> = {}
): ErrorLogEntry {
  return errorLogHistory.add({
    type,
    message,
    severity,
    category,
    context,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
  })
}