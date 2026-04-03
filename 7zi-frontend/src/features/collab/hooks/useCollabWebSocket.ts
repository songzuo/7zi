/**
 * useCollabWebSocket Hook
 *
 * React hook for real-time collaboration WebSocket connection
 * Connects to /api/collab/ws endpoint
 *
 * Features:
 * - Auto-reconnection with exponential backoff
 * - Heartbeat monitoring
 * - Message queue for offline resilience
 * - Cursor position broadcasting
 * - Presence management
 */

'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { WebSocketManager, ConnectionState } from '@/lib/websocket-manager'
import type {
  CollabMessage,
  CollabMessageType,
  CursorPosition,
  CollabUser,
  CollabConnectionInfo,
} from '../types'
import { logger } from '@/lib/logger'

/**
 * Hook options
 */
export interface UseCollabWebSocketOptions {
  /** WebSocket URL (defaults to /api/collab/ws) */
  wsUrl?: string
  /** Auto connect on mount */
  autoConnect?: boolean
  /** Heartbeat interval in ms (default: 30000) */
  heartbeatInterval?: number
  /** Heartbeat timeout in ms (default: 10000) */
  heartbeatTimeout?: number
  /** Reconnection delay base in ms (default: 1000) */
  reconnectionDelay?: number
  /** Max reconnection attempts (default: 10) */
  maxReconnectAttempts?: number
  /** Cursor throttle interval in ms (default: 50) */
  cursorThrottle?: number
  /** Enable debug logging */
  debug?: boolean
}

/**
 * Hook return value
 */
export interface UseCollabWebSocketReturn {
  // Connection state
  connectionInfo: CollabConnectionInfo
  isConnected: boolean
  isConnecting: boolean
  isReconnecting: boolean

  // WebSocket manager
  manager: WebSocketManager | null

  // Actions
  connect: () => void
  disconnect: () => void
  sendMessage: <T>(type: CollabMessageType, payload: T) => boolean
  sendCursorMove: (position: CursorPosition) => boolean
  sendPresenceUpdate: (userId: string, updates: Partial<CollabUser>) => boolean

  // Message listeners
  onMessage: (handler: (message: CollabMessage) => void) => () => void
  onCursorMove: (handler: (userId: string, position: CursorPosition) => void) => () => void
  onPresenceJoin: (handler: (user: CollabUser, sessionId: string) => void) => () => void
  onPresenceLeave: (handler: (userId: string) => void) => () => void
  onError: (handler: (error: Error) => void) => () => void
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<Omit<UseCollabWebSocketOptions, 'wsUrl'>> = {
  autoConnect: true,
  heartbeatInterval: 30000,
  heartbeatTimeout: 10000,
  reconnectionDelay: 1000,
  maxReconnectAttempts: 10,
  cursorThrottle: 50,
  debug: false,
}

/**
 * useCollabWebSocket Hook
 */
export function useCollabWebSocket(
  roomId: string,
  userId: string,
  userName: string,
  options: UseCollabWebSocketOptions = {}
): UseCollabWebSocketReturn {
  const {
    wsUrl = '/api/collab/ws',
    autoConnect,
    heartbeatInterval,
    heartbeatTimeout,
    reconnectionDelay,
    maxReconnectAttempts,
    cursorThrottle,
    debug,
  } = { ...DEFAULT_OPTIONS, ...options }

  // State
  const [connectionInfo, setConnectionInfo] = useState<CollabConnectionInfo>({
    state: 'disconnected',
    reconnectAttempts: 0,
  })

  // Refs
  const managerRef = useRef<WebSocketManager | null>(null)
  const messageHandlersRef = useRef<Set<(message: CollabMessage) => void>>(new Set())
  const cursorHandlersRef = useRef<Set<(userId: string, position: CursorPosition) => void>>(new Set())
  const presenceJoinHandlersRef = useRef<Set<(user: CollabUser, sessionId: string) => void>>(new Set())
  const presenceLeaveHandlersRef = useRef<Set<(userId: string) => void>>(new Set())
  const errorHandlersRef = useRef<Set<(error: Error) => void>>(new Set())
  const lastCursorTimeRef = useRef<number>(0)

  // Debug logging helper
  const log = useCallback(
    (level: 'info' | 'warn' | 'error', ...args: unknown[]) => {
      if (debug) {
        logger[level]('[useCollabWebSocket]', ...args)
      }
    },
    [debug]
  )

  // Initialize WebSocket manager
  useEffect(() => {
    const wsManager = new WebSocketManager({
      url: wsUrl,
      autoConnect: false,
      heartbeatInterval,
      heartbeatTimeout,
      reconnectionDelay,
      reconnectionAttempts: maxReconnectAttempts,
    })

    managerRef.current = wsManager

    // Connection state handler
    const handleStateChange = (state: ConnectionState) => {
      const stateMap: Record<ConnectionState, CollabConnectionInfo['state']> = {
        [ConnectionState.DISCONNECTED]: 'disconnected',
        [ConnectionState.CONNECTING]: 'connecting',
        [ConnectionState.CONNECTED]: 'connected',
        [ConnectionState.RECONNECTING]: 'reconnecting',
        [ConnectionState.ERROR]: 'error',
      }

      setConnectionInfo((prev) => ({
        ...prev,
        state: stateMap[state],
        connectedAt: state === ConnectionState.CONNECTED ? Date.now() : prev.connectedAt,
        reconnectAttempts:
          state === ConnectionState.RECONNECTING ? prev.reconnectAttempts + 1 : prev.reconnectAttempts,
      }))

      log('info', 'Connection state changed:', state)
    }

    // Message handler
    const handleMessage = (event: string, data: unknown) => {
      log('info', 'Received message:', event, data)

      try {
        const message = data as CollabMessage

        // Notify general message handlers
        messageHandlersRef.current.forEach((handler) => handler(message))

        // Route to specific handlers
        switch (message.type) {
          case 'cursor:move':
          case 'cursor:select':
            if (message.userId) {
              const position = (message.payload as { position: CursorPosition }).position
              cursorHandlersRef.current.forEach((handler) => handler(message.userId!, position))
            }
            break

          case 'presence:join':
            if (message.payload && typeof message.payload === 'object') {
              const { user, sessionId } = message.payload as { user: CollabUser; sessionId: string }
              presenceJoinHandlersRef.current.forEach((handler) => handler(user, sessionId))
            }
            break

          case 'presence:leave':
            if (message.userId) {
              presenceLeaveHandlersRef.current.forEach((handler) => handler(message.userId!))
            }
            break

          case 'error':
            const error = new Error((message.payload as { message?: string })?.message || 'Unknown error')
            errorHandlersRef.current.forEach((handler) => handler(error))
            break
        }
      } catch (err) {
        logger.error('[useCollabWebSocket] Failed to parse message:', err)
      }
    }

    wsManager.onStateChange(handleStateChange)
    wsManager.on('message', handleMessage)

    // Cleanup
    return () => {
      wsManager.offStateChange(handleStateChange)
      wsManager.off('message', handleMessage)
      wsManager.disconnect()
    }
  }, [
    wsUrl,
    heartbeatInterval,
    heartbeatTimeout,
    reconnectionDelay,
    maxReconnectAttempts,
    log,
    roomId,
  ])

  // Auto connect
  useEffect(() => {
    if (autoConnect && managerRef.current) {
      managerRef.current.connect()
    }
  }, [autoConnect, roomId, userId])

  // Connect action
  const connect = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.connect()
    }
  }, [])

  // Disconnect action
  const disconnect = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.disconnect()
    }
  }, [])

  // Send message
  const sendMessage = useCallback(<T,>(type: CollabMessageType, payload: T): boolean => {
    if (!managerRef.current) {
      log('warn', 'Cannot send message: manager not initialized')
      return false
    }

    const message: CollabMessage<T> = {
      type,
      payload,
      timestamp: Date.now(),
      userId,
      sessionId: roomId,
    }

    return managerRef.current.send('collab:message', message)
  }, [userId, roomId, log])

  // Send cursor move (throttled)
  const sendCursorMove = useCallback(
    (position: CursorPosition): boolean => {
      const now = Date.now()
      if (now - lastCursorTimeRef.current < cursorThrottle) {
        return false
      }
      lastCursorTimeRef.current = now

      return sendMessage<{ position: CursorPosition }>('cursor:move', { position })
    },
    [cursorThrottle, sendMessage]
  )

  // Send presence update
  const sendPresenceUpdate = useCallback(
    (updateUserId: string, updates: Partial<CollabUser>): boolean => {
      return sendMessage('presence:update', {
        userId: updateUserId,
        updates,
      })
    },
    [sendMessage]
  )

  // Message event listener
  const onMessage = useCallback((handler: (message: CollabMessage) => void) => {
    messageHandlersRef.current.add(handler)
    return () => {
      messageHandlersRef.current.delete(handler)
    }
  }, [])

  // Cursor move listener
  const onCursorMove = useCallback(
    (handler: (userId: string, position: CursorPosition) => void) => {
      cursorHandlersRef.current.add(handler)
      return () => {
        cursorHandlersRef.current.delete(handler)
      }
    },
    []
  )

  // Presence join listener
  const onPresenceJoin = useCallback(
    (handler: (user: CollabUser, sessionId: string) => void) => {
      presenceJoinHandlersRef.current.add(handler)
      return () => {
        presenceJoinHandlersRef.current.delete(handler)
      }
    },
    []
  )

  // Presence leave listener
  const onPresenceLeave = useCallback((handler: (userId: string) => void) => {
    presenceLeaveHandlersRef.current.add(handler)
    return () => {
      presenceLeaveHandlersRef.current.delete(handler)
    }
  }, [])

  // Error listener
  const onError = useCallback((handler: (error: Error) => void) => {
    errorHandlersRef.current.add(handler)
    return () => {
      errorHandlersRef.current.delete(handler)
    }
  }, [])

  return {
    // Connection state
    connectionInfo,
    isConnected: connectionInfo.state === 'connected',
    isConnecting: connectionInfo.state === 'connecting',
    isReconnecting: connectionInfo.state === 'reconnecting',

    // WebSocket manager
    manager: managerRef.current,

    // Actions
    connect,
    disconnect,
    sendMessage,
    sendCursorMove,
    sendPresenceUpdate,

    // Event listeners
    onMessage,
    onCursorMove,
    onPresenceJoin,
    onPresenceLeave,
    onError,
  }
}
