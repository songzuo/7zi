/**
 * 简洁的 WebSocket Hook
 *
 * 提供简单易用的 WebSocket API，支持自定义事件监听
 * 适用于不需要复杂功能（如自动重连、心跳等）的场景
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { WebSocketMessage } from './types';

// ============================================================================
// 类型定义
// ============================================================================

export type WebSocketStatus = 'connecting' | 'open' | 'closing' | 'closed' | 'error';

export interface SimpleWebSocketConfig {
  url: string;
  protocols?: string | string[];
  autoConnect?: boolean;
  reconnectOnClose?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface WebSocketOptions {
  onOpen?: (event: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
}

export interface UseWebSocketReturn {
  // 连接状态
  status: WebSocketStatus;
  isConnected: boolean;
  error: Event | null;

  // 消息
  lastMessage: WebSocketMessage | null;

  // 操作
  connect: () => void;
  disconnect: () => void;
  send: (data: WebSocketMessage) => void;

  // 事件监听
  addListener: (event: string, handler: (data: unknown) => void) => () => void;
  removeListener: (event: string, handler: (data: unknown) => void) => void;
  on: (event: string, handler: (data: unknown) => void) => () => void;
  once: (event: string, handler: (data: unknown) => void) => () => void;

  // 工具
  getWebSocket: () => WebSocket | null;
}

// ============================================================================
// Hook 实现
// ============================================================================

export function useWebSocket(
  config: SimpleWebSocketConfig,
  options?: WebSocketOptions
): UseWebSocketReturn {
  const {
    url,
    protocols,
    autoConnect = true,
    reconnectOnClose = false,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = config || {};

  // 状态
  const [status, setStatus] = useState<WebSocketStatus>('closed');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Event | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const eventListenersRef = useRef<Map<string, Set<(data: unknown) => void>>>(new Map());
  const onceListenersRef = useRef<Map<string, Set<(data: unknown) => void>>>(new Map());

  // 更新连接状态
  const updateStatus = useCallback((newStatus: WebSocketStatus) => {
    setStatus(newStatus);
    setIsConnected(newStatus === 'open');
  }, []);

  // 计划重连 - 定义在 createConnection 之前
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectAttemptsRef.current++;

    if (reconnectAttemptsRef.current > maxReconnectAttempts) {
      console.error('[useWebSocket] Max reconnection attempts reached');
      return;
    }

    updateStatus('connecting');

    reconnectTimeoutRef.current = setTimeout(() => {
      createConnection();
    }, reconnectInterval);
  }, [maxReconnectAttempts, reconnectInterval, updateStatus]);

  // 移除事件监听器 - 定义在 addListener 之前
  const removeListener = useCallback((event: string, handler: (data: unknown) => void) => {
    const listeners = eventListenersRef.current.get(event);
    if (listeners) {
      listeners.delete(handler);
      if (listeners.size === 0) {
        eventListenersRef.current.delete(event);
      }
    }
  }, []);

  // 创建 WebSocket 连接
  const createConnection = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    updateStatus('connecting');
    setError(null);

    try {
      const ws = new WebSocket(url, protocols);
      wsRef.current = ws;

      // 连接打开
      ws.addEventListener('open', (event) => {
        updateStatus('open');
        reconnectAttemptsRef.current = 0;
        options?.onOpen?.(event);
      });

      // 接收消息
      ws.addEventListener('message', (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(data);
          options?.onMessage?.(data);

          // 触发事件监听器
          const listeners = eventListenersRef.current.get(data.type);
          if (listeners) {
            listeners.forEach(handler => {
              try {
                handler(data);
              } catch (err) {
                console.error(`[useWebSocket] Error in listener for ${data.type}:`, err);
              }
            });
          }

          // 触发通配符监听器
          const wildcardListeners = eventListenersRef.current.get('*');
          if (wildcardListeners) {
            wildcardListeners.forEach(handler => {
              try {
                handler(data);
              } catch (err) {
                console.error('[useWebSocket] Error in wildcard listener:', err);
              }
            });
          }

          // 触发 once 监听器
          const onceHandlers = onceListenersRef.current.get(data.type);
          if (onceHandlers) {
            onceHandlers.forEach(handler => {
              try {
                handler(data);
              } catch (err) {
                console.error(`[useWebSocket] Error in once handler for ${data.type}:`, err);
              }
            });
            onceListenersRef.current.delete(data.type);
          }

        } catch (err) {
          console.error('[useWebSocket] Failed to parse message:', err);
          // 将原始数据作为字符串处理
          options?.onMessage?.({
            type: 'raw',
            id: `raw-${Date.now()}`,
            timestamp: new Date().toISOString(),
            payload: event.data,
          });
        }
      });

      // 错误处理
      ws.addEventListener('error', (event) => {
        setError(event);
        updateStatus('error');
        options?.onError?.(event);
      });

      // 连接关闭
      ws.addEventListener('close', (event) => {
        updateStatus('closed');
        options?.onClose?.(event);

        // 自动重连
        if (reconnectOnClose && !event.wasClean) {
          scheduleReconnect();
        }
      });

    } catch (err) {
      const errorEvent = new Event('error');
      setError(errorEvent);
      updateStatus('error');
      options?.onError?.(errorEvent);
    }
  }, [url, protocols, options, reconnectOnClose, scheduleReconnect, updateStatus]);

  // 断开连接
  const disconnectConnection = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    updateStatus('closed');
  }, [updateStatus]);

  // 发送消息
  const sendMessage = useCallback((data: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(data));
      } catch (err) {
        console.error('[useWebSocket] Failed to send message:', err);
      }
    } else {
      console.warn('[useWebSocket] WebSocket is not connected. Message not sent:', data);
    }
  }, []);

  // 添加事件监听器
  const addListener = useCallback((event: string, handler: (data: unknown) => void): (() => void) => {
    if (!eventListenersRef.current.has(event)) {
      eventListenersRef.current.set(event, new Set());
    }
    eventListenersRef.current.get(event)!.add(handler);

    return () => removeListener(event, handler);
  }, [removeListener]);

  // 添加一次性事件监听器
  const addOnceListener = useCallback((event: string, handler: (data: unknown) => void): (() => void) => {
    if (!onceListenersRef.current.has(event)) {
      onceListenersRef.current.set(event, new Set());
    }
    onceListenersRef.current.get(event)!.add(handler);

    return () => {
      onceListenersRef.current.get(event)?.delete(handler);
    };
  }, []);

  // 获取 WebSocket 实例
  const getWebSocket = useCallback(() => {
    return wsRef.current;
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
    status,
    isConnected,
    error,
    lastMessage,
    connect: createConnection,
    disconnect: disconnectConnection,
    send: sendMessage,
    addListener,
    removeListener,
    on: addListener,
    once: addOnceListener,
    getWebSocket,
  };
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 创建标准 WebSocket 消息
 */
export function createMessage<T = unknown>(
  type: string,
  payload?: T
): WebSocketMessage {
  return {
    type,
    id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    payload,
  };
}

/**
 * 检查消息是否匹配类型
 */
export function isMessageType<T = unknown>(
  message: WebSocketMessage,
  type: string
): message is WebSocketMessage & { payload: T } {
  return message.type === type;
}

export default useWebSocket;
