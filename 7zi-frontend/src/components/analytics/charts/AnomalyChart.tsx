/**
 * AnomalyChart - 异常检测图表
 *
 * 显示检测到的异常事件。
 */

'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CheckCircle2, AlertTriangle, AlertCircle, AlertOctagon, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AnomalyData } from '@/lib/analytics/types'

export interface AnomalyChartProps {
  data: AnomalyData[]
  title?: string
  maxItems?: number
  className?: string
}

/**
 * Get severity color
 */
function getSeverityColor(severity: AnomalyData['severity']): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-500 text-white'
    case 'high':
      return 'bg-orange-500 text-white'
    case 'medium':
      return 'bg-yellow-500 text-white'
    case 'low':
      return 'bg-blue-500 text-white'
    default:
      return 'bg-gray-500 text-white'
  }
}

/**
 * Get severity icon
 */
function getSeverityIcon(severity: AnomalyData['severity']) {
  switch (severity) {
    case 'critical':
      return <AlertOctagon className="w-4 h-4" />
    case 'high':
      return <AlertTriangle className="w-4 h-4" />
    case 'medium':
      return <AlertCircle className="w-4 h-4" />
    case 'low':
      return <Info className="w-4 h-4" />
    default:
      return <Info className="w-4 h-4" />
  }
}

/**
 * Format timestamp
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`

  return date.toLocaleDateString('zh-CN')
}

/**
 * AnomalyItem component
 */
function AnomalyItem({ anomaly }: { anomaly: AnomalyData }) {
  return (
    <div className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className={cn('p-2 rounded-full', getSeverityColor(anomaly.severity))}>
        {getSeverityIcon(anomaly.severity)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <p className="text-sm font-medium text-foreground truncate">
            {anomaly.message}
          </p>
          <Badge variant="outline" className="text-xs">
            {anomaly.type}
          </Badge>
        </div>
        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
          <span>{formatTimestamp(anomaly.timestamp)}</span>
          <span>
            值: {anomaly.value.toFixed(2)} / 阈值: {anomaly.threshold.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * AnomalyChart main component
 */
export function AnomalyChart({
  data,
  title = '异常检测',
  maxItems = 10,
  className,
}: AnomalyChartProps) {
  // Sort by timestamp (newest first) and limit
  const sortedData = useMemo(() => {
    return [...data]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, maxItems)
  }, [data, maxItems])

  // Count by severity
  const severityCounts = useMemo(() => {
    return data.reduce((acc, anomaly) => {
      acc[anomaly.severity] = (acc[anomaly.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [data])

  const totalAnomalies = data.length
  const criticalCount = severityCounts.critical || 0
  const highCount = severityCounts.high || 0

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <div className="flex items-center space-x-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalCount} 严重
              </Badge>
            )}
            {highCount > 0 && (
              <Badge variant="outline" className="text-xs border-orange-500 text-orange-500">
                {highCount} 高
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              共 {totalAnomalies}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <div className="text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p className="text-sm">未检测到异常</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {sortedData.map((anomaly, index) => (
              <AnomalyItem key={`${anomaly.timestamp}-${index}`} anomaly={anomaly} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * AnomalySummary component (compact view)
 */
export function AnomalySummary({
  data,
}: {
  data: AnomalyData[]
}) {
  const severityCounts = useMemo(() => {
    return data.reduce((acc, anomaly) => {
      acc[anomaly.severity] = (acc[anomaly.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [data])

  const total = data.length
  const critical = severityCounts.critical || 0
  const high = severityCounts.high || 0

  if (total === 0) {
    return (
      <div className="flex items-center space-x-2 text-sm text-green-600">
        <CheckCircle2 className="w-4 h-4" />
        <span>系统正常</span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      {critical > 0 && (
        <Badge variant="destructive" className="text-xs">
          {critical} 严重
        </Badge>
      )}
      {high > 0 && (
        <Badge variant="outline" className="text-xs border-orange-500 text-orange-500">
          {high} 高
        </Badge>
      )}
      <Badge variant="secondary" className="text-xs">
        共 {total}
      </Badge>
    </div>
  )
}

export default AnomalyChart