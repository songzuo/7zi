/**
 * WebSocket Rooms Demo Page
 *
 * Demonstrates the WebSocket room system UI components
 * Shows RoomList and RoomView integration
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { RoomList } from '@/lib/websocket/dashboard/RoomList';
import { RoomView } from '@/lib/websocket/dashboard/RoomView';
import { useWebSocketStore } from '@/lib/websocket/dashboard/websocket-store';
import type { RoomType, RoomVisibility, Room, RoomParticipant } from '@/lib/websocket/rooms';
import type { StoredMessage } from '@/lib/websocket/message-store';

// ============================================================================
// Demo Data
// ============================================================================

const DEMO_ROOMS: Room[] = [
  {
    id: 'room-1',
    name: '产品讨论组',
    type: 'chat',
    documentId: 'doc-1',
    visibility: 'public',
    ownerId: 'user-1',
    participants: new Map([
      ['user-1', {
        id: 'user-1',
        name: '张三',
        color: '#3B82F6',
        role: 'owner',
        joinedAt: new Date(),
        isTyping: false,
        lastActivity: new Date(),
        isOnline: true,
      }],
      ['user-2', {
        id: 'user-2',
        name: '李四',
        color: '#10B981',
        role: 'member',
        joinedAt: new Date(),
        isTyping: false,
        lastActivity: new Date(),
        isOnline: true,
      }],
    ]),
    data: { content: '', revision: 0 },
    config: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActivity: new Date(),
    invites: new Set(),
  },
  {
    id: 'room-2',
    name: 'Sprint 任务协作',
    type: 'task',
    documentId: 'doc-2',
    visibility: 'private',
    ownerId: 'user-1',
    participants: new Map([
      ['user-1', {
        id: 'user-1',
        name: '张三',
        color: '#3B82F6',
        role: 'owner',
        joinedAt: new Date(),
        isTyping: false,
        lastActivity: new Date(),
        isOnline: true,
      }],
    ]),
    data: { content: '', revision: 0 },
    config: {},
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(),
    lastActivity: new Date(),
    invites: new Set(),
  },
  {
    id: 'room-3',
    name: '设计评审会议',
    type: 'video',
    documentId: 'doc-3',
    visibility: 'invite-only',
    ownerId: 'user-3',
    participants: new Map([
      ['user-3', {
        id: 'user-3',
        name: '王五',
        color: '#8B5CF6',
        role: 'owner',
        joinedAt: new Date(),
        isTyping: false,
        lastActivity: new Date(),
        isOnline: false,
      }],
    ]),
    data: { content: '', revision: 0 },
    config: {},
    createdAt: new Date(Date.now() - 172800000),
    updatedAt: new Date(),
    lastActivity: new Date(Date.now() - 3600000),
    invites: new Set(['user-1']),
  },
];

const DEMO_MESSAGES: StoredMessage[] = [
  {
    id: 'msg-1',
    roomId: 'room-1',
    userId: 'user-1',
    userName: '张三',
    type: 'text',
    content: '大家好！我们今天讨论一下新版本的功能规划。',
    timestamp: new Date(Date.now() - 3600000),
    reactions: [],
    pinned: false,
    edited: false,
  },
  {
    id: 'msg-2',
    roomId: 'room-1',
    userId: 'user-2',
    userName: '李四',
    type: 'text',
    content: '好的，我觉得应该优先考虑用户反馈最多的几个问题。',
    timestamp: new Date(Date.now() - 3000000),
    reactions: [
      { userId: 'user-1', userName: '张三', emoji: '👍', timestamp: new Date() },
    ],
    pinned: false,
    edited: false,
  },
  {
    id: 'msg-3',
    roomId: 'room-1',
    userId: 'user-1',
    userName: '张三',
    type: 'text',
    content: '同意！我已经整理了用户反馈列表，稍后发给大家。',
    timestamp: new Date(Date.now() - 1800000),
    reactions: [],
    pinned: true,
    edited: true,
  },
];

// ============================================================================
// Main Component
// ============================================================================

export default function WebSocketRoomsDemoPage() {
  const [isLoading, setIsLoading] = useState(true);

  const {
    setRooms,
    setMessages,
    setParticipants,
    setCurrentUser,
    addMessage,
  } = useWebSocketStore();

  // Initialize demo data
  useEffect(() => {
    const initDemo = async () => {
      // Simulate loading
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Set current user
      setCurrentUser('user-1', '张三');

      // Set rooms
      setRooms(DEMO_ROOMS);

      // Set messages for room-1
      setMessages('room-1', DEMO_MESSAGES);

      // Set participants
      DEMO_ROOMS.forEach(room => {
        const participants = Array.from(room.participants.values());
        setParticipants(room.id, participants);
      });

      setIsLoading(false);
    };

    initDemo();
  }, [setRooms, setMessages, setParticipants, setCurrentUser]);

  // Handlers
  const handleCreateRoom = useCallback((options: {
    name: string;
    type: RoomType;
    visibility: RoomVisibility;
  }) => {
    console.log('Create room:', options);
    // In real app, this would call the WebSocket API
    const newRoom: Room = {
      id: `room-${Date.now()}`,
      name: options.name,
      type: options.type,
      documentId: `doc-${Date.now()}`,
      visibility: options.visibility,
      ownerId: 'user-1',
      participants: new Map(),
      data: { content: '', revision: 0 },
      config: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActivity: new Date(),
      invites: new Set(),
    };
    
    const { addRoom } = useWebSocketStore.getState();
    addRoom(newRoom);
  }, []);

  const handleSelectRoom = useCallback((roomId: string) => {
    console.log('Selected room:', roomId);
  }, []);

  const handleLeaveRoom = useCallback((roomId: string) => {
    console.log('Leave room:', roomId);
    const { removeRoom } = useWebSocketStore.getState();
    removeRoom(roomId);
  }, []);

  const handleSendMessage = useCallback((content: string, replyTo?: string) => {
    const { currentRoomId, currentUserId, currentUserName } = useWebSocketStore.getState();
    
    if (!currentRoomId || !currentUserId || !currentUserName) return;

    const message: StoredMessage = {
      id: `msg-${Date.now()}`,
      roomId: currentRoomId,
      userId: currentUserId,
      userName: currentUserName,
      type: 'text',
      content,
      timestamp: new Date(),
      reactions: [],
      pinned: false,
      edited: false,
      replyTo,
    };

    addMessage(currentRoomId, message);
  }, [addMessage]);

  const handleReactMessage = useCallback((messageId: string, emoji: string) => {
    console.debug('React to message:', messageId, emoji);
    // In real app, this would call the WebSocket API
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">加载演示数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            WebSocket 房间系统演示
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            展示房间列表、聊天界面、响应式设计和暗色模式支持
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Features List */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏠</span>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">房间列表</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">搜索、过滤、创建</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💬</span>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">实时聊天</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">消息、回复、反应</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📱</span>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">响应式设计</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">适配各种屏幕</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌙</span>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">暗色模式</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">护眼夜间主题</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Layout */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="h-[600px] flex">
            {/* Room List */}
            <div className="w-80 border-r border-gray-200 dark:border-gray-700">
              <RoomList
                onCreateRoom={handleCreateRoom}
                onSelectRoom={handleSelectRoom}
                onLeaveRoom={handleLeaveRoom}
              />
            </div>

            {/* Room View */}
            <div className="flex-1">
              <RoomView
                onSendMessage={handleSendMessage}
                onReactMessage={handleReactMessage}
              />
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            使用说明
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• 点击左侧房间列表选择房间</li>
            <li>• 点击右上角&ldquo;创建房间&rdquo;按钮创建新房间</li>
            <li>• 在聊天区域输入消息并发送</li>
            <li>• 点击消息的表情按钮添加反应</li>
            <li>• 点击右上角成员图标查看成员列表</li>
            <li>• 切换系统暗色模式查看主题效果</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
