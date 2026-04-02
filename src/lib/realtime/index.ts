/**
 * 实时通信模块统一导出
 * 提供 WebSocket 和实时通知相关的所有导出
 */

// 通用工具函数
export * from './utils'

// 类型定义
export type * from './types'

// 简单 WebSocket Hook
export { useWebSocket, createMessage, isMessageType } from './useWebSocket'

// 增强 WebSocket Hook
export { useEnhancedWebSocket as default } from './useEnhancedWebSocket'

// 消息服务
export * from './notification-service'

// 读取状态管理
export * from './read-status'

// Store
export { useRealtimeNotificationStore as notificationStore } from './store'

// 重试管理器
export {
  RetryManager,
  retryManager,
  withRetry,
  calculateBackoffDelay,
  type RetryOptions,
  type RetryState,
  type RetryEntry,
} from './retry-manager'
