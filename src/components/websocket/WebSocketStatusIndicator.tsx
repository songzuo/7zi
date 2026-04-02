'use client'

/**
 * WebSocket Status Indicator Component
 *
 * Displays current WebSocket connection status with visual feedback.
 * Shows connection state, authentication status, and provides reconnect functionality.
 */

import { useWebSocket } from '@/hooks/useWebSocket'

export interface WebSocketStatusIndicatorProps {
  /**
   * Whether to show detailed information
   * @default false
   */
  detailed?: boolean

  /**
   * Whether to include reconnect button
   * @default true
   */
  showReconnect?: boolean

  /**
   * Custom class name for styling
   */
  className?: string

  /**
   * Custom size variant
   * @default 'default'
   */
  size?: 'small' | 'default' | 'large'
}

const sizeClasses = {
  small: {
    dot: 'h-2 w-2',
    text: 'text-xs',
    button: 'text-xs px-2 py-1',
  },
  default: {
    dot: 'h-3 w-3',
    text: 'text-sm',
    button: 'text-sm px-3 py-1',
  },
  large: {
    dot: 'h-4 w-4',
    text: 'text-base',
    button: 'text-base px-4 py-2',
  },
}

export function WebSocketStatusIndicator({
  detailed = false,
  showReconnect = true,
  className = '',
  size = 'default',
}: WebSocketStatusIndicatorProps) {
  const ws = useWebSocket({
    autoConnect: true,
  })

  const sizeStyles = sizeClasses[size]

  const getStatusColor = () => {
    if (ws.state.connecting) {
      return 'bg-yellow-500 animate-pulse'
    }
    if (ws.state.connected) {
      return ws.state.authenticated ? 'bg-green-500' : 'bg-orange-500'
    }
    return 'bg-red-500'
  }

  const getStatusText = () => {
    if (ws.state.connecting) return 'Connecting...'
    if (ws.state.connected) {
      return ws.state.authenticated ? 'Connected' : 'Connected (unauth)'
    }
    return 'Disconnected'
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Status Dot */}
      <div
        className={`rounded-full ${sizeStyles.dot} ${getStatusColor()}`}
        title={getStatusText()}
      />

      {/* Status Text */}
      <span className={`font-medium ${sizeStyles.text} text-slate-300`}>{getStatusText()}</span>

      {/* Detailed Information */}
      {detailed && ws.state.connected && (
        <>
          {ws.state.roomId && (
            <span className={`text-slate-500 ${sizeStyles.text}`}>
              • Room: <span className="font-mono text-slate-400">{ws.state.roomId}</span>
            </span>
          )}
          {ws.state.userId && (
            <span className={`text-slate-500 ${sizeStyles.text}`}>
              • User:{' '}
              <span className="font-mono text-slate-400">{ws.state.userId.slice(0, 8)}...</span>
            </span>
          )}
        </>
      )}

      {/* Reconnect Button */}
      {showReconnect && !ws.state.connected && (
        <button
          onClick={ws.reconnect}
          className={`${sizeStyles.button} rounded bg-blue-600 text-white transition-colors hover:bg-blue-700`}
          title="Reconnect to WebSocket server"
        >
          Reconnect
        </button>
      )}

      {/* Error Indicator */}
      {ws.state.error && (
        <span
          className={`text-red-400 ${sizeStyles.text} max-w-xs truncate`}
          title={ws.state.error}
        >
          {ws.state.error}
        </span>
      )}
    </div>
  )
}

/**
 * Compact version of WebSocket status indicator
 * Shows only the status dot with hover tooltip
 */
export function WebSocketStatusDot({
  className = '',
  size = 'small',
}: Pick<WebSocketStatusIndicatorProps, 'className' | 'size'>) {
  const ws = useWebSocket({
    autoConnect: true,
  })

  const sizeStyles = sizeClasses[size]

  const getStatusColor = () => {
    if (ws.state.connecting) {
      return 'bg-yellow-500 animate-pulse'
    }
    if (ws.state.connected) {
      return ws.state.authenticated ? 'bg-green-500' : 'bg-orange-500'
    }
    return 'bg-red-500'
  }

  const getStatusText = () => {
    if (ws.state.connecting) return 'Connecting to WebSocket...'
    if (ws.state.connected) {
      return ws.state.authenticated
        ? 'WebSocket connected and authenticated'
        : 'WebSocket connected (not authenticated)'
    }
    return 'WebSocket disconnected'
  }

  return (
    <div
      className={`rounded-full ${sizeStyles.dot} ${getStatusColor()} ${className}`}
      title={getStatusText()}
    />
  )
}
