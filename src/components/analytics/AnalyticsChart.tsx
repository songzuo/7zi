/**
 * Analytics Chart Component
 * 数据分析图表组件 (支持 Recharts)
 */

'use client'

import React, { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Activity,
  Download,
  TrendingUp,
} from 'lucide-react'
import { type ChartConfig, type TimeSeriesDataPoint, type ChartType } from '@/lib/types/analytics'

// ============================================================================
// Type Definitions
// ============================================================================

export interface AnalyticsChartProps {
  config: ChartConfig
  onExport?: (format: 'csv' | 'xlsx' | 'json') => void
  className?: string
}

// ============================================================================
// Color Palette
// ============================================================================

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // orange
  '#8b5cf6', // purple
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
]

// ============================================================================
// Chart Type Icons
// ============================================================================

const chartTypeIcons: Record<ChartType, React.ElementType> = {
  line: LineChartIcon,
  area: TrendingUp,
  bar: BarChart3,
  pie: PieChartIcon,
  donut: PieChartIcon,
  radar: Activity,
  scatter: Activity,
  heatmap: Activity,
}

// ============================================================================
// Custom Tooltip
// ============================================================================

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
    dataKey?: string
  }>
  label?: string
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="min-w-[150px] rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
        {label && (
          <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
        )}
        {payload.map((entry, index: number) => (
          <p key={index} className="mb-1 flex items-center gap-2 text-sm">
            <span
              className="h-2 w-2 flex-shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-zinc-600 dark:text-zinc-300">{entry.name}:</span>
            <span className="ml-auto font-semibold text-zinc-900 dark:text-white">
              {entry.value.toLocaleString()}
            </span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

// ============================================================================
// Custom Legend
// ============================================================================

const CustomLegend = ({ payload }: { payload?: Array<{ value: string; color: string }> }) => {
  if (!payload) return null

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
      {payload.map((entry, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-xs text-zinc-600 dark:text-zinc-400">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Value Formatter
// ============================================================================

const formatValue = (value: number, metric: string): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return value.toString()
}

// ============================================================================
// Main Component
// ============================================================================

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  config,
  onExport,
  className = '',
}) => {
  const {
    type,
    title,
    data,
    metrics,
    colors = COLORS,
    showLegend = true,
    showTooltip = true,
    height = 300,
  } = config
  const [activeChartType, setActiveChartType] = useState<ChartType>(type)

  const chartColors = useMemo(() => {
    return metrics.map((_, index) => colors[index % colors.length])
  }, [metrics, colors])

  const chartData = useMemo(() => {
    return data.map(item => ({
      ...item,
      displayDate:
        item.date ||
        new Date(item.timestamp).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
    }))
  }, [data])

  const StatIcon = chartTypeIcons[activeChartType] as React.ComponentType<{ className?: string }>

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    }

    switch (activeChartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-zinc-700" />
            <XAxis
              dataKey="displayDate"
              className="text-xs text-zinc-500 dark:text-zinc-400"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              className="text-xs text-zinc-500 dark:text-zinc-400"
              tickFormatter={value => formatValue(value, 'default')}
              tick={{ fontSize: 12 }}
            />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend content={<CustomLegend />} />}
            {metrics.map((metric, index) => (
              <Line
                key={metric}
                type="monotone"
                dataKey={metric}
                name={metric}
                stroke={chartColors[index]}
                strokeWidth={2}
                dot={{ fill: chartColors[index], r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        )

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-zinc-700" />
            <XAxis
              dataKey="displayDate"
              className="text-xs text-zinc-500 dark:text-zinc-400"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              className="text-xs text-zinc-500 dark:text-zinc-400"
              tickFormatter={value => formatValue(value, 'default')}
              tick={{ fontSize: 12 }}
            />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend content={<CustomLegend />} />}
            {metrics.map((metric, index) => (
              <Area
                key={metric}
                type="monotone"
                dataKey={metric}
                name={metric}
                stroke={chartColors[index]}
                fill={chartColors[index]}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        )

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-zinc-700" />
            <XAxis
              dataKey="displayDate"
              className="text-xs text-zinc-500 dark:text-zinc-400"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              className="text-xs text-zinc-500 dark:text-zinc-400"
              tickFormatter={value => formatValue(value, 'default')}
              tick={{ fontSize: 12 }}
            />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend content={<CustomLegend />} />}
            {metrics.map((metric, index) => (
              <Bar
                key={metric}
                dataKey={metric}
                name={metric}
                fill={chartColors[index]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        )

      case 'pie':
      case 'donut':
        // Aggregate data for pie chart
        const pieData = metrics.map((metric, index) => ({
          name: metric,
          value: data.reduce((sum, item) => sum + (Number(item[metric]) || 0), 0),
          fill: chartColors[index],
        }))

        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              innerRadius={activeChartType === 'donut' ? 60 : 0}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend content={<CustomLegend />} />}
          </PieChart>
        )

      case 'radar':
        return (
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
            <PolarGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-zinc-700" />
            <PolarAngleAxis
              dataKey="displayDate"
              className="text-xs text-zinc-500 dark:text-zinc-400"
            />
            <PolarRadiusAxis
              className="text-xs text-zinc-500 dark:text-zinc-400"
              tickFormatter={value => formatValue(value, 'default')}
              tick={{ fontSize: 12 }}
            />
            {metrics.map((metric, index) => (
              <Radar
                key={metric}
                name={metric}
                dataKey={metric}
                stroke={chartColors[index]}
                fill={chartColors[index]}
                fillOpacity={0.3}
              />
            ))}
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend content={<CustomLegend />} />}
          </RadarChart>
        )

      default:
        return (
          <div className="flex h-full items-center justify-center text-zinc-500">
            Unsupported chart type
          </div>
        )
    }
  }

  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-700 dark:bg-zinc-800 ${className}`}
    >
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
            <StatIcon className="h-5 w-5 text-purple-600" />
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Chart Type Selector */}
          <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-700">
            {(['line', 'area', 'bar', 'pie', 'radar'] as ChartType[]).map(chartTypeOption => {
              const Icon = chartTypeIcons[chartTypeOption] as React.ComponentType<{
                className?: string
              }>
              return (
                <button
                  key={chartTypeOption}
                  onClick={() => setActiveChartType(chartTypeOption)}
                  className={`rounded-lg p-2 transition-colors ${
                    activeChartType === chartTypeOption
                      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-600 dark:text-white'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                  }`}
                  title={chartTypeOption}
                >
                  <Icon className="h-4 w-4" />
                </button>
              )
            })}
          </div>

          {/* Export Button */}
          {onExport && (
            <div className="group relative">
              <button className="rounded-lg bg-zinc-100 p-2 transition-colors hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600">
                <Download className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              </button>
              <div className="invisible absolute right-0 mt-2 w-32 rounded-lg border border-zinc-200 bg-white opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100 dark:border-zinc-700 dark:bg-zinc-800">
                {['csv', 'xlsx', 'json'].map(format => (
                  <button
                    key={format}
                    onClick={() => onExport(format as 'csv' | 'xlsx' | 'json')}
                    className="block w-full px-4 py-2 text-left text-sm text-zinc-700 first:rounded-t-lg last:rounded-b-lg hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default AnalyticsChart
