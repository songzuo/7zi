/**
 * useCollaboration - React Hook for Real-time Collaboration
 *
 * Provides a simple React interface for collaboration features:
 * - Cursor tracking and synchronization
 * - Online user management
 * - Node locking/unlocking
 * - Change application
 * - Conflict resolution
 *
 * @version 1.12.3
 */

'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { CursorPosition, CursorState, CollabUser } from '@/features/collab/types'
import { CollaborationCursorSync, type CursorSyncState } from '@/lib/collab/cursor-sync'
import { CollaborationStateManager, type CollabSessionState, type Change } from '@/lib/collab/state-manager'
import { ConflictResolver, type ResolutionResult } from '@/lib/collab/conflict-resolver'
import { CollabClient } from '@/lib/collab/CollabClient'

/**
 * Hook return type
 */
export interface UseCollaborationReturn {
  // Cursor state
  cursors: Map<string, CursorState>
  localCursor: CursorPosition | null

  // User state
  onlineUsers: CollabUser[]

  // Lock state
  lockedNodes: Map<string, { userId: string; userName: string; expiresAt: number }>

  // Connection state
  isConnected: boolean

  // Actions
  updateCursor: (position: CursorPosition) => void
  lockNode: (nodeId: string, priority?: 'high' | 'normal') => Promise<boolean>
  unlockNode: (nodeId: string) => Promise<void>
  applyChange: (change: Omit<Change, 'id' | 'timestamp'>) => Promise<void>

  // Conflict resolution
  resolveConflict: (conflictId: string, resolution: 'accept_local' | 'accept_remote' | 'merge') => boolean

  // Session state
  sessionState: CollabSessionState | null

  // Connection info
  connect: () => void
  disconnect: () => void
}

/**
 * Hook options
 */
export interface UseCollaborationOptions {
  /** WebSocket URL */
  wsUrl?: string
  /** Auto connect on mount (default: true) */
  autoConnect?: boolean
  /** Cursor throttle in ms (default: 50) */
  cursorThrottle?: number
  /** Lock timeout in ms (default: 30000) */
  lockTimeout?: number
  /** Conflict resolution strategy (default: last-write-wins) */
  conflictStrategy?: 'last-write-wins' | 'operational-transform' | 'manual'
  /** Enable debug logging */
  debug?: boolean
}

/**
 * useCollaboration hook
 */
export function useCollaboration(
  workflowId: string,
  currentUser: CollabUser,
  options: UseCollaborationOptions = {}
): UseCollaborationReturn {
  const {
    wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
    autoConnect = true,
    cursorThrottle = 50,
    lockTimeout = 30000,
    conflictStrategy = 'last-write-wins',
    debug = false,
  } = options

  // Refs for instances
  const cursorSyncRef = useRef<CollaborationCursorSync | null>(null)
  const stateManagerRef = useRef<CollaborationStateManager | null>(null)
  const conflictResolverRef = useRef<ConflictResolver | null>(null)
  const collabClientRef = useRef<CollabClient | null>(null)

  // State
  const [cursors, setCursors] = useState<Map<string, CursorState>>(new Map())
  const [localCursor, setLocalCursor] = useState<CursorPosition | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<CollabUser[]>([])
  const [lockedNodes, setLockedNodes] = useState<
    Map<string, { userId: string; userName: string; expiresAt: number }>
  >(new Map())
  const [isConnected, setIsConnected] = useState(false)
  const [sessionState, setSessionState] = useState<CollabSessionState | null>(null)

  // Initialize instances
  useEffect(() => {
    // Create cursor sync
    cursorSyncRef.current = new CollaborationCursorSync(currentUser, {
      throttleMs: cursorThrottle,
      debug,
    })

    // Create state manager
    stateManagerRef.current = new CollaborationStateManager(workflowId, currentUser, {
      lockTimeout,
      debug,
    })

    // Create conflict resolver
    conflictResolverRef.current = new ConflictResolver({
      defaultStrategy: conflictStrategy,
      debug,
    })

    // Create collab client
    collabClientRef.current = new CollabClient({
      wsUrl,
      roomId: workflowId,
      user: currentUser,
      autoConnect: false,
      cursorThrottle,
      lockTimeout,
      debug,
    })

    // Set up cursor sync with collab client
    cursorSyncRef.current.startTracking((position) => {
      return collabClientRef.current?.sendCursorMove(position) ?? false
    })

    // Subscribe to cursor sync events
    const unsubscribeCursorAdded = cursorSyncRef.current.on('cursor:added', (event) => {
      setCursors((prev) => new Map(prev).set(event.userId, event.cursor!))
    })

    const unsubscribeCursorUpdated = cursorSyncRef.current.on('cursor:updated', (event) => {
      setCursors((prev) => new Map(prev).set(event.userId, event.cursor!))
    })

    const unsubscribeCursorRemoved = cursorSyncRef.current.on('cursor:removed', (event) => {
      setCursors((prev) => {
        const next = new Map(prev)
        next.delete(event.userId)
        return next
      })
    })

    // Subscribe to state manager events
    const unsubscribeUserJoined = stateManagerRef.current.on('user:joined', () => {
      setOnlineUsers(stateManagerRef.current!.getOnlineUsers())
    })

    const unsubscribeUserLeft = stateManagerRef.current.on('user:left', () => {
      setOnlineUsers(stateManagerRef.current!.getOnlineUsers())
    })

    const unsubscribeLockAcquired = stateManagerRef.current.on('lock:acquired', () => {
      setLockedNodes(
        new Map(
          Array.from(stateManagerRef.current!.getLockedNodes().entries()).map(([nodeId, lock]) => [
            nodeId,
            { userId: lock.userId, userName: lock.userName, expiresAt: lock.expiresAt },
          ])
        )
      )
    })

    const unsubscribeLockReleased = stateManagerRef.current.on('lock:released', () => {
      setLockedNodes(
        new Map(
          Array.from(stateManagerRef.current!.getLockedNodes().entries()).map(([nodeId, lock]) => [
            nodeId,
            { userId: lock.userId, userName: lock.userName, expiresAt: lock.expiresAt },
          ])
        )
      )
    })

    const unsubscribeLockExpired = stateManagerRef.current.on('lock:expired', () => {
      setLockedNodes(
        new Map(
          Array.from(stateManagerRef.current!.getLockedNodes().entries()).map(([nodeId, lock]) => [
            nodeId,
            { userId: lock.userId, userName: lock.userName, expiresAt: lock.expiresAt },
          ])
        )
      )
    })

    // Subscribe to collab client events
    const unsubscribeConnected = collabClientRef.current.on('connected', () => {
      setIsConnected(true)
      stateManagerRef.current?.setConnectionState(true)
    })

    const unsubscribeDisconnected = collabClientRef.current.on('disconnected', () => {
      setIsConnected(false)
      stateManagerRef.current?.setConnectionState(false)
    })

    const unsubscribeCursorMoved = collabClientRef.current.on('cursor:moved', (event) => {
      const payload = event.payload as { userId: string; position: CursorPosition }
      cursorSyncRef.current?.handleRemoteCursor(payload.userId, payload.position)
    })

    const unsubscribeUserJoinedCollab = collabClientRef.current.on('user:joined', (event) => {
      const payload = event.payload as { user: CollabUser }
      stateManagerRef.current?.addUser(payload.user)
    })

    const unsubscribeUserLeftCollab = collabClientRef.current.on('user:left', (event) => {
      const payload = event.payload as { userId: string }
      stateManagerRef.current?.removeUser(payload.userId)
      cursorSyncRef.current?.removeRemoteCursor(payload.userId)
    })

    const unsubscribeLockAcquiredCollab = collabClientRef.current.on('lock:acquired', (event) => {
      const payload = event.payload as { nodeId: string; userId: string; userName: string }
      stateManagerRef.current?.acquireLock(payload.nodeId)
    })

    const unsubscribeLockReleasedCollab = collabClientRef.current.on('lock:released', (event) => {
      const payload = event.payload as { nodeId: string }
      stateManagerRef.current?.releaseLock(payload.nodeId)
    })

    // Auto connect
    if (autoConnect) {
      collabClientRef.current.connect()
    }

    // Cleanup
    return () => {
      unsubscribeCursorAdded()
      unsubscribeCursorUpdated()
      unsubscribeCursorRemoved()
      unsubscribeUserJoined()
      unsubscribeUserLeft()
      unsubscribeLockAcquired()
      unsubscribeLockReleased()
      unsubscribeLockExpired()
      unsubscribeConnected()
      unsubscribeDisconnected()
      unsubscribeCursorMoved()
      unsubscribeUserJoinedCollab()
      unsubscribeUserLeftCollab()
      unsubscribeLockAcquiredCollab()
      unsubscribeLockReleasedCollab()

      cursorSyncRef.current?.destroy()
      stateManagerRef.current?.destroy()
      conflictResolverRef.current?.destroy()
      collabClientRef.current?.destroy()
    }
  }, [workflowId, currentUser, wsUrl, autoConnect, cursorThrottle, lockTimeout, conflictStrategy, debug])

  // Update cursor
  const updateCursor = useCallback(
    (position: CursorPosition) => {
      setLocalCursor(position)
      cursorSyncRef.current?.updateLocalCursor(position)
    },
    []
  )

  // Lock node
  const lockNode = useCallback(
    async (nodeId: string, priority: 'high' | 'normal' = 'normal'): Promise<boolean> => {
      const acquired = stateManagerRef.current?.acquireLock(nodeId, priority) ?? false
      if (acquired) {
        await collabClientRef.current?.acquireLock(nodeId, { priority })
      }
      return acquired
    },
    []
  )

  // Unlock node
  const unlockNode = useCallback(async (nodeId: string): Promise<void> => {
    stateManagerRef.current?.releaseLock(nodeId)
    collabClientRef.current?.releaseLock(nodeId)
  }, [])

  // Apply change
  const applyChange = useCallback(async (change: Omit<Change, 'id' | 'timestamp'>): Promise<void> => {
    const changeId = stateManagerRef.current?.queueChange(change)
    if (changeId) {
      // Send to server
      if (change.type === 'update') {
        collabClientRef.current?.updateNode(change.nodeId, change.data || {})
      } else if (change.type === 'delete') {
        collabClientRef.current?.deleteNode(change.nodeId)
      }
      // Apply locally
      stateManagerRef.current?.applyChange(changeId)
    }
  }, [])

  // Resolve conflict
  const resolveConflict = useCallback(
    (conflictId: string, resolution: 'accept_local' | 'accept_remote' | 'merge'): boolean => {
      return conflictResolverRef.current?.resolveManually(conflictId, resolution) !== null
    },
    []
  )

  // Connect
  const connect = useCallback(() => {
    collabClientRef.current?.connect()
  }, [])

  // Disconnect
  const disconnect = useCallback(() => {
    collabClientRef.current?.disconnect()
  }, [])

  // Update session state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (stateManagerRef.current) {
        setSessionState(stateManagerRef.current.getSessionState())
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return {
    cursors,
    localCursor,
    onlineUsers,
    lockedNodes,
    isConnected,
    updateCursor,
    lockNode,
    unlockNode,
    applyChange,
    resolveConflict,
    sessionState,
    connect,
    disconnect,
  }
}

/**
 * useCollaborationCursor - Simplified hook for cursor tracking only
 */
export function useCollaborationCursor(
  workflowId: string,
  currentUser: CollabUser,
  options: Omit<UseCollaborationOptions, 'conflictStrategy'> = {}
): {
  cursors: Map<string, CursorState>
  localCursor: CursorPosition | null
  updateCursor: (position: CursorPosition) => void
  isConnected: boolean
} {
  const { cursors, localCursor, updateCursor, isConnected } = useCollaboration(workflowId, currentUser, options)

  return {
    cursors,
    localCursor,
    updateCursor,
    isConnected,
  }
}

/**
 * useCollaborationLocks - Simplified hook for node locking only
 */
export function useCollaborationLocks(
  workflowId: string,
  currentUser: CollabUser,
  options: Omit<UseCollaborationOptions, 'conflictStrategy' | 'cursorThrottle'> = {}
): {
  lockedNodes: Map<string, { userId: string; userName: string; expiresAt: number }>
  lockNode: (nodeId: string, priority?: 'high' | 'normal') => Promise<boolean>
  unlockNode: (nodeId: string) => Promise<void>
  isConnected: boolean
} {
  const { lockedNodes, lockNode, unlockNode, isConnected } = useCollaboration(workflowId, currentUser, options)

  return {
    lockedNodes,
    lockNode,
    unlockNode,
    isConnected,
  }
}