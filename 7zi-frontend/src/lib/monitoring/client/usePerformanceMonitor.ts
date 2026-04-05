/**
 * usePerformanceMonitor React Hook
 * React 组件性能监控 Hook
 */

import { useEffect, useState, useCallback } from 'react'
import {
  initClientMonitoring,
  trackCustomEvent,
  trackPageLoad,
  getClientConfig,
  isMonitoringInitialized,
  ClientMonitoringConfig,
  PerformanceEventData,
} from './index'

export interface UsePerformanceMonitorOptions extends ClientMonitoringConfig {
  /**
   * 是否自动初始化
   */
  autoInit?: boolean
  /**
   * 页面名称
   */
  pageName?: string
}

export interface UsePerformanceMonitorReturn {
  /**
   * 是否已初始化
   */
  isInitialized: boolean
  /**
   * 当前配置
   */
  config: ClientMonitoringConfig | null
  /**
   * 上报自定义事件
   */
  trackEvent: (name: string, value?: number, metadata?: Record<string, unknown>) => void
  /**
   * 上报页面加载
   */
  trackPage: (name?: string) => void
  /**
   * 手动初始化
   */
  init: (config?: ClientMonitoringConfig) => Promise<void>
  /**
   * 性能指标状态
   */
  metrics: {
    cls: number | null
    fcp: number | null
    inp: number | null
    lcp: number | null
    ttfb: number | null
  }
}

/**
 * React Hook for Performance Monitoring
 * 
 * @example
 * ```tsx
 * import { usePerformanceMonitor } from '@/lib/monitoring/client'
 * 
 * function MyComponent() {
 *   const { trackEvent, metrics } = usePerformanceMonitor({
 *     autoInit: true,
 *     pageName: 'my-page',
 *     endpoint: '/api/metrics',
 *   })
 * 
 *   const handleClick = () => {
 *     trackEvent('button_click', 0, { buttonId: 'my-button' })
 *   }
 * 
 *   return (
 *     <div>
 *       <p>LCP: {metrics.lcp}ms</p>
 *       <button onClick={handleClick}>Click me</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function usePerformanceMonitor(
  options: UsePerformanceMonitorOptions = {}
): UsePerformanceMonitorReturn {
  const {
    autoInit = true,
    pageName,
    ...clientConfig
  } = options

  const [initialized, setInitialized] = useState(false)
  const [config, setConfig] = useState<ClientMonitoringConfig | null>(null)
  const [metrics, setMetrics] = useState({
    cls: null as number | null,
    fcp: null as number | null,
    inp: null as number | null,
    lcp: null as number | null,
    ttfb: null as number | null,
  })

  // 存储事件监听器
  const [listeners] = useState<Set<(data: PerformanceEventData) => void>>(() => new Set())

  // 初始化监控
  const init = useCallback(async (initConfig?: ClientMonitoringConfig) => {
    if (isMonitoringInitialized()) {
      setInitialized(true)
      setConfig(getClientConfig())
      return
    }

    // 添加自定义 reporter 来收集指标数据
    const finalConfig: ClientMonitoringConfig = {
      ...clientConfig,
      ...initConfig,
      reporter: (data: PerformanceEventData) => {
        if (data.type === 'web-vitals') {
          setMetrics(prev => ({
            ...prev,
            [data.name.toLowerCase()]: data.value,
          }))
        }
        // 调用用户自定义 reporter
        clientConfig.reporter?.(data)
      },
    }

    await initClientMonitoring(finalConfig)
    setInitialized(true)
    setConfig(getClientConfig())

    // 上报页面加载
    if (pageName) {
      trackPageLoad(pageName)
    }
  }, [clientConfig, pageName])

  // 自动初始化
  useEffect(() => {
    if (autoInit && !initialized) {
      init()
    }
  }, [autoInit, initialized, init])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      listeners.clear()
    }
  }, [listeners])

  // 上报自定义事件
  const trackEvent = useCallback((
    name: string,
    value: number = 0,
    metadata?: Record<string, unknown>
  ) => {
    trackCustomEvent(name, value, metadata)
  }, [])

  // 上报页面加载
  const trackPage = useCallback((name?: string) => {
    trackPageLoad(name || pageName || 'unknown')
  }, [pageName])

  return {
    isInitialized: initialized,
    config,
    trackEvent,
    trackPage,
    init,
    metrics,
  }
}

/**
 * 带错误边界的性能监控 Hook
 * 自动捕获 React 组件错误
 */
export function usePerformanceMonitorWithErrorBoundary(
  options: UsePerformanceMonitorOptions = {}
) {
  const monitor = usePerformanceMonitor(options)

  // 监听组件错误
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleError = (event: ErrorEvent) => {
      monitor.trackEvent('react-error', 0, {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
      })
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      monitor.trackEvent('react-unhandled-rejection', 0, {
        reason: event.reason?.message || String(event.reason),
      })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [monitor])

  return monitor
}

export default usePerformanceMonitor
