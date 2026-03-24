/**
 * WebSocket 功能使用示例
 *
 * 展示如何使用 useWebSocket 和 useEnhancedWebSocket hooks
 */

'use client';

import { useState } from 'react';
import { useWebSocket, createMessage, isMessageType } from './useWebSocket';
import type { WebSocketMessage } from './types';
import { useEnhancedWebSocket } from './useEnhancedWebSocket';
import { notificationService, OfflineQueueEntry } from './notification-service';

// ============================================================================
// useWebSocket 示例
// ============================================================================

/**
 * 基础 WebSocket 使用示例
 */
export function BasicWebSocketExample() {
  const { status, isConnected, lastMessage, connect, disconnect, send, on, once } = useWebSocket(
    {
      url: 'ws://localhost:3000/ws',
      autoConnect: false,
      reconnectOnClose: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
    },
    {
      onOpen: (event) => {
        // WebSocket connected
      },
      onError: (event) => {
        console.error('WebSocket error:', event);
      },
      onClose: (event) => {
        // WebSocket closed
      },
    }
  );

  // 监听特定类型的消息
  const cleanupTaskUpdate = on('task:status_changed', (data) => {
    const msg = data as WebSocketMessage;
    if (isMessageType<{ taskId: string; status: string }>(msg, 'task:status_changed')) {
      // Task updated
    }
  });

  // 一次性监听
  const cleanupOnce = once('system:announcement', (data) => {
    // Received system announcement
  });

  const sendMessage = () => {
    const msg = createMessage('chat:message', {
      text: 'Hello from client!',
      userId: 'user-123',
    });
    send(msg);
  };

  return (
    <div className="p-4 border rounded">
      <h2 className="text-lg font-bold mb-2">基础 WebSocket</h2>
      <div className="mb-2">
        <span>状态: </span>
        <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
          {status}
        </span>
      </div>
      <div className="mb-2">
        <button onClick={connect} disabled={isConnected} className="px-2 py-1 bg-blue-500 text-white rounded mr-2">
          连接
        </button>
        <button onClick={disconnect} disabled={!isConnected} className="px-2 py-1 bg-red-500 text-white rounded mr-2">
          断开
        </button>
        <button onClick={sendMessage} disabled={!isConnected} className="px-2 py-1 bg-green-500 text-white rounded">
          发送消息
        </button>
      </div>
      {lastMessage && (
        <div className="mt-2 p-2 bg-zinc-100 rounded">
          <pre>{JSON.stringify(lastMessage, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

/**
 * 实时聊天示例
 */
export function RealtimeChatExample() {
  const [messages, setMessages] = useState<Array<{ id: string; user: string; text: string }>>([]);
  const [inputText, setInputText] = useState('');

  const { isConnected, send, on } = useWebSocket({
    url: 'ws://localhost:3000/chat',
    autoConnect: true,
  });

  // 监听聊天消息
  const cleanup = on('chat:message', (data) => {
    const msg = data as WebSocketMessage;
    if (isMessageType<{ user: string; text: string }>(msg, 'chat:message')) {
      setMessages(prev => [
        ...prev,
        {
          id: msg.id,
          user: msg.payload.user,
          text: msg.payload.text,
        },
      ]);
    }
  });

  const handleSend = () => {
    if (!inputText.trim()) return;

    const msg = createMessage('chat:message', {
      user: 'me',
      text: inputText,
    });

    send(msg);
    setInputText('');

    // 添加到本地消息列表
    setMessages(prev => [
      ...prev,
      { id: msg.id, user: 'me', text: inputText },
    ]);
  };

  return (
    <div className="p-4 border rounded">
      <h2 className="text-lg font-bold mb-2">实时聊天</h2>
      <div className="mb-2">
        连接状态: {isConnected ? '已连接' : '未连接'}
      </div>
      <div className="h-64 overflow-y-auto border rounded p-2 mb-2">
        {messages.map(msg => (
          <div key={msg.id} className="mb-1">
            <span className="font-bold">{msg.user}:</span> {msg.text}
          </div>
        ))}
      </div>
      <div className="flex">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 border rounded px-2 py-1 mr-2"
          placeholder="输入消息..."
        />
        <button
          onClick={handleSend}
          disabled={!isConnected}
          className="px-4 py-1 bg-blue-500 text-white rounded"
        >
          发送
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// useEnhancedWebSocket 示例
// ============================================================================

/**
 * 增强型 WebSocket 使用示例
 */
export function EnhancedWebSocketExample() {
  const {
    isConnected,
    connectionState,
    error,
    lastMessage,
    stats,
    connect,
    disconnect,
    reconnect,
    send,
    subscribe,
    unsubscribe,
    on,
    onStateChange,
    onError,
    getOfflineQueue,
  } = useEnhancedWebSocket({
    url: 'http://localhost:3000',
    token: 'your-auth-token',
    channels: ['team', 'notifications'],
    autoConnect: false,
    reconnect: true,
    maxReconnectAttempts: 10,
    reconnectInterval: 3000,
    heartbeatInterval: 30000,
    offlineQueueSize: 100,
    enableOfflineQueue: true,
  });

  // 监听连接状态变化
  const cleanupStateChange = onStateChange((state) => {
    // Connection state changed
  });

  // 监听错误
  const cleanupError = onError((err) => {
    console.error('WebSocket error:', err);
  });

  // 监听任务消息
  const cleanupTaskMessages = on('task:status_changed', (data: unknown) => {
    // Task status changed
  });

  const handleSubscribe = () => {
    subscribe(['project:123', 'task:456']);
  };

  const handleUnsubscribe = () => {
    unsubscribe(['project:123']);
  };

  const handleSend = () => {
    send('chat:message', {
      text: 'Hello from enhanced WebSocket!',
      timestamp: new Date().toISOString(),
    });
  };

  const handleShowOfflineQueue = () => {
    const queue = getOfflineQueue();
    alert(`离线队列中有 ${queue.length} 条消息`);
  };

  return (
    <div className="p-4 border rounded">
      <h2 className="text-lg font-bold mb-2">增强型 WebSocket</h2>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>连接状态: {connectionState}</div>
        <div>已连接: {isConnected ? '是' : '否'}</div>
        <div>已发送消息: {stats.messagesSent}</div>
        <div>已接收消息: {stats.messagesReceived}</div>
        <div>重连次数: {stats.reconnectCount}</div>
        <div>连接时长: {Math.round(stats.connectionDuration / 1000)}秒</div>
      </div>

      {error && (
        <div className="mb-2 p-2 bg-red-100 text-red-700 rounded">
          错误: {error.message}
        </div>
      )}

      <div className="mb-2">
        <button onClick={connect} disabled={isConnected} className="px-2 py-1 bg-blue-500 text-white rounded mr-2">
          连接
        </button>
        <button onClick={disconnect} disabled={!isConnected} className="px-2 py-1 bg-red-500 text-white rounded mr-2">
          断开
        </button>
        <button onClick={reconnect} className="px-2 py-1 bg-yellow-500 text-white rounded mr-2">
          重连
        </button>
        <button onClick={handleSubscribe} className="px-2 py-1 bg-green-500 text-white rounded mr-2">
          订阅频道
        </button>
        <button onClick={handleUnsubscribe} className="px-2 py-1 bg-purple-500 text-white rounded mr-2">
          取消订阅
        </button>
        <button onClick={handleSend} disabled={!isConnected} className="px-2 py-1 bg-cyan-500 text-white rounded mr-2">
          发送消息
        </button>
        <button onClick={handleShowOfflineQueue} className="px-2 py-1 bg-zinc-500 text-white rounded">
          查看离线队列
        </button>
      </div>

      {lastMessage && (
        <div className="mt-2 p-2 bg-zinc-100 rounded">
          <h3 className="font-bold mb-1">最新消息:</h3>
          <pre className="text-xs">{JSON.stringify(lastMessage, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// notification-service 示例
// ============================================================================

/**
 * 通知服务使用示例
 */
export function NotificationServiceExample() {
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueEntry[]>([]);

  const handleTaskStatusChange = async () => {
    try {
      await notificationService.notifyTaskStatusChange({
        taskId: 'task-123',
        taskTitle: '完成首页设计',
        oldStatus: 'in_progress',
        newStatus: 'completed',
        changedBy: {
          id: 'user-1',
          name: '张三',
          avatar: '/avatars/zhangsan.jpg',
        },
        projectId: 'project-456',
        projectName: '7zi 平台',
        assigneeId: 'user-2',
      });
      // Task status change notification sent
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  const handleTaskAssignment = async () => {
    try {
      await notificationService.notifyTaskAssignment({
        taskId: 'task-789',
        taskTitle: 'API 接口开发',
        assignedTo: { id: 'user-2', name: '李四' },
        assignedBy: {
          id: 'user-1',
          name: '张三',
          avatar: '/avatars/zhangsan.jpg',
        },
        projectId: 'project-456',
        projectName: '7zi 平台',
        priority: 'high',
        dueDate: '2024-12-31',
      });
      // Task assignment notification sent
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  const handleSystemAnnouncement = async () => {
    try {
      await notificationService.broadcastSystemAnnouncement({
        title: '系统维护通知',
        content: '系统将于今晚 22:00-23:00 进行维护，请提前保存工作。',
        level: 'warning',
        actionUrl: '/maintenance',
        actionText: '查看详情',
        sender: {
          id: 'system',
          name: '系统管理员',
          role: 'admin',
        },
      });
      // System announcement sent
    } catch (error) {
      console.error('Failed to send announcement:', error);
    }
  };

  const handleCheckOfflineQueue = () => {
    const userId = 'user-2';
    const queue = notificationService.getOfflineQueue(userId);
    setOfflineQueue(queue);
  };

  const handleErrorLogs = () => {
    const errors = notificationService.getErrorLog(20);
    alert(`共有 ${errors.length} 条错误记录`);
  };

  // 监听错误
  const cleanupError = notificationService.onError((error) => {
    console.error('Notification service error:', error);
  });

  return (
    <div className="p-4 border rounded">
      <h2 className="text-lg font-bold mb-2">通知服务</h2>
      <div className="grid grid-cols-1 gap-2 mb-2">
        <button onClick={handleTaskStatusChange} className="px-4 py-2 bg-blue-500 text-white rounded">
          发送任务状态变更通知
        </button>
        <button onClick={handleTaskAssignment} className="px-4 py-2 bg-green-500 text-white rounded">
          发送任务分配通知
        </button>
        <button onClick={handleSystemAnnouncement} className="px-4 py-2 bg-yellow-500 text-white rounded">
          发送系统公告
        </button>
        <button onClick={handleCheckOfflineQueue} className="px-4 py-2 bg-purple-500 text-white rounded">
          检查离线队列
        </button>
        <button onClick={handleErrorLogs} className="px-4 py-2 bg-red-500 text-white rounded">
          查看错误日志
        </button>
      </div>

      {offlineQueue.length > 0 && (
        <div className="mt-2 p-2 bg-zinc-100 rounded">
          <h3 className="font-bold mb-1">离线队列 ({offlineQueue.length}):</h3>
          <ul className="text-sm">
            {offlineQueue.map((entry, index) => (
              <li key={index}>
                {entry.notification.title} - 尝试 {entry.attempts} 次
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 综合示例
// ============================================================================

/**
 * 综合使用所有功能
 */
export function WebSocketDashboard() {
  const [activeTab, setActiveTab] = useState<'basic' | 'enhanced' | 'chat' | 'notifications'>('basic');

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">WebSocket 功能演示</h1>

      <div className="mb-4">
        <button
          onClick={() => setActiveTab('basic')}
          className={`px-4 py-2 rounded mr-2 ${activeTab === 'basic' ? 'bg-blue-500 text-white' : 'bg-zinc-200'}`}
        >
          基础 WebSocket
        </button>
        <button
          onClick={() => setActiveTab('enhanced')}
          className={`px-4 py-2 rounded mr-2 ${activeTab === 'enhanced' ? 'bg-blue-500 text-white' : 'bg-zinc-200'}`}
        >
          增强 WebSocket
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 rounded mr-2 ${activeTab === 'chat' ? 'bg-blue-500 text-white' : 'bg-zinc-200'}`}
        >
          实时聊天
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 rounded ${activeTab === 'notifications' ? 'bg-blue-500 text-white' : 'bg-zinc-200'}`}
        >
          通知服务
        </button>
      </div>

      <div className="bg-white rounded shadow p-4">
        {activeTab === 'basic' && <BasicWebSocketExample />}
        {activeTab === 'enhanced' && <EnhancedWebSocketExample />}
        {activeTab === 'chat' && <RealtimeChatExample />}
        {activeTab === 'notifications' && <NotificationServiceExample />}
      </div>
    </div>
  );
}

export default WebSocketDashboard;
