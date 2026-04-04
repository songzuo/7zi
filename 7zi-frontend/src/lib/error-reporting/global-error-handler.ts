/**
 * Global Error Handler Initialization
 * 全局错误处理初始化模块 - 统一初始化所有错误处理功能
 */

import { errorReporting, initErrorReporting, reportError } from './error-reporting'
import { errorLogHistory, initErrorLogHistory, addErrorLog } from './error-log-history'
import { logger } from '../logger'

/**
 * 全局错误处理配置
 */
export interface GlobalErrorHandlerConfig {
  /**
   * 是否启用错误上报
   * @default true
   */
  enableReporting: boolean

  /**
   * 是否启用错误日志历史
   * @default true
   */
  enableLogHistory: boolean

  /**
   * 错误上报配置
   */
  reportingConfig?: {
    sampleRate?: number
    bufferSize?: number
    flushInterval?: number
    endpoint?: string
  }

  /**
   * 错误日志历史配置
   */
  logHistoryConfig?: {
    maxEntries?: number
    autoCleanupDays?: number
  }

  /**
   * 是否捕获未处理的 Promise 拒绝
   * @default true
   */
  captureUnhandledRejections: boolean

  /**
   * 是否捕获资源加载错误
   * @default true
   */
  captureResourceErrors: boolean

  /**
   * 是否捕获网络错误
   * @default true
   */
  captureNetworkErrors: boolean

  /**
   * 是否在控制台显示错误
   * @default process.env.NODE_ENV === 'development'
   */
  showErrorsInConsole: boolean
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: GlobalErrorHandlerConfig = {
  enableReporting: true,
  enableLogHistory: true,
  captureUnhandledRejections: true,
  captureResourceErrors: true,
  captureNetworkErrors: true,
  showErrorsInConsole: process.env.NODE_ENV === 'development',
}

/**
 * 全局错误处理器
 */
export class GlobalErrorHandler {
  private config: GlobalErrorHandlerConfig
  private initialized = false

  constructor(config: Partial<GlobalErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 初始化全局错误处理
   */
  init(): void {
    if (this.initialized) {
      logger.warn('Global error handler already initialized')
      return
    }

    // 初始化错误上报服务
    if (this.config.enableReporting) {
      initErrorReporting(this.config.reportingConfig)
      logger.info('Error reporting initialized')
    }

    // 初始化错误日志历史
    if (this.config.enableLogHistory) {
      initErrorLogHistory(this.config.logHistoryConfig)
      logger.info('Error log history initialized')
    }

    // 设置全局错误处理器
    if (typeof window !== 'undefined') {
      this.setupGlobalErrorHandlers()
    }

    this.initialized = true
    logger.info('Global error handler initialized', { config: this.config })
  }

  /**
   * 设置全局错误处理器
   */
  private setupGlobalErrorHandlers(): void {
    const window = globalThis.window

    // 1. 捕获 JavaScript 错误
    window.addEventListener('error', (event) => {
      this.handleError({
        type: 'JavaScriptError',
        message: event.message,
        error: event.error,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      })

      // 阻止默认行为（显示错误控制台）
      if (!this.config.showErrorsInConsole) {
        event.preventDefault()
      }
    })

    // 2. 捕获未处理的 Promise 拒绝
    if (this.config.captureUnhandledRejections) {
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError({
          type: 'UnhandledPromiseRejection',
          message: event.reason?.message || String(event.reason),
          error: event.reason instanceof Error ? event.reason : undefined,
          severity: 'high',
          context: {
            promise: 'unhandled',
          },
        })
      })
    }

    // 3. 捕获资源加载错误
    if (this.config.captureResourceErrors) {
      window.addEventListener('error', (event) => {
        if (event.target !== window && event.target instanceof HTMLElement) {
          const target = event.target as HTMLElement & { src?: string; href?: string }
          const resourceUrl = target.src || target.href

          if (resourceUrl) {
            this.handleError({
              type: 'ResourceLoadError',
              message: `Failed to load resource: ${resourceUrl}`,
              severity: 'low',
              category: 'resource',
              context: {
                tagName: target.tagName,
                src: target.src,
                href: target.href,
              },
            })
          }
        }
      }, true)
    }

    // 4. 捕获网络错误（通过覆盖 fetch）
    if (this.config.captureNetworkErrors) {
      this.setupNetworkErrorTracking()
    }
  }

  /**
   * 设置网络错误跟踪
   */
  private setupNetworkErrorTracking(): void {
    if (typeof window === 'undefined' || typeof fetch === 'undefined') return

    const originalFetch = window.fetch

    window.fetch = async (...args) => {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url

      try {
        const response = await originalFetch(...args)

        // 捕获 4xx/5xx 错误
        if (!response.ok) {
          this.handleError({
            type: 'NetworkError',
            message: `HTTP ${response.status}: ${response.statusText}`,
            severity: response.status >= 500 ? 'high' : 'medium',
            category: 'network',
            context: {
              url,
              status: response.status,
              statusText: response.statusText,
            },
          })
        }

        return response
      } catch (error) {
        // 捕获网络错误
        this.handleError({
          type: 'NetworkError',
          message: error instanceof Error ? error.message : String(error),
          severity: 'high',
          category: 'network',
          context: {
            url,
            error: error instanceof Error ? error.message : String(error),
          },
        })

        throw error
      }
    }

    // 覆盖 XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open
    const originalXHRSend = XMLHttpRequest.prototype.send

    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      ...rest: unknown[]
    ) {
      (this as XMLHttpRequest & { _url?: string })._url = url.toString()
      return originalXHROpen.apply(this, [method, url, ...rest] as Parameters<typeof originalXHROpen>)
    }

    XMLHttpRequest.prototype.send = function (...args: unknown[]) {
      this.addEventListener('error', () => {
        const url = (this as XMLHttpRequest & { _url?: string })._url
        this.handleError?.({
          type: 'NetworkError',
          message: 'XMLHttpRequest failed',
          severity: 'high',
          category: 'network',
          context: {
            url,
            status: this.status,
            statusText: this.statusText,
          },
        })
      })

      this.addEventListener('load', () => {
        const url = (this as XMLHttpRequest & { _url?: string })._url
        if (this.status >= 400) {
          this.handleError?.({
            type: 'NetworkError',
            message: `HTTP ${this.status}: ${this.statusText}`,
            severity: this.status >= 500 ? 'high' : 'medium',
            category: 'network',
            context: {
              url,
              status: this.status,
              statusText: this.statusText,
            },
          })
        }
      })

      return originalXHRSend.apply(this, args as Parameters<typeof originalXHRSend>)
    }
  }

  /**
   * 处理错误
   */
  private handleError(options: {
    type: string
    message: string
    error?: Error
    severity?: 'low' | 'medium' | 'high' | 'critical'
    category?: string
    context?: Record<string, unknown>
  }): void {
    const {
      type,
      message,
      error,
      severity = 'medium',
      category = 'javascript',
      context = {},
    } = options

    // 添加到错误日志历史
    if (this.config.enableLogHistory) {
      addErrorLog(
        type,
        message,
        severity,
        category,
        {
          ...context,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          url: typeof location !== 'undefined' ? location.href : undefined,
        }
      )
    }

    // 上报错误
    if (this.config.enableReporting) {
      reportError(error || message, {
        ...context,
        category,
      })
    }

    // 控制台输出
    if (this.config.showErrorsInConsole || process.env.NODE_ENV === 'development') {
      logger.error(`[Global Error] ${type}: ${message}`, error, context)
    }
  }

  /**
   * 手动报告错误
   */
  async report(error: Error | string, context?: Record<string, unknown>): Promise<void> {
    this.handleError({
      type: error instanceof Error ? error.name : 'ManualError',
      message: error instanceof Error ? error.message : String(error),
      error: error instanceof Error ? error : undefined,
      context: context || {},
    })
  }

  /**
   * 获取错误日志历史
   */
  getLogHistory() {
    return errorLogHistory
  }

  /**
   * 获取错误上报服务
   */
  getReporting() {
    return errorReporting
  }
}

// 默认实例
export const globalErrorHandler = new GlobalErrorHandler()

/**
 * 初始化全局错误处理（便捷函数）
 */
export function initGlobalErrorHandler(config?: Partial<GlobalErrorHandlerConfig>): GlobalErrorHandler {
  if (config) {
    Object.assign(globalErrorHandler['config'], config)
  }
  globalErrorHandler.init()
  return globalErrorHandler
}

// 导出
export default {
  GlobalErrorHandler,
  globalErrorHandler,
  initGlobalErrorHandler,
  errorReporting,
  errorLogHistory,
  reportError,
  addErrorLog,
}
