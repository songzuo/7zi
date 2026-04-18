/**
 * 协作系统模块
 *
 * 提供实时协作功能的核心基础设施
 *
 * @module collaboration
 * @version 1.0.0
 */

// 类型定义
export * from './types'

// 光标管理器
export { default as CursorManager } from './cursor-manager'
export type { CursorListener, UserPresenceListener, CursorManagerConfig } from './cursor-manager'

// 用户存在服务
export { default as PresenceService } from './presence-service'
export type {
  PresenceServiceConfig,
  PresenceEventListener,
  PresenceEvent,
  HeartbeatData,
  BroadcastFunction,
} from './presence-service'
