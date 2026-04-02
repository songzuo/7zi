'use client'

/**
 * PerformanceMonitoringDashboard Component
 * 性能监控仪表板 - 集成所有性能监控组件
 *
 * 整合：
 * - PerformanceMetrics (Web Vitals 卡片)
 * - RealTimeCharts (实时趋势图表)
 * - PageLoadWaterfall (瀑布流)
 */

import React, { useState } from 'react'
import { Activity, RefreshCw, Settings, Download, AlertCircle } from 'lucide-react'
import { useWebVitals } from '@/lib/hooks/useWebVitals'
import { PerformanceMetrics } from './PerformanceMetrics'
import { RealTimeCharts } from './RealTimeCharts'
import { PageLoadWaterfall } from './PageLoadWaterfall'

// ============================================
// Type Definitions
// ============================================

export interface PerformanceMonitoringDashboardProps {
  /** 是否启用实时数据收集 */
  enabled?: boolean
  /** WebSocket URL 用于实时更新 */
  wsUrl?: string
  /** 语言 */
  locale?: 'en' | 'zh'
  /** 显示的组件 */
  showComponents?: {
    metrics?: boolean
    charts?: boolean
    waterfall?: boolean
  }
  /** 刷新间隔（毫秒） */
  refreshInterval?: number
  className?: string
}

// ============================================
// Main Component
// ============================================

export const PerformanceMonitoringDashboard: React.FC<PerformanceMonitoringDashboardProps> = ({
  enabled = true,
  wsUrl,
  locale = 'en',
  showComponents: initialShowComponents = { metrics: true, charts: true, waterfall: true },
  refreshInterval = 5000,
  className = '',
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showComponents, setShowComponents] = useState(initialShowComponents)

  // Web Vitals collection
  const { metrics, history, isCollecting } = useWebVitals({
    reportToApi: true,
  })

  const t = {
    title: locale === 'zh' ? '性能监控仪表板' : 'Performance Monitoring Dashboard',
    refresh: locale === 'zh' ? '刷新' : 'Refresh',
    exporting: locale === 'zh' ? '导出' : 'Export',
    settings: locale === 'zh' ? '设置' : 'Settings',
    collecting: locale === 'zh' ? '收集中' : 'Collecting',
    collected: locale === 'zh' ? '已收集' : 'Collected',
    lastUpdate: locale === 'zh' ? '最后更新' : 'Last updated',
    export: locale === 'zh' ? '导出数据' : 'Export Data',
  }

  // Refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Trigger a reload to re-collect metrics
    window.location.reload()
  }

  // Export data function
  const handleExport = () => {
    const exportData = {
      metrics,
      history,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-metrics-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!enabled) {
    return null
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{t.title}</h2>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`flex items-center gap-1 text-xs ${
                    isCollecting
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${isCollecting ? 'animate-pulse bg-green-500' : 'bg-zinc-400'}`}
                  />
                  {isCollecting ? t.collecting : t.collected}
                </span>
                {history.length > 0 && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t.lastUpdate}:{' '}
                    {new Date(history[history.length - 1].timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t.refresh}
            </button>

            {/* Export button */}
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
            >
              <Download className="h-4 w-4" />
              {t.export}
            </button>

            {/* Settings button */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
            <h4 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t.settings}
            </h4>
            <div className="flex flex-wrap gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={showComponents.metrics}
                  onChange={e =>
                    setShowComponents({
                      ...showComponents,
                      metrics: e.target.checked,
                    })
                  }
                  className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {locale === 'zh' ? '指标卡片' : 'Metrics Cards'}
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={showComponents.charts}
                  onChange={e =>
                    setShowComponents({
                      ...showComponents,
                      charts: e.target.checked,
                    })
                  }
                  className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {locale === 'zh' ? '实时图表' : 'Real-time Charts'}
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={showComponents.waterfall}
                  onChange={e =>
                    setShowComponents({
                      ...showComponents,
                      waterfall: e.target.checked,
                    })
                  }
                  className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {locale === 'zh' ? '瀑布流' : 'Waterfall'}
                </span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Performance Metrics */}
      {showComponents.metrics && (
        <PerformanceMetrics metrics={metrics} locale={locale} showRating={true} />
      )}

      {/* Real-time Charts */}
      {showComponents.charts && (
        <RealTimeCharts
          history={history}
          metrics={metrics}
          locale={locale}
          chartType="line"
          maxDataPoints={20}
        />
      )}

      {/* Page Load Waterfall */}
      {showComponents.waterfall && (
        <PageLoadWaterfall
          metrics={metrics}
          history={history}
          locale={locale}
          showDetails={true}
          maxResources={15}
        />
      )}

      {/* Warning if no data */}
      {Object.keys(metrics).length === 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
          <div>
            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              {locale === 'zh' ? '正在收集性能数据...' : 'Collecting performance data...'}
            </h4>
            <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
              {locale === 'zh'
                ? 'Web Vitals 指标正在收集中，请稍等片刻。'
                : 'Web Vitals metrics are being collected. Please wait a moment.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default PerformanceMonitoringDashboard
