/**
 * 离线同步类型定义
 * @module lib/offline/types
 * @description 定义离线数据同步的核心类型
 */

/**
 * 同步操作类型
 */
export type SyncOperationType = 'create' | 'update' | 'delete'

/**
 * 同步状态
 */
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed'

/**
 * 待同步操作
 */
export interface PendingOperation {
  /** 操作 ID */
  id: string
  /** 操作类型 */
  type: SyncOperationType
  /** 实体类型（tasks, tags, preferences 等） */
  entityType: string
  /** 实体 ID */
  entityId: string
  /** 操作数据 */
  data: Record<string, unknown>
  /** 创建时间 */
  createdAt: Date
  /** 重试次数 */
  retryCount: number
  /** 最后错误信息 */
  lastError?: string
  /** 同步状态 */
  status: SyncStatus
}

/**
 * 同步队列
 */
export interface SyncQueue {
  /** 队列 ID */
  id: string
  /** 队列名称 */
  name: string
  /** 待处理操作 */
  operations: PendingOperation[]
  /** 最后同步时间 */
  lastSyncAt?: Date
  /** 是否正在同步 */
  isSyncing: boolean
}

/**
 * 离线存储数据
 */
export interface OfflineData<T = unknown> {
  /** 数据 ID */
  id: string
  /** 实体类型 */
  entityType: string
  /** 数据内容 */
  data: T
  /** 本地版本号 */
  localVersion: number
  /** 服务器版本号（用于冲突检测） */
  serverVersion?: number
  /** 最后更新时间 */
  updatedAt: Date
  /** 是否已同步 */
  synced: boolean
  /** 是否已删除（软删除） */
  deleted?: boolean
}

/**
 * 同步结果
 */
export interface SyncResult {
  /** 成功数量 */
  successCount: number
  /** 失败数量 */
  failedCount: number
  /** 冲突数量 */
  conflictCount: number
  /** 错误列表 */
  errors: SyncError[]
  /** 同步耗时（毫秒） */
  duration: number
}

/**
 * 同步错误
 */
export interface SyncError {
  /** 操作 ID */
  operationId: string
  /** 错误类型 */
  type: 'network' | 'conflict' | 'validation' | 'unknown'
  /** 错误信息 */
  message: string
  /** 时间戳 */
  timestamp: Date
}

/**
 * 网络状态
 */
export interface NetworkStatus {
  /** 是否在线 */
  isOnline: boolean
  /** 最后在线时间 */
  lastOnlineAt?: Date
  /** 最后离线时间 */
  lastOfflineAt?: Date
  /** 连接类型 */
  connectionType?: 'wifi' | 'cellular' | 'ethernet' | 'unknown'
  /** 下行速度（Mbps） */
  downlink?: number
  /** RTT（毫秒） */
  rtt?: number
}

/**
 * 同步配置
 */
export interface SyncConfig {
  /** 自动同步间隔（毫秒） */
  autoSyncInterval: number
  /** 最大重试次数 */
  maxRetryCount: number
  /** 重试延迟（毫秒） */
  retryDelay: number
  /** 批量同步大小 */
  batchSize: number
  /** 是否启用离线模式 */
  offlineEnabled: boolean
  /** 冲突解决策略 */
  conflictResolution: 'server-wins' | 'client-wins' | 'manual'
}

/**
 * 默认同步配置
 */
export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  autoSyncInterval: 30000, // 30 秒
  maxRetryCount: 3,
  retryDelay: 5000, // 5 秒
  batchSize: 50,
  offlineEnabled: true,
  conflictResolution: 'server-wins',
}

/**
 * 存储键名
 */
export const STORAGE_KEYS = {
  SYNC_QUEUE: 'offline-sync-queue',
  OFFLINE_DATA: 'offline-data',
  NETWORK_STATUS: 'network-status',
  SYNC_CONFIG: 'sync-config',
  LAST_SYNC: 'last-sync-timestamp',
} as const

/**
 * 支持离线的实体类型
 */
export const OFFLINE_ENTITIES = {
  TASKS: 'tasks',
  TAGS: 'tags',
  PREFERENCES: 'preferences',
  READ_RECEIPTS: 'read-receipts',
  USER_ACTIVITY: 'user-activity',
} as const

export type OfflineEntityType = (typeof OFFLINE_ENTITIES)[keyof typeof OFFLINE_ENTITIES]
