// @ts-nocheck
/**
 * Collaboration Manager
 *
 * 协作管理器 - 协调房间、CRDT 同步、冲突解决
 * 整合 WebSocket 房间管理和 CRDT 文档同步
 *
 * 模块化拆分:
 * - collab-types.ts    : 类型定义
 * - collab-session.ts   : 会话管理
 * - collab-lock.ts      : 锁管理
 * - collab-doc-sync.ts  : 文档同步
 */

import { logger } from '@/lib/logger'
import { getRoomManager } from './rooms'

// Import types
import type {
  CollaborationSession,
  CollaborationParticipant,
  EditLock,
  CollaborationEvent,
  CollaborationEventType,
  CollaborationConfig,
  CollaborationStats,
} from './collab-types'

// Import modules
import {
  createCollaborationSession,
  addParticipantToSession,
  removeParticipantFromSession,
  getRoomParticipantInfo,
  createCollaborationEvent,
} from './collab-session'

import {
  acquireLock,
  releaseLock as releaseLockFn,
  renewLock,
  getLockInfo,
  getAllLocksInfo,
  isNodeLockedByUser,
  cleanupExpiredLocks,
  cleanupSessionLocks,
  releaseAllUserLocks,
} from './collab-lock'

import {
  updateNode as updateNodeFn,
  deleteNode as deleteNodeFn,
  moveNode as moveNodeFn,
  updateCursor,
  updateSelection,
  getDocumentState,
  getSyncUpdate,
  applySyncUpdate,
} from './collab-doc-sync'

import type { CursorUpdate, SelectionUpdate } from './types'

// ============================================================================
// Collaboration Manager
// ============================================================================

/**
 * 协作管理器
 * 管理协作会话、参与者、锁、光标同步
 */
export class CollaborationManager {
  private roomManager: ReturnType<typeof getRoomManager>
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

  // ========================================================================
  // Session Management
  // ========================================================================

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

    // 使用 session 模块创建
    const session = createCollaborationSession(sessionId, roomId, userId)
    this.sessions.set(sessionId, session)

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
      return { success: false, error: 'Session not found' }
    }

    // 检查是否已加入
    if (session.participants.has(userId)) {
      const existing = session.participants.get(userId)!
      existing.lastActivity = new Date()
      return { success: true, session, participant: existing }
    }

    // 获取房间参与者信息
    const { room, participant: roomParticipant } = getRoomParticipantInfo(session.roomId, userId)
    if (!room) {
      return { success: false, error: 'Room not found' }
    }
    if (!roomParticipant) {
      return { success: false, error: 'User not in room' }
    }

    // 添加参与者
    const participant = addParticipantToSession(
      session,
      userId,
      userName,
      email,
      avatar,
      roomParticipant
    )

    // 触发事件
    this.emitEvent(
      createCollaborationEvent('user_joined', sessionId, session.roomId, userId, participant)
    )

    return { success: true, session, participant }
  }

  /**
   * 用户离开协作
   */
  async leaveCollaboration(
    sessionId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return { success: false, error: 'Session not found' }
    }

    const participant = session.participants.get(userId)
    if (!participant) {
      return { success: false, error: 'User not in session' }
    }

    // 释放所有锁
    releaseAllUserLocks(this.locks, this.sessions, userId)

    // 移除参与者
    removeParticipantFromSession(session, userId)

    // 触发事件
    this.emitEvent(
      createCollaborationEvent('user_left', sessionId, session.roomId, userId, participant)
    )

    // 如果会话为空，销毁会话
    if (session.participants.size === 0) {
      this.destroySession(sessionId)
    }

    return { success: true }
  }

  // ========================================================================
  // Cursor & Selection
  // ========================================================================

  /**
   * 更新光标
   */
  updateCursor(sessionId: string, userId: string, cursor: CursorUpdate): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    const event = updateCursor(session, userId, cursor)
    if (event) {
      this.emitEvent(event)
    }
    return true
  }

  /**
   * 更新选择
   */
  updateSelection(sessionId: string, userId: string, selection: SelectionUpdate): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    const event = updateSelection(session, userId, selection)
    if (event) {
      this.emitEvent(event)
    }
    return true
  }

  // ========================================================================
  // Node Operations
  // ========================================================================

  /**
   * 更新节点
   */
  async updateNode(
    sessionId: string,
    userId: string,
    nodeId: string,
    changes: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return { success: false, error: 'Session not found' }
    }

    // 检查锁
    if (isNodeLockedByUser(this.locks, nodeId, userId)) {
      const lock = getLockInfo(this.locks, nodeId)
      if (lock && lock.userId !== userId) {
        return { success: false, error: 'Node is locked by another user' }
      }
    }

    const { success } = updateNodeFn(session, userId, nodeId, changes)

    if (success) {
      this.emitEvent(
        createCollaborationEvent('node_updated', sessionId, session.roomId, userId, {
          nodeId,
          changes,
        })
      )
    }

    return { success }
  }

  /**
   * 删除节点
   */
  async deleteNode(
    sessionId: string,
    userId: string,
    nodeId: string
  ): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return { success: false, error: 'Session not found' }
    }

    // 检查锁
    if (isNodeLockedByUser(this.locks, nodeId, userId)) {
      const lock = getLockInfo(this.locks, nodeId)
      if (lock && lock.userId !== userId) {
        return { success: false, error: 'Node is locked by another user' }
      }
    }

    const { success } = deleteNodeFn(session, userId, nodeId, (nId, uId) => {
      releaseLockFn(this.locks, this.sessions, nId, uId)
    })

    if (success) {
      this.emitEvent(
        createCollaborationEvent('node_deleted', sessionId, session.roomId, userId, { nodeId })
      )
    }

    return { success }
  }

  /**
   * 移动节点
   */
  async moveNode(
    sessionId: string,
    userId: string,
    nodeId: string,
    position: { x: number; y: number }
  ): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return { success: false, error: 'Session not found' }
    }

    // 检查锁
    if (isNodeLockedByUser(this.locks, nodeId, userId)) {
      const lock = getLockInfo(this.locks, nodeId)
      if (lock && lock.userId !== userId) {
        return { success: false, error: 'Node is locked by another user' }
      }
    }

    const { success } = moveNodeFn(session, userId, nodeId, position)

    if (success) {
      this.emitEvent(
        createCollaborationEvent('node_updated', sessionId, session.roomId, userId, {
          nodeId,
          position,
        })
      )
    }

    return { success }
  }

  // ========================================================================
  // Lock Management
  // ========================================================================

  /**
   * 获取编辑锁
   */
  async acquireLock(
    sessionId: string,
    userId: string,
    nodeId: string
  ): Promise<{ success: boolean; error?: string }> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return { success: false, error: 'Session not found' }
    }

    const participant = session.participants.get(userId)
    if (!participant) {
      return { success: false, error: 'User not in session' }
    }

    const result = acquireLock(this.locks, session, userId, nodeId, this.config.lockTimeout)

    if (result.success) {
      const lock = getLockInfo(this.locks, nodeId)
      this.emitEvent(
        createCollaborationEvent('lock_acquired', sessionId, session.roomId, userId, {
          nodeId,
          lock,
        })
      )
    }

    return result
  }

  /**
   * 释放编辑锁
   */
  releaseLock(nodeId: string, userId: string): boolean {
    const result = releaseLockFn(this.locks, this.sessions, nodeId, userId)

    if (result) {
      this.emitEvent(
        createCollaborationEvent('lock_released', '', '', userId, { nodeId })
      )
    }

    return result
  }

  /**
   * 续期锁
   */
  renewLock(nodeId: string, userId: string): boolean {
    return renewLock(this.locks, nodeId, userId, this.config.lockTimeout)
  }

  /**
   * 获取锁信息
   */
  getLock(nodeId: string): EditLock | undefined {
    return getLockInfo(this.locks, nodeId)
  }

  /**
   * 获取所有锁
   */
  getAllLocks(): EditLock[] {
    return getAllLocksInfo(this.locks)
  }

  /**
   * 清理过期锁
   */
  cleanupExpiredLocks(): void {
    const { events } = cleanupExpiredLocks(this.locks, this.sessions)
    for (const event of events) {
      this.emitEvent(event)
    }
  }

  // ========================================================================
  // Participant Queries
  // ========================================================================

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
  getParticipant(
    sessionId: string,
    userId: string
  ): CollaborationParticipant | undefined {
    const session = this.sessions.get(sessionId)
    return session?.participants.get(userId)
  }

  // ========================================================================
  // Document State
  // ========================================================================

  /**
   * 获取文档状态
   */
  getDocumentState(sessionId: string) {
    const session = this.sessions.get(sessionId)
    return session ? getDocumentState(session) : undefined
  }

  /**
   * 获取同步更新
   */
  getSyncUpdate(sessionId: string): Uint8Array | undefined {
    const session = this.sessions.get(sessionId)
    return session ? getSyncUpdate(session) : undefined
  }

  /**
   * 应用同步更新
   */
  applySyncUpdate(sessionId: string, update: Uint8Array): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false
    return applySyncUpdate(session, update)
  }

  // ========================================================================
  // Event System
  // ========================================================================

  /**
   * 注册事件回调
   */
  on(
    event: CollaborationEventType,
    callback: (event: CollaborationEvent) => void
  ): void {
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

  // ========================================================================
  // Session Lifecycle
  // ========================================================================

  /**
   * 销毁会话
   */
  destroySession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    // 清理锁
    cleanupSessionLocks(this.locks, this.sessions, sessionId)

    // 销毁文档管理器
    session.docManager.destroy()
    session.syncProtocol.destroy()

    // 移除会话
    this.sessions.delete(sessionId)

    logger.info('Collaboration session destroyed', { sessionId })
    return true
  }

  /**
   * 获取统计信息
   */
  getStats(): CollaborationStats {
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
// Re-exports
// ============================================================================

export type {
  CollaborationSession,
  CollaborationParticipant,
  EditLock,
  CollaborationEvent,
  CollaborationConfig,
}
