/**
 * WebSocket Status Panel Component
 *
 * Real-time WebSocket connection monitoring component that displays:
 * - Connection state (connected/disconnected/reconnecting)
 * - Heartbeat latency (ping-pong)
 * - Reconnection attempts
 * - Last active time
 * - Message send/receive statistics
 * - Connection quality metrics (latency score, stability, packet loss)
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
   * Get connection quality indicator
   */
  const getQualityIndicator = useCallback((
    quality?: ConnectionStats['connectionQuality']
  ): { icon: string; color: string; label: string } => {
    if (!quality) {
      return { icon: '❓', color: 'text-gray-400', label: 'Unknown' }
    }
    switch (quality.qualityLevel) {
      case 'excellent':
        return { icon: '💎', color: 'text-green-600', label: 'Excellent' }
      case 'good':
        return { icon: '✨', color: 'text-green-500', label: 'Good' }
      case 'fair':
        return { icon: '👌', color: 'text-yellow-600', label: 'Fair' }
      case 'poor':
        return { icon: '⚠️', color: 'text-orange-600', label: 'Poor' }
      case 'critical':
        return { icon: '🔴', color: 'text-red-600', label: 'Critical' }
      default:
        return { icon: '❓', color: 'text-gray-400', label: 'Unknown' }
    }
  }, [])

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
  const qualityInfo = getQualityIndicator(stats.connectionQuality)

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

          {/* Connection Quality */}
          {stats.connectionQuality && (
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="mb-2 text-xs font-medium text-gray-500">Connection Quality</p>
              <div className="space-y-2">
                {/* Quality Level */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{qualityInfo.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Quality</p>
                      <p className={`text-xs font-medium ${qualityInfo.color}`}>
                        {qualityInfo.label}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quality Scores */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-gray-500">Latency Score</p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-blue-500 transition-all"
                          style={{ width: `${stats.connectionQuality.latencyScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700">
                        {stats.connectionQuality.latencyScore}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Stability Score</p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-green-500 transition-all"
                          style={{ width: `${stats.connectionQuality.stabilityScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700">
                        {stats.connectionQuality.stabilityScore}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Packet Loss */}
                <div>
                  <p className="text-xs text-gray-500">Packet Loss Estimate</p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-gray-200">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          stats.connectionQuality.packetLossEstimate < 0.05
                            ? 'bg-green-500'
                            : stats.connectionQuality.packetLossEstimate < 0.1
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${stats.connectionQuality.packetLossEstimate * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700">
                      {(stats.connectionQuality.packetLossEstimate * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

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
