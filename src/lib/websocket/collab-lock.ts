// @ts-nocheck
/**
 * Collaboration Lock Management
 *
 * 编辑锁管理 - 获取/释放/续期/清理过期锁
 */

import { logger } from '@/lib/logger'
import type { EditLock, CollaborationEvent } from './collab-types'
import type { CollaborationSession } from './collab-types'

// ============================================================================
// Lock Acquisition
// ============================================================================

/**
 * 尝试获取编辑锁
 */
export function acquireLock(
  locks: Map<string, EditLock>,
  session: CollaborationSession,
  userId: string,
  nodeId: string,
  lockTimeout: number
): { success: boolean; error?: string } {
  // 检查是否已有锁
  const existingLock = locks.get(nodeId)

  if (existingLock) {
    // 检查是否已过期
    if (existingLock.expiresAt > Date.now()) {
      // 检查是否是同一用户
      if (existingLock.userId === userId) {
        // 续期
        existingLock.expiresAt = Date.now() + lockTimeout
        return { success: true }
      }
      return { success: false, error: 'Node is locked by another user' }
    }
    // 锁已过期，删除
    locks.delete(nodeId)
  }

  // 获取参与者名称
  const participant = session.participants.get(userId)
  if (!participant) {
    return { success: false, error: 'User not in session' }
  }

  // 创建新锁
  const lock: EditLock = {
    nodeId,
    userId,
    userName: participant.name,
    lockedAt: Date.now(),
    expiresAt: Date.now() + lockTimeout,
  }

  locks.set(nodeId, lock)
  participant.lockedNodes.add(nodeId)

  logger.debug('Lock acquired', {
    sessionId: session.id,
    userId,
    nodeId,
  })

  return { success: true }
}

// ============================================================================
// Lock Release
// ============================================================================

/**
 * 释放编辑锁
 */
export function releaseLock(
  locks: Map<string, EditLock>,
  sessions: Map<string, CollaborationSession>,
  nodeId: string,
  userId: string
): boolean {
  const lock = locks.get(nodeId)
  if (!lock) return false

  if (lock.userId !== userId) {
    logger.warn('Attempt to release lock owned by another user', {
      nodeId,
      userId,
      lockUserId: lock.userId,
    })
    return false
  }

  locks.delete(nodeId)

  // 从参与者的锁定节点中移除
  for (const session of sessions.values()) {
    const participant = session.participants.get(userId)
    if (participant) {
      participant.lockedNodes.delete(nodeId)
    }
  }

  logger.debug('Lock released', {
    nodeId,
    userId,
  })

  return true
}

// ============================================================================
// Lock Renewal
// ============================================================================

/**
 * 续期编辑锁
 */
export function renewLock(
  locks: Map<string, EditLock>,
  nodeId: string,
  userId: string,
  lockTimeout: number
): boolean {
  const lock = locks.get(nodeId)
  if (!lock) return false

  if (lock.userId !== userId) {
    return false
  }

  lock.expiresAt = Date.now() + lockTimeout

  logger.debug('Lock renewed', {
    nodeId,
    userId,
    newExpiresAt: lock.expiresAt,
  })

  return true
}

// ============================================================================
// Lock Queries
// ============================================================================

/**
 * 获取锁信息
 */
export function getLockInfo(locks: Map<string, EditLock>, nodeId: string): EditLock | undefined {
  return locks.get(nodeId)
}

/**
 * 获取所有锁
 */
export function getAllLocksInfo(locks: Map<string, EditLock>): EditLock[] {
  return Array.from(locks.values())
}

/**
 * 检查节点是否被锁定
 */
export function isNodeLocked(locks: Map<string, EditLock>, nodeId: string): boolean {
  const lock = locks.get(nodeId)
  if (!lock) return false
  return lock.expiresAt > Date.now()
}

/**
 * 检查节点是否被特定用户锁定
 */
export function isNodeLockedByUser(
  locks: Map<string, EditLock>,
  nodeId: string,
  userId: string
): boolean {
  const lock = locks.get(nodeId)
  if (!lock) return false
  return lock.expiresAt > Date.now() && lock.userId === userId
}

/**
 * 获取用户持有的所有锁
 */
export function getUserLocks(
  locks: Map<string, EditLock>,
  sessions: Map<string, CollaborationSession>,
  userId: string
): EditLock[] {
  const userLocks: EditLock[] = []

  for (const lock of locks.values()) {
    if (lock.userId === userId) {
      userLocks.push(lock)
    }
  }

  return userLocks
}

// ============================================================================
// Lock Cleanup
// ============================================================================

/**
 * 清理过期锁
 */
export function cleanupExpiredLocks(
  locks: Map<string, EditLock>,
  sessions: Map<string, CollaborationSession>
): { cleaned: EditLock[]; events: CollaborationEvent[] } {
  const now = Date.now()
  const cleaned: EditLock[] = []
  const events: CollaborationEvent[] = []

  for (const [nodeId, lock] of locks.entries()) {
    if (lock.expiresAt <= now) {
      cleaned.push(lock)
      locks.delete(nodeId)

      // 从参与者的锁定节点中移除
      for (const session of sessions.values()) {
        const participant = session.participants.get(lock.userId)
        if (participant) {
          participant.lockedNodes.delete(nodeId)
        }
      }

      // 创建过期事件
      events.push({
        type: 'lock_expired',
        sessionId: '',
        roomId: '',
        userId: lock.userId,
        data: { nodeId, lock },
        timestamp: Date.now(),
      })
    }
  }

  if (cleaned.length > 0) {
    logger.info('Expired locks cleaned up', {
      count: cleaned.length,
    })
  }

  return { cleaned, events }
}

/**
 * 清理会话相关的所有锁
 */
export function cleanupSessionLocks(
  locks: Map<string, EditLock>,
  sessions: Map<string, CollaborationSession>,
  sessionId: string
): void {
  const session = sessions.get(sessionId)
  if (!session) return

  for (const [nodeId, lock] of locks.entries()) {
    if (session.participants.has(lock.userId)) {
      locks.delete(nodeId)
    }
  }
}

/**
 * 释放用户所有锁
 */
export function releaseAllUserLocks(
  locks: Map<string, EditLock>,
  sessions: Map<string, CollaborationSession>,
  userId: string
): string[] {
  const releasedNodeIds: string[] = []

  for (const [nodeId, lock] of locks.entries()) {
    if (lock.userId === userId) {
      locks.delete(nodeId)
      releasedNodeIds.push(nodeId)
    }
  }

  // 从参与者的锁定节点中移除
  for (const session of sessions.values()) {
    const participant = session.participants.get(userId)
    if (participant) {
      for (const nodeId of releasedNodeIds) {
        participant.lockedNodes.delete(nodeId)
      }
    }
  }

  return releasedNodeIds
}
