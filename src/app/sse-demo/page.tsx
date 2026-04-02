'use client'

/**
 * SSE Demo Page
 * Test page to verify SSE implementation
 */

import { useState } from 'react'
import { useHealthSSE, useSSE } from '@/lib/sse'

export default function SSEDemoPage() {
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev.slice(-19), `[${timestamp}] ${message}`])
  }

  // Test Health SSE
  const healthSSE = useHealthSSE(true)

  // Test generic SSE
  const analyticsSSE = useSSE<{
    type: 'metrics'
    timestamp: string
    data: unknown[]
  }>('/api/stream/analytics', {
    enabled: true,
    onMessage: data => {
      addLog(`Analytics: ${data.type} - ${data.timestamp}`)
    },
    onOpen: () => addLog('Analytics SSE connected'),
    onError: err => addLog(`Analytics error: ${err}`),
  })

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="text-3xl font-bold text-zinc-900">SSE Implementation Demo</h1>

        {/* Health SSE Status */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Health SSE</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">State:</span>{' '}
              <span
                className={`rounded px-2 py-1 text-sm ${
                  healthSSE.state === 'connected'
                    ? 'bg-green-100 text-green-800'
                    : healthSSE.state === 'connecting'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                }`}
              >
                {healthSSE.state}
              </span>
            </p>
            {healthSSE.data && (
              <pre className="max-h-64 overflow-auto rounded bg-zinc-100 p-4 text-sm">
                {String(JSON.stringify(healthSSE.data, null, 2))}
              </pre>
            )}
          </div>
        </div>

        {/* Analytics SSE Status */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Analytics SSE</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">State:</span>{' '}
              <span
                className={`rounded px-2 py-1 text-sm ${
                  analyticsSSE.state === 'connected'
                    ? 'bg-green-100 text-green-800'
                    : analyticsSSE.state === 'connecting'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                }`}
              >
                {analyticsSSE.state}
              </span>
            </p>
            {analyticsSSE.data && (
              <pre className="max-h-64 overflow-auto rounded bg-zinc-100 p-4 text-sm">
                {String(JSON.stringify(analyticsSSE.data, null, 2))}
              </pre>
            )}
          </div>
        </div>

        {/* Event Log */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Event Log</h2>
            <button
              onClick={() => setLogs([])}
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              Clear Log
            </button>
          </div>
          <div className="h-64 overflow-auto rounded bg-zinc-900 p-4 font-mono text-sm text-green-400">
            {logs.length === 0 ? (
              <p className="text-zinc-500">Waiting for events...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Connection Controls */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Connection Controls</h2>
          <div className="flex gap-4">
            <button
              onClick={() => healthSSE.reconnect()}
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              Reconnect Health
            </button>
            <button
              onClick={() => analyticsSSE.reconnect()}
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              Reconnect Analytics
            </button>
            <button
              onClick={() => healthSSE.disconnect()}
              className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
            >
              Disconnect Health
            </button>
            <button
              onClick={() => analyticsSSE.disconnect()}
              className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
            >
              Disconnect Analytics
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h2 className="mb-4 text-xl font-semibold">Testing Instructions</h2>
          <ol className="list-inside list-decimal space-y-2 text-zinc-700">
            <li>Open browser DevTools Network tab</li>
            <li>Look for connections to `/api/stream/health` and `/api/stream/analytics`</li>
            <li>Verify the connection type is `eventsource`</li>
            <li>Check the EventStream tab to see incoming messages</li>
            <li>Monitor the connection state above</li>
            <li>Test reconnection by clicking disconnect then reconnect</li>
            <li>Observe the event log for real-time updates</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
