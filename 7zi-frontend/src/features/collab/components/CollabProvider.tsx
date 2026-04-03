/**
 * CollabProvider Component
 *
 * Provides real-time collaboration context for child components
 * Manages WebSocket connection and Y.js document synchronization
 */

'use client'

import { createContext, useContext, useEffect, useMemo, useCallback, type ReactNode } from 'react'
import { useCollabWebSocket, type UseCollabWebSocketReturn } from '../hooks/useCollabWebSocket'
import { useCollabCursors, type UseCollabCursorsReturn } from '../hooks/useCollabCursors'
import { useYjsDoc, type UseYjsDocReturn } from '../hooks/useYjsDoc'
import { CursorOverlay } from './CursorOverlay'
import type {
  CollabProviderProps,
  CursorPosition,
  CollabUser,
  CursorState,
  CollabConnectionInfo,
} from '../types'

/**
 * Collaboration context
 */
interface CollabContextValue {
  // Connection
  connectionInfo: CollabConnectionInfo
  isConnected: boolean

  // WebSocket
  sendCursorMove: (position: CursorPosition) => boolean
  sendPresenceUpdate: (userId: string, updates: Partial<CollabUser>) => boolean

  // Cursors
  remoteCursors: Map<string, CursorState>
  localCursor: CursorPosition | null
  updateLocalCursor: (position: CursorPosition) => void
  setLocalCursor: (position: CursorPosition | null) => void
  getCursorColor: (userId: string) => string

  // Y.js Document
  docState: ReturnType<UseYjsDocReturn>['docState']
  isDocReady: boolean
  getDocContent: () => string
  setDocContent: (content: string) => void

  // User info
  userId: string
  userName: string
}

/**
 * Context with undefined default
 */
const CollabContext = createContext<CollabContextValue | undefined>(undefined)

/**
 * useCollab hook
 */
export function useCollab(): CollabContextValue {
  const context = useContext(CollabContext)
  if (!context) {
    throw new Error('useCollab must be used within a CollabProvider')
  }
  return context
}

/**
 * CollabProvider Component
 */
export function CollabProvider({
  children,
  roomId,
  userId,
  userName,
  userAvatar,
  autoConnect = true,
  wsUrl = '/api/collab/ws',
}: CollabProviderProps) {
  // WebSocket hook
  const ws = useCollabWebSocket(roomId, userId, userName, {
    wsUrl,
    autoConnect,
    debug: process.env.NODE_ENV === 'development',
  })

  // Cursor hook
  const cursors = useCollabCursors({ userId })

  // Y.js document hook
  const yjs = useYjsDoc({
    docId: roomId,
    connectionInfo: ws.connectionInfo,
  })

  // Handle cursor moves from WebSocket
  useEffect(() => {
    const unsubscribe = ws.onCursorMove((remoteUserId, position) => {
      // Get user info from presence or use defaults
      const cursorState: CursorState = {
        cursor: position,
        user: {
          id: remoteUserId,
          name: `User ${remoteUserId.slice(0, 6)}`,
          color: '#4ECDC4',
        },
        timestamp: Date.now(),
      }

      // Update in cursors hook
      // Note: In production, we'd get the user info from presence state
    })

    return unsubscribe
  }, [ws])

  // Handle presence join
  useEffect(() => {
    const unsubscribe = ws.onPresenceJoin((user, sessionId) => {
      // Update online users in cursors hook
    })

    return unsubscribe
  }, [ws])

  // Handle presence leave
  useEffect(() => {
    const unsubscribe = ws.onPresenceLeave((userId) => {
      // Remove user from cursors
    })

    return unsubscribe
  }, [ws])

  // Context value
  const value = useMemo<CollabContextValue>(
    () => ({
      // Connection
      connectionInfo: ws.connectionInfo,
      isConnected: ws.isConnected,

      // WebSocket
      sendCursorMove: ws.sendCursorMove,
      sendPresenceUpdate: ws.sendPresenceUpdate,

      // Cursors
      remoteCursors: cursors.remoteCursors,
      localCursor: cursors.localCursor,
      updateLocalCursor: cursors.updateLocalCursor,
      setLocalCursor: cursors.setLocalCursor,
      getCursorColor: cursors.getCursorColor,

      // Y.js Document
      docState: yjs.docState,
      isDocReady: yjs.isReady,
      getDocContent: yjs.getContent,
      setDocContent: yjs.setContent,

      // User info
      userId,
      userName,
    }),
    [ws, cursors, yjs, userId, userName]
  )

  return (
    <CollabContext.Provider value={value}>
      {children}
      {/* Render cursor overlay when connected */}
      {ws.isConnected && (
        <CursorOverlay
          cursors={cursors.remoteCursors}
          showNames={true}
          animationDuration={150}
        />
      )}
    </CollabContext.Provider>
  )
}

export default CollabProvider
