/**
 * CollaborationStateManager - Collaboration Session State Management
 *
 * Manages the state of a collaborative editing session including:
 * - Online user tracking
 * - Node locking/unlocking mechanism
 * - Change queue management
 * - Conflict detection
 * - Session state persistence
 *
 * @version 1.12.3
 */

import type { CollabUser, CursorPosition } from '@/features/collab/types'
import { logger } from '@/lib/logger'

/**
 * Node lock information
 */
export interface NodeLock {
  nodeId: string
  userId: string
  userName: string
  lockedAt: number
  expiresAt: number
  priority: 'high' | 'normal'
}

/**
 * Change operation
 */
export interface Change {
  id: string
  type: 'update' | 'delete' | 'insert'
  nodeId: string
  userId: string
  userName: string
  timestamp: number
  data?: Record<string, unknown>
  version: number
}

/**
 * Conflict information
 */
export interface Conflict {
  id: string
  nodeId: string
  type: 'concurrent_edit' | 'version_mismatch' | 'lock_conflict'
  changes: Change[]
  detectedAt: number
  resolved: boolean
}

/**
 * State manager options
 */
export interface StateManagerOptions {
  /** Lock timeout in milliseconds (default: 30000) */
  lockTimeout?: number
  /** Change queue max size (default: 1000) */
  maxQueueSize?: number
  /** Enable conflict detection (default: true) */
  enableConflictDetection?: boolean
  /** Enable debug logging */
  debug?: number
}

/**
 * State manager event types
 */
export type StateManagerEventType =
  | 'user:joined'
  | 'user:left'
  | 'user:updated'
  | 'lock:acquired'
  | 'lock:released'
  | 'lock:expired'
  | 'lock:denied'
  | 'change:queued'
  | 'change:applied'
  | 'conflict:detected'
  | 'conflict:resolved'

/**
 * State manager event
 */
export interface StateManagerEvent {
  type: StateManagerEventType
  payload?: unknown
  timestamp: number
  userId?: string
}

/**
 * Collaboration session state
 */
export interface CollabSessionState {
  sessionId: string
  onlineUsers: Map<string, CollabUser>
  lockedNodes: Map<string, NodeLock>
  changeQueue: Change[]
  conflicts: Conflict[]
  isConnected: boolean
}

/**
 * CollaborationStateManager class
 */
export class CollaborationStateManager {
  // Session ID
  private sessionId: string

  // Online users (userId -> CollabUser)
  private onlineUsers: Map<string, CollabUser> = new Map()

  // Locked nodes (nodeId -> NodeLock)
  private lockedNodes: Map<string, NodeLock> = new Map()

  // Change queue
  private changeQueue: Change[] = []

  // Conflicts
  private conflicts: Conflict[] = new Map()

  // Current user
  private currentUser: CollabUser

  // Connection state
  private isConnected: boolean = false

  // Lock expiration timer
  private lockExpirationTimer: NodeJS.Timeout | null = null

  // Event listeners
  private eventListeners: Map<StateManagerEventType, Set<(event: StateManagerEvent) => void>> = new Map()

  // Options
  private options: Required<StateManagerOptions>

  // Default options
  private static readonly DEFAULT_OPTIONS: Required<StateManagerOptions> = {
    lockTimeout: 30000,
    maxQueueSize: 1000,
    enableConflictDetection: true,
    debug: false,
  }

  constructor(sessionId: string, currentUser: CollabUser, options: StateManagerOptions = {}) {
    this.sessionId = sessionId
    this.currentUser = currentUser
    this.options = { ...CollaborationStateManager.DEFAULT_OPTIONS, ...options }

    // Start lock expiration check
    this.startLockExpirationCheck()

    this.log('info', 'StateManager initialized', { sessionId, userId: currentUser.id })
  }

  /**
   * Set connection state
   */
  setConnectionState(connected: boolean): void {
    this.isConnected = connected
    this.log('info', `Connection state changed: ${connected ? 'connected' : 'disconnected'}`)
  }

  /**
   * Add online user
   */
  addUser(user: CollabUser): void {
    const existing = this.onlineUsers.get(user.id)
    this.onlineUsers.set(user.id, { ...user, isOnline: true })

    this.emit({
      type: existing ? 'user:updated' : 'user:joined',
      payload: { user },
      timestamp: Date.now(),
      userId: user.id,
    })

    this.log('debug', 'User added', { userId: user.id, name: user.name })
  }

  /**
   * Remove online user
   */
  removeUser(userId: string): void {
    const user = this.onlineUsers.get(userId)
    if (!user) {
      return
    }

    // Release all locks held by this user
    this.lockedNodes.forEach((lock, nodeId) => {
      if (lock.userId === userId) {
        this.releaseLock(nodeId, userId)
      }
    })

    this.onlineUsers.delete(userId)

    this.emit({
      type: 'user:left',
      payload: { userId },
      timestamp: Date.now(),
      userId,
    })

    this.log('debug', 'User removed', { userId })
  }

  /**
   * Update user information
   */
  updateUser(userId: string, updates: Partial<CollabUser>): void {
    const user = this.onlineUsers.get(userId)
    if (!user) {
      return
    }

    const updated = { ...user, ...updates }
    this.onlineUsers.set(userId, updated)

    this.emit({
      type: 'user:updated',
      payload: { userId, updates },
      timestamp: Date.now(),
      userId,
    })

    this.log('debug', 'User updated', { userId, updates })
  }

  /**
   * Get all online users
   */
  getOnlineUsers(): CollabUser[] {
    return Array.from(this.onlineUsers.values())
  }

  /**
   * Get user by ID
   */
  getUser(userId: string): CollabUser | undefined {
    return this.onlineUsers.get(userId)
  }

  /**
   * Acquire lock for a node
   */
  acquireLock(nodeId: string, priority: 'high' | 'normal' = 'normal'): boolean {
    const existingLock = this.lockedNodes.get(nodeId)

    // Check if already locked by another user
    if (existingLock && existingLock.userId !== this.currentUser.id) {
      if (existingLock.expiresAt > Date.now()) {
        // Lock is active by another user
        this.emit({
          type: 'lock:denied',
          payload: { nodeId, reason: 'locked_by_other', existingLock },
          timestamp: Date.now(),
        })
        this.log('warn', 'Lock denied: node locked by another user', { nodeId, lockedBy: existingLock.userId })
        return false
      }
      // Lock expired, can acquire
    }

    // Create lock
    const lock: NodeLock = {
      nodeId,
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      lockedAt: Date.now(),
      expiresAt: Date.now() + this.options.lockTimeout,
      priority,
    }

    this.lockedNodes.set(nodeId, lock)

    this.emit({
      type: 'lock:acquired',
      payload: { lock },
      timestamp: Date.now(),
      userId: this.currentUser.id,
    })

    this.log('debug', 'Lock acquired', { nodeId, priority })
    return true
  }

  /**
   * Release lock for a node
   */
  releaseLock(nodeId: string, userId?: string): boolean {
    const lock = this.lockedNodes.get(nodeId)
    if (!lock) {
      return false
    }

    // Check ownership
    if (userId && lock.userId !== userId) {
      this.log('warn', 'Lock release denied: not owner', { nodeId, lockUserId: lock.userId, requestUserId: userId })
      return false
    }

    if (!userId && lock.userId !== this.currentUser.id) {
      this.log('warn', 'Lock release denied: not owner', { nodeId, lockUserId: lock.userId })
      return false
    }

    this.lockedNodes.delete(nodeId)

    this.emit({
      type: 'lock:released',
      payload: { nodeId, userId: lock.userId },
      timestamp: Date.now(),
      userId: lock.userId,
    })

    this.log('debug', 'Lock released', { nodeId })
    return true
  }

  /**
   * Check if a node is locked
   */
  isNodeLocked(nodeId: string): boolean {
    const lock = this.lockedNodes.get(nodeId)
    if (!lock) {
      return false
    }
    return lock.expiresAt > Date.now()
  }

  /**
   * Get lock for a node
   */
  getNodeLock(nodeId: string): NodeLock | undefined {
    const lock = this.lockedNodes.get(nodeId)
    if (!lock) {
      return undefined
    }
    // Return undefined if expired
    return lock.expiresAt > Date.now() ? lock : undefined
  }

  /**
   * Get all locked nodes
   */
  getLockedNodes(): Map<string, NodeLock> {
    const activeLocks = new Map<string, NodeLock>()
    this.lockedNodes.forEach((lock, nodeId) => {
      if (lock.expiresAt > Date.now()) {
        activeLocks.set(nodeId, lock)
      }
    })
    return activeLocks
  }

  /**
   * Queue a change
   */
  queueChange(change: Omit<Change, 'id' | 'timestamp'>): string {
    const changeId = `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const fullChange: Change = {
      ...change,
      id: changeId,
      timestamp: Date.now(),
    }

    // Check queue size
    if (this.changeQueue.length >= this.options.maxQueueSize) {
      this.log('warn', 'Change queue full, removing oldest change')
      this.changeQueue.shift()
    }

    this.changeQueue.push(fullChange)

    // Detect conflicts if enabled
    if (this.options.enableConflictDetection) {
      this.detectConflicts(fullChange)
    }

    this.emit({
      type: 'change:queued',
      payload: { change: fullChange },
      timestamp: Date.now(),
      userId: change.userId,
    })

    this.log('debug', 'Change queued', { changeId, nodeId: change.nodeId, type: change.type })
    return changeId
  }

  /**
   * Apply a change
   */
  applyChange(changeId: string): boolean {
    const index = this.changeQueue.findIndex((c) => c.id === changeId)
    if (index === -1) {
      this.log('warn', 'Change not found in queue', { changeId })
      return false
    }

    const change = this.changeQueue[index]
    this.changeQueue.splice(index, 1)

    this.emit({
      type: 'change:applied',
      payload: { change },
      timestamp: Date.now(),
      userId: change.userId,
    })

    this.log('debug', 'Change applied', { changeId, nodeId: change.nodeId })
    return true
  }

  /**
   * Get change queue
   */
  getChangeQueue(): Change[] {
    return [...this.changeQueue]
  }

  /**
   * Detect conflicts
   */
  private detectConflicts(newChange: Change): void {
    // Find concurrent changes for the same node
    const concurrentChanges = this.changeQueue.filter(
      (c) =>
        c.nodeId === newChange.nodeId &&
        c.userId !== newChange.userId &&
        Math.abs(c.timestamp - newChange.timestamp) < 1000 // Within 1 second
    )

    if (concurrentChanges.length === 0) {
      return
    }

    // Check for version mismatch
    const versionConflict = concurrentChanges.find((c) => c.version !== newChange.version)

    // Create conflict
    const conflict: Conflict = {
      id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      nodeId: newChange.nodeId,
      type: versionConflict ? 'version_mismatch' : 'concurrent_edit',
      changes: [newChange, ...concurrentChanges],
      detectedAt: Date.now(),
      resolved: false,
    }

    this.conflicts.set(conflict.id, conflict)

    this.emit({
      type: 'conflict:detected',
      payload: { conflict },
      timestamp: Date.now(),
    })

    this.log('warn', 'Conflict detected', { conflictId: conflict.id, nodeId: conflict.nodeId, type: conflict.type })
  }

  /**
   * Resolve a conflict
   */
  resolveConflict(conflictId: string, resolution: 'accept_local' | 'accept_remote' | 'merge'): boolean {
    const conflict = this.conflicts.get(conflictId)
    if (!conflict) {
      this.log('warn', 'Conflict not found', { conflictId })
      return false
    }

    conflict.resolved = true

    this.emit({
      type: 'conflict:resolved',
      payload: { conflict, resolution },
      timestamp: Date.now(),
    })

    this.log('info', 'Conflict resolved', { conflictId, resolution })
    return true
  }

  /**
   * Get all conflicts
   */
  getConflicts(): Conflict[] {
    return Array.from(this.conflicts.values()).filter((c) => !c.resolved)
  }

  /**
   * Get conflict by ID
   */
  getConflict(conflictId: string): Conflict | undefined {
    return this.conflicts.get(conflictId)
  }

  /**
   * Start lock expiration check
   */
  private startLockExpirationCheck(): void {
    this.stopLockExpirationCheck()

    this.lockExpirationTimer = setInterval(() => {
      const now = Date.now()
      const expiredLocks: string[] = []

      this.lockedNodes.forEach((lock, nodeId) => {
        if (lock.expiresAt <= now) {
          expiredLocks.push(nodeId)
        }
      })

      expiredLocks.forEach((nodeId) => {
        const lock = this.lockedNodes.get(nodeId)!
        this.lockedNodes.delete(nodeId)

        this.emit({
          type: 'lock:expired',
          payload: { nodeId, userId: lock.userId },
          timestamp: Date.now(),
          userId: lock.userId,
        })

        this.log('debug', 'Lock expired', { nodeId, userId: lock.userId })
      })
    }, 5000) // Check every 5 seconds
  }

  /**
   * Stop lock expiration check
   */
  private stopLockExpirationCheck(): void {
    if (this.lockExpirationTimer) {
      clearInterval(this.lockExpirationTimer)
      this.lockExpirationTimer = null
    }
  }

  /**
   * Get session state
   */
  getSessionState(): CollabSessionState {
    return {
      sessionId: this.sessionId,
      onlineUsers: new Map(this.onlineUsers),
      lockedNodes: new Map(this.lockedNodes),
      changeQueue: [...this.changeQueue],
      conflicts: Array.from(this.conflicts.values()).filter((c) => !c.resolved),
      isConnected: this.isConnected,
    }
  }

  /**
   * Subscribe to events
   */
  on(eventType: StateManagerEventType, handler: (event: StateManagerEvent) => void): () => void {
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
  private emit(event: StateManagerEvent): void {
    const listeners = this.eventListeners.get(event.type)
    if (listeners) {
      listeners.forEach((handler) => {
        try {
          handler(event)
        } catch (err) {
          this.log('error', 'Error in state manager event handler', { type: event.type, error: err })
        }
      })
    }
  }

  /**
   * Destroy state manager
   */
  destroy(): void {
    this.stopLockExpirationCheck()
    this.onlineUsers.clear()
    this.lockedNodes.clear()
    this.changeQueue = []
    this.conflicts.clear()
    this.eventListeners.clear()
    this.log('info', 'StateManager destroyed')
  }

  /**
   * Debug logging
   */
  private log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>): void {
    if (this.options.debug || level === 'error') {
      logger[level](`[StateManager] ${message}`, data as Error | undefined)
    }
  }
}

export type {
  StateManagerOptions,
  StateManagerEvent,
  StateManagerEventType,
  CollabSessionState,
  NodeLock,
  Change,
  Conflict,
}