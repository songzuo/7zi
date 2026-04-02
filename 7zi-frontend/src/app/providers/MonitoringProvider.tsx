'use client'

/**
 * Monitoring Provider - 全局监控初始化
 *
 * 负责:
 * 1. 初始化性能监控
 * 2. 初始化 Web Vitals 监控
 * 3. 初始化自定义指标追踪
 * 4. 连接告警系统
 */

import { useEffect, useState, createContext, useContext, ReactNode } from 'react'
import { monitor, initBrowserTracking } from '@/lib/monitoring'
import {
  initWebVitalsMonitoring,
  initCustomMetricsTracking,
  customMetricsTracker,
} from '@/lib/performance'

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
    if (!enabled) {
      setIsInitialized(true)
      return
    }

    // 初始化基础浏览器追踪
    initBrowserTracking()

    // 初始化 Web Vitals 监控
    initWebVitalsMonitoring({})

    // 初始化自定义指标追踪
    initCustomMetricsTracking({
      trackMemory: true,
      memoryCheckInterval: 10000, // 10 秒检查一次内存
      trackNetwork: true,
      trackResources: true,
    })

    // 更新监控配置
    if (sampleRate !== undefined) {
      monitor.updateConfig({ sampleRate })
    }

    // 设置全局错误处理
    const handleError = (event: ErrorEvent) => {
      monitor.trackError('GlobalError', event.message, event.error?.stack, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      })
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      monitor.trackError(
        'UnhandledRejection',
        event.reason?.message || String(event.reason),
        event.reason?.stack,
        { type: 'unhandledrejection' }
      )
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    setIsInitialized(true)

    // 清理函数
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
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
  const [metrics, setMetrics] = useState<any>(null)

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
        console.error('Failed to update metrics:', error)
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
