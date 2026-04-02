/**
 * WebSocket 房间系统 API 客户端
 * @version 1.0.0
 */

import type {
  Room,
  RoomParticipant,
  CreateRoomRequest,
  CreateRoomResponse,
  GetRoomsRequest,
  GetRoomsResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  UpdateRoomRequest,
  GetParticipantsResponse,
  UpdateParticipantRoleRequest,
  RoomEvent,
  RoomEventType,
} from './types'

// ============================================
// API 基础配置
// ============================================

const API_BASE = '/api/rooms'

class RoomAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'RoomAPIError'
  }
}

// ============================================
// 辅助函数
// ============================================

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new RoomAPIError(error.message || 'Request failed', response.status, error.code)
  }

  return response.json()
}

// ============================================
// 房间 API 客户端
// ============================================

export const roomsClient = {
  // 获取房间列表
  getRooms: async (params?: GetRoomsRequest): Promise<GetRoomsResponse> => {
    const queryParams = new URLSearchParams()
    if (params?.visibility) queryParams.set('visibility', params.visibility)
    if (params?.status) queryParams.set('status', params.status)
    if (params?.search) queryParams.set('search', params.search)
    if (params?.page) queryParams.set('page', params.page.toString())
    if (params?.limit) queryParams.set('limit', params.limit.toString())

    const queryString = queryParams.toString()
    return request<GetRoomsResponse>(queryString ? `?${queryString}` : '')
  },

  // 获取单个房间
  getRoom: async (roomId: string): Promise<Room> => {
    return request<Room>(`/${roomId}`)
  },

  // 创建房间
  createRoom: async (data: CreateRoomRequest): Promise<CreateRoomResponse> => {
    return request<CreateRoomResponse>('', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // 更新房间
  updateRoom: async (roomId: string, data: UpdateRoomRequest): Promise<Room> => {
    return request<Room>(`/${roomId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // 删除房间
  deleteRoom: async (roomId: string): Promise<void> => {
    return request<void>(`/${roomId}`, {
      method: 'DELETE',
    })
  },

  // 加入房间
  joinRoom: async (roomId: string, data?: JoinRoomRequest): Promise<JoinRoomResponse> => {
    return request<JoinRoomResponse>(`/${roomId}/join`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    })
  },

  // 离开房间
  leaveRoom: async (roomId: string): Promise<void> => {
    return request<void>(`/${roomId}/leave`, {
      method: 'POST',
    })
  },

  // 获取参与者列表
  getParticipants: async (roomId: string): Promise<GetParticipantsResponse> => {
    return request<GetParticipantsResponse>(`/${roomId}/participants`)
  },

  // 踢出参与者
  kickParticipant: async (roomId: string, participantId: string): Promise<void> => {
    return request<void>(`/${roomId}/participants/${participantId}/kick`, {
      method: 'POST',
    })
  },

  // 更新参与者角色
  updateParticipantRole: async (
    roomId: string,
    participantId: string,
    data: UpdateParticipantRoleRequest
  ): Promise<RoomParticipant> => {
    return request<RoomParticipant>(`/${roomId}/participants/${participantId}/role`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },
}

// ============================================
// WebSocket 客户端
// ============================================

export class RoomWebSocket {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private eventHandlers: Map<RoomEventType, Set<(event: RoomEvent) => void>> = new Map()

  constructor(private wsUrl: string) {}

  // 连接 WebSocket
  connect(token?: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.warn('WebSocket already connected')
      return
    }

    const url = new URL(this.wsUrl)
    if (token) {
      url.searchParams.set('token', token)
    }

    this.ws = new WebSocket(url.toString())

    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
    }

    this.ws.onmessage = event => {
      try {
        const message: RoomEvent = JSON.parse(event.data)
        this.emit(message.type, message)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    this.ws.onerror = error => {
      console.error('WebSocket error:', error)
    }

    this.ws.onclose = () => {
      console.log('WebSocket disconnected')
      this.reconnect()
    }
  }

  // 断开连接
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  // 重新连接
  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    setTimeout(() => {
      console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`)
      this.connect()
    }, delay)
  }

  // 发送消息
  send(type: RoomEventType, payload: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected')
      return
    }

    this.ws.send(JSON.stringify({ type, payload }))
  }

  // 订阅事件
  on(eventType: RoomEventType, handler: (event: RoomEvent) => void): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set())
    }
    this.eventHandlers.get(eventType)!.add(handler)
  }

  // 取消订阅
  off(eventType: RoomEventType, handler: (event: RoomEvent) => void): void {
    const handlers = this.eventHandlers.get(eventType)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  // 触发事件
  private emit(eventType: RoomEventType, event: RoomEvent): void {
    const handlers = this.eventHandlers.get(eventType)
    if (handlers) {
      handlers.forEach(handler => handler(event))
    }
  }

  // 清理所有事件处理器
  clear(): void {
    this.eventHandlers.clear()
    this.disconnect()
  }
}

// ============================================
// Hook 工厂函数
// ============================================

export function createRoomWebSocket(wsUrl: string) {
  return new RoomWebSocket(wsUrl)
}

export default roomsClient
