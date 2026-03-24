/**
 * WebSocket Collaboration Demo
 *
 * Interactive demo page for testing WebSocket collaboration features
 */

'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useCollaboration } from '@/lib/websocket';
import { ConnectionStatus, UserList } from '@/components/collaboration/ConnectionStatus';

type RoomType = 'task' | 'project' | 'chat' | 'document';

// Demo-specific: Using Math.random for unique user IDs - acceptable for demo purposes
// eslint-disable-next-line react-hooks/rules-of-hooks
export default function CollaborationDemoPage() {
  // Generate stable initial config values
  const initialConfig = useMemo(() => ({
    url: 'ws://localhost:3002',
    token: '',
    userId: `user-${Math.floor(Math.random() * 1000)}`,
    userName: `User ${Math.floor(Math.random() * 1000)}`,
    roomType: 'task' as RoomType,
    roomId: 'demo-task-1',
    documentId: 'demo-doc-1',
  }), []);

  const [config, setConfig] = useState(initialConfig);

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
    moveCursor,
    setTyping,
  } = useCollaboration({
    url: config.url,
    token: config.token,
    userId: config.userId,
    userName: config.userName,
    roomType: config.roomType,
    documentId: config.documentId,
    autoConnect: false,
  });

  const [content, setContent] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 50));
  };

  const handleConnect = () => {
    addLog('Connecting to WebSocket server...');
    connect();
  };

  const handleDisconnect = () => {
    addLog('Disconnecting from WebSocket server...');
    disconnect();
  };

  const handleJoinRoom = () => {
    addLog(`Joining room: ${config.roomId}`);
    joinRoom(config.roomId, config.roomType, config.documentId);
  };

  const handleLeaveRoom = () => {
    addLog(`Leaving room: ${config.roomId}`);
    leaveRoom();
  };

  const handleSendOperation = () => {
    const operation = {
      type: 'insert' as const,
      position: document?.content?.length || 0,
      content: `\n[${new Date().toLocaleTimeString()}] ${config.userName}: ${content}`,
    };

    addLog(`Sending operation: ${JSON.stringify(operation)}`);
    sendOperation(operation);
    setContent('');
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">WebSocket Collaboration Demo</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Test real-time collaboration features with multiple users
          </p>
        </div>

        {/* Connection Controls */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Configuration</h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">WebSocket URL</label>
              <input
                type="text"
                value={config.url}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                className="w-full px-3 py-2 border rounded dark:bg-zinc-700 dark:border-zinc-600"
                placeholder="ws://localhost:3000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Authentication Token</label>
              <input
                type="text"
                value={config.token}
                onChange={(e) => setConfig({ ...config, token: e.target.value })}
                className="w-full px-3 py-2 border rounded dark:bg-zinc-700 dark:border-zinc-600"
                placeholder="your-jwt-token"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">User ID</label>
              <input
                type="text"
                value={config.userId}
                onChange={(e) => setConfig({ ...config, userId: e.target.value })}
                className="w-full px-3 py-2 border rounded dark:bg-zinc-700 dark:border-zinc-600"
                placeholder="user-123"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">User Name</label>
              <input
                type="text"
                value={config.userName}
                onChange={(e) => setConfig({ ...config, userName: e.target.value })}
                className="w-full px-3 py-2 border rounded dark:bg-zinc-700 dark:border-zinc-600"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Room Type</label>
              <select
                value={config.roomType}
                onChange={(e) => setConfig({ ...config, roomType: e.target.value as RoomType })}
                className="w-full px-3 py-2 border rounded dark:bg-zinc-700 dark:border-zinc-600"
              >
                <option value="task">Task</option>
                <option value="project">Project</option>
                <option value="chat">Chat</option>
                <option value="document">Document</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Room ID</label>
              <input
                type="text"
                value={config.roomId}
                onChange={(e) => setConfig({ ...config, roomId: e.target.value })}
                className="w-full px-3 py-2 border rounded dark:bg-zinc-700 dark:border-zinc-600"
                placeholder="task:123"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {!isConnected ? (
              <button
                onClick={handleConnect}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Connect
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Disconnect
              </button>
            )}

            <button
              onClick={reconnect}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
              disabled={!isConnected}
            >
              Reconnect
            </button>
          </div>
        </div>

        {/* Room Controls */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Room Controls</h2>

          <div className="flex items-center justify-between mb-4">
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
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  Join Room
                </button>
              ) : (
                <button
                  onClick={handleLeaveRoom}
                  className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                >
                  Leave Room
                </button>
              )}
            </div>
          </div>

          {/* Room Stats */}
          {isInRoom && (
            <div className="grid grid-cols-4 gap-4 p-4 bg-zinc-50 dark:bg-zinc-700 rounded">
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
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Document Editor</h2>

          <div className="mb-4">
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setTyping(true);
              }}
              className="w-full h-32 px-3 py-2 border rounded dark:bg-zinc-700 dark:border-zinc-600"
              placeholder="Type a message to add to the document..."
              disabled={!isConnected || !isInRoom}
            />
          </div>

          <button
            onClick={handleSendOperation}
            disabled={!isConnected || !isInRoom || !content.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            Add to Document
          </button>

          {/* Document Preview */}
          {document && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Document Content</h3>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-700 rounded border dark:border-zinc-600">
                <pre className="whitespace-pre-wrap text-sm">{document.content || '(empty)'}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Activity Log */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Activity Log</h2>
            <button
              onClick={handleClearLogs}
              className="px-3 py-1 text-sm bg-zinc-200 dark:bg-zinc-700 rounded hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
            >
              Clear Logs
            </button>
          </div>

          <div className="h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-zinc-500 dark:text-zinc-400">No activity yet. Connect and start collaborating!</p>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Testing Instructions */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Testing Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-zinc-700 dark:text-zinc-300">
            <li>Open this page in multiple browser tabs or windows</li>
            <li>Configure different user IDs and names for each tab</li>
            <li>Connect to the WebSocket server</li>
            <li>Join the same room (use the same Room ID)</li>
            <li>Type messages and click &quot;Add to Document&quot;</li>
            <li>Watch real-time updates across all tabs</li>
            <li>Observe cursor positions, typing indicators, and user presence</li>
            <li>Test disconnection and reconnection scenarios</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
