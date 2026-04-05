/**
 * RealTimeStream - 实时数据流监控组件
 *
 * 显示实时更新的数据流和连接状态。
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Activity, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface RealTimeStreamProps {
  className?: string
}

interface StreamEvent {
  id: string
  timestamp: string
  type: 'workflow' | 'task' | 'node' | 'system'
  message: string
  status: 'success' | 'error' | 'warning' | 'info'
}

/**
 * Generate mock stream events
 */
function generateMockEvent(): StreamEvent {
  const types: StreamEvent['type'][] = ['workflow', 'task', 'node', 'system']
  const statuses: StreamEvent['status'][] = ['success', 'error', 'warning', 'info']
  const messages = [
    '工作流执行完成',
    '任务分配成功',
    '节点执行超时',
    '系统资源警告',
    'API 响应时间异常',
    '数据同步完成',
    '缓存更新成功',
    'WebSocket 连接重连',
  ]

  return {
    id: Math.random().toString(36).substring(7),
    timestamp: new Date().toISOString(),
    type: types[Math.floor(Math.random() * types.length)],
    message: messages[Math.floor(Math.random() * messages.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
  }
}

/**
 * Get status color
 */
function getStatusColor(status: StreamEvent['status']): string {
  switch (status) {
    case 'success':
      return 'text-green-500'
    case 'error':
      return 'text-red-500'
    case 'warning':
      return 'text-yellow-500'
    case 'info':
      return 'text-blue-500'
    default:
      return 'text-gray-500'
  }
}

/**
 * Get status badge variant
 */
function getStatusBadgeVariant(status: StreamEvent['status']): 'default' | 'destructive' | 'outline' | 'secondary' {
  switch (status) {
    case 'success':
      return 'default'
    case 'error':
      return 'destructive'
    case 'warning':
      return 'outline'
    case 'info':
      return 'secondary'
    default:
      return 'secondary'
  }
}

/**
 * Format timestamp
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/**
 * StreamEventItem component
 */
function StreamEventItem({ event }: { event: StreamEvent }) {
  return (
    <div className="flex items-start space-x-3 p-2 rounded hover:bg-accent/50 transition-colors">
      <div className={cn('mt-0.5', getStatusColor(event.status))}>
        <Activity className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-0.5">
          <p className="text-sm text-foreground truncate">{event.message}</p>
          <Badge variant={getStatusBadgeVariant(event.status)} className="text-xs">
            {event.type}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{formatTimestamp(event.timestamp)}</p>
      </div>
    </div>
  )
}

/**
 * RealTimeStream main component
 */
export function RealTimeStream({ className }: RealTimeStreamProps) {
  const [events, setEvents] = useState<StreamEvent[]>([])
  const [isConnected, setIsConnected] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toISOString())

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate connection status
      setIsConnected(Math.random() > 0.1) // 90% uptime

      // Add new event
      const newEvent = generateMockEvent()
      setEvents(prev => [newEvent, ...prev].slice(0, 20)) // Keep last 20 events
      setLastUpdate(new Date().toISOString())
    }, 3000) // Update every 3 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>实时数据流</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Badge variant="default" className="text-xs bg-green-500">
                <Wifi className="w-3 h-3 mr-1" />
                已连接
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">
                <WifiOff className="w-3 h-3 mr-1" />
                断开
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              <RefreshCw className="w-3 h-3 mr-1" />
              {formatTimestamp(lastUpdate)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {events.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <p className="text-sm">等待数据...</p>
            </div>
          ) : (
            events.map(event => (
              <StreamEventItem key={event.id} event={event} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Compact RealTime indicator (for header/sidebar)
 */
export function RealTimeIndicator() {
  const [isConnected, setIsConnected] = useState(true)
  const [eventCount, setEventCount] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(Math.random() > 0.1)
      setEventCount(prev => prev + 1)
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center space-x-2">
      <div className={cn(
        'w-2 h-2 rounded-full',
        isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
      )} />
      <span className="text-xs text-muted-foreground">
        {eventCount} 事件
      </span>
    </div>
  )
}

export default RealTimeStream