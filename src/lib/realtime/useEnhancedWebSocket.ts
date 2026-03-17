/**
 * 增强的 WebSocket Hook
 *
 * 提供更完善的 WebSocket 连接管理，包括：
 * - 自动重连和心跳
 * - 离线消息队列
 * - 连接状态监控
 * - 错误处理和恢复
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
// TODO: Install socket.io-client when real-time functionality is needed
// import { io, Socket } from 'socket.io-client';
import type { WebSocketMessage } from './types';

// Placeholder types
type Socket = any;

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
}

export interface WebSocketStats {
  messagesSent: number;
  messagesReceived: number;
  reconnectCount: number;
  lastConnected: Date | null;
  lastDisconnected: Date | null;
  connectionDuration: number;
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
  send: (type: string, payload?: unknown) => void;
  subscribe: (channels: string[]) => void;
  unsubscribe: (channels: string[]) => void;

  // 事件监听
  on: <T extends WebSocketMessage>(type: string, handler: (message: T) => void) => () => void;
  onStateChange: (callback: (state: ConnectionState) => void) => () => void;
  onError: (callback: (error: Error) => void) => () => void;

  // 工具
  clearMessages: () => void;
  getOfflineQueue: () => WebSocketMessage[];
}

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
  });

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const connectionStartTimeRef = useRef<Date | null>(null);
  const offlineQueueRef = useRef<WebSocketMessage[]>([]);
  const messageHandlersRef = useRef<Map<string, Set<(message: WebSocketMessage) => void>>>(new Map());
  const stateChangeCallbacksRef = useRef<Set<(state: ConnectionState) => void>>(new Set());
  const errorCallbacksRef = useRef<Set<(error: Error) => void>>(new Set());
  const subscribedChannelsRef = useRef<Set<string>>(new Set(channels));

  // Refs for functions to allow self-reference
  const createConnectionRef = useRef<(() => void) | null>(null);
  const scheduleReconnectRef = useRef<(() => void) | null>(null);

  // Stats ref to avoid stale closure
  const statsRef = useRef(stats);
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  // 更新状态并通知监听器
  const updateState = useCallback((newState: ConnectionState) => {
    setConnectionState(newState);
    stateChangeCallbacksRef.current.forEach(callback => {
      try {
        callback(newState);
      } catch (err) {
        console.error('[WebSocket] State change callback error:', err);
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

  // 处理消息
  const handleMessage = useCallback((type: string, data: WebSocketMessage) => {
    setLastMessage(data);
    setMessages(prev => [data, ...prev].slice(0, 100));
    updateStats({ messagesReceived: (statsRef.current.messagesReceived + 1) });

    // 调用特定类型的处理器
    const handlers = messageHandlersRef.current.get(type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (err) {
          console.error(`[WebSocket] Handler error for ${type}:`, err);
        }
      });
    }

    // 调用通配符处理器
    const wildcardHandlers = messageHandlersRef.current.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => {
        try {
          handler(data);
        } catch (err) {
          console.error('[WebSocket] Wildcard handler error:', err);
        }
      });
    }
  }, [updateStats]);

  // 处理离线队列
  const processOfflineQueue = useCallback(() => {
    if (!enableOfflineQueue || offlineQueueRef.current.length === 0) return;

    const queue = [...offlineQueueRef.current];
    offlineQueueRef.current = [];

    queue.forEach(message => {
      if (socketRef.current?.connected) {
        socketRef.current.emit(message.type, message);
        updateStats({ messagesSent: (statsRef.current.messagesSent + 1) });
      }
    });
  }, [enableOfflineQueue, updateStats]);

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
      socket.on(type, (data: unknown) => handleMessage(type, data));
    });
  }, [handleMessage]);

  // 计划重连
  const scheduleReconnect = useCallback(() => {
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
      createConnectionRef.current?.();
    }, delay);
  }, [maxReconnectAttempts, reconnectInterval, updateState]);

  // 创建连接
  const createConnection = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

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
        updateState('connected');
        reconnectAttemptsRef.current = 0;
        connectionStartTimeRef.current = new Date();
        updateStats({
          lastConnected: new Date(),
          reconnectCount: stats.reconnectCount + (reconnectAttemptsRef.current > 0 ? 1 : 0),
        });

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

        updateStats({
          lastDisconnected: new Date(),
          connectionDuration: stats.connectionDuration + duration,
        });

        // 自动重连
        if (reconnect && reason !== 'io client disconnect' && scheduleReconnectRef.current) {
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
            console.error('[WebSocket] Error callback error:', e);
          }
        });

        if (reconnect && scheduleReconnectRef.current) {
          scheduleReconnectRef.current();
        }
      });

      // 注册消息处理器
      registerMessageHandlers(socket);

    } catch (err) {
      const wsError = err instanceof Error ? err : new Error(String(err));
      setError(wsError);
      updateState('error');
    }
  }, [url, token, reconnect, startHeartbeat, stopHeartbeat, processOfflineQueue, registerMessageHandlers, stats, updateStats, updateState, scheduleReconnectRef]);

  // Update refs in effect
  useEffect(() => {
    createConnectionRef.current = createConnection;
    scheduleReconnectRef.current = scheduleReconnect;
  }, [createConnection, scheduleReconnect]);

  // 断开连接
  const disconnectConnection = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopHeartbeat();

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    updateState('disconnected');
  }, [stopHeartbeat, updateState]);

  // 发送消息
  const sendMessage = useCallback((type: string, payload?: unknown) => {
    const message: WebSocketMessage = {
      type,
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      payload,
    };

    if (socketRef.current?.connected) {
      socketRef.current.emit(type, message);
      updateStats({ messagesSent: (statsRef.current.messagesSent + 1) });
    } else if (enableOfflineQueue) {
      // 添加到离线队列
      offlineQueueRef.current.push(message);
      if (offlineQueueRef.current.length > offlineQueueSize) {
        offlineQueueRef.current = offlineQueueRef.current.slice(-offlineQueueSize);
      }
    }
  }, [enableOfflineQueue, offlineQueueSize, updateStats]);

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