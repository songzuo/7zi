/**
 * WebSocket Room Store
 *
 * Zustand store for WebSocket room management state
 * Manages rooms, messages, participants, and UI state
 */

'use client'

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  Room,
  RoomType,
  RoomVisibility,
  RoomParticipant,
  RoomConfig,
} from '@/lib/websocket/rooms'
import type { UserRole, Permission } from '@/lib/websocket/permissions'
import type { StoredMessage } from '@/lib/websocket/message-store'

// ============================================================================
// Types
// ============================================================================

/**
 * Store state
 */
interface WebSocketRoomStore {
  // Rooms
  rooms: Room[]
  currentRoomId: string | null
  roomsLoading: boolean
  roomsError: string | null

  // Messages
  messages: Map<string, StoredMessage[]> // roomId -> messages
  messagesLoading: boolean
  messagesError: string | null

  // Participants
  participants: Map<string, RoomParticipant[]> // roomId -> participants

  // UI State
  showRoomSettings: boolean
  showMemberPanel: boolean
  searchQuery: string
  filterType: RoomType | 'all'
  filterVisibility: RoomVisibility | 'all'

  // Current user
  currentUserId: string | null
  currentUserName: string | null

  // Actions
  setCurrentRoom: (roomId: string | null) => void
  setRooms: (rooms: Room[]) => void
  addRoom: (room: Room) => void
  updateRoom: (roomId: string, updates: Partial<Room>) => void
  removeRoom: (roomId: string) => void
  setRoomsLoading: (loading: boolean) => void
  setRoomsError: (error: string | null) => void

  setMessages: (roomId: string, messages: StoredMessage[]) => void
  addMessage: (roomId: string, message: StoredMessage) => void
  updateMessage: (roomId: string, messageId: string, updates: Partial<StoredMessage>) => void
  removeMessage: (roomId: string, messageId: string) => void
  setMessagesLoading: (loading: boolean) => void
  setMessagesError: (error: string | null) => void

  setParticipants: (roomId: string, participants: RoomParticipant[]) => void
  addParticipant: (roomId: string, participant: RoomParticipant) => void
  removeParticipant: (roomId: string, userId: string) => void
  updateParticipant: (roomId: string, userId: string, updates: Partial<RoomParticipant>) => void

  setCurrentUser: (userId: string, userName: string) => void

  // UI actions
  toggleRoomSettings: (show?: boolean) => void
  toggleMemberPanel: (show?: boolean) => void
  setSearchQuery: (query: string) => void
  setFilterType: (type: RoomType | 'all') => void
  setFilterVisibility: (visibility: RoomVisibility | 'all') => void

  // Getters
  getCurrentRoom: () => Room | undefined
  getCurrentMessages: () => StoredMessage[]
  getCurrentParticipants: () => RoomParticipant[]
  getFilteredRooms: () => Room[]
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useWebSocketStore = create<WebSocketRoomStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      rooms: [],
      currentRoomId: null,
      roomsLoading: false,
      roomsError: null,

      messages: new Map(),
      messagesLoading: false,
      messagesError: null,

      participants: new Map(),

      showRoomSettings: false,
      showMemberPanel: false,
      searchQuery: '',
      filterType: 'all',
      filterVisibility: 'all',

      currentUserId: null,
      currentUserName: null,

      // Room actions
      setCurrentRoom: roomId => {
        set({ currentRoomId: roomId })
      },

      setRooms: rooms => {
        set({ rooms, roomsLoading: false, roomsError: null })
      },

      addRoom: room => {
        set(state => ({
          rooms: [...state.rooms, room],
        }))
      },

      updateRoom: (roomId, updates) => {
        set(state => ({
          rooms: state.rooms.map(r => (r.id === roomId ? { ...r, ...updates } : r)),
        }))
      },

      removeRoom: roomId => {
        set(state => ({
          rooms: state.rooms.filter(r => r.id !== roomId),
          // Also clear messages and participants
          messages: new Map(Array.from(state.messages.entries()).filter(([id]) => id !== roomId)),
          participants: new Map(
            Array.from(state.participants.entries()).filter(([id]) => id !== roomId)
          ),
        }))
      },

      setRoomsLoading: loading => {
        set({ roomsLoading: loading })
      },

      setRoomsError: error => {
        set({ roomsError: error, roomsLoading: false })
      },

      // Message actions
      setMessages: (roomId, messages) => {
        set(state => {
          const newMessages = new Map(state.messages)
          newMessages.set(roomId, messages)
          return { messages: newMessages, messagesLoading: false, messagesError: null }
        })
      },

      addMessage: (roomId, message) => {
        set(state => {
          const newMessages = new Map(state.messages)
          const roomMessages = newMessages.get(roomId) || []
          newMessages.set(roomId, [...roomMessages, message])
          return { messages: newMessages }
        })
      },

      updateMessage: (roomId, messageId, updates) => {
        set(state => {
          const newMessages = new Map(state.messages)
          const roomMessages = newMessages.get(roomId) || []
          newMessages.set(
            roomId,
            roomMessages.map(m => (m.id === messageId ? { ...m, ...updates } : m))
          )
          return { messages: newMessages }
        })
      },

      removeMessage: (roomId, messageId) => {
        set(state => {
          const newMessages = new Map(state.messages)
          const roomMessages = newMessages.get(roomId) || []
          newMessages.set(
            roomId,
            roomMessages.filter(m => m.id !== messageId)
          )
          return { messages: newMessages }
        })
      },

      setMessagesLoading: loading => {
        set({ messagesLoading: loading })
      },

      setMessagesError: error => {
        set({ messagesError: error, messagesLoading: false })
      },

      // Participant actions
      setParticipants: (roomId, participants) => {
        set(state => {
          const newParticipants = new Map(state.participants)
          newParticipants.set(roomId, participants)
          return { participants: newParticipants }
        })
      },

      addParticipant: (roomId, participant) => {
        set(state => {
          const newParticipants = new Map(state.participants)
          const roomParticipants = newParticipants.get(roomId) || []
          // Avoid duplicates
          if (!roomParticipants.find(p => p.id === participant.id)) {
            newParticipants.set(roomId, [...roomParticipants, participant])
          }
          return { participants: newParticipants }
        })
      },

      removeParticipant: (roomId, userId) => {
        set(state => {
          const newParticipants = new Map(state.participants)
          const roomParticipants = newParticipants.get(roomId) || []
          newParticipants.set(
            roomId,
            roomParticipants.filter(p => p.id !== userId)
          )
          return { participants: newParticipants }
        })
      },

      updateParticipant: (roomId, userId, updates) => {
        set(state => {
          const newParticipants = new Map(state.participants)
          const roomParticipants = newParticipants.get(roomId) || []
          newParticipants.set(
            roomId,
            roomParticipants.map(p => (p.id === userId ? { ...p, ...updates } : p))
          )
          return { participants: newParticipants }
        })
      },

      setCurrentUser: (userId, userName) => {
        set({ currentUserId: userId, currentUserName: userName })
      },

      // UI actions
      toggleRoomSettings: show => {
        set({ showRoomSettings: show !== undefined ? show : !get().showRoomSettings })
      },

      toggleMemberPanel: show => {
        set({ showMemberPanel: show !== undefined ? show : !get().showMemberPanel })
      },

      setSearchQuery: query => {
        set({ searchQuery: query })
      },

      setFilterType: type => {
        set({ filterType: type })
      },

      setFilterVisibility: visibility => {
        set({ filterVisibility: visibility })
      },

      // Getters
      getCurrentRoom: () => {
        const { rooms, currentRoomId } = get()
        return rooms.find(r => r.id === currentRoomId)
      },

      getCurrentMessages: () => {
        const { messages, currentRoomId } = get()
        return currentRoomId ? messages.get(currentRoomId) || [] : []
      },

      getCurrentParticipants: () => {
        const { participants, currentRoomId } = get()
        return currentRoomId ? participants.get(currentRoomId) || [] : []
      },

      getFilteredRooms: () => {
        const { rooms, searchQuery, filterType, filterVisibility } = get()
        return rooms.filter(room => {
          // Search filter
          if (searchQuery) {
            const query = searchQuery.toLowerCase()
            if (
              !room.name.toLowerCase().includes(query) &&
              !room.id.toLowerCase().includes(query)
            ) {
              return false
            }
          }

          // Type filter
          if (filterType !== 'all' && room.type !== filterType) {
            return false
          }

          // Visibility filter
          if (filterVisibility !== 'all' && room.visibility !== filterVisibility) {
            return false
          }

          return true
        })
      },
    }),
    { name: 'websocket-room-store' }
  )
)

// ============================================================================
// Selectors
// ============================================================================

export const selectCurrentRoom = (state: WebSocketRoomStore) => state.getCurrentRoom()
export const selectCurrentMessages = (state: WebSocketRoomStore) => state.getCurrentMessages()
export const selectCurrentParticipants = (state: WebSocketRoomStore) =>
  state.getCurrentParticipants()
export const selectFilteredRooms = (state: WebSocketRoomStore) => state.getFilteredRooms()
