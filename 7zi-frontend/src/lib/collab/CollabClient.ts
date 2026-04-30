/**
 * CollabClient - Real-time Collaboration Client
 *
 * Provides CRDT-based collaborative editing using Yjs
 * Features:
 * - Document synchronization
 * - Cursor/presence awareness
 * - Edit locks for conflict prevention
 * - Offline support with operation queuing
 *
 * @version 1.12.0
 */

import { WebSocketManager, ConnectionState } from '@/lib/websocket-manager'
import type {
  CollabUser,
  CursorPosition,
  CursorState,
  CollabMessage,
  CollabMessageType,
  CollabConnectionInfo,
  CollabSession,
} from '@/features/collab/types'
import { logger } from '@/lib/logger'

/**
 * Document node data structure
 */
export interface NodeData {
  id: string
  type: string
  position?: { x: number; y: number }
  data: Record<string, unknown>
  version: number
  updatedAt: number
  updatedBy?: string
}

/**
 * Edit lock information
 */
export interface EditLock {
  nodeId: string
  userId: string
  userName: string
  lockedAt: number
  expiresAt: number
}

/**
 * Lock request options
 */
export interface LockRequestOptions {
  timeout?: number // Lock timeout in ms (default: 30000)
  priority?: 'high' | 'normal' // Request priority
}

/**
 * Collaboration event types
 */
export type CollabClientEventType =
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error'
  | 'user:joined'
  | 'user:left'
  | 'user:updated'
  | 'cursor:moved'
  | 'lock:acquired'
  | 'lock:released'
  | 'lock:denied'
  | 'lock:expired'
  | 'sync:complete'
  | 'node:updated'
  | 'node:deleted'

/**
 * Collaboration event
 */
export interface CollabClientEvent {
  type: CollabClientEventType
  payload?: unknown
  timestamp: number
  userId?: string
}

/**
 * CollabClient options
 */
export interface CollabClientOptions {
  /** WebSocket URL */
  wsUrl: string
  /** Room/Session ID */
  roomId: string
  /** Current user */
  user: CollabUser
  /** Auto connect on creation */
  autoConnect?: boolean
  /** Heartbeat interval in ms */
  heartbeatInterval?: number
  /** Lock timeout in ms (default: 30000) */
  lockTimeout?: number
  /** Lock renewal interval in ms (default: 10000) */
  lockRenewalInterval?: number
  /** Cursor throttle in ms (default: 50) */
  cursorThrottle?: number
  /** Enable debug logging */
  debug?: boolean
}

/**
 * CollabClient class
 */
export class CollabClient {
  // WebSocket manager
  private wsManager: WebSocketManager | null = null

  // Connection state
  private connectionInfo: CollabConnectionInfo = {
    state: 'disconnected',
    reconnectAttempts: 0,
  }

  // Session info
  private session: CollabSession | null = null

  // Current user
  private user: CollabUser

  // Room ID
  private roomId: string

  // Active locks (nodeId -> EditLock)
  private locks: Map<string, EditLock> = new Map()

  // Remote users (userId -> CollabUser)
  private remoteUsers: Map<string, CollabUser> = new Map()

  // Remote cursors (userId -> CursorState)
  private remoteCursors: Map<string, CursorState> = new Map()

  // Document state (nodeId -> NodeData)
  private document: Map<string, NodeData> = new Map()

  // Pending operations queue (for offline support)
  private pendingOperations: Array<{
    type: 'update' | 'delete' | 'lock' | 'unlock'
    nodeId?: string
    data?: Partial<NodeData>
    timestamp: number
  }> = []

  // Event listeners
  private eventListeners: Map<CollabClientEventType, Set<(event: CollabClientEvent) => void>> = new Map()

  // Lock renewal timer
  private lockRenewalTimer: NodeJS.Timeout | null = null

  // Cursor throttle
  private lastCursorUpdate: number = 0

  // Options
  private options: Required<CollabClientOptions>

  // Is destroyed
  private isDestroyed: boolean = false

  constructor(options: CollabClientOptions) {
    this.roomId = options.roomId
    this.user = options.user
    this.options = {
      wsUrl: options.wsUrl,
      roomId: options.roomId,
      user: options.user,
      autoConnect: options.autoConnect ?? true,
      heartbeatInterval: options.heartbeatInterval ?? 25000,
      lockTimeout: options.lockTimeout ?? 30000,
      lockRenewalInterval: options.lockRenewalInterval ?? 10000,
      cursorThrottle: options.cursorThrottle ?? 50,
      debug: options.debug ?? false,
    }

    // Initialize WebSocket manager
    this.initializeWebSocket()

    // Start lock renewal if auto-connect
    if (this.options.autoConnect) {
      this.startLockRenewal()
    }

    this.log('info', 'CollabClient initialized', { roomId: options.roomId, userId: options.user.id })
  }

  /**
   * Initialize WebSocket connection
   */
  private initializeWebSocket(): void {
    this.wsManager = new WebSocketManager({
      url: this.options.wsUrl,
      autoConnect: false, // We manage connection explicitly
      heartbeatInterval: this.options.heartbeatInterval,
    })

    // Listen to connection state changes
    this.wsManager.onStateChange((state) => {
      const stateMap: Record<ConnectionState, CollabConnectionInfo['state']> = {
        [ConnectionState.DISCONNECTED]: 'disconnected',
        [ConnectionState.CONNECTING]: 'connecting',
        [ConnectionState.CONNECTED]: 'connected',
        [ConnectionState.RECONNECTING]: 'reconnecting',
        [ConnectionState.ERROR]: 'error',
      }

      this.connectionInfo = {
        state: stateMap[state as ConnectionState] as CollabConnectionInfo['state'],
        connectedAt: state === ConnectionState.CONNECTED ? Date.now() : this.connectionInfo.connectedAt,
        reconnectAttempts:
          state === ConnectionState.RECONNECTING
            ? this.connectionInfo.reconnectAttempts + 1
            : this.connectionInfo.reconnectAttempts,
      }

      // Emit events
      switch (state) {
        case ConnectionState.CONNECTED:
          this.emit({ type: 'connected', timestamp: Date.now() })
          this.sendQueuedOperations()
          break
        case ConnectionState.DISCONNECTED:
          this.emit({ type: 'disconnected', timestamp: Date.now() })
          break
        case ConnectionState.RECONNECTING:
          this.emit({ type: 'reconnecting', timestamp: Date.now() })
          break
        case ConnectionState.ERROR:
          this.emit({
            type: 'error',
            payload: { message: 'Connection error' },
            timestamp: Date.now(),
          })
          break
      }
    })

    // Listen to all messages
    this.wsManager.on('collab:message', (event, data) => {
      this.handleMessage(data as CollabMessage)
    })
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: CollabMessage): void {
    this.log('info', 'Received message', { type: message.type })

    switch (message.type) {
      case 'cursor:move':
      case 'cursor:select':
        if (message.userId && message.userId !== this.user.id) {
          const payload = message.payload as { position: CursorPosition }
          this.remoteCursors.set(message.userId, {
            cursor: payload.position,
            user: {
              id: message.userId,
              name: this.remoteUsers.get(message.userId)?.name || 'Unknown',
              color: this.remoteUsers.get(message.userId)?.color || '#888888',
            },
            timestamp: message.timestamp,
          })
          this.emit({
            type: 'cursor:moved',
            payload: { userId: message.userId, position: payload.position },
            timestamp: message.timestamp,
            userId: message.userId,
          })
        }
        break

      case 'presence:join':
        if (message.userId) {
          const payload = message.payload as { user: CollabUser; sessionId: string }
          this.remoteUsers.set(message.userId, payload.user)
          this.emit({
            type: 'user:joined',
            payload: payload,
            timestamp: message.timestamp,
            userId: message.userId,
          })
        }
        break

      case 'presence:leave':
        if (message.userId) {
          this.remoteUsers.delete(message.userId)
          this.remoteCursors.delete(message.userId)
          this.emit({
            type: 'user:left',
            payload: { userId: message.userId },
            timestamp: message.timestamp,
            userId: message.userId,
          })
        }
        break

      case 'presence:update':
        if (message.userId) {
          const payload = message.payload as { userId: string; updates: Partial<CollabUser> }
          const existing = this.remoteUsers.get(payload.userId)
          if (existing) {
            this.remoteUsers.set(payload.userId, { ...existing, ...payload.updates })
          }
          this.emit({
            type: 'user:updated',
            payload,
            timestamp: message.timestamp,
            userId: message.userId,
          })
        }
        break

      case 'lock:acquire':
        if (message.userId) {
          const payload = message.payload as { nodeId: string; userId: string; userName: string }
          const expiresAt = message.timestamp + this.options.lockTimeout
          this.locks.set(payload.nodeId, {
            nodeId: payload.nodeId,
            userId: payload.userId,
            userName: payload.userName,
            lockedAt: message.timestamp,
            expiresAt,
          })
          this.emit({
            type: 'lock:acquired',
            payload,
            timestamp: message.timestamp,
            userId: message.userId,
          })
        }
        break

      case 'lock:release':
        if (message.userId) {
          const payload = message.payload as { nodeId: string }
          this.locks.delete(payload.nodeId)
          this.emit({
            type: 'lock:released',
            payload,
            timestamp: message.timestamp,
            userId: message.userId,
          })
        }
        break

      case 'doc:update':
        const updatePayload = message.payload as { nodeId: string; changes: Partial<NodeData> }
        this.updateLocalNode(updatePayload.nodeId, updatePayload.changes)
        this.emit({
          type: 'node:updated',
          payload: updatePayload,
          timestamp: message.timestamp,
        })
        break

      case 'doc:delete':
        const deletePayload = message.payload as { nodeId: string }
        this.document.delete(deletePayload.nodeId)
        this.emit({
          type: 'node:deleted',
          payload: deletePayload,
          timestamp: message.timestamp,
        })
        break

      case 'sync:response':
        const syncPayload = message.payload as {
          nodes: NodeData[]
          users: CollabUser[]
          locks: EditLock[]
        }
        // Initialize document from server state
        this.document.clear()
        syncPayload.nodes.forEach((node) => this.document.set(node.id, node))
        this.remoteUsers.clear()
        syncPayload.users
          .filter((u) => u.id !== this.user.id)
          .forEach((u) => this.remoteUsers.set(u.id, u))
        this.locks.clear()
        syncPayload.locks.forEach((lock) => this.locks.set(lock.nodeId, lock))
        this.emit({ type: 'sync:complete', timestamp: Date.now() })
        break

      case 'error':
        const errorPayload = message.payload as { code?: string; message?: string }
        this.emit({
          type: 'error',
          payload: errorPayload,
          timestamp: message.timestamp,
        })
        break
    }
  }

  /**
   * Connect to collaboration server
   */
  connect(): void {
    if (this.isDestroyed) {
      this.log('warn', 'Cannot connect: client is destroyed')
      return
    }
    this.wsManager?.connect()
  }

  /**
   * Disconnect from collaboration server
   */
  disconnect(): void {
    // Release all locks
    this.locks.forEach((_, nodeId) => {
      this.releaseLock(nodeId)
    })

    // Stop lock renewal
    this.stopLockRenewal()

    // Disconnect WebSocket
    this.wsManager?.disconnect()

    this.log('info', 'Disconnected from collaboration server')
  }

  /**
   * Destroy the client
   */
  destroy(): void {
    this.isDestroyed = true
    this.disconnect()
    this.pendingOperations = []
    this.eventListeners.clear()
    this.document.clear()
    this.remoteUsers.clear()
    this.remoteCursors.clear()
    this.locks.clear()
    this.log('info', 'CollabClient destroyed')
  }

  /**
   * Send cursor position update
   */
  sendCursorMove(position: CursorPosition): boolean {
    if (this.connectionInfo.state !== 'connected') {
      return false
    }

    const now = Date.now()
    if (now - this.lastCursorUpdate < this.options.cursorThrottle) {
      return false
    }
    this.lastCursorUpdate = now

    return this.send('cursor:move', { position })
  }

  /**
   * Acquire edit lock for a node
   */
  async acquireLock(nodeId: string, options: LockRequestOptions = {}): Promise<boolean> {
    // Check if already locked by another user
    const existingLock = this.locks.get(nodeId)
    if (existingLock && existingLock.userId !== this.user.id) {
      if (existingLock.expiresAt > Date.now()) {
        // Lock is active by another user
        this.emit({
          type: 'lock:denied',
          payload: { nodeId, reason: 'locked_by_other' },
          timestamp: Date.now(),
        })
        return false
      }
    }

    // Send lock request
    const success = this.send('lock:acquire', {
      nodeId,
      userId: this.user.id,
      userName: this.user.name,
    })

    if (success) {
      // Optimistically set lock
      const expiresAt = Date.now() + (options.timeout || this.options.lockTimeout)
      this.locks.set(nodeId, {
        nodeId,
        userId: this.user.id,
        userName: this.user.name,
        lockedAt: Date.now(),
        expiresAt,
      })

      this.emit({
        type: 'lock:acquired',
        payload: { nodeId, userId: this.user.id, userName: this.user.name },
        timestamp: Date.now(),
      })
    }

    return success
  }

  /**
   * Release edit lock for a node
   */
  releaseLock(nodeId: string): boolean {
    const lock = this.locks.get(nodeId)
    if (!lock || lock.userId !== this.user.id) {
      return false
    }

    const success = this.send('lock:release', { nodeId })
    if (success) {
      this.locks.delete(nodeId)
      this.emit({
        type: 'lock:released',
        payload: { nodeId },
        timestamp: Date.now(),
      })
    }

    return success
  }

  /**
   * Renew locks held by current user
   */
  private renewLocks(): void {
    const now = Date.now()
    this.locks.forEach((lock, nodeId) => {
      if (lock.userId === this.user.id) {
        lock.expiresAt = now + this.options.lockTimeout
        this.send('lock:renew', { nodeId, expiresAt: lock.expiresAt })
      }
    })
  }

  /**
   * Start lock renewal timer
   */
  private startLockRenewal(): void {
    this.stopLockRenewal()
    this.lockRenewalTimer = setInterval(() => {
      this.renewLocks()
    }, this.options.lockRenewalInterval)
  }

  /**
   * Stop lock renewal timer
   */
  private stopLockRenewal(): void {
    if (this.lockRenewalTimer) {
      clearInterval(this.lockRenewalTimer)
      this.lockRenewalTimer = null
    }
  }

  /**
   * Update a node in the document
   */
  updateNode(nodeId: string, changes: Partial<NodeData>): boolean {
    // Check lock
    const lock = this.locks.get(nodeId)
    if (lock && lock.userId !== this.user.id) {
      this.log('warn', 'Cannot update node: locked by another user', { nodeId })
      return false
    }

    // Update local
    this.updateLocalNode(nodeId, changes)

    // Send to server
    if (this.connectionInfo.state === 'connected') {
      return this.send('doc:update', { nodeId, changes })
    } else {
      // Queue for later
      this.pendingOperations.push({
        type: 'update',
        nodeId,
        data: changes,
        timestamp: Date.now(),
      })
      return true
    }
  }

  /**
   * Update local node state
   */
  private updateLocalNode(nodeId: string, changes: Partial<NodeData>): void {
    const existing = this.document.get(nodeId)
    if (existing) {
      this.document.set(nodeId, {
        ...existing,
        ...changes,
        updatedAt: Date.now(),
        updatedBy: this.user.id,
        version: existing.version + 1,
      })
    } else {
      this.document.set(nodeId, {
        id: nodeId,
        type: 'unknown',
        data: {},
        version: 1,
        updatedAt: Date.now(),
        updatedBy: this.user.id,
        ...changes,
      } as NodeData)
    }
  }

  /**
   * Delete a node
   */
  deleteNode(nodeId: string): boolean {
    // Check lock
    const lock = this.locks.get(nodeId)
    if (lock && lock.userId !== this.user.id) {
      this.log('warn', 'Cannot delete node: locked by another user', { nodeId })
      return false
    }

    // Delete locally
    this.document.delete(nodeId)

    // Send to server
    if (this.connectionInfo.state === 'connected') {
      return this.send('doc:delete', { nodeId })
    } else {
      this.pendingOperations.push({
        type: 'delete',
        nodeId,
        timestamp: Date.now(),
      })
      return true
    }
  }

  /**
   * Send queued operations after reconnection
   */
  private sendQueuedOperations(): void {
    if (this.pendingOperations.length === 0) {
      return
    }

    this.log('info', `Sending ${this.pendingOperations.length} queued operations`)

    const operations = [...this.pendingOperations]
    this.pendingOperations = []

    operations.forEach((op) => {
      switch (op.type) {
        case 'update':
          this.updateNode(op.nodeId!, op.data!)
          break
        case 'delete':
          this.deleteNode(op.nodeId!)
          break
      }
    })
  }

  /**
   * Send message to server
   */
  private send(type: CollabMessageType, payload: unknown): boolean {
    if (!this.wsManager) {
      return false
    }

    const message: CollabMessage = {
      type,
      payload,
      timestamp: Date.now(),
      userId: this.user.id,
      sessionId: this.roomId,
    }

    return this.wsManager.emit('collab:message', message)
  }

  /**
   * Subscribe to events
   */
  on(eventType: CollabClientEventType, handler: (event: CollabClientEvent) => void): () => void {
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
  private emit(event: CollabClientEvent): void {
    const listeners = this.eventListeners.get(event.type)
    if (listeners) {
      listeners.forEach((handler) => {
        try {
          handler(event)
        } catch (err) {
          this.log('error', 'Error in event handler', { type: event.type, error: err })
        }
      })
    }
  }

  /**
   * Get connection info
   */
  getConnectionInfo(): CollabConnectionInfo {
    return { ...this.connectionInfo }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionInfo.state === 'connected'
  }

  /**
   * Get current user
   */
  getUser(): CollabUser {
    return { ...this.user }
  }

  /**
   * Get all users (local + remote)
   */
  getUsers(): Map<string, CollabUser> {
    const users = new Map<string, CollabUser>()
    users.set(this.user.id, this.user)
    this.remoteUsers.forEach((user, id) => users.set(id, user))
    return users
  }

  /**
   * Get remote users only
   */
  getRemoteUsers(): Map<string, CollabUser> {
    return new Map(this.remoteUsers)
  }

  /**
   * Get remote cursors
   */
  getRemoteCursors(): Map<string, CursorState> {
    return new Map(this.remoteCursors)
  }

  /**
   * Get active locks
   */
  getLocks(): Map<string, EditLock> {
    return new Map(this.locks)
  }

  /**
   * Get lock for a specific node
   */
  getLock(nodeId: string): EditLock | undefined {
    return this.locks.get(nodeId)
  }

  /**
   * Check if a node is locked by current user
   */
  hasLock(nodeId: string): boolean {
    const lock = this.locks.get(nodeId)
    return lock?.userId === this.user.id
  }

  /**
   * Get document (all nodes)
   */
  getDocument(): Map<string, NodeData> {
    return new Map(this.document)
  }

  /**
   * Get a specific node
   */
  getNode(nodeId: string): NodeData | undefined {
    return this.document.get(nodeId)
  }

  /**
   * Get pending operations count
   */
  getPendingOperationsCount(): number {
    return this.pendingOperations.length
  }

  /**
   * Debug logging
   */
  private log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>): void {
    if (this.options.debug || level === 'error') {
      const errorData = data ? new Error(JSON.stringify(data)) : undefined
      logger[level](`[CollabClient] ${message}`, errorData)
    }
  }
}
