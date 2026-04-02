/**
 * WebSocket Status Panel Component
 *
 * Real-time WebSocket connection monitoring component that displays:
 * - Connection state (connected/disconnected/reconnecting)
 * - Heartbeat latency (ping-pong)
 * - Reconnection attempts
 * - Last active time
 * - Message send/receive statistics
 *
 * Features:
 * - Responsive design (mobile-friendly)
 * - Real-time updates
 * - Performance optimized (avoids unnecessary re-renders)
 * - Visual indicators for connection health
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { ConnectionState, ConnectionStats, WebSocketManager } from '@/lib/websocket-manager'

interface WebSocketStatusPanelProps {
  wsManager: WebSocketManager
  showDetails?: boolean
  className?: string
}

/**
 * WebSocket Status Panel Component
 */
export function WebSocketStatusPanel({
  wsManager,
  showDetails = true,
  className = '',
}: WebSocketStatusPanelProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>(wsManager.getState())
  const [stats, setStats] = useState<ConnectionStats>(wsManager.getStats())
  const [queueSize, setQueueSize] = useState(wsManager.getQueueSize())
  const [isVisible, setIsVisible] = useState(true)

  /**
   * Update connection state
   */
  useEffect(() => {
    const handleStateChange = (newState: ConnectionState) => {
      setConnectionState(newState)
    }

    wsManager.onStateChange(handleStateChange)

    return () => {
      wsManager.offStateChange(handleStateChange)
    }
  }, [wsManager])

  /**
   * Periodic stats update (every 1 second)
   */
  useEffect(() => {
    const updateStats = () => {
      if (isVisible) {
        setStats(wsManager.getStats())
        setQueueSize(wsManager.getQueueSize())
      }
    }

    const interval = setInterval(updateStats, 1000)

    return () => clearInterval(interval)
  }, [wsManager, isVisible])

  /**
   * Get connection status display info
   */
  const statusInfo = useMemo(() => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return {
          label: 'Connected',
          icon: '🟢',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200',
        }
      case ConnectionState.CONNECTING:
        return {
          label: 'Connecting',
          icon: '🟡',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          borderColor: 'border-yellow-200',
        }
      case ConnectionState.RECONNECTING:
        return {
          label: 'Reconnecting',
          icon: '🔄',
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          borderColor: 'border-orange-200',
        }
      case ConnectionState.DISCONNECTED:
        return {
          label: 'Disconnected',
          icon: '⚫',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
        }
      case ConnectionState.ERROR:
        return {
          label: 'Error',
          icon: '🔴',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200',
        }
      default:
        return {
          label: 'Unknown',
          icon: '❓',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
        }
    }
  }, [connectionState])

  /**
   * Get ping latency indicator
   */
  const getLatencyIndicator = useCallback((latency: number): { icon: string; color: string } => {
    if (latency === 0) return { icon: '⚪', color: 'text-gray-400' }
    if (latency < 50) return { icon: '🚀', color: 'text-green-500' }
    if (latency < 150) return { icon: '✅', color: 'text-green-600' }
    if (latency < 300) return { icon: '⚠️', color: 'text-yellow-600' }
    return { icon: '⏳', color: 'text-red-600' }
  }, [])

  /**
   * Format time duration
   */
  const formatDuration = useCallback((milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }, [])

  /**
   * Format timestamp
   */
  const formatTimestamp = useCallback((timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString()
  }, [])

  /**
   * Calculate time since last activity
   */
  const timeSinceLastActive = useMemo(() => {
    return Date.now() - stats.lastActiveTime
  }, [stats.lastActiveTime])

  const latencyInfo = getLatencyIndicator(stats.currentPingLatency)

  return (
    <div
      className={`rounded-lg border shadow-sm ${statusInfo.bgColor} ${statusInfo.borderColor} ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{statusInfo.icon}</span>
          <div>
            <h3 className="text-sm font-semibold">WebSocket Status</h3>
            <p className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</p>
          </div>
        </div>
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="p-1 text-gray-500 transition-colors hover:text-gray-700"
          aria-label={isVisible ? 'Collapse' : 'Expand'}
        >
          {isVisible ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>

      {/* Details */}
      {isVisible && showDetails && (
        <div className="space-y-3 p-3">
          {/* Connection Health */}
          <div className="grid grid-cols-2 gap-3">
            {/* Latency */}
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">Latency</p>
                  <p className={`text-lg font-bold ${latencyInfo.color}`}>
                    {stats.currentPingLatency > 0 ? `${stats.currentPingLatency}ms` : '--'}
                  </p>
                  {stats.currentPingLatency > 0 && (
                    <p className="text-xs text-gray-400">
                      avg: {Math.round(stats.averagePingLatency)}ms
                    </p>
                  )}
                </div>
                <span className="text-2xl">{latencyInfo.icon}</span>
              </div>
            </div>

            {/* Last Active */}
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">Last Active</p>
                  <p className="text-lg font-bold text-gray-700">
                    {formatDuration(timeSinceLastActive)} ago
                  </p>
                  <p className="text-xs text-gray-400">{formatTimestamp(stats.lastActiveTime)}</p>
                </div>
                <span className="text-2xl">⏱️</span>
              </div>
            </div>
          </div>

          {/* Message Statistics */}
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="mb-2 text-xs font-medium text-gray-500">Message Statistics</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <span className="text-green-500">↑</span>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Sent</p>
                  <p className="text-xs text-gray-500">{stats.messagesSent}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-500">↓</span>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Received</p>
                  <p className="text-xs text-gray-500">{stats.messagesReceived}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Reconnection Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔄</span>
                <div>
                  <p className="text-xs font-medium text-gray-500">Reconnections</p>
                  <p className="text-lg font-bold text-gray-700">{stats.totalReconnections}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📬</span>
                <div>
                  <p className="text-xs font-medium text-gray-500">Queue</p>
                  <p className="text-lg font-bold text-gray-700">{queueSize}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compact view when showDetails is false */}
      {isVisible && !showDetails && (
        <div className="px-3 pb-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span>{latencyInfo.icon}</span>
              <span className={latencyInfo.color}>
                {stats.currentPingLatency > 0 ? `${stats.currentPingLatency}ms` : '--'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-gray-600">
              <span>↑ {stats.messagesSent}</span>
              <span>↓ {stats.messagesReceived}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Compact WebSocket Status Badge
 *
 * A minimal version that shows only the status indicator
 */
export function WebSocketStatusBadge({
  wsManager,
  className = '',
}: Pick<WebSocketStatusPanelProps, 'wsManager' | 'className'>) {
  const [connectionState, setConnectionState] = useState<ConnectionState>(wsManager.getState())

  useEffect(() => {
    const handleStateChange = (newState: ConnectionState) => {
      setConnectionState(newState)
    }

    wsManager.onStateChange(handleStateChange)

    return () => {
      wsManager.offStateChange(handleStateChange)
    }
  }, [wsManager])

  const statusInfo = useMemo(() => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return { icon: '🟢', tooltip: 'Connected' }
      case ConnectionState.CONNECTING:
        return { icon: '🟡', tooltip: 'Connecting' }
      case ConnectionState.RECONNECTING:
        return { icon: '🔄', tooltip: 'Reconnecting' }
      case ConnectionState.DISCONNECTED:
        return { icon: '⚫', tooltip: 'Disconnected' }
      case ConnectionState.ERROR:
        return { icon: '🔴', tooltip: 'Error' }
      default:
        return { icon: '❓', tooltip: 'Unknown' }
    }
  }, [connectionState])

  return (
    <div className={`inline-flex items-center gap-2 ${className}`} title={statusInfo.tooltip}>
      <span className="text-lg">{statusInfo.icon}</span>
      <span className="text-sm font-medium">{statusInfo.tooltip}</span>
    </div>
  )
}
