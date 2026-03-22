/**
 * useWebSocket Hook
 *
 * React hook for WebSocket connections with automatic reconnection,
 * heartbeat, and event handling.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface WebSocketConfig {
  url?: string;
  token?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
}

export interface WebSocketMessage {
  type: string;
  id: string;
  timestamp: string;
  roomId?: string;
  userId?: string;
  payload?: unknown;
}

export interface TaskStatusUpdate {
  taskId: string;
  status: string;
  state: string;
  timestamp: string;
  userId?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
}

export interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  authenticated: boolean;
  roomId?: string;
  userId?: string;
  lastHeartbeat?: number;
  error?: string;
}

export interface UseWebSocketReturn {
  socket: Socket | null;
  state: WebSocketState;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  joinRoom: (roomId: string, type?: string, documentId?: string, name?: string) => void;
  leaveRoom: (roomId: string) => void;
  send: (event: string, data?: unknown) => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler?: (...args: unknown[]) => void) => void;
}

/**
 * WebSocket connection hook with auto-reconnect and heartbeat
 */
export function useWebSocket(config: WebSocketConfig = {}): UseWebSocketReturn {
  const {
    url = process.env.NEXT_PUBLIC_WS_URL || `${window.location.origin}/api/ws`,
    token,
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
    reconnectionDelayMax = 10000,
    heartbeatInterval = 25000,
    heartbeatTimeout = 60000,
  } = config;

  const socketRef = useRef<Socket | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    authenticated: false,
  });
  const eventHandlersRef = useRef<Map<string, Set<(...args: unknown[]) => void>>>(new Map());

  // Update state helper
  const updateState = useCallback((updates: Partial<WebSocketState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Heartbeat management
  const startHeartbeat = useCallback(() => {
    // Clear existing timers
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);

    // Send heartbeat interval
    heartbeatIntervalRef.current = setInterval(() => {
      socketRef.current?.emit('heartbeat');
    }, heartbeatInterval);

    // Timeout detection
    heartbeatTimeoutRef.current = setTimeout(() => {
      if (socketRef.current?.connected) {
        console.warn('[WebSocket] Heartbeat timeout, reconnecting...');
        socketRef.current.disconnect();
      }
    }, heartbeatTimeout);
  }, [heartbeatInterval, heartbeatTimeout]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      console.warn('[WebSocket] Already connected');
      return;
    }

    updateState({ connecting: true, error: undefined });

    try {
      const socket = io(url, {
        auth: { token },
        reconnection,
        reconnectionAttempts,
        reconnectionDelay,
        reconnectionDelayMax,
        transports: ['websocket', 'polling'],
      });

      socketRef.current = socket;

      // Connection established
      socket.on('connect', () => {
        console.log('[WebSocket] Connected', { socketId: socket.id });
        updateState({
          connected: true,
          connecting: false,
        });
        startHeartbeat();
      });

      // Authentication success
      socket.on('auth:authenticated', (data: { userId: string; name: string; avatar?: string }) => {
        console.log('[WebSocket] Authenticated', data);
        updateState({
          authenticated: true,
          userId: data.userId,
        });
      });

      // Authentication error
      socket.on('auth:error', (error: { message: string }) => {
        console.error('[WebSocket] Authentication error', error);
        updateState({
          authenticated: false,
          error: error.message,
        });
      });

      // Connection error
      socket.on('connect_error', (error) => {
        console.error('[WebSocket] Connection error', error);
        updateState({
          connected: false,
          connecting: false,
          error: error.message,
        });
      });

      // Reconnect attempt
      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('[WebSocket] Reconnect attempt', { attemptNumber });
        updateState({ connecting: true });
      });

      // Reconnect successful
      socket.on('reconnect', (attemptNumber) => {
        console.log('[WebSocket] Reconnected', { attemptNumber });
        updateState({
          connected: true,
          connecting: false,
          error: undefined,
        });
      });

      // Reconnect failed
      socket.on('reconnect_failed', () => {
        console.error('[WebSocket] Reconnect failed');
        updateState({
          connected: false,
          connecting: false,
          error: 'Reconnection failed',
        });
      });

      // Disconnect
      socket.on('disconnect', (reason) => {
        console.log('[WebSocket] Disconnected', { reason });
        stopHeartbeat();
        updateState({
          connected: false,
          connecting: false,
          authenticated: false,
        });
      });

      // Register all stored event handlers
      eventHandlersRef.current.forEach((handlers, event) => {
        handlers.forEach(handler => socket.on(event, handler));
      });

    } catch (error) {
      console.error('[WebSocket] Connection failed', error);
      updateState({
        connected: false,
        connecting: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [url, token, reconnection, reconnectionAttempts, reconnectionDelay, reconnectionDelayMax, startHeartbeat, stopHeartbeat, updateState]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('[WebSocket] Disconnecting');
      stopHeartbeat();
      socketRef.current.disconnect();
      socketRef.current = null;
      updateState({
        connected: false,
        connecting: false,
        authenticated: false,
        roomId: undefined,
      });
    }
  }, [stopHeartbeat, updateState]);

  // Force reconnect
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, reconnectionDelay);
  }, [disconnect, connect, reconnectionDelay]);

  // Join a room
  const joinRoom = useCallback((roomId: string, type = 'task', documentId = '', name?: string) => {
    if (!socketRef.current?.connected) {
      console.warn('[WebSocket] Cannot join room: not connected');
      return;
    }

    socketRef.current.emit('room:join', { roomId, type, documentId, name });
    updateState({ roomId });
  }, [updateState]);

  // Leave a room
  const leaveRoom = useCallback((roomId: string) => {
    if (!socketRef.current?.connected) {
      return;
    }

    socketRef.current.emit('room:leave', { roomId });
    if (state.roomId === roomId) {
      updateState({ roomId: undefined });
    }
  }, [state.roomId, updateState]);

  // Send a message
  const send = useCallback((event: string, data?: unknown) => {
    if (!socketRef.current?.connected) {
      console.warn('[WebSocket] Cannot send message: not connected');
      return false;
    }

    socketRef.current.emit(event, data);
    return true;
  }, []);

  // Register event listener
  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    // Add to handlers map
    if (!eventHandlersRef.current.has(event)) {
      eventHandlersRef.current.set(event, new Set());
    }
    eventHandlersRef.current.get(event)!.add(handler);

    // Register on socket if connected
    if (socketRef.current?.connected) {
      socketRef.current.on(event, handler);
    }
  }, []);

  // Unregister event listener
  const off = useCallback((event: string, handler?: (...args: unknown[]) => void) => {
    if (handler) {
      // Remove specific handler
      const handlers = eventHandlersRef.current.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (socketRef.current?.connected) {
          socketRef.current.off(event, handler);
        }
      }
    } else {
      // Remove all handlers for event
      if (eventHandlersRef.current.has(event)) {
        eventHandlersRef.current.get(event)!.forEach(h => {
          if (socketRef.current?.connected) {
            socketRef.current.off(event, h);
          }
        });
        eventHandlersRef.current.delete(event);
      }
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]);

  return {
    socket: socketRef.current,
    state,
    connect,
    disconnect,
    reconnect,
    joinRoom,
    leaveRoom,
    send,
    on,
    off,
  };
}

/**
 * Hook for task status updates via WebSocket
 */
export function useTaskStatusUpdates(config: WebSocketConfig = {}) {
  const ws = useWebSocket(config);
  const [taskUpdates, setTaskUpdates] = useState<Map<string, TaskStatusUpdate>>(new Map());

  useEffect(() => {
    const handleTaskUpdate = (data: unknown) => {
      const update = data as TaskStatusUpdate;
      console.log('[WebSocket] Task status update', update);
      setTaskUpdates(prev => {
        const updates = new Map(prev);
        updates.set(update.taskId, update);
        return updates;
      });
    };

    ws.on('task:status_update', handleTaskUpdate);

    return () => {
      ws.off('task:status_update', handleTaskUpdate);
    };
  }, [ws]);

  const getTaskStatus = useCallback((taskId: string) => {
    return taskUpdates.get(taskId);
  }, [taskUpdates]);

  const clearTaskUpdate = useCallback((taskId: string) => {
    setTaskUpdates(prev => {
      const updates = new Map(prev);
      updates.delete(taskId);
      return updates;
    });
  }, []);

  return {
    ...ws,
    taskUpdates,
    getTaskStatus,
    clearTaskUpdate,
  };
}
