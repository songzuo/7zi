/**
 * StructuredLogger - 结构化日志记录器
 *
 * 功能：
 * - 自动注入 traceId 到日志
 * - 支持 info, warn, error 级别
 * - JSON 格式输出
 * - 日志关联增强 - 同一 trace 的日志可以被过滤
 *
 * @version v1.7.0
 * @author AI Executor
 */

import type { TraceId, SpanId, TraceContext } from '../tracing/types'

// ============================================
// Log Levels
// ============================================

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

/**
 * 日志级别名称映射
 */
export const LogLevelNames: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'debug',
  [LogLevel.INFO]: 'info',
  [LogLevel.WARN]: 'warn',
  [LogLevel.ERROR]: 'error',
  [LogLevel.FATAL]: 'fatal',
}

// ============================================
// Log Entry
// ============================================

/**
 * 日志条目
 */
export interface LogEntry {
  /** 时间戳 (ISO 8601 格式) */
  timestamp: string
  /** 日志级别 */
  level: string
  /** 日志消息 */
  message: string
  /** 追踪上下文 */
  trace?: TraceContextFields
  /** 额外字段 */
  fields?: Record<string, unknown>
  /** 错误信息 */
  error?: LogError
  /** 来源服务 */
  service?: string
  /** 环境 */
  environment?: string
  /** 版本 */
  version?: string
}

/**
 * 追踪上下文字段 (精简版)
 */
export interface TraceContextFields {
  /** Trace ID */
  traceId: string
  /** Span ID */
  spanId?: string
  /** 父 Span ID */
  parentSpanId?: string
}

/**
 * 错误信息
 */
export interface LogError {
  /** 错误类型 */
  type: string
  /** 错误消息 */
  message: string
  /** 错误堆栈 */
  stacktrace?: string
  /** 错误原因 */
  cause?: string
}

// ============================================
// Logger Options
// ============================================

export interface StructuredLoggerOptions {
  /** 服务名称 */
  serviceName: string
  /** 服务版本 */
  serviceVersion?: string
  /** 环境 */
  environment?: string
  /** 最小日志级别 */
  minLevel?: LogLevel
  /** 是否输出到控制台 */
  consoleEnabled?: boolean
  /** 是否输出 JSON 格式 */
  jsonOutput?: boolean
  /** 自定义传输函数 */
  transport?: (entry: LogEntry) => void | Promise<void> | undefined
  /** 是否自动添加 timestamp */
  addTimestamp?: boolean
  /** 是否包含服务信息 */
  includeServiceInfo?: boolean
}

// ============================================
// Default Options
// ============================================

const defaultOptions: Required<Omit<StructuredLoggerOptions, 'transport'>> & {
  transport?: (entry: LogEntry) => void | Promise<void> | undefined
} = {
  serviceName: 'unknown',
  serviceVersion: '1.0.0',
  environment: 'development',
  minLevel: LogLevel.INFO,
  consoleEnabled: true,
  jsonOutput: true,
  transport: undefined,
  addTimestamp: true,
  includeServiceInfo: true,
}

// ============================================
// Logger Implementation
// ============================================

/**
 * StructuredLogger - 结构化日志记录器
 *
 * 使用示例:
 * ```typescript
 * const logger = new StructuredLogger({
 *   serviceName: 'agent-executor',
 *   environment: 'production'
 * });
 *
 * // 设置追踪上下文
 * logger.setTraceContext('abc123', 'span-456');
 *
 * // 记录日志
 * logger.info('Task started', { taskId: '123' });
 * logger.warn('Task pending', { waitTime: 5000 });
 * logger.error('Task failed', { error: new Error('timeout') });
 *
 * // 清除追踪上下文
 * logger.clearTraceContext();
 * ```
 */
export class StructuredLogger {
  private options: Required<Omit<StructuredLoggerOptions, 'transport'>> & {
    transport?: (entry: LogEntry) => void | Promise<void> | undefined
  }
  private traceContext: TraceContextFields | undefined

  constructor(options: StructuredLoggerOptions) {
    this.options = { ...defaultOptions, ...options } as typeof this.options
  }

  // ============================================
  // Trace Context Management
  // ============================================

  /**
   * 设置追踪上下文
   * 调用后，所有日志都会自动包含 traceId
   */
  setTraceContext(traceId: string, spanId?: string, parentSpanId?: string): void {
    this.traceContext = {
      traceId,
      spanId,
      parentSpanId,
    }
  }

  /**
   * 从 TraceManager 设置追踪上下文
   */
  setFromTraceManager(traceId: TraceId, spanId?: SpanId, parentSpanId?: SpanId): void {
    this.traceContext = {
      traceId,
      spanId,
      parentSpanId,
    }
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
  getTraceContext(): TraceContextFields | undefined {
    return this.traceContext
  }

  /**
   * 检查是否有追踪上下文
   */
  hasTraceContext(): boolean {
    return !!this.traceContext
  }

  // ============================================
  // Logging Methods
  // ============================================

  /**
   * 调试日志
   */
  debug(message: string, fields?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, fields)
  }

  /**
   * 信息日志
   */
  info(message: string, fields?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, fields)
  }

  /**
   * 警告日志
   */
  warn(message: string, fields?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, fields)
  }

  /**
   * 错误日志
   */
  error(message: string, fields?: Record<string, unknown>): void
  error(message: string, error: Error, fields?: Record<string, unknown>): void
  error(
    message: string,
    errorOrFields?: Error | Record<string, unknown>,
    fields?: Record<string, unknown>
  ): void {
    let error: Error | undefined
    let extraFields: Record<string, unknown> | undefined

    if (errorOrFields instanceof Error) {
      error = errorOrFields
      extraFields = fields
    } else {
      extraFields = errorOrFields
    }

    this.log(LogLevel.ERROR, message, extraFields, error)
  }

  /**
   * 致命错误日志
   */
  fatal(message: string, fields?: Record<string, unknown>): void
  fatal(message: string, error: Error, fields?: Record<string, unknown>): void
  fatal(
    message: string,
    errorOrFields?: Error | Record<string, unknown>,
    fields?: Record<string, unknown>
  ): void {
    let error: Error | undefined
    let extraFields: Record<string, unknown> | undefined

    if (errorOrFields instanceof Error) {
      error = errorOrFields
      extraFields = fields
    } else {
      extraFields = errorOrFields
    }

    this.log(LogLevel.FATAL, message, extraFields, error)
  }

  /**
   * 核心日志方法
   */
  private log(
    level: LogLevel,
    message: string,
    fields?: Record<string, unknown>,
    error?: Error
  ): void {
    // 检查日志级别
    if (level < this.options.minLevel) {
      return
    }

    // 构建日志条目
    const entry: LogEntry = {
      timestamp: this.options.addTimestamp ? new Date().toISOString() : '',
      level: LogLevelNames[level],
      message,
    }

    // 添加追踪上下文
    if (this.traceContext) {
      entry.trace = { ...this.traceContext }
    }

    // 添加额外字段
    if (fields && Object.keys(fields).length > 0) {
      // 过滤掉 undefined 和函数
      const filteredFields: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined && typeof value !== 'function') {
          filteredFields[key] = value
        }
      }
      if (Object.keys(filteredFields).length > 0) {
        entry.fields = filteredFields
      }
    }

    // 添加错误信息
    if (error) {
      entry.error = {
        type: error.constructor.name,
        message: error.message,
        stacktrace: error.stack,
      }

      // 如果有 cause，添加
      if ('cause' in error && error.cause) {
        entry.error.cause = error.cause instanceof Error ? error.cause.message : String(error.cause)
      }
    }

    // 添加服务信息
    if (this.options.includeServiceInfo) {
      entry.service = this.options.serviceName
      entry.version = this.options.serviceVersion
      entry.environment = this.options.environment
    }

    // 输出日志
    this.output(entry)
  }

  /**
   * 输出日志
   */
  private output(entry: LogEntry): void {
    // 控制台输出
    if (this.options.consoleEnabled) {
      if (this.options.jsonOutput) {
        // JSON 格式输出
        console.log(JSON.stringify(entry))
      } else {
        // 人类可读格式
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

    // 时间戳
    if (entry.timestamp) {
      parts.push(`[${entry.timestamp}]`)
    }

    // 级别 (带颜色)
    const levelColors: Record<string, string> = {
      debug: '\x1b[36m', // 青色
      info: '\x1b[32m', // 绿色
      warn: '\x1b[33m', // 黄色
      error: '\x1b[31m', // 红色
      fatal: '\x1b[35m', // 洋红
    }
    const reset = '\x1b[0m'
    const color = levelColors[entry.level] || ''
    parts.push(`${color}[${entry.level.toUpperCase()}]$${reset}`)

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

    // 错误
    if (entry.error) {
      parts.push(`\n  Error: ${entry.error.type}: ${entry.error.message}`)
      if (entry.error.stacktrace) {
        parts.push(`\n  Stack: ${entry.error.stacktrace}`)
      }
    }

    console.log(parts.join(' '))
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * 创建子日志记录器 (继承配置)
   */
  child(options?: Partial<StructuredLoggerOptions>): StructuredLogger {
    return new StructuredLogger({
      ...this.options,
      ...options,
    })
  }

  /**
   * 设置最小日志级别
   */
  setMinLevel(level: LogLevel): void {
    this.options.minLevel = level
  }

  /**
   * 启用调试模式
   */
  enableDebug(): void {
    this.options.minLevel = LogLevel.DEBUG
  }

  /**
   * 禁用调试模式
   */
  disableDebug(): void {
    this.options.minLevel = LogLevel.INFO
  }

  /**
   * 设置传输函数
   */
  setTransport(transport: (entry: LogEntry) => void | Promise<void>): void {
    this.options.transport = transport
  }

  /**
   * 设置环境
   */
  setEnvironment(environment: string): void {
    this.options.environment = environment
  }

  // ============================================
  // Filtering Support
  // ============================================

  /**
   * 创建带过滤条件的日志函数
   * 可以用于在日志分析工具中过滤同一 trace 的日志
   */
  createFilteredLogger(filter: (entry: LogEntry) => boolean): StructuredLogger {
    const originalTransport = this.options.transport

    const filteredTransport = (entry: LogEntry) => {
      if (filter(entry) && originalTransport) {
        return originalTransport(entry)
      }
    }

    return this.child({ transport: filteredTransport })
  }

  /**
   * 创建按 traceId 过滤的日志记录器
   */
  createTraceFilteredLogger(traceId: string): StructuredLogger {
    return this.createFilteredLogger(entry => {
      return entry.trace?.traceId === traceId
    })
  }

  // ============================================
  // Static Methods
  // ============================================

  /**
   * 创建日志记录器的快捷方法
   */
  static create(options: StructuredLoggerOptions): StructuredLogger {
    return new StructuredLogger(options)
  }

  /**
   * 创建带追踪上下文的日志记录器
   */
  static createWithTrace(
    options: StructuredLoggerOptions,
    traceId: string,
    spanId?: string
  ): StructuredLogger {
    const logger = new StructuredLogger(options)
    logger.setTraceContext(traceId, spanId)
    return logger
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * 创建应用日志记录器
 */
export function createAppLogger(serviceName: string): StructuredLogger {
  return new StructuredLogger({
    serviceName,
    environment: process.env.NODE_ENV || 'development',
    serviceVersion: process.env.APP_VERSION || '1.0.0',
    minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  })
}

/**
 * 创建 Agent 日志记录器
 */
export function createAgentLogger(agentId: string): StructuredLogger {
  return new StructuredLogger({
    serviceName: `agent-${agentId}`,
    environment: process.env.NODE_ENV || 'development',
    serviceVersion: '1.7.0',
    minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  })
}

// ============================================
// Re-exports
// ============================================

export type { TraceContext }
export { LogLevel as level }
