/**
 * WebSocket 状态管理 Store
 *
 * 架构师: 🏗️ 架构师
 * 创建日期: 2026-03-29
 *
 * 功能:
 * - WebSocket 连接状态管理
 * - 消息队列
 * - 连接统计
 * - 重连策略
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
 */
export interface WebSocketState {
  // 连接状态
  status: ConnectionStatus
  socket: Socket | null
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
  _setSocket: (socket: Socket | null) => void
  _setStatus: (status: ConnectionStatus) => void
  _addMessage: (message: WebSocketMessage) => void
  _updateStats: (stats: Partial<ConnectionStats>) => void
  _reset: () => void
}

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
 * 注意: 实际的 Socket.IO 连接应该在客户端动态创建，
 * 这里只管理状态，不直接操作 Socket
 */
export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  status: 'disconnected',
  socket: null,
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
          socket,
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

      set({ socket })
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
    const { socket } = get()
    if (socket) {
      socket.disconnect()
      set({
        socket: null,
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
    const { socket, status } = get()

    if (socket && status === 'connected') {
      socket.emit('message', { type, payload })

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
   * 内部: 设置 Socket 实例
   */
  _setSocket: (socket: Socket | null) => {
    set({ socket })
  },

  /**
   * 内部: 设置状态
   */
  _setStatus: (status: ConnectionStatus) => {
    set({ status })
  },

  /**
   * 内部: 添加消息
   */
  _addMessage: (message: WebSocketMessage) => {
    set(state => ({
      messages: [message, ...state.messages].slice(0, state.maxMessages),
    }))
  },

  /**
   * 内部: 更新统计
   */
  _updateStats: (stats: Partial<ConnectionStats>) => {
    set(state => ({
      stats: { ...state.stats, ...stats },
    }))
  },

  /**
   * 内部: 重置 Store 到初始状态
   */
  _reset: () => {
    set({
      status: 'disconnected',
      socket: null,
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
 * 选择器 - 用于性能优化
 */
export const selectStatus = (state: WebSocketState) => state.status
export const selectIsConnected = (state: WebSocketState) => state.status === 'connected'
export const selectMessages = (state: WebSocketState) => state.messages
export const selectStats = (state: WebSocketState) => state.stats
export const selectLatency = (state: WebSocketState) => state.latency
