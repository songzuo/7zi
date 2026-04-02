/**
 * WebSocket Collaboration Demo Content
 *
 * Interactive demo page for testing WebSocket collaboration features
 * Separated to enable dynamic loading
 */

'use client'

import React, { useState } from 'react'
import { useCollaboration } from '@/lib/websocket'
import { ConnectionStatus, UserList } from '@/components/collaboration/ConnectionStatus'

type RoomType = 'task' | 'project' | 'chat' | 'document'

// Generate stable random ID outside of render (module scope)
const generateUserId = () => `user-${Math.floor(Math.random() * 1000)}`
const generateUserName = () => `User ${Math.floor(Math.random() * 1000)}`

export default function CollaborationDemoContent() {
  const [config, setConfig] = useState({
    url: 'ws://localhost:3002',
    token: '',
    userId: generateUserId(),
    userName: generateUserName(),
    roomType: 'task' as RoomType,
    roomId: 'demo-task-1',
    documentId: 'demo-doc-1',
  })

  const {
    connectionState,
    isConnected,
    isInRoom,
    users,
    cursors,
    document,
    typingUsers,
    connect,
    disconnect,
    reconnect,
    joinRoom,
    leaveRoom,
    sendOperation,
    setTyping,
  } = useCollaboration({
    url: config.url,
    token: config.token,
    userId: config.userId,
    userName: config.userName,
    roomType: config.roomType,
    documentId: config.documentId,
    autoConnect: false,
  })

  const [content, setContent] = useState('')
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 50))
  }

  const handleConnect = () => {
    addLog('Connecting to WebSocket server...')
    connect()
  }

  const handleDisconnect = () => {
    addLog('Disconnecting from WebSocket server...')
    disconnect()
  }

  const handleJoinRoom = () => {
    addLog(`Joining room: ${config.roomId}`)
    joinRoom(config.roomId, config.roomType, config.documentId)
  }

  const handleLeaveRoom = () => {
    addLog(`Leaving room: ${config.roomId}`)
    leaveRoom()
  }

  const handleSendOperation = () => {
    const operation = {
      type: 'insert' as const,
      position: document?.content?.length || 0,
      content: `\n[${new Date().toLocaleTimeString()}] ${config.userName}: ${content}`,
    }

    addLog(`Sending operation: ${JSON.stringify(operation)}`)
    sendOperation(operation)
    setContent('')
  }

  const handleClearLogs = () => {
    setLogs([])
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-8 dark:bg-zinc-900">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold">WebSocket Collaboration Demo</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Test real-time collaboration features with multiple users
          </p>
        </div>

        {/* Connection Controls */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-800">
          <h2 className="mb-4 text-xl font-semibold">Connection Configuration</h2>

          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">WebSocket URL</label>
              <input
                type="text"
                value={config.url}
                onChange={e => setConfig({ ...config, url: e.target.value })}
                className="w-full rounded border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                placeholder="ws://localhost:3000"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Authentication Token</label>
              <input
                type="text"
                value={config.token}
                onChange={e => setConfig({ ...config, token: e.target.value })}
                className="w-full rounded border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                placeholder="your-jwt-token"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">User ID</label>
              <input
                type="text"
                value={config.userId}
                onChange={e => setConfig({ ...config, userId: e.target.value })}
                className="w-full rounded border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                placeholder="user-123"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">User Name</label>
              <input
                type="text"
                value={config.userName}
                onChange={e => setConfig({ ...config, userName: e.target.value })}
                className="w-full rounded border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Room Type</label>
              <select
                value={config.roomType}
                onChange={e => setConfig({ ...config, roomType: e.target.value as RoomType })}
                className="w-full rounded border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
              >
                <option value="task">Task</option>
                <option value="project">Project</option>
                <option value="chat">Chat</option>
                <option value="document">Document</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Room ID</label>
              <input
                type="text"
                value={config.roomId}
                onChange={e => setConfig({ ...config, roomId: e.target.value })}
                className="w-full rounded border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
                placeholder="task:123"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {!isConnected ? (
              <button
                onClick={handleConnect}
                className="rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
              >
                Connect
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                className="rounded bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600"
              >
                Disconnect
              </button>
            )}

            <button
              onClick={reconnect}
              className="rounded bg-yellow-500 px-4 py-2 text-white transition-colors hover:bg-yellow-600"
              disabled={!isConnected}
            >
              Reconnect
            </button>
          </div>
        </div>

        {/* Room Controls */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-800">
          <h2 className="mb-4 text-xl font-semibold">Room Controls</h2>

          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ConnectionStatus
                connectionState={connectionState}
                isInRoom={isInRoom}
                users={users}
                typingUsers={typingUsers}
                onReconnect={reconnect}
              />

              <UserList users={users} currentUserId={config.userId} />
            </div>

            <div className="flex gap-2">
              {!isInRoom ? (
                <button
                  onClick={handleJoinRoom}
                  disabled={!isConnected}
                  className="rounded bg-green-500 px-4 py-2 text-white transition-colors hover:bg-green-600 disabled:opacity-50"
                >
                  Join Room
                </button>
              ) : (
                <button
                  onClick={handleLeaveRoom}
                  className="rounded bg-orange-500 px-4 py-2 text-white transition-colors hover:bg-orange-600"
                >
                  Leave Room
                </button>
              )}
            </div>
          </div>

          {/* Room Stats */}
          {isInRoom && (
            <div className="grid grid-cols-4 gap-4 rounded bg-zinc-50 p-4 dark:bg-zinc-700">
              <div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Total Users</div>
                <div className="text-2xl font-bold">{users.length}</div>
              </div>
              <div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Typing Users</div>
                <div className="text-2xl font-bold">{typingUsers.length}</div>
              </div>
              <div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Active Cursors</div>
                <div className="text-2xl font-bold">{cursors.size}</div>
              </div>
              <div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Document Revision</div>
                <div className="text-2xl font-bold">{document?.revision || 0}</div>
              </div>
            </div>
          )}
        </div>

        {/* Document Editor */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-800">
          <h2 className="mb-4 text-xl font-semibold">Document Editor</h2>

          <div className="mb-4">
            <textarea
              value={content}
              onChange={e => {
                setContent(e.target.value)
                setTyping(true)
              }}
              className="h-32 w-full rounded border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
              placeholder="Type a message to add to the document..."
              disabled={!isConnected || !isInRoom}
            />
          </div>

          <button
            onClick={handleSendOperation}
            disabled={!isConnected || !isInRoom || !content.trim()}
            className="rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
          >
            Add to Document
          </button>

          {/* Document Preview */}
          {document && (
            <div className="mt-6">
              <h3 className="mb-2 text-lg font-semibold">Document Content</h3>
              <div className="rounded border bg-zinc-50 p-4 dark:border-zinc-600 dark:bg-zinc-700">
                <pre className="text-sm whitespace-pre-wrap">{document.content || '(empty)'}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Activity Log */}
        <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Activity Log</h2>
            <button
              onClick={handleClearLogs}
              className="rounded bg-zinc-200 px-3 py-1 text-sm transition-colors hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600"
            >
              Clear Logs
            </button>
          </div>

          <div className="h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-zinc-500 dark:text-zinc-400">
                No activity yet. Connect and start collaborating!
              </p>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="font-mono text-sm">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Testing Instructions */}
        <div className="mt-6 rounded-lg bg-blue-50 p-6 dark:bg-blue-900/20">
          <h2 className="mb-4 text-xl font-semibold">Testing Instructions</h2>
          <ol className="list-inside list-decimal space-y-2 text-zinc-700 dark:text-zinc-300">
            <li>Open this page in multiple browser tabs or windows</li>
            <li>Configure different user IDs and names for each tab</li>
            <li>Connect to WebSocket server</li>
            <li>Join to same room (use same Room ID)</li>
            <li>Type messages and click &quot;Add to Document&quot;</li>
            <li>Watch real-time updates across all tabs</li>
            <li>Observe cursor positions, typing indicators, and user presence</li>
            <li>Test disconnection and reconnection scenarios</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
