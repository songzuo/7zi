/**
 * WebSocket 类型定义
 *
 * 版本: 1.12.2
 * 更新日期: 2026-04-04
 */

import type { CompressionConfig, CompressionStats } from '../websocket-compression'

/**
 * Message queue item
 */
export interface QueuedMessage {
  id: string
  event: string
  data: unknown
  timestamp: number
  retryCount: number
}

/**
 * Connection manager options
 */
export interface WebSocketManagerOptions {
  url: string
  autoConnect?: boolean
  transports?: ('websocket' | 'polling')[]
  heartbeatInterval?: number
  heartbeatTimeout?: number
  reconnectionDelay?: number
  reconnectionDelayMax?: number
  reconnectionAttempts?: number
  maxQueueSize?: number
  queueExpiry?: number
  auth?: Record<string, unknown>
  /** 消息压缩配置 */
  compression?: Partial<CompressionConfig>
}

/**
 * Connection statistics
 */
export interface ConnectionStats {
  messagesSent: number
  messagesReceived: number
  totalReconnections: number
  lastActiveTime: number
  lastPingTime: number
  currentPingLatency: number
  averagePingLatency: number
  /** 压缩统计 */
  compression?: CompressionStats & { compressionRatio: number }
  /** 连接质量指标 */
  connectionQuality?: ConnectionQuality
}

/**
 * Connection quality metrics (v1.12.2 enhanced)
 */
export interface ConnectionQuality {
  latencyScore: number // 0-100
  stabilityScore: number // 0-100
  packetLossEstimate: number // 0-1 (0% to 100%)
  qualityLevel: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  /** 综合评分 */
  overallScore: number // 0-100
  /** 上次更新时间 */
  lastUpdated: number
}

/**
 * Reconnection history record (v1.12.2 new)
 */
export interface ReconnectionRecord {
  id: string
  timestamp: number
  attempt: number
  reason: string
  previousState: ConnectionState
  result: 'success' | 'failed' | 'aborted'
  latency?: number
  duration?: number // ms
  error?: string
}

/**
 * Connection state persistence (v1.12.2 new)
 */
export interface PersistedConnectionState {
  /** 最后连接的 URL */
  url: string
  /** 最后活跃时间 */
  lastActiveTime: number
  /** 最后连接时间 */
  lastConnectedTime: number
  /** 最后断开时间 */
  lastDisconnectedTime: number
  /** 最后连接质量 */
  lastConnectionQuality: ConnectionQuality | null
  /** 重连历史 (最近 20 条) */
  recentReconnections: ReconnectionRecord[]
  /** 会话 ID */
  sessionId: string
  /** 总重连次数 */
  totalReconnections: number
  /** 总连接次数 */
  totalConnections: number
}

/**
 * Quality alert configuration (v1.12.2 new)
 */
export interface QualityAlertConfig {
  /** 触发告警的质量级别阈值 */
  triggerLevel: ConnectionQuality['qualityLevel']
  /** 告警回调 */
  onAlert: (quality: ConnectionQuality, previousQuality: ConnectionQuality | null) => void
  /** 恢复回调 */
  onRecovered?: (quality: ConnectionQuality) => void
  /** 是否只触发一次 (冷却期内) */
  singleAlert: boolean
  /** 冷却时间 (ms) */
  cooldownMs: number
}

/**
 * Health check result (v1.12.2 new)
 */
export interface HealthCheckResult {
  healthy: boolean
  issues: string[]
  timestamp: number
  details: {
    latency: number
    lastPingDiff: number
    missedHeartbeats: number
    state: ConnectionState
    qualityLevel: ConnectionQuality['qualityLevel']
    overallScore: number
  }
}

/**
 * Connection state listener
 */
export type ConnectionStateListener = (
  state: ConnectionState,
  previousState: ConnectionState
) => void

/**
 * Message listener
 */
export type MessageListener = (event: string, data: unknown) => void

/**
 * Reconnection strategy
 */
export interface ReconnectionStrategy {
  shouldReconnect: boolean
  initialDelay: number
  maxAttempts: number
  reason: string
}

// Re-export ConnectionState from constants
export { ConnectionState } from './constants'
