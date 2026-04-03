/**
 * 协作系统基础类型定义
 * 
 * 本文件定义了实时协作系统所需的所有核心类型
 * 支持 CRDT (Yjs) 架构，多用户编辑和光标同步
 * 
 * @module collaboration/types
 * @version 1.0.0
 */

// ============================================================================
// 用户相关类型
// ============================================================================

/**
 * 协作用户信息
 */
export interface CollaborationUser {
  /** 用户唯一标识 */
  id: string;
  /** 用户显示名称 */
  name: string;
  /** 用户头像 URL */
  avatar?: string;
  /** 用户颜色标识（用于区分不同用户） */
  color: string;
  /** 是否在线 */
  isOnline: boolean;
  /** 最后活动时间戳 */
  lastActivity: number;
  /** 当前正在编辑的节点 ID */
  currentNodeId?: string;
}

/**
 * 用户状态
 */
export type UserStatus = 'active' | 'idle' | 'away' | 'offline';

/**
 * 用户存在状态
 */
export interface UserPresence {
  /** 用户信息 */
  user: CollaborationUser;
  /** 用户状态 */
  status: UserStatus;
  /** 当前会话 ID */
  sessionId: string;
  /** 加入时间 */
  joinedAt: number;
  /** 最后心跳时间 */
  lastHeartbeat: number;
}

// ============================================================================
// 光标相关类型
// ============================================================================

/**
 * 光标位置
 */
export interface CursorPosition {
  /** 光标所在节点 ID */
  nodeId?: string;
  /** 屏幕 X 坐标 */
  x: number;
  /** 屏幕 Y 坐标 */
  y: number;
  /** 选区信息（可选） */
  selection?: CursorSelection;
}

/**
 * 光标选区
 */
export interface CursorSelection {
  /** 选区起始位置 */
  start: number;
  /** 选区结束位置 */
  end: number;
}

/**
 * 光标状态（完整的远程光标信息）
 */
export interface CursorState {
  /** 光标位置 */
  cursor: CursorPosition;
  /** 用户信息 */
  user: {
    id: string;
    name: string;
    color: string;
    avatar?: string;
    isOnline?: boolean;
    lastActivity?: number;
  };
  /** 时间戳 */
  timestamp: number;
}

/**
 * 光标更新事件
 */
export interface CursorUpdateEvent {
  /** 更新类型 */
  type: 'move' | 'select' | 'hide';
  /** 用户 ID */
  userId: string;
  /** 新的光标位置 */
  position?: CursorPosition;
  /** 时间戳 */
  timestamp: number;
}

// ============================================================================
// 编辑锁相关类型
// ============================================================================

/**
 * 编辑锁
 */
export interface EditLock {
  /** 被锁定的节点 ID */
  nodeId: string;
  /** 持有锁的用户 ID */
  userId: string;
  /** 持有锁的用户名 */
  userName: string;
  /** 锁定时间 */
  lockedAt: number;
  /** 锁过期时间（30秒超时） */
  expiresAt: number;
}

/**
 * 锁操作结果
 */
export interface LockResult {
  /** 是否成功 */
  success: boolean;
  /** 锁信息（成功时返回） */
  lock?: EditLock;
  /** 错误信息（失败时返回） */
  error?: string;
  /** 当前持有者（如果锁被其他人持有） */
  currentHolder?: {
    userId: string;
    userName: string;
  };
}

/**
 * 锁过期配置
 */
export interface LockConfig {
  /** 锁超时时间（毫秒），默认 30000 */
  lockTimeout: number;
  /** 自动续期间隔（毫秒），默认 10000 */
  renewInterval: number;
  /** 最大等待时间（毫秒），默认 5000 */
  maxWaitTime: number;
}

/**
 * 默认锁配置
 */
export const DEFAULT_LOCK_CONFIG: LockConfig = {
  lockTimeout: 30000,
  renewInterval: 10000,
  maxWaitTime: 5000,
};

// ============================================================================
// 会话相关类型
// ============================================================================

/**
 * 协作会话
 */
export interface CollaborationSession {
  /** 会话唯一标识 */
  id: string;
  /** 关联的工作流 ID */
  workflowId: string;
  /** 租户 ID */
  tenantId: string;
  /** 创建时间 */
  createdAt: number;
  /** 最后更新时间 */
  updatedAt: number;
  /** 过期时间（可选，用于空闲会话清理） */
  expiresAt?: number;
  /** 在线用户列表 */
  onlineUsers: string[];
}

/**
 * 会话状态
 */
export type SessionState = 
  | 'creating'
  | 'active'
  | 'idle'
  | 'closed';

// ============================================================================
// 消息协议类型
// ============================================================================

/**
 * 协作消息类型
 */
export type CollaborationMessageType =
  | 'sync-step-1'    // 同步请求
  | 'sync-step-2'    // 同步响应
  | 'sync-update'    // 更新
  | 'awareness'      // 光标/状态
  | 'lock'           // 锁操作
  | 'presence'       // 用户存在
  | 'error';         // 错误

/**
 * 基础消息结构
 */
export interface BaseMessage {
  /** 消息类型 */
  type: CollaborationMessageType;
  /** 时间戳 */
  timestamp: number;
  /** 会话 ID */
  sessionId: string;
}

/**
 * 同步消息（Step 1 - 请求）
 */
export interface SyncStep1Message extends BaseMessage {
  type: 'sync-step-1';
  /** 客户端状态向量 */
  data: Uint8Array;
}

/**
 * 同步消息（Step 2 - 响应）
 */
export interface SyncStep2Message extends BaseMessage {
  type: 'sync-step-2';
  /** 服务端状态 */
  data: Uint8Array;
}

/**
 * 同步更新消息
 */
export interface SyncUpdateMessage extends BaseMessage {
  type: 'sync-update';
  /** 更新数据 */
  data: Uint8Array;
  /** 用户 ID */
  userId: string;
}

/**
 * Awareness 消息（光标/状态同步）
 */
export interface AwarenessMessage extends BaseMessage {
  type: 'awareness';
  /** Awareness 更新数据 */
  data: Uint8Array;
  /** 客户端 ID */
  clientId: number;
}

/**
 * 锁操作消息
 */
export interface LockMessage extends BaseMessage {
  type: 'lock';
  /** 操作类型 */
  action: 'acquire' | 'release' | 'renew';
  /** 节点 ID */
  nodeId: string;
  /** 用户 ID */
  userId: string;
}

/**
 * 用户存在消息
 */
export interface PresenceMessage extends BaseMessage {
  type: 'presence';
  /** 存在状态数据 */
  data: PresencePayload;
}

/**
 * 存在状态负载
 */
export interface PresencePayload {
  /** 用户 ID */
  userId: string;
  /** 用户名 */
  userName: string;
  /** 用户颜色 */
  color: string;
  /** 用户状态 */
  status: UserStatus;
  /** 当前节点 ID */
  currentNodeId?: string;
  /** 加入/离开标记 */
  event?: 'join' | 'leave';
}

/**
 * 错误消息
 */
export interface ErrorMessage extends BaseMessage {
  type: 'error';
  /** 错误代码 */
  code: string;
  /** 错误信息 */
  message: string;
  /** 详细信息 */
  details?: Record<string, unknown>;
}

/**
 * 所有协作消息的联合类型
 */
export type CollaborationMessage =
  | SyncStep1Message
  | SyncStep2Message
  | SyncUpdateMessage
  | AwarenessMessage
  | LockMessage
  | PresenceMessage
  | ErrorMessage;

// ============================================================================
// 事件类型
// ============================================================================

/**
 * 协作事件类型
 */
export type CollaborationEventType =
  | 'user:joined'
  | 'user:left'
  | 'user:activity'
  | 'cursor:move'
  | 'cursor:hide'
  | 'lock:acquired'
  | 'lock:released'
  | 'lock:expired'
  | 'session:created'
  | 'session:closed'
  | 'sync:complete'
  | 'error';

/**
 * 用户加入事件
 */
export interface UserJoinedEvent {
  type: 'user:joined';
  user: CollaborationUser;
  sessionId: string;
  timestamp: number;
}

/**
 * 用户离开事件
 */
export interface UserLeftEvent {
  type: 'user:left';
  userId: string;
  sessionId: string;
  timestamp: number;
  /** 是否释放了锁 */
  releasedLocks: string[];
}

/**
 * 用户活动事件
 */
export interface UserActivityEvent {
  type: 'user:activity';
  userId: string;
  sessionId: string;
  activity: 'edit' | 'move' | 'select' | 'idle';
  nodeId?: string;
  timestamp: number;
}

/**
 * 锁获取事件
 */
export interface LockAcquiredEvent {
  type: 'lock:acquired';
  lock: EditLock;
  sessionId: string;
  timestamp: number;
}

/**
 * 锁释放事件
 */
export interface LockReleasedEvent {
  type: 'lock:released';
  nodeId: string;
  userId: string;
  sessionId: string;
  timestamp: number;
}

/**
 * 锁过期事件
 */
export interface LockExpiredEvent {
  type: 'lock:expired';
  nodeId: string;
  previousHolder: string;
  sessionId: string;
  timestamp: number;
}

/**
 * 同步完成事件
 */
export interface SyncCompleteEvent {
  type: 'sync:complete';
  sessionId: string;
  documentSize: number;
  timestamp: number;
}

/**
 * 错误事件
 */
export interface ErrorEvent {
  type: 'error';
  code: string;
  message: string;
  sessionId?: string;
  userId?: string;
  timestamp: number;
}

/**
 * 所有协作事件的联合类型
 */
export type CollaborationEvent =
  | UserJoinedEvent
  | UserLeftEvent
  | UserActivityEvent
  | CursorUpdateEvent
  | LockAcquiredEvent
  | LockReleasedEvent
  | LockExpiredEvent
  | SyncCompleteEvent
  | ErrorEvent;

// ============================================================================
// 冲突解决类型
// ============================================================================

/**
 * 冲突类型
 */
export type ConflictType = 
  | 'edit-edit'      // 两个用户同时编辑同一节点
  | 'edit-delete'    // 一个编辑，另一个删除
  | 'move-delete';   // 一个移动，另一个删除

/**
 * 冲突信息
 */
export interface ConflictInfo {
  /** 冲突 ID */
  id: string;
  /** 冲突类型 */
  type: ConflictType;
  /** 冲突节点 ID */
  nodeId: string;
  /** 涉及的用户 */
  users: Array<{
    userId: string;
    operation: string;
    timestamp: number;
  }>;
  /** 检测时间 */
  detectedAt: number;
}

/**
 * 冲突解决策略
 */
export type ConflictResolutionStrategy = 
  | 'last-write-wins'    // 最后写入胜出
  | 'merge'              // 自动合并
  | 'delete-wins'        // 删除优先
  | 'manual';            // 人工解决

/**
 * 冲突解决结果
 */
export interface ConflictResolution {
  /** 冲突 ID */
  conflictId: string;
  /** 解决策略 */
  strategy: ConflictResolutionStrategy;
  /** 解决后的数据 */
  resolvedData?: unknown;
  /** 解决时间 */
  resolvedAt: number;
  /** 解决者（人工解决时） */
  resolvedBy?: string;
}

// ============================================================================
// 配置类型
// ============================================================================

/**
 * 协作系统配置
 */
export interface CollaborationConfig {
  /** 心跳间隔（毫秒） */
  heartbeatInterval: number;
  /** 用户离线超时（毫秒） */
  offlineTimeout: number;
  /** 光标同步节流时间（毫秒） */
  cursorThrottle: number;
  /** 最大光标移动距离（像素），用于过滤微小移动 */
  cursorMinDistance: number;
  /** 光标自动隐藏超时（毫秒） */
  cursorHideTimeout: number;
  /** 锁配置 */
  lockConfig: LockConfig;
  /** 是否启用离线支持 */
  enableOffline: boolean;
  /** 最大在线用户数 */
  maxOnlineUsers: number;
}

/**
 * 默认协作配置
 */
export const DEFAULT_COLLABORATION_CONFIG: CollaborationConfig = {
  heartbeatInterval: 15000,
  offlineTimeout: 60000,
  cursorThrottle: 16,      // ~60fps
  cursorMinDistance: 2,
  cursorHideTimeout: 5000,
  lockConfig: DEFAULT_LOCK_CONFIG,
  enableOffline: true,
  maxOnlineUsers: 50,
};

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 生成唯一 ID
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * 生成用户颜色
 */
export function generateUserColor(userId: string): string {
  const colors = [
    '#FF5733', '#33A1FF', '#33FF57', '#FF33F1',
    '#FFD700', '#00CED1', '#FF6347', '#9370DB',
    '#20B2AA', '#FF69B4', '#7B68EE', '#3CB371',
  ];
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash;
  }
  
  return colors[Math.abs(hash) % colors.length];
}

/**
 * 检查锁是否过期
 */
export function isLockExpired(lock: EditLock): boolean {
  return Date.now() > lock.expiresAt;
}

/**
 * 计算两点之间的距离
 */
export function calculateDistance(p1: CursorPosition, p2: CursorPosition): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 创建默认编辑锁
 */
export function createEditLock(
  nodeId: string,
  userId: string,
  userName: string,
  timeout: number = DEFAULT_LOCK_CONFIG.lockTimeout
): EditLock {
  const now = Date.now();
  return {
    nodeId,
    userId,
    userName,
    lockedAt: now,
    expiresAt: now + timeout,
  };
}
