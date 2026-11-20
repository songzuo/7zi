// @ts-nocheck
/**
 * Collaboration Session Management
 *
 * 会话和参与者管理 - 创建/加入/离开协作会话
 */

import { logger } from '@/lib/logger'
import { getRoomManager, type RoomParticipant } from './rooms'
import { CRDTDocumentManager, SyncProtocol } from './crdt-sync'
import type {
  CollaborationSession,
  CollaborationParticipant,
  CollaborationEvent,
  CollaborationEventType,
} from './collab-types'

// ============================================================================
// Session Factory
// ============================================================================

/**
 * 创建新的协作会话
 */
export function createCollaborationSession(
  sessionId: string,
  roomId: string,
  userId: string
): CollaborationSession {
  const docManager = new CRDTDocumentManager(sessionId, userId)
  const syncProtocol = new SyncProtocol(sessionId, userId)

  const session: CollaborationSession = {
    id: sessionId,
    roomId,
    docManager,
    syncProtocol,
    participants: new Map(),
    createdAt: new Date(),
    lastActivity: new Date(),
  }

  logger.info('Collaboration session created', {
    sessionId,
    roomId,
    userId,
  })

  return session
}

// ============================================================================
// Participant Management
// ============================================================================

/**
 * 将参与者添加到会话
 */
export function addParticipantToSession(
  session: CollaborationSession,
  userId: string,
  userName: string,
  email?: string,
  avatar?: string,
  roomParticipant?: RoomParticipant
): CollaborationParticipant {
  const participant: CollaborationParticipant = {
    id: userId,
    name: userName,
    email,
    avatar,
    color: roomParticipant?.color ?? '#888888',
    isTyping: false,
    lastActivity: new Date(),
    lockedNodes: new Set(),
  }

  session.participants.set(userId, participant)
  session.lastActivity = new Date()

  logger.info('User joined collaboration', {
    sessionId: session.id,
    userId,
    userName,
    participantCount: session.participants.size,
  })

  return participant
}

/**
 * 从会话中移除参与者
 */
export function removeParticipantFromSession(
  session: CollaborationSession,
  userId: string
): CollaborationParticipant | undefined {
  const participant = session.participants.get(userId)
  if (!participant) return undefined

  session.participants.delete(userId)
  session.lastActivity = new Date()

  logger.info('User left collaboration', {
    sessionId: session.id,
    userId,
    userName: participant.name,
    remainingParticipants: session.participants.size,
  })

  return participant
}

/**
 * 检查用户是否在会话中
 */
export function isUserInSession(session: CollaborationSession, userId: string): boolean {
  return session.participants.has(userId)
}

/**
 * 获取会话参与者列表
 */
export function getSessionParticipants(
  session: CollaborationSession
): CollaborationParticipant[] {
  return Array.from(session.participants.values())
}

/**
 * 获取特定参与者
 */
export function getSessionParticipant(
  session: CollaborationSession,
  userId: string
): CollaborationParticipant | undefined {
  return session.participants.get(userId)
}

/**
 * 更新参与者活跃时间
 */
export function updateParticipantActivity(
  session: CollaborationSession,
  userId: string
): void {
  const participant = session.participants.get(userId)
  if (participant) {
    participant.lastActivity = new Date()
    session.lastActivity = new Date()
  }
}

/**
 * 更新参与者光标
 */
export function updateParticipantCursor(
  session: CollaborationSession,
  userId: string,
  cursor: { line: number; column: number }
): boolean {
  const participant = session.participants.get(userId)
  if (!participant) return false

  participant.cursor = cursor
  participant.lastActivity = new Date()
  session.lastActivity = new Date()
  return true
}

/**
 * 更新参与者选择
 */
export function updateParticipantSelection(
  session: CollaborationSession,
  userId: string,
  selection: { start: { line: number; column: number }; end: { line: number; column: number } }
): boolean {
  const participant = session.participants.get(userId)
  if (!participant) return false

  participant.selection = selection
  participant.lastActivity = new Date()
  session.lastActivity = new Date()
  return true
}

/**
 * 获取房间参与者信息（用于加入协作）
 */
export function getRoomParticipantInfo(
  roomId: string,
  userId: string
): { room: ReturnType<ReturnType<typeof getRoomManager>['get']>; participant: RoomParticipant | undefined } {
  const roomManager = getRoomManager()
  const room = roomManager.get(roomId)
  const participant = room?.participants.get(userId)
  return { room, participant }
}

/**
 * 创建协作事件
 */
export function createCollaborationEvent(
  type: CollaborationEventType,
  sessionId: string,
  roomId: string,
  userId?: string,
  data?: unknown
): CollaborationEvent {
  return {
    type,
    sessionId,
    roomId,
    userId,
    data,
    timestamp: Date.now(),
  }
}
