/**
 * PresenceService - 用户存在感服务
 *
 * 管理多用户协作环境中的用户在线状态、心跳检测、
 * 会话管理和事件广播
 *
 * @module collaboration/presence-service
 * @version 1.0.0
 */

import {
  CollaborationUser,
  UserPresence,
  UserStatus,
  CollaborationSession,
  EditLock,
  LockResult,
  CollaborationConfig,
  DEFAULT_COLLABORATION_CONFIG,
  DEFAULT_LOCK_CONFIG,
  generateUserColor,
  createEditLock,
  isLockExpired,
  generateId,
  UserJoinedEvent,
  UserLeftEvent,
  LockAcquiredEvent,
  LockReleasedEvent,
  LockExpiredEvent,
} from './types'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 存在服务配置
 */
export interface PresenceServiceConfig extends Partial<CollaborationConfig> {
  /** 会话 ID */
  sessionId: string
  /** 工作流 ID */
  workflowId: string
  /** 租户 ID */
  tenantId: string
}

/**
 * 存在事件监听器
 */
export type PresenceEventListener = (event: PresenceEvent) => void

/**
 * 存在事件
 */
export type PresenceEvent =
  | UserJoinedEvent
  | UserLeftEvent
  | LockAcquiredEvent
  | LockReleasedEvent
  | LockExpiredEvent

/**
 * 心跳数据
 */
export interface HeartbeatData {
  /** 用户 ID */
  userId: string
  /** 时间戳 */
  timestamp: number
  /** 当前节点 ID（可选） */
  currentNodeId?: string
  /** 用户状态 */
  status?: UserStatus
}

/**
 * 广播函数类型
 */
export type BroadcastFunction = (event: PresenceEvent, excludeUserId?: string) => Promise<void>

// ============================================================================
// PresenceService 类
// ============================================================================

/**
 * 用户存在感服务
 *
 * 提供用户在线状态管理、编辑锁管理和事件广播
 *
 * @example
 * const presence = new PresenceService({
 *   sessionId: 'session-123',
 *   workflowId: 'workflow-456',
 *   tenantId: 'tenant-789',
 * });
 *
 * // 用户加入
 * presence.userJoined({
 *   id: 'user-123',
 *   name: 'Alice',
 * });
 *
 * // 获取锁
 * const result = await presence.acquireLock('node-1', 'user-123');
 *
 * // 心跳
 * presence.heartbeat({ userId: 'user-123', timestamp: Date.now() });
 *
 * // 用户离开
 * presence.userLeft('user-123');
 *
 * // 清理
 * presence.dispose();
 */
export class PresenceService {
  private config: CollaborationConfig
  private session: CollaborationSession

  // 用户状态
  private userPresences: Map<string, UserPresence> = new Map()

  // 编辑锁
  private locks: Map<string, EditLock> = new Map()
  private lockTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private renewTimers: Map<string, ReturnType<typeof setInterval>> = new Map()

  // 事件监听器
  private eventListeners: Set<PresenceEventListener> = new Set()

  // 广播函数
  private broadcastFn?: BroadcastFunction

  // 清理定时器
  private cleanupTimer?: ReturnType<typeof setInterval>

  constructor(config: PresenceServiceConfig) {
    this.config = {
      ...DEFAULT_COLLABORATION_CONFIG,
      ...config,
    }

    // 初始化会话
    this.session = {
      id: config.sessionId,
      workflowId: config.workflowId,
      tenantId: config.tenantId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      onlineUsers: [],
    }

    // 启动清理
    this.startCleanup()
  }

  // ========================================================================
  // 用户管理
  // ========================================================================

  /**
   * 用户加入会话
   *
   * @param user - 用户信息
   * @param sessionId - 会话 ID（可选，默认使用当前会话）
   */
  userJoined(
    user: Pick<CollaborationUser, 'id' | 'name'> & Partial<CollaborationUser>,
    sessionId?: string
  ): UserPresence {
    const fullUser: CollaborationUser = {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      color: user.color || generateUserColor(user.id),
      isOnline: true,
      lastActivity: Date.now(),
      currentNodeId: user.currentNodeId,
    }

    const presence: UserPresence = {
      user: fullUser,
      status: 'active',
      sessionId: sessionId || this.session.id,
      joinedAt: Date.now(),
      lastHeartbeat: Date.now(),
    }

    // 存储用户状态
    this.userPresences.set(user.id, presence)

    // 更新会话
    this.session.onlineUsers = Array.from(this.userPresences.keys())
    this.session.updatedAt = Date.now()

    // 触发事件
    const event: UserJoinedEvent = {
      type: 'user:joined',
      user: fullUser,
      sessionId: this.session.id,
      timestamp: Date.now(),
    }
    this.emitEvent(event)
    this.broadcast(event, user.id)

    return presence
  }

  /**
   * 用户离开会话
   *
   * @param userId - 用户 ID
   */
  userLeft(userId: string): { releasedLocks: string[] } {
    const presence = this.userPresences.get(userId)
    if (!presence) {
      return { releasedLocks: [] }
    }

    // 释放该用户持有的所有锁
    const releasedLocks: string[] = []
    Array.from(this.locks.entries()).forEach(([nodeId, lock]) => {
      if (lock.userId === userId) {
        this.releaseLock(nodeId, userId)
        releasedLocks.push(nodeId)
      }
    })

    // 移除用户状态
    this.userPresences.delete(userId)

    // 更新会话
    this.session.onlineUsers = this.session.onlineUsers.filter(id => id !== userId)
    this.session.updatedAt = Date.now()

    // 触发事件
    const event: UserLeftEvent = {
      type: 'user:left',
      userId,
      sessionId: this.session.id,
      timestamp: Date.now(),
      releasedLocks,
    }
    this.emitEvent(event)
    this.broadcast(event, userId)

    return { releasedLocks }
  }

  /**
   * 用户心跳
   *
   * @param data - 心跳数据
   */
  heartbeat(data: HeartbeatData): void {
    const presence = this.userPresences.get(data.userId)
    if (!presence) {
      console.warn(`[PresenceService] 未知用户心跳: ${data.userId}`)
      return
    }

    // 更新状态
    presence.lastHeartbeat = data.timestamp
    presence.status = data.status || 'active'
    if (data.currentNodeId) {
      presence.user.currentNodeId = data.currentNodeId
    }

    // 续期用户的锁
    this.renewUserLocks(data.userId)
  }

  /**
   * 更新用户状态
   *
   * @param userId - 用户 ID
   * @param status - 新状态
   */
  updateUserStatus(userId: string, status: UserStatus): void {
    const presence = this.userPresences.get(userId)
    if (!presence) {
      return
    }

    presence.status = status
    presence.lastHeartbeat = Date.now()
  }

  /**
   * 获取在线用户列表
   */
  getOnlineUsers(): CollaborationUser[] {
    return Array.from(this.userPresences.values())
      .filter(p => p.status !== 'offline')
      .map(p => p.user)
  }

  /**
   * 获取用户存在状态
   */
  getUserPresence(userId: string): UserPresence | undefined {
    return this.userPresences.get(userId)
  }

  /**
   * 获取所有用户存在状态
   */
  getAllUserPresences(): Map<string, UserPresence> {
    return new Map(this.userPresences)
  }

  // ========================================================================
  // 编辑锁管理
  // ========================================================================

  /**
   * 获取编辑锁
   *
   * @param nodeId - 节点 ID
   * @param userId - 用户 ID
   */
  async acquireLock(nodeId: string, userId: string): Promise<LockResult> {
    const presence = this.userPresences.get(userId)
    if (!presence) {
      return {
        success: false,
        error: '用户未加入会话',
      }
    }

    // 检查现有锁
    const existingLock = this.locks.get(nodeId)
    if (existingLock) {
      // 如果是同一用户，续期
      if (existingLock.userId === userId) {
        this.renewLock(nodeId)
        return { success: true, lock: existingLock }
      }

      // 检查是否过期
      if (!isLockExpired(existingLock)) {
        return {
          success: false,
          error: '节点已被锁定',
          currentHolder: {
            userId: existingLock.userId,
            userName: existingLock.userName,
          },
        }
      }

      // 清除过期锁
      this.clearLockTimer(nodeId)
      this.locks.delete(nodeId)
    }

    // 创建新锁
    const lock = createEditLock(
      nodeId,
      userId,
      presence.user.name,
      this.config.lockConfig.lockTimeout
    )

    this.locks.set(nodeId, lock)

    // 设置过期定时器
    this.setLockExpiryTimer(nodeId)

    // 触发事件
    const event: LockAcquiredEvent = {
      type: 'lock:acquired',
      lock,
      sessionId: this.session.id,
      timestamp: Date.now(),
    }
    this.emitEvent(event)
    this.broadcast(event)

    return { success: true, lock }
  }

  /**
   * 释放编辑锁
   *
   * @param nodeId - 节点 ID
   * @param userId - 用户 ID
   */
  releaseLock(nodeId: string, userId: string): LockResult {
    const lock = this.locks.get(nodeId)

    if (!lock) {
      return { success: true } // 锁不存在，视为成功
    }

    // 检查所有权
    if (lock.userId !== userId) {
      return {
        success: false,
        error: '只能释放自己持有的锁',
        currentHolder: {
          userId: lock.userId,
          userName: lock.userName,
        },
      }
    }

    // 清除定时器
    this.clearLockTimer(nodeId)

    // 移除锁
    this.locks.delete(nodeId)

    // 触发事件
    const event: LockReleasedEvent = {
      type: 'lock:released',
      nodeId,
      userId,
      sessionId: this.session.id,
      timestamp: Date.now(),
    }
    this.emitEvent(event)
    this.broadcast(event)

    return { success: true }
  }

  /**
   * 续期锁
   *
   * @param nodeId - 节点 ID
   */
  renewLock(nodeId: string): boolean {
    const lock = this.locks.get(nodeId)
    if (!lock || isLockExpired(lock)) {
      return false
    }

    // 更新过期时间
    lock.expiresAt = Date.now() + this.config.lockConfig.lockTimeout

    // 重置过期定时器
    this.setLockExpiryTimer(nodeId)

    return true
  }

  /**
   * 强制释放锁（管理员操作）
   *
   * @param nodeId - 节点 ID
   */
  forceReleaseLock(nodeId: string): boolean {
    const lock = this.locks.get(nodeId)
    if (!lock) {
      return false
    }

    // 清除定时器
    this.clearLockTimer(nodeId)

    // 移除锁
    this.locks.delete(nodeId)

    // 触发事件
    const event: LockExpiredEvent = {
      type: 'lock:expired',
      nodeId,
      previousHolder: lock.userId,
      sessionId: this.session.id,
      timestamp: Date.now(),
    }
    this.emitEvent(event)
    this.broadcast(event)

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
  getAllLocks(): Map<string, EditLock> {
    return new Map(this.locks)
  }

  /**
   * 检查节点是否被锁定
   */
  isLocked(nodeId: string): boolean {
    const lock = this.locks.get(nodeId)
    return lock !== undefined && !isLockExpired(lock)
  }

  /**
   * 检查用户是否持有锁
   */
  isHeldBy(nodeId: string, userId: string): boolean {
    const lock = this.locks.get(nodeId)
    return lock !== undefined && lock.userId === userId && !isLockExpired(lock)
  }

  // ========================================================================
  // 事件管理
  // ========================================================================

  /**
   * 添加事件监听器
   */
  addEventListener(listener: PresenceEventListener): () => void {
    this.eventListeners.add(listener)
    return () => {
      this.eventListeners.delete(listener)
    }
  }

  /**
   * 设置广播函数
   */
  setBroadcastFunction(fn: BroadcastFunction): void {
    this.broadcastFn = fn
  }

  // ========================================================================
  // 会话管理
  // ========================================================================

  /**
   * 获取会话信息
   */
  getSession(): CollaborationSession {
    return { ...this.session }
  }

  /**
   * 获取会话 ID
   */
  getSessionId(): string {
    return this.session.id
  }

  // ========================================================================
  // 清理和资源释放
  // ========================================================================

  /**
   * 释放所有资源
   */
  dispose(): void {
    // 停止清理
    this.stopCleanup()

    // 清除所有锁定时器
    Array.from(this.lockTimers.keys()).forEach(nodeId => {
      this.clearLockTimer(nodeId)
    })

    // 清除续期定时器
    Array.from(this.renewTimers.values()).forEach(timer => {
      clearInterval(timer)
    })
    this.renewTimers.clear()

    // 清理状态
    this.userPresences.clear()
    this.locks.clear()
    this.eventListeners.clear()
  }

  // ========================================================================
  // 私有方法
  // ========================================================================

  /**
   * 设置锁过期定时器
   */
  private setLockExpiryTimer(nodeId: string): void {
    // 清除现有定时器
    this.clearLockTimer(nodeId)

    const lock = this.locks.get(nodeId)
    if (!lock) {
      return
    }

    const timeToExpiry = lock.expiresAt - Date.now()

    this.lockTimers.set(
      nodeId,
      setTimeout(() => {
        this.handleLockExpiry(nodeId)
      }, timeToExpiry)
    )
  }

  /**
   * 清除锁定时器
   */
  private clearLockTimer(nodeId: string): void {
    const timer = this.lockTimers.get(nodeId)
    if (timer) {
      clearTimeout(timer)
      this.lockTimers.delete(nodeId)
    }
  }

  /**
   * 处理锁过期
   */
  private handleLockExpiry(nodeId: string): void {
    const lock = this.locks.get(nodeId)
    if (!lock) {
      return
    }

    // 移除锁
    this.locks.delete(nodeId)
    this.lockTimers.delete(nodeId)

    // 触发事件
    const event: LockExpiredEvent = {
      type: 'lock:expired',
      nodeId,
      previousHolder: lock.userId,
      sessionId: this.session.id,
      timestamp: Date.now(),
    }
    this.emitEvent(event)
    this.broadcast(event)
  }

  /**
   * 续期用户持有的所有锁
   */
  private renewUserLocks(userId: string): void {
    Array.from(this.locks.entries()).forEach(([nodeId, lock]) => {
      if (lock.userId === userId && !isLockExpired(lock)) {
        this.renewLock(nodeId)
      }
    })
  }

  /**
   * 启动清理定时器
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOfflineUsers()
    }, this.config.offlineTimeout / 2)
  }

  /**
   * 停止清理定时器
   */
  private stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
  }

  /**
   * 清理离线用户
   */
  private cleanupOfflineUsers(): void {
    const now = Date.now()
    const toRemove: string[] = []

    Array.from(this.userPresences.entries()).forEach(([userId, presence]) => {
      if (now - presence.lastHeartbeat > this.config.offlineTimeout) {
        toRemove.push(userId)
      }
    })

    for (const userId of toRemove) {
      this.userLeft(userId)
    }
  }

  /**
   * 触发事件
   */
  private emitEvent(event: PresenceEvent): void {
    Array.from(this.eventListeners).forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('[PresenceService] 事件监听器错误:', error)
      }
    })
  }

  /**
   * 广播事件
   */
  private async broadcast(event: PresenceEvent, excludeUserId?: string): Promise<void> {
    if (this.broadcastFn) {
      try {
        await this.broadcastFn(event, excludeUserId)
      } catch (error) {
        console.error('[PresenceService] 广播错误:', error)
      }
    }
  }
}

// ============================================================================
// 导出
// ============================================================================

export default PresenceService
