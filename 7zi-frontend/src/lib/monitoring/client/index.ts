/**
 * Client-side Performance Monitoring SDK
 * 前端性能监控 SDK - 浏览器端性能数据收集
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB, Metric } from 'web-vitals'

// Export types from types.ts
export * from './types'

// Export hooks
export { usePerformanceMonitor, usePerformanceMonitorWithErrorBoundary } from './usePerformanceMonitor'

/**
 * 默认阈值配置
 */
const DEFAULT_THRESHOLDS = {
  lcp: 2500,
  fid: 100,
  cls: 0.1,
  fcp: 1800,
  ttfb: 800,
  inp: 200,
}

let isInitialized = false
let config: import('./types').ClientMonitoringConfig = {}
let sentryAvailable = false

/**
 * 初始化 Sentry 检测
 */
async function initSentry(): Promise<boolean> {
  try {
    // 动态检查 Sentry 是否可用
    if (typeof window !== 'undefined') {
      // 检查全局 Sentry 对象
      const hasSentry = 'Sentry' in window
      if (hasSentry) {
        const Sentry = (window as unknown as { Sentry: { captureMessage: (msg: string, ctx?: Record<string, unknown>) => void } }).Sentry
        if (Sentry?.captureMessage) {
          sentryAvailable = true
          return true
        }
      }
    }
  } catch {
    // Sentry 不可用
  }
  return false
}

/**
 * 上报性能数据
 */
function report(data: import('./types').PerformanceEventData): void {
  // 调用自定义 reporter
  if (config.reporter) {
    config.reporter(data)
  }

  // 上报到服务器
  if (config.endpoint) {
    // 采样判断
    if (config.sampleRate !== undefined && config.sampleRate < 1) {
      if (Math.random() > config.sampleRate) {
        return
      }
    }

    // 过滤回调
    if (config.beforeReport && !config.beforeReport(data)) {
      return
    }

    // 异步上报，不阻塞主线程
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
      navigator.sendBeacon(config.endpoint, blob)
    } else {
      // 后备方案：使用 fetch
      fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true,
      }).catch(() => {
        // 静默失败
      })
    }
  }

  // 上报到 Sentry
  if (config.reportToSentry && sentryAvailable) {
    try {
      const Sentry = (window as unknown as { Sentry: { captureMessage: (msg: string, ctx?: Record<string, unknown>) => void; addBreadcrumb: (breadcrumb: Record<string, unknown>) => void } }).Sentry

      if (data.type === 'web-vitals') {
        // Web Vitals 数据作为 breadcrumb 上报
        Sentry.addBreadcrumb({
          category: 'performance',
          message: `${data.name}: ${data.value.toFixed(2)}`,
          level: 'info',
          data: data.metadata,
        })
      } else if (data.type === 'error') {
        // 错误直接上报
        Sentry.captureMessage(`[Performance] ${data.name}: ${data.value}`, {
          extra: data.metadata,
        })
      }
    } catch {
      // 静默失败
    }
  }

  // 调试模式输出
  if (config.debug) {
    console.log('[Performance]', data)
  }
}

/**
 * 处理 Web Vitals 指标
 */
function handleWebVitals(metric: Metric): void {
  const webVitalData: import('./types').PerformanceEventData = {
    type: 'web-vitals',
    name: metric.name,
    value: metric.value,
    timestamp: Date.now(),
    metadata: {
      id: metric.id,
      delta: metric.delta,
      rating: metric.rating,
    },
  }

  report(webVitalData)
}

/**
 * 初始化 Core Web Vitals 监控
 */
export function initWebVitalsMonitoring(): void {
  if (isInitialized) {
    if (config.debug) {
      console.warn('[Performance] Monitoring already initialized')
    }
    return
  }

  // 监听所有 Core Web Vitals
  onCLS(handleWebVitals)
  onFCP(handleWebVitals)
  onINP(handleWebVitals)
  onLCP(handleWebVitals)
  onTTFB(handleWebVitals)

  isInitialized = true

  if (config.debug) {
    console.log('[Performance] Web Vitals monitoring initialized')
  }
}

/**
 * 初始化客户端性能监控
 */
export async function initClientMonitoring(
  clientConfig: import('./types').ClientMonitoringConfig = {}
): Promise<void> {
  config = {
    debug: false,
    reportToSentry: true,
    sampleRate: 1,
    ...clientConfig,
    thresholds: {
      ...DEFAULT_THRESHOLDS,
      ...clientConfig.thresholds,
    },
  }

  // 初始化 Sentry 检测
  await initSentry()

  // 初始化 Web Vitals 监控
  initWebVitalsMonitoring()

  // 初始化 JS 错误监控
  initErrorTracking()

  // 初始化 API 请求监控
  initAPIMonitoring()
}

/**
 * 初始化 JS 错误监控
 */
function initErrorTracking(): void {
  if (typeof window === 'undefined') return

  // 监听 unhandled promise rejection
  window.addEventListener('unhandledrejection', (event) => {
    const errorData: import('./types').PerformanceEventData = {
      type: 'error',
      name: 'unhandledrejection',
      value: 0,
      timestamp: Date.now(),
      metadata: {
        reason: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
      },
    }
    report(errorData)
  })

  // 监听 JS 错误
  window.addEventListener('error', (event) => {
    const errorData: import('./types').PerformanceEventData = {
      type: 'error',
      name: 'javascript-error',
      value: 0,
      timestamp: Date.now(),
      metadata: {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack,
      },
    }
    report(errorData)
  })
}

/**
 * 初始化 API 请求监控
 */
function initAPIMonitoring(): void {
  if (typeof window === 'undefined') return

  // 拦截 fetch
  const originalFetch = window.fetch
  window.fetch = async function (...args) {
    const startTime = performance.now()
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url
    const method = args[1]?.method || 'GET'

    try {
      const response = await originalFetch.apply(this, args)
      const duration = performance.now() - startTime

      const apiData: import('./types').PerformanceEventData = {
        type: 'api',
        name: 'fetch',
        value: duration,
        timestamp: Date.now(),
        metadata: {
          url,
          method,
          status: response.status,
          ok: response.ok,
        },
      }
      report(apiData)

      return response
    } catch (error) {
      const duration = performance.now() - startTime

      const apiData: import('./types').PerformanceEventData = {
        type: 'api',
        name: 'fetch',
        value: duration,
        timestamp: Date.now(),
        metadata: {
          url,
          method,
          error: error instanceof Error ? error.message : String(error),
        },
      }
      report(apiData)

      throw error
    }
  }

  // 拦截 XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open
  const originalXHRSend = XMLHttpRequest.prototype.send

  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null
  ) {
    (this as XMLHttpRequest & { _monitoringData?: Record<string, unknown> })._monitoringData = {
      method,
      url: url.toString(),
      startTime: performance.now(),
    }
    return originalXHROpen.apply(this, [method, url, async as boolean, username, password])
  }

  XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
    const monitoringData = (this as XMLHttpRequest & { _monitoringData?: Record<string, unknown> })._monitoringData

    this.addEventListener('loadend', () => {
      if (monitoringData) {
        const duration = performance.now() - (monitoringData.startTime as number)

        const apiData: import('./types').PerformanceEventData = {
          type: 'api',
          name: 'xhr',
          value: duration,
          timestamp: Date.now(),
          metadata: {
            url: monitoringData.url,
            method: monitoringData.method,
            status: this.status,
            ok: this.status >= 200 && this.status < 300,
          },
        }
        report(apiData)
      }
    })

    return originalXHRSend.apply(this, [body])
  }
}

/**
 * 上报自定义事件
 */
export function trackCustomEvent(
  eventName: string,
  value: number = 0,
  metadata?: Record<string, unknown>
): void {
  const customData: import('./types').PerformanceEventData = {
    type: 'custom',
    name: eventName,
    value,
    timestamp: Date.now(),
    metadata,
  }
  report(customData)
}

/**
 * 上报页面加载时间
 */
export function trackPageLoad(pageName: string): void {
  const timing = performance.timing
  const pageLoadTime = timing.loadEventEnd - timing.navigationStart

  const customData: import('./types').PerformanceEventData = {
    type: 'custom',
    name: 'page-load',
    value: pageLoadTime,
    timestamp: Date.now(),
    metadata: {
      page: pageName,
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      domInteractive: timing.domInteractive - timing.navigationStart,
      firstPaint: (performance.getEntriesByType('paint')[0] as PerformancePaintTiming)?.startTime || 0,
    },
  }
  report(customData)
}

/**
 * 获取当前配置
 */
export function getClientConfig(): import('./types').ClientMonitoringConfig {
  return { ...config }
}

/**
 * 检查是否已初始化
 */
export function isMonitoringInitialized(): boolean {
  return isInitialized
}

export default {
  initClientMonitoring,
  trackCustomEvent,
  trackPageLoad,
  getClientConfig,
  isMonitoringInitialized,
}