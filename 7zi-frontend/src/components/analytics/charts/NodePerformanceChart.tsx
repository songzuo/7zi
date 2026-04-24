/**
 * NodePerformanceChart - 节点性能分析图表
 *
 * 显示各节点的执行时间分布和成功率。
 */

'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { formatDuration } from '@/lib/analytics/metrics'
import type { NodePerformanceData } from '@/lib/analytics/types'

export interface NodePerformanceChartProps {
  data: NodePerformanceData[]
  title?: string
  height?: number
  className?: string
}

/**
 * Custom Tooltip
 */
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string
}) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="text-sm font-medium text-foreground mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.name.includes('Rate') ? `${entry.value.toFixed(1)}%` : formatDuration(entry.value)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

/**
 * NodePerformanceChart main component
 */
export function NodePerformanceChart({
  data,
  title = '节点性能分析',
  height = 300,
  className,
}: NodePerformanceChartProps) {
  // Transform data for chart
  const chartData = useMemo(() => {
    return data.map(node => ({
      nodeType: node.nodeType,
      avgTime: node.avgExecutionTime,
      p95: node.p95,
      p99: node.p99,
      successRate: node.successRate,
    }))
  }, [data])

  // Color palette
  const colors = {
    avgTime: 'hsl(var(--primary))',
    p95: 'hsl(var(--secondary))',
    p99: 'hsl(var(--accent))',
    successRate: 'hsl(142, 76%, 36%)', // green-600
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="nodeType"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              tickFormatter={(value) => formatDuration(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey="avgTime"
              name="平均时间"
              fill={colors.avgTime}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="p95"
              name="P95"
              fill={colors.p95}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="p99"
              name="P99"
              fill={colors.p99}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

/**
 * Success Rate Chart (separate component for clarity)
 */
export function NodeSuccessRateChart({
  data,
  title = '节点成功率',
  height = 300,
  className,
}: {
  data: NodePerformanceData[]
  title?: string
  height?: number
  className?: string
}) {
  const chartData = useMemo(() => {
    return data.map(node => ({
      nodeType: node.nodeType,
      successRate: node.successRate,
    }))
  }, [data])

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="nodeType"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-md">
                      <p className="text-sm font-medium text-foreground mb-1">
                        {payload[0].payload.nodeType}
                      </p>
                      <p className="text-sm text-green-600">
                        成功率: {typeof payload[0].value === 'number' ? payload[0].value.toFixed(1) : '0'}%
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar
              dataKey="successRate"
              name="成功率"
              fill="hsl(142, 76%, 36%)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export default NodePerformanceChart