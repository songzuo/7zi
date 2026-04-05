/**
 * WebSocket 状态管理 Store
 *
 * 架构师: 🏗️ 架构师
 * 创建日期: 2026-03-29
 * 更新日期: 2026-04-04 - 优化性能，移除 socket 实例存储
 *
 * 功能:
 * - WebSocket 连接状态管理
 * - 消息队列
 * - 连接统计
 * - 重连策略
 *
 * 优化说明:
 * - Socket.IO 实例不再存储在 Zustand 状态中（避免序列化问题）
 * - 使用外部引用管理 socket 实例
 * - 优化消息数组更新，减少不必要的重渲染
 */

import { create } from 'zustand'
import type { Socket } from 'socket.io-client'

/**
 * 连接状态
 */
export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error'

/**
 * WebSocket 消息
 */
export interface WebSocketMessage {
  id: string
  type: string
  payload: unknown
  timestamp: number
  direction: 'incoming' | 'outgoing'
}

/**
 * 连接统计
 */
export interface ConnectionStats {
  messagesReceived: number
  messagesSent: number
  reconnectAttempts: number
  lastConnected: number | null
  lastDisconnected: number | null
  totalUptime: number // 总连接时间 (毫秒)
  averageLatency: number
}

/**
 * WebSocket 状态接口
 *
 * 注意: socket 实例不再存储在状态中，使用外部引用管理
 */
export interface WebSocketState {
  // 连接状态
  status: ConnectionStatus
  url: string | null

  // 延迟
  lastPing: number
  latency: number

  // 消息
  messages: WebSocketMessage[]
  maxMessages: number

  // 统计
  stats: ConnectionStats

  // 重连配置
  reconnectAttempts: number
  maxReconnectAttempts: number
  reconnectDelay: number

  // 操作
  connect: (url: string) => Promise<void>
  disconnect: () => void
  reconnect: () => Promise<void>

  // 消息操作
  sendMessage: (type: string, payload: unknown) => void
  clearMessages: () => void

  // 内部方法
  _setStatus: (status: ConnectionStatus) => void
  _addMessage: (message: WebSocketMessage) => void
  _updateStats: (stats: Partial<ConnectionStats>) => void
  _reset: () => void
}

/**
 * 外部 Socket 实例引用（不存储在 Zustand 状态中）
 */
let externalSocket: Socket | null = null

/**
 * 初始统计
 */
const initialStats: ConnectionStats = {
  messagesReceived: 0,
  messagesSent: 0,
  reconnectAttempts: 0,
  lastConnected: null,
  lastDisconnected: null,
  totalUptime: 0,
  averageLatency: 0,
}

/**
 * WebSocket 状态 Store
 *
 * 优化说明:
 * - Socket.IO 实例存储在外部变量中，不存储在 Zustand 状态中
 * - 避免了序列化问题和不必要的重渲染
 * - 优化了消息添加逻辑，减少数组操作
 */
export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  status: 'disconnected',
  url: null,
  lastPing: 0,
  latency: 0,
  messages: [],
  maxMessages: 100,
  stats: initialStats,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,

  /**
   * 连接 WebSocket
   */
  connect: async (url: string) => {
    set({ status: 'connecting', url })

    try {
      // 动态导入 socket.io-client (避免 SSR 问题)
      const { io } = await import('socket.io-client')

      const socket = io(url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: get().maxReconnectAttempts,
        reconnectionDelay: get().reconnectDelay,
      })

      // 连接成功
      socket.on('connect', () => {
        set({
          status: 'connected',
          reconnectAttempts: 0,
        })
        get()._updateStats({
          lastConnected: Date.now(),
        })
        console.log('[WebSocket] Connected to', url)
      })

      // 连接断开
      socket.on('disconnect', reason => {
        set({ status: 'disconnected' })
        get()._updateStats({
          lastDisconnected: Date.now(),
        })
        console.log('[WebSocket] Disconnected:', reason)
      })

      // 连接错误
      socket.on('connect_error', error => {
        const attempts = get().reconnectAttempts + 1
        set({
          status: attempts >= get().maxReconnectAttempts ? 'error' : 'reconnecting',
          reconnectAttempts: attempts,
        })
        get()._updateStats({
          reconnectAttempts: attempts,
        })
        console.error('[WebSocket] Connection error:', error)
      })

      // 接收消息
      socket.on('message', (data: { type: string; payload: unknown }) => {
        get()._addMessage({
          id: crypto.randomUUID(),
          type: data.type,
          payload: data.payload,
          timestamp: Date.now(),
          direction: 'incoming',
        })
        get()._updateStats({
          messagesReceived: get().stats.messagesReceived + 1,
        })
      })

      // Ping/Pong 测延迟
      socket.on('pong', () => {
        const latency = Date.now() - get().lastPing
        set({ latency })
        get()._updateStats({
          averageLatency: (get().stats.averageLatency + latency) / 2,
        })
      })

      // 存储到外部引用（不存储在 Zustand 状态中）
      externalSocket = socket
    } catch (error) {
      set({ status: 'error' })
      console.error('[WebSocket] Failed to connect:', error)
      throw error
    }
  },

  /**
   * 断开连接
   */
  disconnect: () => {
    if (externalSocket) {
      externalSocket.disconnect()
      externalSocket = null
      set({
        status: 'disconnected',
        url: null,
      })
      get()._updateStats({
        lastDisconnected: Date.now(),
      })
    }
  },

  /**
   * 重新连接
   */
  reconnect: async () => {
    const { url, reconnectAttempts, maxReconnectAttempts } = get()

    if (reconnectAttempts >= maxReconnectAttempts) {
      set({ status: 'error' })
      throw new Error('Max reconnect attempts reached')
    }

    if (url) {
      set({ status: 'reconnecting' })
      await get().connect(url)
    }
  },

  /**
   * 发送消息
   */
  sendMessage: (type: string, payload: unknown) => {
    const { status } = get()

    if (externalSocket && status === 'connected') {
      externalSocket.emit('message', { type, payload })

      // 记录发出的消息
      get()._addMessage({
        id: crypto.randomUUID(),
        type,
        payload,
        timestamp: Date.now(),
        direction: 'outgoing',
      })

      get()._updateStats({
        messagesSent: get().stats.messagesSent + 1,
      })
    } else {
      console.warn('[WebSocket] Cannot send message: not connected')
    }
  },

  /**
   * 清除消息
   */
  clearMessages: () => {
    set({ messages: [] })
  },

  /**
   * 内部: 设置状态
   */
  _setStatus: (status: ConnectionStatus) => {
    set({ status })
  },

  /**
   * 内部: 添加消息（优化版本）
   */
  _addMessage: (message: WebSocketMessage) => {
    set(state => {
      // 检查是否已达到最大数量
      if (state.messages.length >= state.maxMessages) {
        // 移除最旧的消息
        return {
          messages: [...state.messages.slice(1), message],
        }
      }

      return {
        messages: [message, ...state.messages],
      }
    })
  },

  /**
   * 内部: 更新统计（优化版本，只在有变化时更新）
   */
  _updateStats: (stats: Partial<ConnectionStats>) => {
    set(state => {
      const currentStats = state.stats
      let hasChanges = false

      // 检查每个字段是否有变化
      for (const [key, value] of Object.entries(stats)) {
        if (currentStats[key as keyof ConnectionStats] !== value) {
          hasChanges = true
          break
        }
      }

      // 如果没有变化，不触发更新
      if (!hasChanges) return state

      return {
        stats: { ...currentStats, ...stats },
      }
    })
  },

  /**
   * 内部: 重置 Store 到初始状态
   */
  _reset: () => {
    set({
      status: 'disconnected',
      url: null,
      lastPing: 0,
      latency: 0,
      messages: [],
      maxMessages: 100,
      stats: { ...initialStats },
      reconnectAttempts: 0,
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
    })
  },
}))

/**
 * 获取外部 Socket 实例（用于直接访问）
 * 注意: 这不是 Zustand 状态的一部分
 */
export const getExternalSocket = (): Socket | null => externalSocket

/**
 * 选择器 - 用于性能优化
 */
export const selectStatus = (state: WebSocketState) => state.status
export const selectIsConnected = (state: WebSocketState) => state.status === 'connected'
export const selectMessages = (state: WebSocketState) => state.messages
export const selectStats = (state: WebSocketState) => state.stats
export const selectLatency = (state: WebSocketState) => state.latency
