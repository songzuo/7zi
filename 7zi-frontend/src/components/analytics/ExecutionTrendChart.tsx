/**
 * ExecutionTrendChart - 执行趋势图表组件
 * 使用 Recharts 显示工作流执行趋势
 */

'use client'

import { useMemo } from 'react'
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
  ResponsiveContainer,
  Legend
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import type { TrendData } from '@/lib/analytics/service'

export interface ExecutionTrendChartProps {
  data: TrendData[]
  title?: string
  chartType?: 'line' | 'area' | 'bar'
  loading?: boolean
  showGrid?: boolean
  showLegend?: boolean
  height?: number
  className?: string
}

/**
 * 格式化日期标签
 */
function formatDateLabel(date: string): string {
  const d = new Date(date)
  const month = d.getMonth() + 1
  const day = d.getDate()
  return `${month}/${day}`
}

/**
 * 自定义 Tooltip
 */
function CustomTooltip({
  active,
  payload,
  label
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string
}) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="text-sm font-medium text-foreground mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

/**
 * 生成模拟数据（当没有真实数据时）
 */
function generateMockData(days: number): TrendData[] {
  const data: TrendData[] = []
  const now = new Date()
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    data.push({
      timestamp: date.toISOString().split('T')[0],
      value: Math.floor(Math.random() * 50) + 10
    })
  }
  
  return data
}

/**
 * ExecutionTrendChart 主组件
 */
export function ExecutionTrendChart({
  data,
  title = '执行趋势',
  chartType = 'line',
  loading = false,
  showGrid = true,
  showLegend = false,
  height = 300,
  className
}: ExecutionTrendChartProps) {
  // 处理数据：使用真实数据或模拟数据
  const chartData = useMemo(() => {
    if (data && data.length > 0) {
      return data
    }
    // 返回空数据时的占位符
    return []
  }, [data])

  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="animate-pulse text-muted-foreground">加载中...</div>
        </div>
      )
    }

    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center text-muted-foreground" style={{ height }}>
          暂无数据
        </div>
      )
    }

    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 10, left: 0, bottom: 0 }
    }

    switch (chartType) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart {...commonProps}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
              <XAxis
                dataKey="date"
                tickFormatter={formatDateLabel}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              {showLegend && <Legend />}
              <Area
                type="monotone"
                dataKey="value"
                name="执行次数"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary) / 0.2)"
                strokeWidth={2}
                animationDuration={500}
              />
            </AreaChart>
          </ResponsiveContainer>
        )

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart {...commonProps}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
              <XAxis
                dataKey="date"
                tickFormatter={formatDateLabel}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              {showLegend && <Legend />}
              <Bar
                dataKey="value"
                name="执行次数"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                animationDuration={500}
              />
            </BarChart>
          </ResponsiveContainer>
        )

      case 'line':
      default:
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart {...commonProps}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
              <XAxis
                dataKey="date"
                tickFormatter={formatDateLabel}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              {showLegend && <Legend />}
              <Line
                type="monotone"
                dataKey="value"
                name="执行次数"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                activeDot={{ r: 5 }}
                animationDuration={500}
              />
            </LineChart>
          </ResponsiveContainer>
        )
    }
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  )
}

/**
 * 迷你趋势图（用于仪表板小部件）
 */
export function MiniTrendChart({
  data,
  chartType = 'line',
  height = 100,
  className
}: {
  data: TrendData[]
  chartType?: 'line' | 'bar'
  height?: number
  className?: string
}) {
  const chartData = data && data.length > 0 ? data : generateMockData(7)

  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <Bar
            dataKey="value"
            fill="hsl(var(--primary))"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

/**
 * 对比趋势图（支持多条线）
 */
export function ComparisonTrendChart({
  data,
  title = '趋势对比',
  height = 300,
  className
}: {
  data: Array<{ name: string; data: TrendData[]; color: string }>
  title?: string
  height?: number
  className?: string
}) {
  // 合并数据
  const mergedData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    const dateSet = new Set<string>()
    data.forEach(series => {
      series.data.forEach(item => dateSet.add(item.timestamp))
    })
    
    return Array.from(dateSet).sort().map(ts => {
      const point: Record<string, string | number> = { date: ts }
      data.forEach(series => {
        const item = series.data.find(d => d.timestamp === ts)
        point[series.name] = item?.value ?? 0
      })
      return point
    })
  }, [data])

  const colors = data?.map(s => s.color) || ['hsl(var(--primary))', 'hsl(var(--secondary))']

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={mergedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateLabel}
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {data?.map((series, index) => (
              <Line
                key={series.name}
                type="monotone"
                dataKey={series.name}
                stroke={colors[index]}
                strokeWidth={2}
                dot={{ r: 3 }}
                animationDuration={500}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}