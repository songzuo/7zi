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
