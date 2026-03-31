/**
 * 增强的 WebSocket Hook
 *
 * 提供更完善的 WebSocket 连接管理，包括：
 * - 自动重连和心跳
 * - 离线消息队列（支持优先级、去重、智能清理）
 * - 连接状态监控
 * - 错误处理和恢复
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { WebSocketMessage } from './types';
import { generateMessageId } from './useWebSocket';
import { logger } from '../logger';

// ============================================================================
// 类型定义
// ============================================================================

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

export interface WebSocketConfig {
  url: string;
  token?: string;
  channels?: string[];
  autoConnect?: boolean;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  offlineQueueSize?: number;
  enableOfflineQueue?: boolean;
  offlineQueuePriorityThreshold?: number; // 0-1，超过此比例时只保留高优先级消息
}

export interface WebSocketStats {
  messagesSent: number;
  messagesReceived: number;
  reconnectCount: number;
  lastConnected: Date | null;
  lastDisconnected: Date | null;
  connectionDuration: number;
  offlineQueueSize: number;
  offlineQueueDedupCount: number;
  offlineQueueDroppedCount: number;
}

// 消息优先级
export enum MessagePriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  URGENT = 4,
}

// 扩展的消息接口，包含优先级
export interface PrioritizedWebSocketMessage extends WebSocketMessage {
  priority: MessagePriority;
  retryCount?: number;
  maxRetries?: number;
}

export interface UseEnhancedWebSocketReturn {
  // 连接状态
  isConnected: boolean;
  connectionState: ConnectionState;
  error: Error | null;

  // 消息
  lastMessage: WebSocketMessage | null;
  messages: WebSocketMessage[];

  // 统计
  stats: WebSocketStats;

  // 操作
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  send: (type: string, payload?: unknown, priority?: MessagePriority) => void;
  subscribe: (channels: string[]) => void;
  unsubscribe: (channels: string[]) => void;

  // 事件监听
  on: <T extends WebSocketMessage>(type: string, handler: (message: T) => void) => () => void;
  onStateChange: (callback: (state: ConnectionState) => void) => () => void;
  onError: (callback: (error: Error) => void) => () => void;

  // 工具
  clearMessages: () => void;
  getOfflineQueue: () => PrioritizedWebSocketMessage[];
}

// ============================================================================
// 辅助函数
// ============================================================================

// 根据消息类型获取默认优先级
const getMessagePriority = (type: string): MessagePriority => {
  const highPriorityTypes = [
    'task:assigned',
    'task:status_changed',
    'system:announcement',
    'connection:confirmed',
  ];

  const normalPriorityTypes = [
    'task:comment',
    'member:online',
    'member:offline',
    'member:status_changed',
    'project:updated',
  ];

  const lowPriorityTypes = [
    'heartbeat',
    'read_status_updated',
  ];

  if (highPriorityTypes.includes(type)) {
    return MessagePriority.HIGH;
  } else if (normalPriorityTypes.includes(type)) {
    return MessagePriority.NORMAL;
  } else if (lowPriorityTypes.includes(type)) {
    return MessagePriority.LOW;
  }

  return MessagePriority.NORMAL;
};

// ============================================================================
// Hook 实现
// ============================================================================

export function useEnhancedWebSocket(config: WebSocketConfig): UseEnhancedWebSocketReturn {
  const {
    url,
    token,
    channels = [],
    autoConnect = true,
    reconnect = true,
    maxReconnectAttempts = 10,
    reconnectInterval = 3000,
    heartbeatInterval = 30000,
    offlineQueueSize = 100,
    enableOfflineQueue = true,
    offlineQueuePriorityThreshold = 0.8,
  } = config;

  // 状态
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<Error | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [stats, setStats] = useState<WebSocketStats>({
    messagesSent: 0,
    messagesReceived: 0,
    reconnectCount: 0,
    lastConnected: null,
    lastDisconnected: null,
    connectionDuration: 0,
    offlineQueueSize: 0,
    offlineQueueDedupCount: 0,
    offlineQueueDroppedCount: 0,
  });

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const connectionStartTimeRef = useRef<Date | null>(null);
  const offlineQueueRef = useRef<PrioritizedWebSocketMessage[]>([]);
  const offlineMessageIdsRef = useRef<Set<string>>(new Set()); // 用于去重
  const scheduleReconnectRef = useRef<() => void>(() => {});
  const messageHandlersRef = useRef<Map<string, Set<(message: WebSocketMessage) => void>>>(new Map());
  const stateChangeCallbacksRef = useRef<Set<(state: ConnectionState) => void>>(new Set());
  const errorCallbacksRef = useRef<Set<(error: Error) => void>>(new Set());
  const subscribedChannelsRef = useRef<Set<string>>(new Set(channels));
  const isConnectingRef = useRef(false); // Connection lock to prevent concurrent connections

  // 更新状态并通知监听器
  const updateState = useCallback((newState: ConnectionState) => {
    setConnectionState(newState);
    stateChangeCallbacksRef.current.forEach(callback => {
      try {
        callback(newState);
      } catch (_err) {
        if (process.env.NODE_ENV === 'development') {
          logger.error('[WebSocket] State change callback error', err, { category: 'system' });
        }
      }
    });
  }, []);

  // 更新统计
  const updateStats = useCallback((updates: Partial<WebSocketStats>) => {
    setStats(prev => ({ ...prev, ...updates }));
  }, []);

  // 启动心跳
  const startHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
    }

    heartbeatTimerRef.current = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('heartbeat', { timestamp: new Date().toISOString() });
      }
    }, heartbeatInterval);
  }, [heartbeatInterval]);

  // 停止心跳
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  // 处理消息 - Fixed: Use ref to avoid stats dependency
  const handleMessage = useCallback((type: string, data: WebSocketMessage) => {
    setLastMessage(data);
    setMessages(prev => [data, ...prev].slice(0, 100));

    // 调用特定类型的处理器
    const handlers = messageHandlersRef.current.get(type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (_err) {
          if (process.env.NODE_ENV === 'development') {
            logger.error(`[WebSocket] Handler error for ${type}`, err, { category: 'system' });
          }
        }
      });
    }

    // 调用通配符处理器
    const wildcardHandlers = messageHandlersRef.current.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => {
        try {
          handler(data);
        } catch (_err) {
          if (process.env.NODE_ENV === 'development') {
            logger.error('[WebSocket] Wildcard handler error', err, { category: 'system' });
          }
        }
      });
    }

    // Update stats inline without causing re-render
    setStats(prev => ({ ...prev, messagesReceived: prev.messagesReceived + 1 }));
  }, []);

  // 智能清理离线队列（FIFO + 优先级）- Fixed: Removed stats from dependencies
  const trimOfflineQueue = useCallback(() => {
    const queue = offlineQueueRef.current;
    const targetSize = offlineQueueSize;

    if (queue.length <= targetSize) {
      return;
    }

    const thresholdReached = queue.length > targetSize * offlineQueuePriorityThreshold;

    if (thresholdReached) {
      // 队列超过阈值，按优先级排序后保留高优先级消息
      const sortedQueue = [...queue].sort((a, b) => b.priority - a.priority);
      const keptMessages = sortedQueue.slice(0, targetSize);

      // 按原始顺序恢复（保持时间顺序）
      const keptIds = new Set(keptMessages.map(m => m.id));
      const trimmedQueue = queue.filter(m => keptIds.has(m.id));

      const droppedCount = queue.length - trimmedQueue.length;
      offlineQueueRef.current = trimmedQueue;

      if (droppedCount > 0 && process.env.NODE_ENV === 'development') {
        logger.info(`[WebSocket] Dropped ${droppedCount} low priority messages from offline queue`, { category: 'system' });
        setStats(prev => ({
          ...prev,
          offlineQueueDroppedCount: prev.offlineQueueDroppedCount + droppedCount,
        }));
      }
    } else {
      // 未达到阈值，使用 FIFO 清理
      const droppedCount = queue.length - targetSize;
      offlineQueueRef.current = queue.slice(-targetSize);

      if (droppedCount > 0 && process.env.NODE_ENV === 'development') {
        logger.info(`[WebSocket] Dropped ${droppedCount} old messages from offline queue (FIFO)`, { category: 'system' });
        setStats(prev => ({
          ...prev,
          offlineQueueDroppedCount: prev.offlineQueueDroppedCount + droppedCount,
        }));
      }
    }

    // 同步清理消息ID集合
    const keptIds = new Set(offlineQueueRef.current.map(m => m.id));
    offlineMessageIdsRef.current = new Set(Array.from(offlineMessageIdsRef.current).filter(id => keptIds.has(id)));

    setStats(prev => ({ ...prev, offlineQueueSize: offlineQueueRef.current.length }));
  }, [offlineQueueSize, offlineQueuePriorityThreshold]);

  // 批量发送离线消息 - Fixed: Removed stats from dependencies
  const processOfflineQueue = useCallback(() => {
    if (!enableOfflineQueue || offlineQueueRef.current.length === 0) return;

    const queue = [...offlineQueueRef.current];
    offlineQueueRef.current = [];
    offlineMessageIdsRef.current.clear();

    // 统计发送情况
    let sentCount = 0;
    let failedCount = 0;

    // 批量发送 - 使用 emit 的批处理能力
    queue.forEach(message => {
      try {
        if (socketRef.current?.connected) {
          socketRef.current.emit(message.type, message);
          sentCount++;
        } else {
          failedCount++;
        }
      } catch (_err) {
        if (process.env.NODE_ENV === 'development') {
          logger.error('[WebSocket] Failed to send offline message', err, { category: 'system' });
        }
        failedCount++;
      }
    });

    setStats(prev => ({
      ...prev,
      messagesSent: prev.messagesSent + sentCount,
      offlineQueueSize: 0,
    }));

    if (sentCount > 0 && process.env.NODE_ENV === 'development') {
      logger.info(`[WebSocket] Processed offline queue: ${sentCount} sent, ${failedCount} failed`, { category: 'system' });
    }
  }, [enableOfflineQueue, stats.messagesSent, updateStats]);

  // 注册消息处理器
  const registerMessageHandlers = useCallback((socket: Socket) => {
    const messageTypes = [
      'task:status_changed',
      'task:assigned',
      'task:comment',
      'member:online',
      'member:offline',
      'member:status_changed',
      'system:announcement',
      'project:updated',
      'heartbeat',
      'connection:confirmed',
      'read_status_updated',
    ];

    messageTypes.forEach(type => {
      socket.on(type, (data) => handleMessage(type, data));
    });
  }, [handleMessage]);

  // 创建连接
  const createConnection = useCallback(() => {
    // Prevent concurrent connections
    if (isConnectingRef.current) {
      logger.warn('[WebSocket] Connection already in progress');
      return;
    }

    if (socketRef.current?.connected) {
      isConnectingRef.current = false;
      return;
    }

    isConnectingRef.current = true;
    updateState('connecting');
    setError(null);

    try {
      const socket = io(url, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: false, // 我们自己管理重连
        timeout: 10000,
      });

      socketRef.current = socket;

      // 连接成功
      socket.on('connect', () => {
        isConnectingRef.current = false;
        updateState('connected');
        reconnectAttemptsRef.current = 0;
        connectionStartTimeRef.current = new Date();
        setStats(prev => ({
          ...prev,
          lastConnected: new Date(),
          reconnectCount: prev.reconnectCount + (reconnectAttemptsRef.current > 0 ? 1 : 0),
        }));

        startHeartbeat();

        // 重新订阅频道
        if (subscribedChannelsRef.current.size > 0) {
          socket.emit('subscribe', { channels: Array.from(subscribedChannelsRef.current) });
        }

        // 处理离线队列
        processOfflineQueue();
      });

      // 连接断开
      socket.on('disconnect', (reason: string) => {
        updateState('disconnected');
        stopHeartbeat();

        const duration = connectionStartTimeRef.current
          ? Date.now() - connectionStartTimeRef.current.getTime()
          : 0;

        setStats(prev => ({
          ...prev,
          lastDisconnected: new Date(),
          connectionDuration: prev.connectionDuration + duration,
        }));

        // 自动重连
        if (reconnect && reason !== 'io client disconnect') {
          scheduleReconnectRef.current();
        }
      });

      // 连接错误
      socket.on('connect_error', (err: Error) => {
        const wsError = new Error(`WebSocket connection error: ${err.message}`);
        setError(wsError);
        updateState('error');

        errorCallbacksRef.current.forEach(callback => {
          try {
            callback(wsError);
          } catch (e) {
            if (process.env.NODE_ENV === 'development') {
              console.error('[WebSocket] Error callback error:', e);
            }
          }
        });

        if (reconnect) {
          scheduleReconnectRef.current();
        }
      });

      // 注册消息处理器
      registerMessageHandlers(socket);

    } catch (_err) {
      isConnectingRef.current = false;
      const wsError = err instanceof Error ? err : new Error(String(err));
      setError(wsError);
      updateState('error');
    }
  }, [url, token, reconnect, startHeartbeat, stopHeartbeat, processOfflineQueue, stats, updateStats, updateState, registerMessageHandlers]);

  // 计划重连
  const scheduleReconnect = useCallback((): void => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectAttemptsRef.current++;

    if (reconnectAttemptsRef.current > maxReconnectAttempts) {
      const err = new Error('Max reconnection attempts reached');
      setError(err);
      updateState('error');
      return;
    }

    updateState('reconnecting');

    const delay = Math.min(
      reconnectInterval * Math.pow(1.5, reconnectAttemptsRef.current - 1),
      30000 // 最大 30 秒
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      createConnection();
    }, delay);
  }, [maxReconnectAttempts, reconnectInterval, createConnection, updateState]);

  // 设置 scheduleReconnect ref
  useEffect(() => {
    scheduleReconnectRef.current = scheduleReconnect;
  }, [scheduleReconnect]);

  // 断开连接
  const disconnectConnection = useCallback(() => {
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Stop heartbeat
    stopHeartbeat();

    // Disconnect socket and clear references
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Clear all event handlers to prevent memory leaks
    messageHandlersRef.current.clear();
    stateChangeCallbacksRef.current.clear();
    errorCallbacksRef.current.clear();

    // Clear all timers
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }

    // Update state
    updateState('disconnected');
  }, [stopHeartbeat, updateState]);

  // 发送消息（添加优先级支持）- Fixed: Removed stats from dependencies
  const sendMessage = useCallback((
    type: string,
    payload?: unknown,
    priority?: MessagePriority
  ) => {
    const messageId = generateMessageId();

    // 检查是否已在离线队列中（去重）
    if (offlineMessageIdsRef.current.has(messageId)) {
      if (process.env.NODE_ENV === 'development') {
        logger.info(`[WebSocket] Message ${messageId} already in offline queue, skipping`, { category: 'system' });
      }
      setStats(prev => ({
        ...prev,
        offlineQueueDedupCount: prev.offlineQueueDedupCount + 1,
      }));
      return;
    }

    const message: PrioritizedWebSocketMessage = {
      type,
      id: messageId,
      timestamp: new Date().toISOString(),
      payload,
      priority: priority ?? getMessagePriority(type),
      retryCount: 0,
      maxRetries: 3,
    };

    if (socketRef.current?.connected) {
      socketRef.current.emit(type, message);
      setStats(prev => ({ ...prev, messagesSent: prev.messagesSent + 1 }));
    } else if (enableOfflineQueue) {
      // 添加到离线队列
      offlineQueueRef.current.push(message);
      offlineMessageIdsRef.current.add(messageId);

      // 触发队列清理
      trimOfflineQueue();

      setStats(prev => ({ ...prev, offlineQueueSize: offlineQueueRef.current.length }));
    }
  }, [enableOfflineQueue, trimOfflineQueue]);

  // 订阅频道
  const subscribeToChannels = useCallback((newChannels: string[]) => {
    newChannels.forEach(ch => subscribedChannelsRef.current.add(ch));

    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe', { channels: newChannels });
    }
  }, []);

  // 取消订阅频道
  const unsubscribeFromChannels = useCallback((removeChannels: string[]) => {
    removeChannels.forEach(ch => subscribedChannelsRef.current.delete(ch));

    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe', { channels: removeChannels });
    }
  }, []);

  // 添加消息监听器
  const addMessageListener = useCallback(<T extends WebSocketMessage>(
    type: string,
    handler: (message: T) => void
  ): (() => void) => {
    if (!messageHandlersRef.current.has(type)) {
      messageHandlersRef.current.set(type, new Set());
    }

    messageHandlersRef.current.get(type)!.add(handler as (message: WebSocketMessage) => void);

    return () => {
      messageHandlersRef.current.get(type)?.delete(handler as (message: WebSocketMessage) => void);
    };
  }, []);

  // 添加状态变化监听器
  const addStateChangeListener = useCallback((callback: (state: ConnectionState) => void): (() => void) => {
    stateChangeCallbacksRef.current.add(callback);
    return () => {
      stateChangeCallbacksRef.current.delete(callback);
    };
  }, []);

  // 添加错误监听器
  const addErrorListener = useCallback((callback: (error: Error) => void): (() => void) => {
    errorCallbacksRef.current.add(callback);
    return () => {
      errorCallbacksRef.current.delete(callback);
    };
  }, []);

  // 清空消息
  const clearMessages = useCallback(() => {
    setMessages([]);
    setLastMessage(null);
  }, []);

  // 获取离线队列
  const getOfflineQueue = useCallback(() => {
    return [...offlineQueueRef.current];
  }, []);

  // 初始化
  useEffect(() => {
    if (autoConnect) {
      createConnection();
    }

    return () => {
      disconnectConnection();
    };
  }, [autoConnect, createConnection, disconnectConnection]);

  return {
    isConnected: connectionState === 'connected',
    connectionState,
    error,
    lastMessage,
    messages,
    stats,
    connect: createConnection,
    disconnect: disconnectConnection,
    reconnect: () => {
      disconnectConnection();
      setTimeout(createConnection, 100);
    },
    send: sendMessage,
    subscribe: subscribeToChannels,
    unsubscribe: unsubscribeFromChannels,
    on: addMessageListener,
    onStateChange: addStateChangeListener,
    onError: addErrorListener,
    clearMessages,
    getOfflineQueue,
  };
}

export default useEnhancedWebSocket;
