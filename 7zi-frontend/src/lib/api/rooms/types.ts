/**
 * WebSocket 房间系统类型定义
 * @version 1.0.0
 */

// ============================================
// 房间类型
// ============================================

export type RoomVisibility = 'public' | 'private' | 'unlisted'

export type RoomParticipantRole = 'owner' | 'admin' | 'member' | 'guest'

export type RoomStatus = 'active' | 'inactive' | 'archived'

// ============================================
// 房间接口
// ============================================

export interface Room {
  id: string
  name: string
  description?: string
  visibility: RoomVisibility
  status: RoomStatus
  ownerId: string
  ownerName?: string
  maxParticipants: number
  participantCount: number
  createdAt: string
  updatedAt: string
  settings: RoomSettings
  tags?: string[]
}

export interface RoomSettings {
  allowGuests: boolean
  allowChat: boolean
  allowFileSharing: boolean
  autoKickInactive: boolean
  inactivityTimeout: number // minutes
  welcomeMessage?: string
}

// ============================================
// 参与者接口
// ============================================

export interface RoomParticipant {
  id: string
  roomId: string
  userId: string
  userName: string
  userAvatar?: string
  role: RoomParticipantRole
  joinedAt: string
  lastActiveAt: string
  isOnline: boolean
}

// ============================================
// API 请求/响应类型
// ============================================

export interface CreateRoomRequest {
  name: string
  description?: string
  visibility: RoomVisibility
  maxParticipants?: number
  settings?: Partial<RoomSettings>
  tags?: string[]
}

export interface CreateRoomResponse {
  room: Room
  participant: RoomParticipant
}

export interface GetRoomsRequest {
  visibility?: RoomVisibility
  status?: RoomStatus
  search?: string
  page?: number
  limit?: number
}

export interface GetRoomsResponse {
  rooms: Room[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface JoinRoomRequest {
  password?: string // for private rooms
}

export interface JoinRoomResponse {
  room: Room
  participant: RoomParticipant
}

export interface UpdateRoomRequest {
  name?: string
  description?: string
  visibility?: RoomVisibility
  maxParticipants?: number
  settings?: Partial<RoomSettings>
  tags?: string[]
}

export interface GetParticipantsResponse {
  participants: RoomParticipant[]
  total: number
}

export interface UpdateParticipantRoleRequest {
  role: RoomParticipantRole
}

// ============================================
// WebSocket 事件类型
// ============================================

export type RoomEventType =
  | 'participant_joined'
  | 'participant_left'
  | 'participant_role_changed'
  | 'room_updated'
  | 'room_deleted'
  | 'chat_message'
  | 'file_shared'

export interface RoomEvent {
  type: RoomEventType
  roomId: string
  timestamp: string
  data: Record<string, unknown>
}

export interface WebSocketMessage {
  type: RoomEventType
  payload: unknown
}
