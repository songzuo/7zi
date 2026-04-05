'use client'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface MobileChartProps {
  title: string
  data: Array<{ label: string; value: number }>
  color?: string
  showTrend?: boolean
}

/**
 * Mobile Chart Component (Lightweight)
 * Simple bar chart for mobile devices
 * Avoids loading Recharts (~150KB) on mobile
 */
export function MobileChart({ title, data, color = '#06b6d4', showTrend = true }: MobileChartProps) {
  'use memo'

  const maxValue = Math.max(...data.map(d => d.value))
  const trend = showTrend
    ? data.length > 1
      ? ((data[data.length - 1].value - data[0].value) / data[0].value) * 100
      : 0
    : 0

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{title}</h3>
          {showTrend && (
            <span
              className={`text-xs font-medium ${
                trend >= 0 ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {trend >= 0 ? '+' : ''}
              {trend.toFixed(1)}%
            </span>
          )}
        </div>

        {/* Simple Bar Chart */}
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                <span className="font-medium">{item.value}</span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(item.value / maxValue) * 100}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            Total: {data.reduce((sum, d) => sum + d.value, 0)}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">
            Avg: {(data.reduce((sum, d) => sum + d.value, 0) / data.length).toFixed(1)}
          </div>
        </div>
      </div>
    </Card>
  )
}

/**
 * Mobile Line Chart (Simplified)
 */
export function MobileLineChart({ title, data, color = '#06b6d4' }: MobileChartProps) {
  'use memo'

  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const range = maxValue - minValue || 1

  // Generate SVG path
  const points = data
    .map((item, index) => {
      const x = (index / (data.length - 1 || 1)) * 100
      const y = 100 - ((item.value - minValue) / range) * 100
      return `${x},${y}`
    })
    .join(' ')

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">{title}</h3>

        {/* SVG Line Chart */}
        <div className="relative h-32 w-full">
          <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="none">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(y => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-slate-200 dark:text-slate-700"
              />
            ))}

            {/* Line */}
            <polyline
              points={points}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {data.map((item, index) => {
              const x = (index / (data.length - 1 || 1)) * 100
              const y = 100 - ((item.value - minValue) / range) * 100
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="2"
                  fill={color}
                  className="hover:r-3 transition-all"
                />
              )
            })}
          </svg>
        </div>

        {/* Labels */}
        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
          <span>{data[0]?.label}</span>
          <span>{data[data.length - 1]?.label}</span>
        </div>
      </div>
    </Card>
  )
}

/**
 * Mobile Pie Chart (Simplified)
 */
export function MobilePieChart({ title, data }: MobileChartProps) {
  'use memo'

  const total = data.reduce((sum, d) => sum + d.value, 0)
  const colors = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444']

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">{title}</h3>

        {/* Pie Chart */}
        <div className="flex items-center gap-4">
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              {data.map((item, index) => {
                const percentage = (item.value / total) * 100
                const previousPercentage = data
                  .slice(0, index)
                  .reduce((sum, d) => sum + (d.value / total) * 100, 0)

                const startAngle = (previousPercentage / 100) * 2 * Math.PI
                const endAngle = ((previousPercentage + percentage) / 100) * 2 * Math.PI

                const x1 = 50 + 40 * Math.cos(startAngle)
                const y1 = 50 + 40 * Math.sin(startAngle)
                const x2 = 50 + 40 * Math.cos(endAngle)
                const y2 = 50 + 40 * Math.sin(endAngle)

                const largeArcFlag = percentage > 50 ? 1 : 0

                return (
                  <path
                    key={index}
                    d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                    fill={colors[index % colors.length]}
                    className="hover:opacity-80 transition-opacity"
                  />
                )
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-1">
            {data.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="flex-1 truncate">{item.label}</span>
                <span className="font-medium">
                  {((item.value / total) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

/**
 * Loading skeleton for mobile charts
 */
export function MobileChartSkeleton() {
  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}