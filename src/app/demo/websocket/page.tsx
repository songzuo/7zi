'use client';

/**
 * WebSocket Demo Page
 *
 * Demonstrates real-time WebSocket functionality including:
 * - Connection management
 * - Heartbeat monitoring
 * - Task status updates
 * - Room participation
 */

import { useState, useEffect, useCallback } from 'react';
import { useWebSocket, useTaskStatusUpdates, type TaskStatusUpdate } from '@/hooks/useWebSocket';

export default function WebSocketDemoPage() {
  const ws = useWebSocket({
    autoConnect: false, // Let user control connection
    reconnection: true,
  });

  const taskWs = useTaskStatusUpdates({
    autoConnect: false,
  });

  const [messages, setMessages] = useState<string[]>([]);
  const [roomId, setRoomId] = useState('demo-room');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Log connection status changes
  useEffect(() => {
    if (ws.state.connected) {
      addMessage(`✅ Connected to WebSocket server`);
    }
    if (ws.state.error) {
      addMessage(`❌ Error: ${ws.state.error}`);
    }
  }, [ws.state.connected, ws.state.error]);

  // Log task status updates
  useEffect(() => {
    taskWs.taskUpdates.forEach((update, taskId) => {
      addMessage(`📊 Task ${taskId}: ${update.status} (${update.state})`);
    });
  }, [taskWs.taskUpdates.size]);

  const addMessage = useCallback((msg: string) => {
    setMessages(prev => [...prev.slice(-19), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const handleConnect = () => {
    addMessage('🔌 Connecting...');
    ws.connect();
    taskWs.connect();
  };

  const handleDisconnect = () => {
    addMessage('🔌 Disconnecting...');
    ws.disconnect();
    taskWs.disconnect();
  };

  const handleJoinRoom = () => {
    ws.joinRoom(roomId, 'project', 'demo-document', 'Demo Room');
    addMessage(`🏠 Joining room: ${roomId}`);
  };

  const handleLeaveRoom = () => {
    ws.leaveRoom(roomId);
    addMessage(`🚪 Leaving room: ${roomId}`);
  };

  const handleSendTestMessage = () => {
    ws.send('test:message', { text: 'Hello from WebSocket!', timestamp: new Date().toISOString() });
    addMessage(`📤 Sent test message`);
  };

  const handleSimulateTaskUpdate = () => {
    // Simulate a task status update (in real app, this would come from backend)
    const taskId = `task-${Date.now()}`;
    const mockUpdate: TaskStatusUpdate = {
      taskId,
      status: 'Processing',
      state: 'running',
      timestamp: new Date().toISOString(),
      userId: ws.state.userId,
      projectId: 'demo-project',
      metadata: { progress: 50 },
    };

    // In real app, backend would broadcast this via broadcastTaskStatusUpdate()
    // Here we just show what the UI would receive
    addMessage(`📤 Simulating task update: ${taskId}`);
  };

  const handleClearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            WebSocket Real-Time Demo
          </h1>
          <p className="text-slate-300">
            Enhanced WebSocket with heartbeat, reconnection, and task status updates
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Connection Status */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span>🔗</span> Connection Status
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  ws.state.connected ? 'bg-green-500/20 text-green-400' :
                  ws.state.connecting ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {ws.state.connected ? 'Connected' :
                   ws.state.connecting ? 'Connecting...' :
                   'Disconnected'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Authenticated:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  ws.state.authenticated ? 'bg-green-500/20 text-green-400' :
                  'bg-slate-500/20 text-slate-400'
                }`}>
                  {ws.state.authenticated ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Room:</span>
                <span className="text-white font-mono">{ws.state.roomId || 'None'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">User ID:</span>
                <span className="text-white font-mono text-sm">
                  {ws.state.userId || 'Not authenticated'}
                </span>
              </div>
              {ws.state.error && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{ws.state.error}</p>
                </div>
              )}
            </div>

            {/* Connection Controls */}
            <div className="mt-6 flex flex-wrap gap-2">
              {!ws.state.connected ? (
                <button
                  onClick={handleConnect}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  Connect
                </button>
              ) : (
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Disconnect
                </button>
              )}
              <button
                onClick={ws.reconnect}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Reconnect
              </button>
            </div>
          </div>

          {/* Room Controls */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span>🏠</span> Room Management
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm mb-2">Room ID</label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter room ID"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleJoinRoom}
                  disabled={!ws.state.connected}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  Join Room
                </button>
                <button
                  onClick={handleLeaveRoom}
                  disabled={!ws.state.roomId}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  Leave Room
                </button>
              </div>
            </div>

            {/* Test Actions */}
            <div className="mt-6">
              <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
                <span>🧪</span> Test Actions
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleSendTestMessage}
                  disabled={!ws.state.connected}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  Send Test Message
                </button>
                <button
                  onClick={handleSimulateTaskUpdate}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium transition-colors"
                >
                  Simulate Task Update
                </button>
                <button
                  onClick={handleClearMessages}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                >
                  Clear Messages
                </button>
              </div>
            </div>
          </div>

          {/* Message Log */}
          <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span>📜</span> Message Log
            </h2>
            <div className="bg-slate-900/50 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm space-y-1">
              {messages.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No messages yet. Connect and try the actions above!</p>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className="text-slate-300 hover:text-white transition-colors">
                    {msg}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Task Status Updates */}
          <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span>📊</span> Task Status Updates
              <span className="ml-2 text-sm font-normal text-slate-400">
                ({taskWs.taskUpdates.size} updates received)
              </span>
            </h2>
            {taskWs.taskUpdates.size === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No task updates yet. Click "Simulate Task Update" to see how it works!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from(taskWs.taskUpdates.entries()).map(([taskId, update]) => (
                  <div
                    key={taskId}
                    className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 hover:border-purple-500/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedTaskId(taskId)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-white font-mono text-sm truncate">{taskId}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        update.state === 'completed' ? 'bg-green-500/20 text-green-400' :
                        update.state === 'running' ? 'bg-blue-500/20 text-blue-400' :
                        update.state === 'failed' ? 'bg-red-500/20 text-red-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {update.state}
                      </span>
                    </div>
                    <div className="text-slate-400 text-sm">{update.status}</div>
                    <div className="text-slate-500 text-xs mt-2">
                      {new Date(update.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mt-8 bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span>📖</span> Usage Instructions
          </h2>
          <div className="grid md:grid-cols-3 gap-6 text-slate-300 text-sm">
            <div>
              <h3 className="text-white font-medium mb-2">1. Connect</h3>
              <p>Click "Connect" to establish a WebSocket connection. The system will automatically authenticate using your session token.</p>
            </div>
            <div>
              <h3 className="text-white font-medium mb-2">2. Join a Room</h3>
              <p>Enter a room ID and click "Join Room" to participate in real-time collaboration with other users.</p>
            </div>
            <div>
              <h3 className="text-white font-medium mb-2">3. Monitor Events</h3>
              <p>Watch the message log and task status updates for real-time event broadcasts from the server.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
