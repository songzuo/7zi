'use client'

/**
 * RealTimeCharts Component
 * 实时性能图表组件
 *
 * 使用 Recharts 显示性能指标的历史趋势
 */

import React, { useMemo } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { MetricEntry } from '@/lib/hooks/useWebVitals'

// ============================================
// Type Definitions
// ============================================

export interface RealTimeChartsProps {
  history: MetricEntry[]
  metrics: {
    LCP?: number
    FID?: number
    CLS?: number
    INP?: number
    FCP?: number
    TTFB?: number
  }
  locale?: 'en' | 'zh'
  chartType?: 'line' | 'area' | 'bar'
  maxDataPoints?: number
  className?: string
}

// ============================================
// Constants
// ============================================

const CHART_COLORS = {
  LCP: '#3b82f6', // blue
  FID: '#10b981', // green
  CLS: '#f59e0b', // amber
  INP: '#8b5cf6', // purple
  FCP: '#ec4899', // pink
  TTFB: '#06b6d4', // cyan
}

const METRIC_LABELS = {
  LCP: { en: 'LCP', zh: 'LCP (ms)' },
  FID: { en: 'FID', zh: 'FID (ms)' },
  CLS: { en: 'CLS', zh: 'CLS' },
  INP: { en: 'INP', zh: 'INP (ms)' },
  FCP: { en: 'FCP', zh: 'FCP (ms)' },
  TTFB: { en: 'TTFB', zh: 'TTFB (ms)' },
}

// ============================================
// Helper Functions
// ============================================

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

function prepareChartData(history: MetricEntry[], maxDataPoints: number) {
  // Take only the most recent data points
  const recentHistory = history.slice(-maxDataPoints)

  // Group by timestamp (in case multiple metrics were collected at the same time)
  type DataPoint = {
    timestamp: number
    time: string
    [key: string]: number | string
  }

  const grouped = new Map<number, DataPoint>()

  recentHistory.forEach(entry => {
    if (!grouped.has(entry.timestamp)) {
      grouped.set(entry.timestamp, {
        timestamp: entry.timestamp,
        time: formatTime(entry.timestamp),
      })
    }
    grouped.get(entry.timestamp)![entry.name] = entry.value
  })

  return Array.from(grouped.values()).sort((a, b) => a.timestamp - b.timestamp)
}

function getAvailableMetrics(history: MetricEntry[]): string[] {
  const metricsSet = new Set<string>()
  history.forEach(entry => metricsSet.add(entry.name))
  return Array.from(metricsSet)
}

// ============================================
// Chart Components
// ============================================

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
  }>
  label?: string
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
      <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      {payload.map(entry => (
        <div key={entry.name} className="flex items-center gap-2 text-sm">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-zinc-700 dark:text-zinc-300">{entry.name}:</span>
          <span className="font-semibold text-zinc-900 dark:text-white">
            {entry.value.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ============================================
// Main Component
// ============================================

export const RealTimeCharts: React.FC<RealTimeChartsProps> = ({
  history,
  metrics,
  locale = 'en',
  chartType = 'line',
  maxDataPoints = 20,
  className = '',
}) => {
  const t = {
    title: locale === 'zh' ? '实时趋势' : 'Real-time Trends',
    noData: locale === 'zh' ? '暂无历史数据' : 'No historical data',
    time: locale === 'zh' ? '时间' : 'Time',
  }

  const chartData = useMemo(
    () => prepareChartData(history, maxDataPoints),
    [history, maxDataPoints]
  )

  const availableMetrics = useMemo(() => getAvailableMetrics(history), [history])

  if (chartData.length === 0) {
    return (
      <div
        className={`rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800 ${className}`}
      >
        <div className="flex h-48 flex-col items-center justify-center text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.noData}</p>
        </div>
      </div>
    )
  }

  // Chart configuration based on chart type
  const ChartComponent =
    chartType === 'bar' ? BarChart : chartType === 'area' ? AreaChart : LineChart
  const DataComponent = chartType === 'bar' ? Bar : chartType === 'area' ? Area : Line
  const areaProps =
    chartType === 'area' ? { type: 'monotone' as const, stackId: 1, fillOpacity: 0.3 } : {}

  return (
    <div
      className={`rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800 ${className}`}
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{t.title}</h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {locale === 'zh'
              ? `最近 ${maxDataPoints} 个数据点`
              : `Last ${maxDataPoints} data points`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Current values badge */}
          {availableMetrics.slice(0, 3).map(metric => (
            <div
              key={metric}
              className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
              style={{
                backgroundColor: `${CHART_COLORS[metric as keyof typeof CHART_COLORS]}20`,
                color: CHART_COLORS[metric as keyof typeof CHART_COLORS],
              }}
            >
              <span>{metric}</span>
              {metrics[metric as keyof typeof metrics] !== undefined && (
                <span className="font-semibold">
                  {metrics[metric as keyof typeof metrics]!.toFixed(0)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
            <XAxis
              dataKey="time"
              tick={{ fill: 'currentColor', className: 'text-xs text-zinc-500 dark:text-zinc-400' }}
              tickFormatter={value => value}
            />
            <YAxis
              tick={{ fill: 'currentColor', className: 'text-xs text-zinc-500 dark:text-zinc-400' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
              formatter={(value: string) => {
                const label = METRIC_LABELS[value as keyof typeof METRIC_LABELS]
                return label ? label[locale] : value
              }}
            />

            {/* Render lines for each available metric */}
            {availableMetrics.map(metric => (
              <DataComponent
                key={metric}
                dataKey={metric}
                stroke={CHART_COLORS[metric as keyof typeof CHART_COLORS]}
                fill={CHART_COLORS[metric as keyof typeof CHART_COLORS]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                {...areaProps}
              />
            ))}
          </ChartComponent>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
        {availableMetrics.map(metric => {
          const color = CHART_COLORS[metric as keyof typeof CHART_COLORS]
          const label = METRIC_LABELS[metric as keyof typeof METRIC_LABELS]

          return (
            <div key={metric} className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                {label ? label[locale] : metric}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default RealTimeCharts
