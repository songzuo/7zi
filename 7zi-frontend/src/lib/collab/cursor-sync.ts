/**
 * CollaborationCursorSync - Real-time Cursor Synchronization
 *
 * Provides real-time cursor tracking and broadcasting for collaborative editing.
 * Features:
 * - Local cursor position tracking
 * - Throttled cursor movement broadcasting (50ms)
 * - Remote cursor reception and rendering
 * - User name and color identification
 * - Automatic cursor cleanup on user leave
 *
 * @version 1.12.3
 */

import type { CursorPosition, CursorState, CollabUser } from '@/features/collab/types'
import { logger } from '@/lib/logger'

/**
 * Cursor sync options
 */
export interface CursorSyncOptions {
  /** Throttle interval in milliseconds (default: 50) */
  throttleMs?: number
  /** Enable debug logging */
  debug?: boolean
  /** Cursor cleanup timeout in ms (default: 30000) */
  cleanupTimeout?: number
}

/**
 * Cursor sync event types
 */
export type CursorSyncEventType = 'cursor:moved' | 'cursor:added' | 'cursor:removed' | 'cursor:updated'

/**
 * Cursor sync event
 */
export interface CursorSyncEvent {
  type: CursorSyncEventType
  userId: string
  cursor?: CursorState
  timestamp: number
}

/**
 * Cursor sync state
 */
export interface CursorSyncState {
  localCursor: CursorPosition | null
  remoteCursors: Map<string, CursorState>
  isTracking: boolean
}

/**
 * CollaborationCursorSync class
 */
export class CollaborationCursorSync {
  // Remote cursors (userId -> CursorState)
  private remoteCursors: Map<string, CursorState> = new Map()

  // Local cursor position
  private localCursor: CursorPosition | null = null

  // Current user
  private currentUser: CollabUser

  // Throttle timer
  private throttleTimer: NodeJS.Timeout | null = null

  // Pending cursor update
  private pendingCursorUpdate: CursorPosition | null = null

  // Cleanup timers (userId -> timer)
  private cleanupTimers: Map<string, NodeJS.Timeout> = new Map()

  // Event listeners
  private eventListeners: Map<CursorSyncEventType, Set<(event: CursorSyncEvent) => void>> = new Map()

  // Is tracking
  private isTracking: boolean = false

  // Options
  private options: Required<CursorSyncOptions>

  // Callback to send cursor updates
  private sendCallback?: (position: CursorPosition) => boolean

  // Default options
  private static readonly DEFAULT_OPTIONS: Required<CursorSyncOptions> = {
    throttleMs: 50,
    debug: false,
    cleanupTimeout: 30000,
  }

  constructor(currentUser: CollabUser, options: CursorSyncOptions = {}) {
    this.currentUser = currentUser
    this.options = { ...CollaborationCursorSync.DEFAULT_OPTIONS, ...options }
    this.log('info', 'CursorSync initialized', { userId: currentUser.id })
  }

  /**
   * Start cursor tracking
   */
  startTracking(sendCallback: (position: CursorPosition) => boolean): void {
    this.sendCallback = sendCallback
    this.isTracking = true
    this.log('info', 'Cursor tracking started')
  }

  /**
   * Stop cursor tracking
   */
  stopTracking(): void {
    this.isTracking = false
    this.clearThrottleTimer()
    this.sendCallback = undefined
    this.log('info', 'Cursor tracking stopped')
  }

  /**
   * Update local cursor position
   */
  updateLocalCursor(position: CursorPosition): void {
    if (!this.isTracking) {
      return
    }

    this.localCursor = position
    this.pendingCursorUpdate = position

    // Throttle the broadcast
    if (!this.throttleTimer) {
      this.throttleTimer = setTimeout(() => {
        this.flushPendingUpdate()
      }, this.options.throttleMs)
    }
  }

  /**
   * Flush pending cursor update
   */
  private flushPendingUpdate(): void {
    if (!this.pendingCursorUpdate || !this.sendCallback) {
      this.clearThrottleTimer()
      return
    }

    const position = this.pendingCursorUpdate
    this.pendingCursorUpdate = null
    this.clearThrottleTimer()

    try {
      const success = this.sendCallback(position)
      if (success) {
        this.log('debug', 'Cursor position sent', { position })
      }
    } catch (error) {
      this.log('error', 'Failed to send cursor position', { error })
    }
  }

  /**
   * Clear throttle timer
   */
  private clearThrottleTimer(): void {
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer)
      this.throttleTimer = null
    }
  }

  /**
   * Handle remote cursor update
   */
  handleRemoteCursor(userId: string, position: CursorPosition, user?: Partial<CollabUser>): void {
    // Ignore own cursor updates
    if (userId === this.currentUser.id) {
      return
    }

    const existing = this.remoteCursors.get(userId)
    const cursorState: CursorState = {
      cursor: position,
      user: {
        id: userId,
        name: user?.name || existing?.user.name || 'Unknown',
        color: user?.color || existing?.user.color || '#888888',
        avatar: user?.avatar || existing?.user.avatar,
      },
      timestamp: Date.now(),
    }

    this.remoteCursors.set(userId, cursorState)

    // Reset cleanup timer
    this.resetCleanupTimer(userId)

    // Emit event
    this.emit({
      type: existing ? 'cursor:updated' : 'cursor:added',
      userId,
      cursor: cursorState,
      timestamp: Date.now(),
    })

    this.log('debug', 'Remote cursor updated', { userId, position })
  }

  /**
   * Remove remote cursor
   */
  removeRemoteCursor(userId: string): void {
    const cursor = this.remoteCursors.get(userId)
    if (!cursor) {
      return
    }

    this.remoteCursors.delete(userId)
    this.clearCleanupTimer(userId)

    this.emit({
      type: 'cursor:removed',
      userId,
      cursor,
      timestamp: Date.now(),
    })

    this.log('debug', 'Remote cursor removed', { userId })
  }

  /**
   * Reset cleanup timer for a user
   */
  private resetCleanupTimer(userId: string): void {
    this.clearCleanupTimer(userId)

    const timer = setTimeout(() => {
      this.removeRemoteCursor(userId)
    }, this.options.cleanupTimeout)

    this.cleanupTimers.set(userId, timer)
  }

  /**
   * Clear cleanup timer for a user
   */
  private clearCleanupTimer(userId: string): void {
    const timer = this.cleanupTimers.get(userId)
    if (timer) {
      clearTimeout(timer)
      this.cleanupTimers.delete(userId)
    }
  }

  /**
   * Get all remote cursors
   */
  getRemoteCursors(): Map<string, CursorState> {
    return new Map(this.remoteCursors)
  }

  /**
   * Get cursor for a specific user
   */
  getRemoteCursor(userId: string): CursorState | undefined {
    return this.remoteCursors.get(userId)
  }

  /**
   * Get local cursor position
   */
  getLocalCursor(): CursorPosition | null {
    return this.localCursor
  }

  /**
   * Get cursor sync state
   */
  getState(): CursorSyncState {
    return {
      localCursor: this.localCursor,
      remoteCursors: new Map(this.remoteCursors),
      isTracking: this.isTracking,
    }
  }

  /**
   * Clear all remote cursors
   */
  clearRemoteCursors(): void {
    this.remoteCursors.forEach((_, userId) => {
      this.clearCleanupTimer(userId)
    })
    this.remoteCursors.clear()
    this.log('info', 'All remote cursors cleared')
  }

  /**
   * Subscribe to cursor events
   */
  on(eventType: CursorSyncEventType, handler: (event: CursorSyncEvent) => void): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }
    this.eventListeners.get(eventType)!.add(handler)

    return () => {
      this.eventListeners.get(eventType)?.delete(handler)
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: CursorSyncEvent): void {
    const listeners = this.eventListeners.get(event.type)
    if (listeners) {
      listeners.forEach((handler) => {
        try {
          handler(event)
        } catch (err) {
          this.log('error', 'Error in cursor event handler', { type: event.type, error: err })
        }
      })
    }
  }

  /**
   * Destroy cursor sync
   */
  destroy(): void {
    this.stopTracking()
    this.clearRemoteCursors()
    this.eventListeners.clear()
    this.log('info', 'CursorSync destroyed')
  }

  /**
   * Debug logging
   */
  private log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>): void {
    if (this.options.debug || level === 'error') {
      if (level === 'error' && data) {
        logger[level](`[CursorSync] ${message}`, data as unknown as Error)
      } else {
        logger[level](`[CursorSync] ${message}`)
      }
    }
  }
}

export type { CursorSyncOptions, CursorSyncEvent, CursorSyncEventType, CursorSyncState }