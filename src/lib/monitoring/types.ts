// @ts-nocheck
/**
 * Monitoring Types
 * 监控模块类型定义
 */

/**
 * WebSocket 监控指标
 */
export interface WebSocketMetrics {
  /** 连接时间 (ms) */
  connectTime: number
  /** 当前延迟 (ms) */
  latency: number
  /** 重连次数 */
  reconnectCount: number
  /** 消息计数 */
  messageCount: number
  /** 错误计数 */
  errorCount: number
  /** 最后心跳时间 */
  lastHeartbeat?: number
  /** 连接状态 */
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
  /** 平均延迟 (ms) */
  avgLatency?: number
  /** 最大延迟 (ms) */
  maxLatency?: number
  /** 最小延迟 (ms) */
  minLatency?: number
}

/**
 * WebSocket 监控配置
 */
export interface WebSocketMonitorConfig {
  /** Ping 间隔 (ms), 默认 5000 */
  pingInterval?: number
  /** 延迟阈值 - 警告 (ms), 默认 200 */
  latencyWarningThreshold?: number
  /** 延迟阈值 - 严重 (ms), 默认 500 */
  latencyCriticalThreshold?: number
  /** 是否启用自动上报, 默认 true */
  autoReport?: boolean
  /** 是否记录详细日志, 默认 false */
  verbose?: boolean
  /** 历史记录最大长度, 默认 100 */
  maxHistoryLength?: number
}

/**
 * WebSocket 连接事件
 */
export interface WebSocketEvent {
  type: 'connect' | 'disconnect' | 'reconnect' | 'error' | 'latency' | 'message'
  timestamp: number
  namespace: string
  data?: Record<string, unknown>
}

/**
 * 延迟记录
 */
export interface LatencyRecord {
  timestamp: number
  latency: number
  namespace: string
}

/**
 * WebSocket 监控统计
 */
export interface WebSocketMonitorStats {
  /** 总连接数 */
  totalConnections: number
  /** 当前活跃连接数 */
  activeConnections: number
  /** 总重连次数 */
  totalReconnects: number
  /** 总错误次数 */
  totalErrors: number
  /** 总消息数 */
  totalMessages: number
  /** 平均延迟 */
  avgLatency: number
  /** 最大延迟 */
  maxLatency: number
  /** 最小延迟 */
  minLatency: number
  /** 命名空间统计 */
  namespaces: Map<string, WebSocketMetrics>
}

/**
 * 默认 WebSocket 监控配置
 */
export const DEFAULT_WEBSOCKET_MONITOR_CONFIG: Required<WebSocketMonitorConfig> = {
  pingInterval: 5000,
  latencyWarningThreshold: 200,
  latencyCriticalThreshold: 500,
  autoReport: true,
  verbose: false,
  maxHistoryLength: 100,
}
