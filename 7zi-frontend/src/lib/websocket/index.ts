/**
 * WebSocket Module
 *
 * 统一导出入口
 *
 * 使用方式:
 * import { WebSocketManager, ConnectionState } from '@/lib/websocket'
 * import { WebSocketClient } from '@/lib/websocket/core'
 * import { ConnectionState, ConnectionStats } from '@/lib/websocket/types'
 */

export { WebSocketManager, WebSocketClient } from './manager'

// Re-export types
export type {
  WebSocketManagerOptions,
  ConnectionStats,
  ConnectionQuality,
  ReconnectionRecord,
  PersistedConnectionState,
  QualityAlertConfig,
  HealthCheckResult,
  ConnectionStateListener,
  MessageListener,
  QueuedMessage,
  ReconnectionStrategy,
} from './types'

// Re-export constants
export {
  ConnectionState,
  DEFAULT_RECONNECTION_CONFIG,
  DEFAULT_HEARTBEAT_CONFIG,
  DEFAULT_QUEUE_CONFIG,
  DEFAULT_TRANSPORTS,
  QUALITY_CHECK_INTERVAL,
  MAX_RECONNECTION_HISTORY,
  CONNECTION_STATE_STORAGE_KEY,
  QUALITY_LEVEL_ORDER,
  LATENCY_SCORE_MAP,
  SHORT_EVENT_MAP,
  LONG_EVENT_MAP,
} from './constants'

// Re-export compression
export {
  MessageCompressor,
  DEFAULT_COMPRESSION_CONFIG,
} from '../websocket-compression'

export type {
  CompressionConfig,
  CompressionStats,
} from '../websocket-compression'
