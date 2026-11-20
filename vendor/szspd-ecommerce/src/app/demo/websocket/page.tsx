'use client'

/**
 * WebSocket Demo Page
 *
 * Demonstrates real-time WebSocket functionality including:
 * - Connection management
 * - Heartbeat monitoring
 * - Task status updates
 * - Room participation
 */

// Force dynamic rendering - this page requires client-side only
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useWebSocket, useTaskStatusUpdates, type TaskStatusUpdate } from '@/hooks/useWebSocket'

export default function WebSocketDemoPage() {
  // All hooks must be called at the top level
  const [isMounted, setIsMounted] = useState(false)
  const [messages, setMessages] = useState<string[]>([])
  const [roomId, setRoomId] = useState('demo-room')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const ws = useWebSocket({
    autoConnect: false, // Let user control connection
    reconnection: true,
  })

  const taskWs = useTaskStatusUpdates({
    autoConnect: false,
  })

  const addMessage = useCallback((msg: string) => {
    setMessages(prev => [...prev.slice(-19), `[${new Date().toLocaleTimeString()}] ${msg}`])
  }, [])

  // Initialize mount state
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true)
  }, [])

  // Log connection status changes
  useEffect(() => {
    if (ws.state.connected) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      addMessage(`✅ Connected to WebSocket server`)
    }
    if (ws.state.error) {
      addMessage(`❌ Error: ${ws.state.error}`)
    }
  }, [ws.state.connected, ws.state.error, addMessage])

  // Log task status updates
  useEffect(() => {
    taskWs.taskUpdates.forEach((update, taskId) => {
      addMessage(`📊 Task ${taskId}: ${update.status} (${update.state})`)
    })
  }, [taskWs.taskUpdates.size, addMessage])

  // Skip SSR - render null instead of early return
  if (!isMounted) {
    return null
  }

  const handleConnect = () => {
    addMessage('🔌 Connecting...')
    ws.connect()
    taskWs.connect()
  }

  const handleDisconnect = () => {
    addMessage('🔌 Disconnecting...')
    ws.disconnect()
    taskWs.disconnect()
  }

  const handleJoinRoom = () => {
    ws.joinRoom(roomId, 'project', 'demo-document', 'Demo Room')
    addMessage(`🏠 Joining room: ${roomId}`)
  }

  const handleLeaveRoom = () => {
    ws.leaveRoom(roomId)
    addMessage(`🚪 Leaving room: ${roomId}`)
  }

  const handleSendTestMessage = () => {
    ws.send('test:message', { text: 'Hello from WebSocket!', timestamp: new Date().toISOString() })
    addMessage(`📤 Sent test message`)
  }

  const handleSimulateTaskUpdate = () => {
    // Simulate a task status update (in real app, this would come from backend)
    const taskId = `task-${Date.now()}`
    const mockUpdate: TaskStatusUpdate = {
      taskId,
      status: 'Processing',
      state: 'running',
      timestamp: new Date().toISOString(),
      userId: ws.state.userId,
      projectId: 'demo-project',
      metadata: { progress: 50 },
    }

    // In real app, backend would broadcast this via broadcastTaskStatusUpdate()
    // Here we just show what the UI would receive
    addMessage(`📤 Simulating task update: ${taskId}`)
  }

  const handleClearMessages = () => {
    setMessages([])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-white">WebSocket Real-Time Demo</h1>
          <p className="text-slate-300">
            Enhanced WebSocket with heartbeat, reconnection, and task status updates
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Connection Status */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
              <span>🔗</span> Connection Status
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Status:</span>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${
                    ws.state.connected
                      ? 'bg-green-500/20 text-green-400'
                      : ws.state.connecting
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {ws.state.connected
                    ? 'Connected'
                    : ws.state.connecting
                      ? 'Connecting...'
                      : 'Disconnected'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Authenticated:</span>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${
                    ws.state.authenticated
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-slate-500/20 text-slate-400'
                  }`}
                >
                  {ws.state.authenticated ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Room:</span>
                <span className="font-mono text-white">{ws.state.roomId || 'None'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">User ID:</span>
                <span className="font-mono text-sm text-white">
                  {ws.state.userId || 'Not authenticated'}
                </span>
              </div>
              {ws.state.error && (
                <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <p className="text-sm text-red-400">{ws.state.error}</p>
                </div>
              )}
            </div>

            {/* Connection Controls */}
            <div className="mt-6 flex flex-wrap gap-2">
              {!ws.state.connected ? (
                <button
                  onClick={handleConnect}
                  className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700"
                >
                  Connect
                </button>
              ) : (
                <button
                  onClick={handleDisconnect}
                  className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700"
                >
                  Disconnect
                </button>
              )}
              <button
                onClick={ws.reconnect}
                className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
              >
                Reconnect
              </button>
            </div>
          </div>

          {/* Room Controls */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
              <span>🏠</span> Room Management
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-300">Room ID</label>
                <input
                  type="text"
                  value={roomId}
                  onChange={e => setRoomId(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  placeholder="Enter room ID"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleJoinRoom}
                  disabled={!ws.state.connected}
                  className="rounded-lg bg-purple-600 px-4 py-2 font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                >
                  Join Room
                </button>
                <button
                  onClick={handleLeaveRoom}
                  disabled={!ws.state.roomId}
                  className="rounded-lg bg-orange-600 px-4 py-2 font-medium text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                >
                  Leave Room
                </button>
              </div>
            </div>

            {/* Test Actions */}
            <div className="mt-6">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-medium text-white">
                <span>🧪</span> Test Actions
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleSendTestMessage}
                  disabled={!ws.state.connected}
                  className="rounded-lg bg-cyan-600 px-4 py-2 font-medium text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                >
                  Send Test Message
                </button>
                <button
                  onClick={handleSimulateTaskUpdate}
                  className="rounded-lg bg-pink-600 px-4 py-2 font-medium text-white transition-colors hover:bg-pink-700"
                >
                  Simulate Task Update
                </button>
                <button
                  onClick={handleClearMessages}
                  className="rounded-lg bg-slate-600 px-4 py-2 font-medium text-white transition-colors hover:bg-slate-700"
                >
                  Clear Messages
                </button>
              </div>
            </div>
          </div>

          {/* Message Log */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm lg:col-span-2">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
              <span>📜</span> Message Log
            </h2>
            <div className="h-64 space-y-1 overflow-y-auto rounded-lg bg-slate-900/50 p-4 font-mono text-sm">
              {messages.length === 0 ? (
                <p className="py-8 text-center text-slate-500">
                  No messages yet. Connect and try the actions above!
                </p>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className="text-slate-300 transition-colors hover:text-white">
                    {msg}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Task Status Updates */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm lg:col-span-2">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
              <span>📊</span> Task Status Updates
              <span className="ml-2 text-sm font-normal text-slate-400">
                ({taskWs.taskUpdates.size} updates received)
              </span>
            </h2>
            {taskWs.taskUpdates.size === 0 ? (
              <div className="py-8 text-center text-slate-500">
                No task updates yet. Click &quot;Simulate Task Update&quot; to see how it works!
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from(taskWs.taskUpdates.entries()).map(([taskId, update]) => (
                  <div
                    key={taskId}
                    className="cursor-pointer rounded-lg border border-slate-700 bg-slate-900/50 p-4 transition-colors hover:border-purple-500/50"
                    onClick={() => setSelectedTaskId(taskId)}
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <span className="truncate font-mono text-sm text-white">{taskId}</span>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          update.state === 'completed'
                            ? 'bg-green-500/20 text-green-400'
                            : update.state === 'running'
                              ? 'bg-blue-500/20 text-blue-400'
                              : update.state === 'failed'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-slate-500/20 text-slate-400'
                        }`}
                      >
                        {update.state}
                      </span>
                    </div>
                    <div className="text-sm text-slate-400">{update.status}</div>
                    <div className="mt-2 text-xs text-slate-500">
                      {new Date(update.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mt-8 rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
            <span>📖</span> Usage Instructions
          </h2>
          <div className="grid gap-6 text-sm text-slate-300 md:grid-cols-3">
            <div>
              <h3 className="mb-2 font-medium text-white">1. Connect</h3>
              <p>
                Click &quot;Connect&quot; to establish a WebSocket connection. The system will
                automatically authenticate using your session token.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-medium text-white">2. Join a Room</h3>
              <p>
                Enter a room ID and click &quot;Join Room&quot; to participate in real-time
                collaboration with other users.
              </p>
            </div>
            <div>
              <h3 className="mb-2 font-medium text-white">3. Monitor Events</h3>
              <p>
                Watch the message log and task status updates for real-time event broadcasts from
                the server.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
