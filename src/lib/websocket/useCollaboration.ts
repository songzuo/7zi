/**
 * WebSocket Collaboration Hook
 *
 * React hook for real-time collaboration features
 * Provides connection management, room handling, and event listeners
 */

'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import type { Operation, Cursor } from '@/lib/collaboration/manager'
import { logger } from '@/lib/logger'

// ============================================================================
// Utility Functions
// ============================================================================

function applyOperation(content: string, operation: Operation): string {
  switch (operation.type) {
    case 'insert':
      if (operation.content !== undefined) {
        return (
          content.slice(0, operation.position) +
          operation.content +
          content.slice(operation.position)
        )
      }
      return content

    case 'delete':
      if (operation.length !== undefined) {
        return (
          content.slice(0, operation.position) +
          content.slice(operation.position + operation.length)
        )
      }
      return content

    case 'retain':
      return content

    default:
      return content
  }
}

/**
 * Generate cryptographically secure random jitter
 * Uses Web Crypto API for better randomness
 */
async function _generateSecureJitter(): Promise<number> {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(1)
    crypto.getRandomValues(array)
    // Return value between -0.2 and 0.2
    return (array[0] / 0xffffffff) * 0.4 - 0.2
  }
  // Fallback to Math.random()
  return Math.random() * 0.4 - 0.2
}

/**
 * Calculate dynamic heartbeat interval based on page visibility
 * Visible pages get shorter intervals for better responsiveness
 * Hidden pages get longer intervals to save resources
 */
function _getHeartbeatInterval(isPageVisible: boolean): number {
  // Visible: 25 seconds (default, good responsiveness)
  // Hidden: 60 seconds (resource saving)
  return isPageVisible ? 25000 : 60000
}

// ============================================================================
// Types
// ============================================================================

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

export type ReconnectionState =
  | 'idle' // 无需重连
  | 'scheduled' // 已安排重连
  | 'attempting' // 正在尝试连接
  | 'recovering' // 正在恢复状态

export type DisconnectReason =
  | 'io client disconnect' // 用户主动断开
  | 'io server disconnect' // 服务器断开
  | 'ping timeout' // 心跳超时
  | 'transport close' // 连接关闭
  | 'network_error' // 网络错误
  | 'auth_error' // 认证错误

export interface ConnectionContext {
  roomId?: string
  roomType?: 'task' | 'project' | 'chat' | 'document'
  documentId?: string
  roomName?: string
}

export interface ConnectionQualityMetrics {
  connectedAt?: number
  disconnectedAt?: number
  reconnectAttempts: number
  lastReconnectAt?: number
  avgReconnectDelay: number
  successfulConnections: number
  failedConnections: number
  totalDowntime: number
  isPageVisible: boolean
}

export interface RoomUser {
  id: string
  name: string
  email?: string
  avatar?: string
  color: string
  joinedAt: Date
  cursor?: {
    position: number
    selection?: { start: number; end: number }
  }
  isTyping: boolean
  lastActivity: Date
}

export interface CollaborationConfig {
  url: string
  token: string
  userId: string
  userName: string
  userAvatar?: string
  roomId?: string
  roomType?: 'task' | 'project' | 'chat' | 'document'
  documentId?: string
  autoConnect?: boolean
  autoReconnect?: boolean
}

export interface CollaborationState {
  connectionState: ConnectionState
  reconnectionState: ReconnectionState
  error: Error | null
  isConnected: boolean
  isInRoom: boolean
  users: RoomUser[]
  cursors: Map<string, Cursor>
  document: {
    content: string
    revision: number
  } | null
  typingUsers: string[]
  reconnectAttempts: number
  connectionQuality: ConnectionQualityMetrics
}

export interface CollaborationActions {
  connect: () => void
  disconnect: () => void
  reconnect: () => void

  // Room actions
  joinRoom: (
    roomId: string,
    type: CollaborationConfig['roomType'],
    documentId: string,
    name?: string
  ) => void
  leaveRoom: () => void

  // Document actions
  openDocument: (documentId: string) => void
  syncDocument: () => void
  sendOperation: (operation: Operation) => void

  // Cursor actions
  moveCursor: (position: number, selection?: { start: number; end: number }) => void

  // Presence actions
  setTyping: (isTyping: boolean) => void

  // Event listeners
  onDocumentUpdate: (
    callback: (document: { content: string; revision: number }) => void
  ) => () => void
  onUserJoined: (callback: (user: RoomUser) => void) => () => void
  onUserLeft: (callback: (userId: string) => void) => () => void
  onCursorUpdate: (callback: (cursor: Cursor) => void) => () => void
  onTypingUpdate: (
    callback: (userId: string, userName: string, isTyping: boolean) => void
  ) => () => void
  onError: (callback: (error: Error) => void) => () => void
  onReconnection: (callback: (state: ReconnectionState, attempt: number) => void) => () => void
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useCollaboration(
  config: CollaborationConfig
): CollaborationState & CollaborationActions {
  const {
    url,
    token,
    userId,
    userName,
    userAvatar: _userAvatar,
    roomId: initialRoomId,
    roomType,
    documentId: initialDocumentId,
    autoConnect = true,
    autoReconnect = true,
  } = config

  // State
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [reconnectionState, setReconnectionState] = useState<ReconnectionState>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isInRoom, setIsInRoom] = useState(false)
  const [_currentRoomId, setCurrentRoomId] = useState<string | undefined>(initialRoomId)
  const [users, setUsers] = useState<RoomUser[]>([])
  const [cursors, setCursors] = useState<Map<string, Cursor>>(new Map())
  const [document, setDocument] = useState<{ content: string; revision: number } | null>(null)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [connectionQuality, _setConnectionQuality] = useState<ConnectionQualityMetrics>({
    reconnectAttempts: 0,
    avgReconnectDelay: 0,
    successfulConnections: 0,
    failedConnections: 0,
    totalDowntime: 0,
    isPageVisible: true,
  })

  // Refs
  const socketRef = useRef<Socket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const currentRoomRef = useRef<string | undefined>(initialRoomId)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isReconnectingRef = useRef(false)
  const connectionContextRef = useRef<ConnectionContext>({})
  const reconnectionStateRef = useRef<ReconnectionState>('idle')

  // Event listener refs
  const documentUpdateCallbacksRef = useRef<
    Set<(doc: { content: string; revision: number }) => void>
  >(new Set())
  const userJoinedCallbacksRef = useRef<Set<(user: RoomUser) => void>>(new Set())
  const userLeftCallbacksRef = useRef<Set<(userId: string) => void>>(new Set())
  const cursorUpdateCallbacksRef = useRef<Set<(cursor: Cursor) => void>>(new Set())
  const typingUpdateCallbacksRef = useRef<
    Set<(userId: string, userName: string, isTyping: boolean) => void>
  >(new Set())
  const errorCallbackRef = useRef<Set<(error: Error) => void>>(new Set())
  const reconnectionCallbacksRef = useRef<Set<(state: ReconnectionState, attempt: number) => void>>(
    new Set()
  )
  const connectRef = useRef<(() => void) | null>(null)
  const scheduleReconnectRef = useRef<((reason?: DisconnectReason) => void) | null>(null)
  const recoverConnectionStateRef = useRef<(() => void) | null>(null)

  // Update connection state
  const updateState = useCallback((newState: ConnectionState) => {
    setConnectionState(newState)
    setIsConnected(newState === 'connected')
  }, [])

  // Update reconnection state
  const updateReconnectionState = useCallback((newState: ReconnectionState) => {
    setReconnectionState(newState)
    reconnectionStateRef.current = newState
    setReconnectAttempts(reconnectAttemptsRef.current)
    reconnectionCallbacksRef.current.forEach(cb => cb(newState, reconnectAttemptsRef.current))
  }, [])

  // Get reconnection strategy based on disconnect reason
  const getReconnectStrategy = useCallback((reason: DisconnectReason) => {
    switch (reason) {
      case 'io client disconnect':
        return { shouldReconnect: false, initialDelay: 0, maxAttempts: 0, backoffMultiplier: 0 }
      case 'auth_error':
        return { shouldReconnect: false, initialDelay: 0, maxAttempts: 0, backoffMultiplier: 0 }
      case 'ping timeout':
        return { shouldReconnect: true, initialDelay: 2000, maxAttempts: 5, backoffMultiplier: 1.5 }
      case 'io server disconnect':
        return { shouldReconnect: true, initialDelay: 3000, maxAttempts: 8, backoffMultiplier: 1.5 }
      default:
        return {
          shouldReconnect: true,
          initialDelay: 1000,
          maxAttempts: 10,
          backoffMultiplier: 1.5,
        }
    }
  }, [])

  // Recover connection state after reconnection
  const recoverConnectionState = useCallback(() => {
    const context = connectionContextRef.current

    if (!context.roomId || !socketRef.current?.connected) {
      logger.debug('Cannot recover state: no context or not connected')
      return
    }

    logger.info('Recovering connection state', { context })
    updateReconnectionState('recovering')

    // Re-join room
    socketRef.current.emit('room:join', {
      roomId: context.roomId,
      type: context.roomType || 'document',
      documentId: context.documentId,
      name: context.roomName,
    })
  }, [updateReconnectionState])

  // Schedule reconnect with improved logic
  const scheduleReconnect = useCallback(
    (reason: DisconnectReason = 'network_error') => {
      // Prevent duplicate reconnection attempts
      if (isReconnectingRef.current || reconnectionStateRef.current === 'attempting') {
        logger.debug('Reconnect already in progress, skipping', {
          state: reconnectionStateRef.current,
          reason,
        })
        return
      }

      const strategy = getReconnectStrategy(reason)

      if (!strategy.shouldReconnect) {
        logger.info('Reconnect disabled for this reason', { reason })
        updateReconnectionState('idle')
        updateState('error')
        return
      }

      // Clear existing timeout if any
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }

      isReconnectingRef.current = true
      reconnectionStateRef.current = 'scheduled'

      reconnectAttemptsRef.current++
      updateReconnectionState('scheduled')

      // Check max attempts
      if (reconnectAttemptsRef.current > strategy.maxAttempts) {
        const error = new Error(
          `Max reconnection attempts (${strategy.maxAttempts}) reached for reason: ${reason}`
        )
        setError(error)
        updateState('error')
        updateReconnectionState('idle')
        isReconnectingRef.current = false
        logger.error('Max reconnection attempts reached', {
          attempts: reconnectAttemptsRef.current,
          reason,
        })
        return
      }

      updateState('reconnecting')

      // Calculate delay with exponential backoff
      const delay = Math.min(
        strategy.initialDelay *
          Math.pow(strategy.backoffMultiplier, reconnectAttemptsRef.current - 1),
        30000 // Cap at 30 seconds
      )

      // Add jitter (±20%) to prevent thundering herd
      const jitter = delay * 0.2 * (Math.random() * 2 - 1)
      const finalDelay = Math.max(500, delay + jitter)

      logger.info(`Reconnecting in ${finalDelay}ms`, {
        attempt: reconnectAttemptsRef.current,
        maxAttempts: strategy.maxAttempts,
        reason,
      })

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectionStateRef.current = 'attempting'
        updateReconnectionState('attempting')
        connectRef.current?.()
      }, finalDelay)
    },
    [getReconnectStrategy, updateState, updateReconnectionState]
  )

  // Create socket connection
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      logger.warn('WebSocket already connected')
      return
    }

    updateState('connecting')
    setError(null)

    try {
      const socket = io(url, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: false, // We handle reconnection manually
        timeout: 10000,
      })

      socketRef.current = socket

      // Connection established
      socket.on('connect', () => {
        logger.info('WebSocket connected', {
          userId,
          userName,
          isReconnect: reconnectAttemptsRef.current > 0,
        })
        updateState('connected')

        // If this is a reconnection, reset state
        if (reconnectAttemptsRef.current > 0) {
          isReconnectingRef.current = false
          reconnectAttemptsRef.current = 0
          updateReconnectionState('idle')

          // Try to recover previous state
          recoverConnectionStateRef.current?.()
        } else {
          // Initial connection: auto-join room if configured
          if (currentRoomRef.current && roomType && initialDocumentId) {
            socket.emit('room:join', {
              roomId: currentRoomRef.current,
              type: roomType,
              documentId: initialDocumentId,
            })
          }
        }
      })

      // Authentication successful
      socket.on('auth:authenticated', data => {
        logger.info('Authenticated', { data })
      })

      // Authentication failed
      socket.on('auth:unauthorized', data => {
        const error = new Error(data.reason || 'Unauthorized')
        setError(error)
        updateState('error')
        socket.disconnect()
      })

      // Room joined
      socket.on('room:joined', data => {
        logger.info('Room joined', { roomId: data.roomId })
        setIsInRoom(true)
        setCurrentRoomId(data.roomId)
        currentRoomRef.current = data.roomId
        setUsers(data.users)
        setDocument(data.document)
      })

      // Room left
      socket.on('room:left', data => {
        logger.info('Room left', { roomId: data.roomId })
        setIsInRoom(false)
        setCurrentRoomId(undefined)
        currentRoomRef.current = undefined
        setUsers([])
        setDocument(null)
      })

      // User joined room
      socket.on('room:user_joined', data => {
        logger.debug('User joined room', { data })
        setUsers(prev => [...prev, data.user])
        userJoinedCallbacksRef.current.forEach(cb => cb(data.user))
      })

      // User left room
      socket.on('room:user_left', data => {
        logger.debug('User left room', { data })
        setUsers(prev => prev.filter(u => u.id !== data.userId))
        setCursors(prev => {
          const next = new Map(prev)
          next.delete(data.userId)
          return next
        })
        setTypingUsers(prev => prev.filter(id => id !== data.userId))
        userLeftCallbacksRef.current.forEach(cb => cb(data.userId))
      })

      // User list updated
      socket.on('room:user_list', data => {
        setUsers(data.users)
      })

      // Document opened
      socket.on('doc:opened', data => {
        setDocument(data.document)
      })

      // Document synced
      socket.on('doc:sync', data => {
        setDocument(data.document)
        documentUpdateCallbacksRef.current.forEach(cb => cb(data.document))
      })

      // Document operation applied
      socket.on('doc:operation_applied', data => {
        logger.debug('Document operation applied', { data })
        if (document && data.revision > document.revision) {
          setDocument(prev => {
            if (!prev) return { content: '', revision: data.revision }
            // Apply operation to local content
            const newContent = applyOperation(prev.content, data.operation)
            return { content: newContent, revision: data.revision }
          })
          documentUpdateCallbacksRef.current.forEach(cb =>
            cb({
              content: document.content,
              revision: data.revision,
            })
          )
        }
      })

      // Cursor updated
      socket.on('cursor:update', data => {
        logger.debug('Cursor updated', { data })
        setCursors(prev => {
          const next = new Map(prev)
          next.set(data.userId, {
            userId: data.userId,
            userName: data.userName,
            color: data.color,
            position: data.position,
            selection: data.selection,
          })
          return next
        })
        cursorUpdateCallbacksRef.current.forEach(cb =>
          cb({
            userId: data.userId,
            userName: data.userName,
            color: data.color,
            position: data.position,
            selection: data.selection,
          })
        )
      })

      // Selection updated
      socket.on('selection:update', data => {
        logger.debug('Selection updated', { data })
        setCursors(prev => {
          const next = new Map(prev)
          const existing = next.get(data.userId)
          next.set(data.userId, {
            userId: data.userId,
            userName: data.userName,
            color: data.color,
            position: existing?.position || 0,
            selection: data.selection,
          })
          return next
        })
        cursorUpdateCallbacksRef.current.forEach(cb =>
          cb({
            userId: data.userId,
            userName: data.userName,
            color: data.color,
            position: cursors.get(data.userId)?.position || 0,
            selection: data.selection,
          })
        )
      })

      // Typing status updated
      socket.on('presence:typing', data => {
        logger.debug('Typing status updated', { data })
        setTypingUsers(prev => {
          if (data.isTyping) {
            return [...prev.filter(id => id !== data.userId), data.userId]
          } else {
            return prev.filter(id => id !== data.userId)
          }
        })
        typingUpdateCallbacksRef.current.forEach(cb =>
          cb(data.userId, data.userName, data.isTyping)
        )
      })

      // System error
      socket.on('system:error', data => {
        const error = new Error(data.message || 'Unknown error')
        setError(error)
        errorCallbackRef.current.forEach(cb => cb(error))
      })

      // Disconnect
      socket.on('disconnect', reason => {
        logger.info('WebSocket disconnected', {
          socketId: socket.id,
          userId,
          userName,
          reason,
          isInRoom,
        })

        // Save connection context for recovery
        if (isInRoom && currentRoomRef.current) {
          connectionContextRef.current = {
            roomId: currentRoomRef.current,
            roomType,
            documentId: initialDocumentId,
          }
          logger.info('Connection context saved for recovery', {
            context: connectionContextRef.current,
          })
        }

        updateState('disconnected')
        updateReconnectionState('idle')

        // Auto-reconnect if enabled and not user-initiated
        if (autoReconnect && reason !== 'io client disconnect') {
          scheduleReconnectRef.current?.(reason as DisconnectReason)
        }
      })

      // Connection error
      socket.on('connect_error', err => {
        logger.error('WebSocket connection error', { error: err })
        const error = new Error(err.message || 'Connection error')
        setError(error)

        // If connection failed during reconnection, schedule another attempt
        if (reconnectionStateRef.current === 'attempting') {
          isReconnectingRef.current = false
          if (autoReconnect) {
            scheduleReconnectRef.current?.('network_error')
          }
        } else {
          updateState('error')
          if (autoReconnect) {
            scheduleReconnectRef.current?.('network_error')
          }
        }
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      updateState('error')
      logger.error('Failed to create WebSocket connection', { error })
    }
  }, [url, token, userId, userName, roomType, initialDocumentId, autoReconnect, updateState]) // eslint-disable-line react-hooks/exhaustive-deps

  // Disconnect
  const disconnect = useCallback(() => {
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }

    // Clear reconnect state
    isReconnectingRef.current = false
    updateReconnectionState('idle')

    // Disconnect socket and clear references
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }

    // Clear all event handlers to prevent memory leaks
    documentUpdateCallbacksRef.current.clear()
    userJoinedCallbacksRef.current.clear()
    userLeftCallbacksRef.current.clear()
    cursorUpdateCallbacksRef.current.clear()
    typingUpdateCallbacksRef.current.clear()
    errorCallbackRef.current.clear()
    reconnectionCallbacksRef.current.clear()

    // Reset all refs
    currentRoomRef.current = undefined
    connectionContextRef.current = {}

    // Update state
    updateState('disconnected')
    setIsInRoom(false)
    setCurrentRoomId(undefined)
    setUsers([])
    setCursors(new Map())
    setDocument(null)
    setTypingUsers([])
    reconnectAttemptsRef.current = 0
    setReconnectAttempts(0)
  }, [updateState, updateReconnectionState])

  // Manual reconnect
  const reconnect = useCallback(() => {
    disconnect()
    setTimeout(() => {
      reconnectAttemptsRef.current = 0
      isReconnectingRef.current = false
      connectionContextRef.current = {
        roomId: currentRoomRef.current,
        roomType,
        documentId: initialDocumentId,
      }
      connectRef.current?.()
    }, 100)
  }, [disconnect, roomType, initialDocumentId])

  // Join room
  const joinRoom = useCallback(
    (roomId: string, type: CollaborationConfig['roomType'], docId: string, name?: string) => {
      if (!socketRef.current?.connected) {
        logger.warn('Cannot join room: not connected')
        return
      }

      logger.info('Joining room', { roomId, type, documentId: docId })
      socketRef.current.emit('room:join', {
        roomId,
        type,
        documentId: docId,
        name,
      })

      currentRoomRef.current = roomId
    },
    []
  )

  // Leave room
  const leaveRoom = useCallback(() => {
    if (!currentRoomRef.current || !socketRef.current?.connected) {
      return
    }

    logger.info('Leaving room', { roomId: currentRoomRef.current })
    socketRef.current.emit('room:leave', { roomId: currentRoomRef.current })

    currentRoomRef.current = undefined
  }, [])

  // Open document
  const openDocument = useCallback((documentId: string) => {
    if (!currentRoomRef.current || !socketRef.current?.connected) {
      logger.warn('Cannot open document: not in room or not connected')
      return
    }

    socketRef.current.emit('doc:open', {
      roomId: currentRoomRef.current,
      documentId,
    })
  }, [])

  // Sync document
  const syncDocument = useCallback(() => {
    if (!currentRoomRef.current || !socketRef.current?.connected) {
      logger.warn('Cannot sync document: not in room or not connected')
      return
    }

    socketRef.current.emit('doc:sync', {
      roomId: currentRoomRef.current,
    })
  }, [])

  // Send operation
  const sendOperation = useCallback((operation: Operation) => {
    if (!currentRoomRef.current || !socketRef.current?.connected) {
      logger.warn('Cannot send operation: not in room or not connected')
      return
    }

    socketRef.current.emit('doc:operation', {
      roomId: currentRoomRef.current,
      operation,
    })

    // Optimistically apply operation locally
    setDocument(prev => {
      if (!prev) return null
      const newContent = applyOperation(prev.content, operation)
      return { content: newContent, revision: prev.revision + 1 }
    })
  }, [])

  // Move cursor
  const moveCursor = useCallback((position: number, selection?: { start: number; end: number }) => {
    if (!currentRoomRef.current || !socketRef.current?.connected) {
      return
    }

    socketRef.current.emit('cursor:move', {
      roomId: currentRoomRef.current,
      position,
      selection,
    })
  }, [])

  // Set typing status
  const setTyping = useCallback((isTyping: boolean) => {
    if (!currentRoomRef.current || !socketRef.current?.connected) {
      return
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Auto-clear typing status after 3 seconds
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('presence:typing', {
          roomId: currentRoomRef.current,
          isTyping: false,
        })
      }, 3000)
    }

    socketRef.current.emit('presence:typing', {
      roomId: currentRoomRef.current,
      isTyping,
    })
  }, [])

  // Event listener helpers
  const onDocumentUpdate = useCallback(
    (callback: (doc: { content: string; revision: number }) => void) => {
      documentUpdateCallbacksRef.current.add(callback)
      return () => documentUpdateCallbacksRef.current.delete(callback)
    },
    []
  )

  const onUserJoined = useCallback((callback: (user: RoomUser) => void) => {
    userJoinedCallbacksRef.current.add(callback)
    return () => userJoinedCallbacksRef.current.delete(callback)
  }, [])

  const onUserLeft = useCallback((callback: (userId: string) => void) => {
    userLeftCallbacksRef.current.add(callback)
    return () => userLeftCallbacksRef.current.delete(callback)
  }, [])

  const onCursorUpdate = useCallback((callback: (cursor: Cursor) => void) => {
    cursorUpdateCallbacksRef.current.add(callback)
    return () => cursorUpdateCallbacksRef.current.delete(callback)
  }, [])

  const onTypingUpdate = useCallback(
    (callback: (userId: string, userName: string, isTyping: boolean) => void) => {
      typingUpdateCallbacksRef.current.add(callback)
      return () => typingUpdateCallbacksRef.current.delete(callback)
    },
    []
  )

  const onError = useCallback((callback: (error: Error) => void) => {
    errorCallbackRef.current.add(callback)
    return () => errorCallbackRef.current.delete(callback)
  }, [])

  const onReconnection = useCallback(
    (callback: (state: ReconnectionState, attempt: number) => void) => {
      reconnectionCallbacksRef.current.add(callback)
      return () => reconnectionCallbacksRef.current.delete(callback)
    },
    []
  )

  // Update refs
  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    scheduleReconnectRef.current = scheduleReconnect
  }, [scheduleReconnect])

  useEffect(() => {
    recoverConnectionStateRef.current = recoverConnectionState
  }, [recoverConnectionState])

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connectRef.current?.()
    }

    return () => {
      disconnect()
    }
  }, [autoConnect, disconnect])

  return {
    // State
    connectionState,
    reconnectionState,
    error,
    isConnected,
    isInRoom,
    users,
    cursors,
    document,
    typingUsers,
    reconnectAttempts,
    connectionQuality,

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
    onReconnection,
  }
}

export default useCollaboration
