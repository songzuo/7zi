/**
 * Room Store
 *
 * State management for WebSocket rooms
 *
 * 更新日期: 2026-04-04 - 优化嵌套更新和消息管理
 *
 * 优化说明:
 * - 优化嵌套状态更新，减少不必要的状态创建
 * - 优化消息数组的添加逻辑
 * - 优化 unreadCounts 更新
 * - 添加细粒度选择器
 */

import { create } from 'zustand'
import type { Room, RoomMember, RoomMessage } from '@/types/rooms'

export type RoomFilter = 'all' | 'myCreated' | 'myJoined'

export interface RoomState {
  // Rooms
  rooms: Room[]
  currentRoom: Room | null
  filter: RoomFilter
  searchQuery: string

  // Messages
  messages: Record<string, RoomMessage[]>
  unreadCounts: Record<string, number>

  // UI State
  isLoading: boolean
  error: string | null

  // Current user
  currentUserId: string | null

  // Actions
  setRooms: (rooms: Room[]) => void
  addRoom: (room: Room) => void
  updateRoom: (roomId: string, updates: Partial<Room>) => void
  removeRoom: (roomId: string) => void
  setCurrentRoom: (room: Room | null) => void
  setFilter: (filter: RoomFilter) => void
  setSearchQuery: (query: string) => void

  // Member actions
  addMember: (roomId: string, member: RoomMember) => void
  removeMember: (roomId: string, memberId: string) => void
  updateMember: (roomId: string, memberId: string, updates: Partial<RoomMember>) => void

  // Message actions
  addMessage: (roomId: string, message: RoomMessage) => void
  clearMessages: (roomId: string) => void
  markAsRead: (roomId: string) => void

  // State
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setCurrentUserId: (userId: string | null) => void

  // Selectors
  getFilteredRooms: () => Room[]
  getRoomById: (roomId: string) => Room | undefined
  getOnlineMembers: (roomId: string) => RoomMember[]
}

export const useRoomStore = create<RoomState>((set, get) => ({
  // Initial state
  rooms: [],
  currentRoom: null,
  filter: 'all',
  searchQuery: '',
  messages: {},
  unreadCounts: {},
  isLoading: false,
  error: null,
  currentUserId: null,

  // Room actions
  setRooms: rooms => set({ rooms }),
  addRoom: room => set(state => ({ rooms: [...state.rooms, room] })),
  updateRoom: (roomId, updates) =>
    set(state => ({
      rooms: state.rooms.map(r => (r.id === roomId ? { ...r, ...updates } : r)),
      currentRoom:
        state.currentRoom?.id === roomId ? { ...state.currentRoom, ...updates } : state.currentRoom,
    })),
  removeRoom: roomId =>
    set(state => ({
      rooms: state.rooms.filter(r => r.id !== roomId),
      currentRoom: state.currentRoom?.id === roomId ? null : state.currentRoom,
    })),
  setCurrentRoom: room => set({ currentRoom: room }),
  setFilter: filter => set({ filter }),
  setSearchQuery: query => set({ searchQuery: query }),

  // Member actions (优化版本)
  addMember: (roomId, member) =>
    set(state => {
      const roomIndex = state.rooms.findIndex(r => r.id === roomId)
      if (roomIndex === -1) return state

      const newRooms = [...state.rooms]
      const room = { ...newRooms[roomIndex] }
      room.members = [...room.members, member]
      room.memberCount = room.memberCount + 1
      newRooms[roomIndex] = room

      return { rooms: newRooms }
    }),
  removeMember: (roomId, memberId) =>
    set(state => {
      const roomIndex = state.rooms.findIndex(r => r.id === roomId)
      if (roomIndex === -1) return state

      const room = state.rooms[roomIndex]
      const newMembers = room.members.filter(m => m.id !== memberId)

      const newRooms = [...state.rooms]
      newRooms[roomIndex] = {
        ...room,
        members: newMembers,
        memberCount: newMembers.length,
      }

      return { rooms: newRooms }
    }),
  updateMember: (roomId, memberId, updates) =>
    set(state => {
      const roomIndex = state.rooms.findIndex(r => r.id === roomId)
      if (roomIndex === -1) return state

      const room = state.rooms[roomIndex]
      const memberIndex = room.members.findIndex(m => m.id === memberId)
      if (memberIndex === -1) return state

      const newRooms = [...state.rooms]
      const newRoom = { ...newRooms[roomIndex] }
      const newMembers = [...newRoom.members]
      newMembers[memberIndex] = { ...newMembers[memberIndex], ...updates }
      newRoom.members = newMembers
      newRooms[roomIndex] = newRoom

      return { rooms: newRooms }
    }),

  // Message actions (优化版本)
  addMessage: (roomId, message) =>
    set(state => {
      const roomMessages = state.messages[roomId] || []
      // 限制每个房间最多保留 1000 条消息，防止内存无限增长
      const MAX_MESSAGES_PER_ROOM = 1000
      const newMessages = roomMessages.length >= MAX_MESSAGES_PER_ROOM
        ? [...roomMessages.slice(-MAX_MESSAGES_PER_ROOM + 1), message]
        : [...roomMessages, message]

      return {
        messages: {
          ...state.messages,
          [roomId]: newMessages,
        },
        unreadCounts: {
          ...state.unreadCounts,
          [roomId]: (state.unreadCounts[roomId] || 0) + 1,
        },
      }
    }),
  clearMessages: roomId =>
    set(state => {
      // 如果房间没有消息，不触发更新
      if (!state.messages[roomId] || state.messages[roomId].length === 0) {
        return state
      }

      return {
        messages: {
          ...state.messages,
          [roomId]: [],
        },
      }
    }),
  markAsRead: roomId =>
    set(state => {
      // 如果未读数为 0，不触发更新
      if (state.unreadCounts[roomId] === 0) {
        return state
      }

      return {
        unreadCounts: {
          ...state.unreadCounts,
          [roomId]: 0,
        },
      }
    }),

  // State
  setLoading: loading => set({ isLoading: loading }),
  setError: error => set({ error }),
  setCurrentUserId: userId => set({ currentUserId: userId }),

  // Selectors
  getFilteredRooms: () => {
    const { rooms, filter, searchQuery, currentUserId } = get()
    let filtered = [...rooms]

    // Apply filter
    if (filter === 'myCreated') {
      filtered = filtered.filter(r => r.ownerId === currentUserId)
    } else if (filter === 'myJoined') {
      filtered = filtered.filter(
        r => r.ownerId !== currentUserId && r.members.some(m => m.id === currentUserId)
      )
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        r => r.name.toLowerCase().includes(query) || r.description?.toLowerCase().includes(query)
      )
    }

    return filtered
  },

  getRoomById: roomId => get().rooms.find(r => r.id === roomId),

  getOnlineMembers: roomId => {
    const room = get().getRoomById(roomId)
    return room ? room.members.filter(m => m.isOnline) : []
  },
}))

/**
 * 选择器 - 用于性能优化（细粒度选择）
 */
export const selectRooms = (state: RoomState) => state.rooms
export const selectCurrentRoom = (state: RoomState) => state.currentRoom
export const selectFilter = (state: RoomState) => state.filter
export const selectSearchQuery = (state: RoomState) => state.searchQuery
export const selectIsLoading = (state: RoomState) => state.isLoading
export const selectError = (state: RoomState) => state.error

/**
 * 房间消息选择器
 */
export const selectRoomMessages = (roomId: string) => (state: RoomState) => state.messages[roomId] || []
export const selectUnreadCount = (roomId: string) => (state: RoomState) => state.unreadCounts[roomId] || 0

/**
 * 复合选择器 - 房间操作方法
 */
export const selectRoomActions = (state: RoomState) => ({
  setRooms: state.setRooms,
  addRoom: state.addRoom,
  updateRoom: state.updateRoom,
  removeRoom: state.removeRoom,
  setCurrentRoom: state.setCurrentRoom,
  setFilter: state.setFilter,
  setSearchQuery: state.setSearchQuery,
  addMember: state.addMember,
  removeMember: state.removeMember,
  updateMember: state.updateMember,
  addMessage: state.addMessage,
  clearMessages: state.clearMessages,
  markAsRead: state.markAsRead,
})

/**
 * 复合选择器 - 房间查询方法
 */
export const selectRoomQueries = (state: RoomState) => ({
  getFilteredRooms: state.getFilteredRooms,
  getRoomById: state.getRoomById,
  getOnlineMembers: state.getOnlineMembers,
})
