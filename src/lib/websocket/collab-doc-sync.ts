// @ts-nocheck
/**
 * Collaboration Document Synchronization
 *
 * 文档同步 - 节点操作、光标同步、CRDT 操作
 */

import { logger } from '@/lib/logger'
import type {
  CollaborationSession,
  CollaborationParticipant,
  CollaborationEvent,
} from './collab-types'
import type { CRDTOperation } from './crdt-sync'

// ============================================================================
// Node Operations
// ============================================================================

/**
 * 更新节点
 */
export function updateNode(
  session: CollaborationSession,
  userId: string,
  nodeId: string,
  changes: Record<string, unknown>
): { success: boolean; error?: string } {
  // Lock check is handled at manager level

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

    logger.debug('Node updated', {
      sessionId: session.id,
      userId,
      nodeId,
    })
  }

  return { success }
}

/**
 * 删除节点
 */
export function deleteNode(
  session: CollaborationSession,
  userId: string,
  nodeId: string,
  releaseNodeLock?: (nodeId: string, userId: string) => void
): { success: boolean; error?: string } {
  // 检查锁
  // Lock check handled at manager level

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
    if (releaseNodeLock) {
      releaseNodeLock(nodeId, userId)
    }

    logger.debug('Node deleted', {
      sessionId: session.id,
      userId,
      nodeId,
    })
  }

  return { success }
}

/**
 * 移动节点
 */
export function moveNode(
  session: CollaborationSession,
  userId: string,
  nodeId: string,
  position: { x: number; y: number }
): { success: boolean; error?: string } {
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

    logger.debug('Node moved', {
      sessionId: session.id,
      userId,
      nodeId,
      position,
    })
  }

  return { success }
}

// ============================================================================
// Cursor & Selection Sync
// ============================================================================

/**
 * 更新光标
 */
export function updateCursor(
  session: CollaborationSession,
  userId: string,
  cursor: { line: number; column: number }
): CollaborationEvent | null {
  const participant = session.participants.get(userId)
  if (!participant) return null

  participant.cursor = cursor
  participant.lastActivity = new Date()
  session.lastActivity = new Date()

  return {
    type: 'cursor_updated',
    sessionId: session.id,
    roomId: session.roomId,
    userId,
    data: cursor,
    timestamp: Date.now(),
  }
}

/**
 * 更新选择
 */
export function updateSelection(
  session: CollaborationSession,
  userId: string,
  selection: { start: { line: number; column: number }; end: { line: number; column: number } }
): CollaborationEvent | null {
  const participant = session.participants.get(userId)
  if (!participant) return null

  participant.selection = selection
  participant.lastActivity = new Date()
  session.lastActivity = new Date()

  return {
    type: 'selection_updated',
    sessionId: session.id,
    roomId: session.roomId,
    userId,
    data: selection,
    timestamp: Date.now(),
  }
}

/**
 * 更新打字状态
 */
export function updateTypingStatus(
  session: CollaborationSession,
  userId: string,
  isTyping: boolean
): void {
  const participant = session.participants.get(userId)
  if (participant) {
    participant.isTyping = isTyping
    participant.lastActivity = new Date()
  }
}

// ============================================================================
// Document State
// ============================================================================

/**
 * 获取文档状态
 */
export function getDocumentState(session: CollaborationSession): unknown {
  return session.docManager.getState()
}

/**
 * 获取同步更新
 */
export function getSyncUpdate(session: CollaborationSession): Uint8Array | undefined {
  return session.syncProtocol.createSyncUpdate()
}

/**
 * 应用同步更新
 */
export function applySyncUpdate(
  session: CollaborationSession,
  update: Uint8Array
): boolean {
  session.syncProtocol.handleSyncUpdate({
    type: 'sync-update',
    sessionId: session.id,
    userId: '',
    data: update,
  })
  return true
}

/**
 * 获取文档版本
 */
export function getDocumentVersion(session: CollaborationSession): number {
  return session.docManager.getState()?.version ?? 0
}

// ============================================================================
// Participant Cursors
// ============================================================================

/**
 * 获取所有参与者的光标信息
 */
export function getParticipantCursors(
  session: CollaborationSession
): Array<{ userId: string; cursor?: { line: number; column: number } }> {
  const cursors: Array<{ userId: string; cursor?: { line: number; column: number } }> = []

  for (const [userId, participant] of session.participants) {
    if (participant.cursor) {
      cursors.push({
        userId,
        cursor: participant.cursor,
      })
    }
  }

  return cursors
}

/**
 * 获取所有参与者的选择信息
 */
export function getParticipantSelections(
  session: CollaborationSession
): Array<{
  userId: string
  selection?: { start: { line: number; column: number }; end: { line: number; column: number } }
}> {
  const selections: Array<{
    userId: string
    selection?: { start: { line: number; column: number }; end: { line: number; column: number } }
  }> = []

  for (const [userId, participant] of session.participants) {
    if (participant.selection) {
      selections.push({
        userId,
        selection: participant.selection,
      })
    }
  }

  return selections
}

/**
 * 获取活跃参与者（最近有活动的）
 */
export function getActiveParticipants(
  session: CollaborationSession,
  maxAgeMs: number = 60000
): CollaborationParticipant[] {
  const now = Date.now()
  const active: CollaborationParticipant[] = []

  for (const participant of session.participants.values()) {
    if (now - participant.lastActivity.getTime() < maxAgeMs) {
      active.push(participant)
    }
  }

  return active
}
