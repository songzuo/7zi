/**
 * useCollabCursors Hook
 *
 * React hook for real-time cursor synchronization
 * Manages local and remote cursor positions
 */

'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import type { CursorPosition, CursorState, CollabUser } from '../types'

/**
 * Hook options
 */
export interface UseCollabCursorsOptions {
  /** Current user ID */
  userId: string
  /** Cursor throttle interval in ms */
  throttleInterval?: number
  /** Cursor fade timeout in ms (hide cursor after inactivity) */
  fadeTimeout?: number
  /** Max distance to consider as same position (pixels) */
  snapDistance?: number
}

/**
 * Hook return value
 */
export interface UseCollabCursorsReturn {
  // Remote cursors
  remoteCursors: Map<string, CursorState>

  // Local cursor
  localCursor: CursorPosition | null
  setLocalCursor: (position: CursorPosition | null) => void

  // Cursor updates
  updateLocalCursor: (position: CursorPosition) => void
  hideLocalCursor: () => void

  // Presence
  onlineUsers: Map<string, CollabUser>

  // Helpers
  getCursorColor: (userId: string) => string
  isCursorVisible: (userId: string) => boolean
}

/**
 * Default options
 */
const DEFAULT_OPTIONS = {
  throttleInterval: 50,
  fadeTimeout: 5000,
  snapDistance: 2,
}

/**
 * Generate cursor color from user ID (deterministic)
 */
function generateCursorColor(userId: string): string {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FFEAA7', // Yellow
    '#DDA0DD', // Plum
    '#98D8C8', // Mint
    '#F7DC6F', // Gold
    '#BB8FCE', // Purple
    '#85C1E9', // Light Blue
  ]

  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

/**
 * useCollabCursors Hook
 */
export function useCollabCursors(
  options: UseCollabCursorsOptions
): UseCollabCursorsReturn {
  const {
    userId,
    throttleInterval = DEFAULT_OPTIONS.throttleInterval,
    fadeTimeout = DEFAULT_OPTIONS.fadeTimeout,
    snapDistance = DEFAULT_OPTIONS.snapDistance,
  } = options

  // Remote cursors state
  const [remoteCursors, setRemoteCursors] = useState<Map<string, CursorState>>(new Map())

  // Local cursor state
  const [localCursor, setLocalCursorState] = useState<CursorPosition | null>(null)

  // Online users
  const [onlineUsers, setOnlineUsers] = useState<Map<string, CollabUser>>(new Map())

  // Refs
  const lastCursorUpdateRef = useRef<number>(0)
  const cursorTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const pendingCursorRef = useRef<CursorPosition | null>(null)
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Update local cursor (throttled)
  const updateLocalCursor = useCallback(
    (position: CursorPosition) => {
      const now = Date.now()

      // Check snap distance - don't update if cursor moved very little
      if (localCursor) {
        const dx = position.x - localCursor.x
        const dy = position.y - localCursor.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < snapDistance) {
          return
        }
      }

      // Throttle updates
      if (now - lastCursorUpdateRef.current < throttleInterval) {
        pendingCursorRef.current = position
        if (!throttleTimerRef.current) {
          throttleTimerRef.current = setTimeout(() => {
            if (pendingCursorRef.current) {
              setLocalCursorState(pendingCursorRef.current)
              lastCursorUpdateRef.current = Date.now()
              pendingCursorRef.current = null
            }
            throttleTimerRef.current = null
          }, throttleInterval)
        }
        return
      }

      setLocalCursorState(position)
      lastCursorUpdateRef.current = now
    },
    [throttleInterval, snapDistance, localCursor]
  )

  // Hide local cursor
  const hideLocalCursor = useCallback(() => {
    setLocalCursorState(null)
  }, [])

  // Set local cursor (immediate, no throttle)
  const setLocalCursor = useCallback((position: CursorPosition | null) => {
    setLocalCursorState(position)
  }, [])

  // Update remote cursor from WebSocket
  const updateRemoteCursor = useCallback(
    (remoteUserId: string, cursor: CursorPosition, user: Partial<CollabUser>) => {
      setRemoteCursors((prev) => {
        const next = new Map(prev)

        // Clear existing timeout for this user
        const existingTimeout = cursorTimeoutsRef.current.get(remoteUserId)
        if (existingTimeout) {
          clearTimeout(existingTimeout)
        }

        // Set auto-hide timeout
        const timeout = setTimeout(() => {
          setRemoteCursors((current) => {
            const updated = new Map(current)
            updated.delete(remoteUserId)
            return updated
          })
        }, fadeTimeout)

        cursorTimeoutsRef.current.set(remoteUserId, timeout)

        // Update cursor
        next.set(remoteUserId, {
          cursor,
          user: {
            id: remoteUserId,
            name: user.name || 'Anonymous',
            color: user.color || generateCursorColor(remoteUserId),
            avatar: user.avatar,
          },
          timestamp: Date.now(),
        })

        return next
      })
    },
    [fadeTimeout]
  )

  // Remove remote cursor
  const removeRemoteCursor = useCallback((remoteUserId: string) => {
    const timeout = cursorTimeoutsRef.current.get(remoteUserId)
    if (timeout) {
      clearTimeout(timeout)
      cursorTimeoutsRef.current.delete(remoteUserId)
    }

    setRemoteCursors((prev) => {
      const next = new Map(prev)
      next.delete(remoteUserId)
      return next
    })
  }, [])

  // Get cursor color
  const getCursorColor = useCallback(
    (cursorUserId: string): string => {
      if (cursorUserId === userId) {
        return '#000000'
      }

      const cursor = remoteCursors.get(cursorUserId)
      if (cursor?.user.color) {
        return cursor.user.color
      }

      return generateCursorColor(cursorUserId)
    },
    [userId, remoteCursors]
  )

  // Check if cursor is visible (not faded out)
  const isCursorVisible = useCallback(
    (cursorUserId: string): boolean => {
      if (cursorUserId === userId) {
        return localCursor !== null
      }

      return remoteCursors.has(cursorUserId)
    },
    [userId, localCursor, remoteCursors]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current)
      }
      cursorTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout))
    }
  }, [])

  return {
    // Remote cursors
    remoteCursors,

    // Local cursor
    localCursor,
    setLocalCursor,
    updateLocalCursor,
    hideLocalCursor,

    // Presence
    onlineUsers,

    // Helpers
    getCursorColor,
    isCursorVisible,
  }
}
