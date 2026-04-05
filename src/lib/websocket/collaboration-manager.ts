/**
 * Collaboration Manager
 *
 * 协作管理器 - 协调房间、CRDT 同步、冲突解决
 * 整合 WebSocket 房间管理和 CRDT 文档同步
 */

import { logger } from '@/lib/logger'
import { RoomManager, getRoomManager, type RoomParticipant } from './rooms'
import {
  CRDTDocumentManager,
  ConflictResolver,
  SyncProtocol,
  type CRDTOperation,
  type ConflictInfo,
  type ConflictResolutionStrategy,
} from './crdt-sync'
import type { CursorUpdate, SelectionUpdate } from './types'

// ============================================================================
// Types
// ============================================================================

/**
 * 协作会话
 */
export interface CollaborationSession {
  id: string
  roomId: string
  docManager: CRDTDocumentManager
  syncProtocol: SyncProtocol
  participants: Map<string, CollaborationParticipant>
  createdAt: Date
  lastActivity: Date
}

/**
 * 协作参与者
 */
export interface CollaborationParticipant {
  id: string
  name: string
  email?: string
  avatar?: string
  color: string
  cursor?: CursorUpdate
  selection?: SelectionUpdate
  isTyping: boolean
  lastActivity: Date
  lockedNodes: Set<string> // 当前锁定的节点
}

/**
 * 编辑锁
 */
export interface EditLock {
  nodeId: string
  userId: string
  userName: string
  lockedAt: number
  expiresAt: number
}

/**
 * 协作事件类型
 */
export type CollaborationEventType =
  | 'user_joined'
  | 'user_left'
  | 'cursor_updated'
  | 'selection_updated'
  | 'node_updated'
  | 'node_deleted'
  | 'lock_acquired'
  | 'lock_released'
  | 'lock_expired'
  | 'conflict_detected'
  | 'conflict_resolved'

/**
 * 协作事件
 */
export interface CollaborationEvent {
  type: CollaborationEventType
  sessionId: string
  roomId: string
  userId?: string
  data?: unknown
  timestamp: number
}

/**
 * 协作配置
 */
export interface CollaborationConfig {
  lockTimeout?: number // 锁超时时间（毫秒）
  cursorThrottle?: number // 光标更新节流（毫秒）
  enableConflictResolution?: boolean // 是否启用冲突解决
  conflictResolutionStrategy?: ConflictResolutionStrategy // 冲突解决策略
}

// ============================================================================
// Collaboration Manager
// ============================================================================

/**
 * 协作管理器
 * 管理协作会话、参与者、锁、光标同步
 */
export class CollaborationManager {
  private roomManager: RoomManager
  private sessions: Map<string, CollaborationSession> = new Map()
  private locks: Map<string, EditLock> = new Map() // nodeId -> EditLock
  private eventCallbacks: Map<CollaborationEventType, (event: CollaborationEvent) => void> =
    new Map()
  private config: Required<CollaborationConfig>

  constructor(config?: CollaborationConfig) {
    this.roomManager = getRoomManager()
    this.config = {
      lockTimeout: config?.lockTimeout ?? 30000, // 30秒
      cursorThrottle: config?.cursorThrottle ?? 16, // 16ms (~60fps)
      enableConflictResolution: config?.enableConflictResolution ?? true,
      conflictResolutionStrategy: config?.conflictResolutionStrategy ?? 'last-write-wins',
    }

    logger.info('Collaboration Manager initialized', { config: this.config })
  }

  /**
   * 创建协作会话
   */
  createSession(
    sessionId: string,
    roomId: string,
    userId: string
  ): CollaborationSession {
    // 检查会话是否已存在
    if (this.sessions.has(sessionId)) {
      logger.warn('Session already exists', { sessionId })
      return this.sessions.get(sessionId)!
    }

    // 创建 CRDT 文档管理器和同步协议
    const docManager = new CRDTDocumentManager(sessionId, userId)
    const syncProtocol = new SyncProtocol(sessionId, userId)

    // 创建会话
    const session: CollaborationSession = {
      id: sessionId,
      roomId,
      docManager,
      syncProtocol,
      participants: new Map(),
      createdAt: new Date(),
      lastActivity: new Date(),
    }

    // 存储会话
    this.sessions.set(sessionId, session)

    logger.info('Collaboration session created', {
      sessionId,
      roomId,
      userId,
    })

    return session
  }

  /**
   * 获取会话
   */
  getSession(sessionId: string): CollaborationSession | undefined {
    return this.sessions.get(sessionId)
  }

  /**
   * 用户加入协作
   */
  async joinCollaboration(
    sessionId: string,
    userId: string,
    userName: string,
    email?: string,
    avatar?: string
  ): Promise<{
    success: boolean
    session?: CollaborationSession
    participant?: CollaborationParticipant
    error?: string
  }> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return {
        success: false,
        error: 'Session not found',
      }
    }

    // 检查是否已加入
    if (session.participants.has(userId)) {
      const existingParticipant = session.participants.get(userId)!
      existingParticipant.lastActivity = new Date()

      return {
        success: true,
        session,
        participant: existingParticipant,
      }
    }

    // 获取房间参与者信息
    const room = this.roomManager.get(session.roomId)
    if (!room) {
      return {
        success: false,
        error: 'Room not found',
      }
    }

    const roomParticipant = room.participants.get(userId)
    if (!roomParticipant) {
      return {
        success: false,
        error: 'User not in room',
      }
    }

    // 创建协作参与者
    const participant: CollaborationParticipant = {
      id: userId,
      name: userName,
      email,
      avatar,
      color: roomParticipant.color,
      isTyping: false,
      lastActivity: new Date(),
      lockedNodes: new Set(),
    }

    // 添加到会话
    session.participants.set(userId, participant)
    session.lastActivity = new Date()

    // 触发事件
    this.emitEvent({
      type: 'user_joined',
      sessionId,
      roomId: session.roomId,
      userId,
      data: participant,
      timestamp: Date.now(),
    })

    logger.info('User joined collaboration', {
      sessionId,
      userId,
      userName,
      participantCount: session.participants.size,
    })

    return {
      success: true,
      session,
      participant,
    }
  }

  /**
   * 用户离开协作
   */
  async leaveCollaboration(
    sessionId: string,
    userId: string
  ): Promise<{
    success: boolean
    error?: string
  }> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return {
        success: false,
        error: 'Session not found',
      }
    }

    const participant = session.participants.get(userId)
    if (!participant) {
      return {
        success: false,
        error: 'User not in session',
      }
    }

    // 释放所有锁
    for (const nodeId of participant.lockedNodes) {
      this.releaseLock(nodeId, userId)
    }

    // 移除参与者
    session.participants.delete(userId)
    session.lastActivity = new Date()

    // 触发事件
    this.emitEvent({
      type: 'user_left',
      sessionId,
      roomId: session.roomId,
      userId,
      data: participant,
      timestamp: Date.now(),
    })

    logger.info('User left collaboration', {
      sessionId,
      userId,
      userName: participant.name,
      remainingParticipants: session.participants.size,
    })

    // 如果会话为空，销毁会话
    if (session.participants.size === 0) {
      this.destroySession(sessionId)
    }

    return {
      success: true,
    }
  }

  /**
   * 更新光标
   */
  updateCursor(
    sessionId: string,
    userId: string,
    cursor: CursorUpdate
  ): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    const participant = session.participants.get(userId)
    if (!participant) return false

    participant.cursor = cursor
    participant.lastActivity = new Date()
    session.lastActivity = new Date()

    // 触发事件
    this.emitEvent({
      type: 'cursor_updated',
      sessionId,
      roomId: session.roomId,
      userId,
      data: cursor,
      timestamp: Date.now(),
    })

    return true
  }

  /**
   * 更新选择
   */
  updateSelection(
    sessionId: string,
    userId: string,
    selection: SelectionUpdate
  ): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    const participant = session.participants.get(userId)
    if (!participant) return false

    participant.selection = selection
    participant.lastActivity = new Date()
    session.lastActivity = new Date()

    // 触发事件
    this.emitEvent({
      type: 'selection_updated',
      sessionId,
      roomId: session.roomId,
      userId,
      data: selection,
      timestamp: Date.now(),
    })

    return true
  }

  /**
   * 更新节点
   */
  async updateNode(
    sessionId: string,
    userId: string,
    nodeId: string,
    changes: Record<string, unknown>
  ): Promise<{
    success: boolean
    error?: string
  }> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return {
        success: false,
        error: 'Session not found',
      }
    }

    // 检查锁
    const lock = this.locks.get(nodeId)
    if (lock && lock.userId !== userId) {
      return {
        success: false,
        error: 'Node is locked by another user',
      }
    }

    // 更新节点
    const success = session.docManager.updateNode(nodeId, changes)

    if (success) {
      // 添加操作到同步协议
      const operation: CRDTOperation = {
        type: 'update',
        nodeId,
        userId,
        timestamp: Date.now(),
        data: changes,
      }
      session.syncProtocol.addOperation(operation)

      // 触发事件
      this.emitEvent({
        type: 'node_updated',
        sessionId,
        roomId: session.roomId,
        userId,
        data: { nodeId, changes },
        timestamp: Date.now(),
      })

      logger.debug('Node updated', {
        sessionId,
        userId,
        nodeId,
      })
    }

    return {
      success,
    }
  }

  /**
   * 删除节点
   */
  async deleteNode(
    sessionId: string,
    userId: string,
    nodeId: string
  ): Promise<{
    success: boolean
    error?: string
  }> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return {
        success: false,
        error: 'Session not found',
      }
    }

    // 检查锁
    const lock = this.locks.get(nodeId)
    if (lock && lock.userId !== userId) {
      return {
        success: false,
        error: 'Node is locked by another user',
      }
    }

    // 删除节点
    const success = session.docManager.deleteNode(nodeId)

    if (success) {
      // 添加操作到同步协议
      const operation: CRDTOperation = {
        type: 'delete',
        nodeId,
        userId,
        timestamp: Date.now(),
      }
      session.syncProtocol.addOperation(operation)

      // 释放锁
      this.releaseLock(nodeId, userId)

      // 触发事件
      this.emitEvent({
        type: 'node_deleted',
        sessionId,
        roomId: session.roomId,
        userId,
        data: { nodeId },
        timestamp: Date.now(),
      })

      logger.debug('Node deleted', {
        sessionId,
        userId,
        nodeId,
      })
    }

    return {
      success,
    }
  }

  /**
   * 移动节点
   */
  async moveNode(
    sessionId: string,
    userId: string,
    nodeId: string,
    position: { x: number; y: number }
  ): Promise<{
    success: boolean
    error?: string
  }> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return {
        success: false,
        error: 'Session not found',
      }
    }

    // 检查锁
    const lock = this.locks.get(nodeId)
    if (lock && lock.userId !== userId) {
      return {
        success: false,
        error: 'Node is locked by another user',
      }
    }

    // 移动节点
    const success = session.docManager.moveNode(nodeId, position)

    if (success) {
      // 添加操作到同步协议
      const operation: CRDTOperation = {
        type: 'move',
        nodeId,
        userId,
        timestamp: Date.now(),
        data: position,
      }
      session.syncProtocol.addOperation(operation)

      // 触发事件
      this.emitEvent({
        type: 'node_updated',
        sessionId,
        roomId: session.roomId,
        userId,
        data: { nodeId, position },
        timestamp: Date.now(),
      })

      logger.debug('Node moved', {
        sessionId,
        userId,
        nodeId,
        position,
      })
    }

    return {
      success,
    }
  }

  /**
   * 获取编辑锁
   */
  async acquireLock(
    sessionId: string,
    userId: string,
    nodeId: string
  ): Promise<{
    success: boolean
    error?: string
  }> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return {
        success: false,
        error: 'Session not found',
      }
    }

    const participant = session.participants.get(userId)
    if (!participant) {
      return {
        success: false,
        error: 'User not in session',
      }
    }

    // 检查是否已有锁
    const existingLock = this.locks.get(nodeId)
    if (existingLock) {
      // 检查是否已过期
      if (existingLock.expiresAt > Date.now()) {
        // 检查是否是同一用户
        if (existingLock.userId === userId) {
          // 续期
          existingLock.expiresAt = Date.now() + this.config.lockTimeout
          return {
            success: true,
          }
        }
        return {
          success: false,
          error: 'Node is locked by another user',
        }
      }
      // 锁已过期，删除
      this.locks.delete(nodeId)
    }

    // 创建新锁
    const lock: EditLock = {
      nodeId,
      userId,
      userName: participant.name,
      lockedAt: Date.now(),
      expiresAt: Date.now() + this.config.lockTimeout,
    }

    this.locks.set(nodeId, lock)
    participant.lockedNodes.add(nodeId)

    // 触发事件
    this.emitEvent({
      type: 'lock_acquired',
      sessionId,
      roomId: session.roomId,
      userId,
      data: { nodeId, lock },
      timestamp: Date.now(),
    })

    logger.debug('Lock acquired', {
      sessionId,
      userId,
      nodeId,
    })

    return {
      success: true,
    }
  }

  /**
   * 释放编辑锁
   */
  releaseLock(nodeId: string, userId: string): boolean {
    const lock = this.locks.get(nodeId)
    if (!lock) return false

    if (lock.userId !== userId) {
      logger.warn('Attempt to release lock owned by another user', {
        nodeId,
        userId,
        lockUserId: lock.userId,
      })
      return false
    }

    this.locks.delete(nodeId)

    // 从参与者的锁定节点中移除
    for (const session of this.sessions.values()) {
      const participant = session.participants.get(userId)
      if (participant) {
        participant.lockedNodes.delete(nodeId)
      }
    }

    // 触发事件
    this.emitEvent({
      type: 'lock_released',
      sessionId: '', // 需要查找会话
      roomId: '',
      userId,
      data: { nodeId },
      timestamp: Date.now(),
    })

    logger.debug('Lock released', {
      nodeId,
      userId,
    })

    return true
  }

  /**
   * 续期锁
   */
  renewLock(nodeId: string, userId: string): boolean {
    const lock = this.locks.get(nodeId)
    if (!lock) return false

    if (lock.userId !== userId) {
      return false
    }

    lock.expiresAt = Date.now() + this.config.lockTimeout

    logger.debug('Lock renewed', {
      nodeId,
      userId,
      newExpiresAt: lock.expiresAt,
    })

    return true
  }

  /**
   * 获取锁信息
   */
  getLock(nodeId: string): EditLock | undefined {
    return this.locks.get(nodeId)
  }

  /**
   * 获取所有锁
   */
  getAllLocks(): EditLock[] {
    return Array.from(this.locks.values())
  }

  /**
   * 清理过期锁
   */
  cleanupExpiredLocks(): void {
    const now = Date.now()
    const expiredLocks: EditLock[] = []

    for (const [nodeId, lock] of this.locks.entries()) {
      if (lock.expiresAt <= now) {
        expiredLocks.push(lock)
        this.locks.delete(nodeId)

        // 从参与者的锁定节点中移除
        for (const session of this.sessions.values()) {
          const participant = session.participants.get(lock.userId)
          if (participant) {
            participant.lockedNodes.delete(nodeId)
          }
        }

        // 触发事件
        this.emitEvent({
          type: 'lock_expired',
          sessionId: '',
          roomId: '',
          userId: lock.userId,
          data: { nodeId, lock },
          timestamp: Date.now(),
        })
      }
    }

    if (expiredLocks.length > 0) {
      logger.info('Expired locks cleaned up', {
        count: expiredLocks.length,
      })
    }
  }

  /**
   * 获取会话参与者
   */
  getParticipants(sessionId: string): CollaborationParticipant[] {
    const session = this.sessions.get(sessionId)
    return session ? Array.from(session.participants.values()) : []
  }

  /**
   * 获取参与者
   */
  getParticipant(sessionId: string, userId: string): CollaborationParticipant | undefined {
    const session = this.sessions.get(sessionId)
    return session?.participants.get(userId)
  }

  /**
   * 获取文档状态
   */
  getDocumentState(sessionId: string) {
    const session = this.sessions.get(sessionId)
    return session?.docManager.getState()
  }

  /**
   * 获取同步更新
   */
  getSyncUpdate(sessionId: string): Uint8Array | undefined {
    const session = this.sessions.get(sessionId)
    return session?.syncProtocol.createSyncUpdate()
  }

  /**
   * 应用同步更新
   */
  applySyncUpdate(sessionId: string, update: Uint8Array): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    session.syncProtocol.handleSyncUpdate({
      type: 'sync-update',
      sessionId,
      userId: '',
      data: update,
    })

    return true
  }

  /**
   * 注册事件回调
   */
  on(event: CollaborationEventType, callback: (event: CollaborationEvent) => void): void {
    this.eventCallbacks.set(event, callback)
  }

  /**
   * 触发事件
   */
  private emitEvent(event: CollaborationEvent): void {
    const callback = this.eventCallbacks.get(event.type)
    if (callback) {
      callback(event)
    }
  }

  /**
   * 销毁会话
   */
  destroySession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    // 清理所有锁
    for (const [nodeId, lock] of this.locks.entries()) {
      if (session.participants.has(lock.userId)) {
        this.locks.delete(nodeId)
      }
    }

    // 销毁文档管理器
    session.docManager.destroy()
    session.syncProtocol.destroy()

    // 移除会话
    this.sessions.delete(sessionId)

    logger.info('Collaboration session destroyed', {
      sessionId,
    })

    return true
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalSessions: number
    totalParticipants: number
    totalLocks: number
    sessionsByRoom: Record<string, number>
  } {
    const sessionsByRoom: Record<string, number> = {}
    let totalParticipants = 0

    for (const session of this.sessions.values()) {
      sessionsByRoom[session.roomId] = (sessionsByRoom[session.roomId] || 0) + 1
      totalParticipants += session.participants.size
    }

    return {
      totalSessions: this.sessions.size,
      totalParticipants,
      totalLocks: this.locks.size,
      sessionsByRoom,
    }
  }

  /**
   * 销毁所有会话
   */
  destroyAll(): void {
    for (const sessionId of this.sessions.keys()) {
      this.destroySession(sessionId)
    }
    this.locks.clear()
    this.eventCallbacks.clear()

    logger.info('Collaboration Manager destroyed')
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let collaborationManagerInstance: CollaborationManager | null = null

export function getCollaborationManager(
  config?: CollaborationConfig
): CollaborationManager {
  if (!collaborationManagerInstance) {
    collaborationManagerInstance = new CollaborationManager(config)
  }
  return collaborationManagerInstance
}

export function resetCollaborationManager(): void {
  if (collaborationManagerInstance) {
    collaborationManagerInstance.destroyAll()
  }
  collaborationManagerInstance = null
}

// ============================================================================
// Exports
// ============================================================================

export type {
  CollaborationSession,
  CollaborationParticipant,
  EditLock,
  CollaborationEvent,
  CollaborationConfig,
}