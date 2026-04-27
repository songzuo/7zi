/**
 * WebSocket Manager
 *
 * 提供向后兼容的 WebSocketManager 别名
 * 实际实现委托给 WebSocketClient
 *
 * 版本: 1.12.2
 * 更新日期: 2026-04-04
 */

// 为了向后兼容，WebSocketManager 是 WebSocketClient 的别名
// 旧代码导入 WebSocketManager，新代码应该导入 WebSocketClient
export { WebSocketClient as WebSocketManager } from './core'

// 重新导出所有类型和常量
export * from './types'
export * from './constants'

// 重新导出 compression 相关
export {
  MessageCompressor,
  DEFAULT_COMPRESSION_CONFIG,
} from '../websocket-compression'

// 从 compression 模块重新导出接口
export type {
  CompressionConfig,
  CompressionStats,
} from '../websocket-compression'
