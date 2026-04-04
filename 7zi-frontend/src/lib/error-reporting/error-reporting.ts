/**
 * Error Reporting Service
 * 错误上报服务 - 统一的错误收集和上报机制
 */

import { monitor } from '../monitoring'

/**
 * 错误严重级别
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

/**
 * 错误分类
 */
export type ErrorCategory =
  | 'javascript'
  | 'network'
  | 'api'
  | 'resource'
  | 'rendering'
  | 'performance'
  | 'security'
  | 'other'

/**
 * 错误报告接口
 */
export interface ErrorReport {
  id: string
  timestamp: number
  type: string
  message: string
  severity: ErrorSeverity
  category: ErrorCategory
  stack?: string
  context: Record<string, any>
  userAgent?: string
  url?: string
  userId?: string
  sessionId?: string
}

/**
 * 错误报告配置
 */
export interface ErrorReportingConfig {
  enabled: boolean
  sampleRate: number // 采样率 0-1
  bufferSize: number // 缓冲区大小
  flushInterval: number // 上报间隔 (ms)
  endpoint?: string // 自定义上报端点
  beforeSend?: (report: ErrorReport) => ErrorReport | null
  onError?: (error: Error, report: ErrorReport) => void
}

/**
 * 错误上报服务
 */
export class ErrorReportingService {
  private config: ErrorReportingConfig
  private errorBuffer: ErrorReport[] = []
  private flushTimer?: ReturnType<typeof setInterval>
  private sessionId: string

  constructor(config: Partial<ErrorReportingConfig> = {}) {
    this.config = {
      enabled: true,
      sampleRate: 1.0,
      bufferSize: 100,
      flushInterval: 10000, // 10秒
      ...config,
    }

    this.sessionId = this.generateSessionId()
  }

  /**
   * 生成会话 ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 初始化
   */
  init(): void {
    if (!this.config.enabled) return

    // 启动定期上报
    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.config.flushInterval)

    // 监听全局错误
    if (typeof window !== 'undefined') {
      this.setupGlobalErrorHandlers()
    }
  }

  /**
   * 设置全局错误处理器
   */
  private setupGlobalErrorHandlers(): void {
    // JavaScript 错误
    window.addEventListener('error', (event) => {
      this.reportError(
        'JavaScriptError',
        event.message,
        event.error?.stack,
        'javascript',
        'high',
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        }
      )
    })

    // Promise 错误
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError(
        'UnhandledPromiseRejection',
        event.reason?.message || String(event.reason),
        event.reason?.stack,
        'javascript',
        'medium',
        { promise: 'unhandled' }
      )
    })

    // 资源加载错误
    window.addEventListener('error', (event) => {
      if (event.target !== window && event.target instanceof HTMLElement) {
        const target = event.target as any
        this.reportError(
          'ResourceLoadError',
          `Failed to load: ${target.src || target.href}`,
          undefined,
          'resource',
          'low',
          {
            tagName: target.tagName,
            src: target.src,
            href: target.href,
          }
        )
      }
    }, true)
  }

  /**
   * 报告错误
   */
  async reportError(
    type: string,
    message: string,
    stack?: string,
    category: ErrorCategory = 'other',
    severity: ErrorSeverity = 'medium',
    context: Record<string, any> = {}
  ): Promise<void> {
    if (!this.config.enabled) return

    // 采样检查
    if (Math.random() > this.config.sampleRate) return

    const report: ErrorReport = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      message,
      severity,
      category,
      stack,
      context,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      sessionId: this.sessionId,
    }

    // 调用 beforeSend 钩子
    let finalReport = report
    if (this.config.beforeSend) {
      finalReport = this.config.beforeSend(report)
      if (!finalReport) return
    }

    // 添加到缓冲区
    this.errorBuffer.push(finalReport)

    // 缓冲区满时立即上报
    if (this.errorBuffer.length >= this.config.bufferSize) {
      await this.flush()
    }

    // 同时上报到监控系统
    await monitor.trackError(type, message, stack, context)
  }

  /**
   * 报告 JavaScript 错误
   */
  async reportJavaScriptError(
    error: Error,
    context: Record<string, any> = {}
  ): Promise<void> {
    return this.reportError(
      error.name,
      error.message,
      error.stack,
      'javascript',
      'high',
      context
    )
  }

  /**
   * 报告 API 错误
   */
  async reportAPIError(
    endpoint: string,
    statusCode: number,
    errorMessage: string,
    context: Record<string, any> = {}
  ): Promise<void> {
    const severity = statusCode >= 500 ? 'critical' : statusCode >= 400 ? 'medium' : 'low'
    return this.reportError(
      'APIError',
      `${errorMessage} (${statusCode})`,
      undefined,
      'api',
      severity,
      { endpoint, statusCode, ...context }
    )
  }

  /**
   * 报告性能错误
   */
  async reportPerformanceError(
    metricName: string,
    currentValue: number,
    threshold: number,
    context: Record<string, any> = {}
  ): Promise<void> {
    return this.reportError(
      'PerformanceError',
      `${metricName} exceeded threshold: ${currentValue} > ${threshold}`,
      undefined,
      'performance',
      'medium',
      { metricName, currentValue, threshold, ...context }
    )
  }

  /**
   * 刷新缓冲区（上报所有错误）
   */
  private async flush(): Promise<void> {
    if (this.errorBuffer.length === 0) return

    const reports = [...this.errorBuffer]
    this.errorBuffer = []

    try {
      // 发送到监控系统
      for (const report of reports) {
        await monitor.trackError(
          report.type,
          report.message,
          report.stack,
          report.context
        )
      }

      // 发送到自定义端点（如果配置）
      if (this.config.endpoint && typeof fetch !== 'undefined') {
        await fetch(this.config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ errors: reports }),
        })
      }
    } catch (error) {
      console.error('[ErrorReporting] Failed to flush errors:', error)

      // 重新添加到缓冲区
      this.errorBuffer.unshift(...reports)

      // 调用错误回调
      if (this.config.onError) {
        this.config.onError(error instanceof Error ? error : new Error(String(error)), reports[0])
      }
    }
  }

  /**
   * 手动刷新
   */
  async manualFlush(): Promise<void> {
    await this.flush()
  }

  /**
   * 获取缓冲区大小
   */
  getBufferSize(): number {
    return this.errorBuffer.length
  }

  /**
   * 清除缓冲区
   */
  clearBuffer(): void {
    this.errorBuffer = []
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ErrorReportingConfig>): void {
    this.config = { ...this.config, ...config }

    // 如果修改了上报间隔，重启定时器
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = setInterval(() => {
        this.flush()
      }, this.config.flushInterval)
    }
  }

  /**
   * 停止
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = undefined
    }

    // 上报剩余错误
    this.flush()
  }
}

// 默认实例
export const errorReporting = new ErrorReportingService()

/**
 * 初始化错误上报服务
 */
export function initErrorReporting(config?: Partial<ErrorReportingConfig>): ErrorReportingService {
  if (config) {
    errorReporting.updateConfig(config)
  }
  errorReporting.init()
  return errorReporting
}

/**
 * 报告错误的便捷函数
 */
export async function reportError(
  error: Error | string,
  context?: Record<string, any>
): Promise<void> {
  if (typeof error === 'string') {
    await errorReporting.reportError('Error', error, undefined, 'other', 'medium', context || {})
  } else {
    await errorReporting.reportJavaScriptError(error, context || {})
  }
}

/**
 * 报告 API 错误的便捷函数
 */
export async function reportAPIError(
  endpoint: string,
  statusCode: number,
  errorMessage: string,
  context?: Record<string, any>
): Promise<void> {
  await errorReporting.reportAPIError(endpoint, statusCode, errorMessage, context || {})
}
