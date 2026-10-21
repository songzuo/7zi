/**
 * WebSocket Connection Manager (Backward Compatibility)
 *
 * 此文件现在作为遗留导入点，所有实现已移至 websocket/ 目录
 *
 * 请使用新的导入路径:
 * - import { WebSocketManager } from '@/lib/websocket'
 * - import { WebSocketClient } from '@/lib/websocket/core'
 * - import { ConnectionState } from '@/lib/websocket/types'
 *
 * 版本: 1.12.2
 * 更新日期: 2026-04-04
 */

// 重新导出所有内容以保持向后兼容
export * from './websocket'

import { WebSocketClient } from './websocket/core'

/**
 * 全局共享的 WebSocket 客户端单例
 *
 * 供 client-notification-manager 等需要全局 WS 连接的模块使用。
 * 默认 autoConnect: false —— 由调用方在需要时显式 connect()，
 * 避免在模块加载阶段（SSR / 构建期）建立连接。
 */
let sharedClient: WebSocketClient | null = null

export function getSharedWebSocketClient(): WebSocketClient {
  if (!sharedClient) {
    sharedClient = new WebSocketClient({
      url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
      autoConnect: false,
      transports: ['websocket', 'polling'],
    })
  }
  return sharedClient
}

/**
 * 向后兼容别名：历史代码使用 `websocketManager.onStateChange(...)` /
 * `websocketManager.on('notification', ...)` 的单例形式。
 */
export const websocketManager = {
  onStateChange: (listener: Parameters<WebSocketClient['onStateChange']>[0]) =>
    getSharedWebSocketClient().onStateChange(listener),
  offStateChange: (listener: Parameters<WebSocketClient['offStateChange']>[0]) =>
    getSharedWebSocketClient().offStateChange(listener),
  on: (event: string, listener: Parameters<WebSocketClient['on']>[1]) =>
    getSharedWebSocketClient().on(event, listener),
  off: (event: string, listener: Parameters<WebSocketClient['off']>[1]) =>
    getSharedWebSocketClient().off(event, listener),
  connect: () => getSharedWebSocketClient().connect(),
  disconnect: () => getSharedWebSocketClient().disconnect(),
  emit: (event: string, data: unknown, queueIfOffline = true) =>
    getSharedWebSocketClient().emit(event, data, queueIfOffline),
  getState: () => getSharedWebSocketClient().getState(),
  isConnected: () => getSharedWebSocketClient().isConnected(),
}
