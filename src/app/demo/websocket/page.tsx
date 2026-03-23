'use client';

import { useState } from 'react';
import { useCollaboration } from '@/lib/websocket/useCollaboration';
import { Wifi, WifiOff, Users, Send, LogOut, LogIn, Type, RefreshCw } from 'lucide-react';

// Demo configuration
const DEMO_CONFIG = {
  url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
  token: 'demo-token',
  userId: `demo-user-${Date.now()}`,
  userName: `Demo User ${Math.floor(Math.random() * 1000)}`,
  userAvatar: undefined,
};

const ROOM_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899',
];

function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ROOM_COLORS[Math.abs(hash) % ROOM_COLORS.length];
}

function ConnectionBadge({ state }: { state: string }) {
  const states = {
    disconnected: { color: 'bg-red-500', text: '断开连接', icon: WifiOff },
    connecting: { color: 'bg-yellow-500', text: '连接中...', icon: RefreshCw },
    connected: { color: 'bg-green-500', text: '已连接', icon: Wifi },
    reconnecting: { color: 'bg-orange-500', text: '重连中...', icon: RefreshCw },
    error: { color: 'bg-red-600', text: '连接错误', icon: WifiOff },
  };

  const config = states[state as keyof typeof states] || states.disconnected;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
      <div className={`w-2 h-2 rounded-full ${config.color} ${state === 'connecting' || state === 'reconnecting' ? 'animate-pulse' : ''}`} />
      <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{config.text}</span>
    </div>
  );
}

export default function WebSocketDemoPage() {
  const [roomId, setRoomId] = useState('demo-room-1');
  const [message, setMessage] = useState('');

  const collaboration = useCollaboration({
    ...DEMO_CONFIG,
    roomId,
    roomType: 'document',
    documentId: 'demo-document-1',
    autoConnect: false, // Let user manually connect
    autoReconnect: true,
  });

  const {
    connectionState,
    isConnected,
    isInRoom,
    users,
    document,
    typingUsers,
    connect,
    disconnect,
    reconnect,
    joinRoom,
    leaveRoom,
    sendOperation,
    setTyping,
    openDocument,
  } = collaboration;

  const handleJoinRoom = () => {
    if (!isConnected) {
      connect();
      // Wait for connection then join room
      setTimeout(() => {
        joinRoom(roomId, 'document', 'demo-document-1', 'Demo Room');
      }, 500);
    } else {
      joinRoom(roomId, 'document', 'demo-document-1', 'Demo Room');
    }
  };

  const handleLeaveRoom = () => {
    leaveRoom();
  };

  const handleConnect = () => {
    connect();
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleReconnect = () => {
    reconnect();
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const previousValue = document?.content || '';

    // Send operation for the change
    if (previousValue) {
      if (newValue.length > previousValue.length) {
        // Insert operation
        sendOperation({
          type: 'insert',
          position: previousValue.length,
          content: newValue.slice(previousValue.length),
        });
      } else if (newValue.length < previousValue.length) {
        // Delete operation
        sendOperation({
          type: 'delete',
          position: newValue.length,
          length: previousValue.length - newValue.length,
        });
      }
    } else {
      // Initial content
      sendOperation({
        type: 'insert',
        position: 0,
        content: newValue,
      });
    }

    // Set typing status
    setTyping(true);
    setMessage(newValue);

    // Clear typing status after 2 seconds of no typing
    setTimeout(() => {
      setTyping(false);
    }, 2000);
  };

  const handleSyncDocument = () => {
    if (isInRoom) {
      openDocument('demo-document-1');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                WebSocket 协作演示
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                实时协作、文档编辑、在线状态和打字指示器
              </p>
            </div>
            <ConnectionBadge state={connectionState} />
          </div>
        </div>

        {/* Connection Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Connection Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Wifi className="w-5 h-5 text-blue-500" />
              连接控制
            </h2>

            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={handleConnect}
                  disabled={isConnected}
                  className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  连接
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={!isConnected}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  断开
                </button>
                <button
                  onClick={handleReconnect}
                  disabled={!isConnected}
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  重连
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  房间 ID
                </label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  disabled={isInRoom}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
              </div>

              <button
                onClick={handleJoinRoom}
                disabled={!isConnected || isInRoom}
                className="w-full px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                {isInRoom ? '已在房间中' : '加入房间'}
              </button>

              <button
                onClick={handleLeaveRoom}
                disabled={!isInRoom}
                className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                离开房间
              </button>
            </div>
          </div>

          {/* Room Info Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              在线用户 ({users.length})
            </h2>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {users.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>暂无在线用户</p>
                  <p className="text-sm">加入房间后可以看到其他用户</p>
                </div>
              ) : (
                users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: user.color }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {user.name}
                        {user.id === DEMO_CONFIG.userId && (
                          <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
                            你
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {user.isTyping && (
                          <span className="flex items-center gap-1 text-blue-500">
                            <Type className="w-3 h-3" />
                            正在输入...
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                ))
              )}
            </div>

            {/* Typing Users */}
            {typingUsers.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  <span className="font-medium">
                    {typingUsers.length === 1
                      ? '有人在输入...'
                      : `${typingUsers.length} 人正在输入...`}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Document Editor */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-green-500" />
              协作文档
            </h2>
            <button
              onClick={handleSyncDocument}
              disabled={!isInRoom}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              同步文档
            </button>
          </div>

          {!isInRoom ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <Send className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                请先加入房间
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                加入房间后即可开始实时协作编辑文档
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Document Info */}
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                {document && (
                  <>
                    <span>版本: {document.revision}</span>
                    <span>字符数: {document.content.length}</span>
                  </>
                )}
              </div>

              {/* Text Area */}
              <textarea
                value={document?.content || ''}
                onChange={handleTextChange}
                placeholder="开始输入...其他用户可以看到您的编辑"
                className="w-full min-h-[300px] px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y font-mono text-sm"
                disabled={!isInRoom}
              />

              {/* Instructions */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                  💡 演示说明
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  <li>• 在此输入的文本会实时同步到房间内的其他用户</li>
                  <li>• 其他用户的编辑也会实时显示在这里</li>
                  <li>• 打字状态会显示在右侧用户列表中</li>
                  <li>• 可以通过多个浏览器标签页测试协作功能</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Status Footer */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span>用户 ID: {DEMO_CONFIG.userId}</span>
              <span>房间: {isInRoom ? roomId : '未加入'}</span>
            </div>
            <div className="flex items-center gap-4">
              <span>在线用户: {users.length}</span>
              <span>文档版本: {document?.revision ?? '-'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
