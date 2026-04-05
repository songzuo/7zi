'use client'

/**
 * Monitoring Provider - 全局监控初始化
 *
 * 负责:
 * 1. 初始化性能监控
 * 2. 初始化 Web Vitals 监控
 * 3. 初始化自定义指标追踪
 * 4. 连接告警系统
 *
 * 优化：延迟初始化监控，优先渲染 UI
 */

import { useEffect, useState, createContext, useContext, ReactNode } from 'react'
import { logger } from '@/lib/logger'
import type { AggregatedMetrics } from '@/lib/monitoring/types'
import type { CustomMetrics } from '@/lib/performance'
import { monitor } from '@/lib/monitoring'
import { customMetricsTracker } from '@/lib/performance'

interface MonitoringContextValue {
  isInitialized: boolean
  monitor: typeof monitor
  customMetricsTracker: typeof customMetricsTracker
}

const MonitoringContext = createContext<MonitoringContextValue | null>(null)

export function useMonitoring() {
  const context = useContext(MonitoringContext)
  if (!context) {
    throw new Error('useMonitoring must be used within MonitoringProvider')
  }
  return context
}

interface MonitoringProviderProps {
  children: ReactNode
  enabled?: boolean
  sampleRate?: number
}

export function MonitoringProvider({
  children,
  enabled = true,
  sampleRate,
}: MonitoringProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // 延迟初始化监控，优先渲染 UI
    const initTimer = setTimeout(() => {
      if (!enabled) {
        setIsInitialized(true)
        return
      }

      // 动态导入监控模块（延迟加载）
      Promise.all([
        import('@/lib/monitoring').then(m => m.initBrowserTracking()),
        import('@/lib/performance').then(m => {
          m.initWebVitalsMonitoring({})
          m.initCustomMetricsTracking({
            trackMemory: true,
            memoryCheckInterval: 10000,
            trackNetwork: true,
            trackResources: true,
          })
        }),
      ]).then(() => {
        // 设置全局错误处理
        const handleError = (event: ErrorEvent) => {
          // 动态导入 trackError
          import('@/lib/monitoring').then(({ monitor }) => {
            monitor.trackError('GlobalError', event.message, event.error?.stack, {
              filename: event.filename,
              lineno: event.lineno,
              colno: event.colno,
            })
          })
        }

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
          // 动态导入 trackError
          import('@/lib/monitoring').then(({ monitor }) => {
            monitor.trackError(
              'UnhandledRejection',
              event.reason?.message || String(event.reason),
              event.reason?.stack,
              { type: 'unhandledrejection' }
            )
          })
        }

        window.addEventListener('error', handleError)
        window.addEventListener('unhandledrejection', handleUnhandledRejection)

        // 更新采样率
        if (sampleRate !== undefined) {
          import('@/lib/monitoring').then(({ monitor }) => {
            monitor.updateConfig({ sampleRate })
          })
        }

        setIsInitialized(true)

        // 清理函数
        return () => {
          window.removeEventListener('error', handleError)
          window.removeEventListener('unhandledrejection', handleUnhandledRejection)
        }
      }).catch((error) => {
        console.error('[MonitoringProvider] Failed to initialize monitoring:', error)
        setIsInitialized(true) // 即使失败也标记为已初始化
      })
    }, 1000) // 延迟 1 秒初始化

    return () => {
      clearTimeout(initTimer)
    }
  }, [enabled, sampleRate])

  return (
    <MonitoringContext.Provider value={{ isInitialized, monitor, customMetricsTracker }}>
      {children}
    </MonitoringContext.Provider>
  )
}

/**
 * 监控 Hook - 获取当前监控状态和指标
 */
export function useMonitoringStatus() {
  const { isInitialized, monitor, customMetricsTracker } = useMonitoring()
  const [metrics, setMetrics] = useState<{
    aggregated: AggregatedMetrics
    custom: CustomMetrics
  } | null>(null)

  useEffect(() => {
    if (!isInitialized) return

    const updateMetrics = async () => {
      try {
        const [aggregated, custom] = await Promise.all([
          monitor.getAggregatedMetrics(),
          customMetricsTracker.getMetrics(),
        ])
        setMetrics({ aggregated, custom })
      } catch (error) {
        logger.error('Failed to update metrics', error instanceof Error ? error : new Error(String(error)))
      }
    }

    // 初始获取
    updateMetrics()

    // 每 30 秒更新一次
    const interval = setInterval(updateMetrics, 30000)

    return () => clearInterval(interval)
  }, [isInitialized, monitor, customMetricsTracker])

  return { isInitialized, metrics }
}
