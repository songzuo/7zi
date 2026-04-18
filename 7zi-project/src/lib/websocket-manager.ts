/**
 * WebSocketManager - WebSocket 连接管理器
 * 使用 ResourceManager 确保资源正确清理
 */

import { ResourceManager, Disposable } from './utils/ResourceManager'

// 类型定义（兼容浏览器和 Node.js 环境）
type WebSocketBufferSource = string | ArrayBuffer | Blob | ArrayBufferView

/**
 * WebSocket 配置
 */
export interface WebSocketConfig {
  url: string
  protocols?: string | string[]
  reconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
  pingInterval?: number
  pongTimeout?: number
}

/**
 * 消息类型
 */
export type MessageType = string | ArrayBuffer | Blob | ArrayBufferView

/**
 * 消息监听器
 */
export type MessageListener = (data: MessageType, ws: WebSocketManager) => void

/**
 * 事件监听器
 */
export type EventListener = () => void

/**
 * WebSocket 状态
 */
export type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'disconnected'
  | 'error'

/**
 * WebSocket 管理器
 * 管理 WebSocket 连接、消息监听器，确保正确清理防止内存泄漏
 *
 * @example
 * const ws = new WebSocketManager({ url: 'wss://example.com/ws' });
 *
 * // 添加消息监听器
 * const unsub = ws.onMessage((data) => console.log(data));
 *
 * // 连接
 * await ws.connect();
 *
 * // 发送消息
 * ws.send('Hello');
 *
 * // 移除监听器
 * unsub();
 *
 * // 断开连接
 * await ws.disconnect();
 */
export class WebSocketManager implements Disposable {
  private config: Required<WebSocketConfig>
  private ws: WebSocket | null = null
  private state: ConnectionState = 'disconnected'
  private resourceManager: ResourceManager
  private reconnectAttempts: number = 0
  private reconnectTimer?: ReturnType<typeof setTimeout>
  private pingTimer?: ReturnType<typeof setInterval>
  private pongTimeoutTimer?: ReturnType<typeof setTimeout>
  private lastPongTime: number = 0

  // 使用 Map 存储监听器，便于清理
  private messageListeners: Map<string, MessageListener> = new Map()
  private eventListeners: Map<string, Map<string, EventListener>> = new Map(
    ['open', 'close', 'error'].map(event => [event, new Map()])
  )

  // 监听器ID计数器
  private listenerIdCounter: number = 0

  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url,
      protocols: config.protocols ?? [],
      reconnect: config.reconnect ?? true,
      reconnectInterval: config.reconnectInterval ?? 5000,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 5,
      pingInterval: config.pingInterval ?? 30000,
      pongTimeout: config.pongTimeout ?? 10000,
    }

    this.resourceManager = new ResourceManager({
      name: 'WebSocketManager',
      cleanupOnExit: false, // 自己处理清理
    })

    // 注册清理函数
    this.resourceManager.registerCleanup(() => this.cleanup())
  }

  /**
   * 连接到 WebSocket 服务器
   */
  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      return
    }

    this.state = 'connecting'

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url, this.config.protocols)

        this.ws.onopen = () => {
          this.state = 'connected'
          this.reconnectAttempts = 0
          this.startPing()
          this.emit('open')
          resolve()
        }

        this.ws.onclose = event => {
          this.handleClose(event)
        }

        this.ws.onerror = error => {
          const wasConnecting = this.state === 'connecting'
          this.state = 'error'
          this.emit('error')
          if (wasConnecting) {
            reject(error)
          }
        }

        this.ws.onmessage = event => {
          this.handleMessage(event.data)
        }
      } catch (error) {
        this.state = 'error'
        reject(error)
      }
    })
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.state === 'disconnected' || this.state === 'disconnecting') {
      return
    }

    this.state = 'disconnecting'
    this.stopPing()
    this.stopReconnect()

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }

    this.state = 'disconnected'
    this.emit('close')
  }

  /**
   * 发送消息
   */
  send(data: MessageType): void {
    if (this.state !== 'connected' || !this.ws) {
      throw new Error('[WebSocketManager] 未连接')
    }

    this.ws.send(data as WebSocketBufferSource)
  }

  /**
   * 添加消息监听器
   * @returns 返回注销函数
   */
  onMessage(listener: MessageListener): () => void {
    const id = this.generateListenerId()
    this.messageListeners.set(id, listener)

    // 返回注销函数
    return () => {
      this.messageListeners.delete(id)
    }
  }

  /**
   * 添加事件监听器
   * @returns 返回注销函数
   */
  on(event: 'open' | 'close' | 'error', listener: EventListener): () => void {
    const id = this.generateListenerId()
    const eventMap = this.eventListeners.get(event)
    if (eventMap) {
      eventMap.set(id, listener)
    }

    return () => {
      eventMap?.delete(id)
    }
  }

  /**
   * 获取当前状态
   */
  getState(): ConnectionState {
    return this.state
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.state === 'connected'
  }

  /**
   * 释放资源
   */
  async dispose(): Promise<void> {
    await this.disconnect()
    await this.resourceManager.dispose()
    this.clearAllListeners()
  }

  /**
   * 清理所有监听器
   */
  private clearAllListeners(): void {
    this.messageListeners.clear()
    for (const eventMap of this.eventListeners.values()) {
      eventMap.clear()
    }
  }

  /**
   * 清理资源（内部方法）
   */
  private cleanup(): void {
    this.stopPing()
    this.stopReconnect()
    this.clearAllListeners()

    if (this.ws) {
      this.ws.onopen = null
      this.ws.onclose = null
      this.ws.onerror = null
      this.ws.onmessage = null
      this.ws = null
    }
  }

  /**
   * 处理关闭事件
   */
  private handleClose(_event: Event): void {
    this.stopPing()
    this.state = 'disconnected'
    this.emit('close')

    // 尝试重连
    if (this.config.reconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect()
    }
  }

  /**
   * 处理消息
   */
  private handleMessage(data: MessageType): void {
    for (const listener of this.messageListeners.values()) {
      try {
        listener(data, this)
      } catch (error) {
        console.error('[WebSocketManager] 消息监听器错误:', error)
      }
    }
  }

  /**
   * 触发事件
   */
  private emit(event: 'open' | 'close' | 'error'): void {
    const eventMap = this.eventListeners.get(event)
    if (eventMap) {
      for (const listener of eventMap.values()) {
        try {
          listener()
        } catch (error) {
          console.error(`[WebSocketManager] ${event} 监听器错误:`, error)
        }
      }
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('[WebSocketManager] 重连失败:', error)
      })
    }, this.config.reconnectInterval)
  }

  /**
   * 停止重连
   */
  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }
  }

  /**
   * 启动心跳
   */
  private startPing(): void {
    this.stopPing()
    this.lastPongTime = Date.now()

    this.pingTimer = setInterval(() => {
      if (this.ws && this.state === 'connected') {
        this.ws.send(JSON.stringify({ type: 'ping' }))

        // 设置 pong 超时
        this.pongTimeoutTimer = setTimeout(() => {
          if (Date.now() - this.lastPongTime > this.config.pongTimeout) {
            console.warn('[WebSocketManager] Pong 超时，断开连接')
            this.ws?.close(1001, 'Pong timeout')
          }
        }, this.config.pongTimeout)
      }
    }, this.config.pingInterval)
  }

  /**
   * 停止心跳
   */
  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = undefined
    }
    if (this.pongTimeoutTimer) {
      clearTimeout(this.pongTimeoutTimer)
      this.pongTimeoutTimer = undefined
    }
  }

  /**
   * 生成监听器ID
   */
  private generateListenerId(): string {
    return `listener_${++this.listenerIdCounter}`
  }
}

export default WebSocketManager
