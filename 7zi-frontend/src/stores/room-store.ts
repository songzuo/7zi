/**
 * Room Store
 *
 * State management for WebSocket rooms
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

  // Member actions
  addMember: (roomId, member) =>
    set(state => ({
      rooms: state.rooms.map(r =>
        r.id === roomId
          ? { ...r, members: [...r.members, member], memberCount: r.memberCount + 1 }
          : r
      ),
    })),
  removeMember: (roomId, memberId) =>
    set(state => ({
      rooms: state.rooms.map(r =>
        r.id === roomId
          ? {
              ...r,
              members: r.members.filter(m => m.id !== memberId),
              memberCount: r.memberCount - 1,
            }
          : r
      ),
    })),
  updateMember: (roomId, memberId, updates) =>
    set(state => ({
      rooms: state.rooms.map(r =>
        r.id === roomId
          ? {
              ...r,
              members: r.members.map(m => (m.id === memberId ? { ...m, ...updates } : m)),
            }
          : r
      ),
    })),

  // Message actions
  addMessage: (roomId, message) =>
    set(state => ({
      messages: {
        ...state.messages,
        [roomId]: [...(state.messages[roomId] || []), message],
      },
      unreadCounts: {
        ...state.unreadCounts,
        [roomId]: (state.unreadCounts[roomId] || 0) + 1,
      },
    })),
  clearMessages: roomId =>
    set(state => ({
      messages: { ...state.messages, [roomId]: [] },
    })),
  markAsRead: roomId =>
    set(state => ({
      unreadCounts: { ...state.unreadCounts, [roomId]: 0 },
    })),

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
