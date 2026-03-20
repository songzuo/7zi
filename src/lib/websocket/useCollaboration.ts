/**
 * WebSocket Collaboration Hook
 *
 * React hook for real-time collaboration features
 * Provides connection management, room handling, and event listeners
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Operation, Cursor, Presence } from '@/lib/collaboration/manager';
import { logger } from '@/lib/logger';

// ============================================================================
// Utility Functions
// ============================================================================

function applyOperation(content: string, operation: Operation): string {
  switch (operation.type) {
    case 'insert':
      if (operation.content !== undefined) {
        return content.slice(0, operation.position) + operation.content + content.slice(operation.position);
      }
      return content;

    case 'delete':
      if (operation.length !== undefined) {
        return content.slice(0, operation.position) + content.slice(operation.position + operation.length);
      }
      return content;

    case 'retain':
      return content;

    default:
      return content;
  }
}

// ============================================================================
// Types
// ============================================================================

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface RoomUser {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  isTyping: boolean;
  lastActivity: Date;
}

export interface CollaborationConfig {
  url: string;
  token: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  roomId?: string;
  roomType?: 'task' | 'project' | 'chat' | 'document';
  documentId?: string;
  autoConnect?: boolean;
  autoReconnect?: boolean;
}

export interface CollaborationState {
  connectionState: ConnectionState;
  error: Error | null;
  isConnected: boolean;
  isInRoom: boolean;
  users: RoomUser[];
  cursors: Map<string, Cursor>;
  document: {
    content: string;
    revision: number;
  } | null;
  typingUsers: string[];
}

export interface CollaborationActions {
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;

  // Room actions
  joinRoom: (roomId: string, type: CollaborationConfig['roomType'], documentId: string, name?: string) => void;
  leaveRoom: () => void;

  // Document actions
  openDocument: (documentId: string) => void;
  syncDocument: () => void;
  sendOperation: (operation: Operation) => void;

  // Cursor actions
  moveCursor: (position: number, selection?: { start: number; end: number }) => void;

  // Presence actions
  setTyping: (isTyping: boolean) => void;

  // Event listeners
  onDocumentUpdate: (callback: (document: { content: string; revision: number }) => void) => () => void;
  onUserJoined: (callback: (user: RoomUser) => void) => () => void;
  onUserLeft: (callback: (userId: string) => void) => () => void;
  onCursorUpdate: (callback: (cursor: Cursor) => void) => () => void;
  onTypingUpdate: (callback: (userId: string, userName: string, isTyping: boolean) => void) => () => void;
  onError: (callback: (error: Error) => void) => () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useCollaboration(config: CollaborationConfig): CollaborationState & CollaborationActions {
  const {
    url,
    token,
    userId,
    userName,
    userAvatar,
    roomId: initialRoomId,
    roomType,
    documentId: initialDocumentId,
    autoConnect = true,
    autoReconnect = true,
  } = config;

  // State
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isInRoom, setIsInRoom] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | undefined>(initialRoomId);
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [cursors, setCursors] = useState<Map<string, Cursor>>(new Map());
  const [document, setDocument] = useState<{ content: string; revision: number } | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentRoomRef = useRef<string | undefined>(initialRoomId);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Event listener refs
  const documentUpdateCallbacksRef = useRef<Set<(doc: { content: string; revision: number }) => void>>(new Set());
  const userJoinedCallbacksRef = useRef<Set<(user: RoomUser) => void>>(new Set());
  const userLeftCallbacksRef = useRef<Set<(userId: string) => void>>(new Set());
  const cursorUpdateCallbacksRef = useRef<Set<(cursor: Cursor) => void>>(new Set());
  const typingUpdateCallbacksRef = useRef<Set<(userId: string, userName: string, isTyping: boolean) => void>>(new Set());
  const errorCallbackRef = useRef<Set<(error: Error) => void>>(new Set());
  const connectRef = useRef<(() => void) | null>(null);
  const scheduleReconnectRef = useRef<(() => void) | null>(null);

  // Update connection state
  const updateState = useCallback((newState: ConnectionState) => {
    setConnectionState(newState);
    setIsConnected(newState === 'connected');
  }, []);

  // Calculate reconnect delay with exponential backoff
  const getReconnectDelay = useCallback((): number => {
    const baseDelay = 1000;
    const maxDelay = 30000;
    const delay = baseDelay * Math.pow(1.5, reconnectAttemptsRef.current);
    return Math.min(delay, maxDelay);
  }, []);

  // Schedule reconnect - MUST be defined before connect to avoid "accessed before declared" error
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectAttemptsRef.current++;

    if (reconnectAttemptsRef.current > 10) {
      const error = new Error('Max reconnection attempts reached');
      setError(error);
      updateState('error');
      return;
    }

    updateState('reconnecting');

    const delay = getReconnectDelay();
    logger.info(`Reconnecting in ${delay}ms`, { attempt: reconnectAttemptsRef.current });

    reconnectTimeoutRef.current = setTimeout(() => {
      // Use connectRef to avoid stale closure issues
      connectRef.current?.();
    }, delay);
  }, [getReconnectDelay, updateState]);

  // Create socket connection
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      logger.warn('WebSocket already connected');
      return;
    }

    updateState('connecting');
    setError(null);

    try {
      const socket = io(url, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: false, // We handle reconnection manually
        timeout: 10000,
      });

      socketRef.current = socket;

      // Connection established
      socket.on('connect', () => {
        logger.info('WebSocket connected', { userId, userName });
        updateState('connected');
        reconnectAttemptsRef.current = 0;

        // Auto-join room if configured
        if (currentRoomRef.current && roomType && initialDocumentId) {
          socket.emit('room:join', {
            roomId: currentRoomRef.current,
            type: roomType,
            documentId: initialDocumentId,
          });
        }
      });

      // Authentication successful
      socket.on('auth:authenticated', (data) => {
        logger.info('Authenticated', { data });
      });

      // Authentication failed
      socket.on('auth:unauthorized', (data) => {
        const error = new Error(data.reason || 'Unauthorized');
        setError(error);
        updateState('error');
        socket.disconnect();
      });

      // Room joined
      socket.on('room:joined', (data) => {
        logger.info('Room joined', { roomId: data.roomId });
        setIsInRoom(true);
        setCurrentRoomId(data.roomId);
        currentRoomRef.current = data.roomId;
        setUsers(data.users);
        setDocument(data.document);
      });

      // Room left
      socket.on('room:left', (data) => {
        logger.info('Room left', { roomId: data.roomId });
        setIsInRoom(false);
        setCurrentRoomId(undefined);
        currentRoomRef.current = undefined;
        setUsers([]);
        setDocument(null);
      });

      // User joined room
      socket.on('room:user_joined', (data) => {
        logger.debug('User joined room', { data });
        setUsers(prev => [...prev, data.user]);
        userJoinedCallbacksRef.current.forEach(cb => cb(data.user));
      });

      // User left room
      socket.on('room:user_left', (data) => {
        logger.debug('User left room', { data });
        setUsers(prev => prev.filter(u => u.id !== data.userId));
        setCursors(prev => {
          const next = new Map(prev);
          next.delete(data.userId);
          return next;
        });
        setTypingUsers(prev => prev.filter(id => id !== data.userId));
        userLeftCallbacksRef.current.forEach(cb => cb(data.userId));
      });

      // User list updated
      socket.on('room:user_list', (data) => {
        setUsers(data.users);
      });

      // Document opened
      socket.on('doc:opened', (data) => {
        setDocument(data.document);
      });

      // Document synced
      socket.on('doc:sync', (data) => {
        setDocument(data.document);
        documentUpdateCallbacksRef.current.forEach(cb => cb(data.document));
      });

      // Document operation applied
      socket.on('doc:operation_applied', (data) => {
        logger.debug('Document operation applied', { data });
        if (document && data.revision > document.revision) {
          setDocument(prev => {
            if (!prev) return { content: '', revision: data.revision };
            // Apply operation to local content
            const newContent = applyOperation(prev.content, data.operation);
            return { content: newContent, revision: data.revision };
          });
          documentUpdateCallbacksRef.current.forEach(cb => cb({
            content: document.content,
            revision: data.revision,
          }));
        }
      });

      // Cursor updated
      socket.on('cursor:update', (data) => {
        logger.debug('Cursor updated', { data });
        setCursors(prev => {
          const next = new Map(prev);
          next.set(data.userId, {
            userId: data.userId,
            userName: data.userName,
            color: data.color,
            position: data.position,
            selection: data.selection,
          });
          return next;
        });
        cursorUpdateCallbacksRef.current.forEach(cb => cb({
          userId: data.userId,
          userName: data.userName,
          color: data.color,
          position: data.position,
          selection: data.selection,
        }));
      });

      // Typing status updated
      socket.on('presence:typing', (data) => {
        logger.debug('Typing status updated', { data });
        setTypingUsers(prev => {
          if (data.isTyping) {
            return [...prev.filter(id => id !== data.userId), data.userId];
          } else {
            return prev.filter(id => id !== data.userId);
          }
        });
        typingUpdateCallbacksRef.current.forEach(cb => cb(data.userId, data.userName, data.isTyping));
      });

      // System error
      socket.on('system:error', (data) => {
        const error = new Error(data.message || 'Unknown error');
        setError(error);
        errorCallbackRef.current.forEach(cb => cb(error));
      });

      // Disconnect
      socket.on('disconnect', (reason) => {
        logger.info('WebSocket disconnected', { reason });
        updateState('disconnected');
        setIsInRoom(false);

        // Auto-reconnect if enabled
        if (autoReconnect && reason !== 'io client disconnect') {
          scheduleReconnectRef.current?.();
        }
      });

      // Connection error
      socket.on('connect_error', (err) => {
        logger.error('WebSocket connection error', { error: err });
        const error = new Error(err.message || 'Connection error');
        setError(error);
        updateState('error');

        if (autoReconnect) {
          scheduleReconnectRef.current?.();
        }
      });

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      updateState('error');
      logger.error('Failed to create WebSocket connection', { error });
    }
  }, [url, token, userId, userName, roomType, initialDocumentId, autoReconnect, updateState]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    updateState('disconnected');
    setIsInRoom(false);
    reconnectAttemptsRef.current = 0;
  }, [updateState]);

  // Manual reconnect
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      reconnectAttemptsRef.current = 0;
      connectRef.current?.();
    }, 100);
  }, [disconnect]);

  // Join room
  const joinRoom = useCallback((
    roomId: string,
    type: CollaborationConfig['roomType'],
    docId: string,
    name?: string
  ) => {
    if (!socketRef.current?.connected) {
      logger.warn('Cannot join room: not connected');
      return;
    }

    logger.info('Joining room', { roomId, type, documentId: docId });
    socketRef.current.emit('room:join', {
      roomId,
      type,
      documentId: docId,
      name,
    });

    currentRoomRef.current = roomId;
  }, []);

  // Leave room
  const leaveRoom = useCallback(() => {
    if (!currentRoomRef.current || !socketRef.current?.connected) {
      return;
    }

    logger.info('Leaving room', { roomId: currentRoomRef.current });
    socketRef.current.emit('room:leave', { roomId: currentRoomRef.current });

    currentRoomRef.current = undefined;
  }, []);

  // Open document
  const openDocument = useCallback((documentId: string) => {
    if (!currentRoomRef.current || !socketRef.current?.connected) {
      logger.warn('Cannot open document: not in room or not connected');
      return;
    }

    socketRef.current.emit('doc:open', {
      roomId: currentRoomRef.current,
      documentId,
    });
  }, []);

  // Sync document
  const syncDocument = useCallback(() => {
    if (!currentRoomRef.current || !socketRef.current?.connected) {
      logger.warn('Cannot sync document: not in room or not connected');
      return;
    }

    socketRef.current.emit('doc:sync', {
      roomId: currentRoomRef.current,
    });
  }, []);

  // Send operation
  const sendOperation = useCallback((operation: Operation) => {
    if (!currentRoomRef.current || !socketRef.current?.connected) {
      logger.warn('Cannot send operation: not in room or not connected');
      return;
    }

    socketRef.current.emit('doc:operation', {
      roomId: currentRoomRef.current,
      operation,
    });

    // Optimistically apply operation locally
    setDocument(prev => {
      if (!prev) return null;
      const newContent = applyOperation(prev.content, operation);
      return { content: newContent, revision: prev.revision + 1 };
    });
  }, []);

  // Move cursor
  const moveCursor = useCallback((position: number, selection?: { start: number; end: number }) => {
    if (!currentRoomRef.current || !socketRef.current?.connected) {
      return;
    }

    socketRef.current.emit('cursor:move', {
      roomId: currentRoomRef.current,
      position,
      selection,
    });
  }, []);

  // Set typing status
  const setTyping = useCallback((isTyping: boolean) => {
    if (!currentRoomRef.current || !socketRef.current?.connected) {
      return;
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-clear typing status after 3 seconds
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('presence:typing', {
          roomId: currentRoomRef.current,
          isTyping: false,
        });
      }, 3000);
    }

    socketRef.current.emit('presence:typing', {
      roomId: currentRoomRef.current,
      isTyping,
    });
  }, []);

  // Event listener helpers
  const onDocumentUpdate = useCallback((callback: (doc: { content: string; revision: number }) => void) => {
    documentUpdateCallbacksRef.current.add(callback);
    return () => documentUpdateCallbacksRef.current.delete(callback);
  }, []);

  const onUserJoined = useCallback((callback: (user: RoomUser) => void) => {
    userJoinedCallbacksRef.current.add(callback);
    return () => userJoinedCallbacksRef.current.delete(callback);
  }, []);

  const onUserLeft = useCallback((callback: (userId: string) => void) => {
    userLeftCallbacksRef.current.add(callback);
    return () => userLeftCallbacksRef.current.delete(callback);
  }, []);

  const onCursorUpdate = useCallback((callback: (cursor: Cursor) => void) => {
    cursorUpdateCallbacksRef.current.add(callback);
    return () => cursorUpdateCallbacksRef.current.delete(callback);
  }, []);

  const onTypingUpdate = useCallback((callback: (userId: string, userName: string, isTyping: boolean) => void) => {
    typingUpdateCallbacksRef.current.add(callback);
    return () => typingUpdateCallbacksRef.current.delete(callback);
  }, []);

  const onError = useCallback((callback: (error: Error) => void) => {
    errorCallbackRef.current.add(callback);
    return () => errorCallbackRef.current.delete(callback);
  }, []);

  // Update connect ref
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Update refs
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    scheduleReconnectRef.current = scheduleReconnect;
  }, [scheduleReconnect]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connectRef.current?.();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, disconnect]);

  return {
    // State
    connectionState,
    error,
    isConnected,
    isInRoom,
    users,
    cursors,
    document,
    typingUsers,

    // Actions
    connect,
    disconnect,
    reconnect,
    joinRoom,
    leaveRoom,
    openDocument,
    syncDocument,
    sendOperation,
    moveCursor,
    setTyping,

    // Event listeners
    onDocumentUpdate,
    onUserJoined,
    onUserLeft,
    onCursorUpdate,
    onTypingUpdate,
    onError,
  };
}

export default useCollaboration;
