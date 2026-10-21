/**
 * ResourceUsageChart - 资源使用情况图表
 *
 * 显示 CPU、内存、磁盘、网络使用情况。
 */

'use client'

import { useMemo } from 'react'
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import type { ResourceUsageData } from '@/lib/analytics/types'

export interface ResourceUsageChartProps {
  data: ResourceUsageData[]
  title?: string
  height?: number
  className?: string
}

/**
 * Format timestamp for X axis
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
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
            {entry.name}: {entry.value.toFixed(1)}%
          </p>
        ))}
      </div>
    )
  }
  return null
}

/**
 * ResourceUsageChart main component
 */
export function ResourceUsageChart({
  data,
  title = '资源使用情况',
  height = 300,
  className,
}: ResourceUsageChartProps) {
  // Transform data for chart
  const chartData = useMemo(() => {
    return data.map(item => ({
      ...item,
      time: formatTimestamp(item.timestamp),
    }))
  }, [data])

  // Color palette
  const colors = {
    cpu: 'hsl(var(--primary))',
    memory: 'hsl(var(--secondary))',
    disk: 'hsl(38, 92%, 50%)', // amber
    network: 'hsl(262, 83%, 58%)', // purple
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="cpuUsage"
              name="CPU"
              fill={colors.cpu}
              fillOpacity={0.2}
              stroke={colors.cpu}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="memoryUsage"
              name="内存"
              fill={colors.memory}
              fillOpacity={0.2}
              stroke={colors.memory}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="diskUsage"
              name="磁盘"
              stroke={colors.disk}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="networkUsage"
              name="网络"
              stroke={colors.network}
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

/**
 * Mini Resource Chart (for smaller displays)
 */
export function MiniResourceChart({
  data,
  type = 'cpu',
  height = 100,
}: {
  data: ResourceUsageData[]
  type: 'cpu' | 'memory' | 'disk' | 'network'
  height?: number
}) {
  const dataKeyMap = {
    cpu: 'cpuUsage',
    memory: 'memoryUsage',
    disk: 'diskUsage',
    network: 'networkUsage',
  }

  const colorMap = {
    cpu: 'hsl(var(--primary))',
    memory: 'hsl(var(--secondary))',
    disk: 'hsl(38, 92%, 50%)',
    network: 'hsl(262, 83%, 58%)',
  }

  const chartData = useMemo(() => {
    const key = dataKeyMap[type as keyof typeof dataKeyMap]
    return data.map(item => ({
      value: (item as unknown as Record<string, unknown>)[key],
    }))
  }, [data, type])

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
      <Area
        type="monotone"
        dataKey="value"
        stroke={colorMap[type]}
        fill={colorMap[type]}
        fillOpacity={0.3}
        strokeWidth={2}
      />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default ResourceUsageChart