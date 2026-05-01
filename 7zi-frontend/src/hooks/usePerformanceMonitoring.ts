/**
 * Performance Monitoring Hook
 * 性能监控 Hook - 在客户端初始化和管理性能监控
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { webVitalsMonitor, initWebVitalsMonitoring, WebVitalsConfig } from '@/lib/performance/web-vitals'
import { customMetricsTracker, initCustomMetricsTracking } from '@/lib/performance/custom-metrics'
import { budgetManager, initPerformanceBudget, PerformanceBudget, PerformanceBudgetReport } from '@/lib/performance/budget-manager'
import { monitor } from '@/lib/monitoring'
import type { WebVitalsMetrics, CustomMetrics } from '@/lib/performance'

/**
 * 性能监控配置
 */
export interface UsePerformanceMonitoringOptions {
  enableWebVitals?: boolean
  enableCustomMetrics?: boolean
  enableBudget?: boolean
  webVitalsConfig?: Partial<WebVitalsConfig>
  budgetConfig?: Partial<PerformanceBudget>
}

/**
 * 性能监控状态
 */
export interface PerformanceMonitoringState {
  isInitialized: boolean
  webVitalsReady: boolean
  customMetricsReady: boolean
  budgetReady: boolean
}

/**
 * 性能监控 Hook
 */
export function usePerformanceMonitoring(
  options: UsePerformanceMonitoringOptions = {}
): PerformanceMonitoringState {
  const {
    enableWebVitals = true,
    enableCustomMetrics = true,
    enableBudget = true,
    webVitalsConfig,
    budgetConfig,
  } = options

  const [state, setState] = useState<PerformanceMonitoringState>({
    isInitialized: false,
    webVitalsReady: false,
    customMetricsReady: false,
    budgetReady: false,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const init = async () => {
      try {
        // 初始化 Web Vitals
        if (enableWebVitals) {
          initWebVitalsMonitoring(webVitalsConfig)
          setState(prev => ({ ...prev, webVitalsReady: true }))
        }

        // 初始化自定义指标追踪
        if (enableCustomMetrics) {
          initCustomMetricsTracking()
          setState(prev => ({ ...prev, customMetricsReady: true }))
        }

        // 初始化性能预算管理
        if (enableBudget) {
          initPerformanceBudget(budgetConfig)

          // 启动定期告警检查
          budgetManager.startPeriodicCheck(
            () => webVitalsMonitor.getMetrics(),
            () => customMetricsTracker.getMetrics(),
            30000
          )

          setState(prev => ({ ...prev, budgetReady: true }))
        }

        setState(prev => ({ ...prev, isInitialized: true }))
      } catch (error) {
        logger.error('[PerformanceMonitoring] Initialization failed:', error)

        // 上报初始化错误
        await monitor.trackError(
          'PerformanceMonitoringInitError',
          `Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error.stack : undefined
        )
      }
    }

    init()

    // 清理函数
    return () => {
      if (enableBudget) {
        budgetManager.stopPeriodicCheck()
      }
      if (enableCustomMetrics) {
        customMetricsTracker.stop()
      }
    }
  }, [enableWebVitals, enableCustomMetrics, enableBudget, webVitalsConfig, budgetConfig])

  return state
}

/**
 * 获取性能指标的 Hook
 */
export function usePerformanceMetrics() {
  const [webVitals, setWebVitals] = useState<WebVitalsMetrics>({})
  const [customMetrics, setCustomMetrics] = useState<CustomMetrics>({})

  useEffect(() => {
    const updateMetrics = () => {
      setWebVitals(webVitalsMonitor.getMetrics())
      setCustomMetrics(customMetricsTracker.getMetrics())
    }

    updateMetrics()
    const interval = setInterval(updateMetrics, 5000)

    return () => clearInterval(interval)
  }, [])

  return { webVitals, customMetrics }
}

/**
 * 手动记录自定义指标的 Hook
 */
export function useCustomMetrics() {
  const recordApiMetric = useCallback(
    async (endpoint: string, responseTime: number, statusCode: number) => {
      await monitor.trackAPIRequest(
        statusCode >= 200 && statusCode < 300 ? 'GET' : 'GET',
        endpoint,
        statusCode,
        responseTime
      )

      customMetricsTracker.recordResponseTime(responseTime, { endpoint, statusCode })

      if (statusCode >= 400) {
        customMetricsTracker.recordError(endpoint, statusCode)
      }
    },
    []
  )

  const recordError = useCallback(async (error: Error, context?: Record<string, any>) => {
    await monitor.trackError(
      error.name,
      error.message,
      error.stack,
      context
    )
  }, [])

  const recordCustomMetric = useCallback(
    async (name: string, value: number, unit: string, metadata?: Record<string, any>) => {
      await monitor.trackCustomMetric(name, value, unit, metadata)
    },
    []
  )

  return {
    recordApiMetric,
    recordError,
    recordCustomMetric,
  }
}

/**
 * WebSocket 性能监控 Hook
 */
export function useWebSocketPerformance(ws: WebSocket | null) {
  useEffect(() => {
    if (!ws) return

    customMetricsTracker.trackWebSocketLatency(ws)

    ws.addEventListener('open', () => {
      logger.debug('[WebSocket] Connected for performance monitoring')
    })

    ws.addEventListener('error', error => {
      monitor.trackError('WebSocketError', 'WebSocket error occurred', undefined, {
        readyState: ws.readyState,
      })
    })
  }, [ws])
}

/**
 * 页面性能摘要 Hook
 */
export function usePerformanceSummary() {
  const [summary, setSummary] = useState<{
    webVitals: WebVitalsMetrics
    customMetrics: CustomMetrics
    budget: PerformanceBudgetReport
    timestamp: number
  } | null>(null)

  useEffect(() => {
    const generateSummary = () => {
      const webVitals = webVitalsMonitor.getMetrics()
      const customMetrics = customMetricsTracker.getMetrics()
      const budgetReport = budgetManager.calculateBudgetReport(webVitals, customMetrics)

      setSummary({
        webVitals,
        customMetrics,
        budget: budgetReport,
        timestamp: Date.now(),
      })
    }

    generateSummary()
    const interval = setInterval(generateSummary, 10000)

    return () => clearInterval(interval)
  }, [])

  return summary
}
