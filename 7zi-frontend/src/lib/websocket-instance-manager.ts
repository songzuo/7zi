/**
 * WebSocket Instance Manager - 多实例管理器
 *
 * 用于管理多个独立的 WebSocket 连接实例
 *
 * 版本: 1.0.0
 * 日期: 2026-04-04
 */

import { WebSocketManager, ConnectionState, ConnectionStats } from './websocket-manager'
import { logger } from '@/lib/logger'

/**
 * 实例事件类型
 */
export type InstanceEventType =
  | 'registered'
  | 'unregistered'
  | 'state_changed'
  | 'error'
  | 'connected'
  | 'disconnected'

/**
 * 实例事件数据
 */
export interface InstanceEventData {
  name: string
  manager: WebSocketManager
  type: InstanceEventType
  timestamp: number
  data?: unknown
}

/**
 * 实例事件监听器
 */
export type InstanceEventListener = (event: InstanceEventData) => void

/**
 * 所有实例的状态映射
 */
export interface AllInstancesState {
  [name: string]: ConnectionState
}

/**
 * 所有实例的统计映射
 */
export interface AllInstancesStats {
  [name: string]: ConnectionStats
}

/**
 * WebSocket 实例管理器
 *
 * 功能：
 * - 注册和注销 WebSocket 实例
 * - 获取单个或所有实例
 * - 批量操作（连接、断开、获取统计）
 * - 状态监控
 * - 事件监听
 */
export class WebSocketInstanceManager {
  private instances: Map<string, WebSocketManager> = new Map()
  private eventListeners: Set<InstanceEventListener> = new Set()

  /**
   * 注册新的 WebSocket 实例
   *
   * @param name 实例名称（唯一标识）
   * @param options WebSocketManager 选项
   * @returns WebSocketManager 实例
   * @throws 如果实例名称已存在
   */
  register(name: string, options: ConstructorParameters<typeof WebSocketManager>[0]): WebSocketManager {
    if (this.instances.has(name)) {
      throw new Error(`WebSocket instance '${name}' already exists`)
    }

    const manager = new WebSocketManager(options)

    // 监听状态变化
    manager.onStateChange((newState, previousState) => {
      this.notifyListeners({
        name,
        manager,
        type: 'state_changed',
        timestamp: Date.now(),
        data: { newState, previousState },
      })

      // 特殊事件通知
      if (newState === ConnectionState.CONNECTED) {
        this.notifyListeners({
          name,
          manager,
          type: 'connected',
          timestamp: Date.now(),
        })
      } else if (newState === ConnectionState.DISCONNECTED && previousState === ConnectionState.CONNECTED) {
        this.notifyListeners({
          name,
          manager,
          type: 'disconnected',
          timestamp: Date.now(),
        })
      } else if (newState === ConnectionState.ERROR) {
        this.notifyListeners({
          name,
          manager,
          type: 'error',
          timestamp: Date.now(),
          data: { reason: 'Connection entered ERROR state' },
        })
      }
    })

    this.instances.set(name, manager)

    this.notifyListeners({
      name,
      manager,
      type: 'registered',
      timestamp: Date.now(),
    })

    logger.info(`[WebSocketInstanceManager] Instance '${name}' registered`)

    return manager
  }

  /**
   * 获取指定实例
   *
   * @param name 实例名称
   * @returns WebSocketManager 实例，如果不存在则返回 undefined
   */
  get(name: string): WebSocketManager | undefined {
    return this.instances.get(name)
  }

  /**
   * 获取所有实例
   *
   * @returns 实例名称到管理器的映射
   */
  getAll(): Map<string, WebSocketManager> {
    return new Map(this.instances)
  }

  /**
   * 检查实例是否存在
   *
   * @param name 实例名称
   * @returns 是否存在
   */
  has(name: string): boolean {
    return this.instances.has(name)
  }

  /**
   * 注销指定实例
   *
   * @param name 实例名称
   * @returns 是否成功注销
   */
  unregister(name: string): boolean {
    const manager = this.instances.get(name)

    if (!manager) {
      return false
    }

    // 断开连接
    manager.disconnect()

    // 从映射中移除
    this.instances.delete(name)

    this.notifyListeners({
      name,
      manager,
      type: 'unregistered',
      timestamp: Date.now(),
    })

    logger.info(`[WebSocketInstanceManager] Instance '${name}' unregistered`)

    return true
  }

  /**
   * 连接所有实例
   */
  connectAll(): void {
    this.instances.forEach((manager, name) => {
      try {
        manager.connect()
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        logger.error(`[WebSocketInstanceManager] Failed to connect instance '${name}':`, err)
      }
    })
  }

  /**
   * 断开所有实例
   */
  disconnectAll(): void {
    this.instances.forEach((manager, name) => {
      try {
        manager.disconnect()
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        logger.error(`[WebSocketInstanceManager] Failed to disconnect instance '${name}':`, err)
      }
    })
  }

  /**
   * 获取所有实例的状态
   *
   * @returns 实例名称到状态的映射
   */
  getAllStates(): AllInstancesState {
    const states: AllInstancesState = {}

    this.instances.forEach((manager, name) => {
      states[name] = manager.getState()
    })

    return states
  }

  /**
   * 获取指定实例的状态
   *
   * @param name 实例名称
   * @returns 连接状态，如果实例不存在则返回 undefined
   */
  getState(name: string): ConnectionState | undefined {
    const manager = this.instances.get(name)
    return manager?.getState()
  }

  /**
   * 获取所有实例的统计信息
   *
   * @returns 实例名称到统计信息的映射
   */
  getAllStats(): AllInstancesStats {
    const stats: AllInstancesStats = {}

    this.instances.forEach((manager, name) => {
      stats[name] = manager.getStats()
    })

    return stats
  }

  /**
   * 获取实例数量
   *
   * @returns 实例数量
   */
  get count(): number {
    return this.instances.size
  }

  /**
   * 检查是否有实例处于连接状态
   *
   * @returns 是否至少有一个实例已连接
   */
  hasAnyConnected(): boolean {
    for (const manager of this.instances.values()) {
      if (manager.isConnected()) {
        return true
      }
    }
    return false
  }

  /**
   * 检查是否所有实例都已连接
   *
   * @returns 是否所有实例都已连接
   */
  allConnected(): boolean {
    if (this.instances.size === 0) {
      return true
    }

    for (const manager of this.instances.values()) {
      if (!manager.isConnected()) {
        return false
      }
    }
    return true
  }

  /**
   * 监听所有实例的事件
   *
   * @param listener 事件监听器
   */
  onInstanceEvent(listener: InstanceEventListener): void {
    this.eventListeners.add(listener)
  }

  /**
   * 取消监听所有实例的事件
   *
   * @param listener 事件监听器
   */
  offInstanceEvent(listener: InstanceEventListener): void {
    this.eventListeners.delete(listener)
  }

  /**
   * 通知所有事件监听器
   */
  private notifyListeners(event: InstanceEventData): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        logger.error('[WebSocketInstanceManager] Error in event listener:', error as Error)
      }
    })
  }

  /**
   * 清理所有实例
   */
  cleanup(): void {
    this.disconnectAll()
    this.instances.clear()
    this.eventListeners.clear()
    logger.info('[WebSocketInstanceManager] All instances cleaned up')
  }
}

/**
 * 导出单例实例
 */
export const wsInstanceManager = new WebSocketInstanceManager()