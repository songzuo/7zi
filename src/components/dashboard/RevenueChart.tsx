'use client'

/**
 * RevenueChart - 收入趋势图组件
 *
 * 使用 Recharts 显示收入随时间的变化趋势
 * 支持折线图和柱状图切换
 * 支持响应式设计和移动端友好
 */

import React, { useState } from 'react'
import {
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
  ReferenceLine,
} from 'recharts'
import { TrendingUp, DollarSign, Calendar } from 'lucide-react'

// ============================================================================
// 类型定义
// ============================================================================

export interface RevenueDataPoint {
  date: string
  revenue: number
  costs?: number
  profit?: number
  target?: number
}

export interface RevenueChartProps {
  data: RevenueDataPoint[]
  title?: string
  subtitle?: string
  color?: string
  height?: number
  showTarget?: boolean
  showProfit?: boolean
  locale?: string
  className?: string
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
  locale?: string
}

const CustomTooltip = ({ active, payload, label, locale }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const formatCurrency = (value: number) => {
      return locale === 'zh' ? `¥${value.toLocaleString()}` : `$${value.toLocaleString()}`
    }

    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
        {payload.map((entry, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
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

export const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  title = 'Revenue Trend',
  subtitle,
  color = '#3b82f6',
  height = 300,
  showTarget = false,
  showProfit = false,
  locale = 'en',
  className = '',
}) => {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')

  // 根据时间范围过滤数据（模拟）
  const filteredData = data

  // 计算总览统计
  const totalRevenue = filteredData.reduce((sum, item) => sum + item.revenue, 0)
  const avgRevenue = filteredData.length > 0 ? totalRevenue / filteredData.length : 0
  const maxRevenue = Math.max(...filteredData.map(item => item.revenue), 0)
  const lastRevenue = filteredData[filteredData.length - 1]?.revenue || 0

  // 格式化货币
  const formatCurrency = (value: number) => {
    return locale === 'zh' ? `¥${(value / 1000).toFixed(1)}k` : `$${(value / 1000).toFixed(1)}k`
  }

  const formatCurrencyFull = (value: number) => {
    return locale === 'zh' ? `¥${value.toLocaleString()}` : `$${value.toLocaleString()}`
  }

  // 切换图表类型
  const toggleChartType = () => {
    setChartType(prev => (prev === 'line' ? 'bar' : 'line'))
  }

  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-700 dark:bg-zinc-800 ${className}`}
    >
      {/* 标题区域 */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            {title}
          </h3>
          {subtitle && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          {/* 时间范围选择 */}
          <div className="hidden items-center rounded-lg bg-zinc-100 p-1 sm:flex dark:bg-zinc-700">
            {(['7d', '30d', '90d', '1y'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-600 dark:text-white'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* 图表类型切换 */}
          <button
            onClick={toggleChartType}
            className="rounded-lg bg-zinc-100 p-2 text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-600"
            title={chartType === 'line' ? 'Switch to Bar Chart' : 'Switch to Line Chart'}
          >
            {chartType === 'line' ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* 统计摘要 */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Total</p>
          <p className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-300">
            {formatCurrencyFull(totalRevenue)}
          </p>
        </div>
        <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
          <p className="text-xs font-medium text-green-600 dark:text-green-400">Average</p>
          <p className="mt-1 text-lg font-bold text-green-700 dark:text-green-300">
            {formatCurrencyFull(avgRevenue)}
          </p>
        </div>
        <div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20">
          <p className="text-xs font-medium text-purple-600 dark:text-purple-400">Peak</p>
          <p className="mt-1 text-lg font-bold text-purple-700 dark:text-purple-300">
            {formatCurrencyFull(maxRevenue)}
          </p>
        </div>
        <div className="rounded-lg bg-orange-50 p-3 dark:bg-orange-900/20">
          <p className="text-xs font-medium text-orange-600 dark:text-orange-400">Latest</p>
          <p className="mt-1 text-lg font-bold text-orange-700 dark:text-orange-300">
            {formatCurrencyFull(lastRevenue)}
          </p>
        </div>
      </div>

      {/* 图表 */}
      <div style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={filteredData}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-gray-200 dark:stroke-zinc-700"
              />
              <XAxis
                dataKey="date"
                className="text-xs text-zinc-500 dark:text-zinc-400"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                className="text-xs text-zinc-500 dark:text-zinc-400"
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip locale={locale} />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke={color}
                strokeWidth={2}
                dot={{ fill: color, r: 4 }}
                activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
              />
              {showProfit && filteredData.some(d => d.profit !== undefined) && (
                <Line
                  type="monotone"
                  dataKey="profit"
                  name="Profit"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              )}
              {showTarget && filteredData.some(d => d.target !== undefined) && (
                <Line
                  type="monotone"
                  dataKey="target"
                  name="Target"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#f59e0b', r: 3 }}
                />
              )}
            </LineChart>
          ) : (
            <BarChart data={filteredData}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-gray-200 dark:stroke-zinc-700"
              />
              <XAxis
                dataKey="date"
                className="text-xs text-zinc-500 dark:text-zinc-400"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                className="text-xs text-zinc-500 dark:text-zinc-400"
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip locale={locale} />} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill={color} radius={[4, 4, 0, 0]} />
              {showProfit && filteredData.some(d => d.profit !== undefined) && (
                <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
              )}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ============================================================================
// 默认导出
// ============================================================================

export default RevenueChart
