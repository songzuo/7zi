'use client'

/**
 * Performance Dashboard Component
 * 性能监控仪表板 UI 组件
 *
 * 功能：
 * - 实时显示性能指标
 * - 性能趋势图表
 * - 告警列表
 * - WebSocket 实时更新
 */

import { useState, useEffect, useCallback } from 'react'
import { AlertCircle, Activity, Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react'

// ============================================
// 类型定义
// ============================================

interface RealTimeMetrics {
  current: {
    LCP?: number
    FID?: number
    CLS?: number
    TTFB?: number
    FCP?: number
    INP?: number
  }
  custom: {
    heapSize?: number
    longTaskCount?: number
    avgRenderTime?: number
  }
  score: {
    overall: number
    lcp: number
    fid: number
    cls: number
    inp: number
  }
  timestamp: number
}

interface PerformanceTrend {
  data: Array<{
    timestamp: number
    LCP?: number
    CLS?: number
    INP?: number
    FCP?: number
    score: number
  }>
  trend: 'improving' | 'stable' | 'degrading'
  changePercent: number
}

interface PerformanceAlert {
  id: string
  metricName: string
  value: number
  threshold: number
  level: 'info' | 'warning' | 'critical'
  message: string
  timestamp: number
  route?: string
}

// ============================================
// 组件
// ============================================

export default function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<RealTimeMetrics | null>(null)
  const [trend, setTrend] = useState<PerformanceTrend | null>(null)
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  // WebSocket 连接
  useEffect(() => {
    let socket: WebSocket | null = null
    let reconnectTimer: NodeJS.Timeout | null = null

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/api/monitoring/ws`

      try {
        socket = new WebSocket(wsUrl)

        socket.onopen = () => {
          console.log('[PerformanceDashboard] Connected')
          setConnected(true)
          setLoading(false)

          // 请求初始数据
          socket?.send(JSON.stringify({ type: 'subscribe', data: {} }))
        }

        socket.onmessage = event => {
          try {
            const message = JSON.parse(event.data)

            switch (message.type) {
              case 'metrics:current':
                setMetrics(message.data)
                break
              case 'metrics:update':
                setMetrics(message.data)
                break
              case 'metrics:trend':
                setTrend(message.data)
                break
              case 'alerts:recent':
                setAlerts(message.data)
                break
              case 'alert':
                setAlerts(prev => [message.data, ...prev].slice(0, 20))
                break
            }
          } catch (error) {
            console.error('[PerformanceDashboard] Failed to parse message:', error)
          }
        }

        socket.onerror = error => {
          console.error('[PerformanceDashboard] WebSocket error:', error)
        }

        socket.onclose = () => {
          console.log('[PerformanceDashboard] Disconnected')
          setConnected(false)

          // 尝试重连
          reconnectTimer = setTimeout(() => {
            console.log('[PerformanceDashboard] Reconnecting...')
            connect()
          }, 5000)
        }
      } catch (error) {
        console.error('[PerformanceDashboard] Failed to connect:', error)
        setLoading(false)
      }
    }

    connect()

    return () => {
      if (socket) {
        socket.close()
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
    }
  }, [])

  // 获取评分颜色
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-500'
    if (score >= 50) return 'text-yellow-500'
    return 'text-red-500'
  }

  // 获取评级
  const getRating = (name: string, value?: number): { rating: string; color: string } => {
    if (value === undefined) return { rating: 'N/A', color: 'gray' }

    let goodThreshold = 0
    let poorThreshold = 0

    switch (name) {
      case 'LCP':
        goodThreshold = 2500
        poorThreshold = 4000
        break
      case 'CLS':
        goodThreshold = 0.1
        poorThreshold = 0.25
        break
      case 'INP':
        goodThreshold = 200
        poorThreshold = 500
        break
      case 'FCP':
        goodThreshold = 1800
        poorThreshold = 3000
        break
      case 'TTFB':
        goodThreshold = 800
        poorThreshold = 1800
        break
      default:
        return { rating: 'N/A', color: 'gray' }
    }

    if (value <= goodThreshold) {
      return { rating: 'Good', color: 'green' }
    } else if (value <= poorThreshold) {
      return { rating: 'Needs Improvement', color: 'yellow' }
    } else {
      return { rating: 'Poor', color: 'red' }
    }
  }

  // 格式化数值
  const formatValue = (name: string, value: number): string => {
    switch (name) {
      case 'CLS':
        return value.toFixed(3)
      case 'heapSize':
        return `${value.toFixed(1)} MB`
      default:
        return `${value.toFixed(0)} ms`
    }
  }

  // 获取趋势图标
  const getTrendIcon = (trend: PerformanceTrend['trend']) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'degrading':
        return <TrendingDown className="w-4 h-4 text-red-500" />
      default:
        return <Minus className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance Dashboard</h1>
          <p className="text-sm text-gray-500">
            Real-time performance monitoring and alerts
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span className="text-sm text-gray-600">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : metrics ? (
        <>
          {/* 性能评分卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <ScoreCard
              title="Overall Score"
              score={metrics.score.overall}
              color={getScoreColor(metrics.score.overall)}
            />
            <ScoreCard
              title="LCP Score"
              score={metrics.score.lcp}
              color={getScoreColor(metrics.score.lcp)}
            />
            <ScoreCard
              title="CLS Score"
              score={metrics.score.cls}
              color={getScoreColor(metrics.score.cls)}
            />
            <ScoreCard
              title="INP Score"
              score={metrics.score.inp}
              color={getScoreColor(metrics.score.inp)}
            />
            <ScoreCard
              title="FID Score"
              score={metrics.score.fid}
              color={getScoreColor(metrics.score.fid)}
            />
          </div>

          {/* Core Web Vitals */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Core Web Vitals</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <MetricCard
                title="LCP"
                value={metrics.current.LCP}
                rating={getRating('LCP', metrics.current.LCP)}
                formatValue={v => formatValue('LCP', v)}
              />
              <MetricCard
                title="CLS"
                value={metrics.current.CLS}
                rating={getRating('CLS', metrics.current.CLS)}
                formatValue={v => formatValue('CLS', v)}
              />
              <MetricCard
                title="INP"
                value={metrics.current.INP}
                rating={getRating('INP', metrics.current.INP)}
                formatValue={v => formatValue('INP', v)}
              />
              <MetricCard
                title="FCP"
                value={metrics.current.FCP}
                rating={getRating('FCP', metrics.current.FCP)}
                formatValue={v => formatValue('FCP', v)}
              />
              <MetricCard
                title="TTFB"
                value={metrics.current.TTFB}
                rating={getRating('TTFB', metrics.current.TTFB)}
                formatValue={v => formatValue('TTFB', v)}
              />
            </div>
          </div>

          {/* 自定义指标 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Custom Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {metrics.custom.heapSize !== undefined && (
                <MetricCard
                  title="Heap Size"
                  value={metrics.custom.heapSize}
                  rating={getRating('heapSize', metrics.custom.heapSize)}
                  formatValue={v => formatValue('heapSize', v)}
                />
              )}
              {metrics.custom.longTaskCount !== undefined && (
                <MetricCard
                  title="Long Tasks"
                  value={metrics.custom.longTaskCount}
                  rating={{ rating: 'N/A', color: 'gray' }}
                  formatValue={v => `${v}`}
                />
              )}
              {metrics.custom.avgRenderTime !== undefined && (
                <MetricCard
                  title="Avg Render Time"
                  value={metrics.custom.avgRenderTime}
                  rating={getRating('renderTime', metrics.custom.avgRenderTime)}
                  formatValue={v => `${v.toFixed(1)} ms`}
                />
              )}
            </div>
          </div>

          {/* 性能趋势 */}
          {trend && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Performance Trend</h2>
                <div className="flex items-center gap-2">
                  {getTrendIcon(trend.trend)}
                  <span className="text-sm text-gray-600">
                    {trend.changePercent > 0 ? '+' : ''}
                    {trend.changePercent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <TrendChart data={trend.data} />
            </div>
          )}

          {/* 告警列表 */}
          {alerts.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Alerts ({alerts.length})
              </h2>
              <div className="space-y-3">
                {alerts.map(alert => (
                  <AlertItem key={alert.id} alert={alert} />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-500">
          No metrics available
        </div>
      )}
    </div>
  )
}

// ============================================
// 子组件
// ============================================

function ScoreCard({
  title,
  score,
  color,
}: {
  title: string
  score: number
  color: string
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
      <div className={`text-3xl font-bold ${color}`}>{score}</div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  rating,
  formatValue,
}: {
  title: string
  value: number | undefined
  rating: { rating: string; color: string }
  formatValue: (v: number) => string
}) {
  if (value === undefined) return null

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        <Badge rating={rating.rating} color={rating.color} />
      </div>
      <div className="text-2xl font-bold text-gray-900">{formatValue(value)}</div>
    </div>
  )
}

function Badge({ rating, color }: { rating: string; color: string }) {
  const colors = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-800',
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
        colors[color as keyof typeof colors]
      }`}
    >
      {rating}
    </span>
  )
}

function AlertItem({ alert }: { alert: PerformanceAlert }) {
  const icons = {
    critical: <AlertCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertCircle className="w-5 h-5 text-yellow-500" />,
    info: <Activity className="w-5 h-5 text-blue-500" />,
  }

  const colors = {
    critical: 'border-l-red-500 bg-red-50',
    warning: 'border-l-yellow-500 bg-yellow-50',
    info: 'border-l-blue-500 bg-blue-50',
  }

  const timeAgo = new Date(alert.timestamp).toLocaleTimeString()

  return (
    <div className={`border-l-4 ${colors[alert.level]} p-4 rounded`}>
      <div className="flex items-start gap-3">
        {icons[alert.level]}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">{alert.message}</h3>
            <span className="text-xs text-gray-500">{timeAgo}</span>
          </div>
          <div className="mt-1 text-sm text-gray-600">
            <span>Value: {alert.value}</span>
            <span className="mx-2">•</span>
            <span>Threshold: {alert.threshold}</span>
          </div>
          {alert.route && (
            <div className="mt-1 text-xs text-gray-500">Route: {alert.route}</div>
          )}
        </div>
      </div>
    </div>
  )
}

function TrendChart({
  data,
}: {
  data: Array<{
    timestamp: number
    score: number
    LCP?: number
    CLS?: number
    INP?: number
  }>
}) {
  const maxScore = 100
  const height = 200
  const width = 800
  const padding = 40

  const points = data
    .map((point, index) => {
      const x = padding + (index / (data.length - 1 || 1)) * (width - 2 * padding)
      const y = height - padding - (point.score / maxScore) * (height - 2 * padding)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="bg-white">
        {/* Y轴 */}
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          stroke="#e5e7eb"
          strokeWidth="1"
        />
        <text x={padding - 10} y={padding} textAnchor="end" className="text-xs fill-gray-500">
          100
        </text>
        <text
          x={padding - 10}
          y={height - padding}
          textAnchor="end"
          className="text-xs fill-gray-500"
        >
          0
        </text>

        {/* X轴 */}
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="#e5e7eb"
          strokeWidth="1"
        />

        {/* 趋势线 */}
        {data.length > 1 && (
          <polyline
            points={points}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* 数据点 */}
        {data.map((point, index) => {
          const x = padding + (index / (data.length - 1 || 1)) * (width - 2 * padding)
          const y = height - padding - (point.score / maxScore) * (height - 2 * padding)

          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="3"
              fill="#10b981"
              className="cursor-pointer hover:r-5 transition-all"
            />
          )
        })}
      </svg>
    </div>
  )
}
