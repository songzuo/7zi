/**
 * StructuredLogger - 结构化日志记录器
 * 
 * 自动注入 traceId 和 spanId，支持 JSON 格式输出
 * 
 * @version v1.11.0
 */

import {
  LogLevel,
  LogEntry,
  LogFilter,
  LogAggregate,
  TraceId,
  SpanId,
  Tags,
} from '../types'

// ============================================
// Logger Options
// ============================================

export interface StructuredLoggerOptions {
  serviceName: string
  serviceVersion?: string
  environment?: string
  minLevel?: LogLevel
  consoleEnabled?: boolean
  jsonOutput?: boolean
  transport?: (entry: LogEntry) => void | Promise<void>
}

// ============================================
// StructuredLogger Class
// ============================================

export class StructuredLogger {
  private options: Required<Omit<StructuredLoggerOptions, 'transport'>> & {
    transport?: (entry: LogEntry) => void | Promise<void>
  }
  private traceContext: { traceId: string; spanId?: string; parentSpanId?: string } | undefined
  private entries: LogEntry[] = []
  private maxEntries: number = 10000

  constructor(options: StructuredLoggerOptions) {
    this.options = {
      serviceName: options.serviceName,
      serviceVersion: options.serviceVersion ?? '1.0.0',
      environment: options.environment ?? 'development',
      minLevel: options.minLevel ?? LogLevel.INFO,
      consoleEnabled: options.consoleEnabled ?? true,
      jsonOutput: options.jsonOutput ?? true,
      transport: options.transport,
    }
  }

  // ============================================
  // Trace Context Management
  // ============================================

  /**
   * 设置追踪上下文
   */
  setTraceContext(traceId: string, spanId?: string, parentSpanId?: string): void {
    this.traceContext = { traceId, spanId, parentSpanId }
  }

  /**
   * 清除追踪上下文
   */
  clearTraceContext(): void {
    this.traceContext = undefined
  }

  /**
   * 获取当前追踪上下文
   */
  getTraceContext(): { traceId: string; spanId?: string; parentSpanId?: string } | undefined {
    return this.traceContext
  }

  // ============================================
  // Logging Methods
  // ============================================

  /**
   * 调试日志
   */
  debug(message: string, fields?: Tags): void {
    this.log(LogLevel.DEBUG, message, fields)
  }

  /**
   * 信息日志
   */
  info(message: string, fields?: Tags): void {
    this.log(LogLevel.INFO, message, fields)
  }

  /**
   * 警告日志
   */
  warn(message: string, fields?: Tags): void {
    this.log(LogLevel.WARN, message, fields)
  }

  /**
   * 错误日志
   */
  error(message: string, errorOrFields?: Error | Tags, fields?: Tags): void {
    let error: Error | undefined
    let extraFields: Tags | undefined

    if (errorOrFields instanceof Error) {
      error = errorOrFields
      extraFields = fields
    } else {
      extraFields = errorOrFields as Tags | undefined
    }

    this.log(LogLevel.ERROR, message, extraFields, error)
  }

  /**
   * 致命错误日志
   */
  fatal(message: string, errorOrFields?: Error | Tags, fields?: Tags): void {
    let error: Error | undefined
    let extraFields: Tags | undefined

    if (errorOrFields instanceof Error) {
      error = errorOrFields
      extraFields = fields
    } else {
      extraFields = errorOrFields as Tags | undefined
    }

    this.log(LogLevel.FATAL, message, extraFields, error)
  }

  /**
   * 核心日志方法
   */
  private log(level: LogLevel, message: string, fields?: Tags, error?: Error): void {
    // 检查日志级别
    if (level < this.options.minLevel) {
      return
    }

    // 构建日志条目
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: this.getLevelName(level),
      message,
    }

    // 添加追踪上下文
    if (this.traceContext) {
      entry.trace = { ...this.traceContext }
    }

    // 添加额外字段
    if (fields && Object.keys(fields).length > 0) {
      entry.fields = fields
    }

    // 添加错误信息
    if (error) {
      entry.error = {
        type: error.constructor.name,
        message: error.message,
        stacktrace: error.stack,
      }
    }

    // 添加服务信息
    entry.service = this.options.serviceName
    entry.environment = this.options.environment
    entry.version = this.options.serviceVersion

    // 存储日志
    this.entries.push(entry)
    if (this.entries.length > this.maxEntries) {
      this.entries.shift()
    }

    // 输出日志
    this.output(entry)
  }

  /**
   * 获取日志级别名称
   */
  private getLevelName(level: LogLevel): string {
    const names = ['debug', 'info', 'warn', 'error', 'fatal']
    return names[level] || 'info'
  }

  /**
   * 输出日志
   */
  private output(entry: LogEntry): void {
    // 控制台输出
    if (this.options.consoleEnabled) {
      if (this.options.jsonOutput) {
        console.log(JSON.stringify(entry))
      } else {
        this.outputHumanReadable(entry)
      }
    }

    // 自定义传输
    if (this.options.transport) {
      Promise.resolve(this.options.transport(entry)).catch(err => {
        console.error('Logger transport error:', err)
      })
    }
  }

  /**
   * 输出人类可读的格式
   */
  private outputHumanReadable(entry: LogEntry): void {
    const parts: string[] = []

    parts.push(`[${entry.timestamp}]`)

    // 级别颜色
    const colors: Record<string, string> = {
      debug: '\x1b[36m',
      info: '\x1b[32m',
      warn: '\x1b[33m',
      error: '\x1b[31m',
      fatal: '\x1b[35m',
    }
    const reset = '\x1b[0m'
    const color = colors[entry.level] || ''
    parts.push(`${color}[${entry.level.toUpperCase()}]${reset}`)

    // 追踪 ID
    if (entry.trace?.traceId) {
      parts.push(`[trace:${entry.trace.traceId.slice(0, 8)}...]`)
    }

    // 消息
    parts.push(entry.message)

    // 字段
    if (entry.fields) {
      const fieldStr = Object.entries(entry.fields)
        .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join(' ')
      parts.push(fieldStr)
    }

    console.log(parts.join(' '))

    // 错误详情
    if (entry.error) {
      console.error(`  Error: ${entry.error.type}: ${entry.error.message}`)
      if (entry.error.stacktrace) {
        console.error(`  Stack: ${entry.error.stacktrace}`)
      }
    }
  }

  // ============================================
  // Query Methods
  // ============================================

  /**
   * 查询日志
   */
  query(filter: LogFilter): LogEntry[] {
    let results = [...this.entries]

    // 按级别过滤
    if (filter.levels && filter.levels.length > 0) {
      const levelNames = filter.levels.map(l => this.getLevelName(l))
      results = results.filter(e => levelNames.includes(e.level))
    }

    // 按消息过滤
    if (filter.message) {
      results = results.filter(e => e.message.includes(filter.message!))
    }
    if (filter.messageRegex) {
      const regex = new RegExp(filter.messageRegex)
      results = results.filter(e => regex.test(e.message))
    }

    // 按追踪 ID 过滤
    if (filter.traceId) {
      results = results.filter(e => e.trace?.traceId === filter.traceId)
    }
    if (filter.spanId) {
      results = results.filter(e => e.trace?.spanId === filter.spanId)
    }

    // 按服务名过滤
    if (filter.serviceName) {
      results = results.filter(e => e.service === filter.serviceName)
    }

    // 按时间范围过滤
    if (filter.timeRange) {
      const start = typeof filter.timeRange.start === 'number'
        ? new Date(filter.timeRange.start).toISOString()
        : typeof filter.timeRange.start === 'string'
          ? filter.timeRange.start
          : filter.timeRange.start.toISOString()
      const end = typeof filter.timeRange.end === 'number'
        ? new Date(filter.timeRange.end).toISOString()
        : typeof filter.timeRange.end === 'string'
          ? filter.timeRange.end
          : filter.timeRange.end.toISOString()
      results = results.filter(e => e.timestamp >= start && e.timestamp <= end)
    }

    // 按是否有错误过滤
    if (filter.hasError !== undefined) {
      results = results.filter(e => filter.hasError ? !!e.error : !e.error)
    }

    // 分页
    if (filter.offset !== undefined) {
      results = results.slice(filter.offset)
    }
    if (filter.limit !== undefined) {
      results = results.slice(0, filter.limit)
    }

    return results
  }

  /**
   * 聚合日志
   */
  aggregate(filter?: LogFilter): LogAggregate[] {
    const entries = filter ? this.query(filter) : this.entries
    const groups = new Map<string, LogAggregate>()

    for (const entry of entries) {
      const key = entry.level
      const existing = groups.get(key)

      if (existing) {
        existing.count++
        existing.lastOccurrence = entry.timestamp
      } else {
        groups.set(key, {
          level: entry.level,
          count: 1,
          firstOccurrence: entry.timestamp,
          lastOccurrence: entry.timestamp,
          sampleMessage: entry.message,
        })
      }
    }

    return Array.from(groups.values())
  }

  /**
   * 获取最近的日志
   */
  getRecent(count: number = 100): LogEntry[] {
    return this.entries.slice(-count)
  }

  /**
   * 按追踪 ID 获取日志
   */
  getByTraceId(traceId: TraceId): LogEntry[] {
    return this.entries.filter(e => e.trace?.traceId === traceId)
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * 创建子日志记录器
   */
  child(options?: Partial<StructuredLoggerOptions>): StructuredLogger {
    const childLogger = new StructuredLogger({
      ...this.options,
      ...options,
    })
    if (this.traceContext) {
      childLogger.setTraceContext(
        this.traceContext.traceId,
        this.traceContext.spanId,
        this.traceContext.parentSpanId
      )
    }
    return childLogger
  }

  /**
   * 设置最小日志级别
   */
  setMinLevel(level: LogLevel): void {
    this.options.minLevel = level
  }

  /**
   * 清除日志
   */
  clear(): void {
    this.entries = []
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    entriesCount: number
    maxEntries: number
  } {
    return {
      entriesCount: this.entries.length,
      maxEntries: this.maxEntries,
    }
  }
}

// ============================================
// Singleton
// ============================================

let defaultLogger: StructuredLogger | undefined

export function getStructuredLogger(): StructuredLogger {
  if (!defaultLogger) {
    throw new Error('StructuredLogger not initialized. Call initStructuredLogger first.')
  }
  return defaultLogger
}

export function initStructuredLogger(options: StructuredLoggerOptions): StructuredLogger {
  defaultLogger = new StructuredLogger(options)
  return defaultLogger
}

/**
 * 创建应用日志记录器的快捷方法
 */
export function createAppLogger(serviceName: string): StructuredLogger {
  return new StructuredLogger({
    serviceName,
    environment: process.env.NODE_ENV || 'development',
    minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  })
}
