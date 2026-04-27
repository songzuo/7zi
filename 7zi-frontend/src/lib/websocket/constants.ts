/**
 * WebSocket 常量配置
 *
 * 版本: 1.12.2
 * 更新日期: 2026-04-04
 */

/**
 * Connection states
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

/**
 * 默认重连策略
 */
export const DEFAULT_RECONNECTION_CONFIG = {
  delay: 1000, // Start with 1 second
  delayMax: 30000, // Max 30 seconds
  attempts: Infinity,
}

/**
 * 默认心跳配置
 */
export const DEFAULT_HEARTBEAT_CONFIG = {
  interval: 25000, // 25 seconds (matches server)
  timeout: 10000, // 10 seconds (server pingTimeout: 60s, so 25s + 10s < 60s is safe)
}

/**
 * 默认队列配置
 */
export const DEFAULT_QUEUE_CONFIG = {
  maxSize: 100,
  expiry: 300000, // 5 minutes
}

/**
 * 默认传输方式
 */
export const DEFAULT_TRANSPORTS: ('websocket' | 'polling')[] = ['websocket', 'polling']

/**
 * 质量检查间隔
 */
export const QUALITY_CHECK_INTERVAL = 10000 // 10 seconds

/**
 * 最大重连历史记录数
 */
export const MAX_RECONNECTION_HISTORY = 20

/**
 * localStorage key for connection state persistence
 */
export const CONNECTION_STATE_STORAGE_KEY = 'websocket_connection_state'

/**
 * 连接质量级别阈值
 */
export const QUALITY_LEVEL_ORDER = ['excellent', 'good', 'fair', 'poor', 'critical'] as const

/**
 * 延迟评分映射 (ms -> score)
 */
export const LATENCY_SCORE_MAP = {
  excellent: 100, // <50ms
  good: 90, // <100ms
  fair: 75, // <200ms
  okay: 60, // <300ms
  poor: 40, // <500ms
  critical: 20, // >=500ms
} as const

/**
 * 短事件名映射
 */
export const SHORT_EVENT_MAP: Record<string, string> = {
  notification: 'n',
  message: 'm',
  status: 's',
  heartbeat: 'h',
  ping: 'p',
  pong: 'pg',
  stats: 'st',
  error: 'er',
  connect: 'c',
  disconnect: 'dc',
  batch: 'b',
  __compressed: '_c',
}

/**
 * 反向事件名映射
 */
export const LONG_EVENT_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(SHORT_EVENT_MAP).map(([k, v]) => [v, k])
)
