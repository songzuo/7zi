/**
 * Collaboration Feature (src/features/collab/)
 *
 * Real-time collaboration system for frontend
 * Provides WebSocket-based cursor sync, presence, and Y.js document sync
 *
 * @version 1.11.0
 */

// Types
export * from './types'

// Hooks
export {
  useCollabWebSocket,
  useYjsDoc,
  useCollabCursors,
} from './hooks'

export type {
  UseCollabWebSocketOptions,
  UseCollabWebSocketReturn,
  UseYjsDocOptions,
  UseYjsDocReturn,
  UseCollabCursorsOptions,
  UseCollabCursorsReturn,
} from './hooks'

// Components
export {
  RemoteCursor,
  CursorOverlay,
  CollabProvider,
  useCollab,
} from './components'

export type {
  RemoteCursorProps,
  CursorOverlayProps,
  CollabProviderProps,
} from './types'
