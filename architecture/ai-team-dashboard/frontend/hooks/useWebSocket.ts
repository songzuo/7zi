/**
 * WebSocket Hook - 实时通信
 * 
 * 使用 Socket.IO 实现实时更新
 * 支持自动重连、心跳、错误处理
 */

import { useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDashboardStore } from '../store/dashboardStore';

// ============================================================================
// 配置
// ============================================================================

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000';
const RECONNECT_DELAY = 1000; // 1 秒
const RECONNECT_MAX_DELAY = 30000; // 30 秒
const HEARTBEAT_INTERVAL = 30000; // 30 秒

// ============================================================================
// 类型
// ============================================================================

interface WebSocketOptions {
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// Hook 实现
// ============================================================================

export const useWebSocket = (options: WebSocketOptions = {}) => {
  const {
    autoConnect = true,
    onConnect,
    onDisconnect,
    onError
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    updateIssue,
    updateMemberStatus,
    setConnected,
    setLastSyncAt
  } = useDashboardStore();

  // --------------------------------------------------------------------------
  // 连接处理
  // --------------------------------------------------------------------------

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('[WS] Already connected');
      return;
    }

    console.log('[WS] Connecting to', WS_URL);

    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: false, // 手动控制重连
      auth: {
        token: localStorage.getItem('token') // 可选认证
      }
    });

    // ------------------------------------------------------------------------
    // 连接事件
    // ------------------------------------------------------------------------

    socket.on('connect', () => {
      console.log('[WS] Connected');
      reconnectAttemptsRef.current = 0;
      setConnected(true);
      onConnect?.();

      // 订阅默认频道
      socket.emit('subscribe', {
        channels: ['issues', 'members', 'system']
      });

      // 启动心跳
      startHeartbeat(socket);
    });

    socket.on('connect_error', (error) => {
      console.error('[WS] Connection error:', error);
      onError?.(error);
      scheduleReconnect();
    });

    // ------------------------------------------------------------------------
    // 断开事件
    // ------------------------------------------------------------------------

    socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
      setConnected(false);
      onDisconnect?.();
      stopHeartbeat();

      // 根据断开原因决定是否重连
      if (reason !== 'io client disconnect') {
        scheduleReconnect();
      }
    });

    // ------------------------------------------------------------------------
    // 数据更新事件
    // ------------------------------------------------------------------------

    socket.on('issue:updated', (issue) => {
      console.log('[WS] Issue updated:', issue);
      updateIssue(issue);
    });

    socket.on('issue:created', (issue) => {
      console.log('[WS] Issue created:', issue);
      updateIssue(issue);
    });

    socket.on('issue:closed', (issue) => {
      console.log('[WS] Issue closed:', issue);
      updateIssue(issue);
    });

    socket.on('issue:assigned', (data) => {
      console.log('[WS] Issue assigned:', data);
      updateIssue(data.issue);
    });

    socket.on('member:status', (data) => {
      console.log('[WS] Member status:', data);
      updateMemberStatus(data.memberId, data.status, data.statusMessage);
    });

    socket.on('member:activity', (data) => {
      console.log('[WS] Member activity:', data);
      // 可以触发通知或其他操作
    });

    socket.on('system:refresh', (data) => {
      console.log('[WS] System refresh:', data);
      setLastSyncAt(new Date());
    });

    socket.on('system:error', (data) => {
      console.error('[WS] System error:', data);
      onError?.(new Error(data.message));
    });

    socket.on('system:rate-limit', (data) => {
      console.warn('[WS] Rate limited:', data);
      // 可以显示提示给用户
    });

    // ------------------------------------------------------------------------
    // 心跳响应
    // ------------------------------------------------------------------------

    socket.on('pong', (data) => {
      const latency = Date.now() - data.timestamp;
      console.log('[WS] Pong, latency:', latency, 'ms');
    });

    socketRef.current = socket;
  }, [onConnect, onDisconnect, onError, updateIssue, updateMemberStatus, setConnected, setLastSyncAt]);

  // --------------------------------------------------------------------------
  // 断开连接
  // --------------------------------------------------------------------------

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('[WS] Disconnecting');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    stopHeartbeat();
    clearReconnectTimer();
  }, []);

  // --------------------------------------------------------------------------
  // 重连逻辑
  // --------------------------------------------------------------------------

  const scheduleReconnect = useCallback(() => {
    const delay = Math.min(
      RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
      RECONNECT_MAX_DELAY
    );

    console.log(`[WS] Scheduling reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`);

    clearReconnectTimer();
    reconnectTimerRef.current = setTimeout(() => {
      reconnectAttemptsRef.current += 1;
      connect();
    }, delay);
  }, [connect]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  // --------------------------------------------------------------------------
  // 心跳
  // --------------------------------------------------------------------------

  const startHeartbeat = useCallback((socket: Socket) => {
    stopHeartbeat();

    heartbeatTimerRef.current = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping', { timestamp: Date.now() });
      }
    }, HEARTBEAT_INTERVAL);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  // --------------------------------------------------------------------------
  // 订阅管理
  // --------------------------------------------------------------------------

  const subscribe = useCallback((channels: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe', { channels });
    }
  }, []);

  const unsubscribe = useCallback((channels: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe', { channels });
    }
  }, []);

  // --------------------------------------------------------------------------
  // 发送消息
  // --------------------------------------------------------------------------

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('[WS] Cannot emit, not connected');
    }
  }, []);

  // --------------------------------------------------------------------------
  // 生命周期
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // --------------------------------------------------------------------------
  // 返回值
  // --------------------------------------------------------------------------

  return {
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    emit,
    isConnected: socketRef.current?.connected || false,
    socket: socketRef.current
  };
};

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取 WebSocket 连接状态
 */
export const useWebSocketStatus = () => {
  const isConnected = useDashboardStore(state => state.isConnected);
  const lastSyncAt = useDashboardStore(state => state.lastSyncAt);

  return {
    isConnected,
    lastSyncAt,
    status: isConnected ? 'connected' : 'disconnected'
  };
};

/**
 * 订阅特定 Issue 的更新
 */
export const useIssueSubscription = (issueNumber: number | null) => {
  const { subscribe, unsubscribe } = useWebSocket();

  useEffect(() => {
    if (issueNumber !== null) {
      subscribe([`issue:${issueNumber}`]);
      return () => {
        unsubscribe([`issue:${issueNumber}`]);
      };
    }
  }, [issueNumber, subscribe, unsubscribe]);
};

/**
 * 订阅特定成员的更新
 */
export const useMemberSubscription = (memberId: string | null) => {
  const { subscribe, unsubscribe } = useWebSocket();

  useEffect(() => {
    if (memberId !== null) {
      subscribe([`member:${memberId}`]);
      return () => {
        unsubscribe([`member:${memberId}`]);
      };
    }
  }, [memberId, subscribe, unsubscribe]);
};
