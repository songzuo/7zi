'use client'

/**
 * ActivityChart - 活跃度图表组件
 *
 * 使用 Recharts 显示系统活跃度（agents活跃、用户活跃、token使用等）
 * 支持多种图表类型：堆叠面积图、折线图、柱状图
 * 支持响应式设计和移动端友好
 */

import React, { useState } from 'react'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Activity, Zap, Users, Cpu } from 'lucide-react'

// ============================================================================
// 类型定义
// ============================================================================

export interface ActivityDataPoint {
  timestamp: string
  date?: string
  agents?: number
  users?: number
  tokens?: number
  requests?: number
  errors?: number
}

export interface ActivityChartProps {
  data: ActivityDataPoint[]
  title?: string
  subtitle?: string
  height?: number
  metrics?: ('agents' | 'users' | 'tokens' | 'requests' | 'errors')[]
  chartType?: 'area' | 'line' | 'bar'
  locale?: string
  showLegend?: boolean
  className?: string
}

// ============================================================================
// 颜色配置
// ============================================================================

const colors = {
  agents: {
    stroke: '#3b82f6',
    fill: '#3b82f6',
    fillOpacity: 0.3,
    icon: Zap,
    label: 'Active Agents',
  },
  users: {
    stroke: '#10b981',
    fill: '#10b981',
    fillOpacity: 0.3,
    icon: Users,
    label: 'Active Users',
  },
  tokens: { stroke: '#f59e0b', fill: '#f59e0b', fillOpacity: 0.3, icon: Cpu, label: 'Tokens Used' },
  requests: {
    stroke: '#8b5cf6',
    fill: '#8b5cf6',
    fillOpacity: 0.3,
    icon: Activity,
    label: 'Requests',
  },
  errors: { stroke: '#ef4444', fill: '#ef4444', fillOpacity: 0.3, icon: Activity, label: 'Errors' },
}

// ============================================================================
// 自定义 Tooltip
// ============================================================================

/**
 * Custom tooltip props
 */
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
      <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
        {payload.map((entry, index: number) => (
          <p key={index} className="flex items-center gap-2 text-sm" style={{ color: entry.color }}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}: {entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    )
  }
  return null
}

// ============================================================================
// 组件实现
// ============================================================================

export const ActivityChart: React.FC<ActivityChartProps> = ({
  data,
  title = 'System Activity',
  subtitle,
  height = 300,
  metrics = ['agents', 'users', 'tokens'],
  chartType = 'area',
  locale = 'en',
  showLegend = true,
  className = '',
}) => {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)

  // 过滤显示的指标
  const activeMetrics = metrics.filter(metric => {
    if (selectedMetric === null) return true
    return metric === selectedMetric
  })

  // 计算统计信息
  const stats = metrics.reduce<Record<string, { total: number; avg: number; max: number }>>(
    (acc, metric) => {
      const values = data.map(d => d[metric]).filter((v): v is number => v !== undefined)
      const total = values.reduce((sum, v) => sum + v, 0)
      const avg = values.length > 0 ? Math.round(total / values.length) : 0
      const max = Math.max(...values, 0)
      acc[metric] = { total, avg, max }
      return acc
    },
    {}
  )

  // 转换数据格式用于图表
  const chartData = data.map(item => ({
    ...item,
    displayDate:
      item.date ||
      new Date(item.timestamp).toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
      }),
  }))

  // 格式化数值
  const formatValue = (value: number, metric: string) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
    return value.toString()
  }

  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-700 dark:bg-zinc-800 ${className}`}
    >
      {/* 标题区域 */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
            <Activity className="h-5 w-5 text-purple-600" />
            {title}
          </h3>
          {subtitle && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
        </div>

        {/* 图表类型切换 */}
        <div className="flex items-center gap-2 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-700">
          {(['area', 'line', 'bar'] as const).map(type => (
            <button
              key={type}
              onClick={() => setSelectedMetric(null)} // 重置指标选择
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                chartType === type && selectedMetric === null
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-600 dark:text-white'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.slice(0, 4).map(metric => {
          const colorConfig = colors[metric]
          const Icon = colorConfig.icon
          return (
            <div
              key={metric}
              className={`p-3 bg-${metric === 'errors' ? 'red' : metric === 'agents' ? 'blue' : metric === 'users' ? 'green' : metric === 'tokens' ? 'orange' : 'purple'}-50 dark:bg-${metric === 'errors' ? 'red' : metric === 'agents' ? 'blue' : metric === 'users' ? 'green' : metric === 'tokens' ? 'orange' : 'purple'}-900/20 cursor-pointer rounded-lg transition-all hover:scale-[1.02] ${
                selectedMetric === metric ? 'ring-2 ring-blue-500 ring-offset-2' : ''
              }`}
              onClick={() => setSelectedMetric(selectedMetric === metric ? null : metric)}
            >
              <div className="mb-1 flex items-center gap-2">
                <Icon
                  className={`h-4 w-4 text-${metric === 'errors' ? 'red' : metric === 'agents' ? 'blue' : metric === 'users' ? 'green' : metric === 'tokens' ? 'orange' : 'purple'}-600`}
                />
                <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">
                  {colorConfig.label}
                </p>
              </div>
              <p
                className={`text-lg font-bold text-${metric === 'errors' ? 'red' : metric === 'agents' ? 'blue' : metric === 'users' ? 'green' : metric === 'tokens' ? 'orange' : 'purple'}-700 dark:text-${metric === 'errors' ? 'red' : metric === 'agents' ? 'blue' : metric === 'users' ? 'green' : metric === 'tokens' ? 'orange' : 'purple'}-300 mt-1`}
              >
                {formatValue(stats[metric]?.total || 0, metric)}
              </p>
            </div>
          )
        })}
      </div>

      {/* 图表 */}
      <div style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-gray-200 dark:stroke-zinc-700"
              />
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
              <Tooltip content={<CustomTooltip />} />
              {showLegend && <Legend />}
              {activeMetrics.map(metric => {
                const colorConfig = colors[metric]
                return (
                  <Area
                    key={metric}
                    type="monotone"
                    dataKey={metric}
                    name={colorConfig.label}
                    stroke={colorConfig.stroke}
                    fill={colorConfig.fill}
                    fillOpacity={colorConfig.fillOpacity}
                    strokeWidth={2}
                  />
                )
              })}
            </AreaChart>
          ) : chartType === 'line' ? (
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-gray-200 dark:stroke-zinc-700"
              />
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
              <Tooltip content={<CustomTooltip />} />
              {showLegend && <Legend />}
              {activeMetrics.map(metric => {
                const colorConfig = colors[metric]
                return (
                  <Line
                    key={metric}
                    type="monotone"
                    dataKey={metric}
                    name={colorConfig.label}
                    stroke={colorConfig.stroke}
                    strokeWidth={2}
                    dot={{ fill: colorConfig.stroke, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                )
              })}
            </LineChart>
          ) : (
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-gray-200 dark:stroke-zinc-700"
              />
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
              <Tooltip content={<CustomTooltip />} />
              {showLegend && <Legend />}
              {activeMetrics.map(metric => {
                const colorConfig = colors[metric]
                return (
                  <Bar
                    key={metric}
                    dataKey={metric}
                    name={colorConfig.label}
                    fill={colorConfig.fill}
                    radius={[4, 4, 0, 0]}
                  />
                )
              })}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* 底部说明 */}
      <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {locale === 'zh'
            ? '点击上方卡片可聚焦查看单个指标'
            : 'Click cards above to focus on a single metric'}
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// 默认导出
// ============================================================================

export default ActivityChart
