/**
 * WebSocket Stability Demo Component
 *
 * Demonstrates WebSocket stability features:
 * - Connection state monitoring
 * - Heartbeat status
 * - Message queuing
 * - Reconnection progress
 */

'use client'

import { useState, useEffect } from 'react'
import { useNotificationsStable } from '@/hooks/useNotificationsStable'
import { ConnectionState } from '@/lib/websocket-manager'

export default function WebSocketStabilityDemo() {
  const {
    notifications,
    unreadCount,
    connectionState,
    isConnected,
    isReconnecting,
    queueSize,
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
  } = useNotificationsStable({
    autoConnect: false,
    userId: 'demo-user',
    teamId: 'demo-team',
    channels: ['general', 'alerts'],
  })

  const [logEntries, setLogEntries] = useState<string[]>([])
  const [manualMessage, setManualMessage] = useState('')

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogEntries(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)])
  }

  // Log connection state changes
  useEffect(() => {
    addLog(`State changed: ${connectionState}`)
  }, [connectionState])

  // Log queue size changes
  useEffect(() => {
    if (queueSize > 0) {
      addLog(`Queue size: ${queueSize}`)
    }
  }, [queueSize])

  const getStatusColor = (state: ConnectionState): string => {
    switch (state) {
      case ConnectionState.CONNECTED:
        return 'text-green-600'
      case ConnectionState.CONNECTING:
      case ConnectionState.RECONNECTING:
        return 'text-yellow-600'
      case ConnectionState.DISCONNECTED:
        return 'text-gray-600'
      case ConnectionState.ERROR:
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusIcon = (state: ConnectionState): string => {
    switch (state) {
      case ConnectionState.CONNECTED:
        return '✅'
      case ConnectionState.CONNECTING:
        return '🔄'
      case ConnectionState.RECONNECTING:
        return '⏳'
      case ConnectionState.DISCONNECTED:
        return '⭕'
      case ConnectionState.ERROR:
        return '❌'
      default:
        return '❓'
    }
  }

  const sendTestNotification = async () => {
    try {
      addLog('Sending test notification...')
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Notification',
          message: manualMessage || 'This is a test notification',
          type: 'info',
          priority: 'medium',
          userId: 'demo-user',
        }),
      })

      if (response.ok) {
        addLog('✓ Test notification sent')
      } else {
        addLog('✗ Failed to send test notification')
      }
    } catch (error) {
      addLog(`✗ Error: ${error}`)
    }
  }

  const clearLogs = () => {
    setLogEntries([])
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">WebSocket Stability Demo</h1>

      {/* Connection Status Panel */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold">Connection Status</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">State</label>
            <div className={`text-2xl font-bold ${getStatusColor(connectionState)}`}>
              {getStatusIcon(connectionState)} {connectionState.toUpperCase()}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600">Connected</label>
            <div className="text-2xl font-bold">{isConnected ? '✅ Yes' : '❌ No'}</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">Reconnecting</label>
            <div className="text-2xl font-bold">{isReconnecting ? '⏳ Yes' : '✅ No'}</div>
          </div>
          <div>
            <label className="text-sm text-gray-600">Queue Size</label>
            <div className="text-2xl font-bold">
              {queueSize} {queueSize > 0 && '⚠️'}
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={connect}
            disabled={isConnected}
            className="rounded bg-blue-500 px-4 py-2 text-white disabled:bg-gray-300"
          >
            Connect
          </button>
          <button
            onClick={disconnect}
            disabled={!isConnected}
            className="rounded bg-red-500 px-4 py-2 text-white disabled:bg-gray-300"
          >
            Disconnect
          </button>
        </div>
      </div>

      {/* Notification Actions */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold">Notification Actions</h2>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={manualMessage}
              onChange={e => setManualMessage(e.target.value)}
              placeholder="Custom message (optional)"
              className="flex-1 rounded border px-3 py-2"
            />
            <button
              onClick={sendTestNotification}
              disabled={!isConnected}
              className="rounded bg-green-500 px-4 py-2 text-white disabled:bg-gray-300"
            >
              Send Test Notification
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => markAllAsRead()}
              disabled={unreadCount === 0}
              className="rounded bg-yellow-500 px-4 py-2 text-white disabled:bg-gray-300"
            >
              Mark All as Read ({unreadCount})
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold">Notifications ({notifications.length})</h2>
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-gray-500">No notifications</p>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                className={`rounded border p-3 ${
                  notif.read ? 'bg-gray-50' : 'border-blue-200 bg-blue-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{notif.title}</h3>
                    <p className="text-sm text-gray-600">{notif.message}</p>
                    <div className="mt-1 text-xs text-gray-400">
                      Type: {notif.type} | Priority: {notif.priority} |{' '}
                      {new Date(notif.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {!notif.read && (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      className="rounded bg-blue-500 px-2 py-1 text-sm text-white"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Activity Log */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Activity Log</h2>
          <button onClick={clearLogs} className="rounded bg-gray-500 px-3 py-1 text-sm text-white">
            Clear
          </button>
        </div>
        <div className="h-64 overflow-y-auto rounded bg-gray-900 p-4 font-mono text-sm text-green-400">
          {logEntries.length === 0 ? (
            <p className="text-gray-500">No activity yet</p>
          ) : (
            logEntries.map((entry, index) => <div key={index}>{entry}</div>)
          )}
        </div>
      </div>

      {/* Feature Explanation */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold">Stability Features</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-blue-600">💓 Heartbeat Monitoring</h3>
            <p className="text-sm text-gray-600">
              Automatic ping/pong every 25 seconds. If 3 consecutive pings are missed, connection is
              considered dead and auto-reconnects.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-green-600">📈 Exponential Backoff</h3>
            <p className="text-sm text-gray-600">
              Reconnection attempts use exponential backoff: 1s → 2s → 4s → 8s ... up to 30s max.
              This prevents overwhelming the server during outages.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-yellow-600">📊 Connection State</h3>
            <p className="text-sm text-gray-600">
              Track connection through states: DISCONNECTED → CONNECTING → CONNECTED → RECONNECTING.
              UI can respond to each state appropriately.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-purple-600">📬 Message Queuing</h3>
            <p className="text-sm text-gray-600">
              Messages sent while offline are queued (up to 100, 5 min expiry) and sent
              automatically when connection is restored. Check queue size to see pending messages.
            </p>
          </div>
        </div>
      </div>

      {/* Testing Instructions */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
        <h2 className="mb-4 text-xl font-semibold text-blue-800">Testing Instructions</h2>
        <ol className="list-inside list-decimal space-y-2 text-sm text-blue-700">
          <li>
            Click <strong>Connect</strong> to establish WebSocket connection
          </li>
          <li>Send test notifications to see real-time updates</li>
          <li>
            Click <strong>Disconnect</strong> to simulate network loss
          </li>
          <li>Send more notifications while disconnected (they will be queued)</li>
          <li>
            Click <strong>Connect</strong> again to see exponential backoff reconnection
          </li>
          <li>Watch the activity log to see connection state changes and queue operations</li>
          <li>Observe how queued messages are sent after reconnection</li>
        </ol>
      </div>
    </div>
  )
}
