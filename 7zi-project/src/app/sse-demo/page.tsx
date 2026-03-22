'use client';

/**
 * SSE Demo Page
 * Test page to verify SSE implementation
 */

import { useState } from 'react';
import { useHealthSSE, useSSE } from '@/lib/sse';

export default function SSEDemoPage() {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-19), `[${timestamp}] ${message}`]);
  };

  // Test Health SSE
  const healthSSE = useHealthSSE(true);

  // Test generic SSE
  const analyticsSSE = useSSE<{
    type: 'metrics';
    timestamp: string;
    data: unknown[];
  }>('/api/stream/analytics', {
    enabled: true,
    onMessage: (data) => {
      addLog(`Analytics: ${data.type} - ${data.timestamp}`);
    },
    onOpen: () => addLog('Analytics SSE connected'),
    onError: (err) => addLog(`Analytics error: ${err}`),
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">
          SSE Implementation Demo
        </h1>

        {/* Health SSE Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Health SSE</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">State:</span>{' '}
              <span
                className={`px-2 py-1 rounded text-sm ${
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
              <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-64 text-sm">
                {JSON.stringify(healthSSE.data, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Analytics SSE Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Analytics SSE</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">State:</span>{' '}
              <span
                className={`px-2 py-1 rounded text-sm ${
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
              <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-64 text-sm">
                {JSON.stringify(analyticsSSE.data, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Event Log */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Event Log</h2>
            <button
              onClick={() => setLogs([])}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Clear Log
            </button>
          </div>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-64 overflow-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">Waiting for events...</p>
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
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Connection Controls</h2>
          <div className="flex gap-4">
            <button
              onClick={() => healthSSE.reconnect()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Reconnect Health
            </button>
            <button
              onClick={() => analyticsSSE.reconnect()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Reconnect Analytics
            </button>
            <button
              onClick={() => healthSSE.disconnect()}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Disconnect Health
            </button>
            <button
              onClick={() => analyticsSSE.disconnect()}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Disconnect Analytics
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Testing Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
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
  );
}
