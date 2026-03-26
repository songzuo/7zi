/**
 * WebSocket Status Panel Demo Page
 *
 * Demonstrates the WebSocketStatusPanel component features
 */

'use client';

import { useState } from 'react';
import { WebSocketManager, ConnectionState } from '@/lib/websocket-manager';
import {
  WebSocketStatusPanel,
  WebSocketStatusBadge,
} from '@/components/websocket';
import { useWebSocketStatus } from '@/hooks/useWebSocketStatus';

export default function WebSocketStatusDemoPage() {
  const socketUrl = process.env.NEXT_PUBLIC_NOTIFICATION_SOCKET_URL || 'http://localhost:3001';

  // Create WebSocket manager instance
  const [wsManager] = useState(() => {
    return new WebSocketManager({
      url: socketUrl,
      autoConnect: false,
      transports: ['websocket', 'polling'],
      heartbeatInterval: 25000,
      heartbeatTimeout: 10000,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      reconnectionAttempts: Infinity,
      maxQueueSize: 100,
      queueExpiry: 300000,
    });
  });

  // Use the hook for easy access to connection status
  const {
    state,
    isConnected,
    isReconnecting,
    stats,
    queueSize,
    connect,
    disconnect,
    resetStats,
  } = useWebSocketStatus(wsManager);

  const [showDetails, setShowDetails] = useState(true);
  const [demoMode, setDemoMode] = useState<'full' | 'compact' | 'badge'>('full');

  // Send test message
  const sendTestMessage = () => {
    wsManager.emit('test_message', {
      timestamp: Date.now(),
      message: 'Test message from demo',
    });
  };

  // Toggle connection
  const toggleConnection = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            WebSocket Status Panel Demo
          </h1>
          <p className="text-gray-600">
            Real-time connection monitoring with detailed statistics
          </p>
          <div className="flex justify-center items-center gap-4 text-sm">
            <WebSocketStatusBadge wsManager={wsManager} />
            <span className="text-gray-400">|</span>
            <span className="text-gray-500">{queueSize} queued</span>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Connection Toggle */}
            <button
              onClick={toggleConnection}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isConnected
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isConnected ? 'Disconnect' : 'Connect'}
            </button>

            {/* Send Test Message */}
            <button
              onClick={sendTestMessage}
              disabled={!isConnected}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Send Test Message
            </button>

            {/* Reset Stats */}
            <button
              onClick={resetStats}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Reset Stats
            </button>

            {/* Demo Mode Selector */}
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-sm text-gray-600 font-medium">Mode:</label>
              <select
                value={demoMode}
                onChange={(e) => setDemoMode(e.target.value as any)}
                className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="full">Full Panel</option>
                <option value="compact">Compact</option>
                <option value="badge">Badge Only</option>
              </select>
            </div>

            {/* Show Details Toggle */}
            {demoMode !== 'badge' && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDetails}
                  onChange={(e) => setShowDetails(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600 font-medium">Details</span>
              </label>
            )}
          </div>
        </div>

        {/* Status Panel */}
        {demoMode === 'full' && (
          <div className="space-y-4">
            <WebSocketStatusPanel
              wsManager={wsManager}
              showDetails={showDetails}
            />
          </div>
        )}

        {demoMode === 'compact' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-700">Compact Mode</h2>
            <WebSocketStatusPanel
              wsManager={wsManager}
              showDetails={showDetails}
              className="max-w-md"
            />
          </div>
        )}

        {demoMode === 'badge' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-700">Badge Mode</h2>
            <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
              <WebSocketStatusBadge wsManager={wsManager} className="text-xl" />
            </div>
          </div>
        )}

        {/* Statistics Summary */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Statistics Summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-medium">Messages Sent</p>
              <p className="text-2xl font-bold text-blue-900">{stats.messagesSent}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600 font-medium">Messages Received</p>
              <p className="text-2xl font-bold text-green-900">{stats.messagesReceived}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-purple-600 font-medium">Reconnections</p>
              <p className="text-2xl font-bold text-purple-900">{stats.totalReconnections}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-sm text-orange-600 font-medium">Avg Latency</p>
              <p className="text-2xl font-bold text-orange-900">
                {Math.round(stats.averagePingLatency)}ms
              </p>
            </div>
          </div>
        </div>

        {/* Connection History */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Connection State History
          </h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
            <p>
              <span className="text-yellow-400">Current State:</span>{' '}
              {state.toUpperCase()}
            </p>
            <p>
              <span className="text-yellow-400">Last Active:</span>{' '}
              {new Date(stats.lastActiveTime).toLocaleString()}
            </p>
            <p>
              <span className="text-yellow-400">Current Latency:</span>{' '}
              {stats.currentPingLatency > 0 ? `${stats.currentPingLatency}ms` : 'N/A'}
            </p>
            <p>
              <span className="text-yellow-400">Average Latency:</span>{' '}
              {Math.round(stats.averagePingLatency)}ms
            </p>
            <p>
              <span className="text-yellow-400">Queue Size:</span> {queueSize}
            </p>
          </div>
        </div>

        {/* Features List */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Component Features
          </h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Real-time updates:</strong> Connection status and stats update every second</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Performance optimized:</strong> Uses memoization and efficient state management</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Responsive design:</strong> Mobile-friendly layout with Tailwind CSS</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Multiple modes:</strong> Full panel, compact view, and badge-only modes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Visual indicators:</strong> Color-coded status with emoji icons</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Detailed statistics:</strong> Message counts, latency, reconnections, and queue size</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Collapsible interface:</strong> Expand/collapse for space optimization</span>
            </li>
          </ul>
        </div>

        {/* Usage Examples */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Usage Examples
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Basic Usage
              </h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
{`import { WebSocketStatusPanel } from '@/components/websocket';
import { WebSocketManager } from '@/lib/websocket-manager';

const wsManager = new WebSocketManager({ url: 'ws://...' });

<WebSocketStatusPanel wsManager={wsManager} />`}
              </pre>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                With Hook
              </h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
{`import { useWebSocketStatus } from '@/hooks';
import { WebSocketStatusBadge } from '@/components/websocket';

const { stats, isConnected } = useWebSocketStatus(wsManager);

<WebSocketStatusBadge wsManager={wsManager} />
<p>Latency: {stats.currentPingLatency}ms</p>`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
