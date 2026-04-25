// @ts-nocheck
/**
 * Collaboration Types
 *
 * 类型定义 - 协作系统的所有 TypeScript 接口和类型
 */

import type {
  CRDTDocumentManager,
  SyncProtocol,
  ConflictResolutionStrategy,
} from './crdt-sync'
import type { CursorUpdate, SelectionUpdate } from './types'

// ============================================================================
// Session & Participant Types
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

// ============================================================================
// Lock Types
// ============================================================================

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

// ============================================================================
// Event Types
// ============================================================================

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

// ============================================================================
// Config Types
// ============================================================================

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
// Stats Types
// ============================================================================

/**
 * 协作统计信息
 */
export interface CollaborationStats {
  totalSessions: number
  totalParticipants: number
  totalLocks: number
  sessionsByRoom: Record<string, number>
}

// ============================================================================
// Re-export
// ============================================================================

export type {
  CollaborationSession,
  CollaborationParticipant,
  EditLock,
  CollaborationEvent,
  CollaborationEventType,
  CollaborationConfig,
  CollaborationStats,
}
