/**
 * useRoomWebSocket Hook
 *
 * React hook for managing WebSocket room connections and real-time updates
 * Integrates RoomManager with WebSocketManager for seamless room collaboration
 *
 * Features:
 * - Auto-connect to room on mount
 * - Real-time member presence
 * - Message send/receive
 * - Room state synchronization
 * - Auto-reconnection
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { WebSocketManager, ConnectionState } from '@/lib/websocket-manager';
import { useRoomStore } from '@/stores/room-store';
import { logger } from '@/lib/logger';

/**
 * Room WebSocket events
 */
export type RoomWebSocketEvent =
  | 'member_joined'
  | 'member_left'
  | 'member_online'
  | 'member_offline'
  | 'room_updated'
  | 'room_deleted'
  | 'message_received'
  | 'message_sent'
  | 'error';

/**
 * Room WebSocket event data
 */
export interface RoomWebSocketEventData {
  roomId: string;
  timestamp: number;
  data: unknown;
}

/**
 * Hook options
 */
export interface UseRoomWebSocketOptions {
  autoConnect?: boolean;
  autoReconnect?: boolean;
  heartbeatInterval?: number;
}

/**
 * Hook return value
 */
export interface UseRoomWebSocketReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  connectionState: ConnectionState;

  // Manager
  manager: WebSocketManager | null;

  // Actions
  connect: () => void;
  disconnect: () => void;
  sendMessage: (event: string, data: unknown) => boolean;

  // Room-specific
  joinRoom: (roomId: string, password?: string) => void;
  leaveRoom: (roomId: string) => void;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<UseRoomWebSocketOptions> = {
  autoConnect: true,
  autoReconnect: true,
  heartbeatInterval: 25000,
};

/**
 * useRoomWebSocket Hook
 *
 * @param wsUrl - WebSocket server URL
 * @param options - Hook options
 */
export function useRoomWebSocket(
  wsUrl: string,
  options: UseRoomWebSocketOptions = {}
): UseRoomWebSocketReturn {
  const { autoConnect, autoReconnect, heartbeatInterval } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  // Store state
  const currentRoom = useRoomStore((state) => state.currentRoom);
  const currentUserId = useRoomStore((state) => state.currentUserId);
  const addMessage = useRoomStore((state) => state.addMessage);
  const addMember = useRoomStore((state) => state.addMember);
  const removeMember = useRoomStore((state) => state.removeMember);
  const updateMember = useRoomStore((state) => state.updateMember);
  const updateRoom = useRoomStore((state) => state.updateRoom);

  // WebSocket manager ref (stable)
  const managerRef = useRef<WebSocketManager | null>(null);

  /**
   * Initialize WebSocket manager
   */
  useEffect(() => {
    if (managerRef.current) return;

    managerRef.current = new WebSocketManager({
      url: wsUrl,
      autoConnect: false, // Manual connect
      transports: ['websocket', 'polling'],
      heartbeatInterval,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      reconnectionAttempts: autoReconnect ? Infinity : 5,
    });

    logger.info('[useRoomWebSocket] WebSocket manager initialized');

    // Cleanup on unmount
    return () => {
      if (managerRef.current) {
        managerRef.current.disconnect();
        managerRef.current = null;
        logger.info('[useRoomWebSocket] WebSocket manager cleaned up');
      }
    };
  }, [wsUrl, heartbeatInterval, autoReconnect]);

  /**
   * Set up event listeners
   */
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;

    // Member joined
    manager.on('room:member:joined', (event, data) => {
      const eventData = data as RoomWebSocketEventData;
      if (eventData.data && typeof eventData.data === 'object') {
        const member = (eventData.data as { member: unknown }).member;
        if (member && typeof member === 'object') {
          addMember(eventData.roomId, member as any);
          logger.info('[useRoomWebSocket] Member joined:', eventData.roomId);
        }
      }
    });

    // Member left
    manager.on('room:member:left', (event, data) => {
      const eventData = data as RoomWebSocketEventData;
      if (eventData.data && typeof eventData.data === 'object') {
        const memberId = (eventData.data as { memberId: unknown }).memberId;
        if (memberId && typeof memberId === 'string') {
          removeMember(eventData.roomId, memberId);
          logger.info('[useRoomWebSocket] Member left:', eventData.roomId, memberId);
        }
      }
    });

    // Member online/offline
    manager.on('room:member:status', (event, data) => {
      const eventData = data as RoomWebSocketEventData;
      if (eventData.data && typeof eventData.data === 'object') {
        const statusData = eventData.data as { memberId: string; isOnline: boolean };
        updateMember(eventData.roomId, statusData.memberId, { isOnline: statusData.isOnline });
      }
    });

    // Room updated
    manager.on('room:updated', (event, data) => {
      const eventData = data as RoomWebSocketEventData;
      if (eventData.data && typeof eventData.data === 'object') {
        updateRoom(eventData.roomId, eventData.data as any);
        logger.info('[useRoomWebSocket] Room updated:', eventData.roomId);
      }
    });

    // Room deleted
    manager.on('room:deleted', (event, data) => {
      const eventData = data as RoomWebSocketEventData;
      useRoomStore.getState().removeRoom(eventData.roomId);
      logger.info('[useRoomWebSocket] Room deleted:', eventData.roomId);
    });

    // Message received
    manager.on('room:message', (event, data) => {
      const eventData = data as RoomWebSocketEventData;
      if (eventData.data && typeof eventData.data === 'object') {
        addMessage(eventData.roomId, eventData.data as any);
        logger.info('[useRoomWebSocket] Message received:', eventData.roomId);
      }
    });

    // Error handling
    manager.on('room:error', (event, data) => {
      const eventData = data as RoomWebSocketEventData;
      logger.error('[useRoomWebSocket] Room error:', eventData);
    });

    return () => {
      // Cleanup event listeners
      manager.off('room:member:joined', () => {});
      manager.off('room:member:left', () => {});
      manager.off('room:member:status', () => {});
      manager.off('room:updated', () => {});
      manager.off('room:deleted', () => {});
      manager.off('room:message', () => {});
      manager.off('room:error', () => {});
    };
  }, [addMember, removeMember, updateMember, updateRoom, addMessage]);

  /**
   * Auto-connect when current room changes
   */
  useEffect(() => {
    if (!autoConnect) return;

    const manager = managerRef.current;
    if (!manager) return;

    // If we have a room and user, connect/join
    if (currentRoom && currentUserId) {
      // Ensure connected
      if (!manager.isConnected()) {
        manager.connect();
      }
    } else {
      // If no room, disconnect
      manager.disconnect();
    }
  }, [currentRoom?.id, currentUserId, autoConnect]);

  /**
   * Connect action
   */
  const connect = useCallback(() => {
    managerRef.current?.connect();
  }, []);

  /**
   * Disconnect action
   */
  const disconnect = useCallback(() => {
    managerRef.current?.disconnect();
  }, []);

  /**
   * Send message action
   */
  const sendMessage = useCallback((event: string, data: unknown) => {
    return managerRef.current?.emit(event, data, true) ?? false;
  }, []);

  /**
   * Join room action
   */
  const joinRoom = useCallback((roomId: string, password?: string) => {
    managerRef.current?.emit('room:join', { roomId, password }, true);
  }, []);

  /**
   * Leave room action
   */
  const leaveRoom = useCallback((roomId: string) => {
    managerRef.current?.emit('room:leave', { roomId }, true);
  }, []);

  const manager = managerRef.current;
  const connectionState = manager?.getState() ?? ConnectionState.DISCONNECTED;

  return {
    // Connection state
    isConnected: connectionState === ConnectionState.CONNECTED,
    isConnecting: connectionState === ConnectionState.CONNECTING,
    isReconnecting: connectionState === ConnectionState.RECONNECTING,
    connectionState,

    // Manager
    manager,

    // Actions
    connect,
    disconnect,
    sendMessage,

    // Room-specific
    joinRoom,
    leaveRoom,
  };
}

export default useRoomWebSocket;
