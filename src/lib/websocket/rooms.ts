// @ts-nocheck
/**
 * WebSocket Room Management
 *
 * Enhanced room system with permissions, persistence, and advanced features
 * Integrates with PermissionManager and MessageStore
 */

import { logger } from '@/lib/logger'
import { PermissionManager, getPermissionManager, UserRole } from './permissions'
export type { UserRole } from './permissions' // Re-export UserRole for consumers
import { MessageStore, getMessageStore, StoredMessage } from './message-store'

// ============================================================================
// Room Types
// ============================================================================

/**
 * Room type
 */
export type RoomType = 'task' | 'project' | 'chat' | 'document' | 'voice' | 'video'

/**
 * Room visibility
 */
export type RoomVisibility = 'public' | 'private' | 'invite-only'

/**
 * Room participant with extended info
 */
export interface RoomParticipant {
  id: string
  name: string
  email?: string
  avatar?: string
  color: string
  role: UserRole
  joinedAt: Date
  cursor?: {
    position: number
    selection?: { start: number; end: number }
  }
  isTyping: boolean
  lastActivity: Date
  isOnline: boolean
}

/**
 * Room configuration
 */
export interface RoomConfig {
  maxParticipants?: number
  messageHistoryEnabled?: boolean
  persistenceEnabled?: boolean
  autoCleanupMinutes?: number
  allowGuests?: boolean
  enforcePermissions?: boolean
}

/**
 * Room data
 */
export interface RoomData {
  content: string
  revision: number
  metadata?: Record<string, unknown>
}

/**
 * Enhanced Room interface
 */
export interface Room {
  id: string
  name: string
  type: RoomType
  documentId: string
  visibility: RoomVisibility
  ownerId: string
  participants: Map<string, RoomParticipant>
  data: RoomData
  config: RoomConfig
  createdAt: Date
  updatedAt: Date
  lastActivity: Date
  invites: Set<string> // User IDs invited to the room
  metadata?: Record<string, unknown>
}

/**
 * Room creation options
 */
export interface CreateRoomOptions {
  id: string
  name?: string
  type: RoomType
  documentId: string
  visibility?: RoomVisibility
  ownerId: string
  config?: RoomConfig
  metadata?: Record<string, unknown>
}

/**
 * Room join options
 */
export interface JoinRoomOptions {
  userId: string
  userName: string
  email?: string
  avatar?: string
  role?: UserRole
  inviteCode?: string
}

/**
 * Room event callback types
 */
export interface RoomEventCallbacks {
  onUserJoined?: (room: Room, participant: RoomParticipant) => void
  onUserLeft?: (room: Room, participant: RoomParticipant) => void
  onRoomCreated?: (room: Room) => void
  onRoomDestroyed?: (room: Room) => void
  onUserRoleChanged?: (room: Room, participant: RoomParticipant, oldRole: UserRole) => void
  onUserBanned?: (roomId: string, userId: string, bannedBy: string) => void
}

// ============================================================================
// Room Manager Class
// ============================================================================

export class RoomManager {
  private rooms: Map<string, Room> = new Map()
  private userRooms: Map<string, Set<string>> = new Map() // userId -> Set of roomIds
  private permissionManager: PermissionManager
  private messageStore: MessageStore
  private cleanupTimers: Map<string, NodeJS.Timeout> = new Map()
  private callbacks: RoomEventCallbacks = {}

  constructor(
    permissionManager?: PermissionManager,
    messageStore?: MessageStore,
    callbacks?: RoomEventCallbacks
  ) {
    this.permissionManager = permissionManager ?? getPermissionManager()
    this.messageStore = messageStore ?? getMessageStore()
    if (callbacks) {
      this.callbacks = callbacks
    }
  }

  /**
   * Generate a unique color for a user
   */
  private generateColor(userId: string): string {
    const colors = [
      '#ef4444',
      '#f97316',
      '#f59e0b',
      '#84cc16',
      '#10b981',
      '#06b6d4',
      '#0ea5e9',
      '#3b82f6',
      '#6366f1',
      '#8b5cf6',
      '#d946ef',
      '#ec4899',
      '#f43f5e',
    ]
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  /**
   * Create a new room
   */
  create(options: CreateRoomOptions): Room {
    const {
      id,
      name,
      type,
      documentId,
      visibility = 'public',
      ownerId,
      config = {},
      metadata,
    } = options

    // Check if room already exists
    if (this.rooms.has(id)) {
      logger.warn('Room already exists, returning existing room', { roomId: id })
      return this.rooms.get(id)!
    }

    // Create room
    const room: Room = {
      id,
      name: name || `Room ${id}`,
      type,
      documentId,
      visibility,
      ownerId,
      participants: new Map(),
      data: {
        content: '',
        revision: 0,
        metadata: {},
      },
      config: {
        maxParticipants: config.maxParticipants ?? 100,
        messageHistoryEnabled: config.messageHistoryEnabled ?? true,
        persistenceEnabled: config.persistenceEnabled ?? true,
        autoCleanupMinutes: config.autoCleanupMinutes ?? (type === 'project' ? 0 : 30),
        allowGuests: config.allowGuests ?? visibility === 'public',
        enforcePermissions: config.enforcePermissions ?? true,
        ...config,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActivity: new Date(),
      invites: new Set(),
      metadata,
    }

    // Set owner as owner role in permission manager
    this.permissionManager.setUserRole(ownerId, id, 'owner')

    // Store room
    this.rooms.set(id, room)

    // Track in user rooms
    this.trackUserRoom(ownerId, id)

    logger.info('Room created', {
      roomId: id,
      type,
      ownerId,
      visibility,
    })

    // Callback
    this.callbacks.onRoomCreated?.(room)

    return room
  }

  /**
   * Get room by ID
   */
  get(roomId: string): Room | undefined {
    return this.rooms.get(roomId)
  }

  /**
   * Check if room exists
   */
  exists(roomId: string): boolean {
    return this.rooms.has(roomId)
  }

  /**
   * Join a room
   */
  join(
    roomId: string,
    options: JoinRoomOptions
  ): {
    success: boolean
    room?: Room
    participant?: RoomParticipant
    error?: string
    offlineMessages?: StoredMessage[]
  } {
    const { userId, userName, email, avatar, role = 'member', inviteCode: _inviteCode } = options

    // Get or check room exists
    let room = this.rooms.get(roomId)

    // For private rooms, check if invited
    if (room?.visibility === 'private' && !room.invites.has(userId)) {
      // Only owner can join without invite
      if (room.ownerId !== userId) {
        return {
          success: false,
          error: 'Not invited to private room',
        }
      }
    }

    // Check if banned
    if (this.permissionManager.isUserBanned(userId, roomId)) {
      return {
        success: false,
        error: 'User is banned from this room',
      }
    }

    // Check room capacity
    if (room && room.participants.size >= room.config.maxParticipants!) {
      return {
        success: false,
        error: 'Room is full',
      }
    }

    // Create room if doesn't exist (auto-create for public rooms)
    if (!room) {
      room = this.create({
        id: roomId,
        type: 'chat', // Default type for auto-created rooms
        documentId: roomId,
        ownerId: userId,
      })
    }

    // Check if already in room
    if (room.participants.has(userId)) {
      const existingParticipant = room.participants.get(userId)!
      existingParticipant.isOnline = true
      existingParticipant.lastActivity = new Date()

      return {
        success: true,
        room,
        participant: existingParticipant,
      }
    }

    // Set user role
    const finalRole = userId === room.ownerId ? 'owner' : role
    this.permissionManager.setUserRole(userId, roomId, finalRole)

    // Create participant
    const participant: RoomParticipant = {
      id: userId,
      name: userName,
      email,
      avatar,
      color: this.generateColor(userId),
      role: finalRole,
      joinedAt: new Date(),
      isTyping: false,
      lastActivity: new Date(),
      isOnline: true,
    }

    // Add to room
    room.participants.set(userId, participant)
    room.lastActivity = new Date()

    // Cancel cleanup timer if scheduled
    this.cancelCleanup(roomId)

    // Track in user rooms
    this.trackUserRoom(userId, roomId)

    // Get offline messages
    const offlineMessages = this.messageStore
      .getOfflineMessages(userId)
      .map(m => m.message)
      .filter(m => m.roomId === roomId)

    // Clear offline messages for this room
    this.messageStore.clearOfflineMessages(userId)

    logger.info('User joined room', {
      roomId,
      userId,
      userName,
      role: finalRole,
      participantCount: room.participants.size,
    })

    // Callback
    this.callbacks.onUserJoined?.(room, participant)

    return {
      success: true,
      room,
      participant,
      offlineMessages: offlineMessages.length > 0 ? offlineMessages : undefined,
    }
  }

  /**
   * Leave a room
   */
  leave(
    roomId: string,
    userId: string
  ): {
    success: boolean
    participant?: RoomParticipant
    roomDestroyed?: boolean
  } {
    const room = this.rooms.get(roomId)
    if (!room) {
      return { success: false }
    }

    const participant = room.participants.get(userId)
    if (!participant) {
      return { success: false }
    }

    // Remove from room
    room.participants.delete(userId)
    room.lastActivity = new Date()

    // Update user rooms tracking
    this.untrackUserRoom(userId, roomId)

    // Callback
    this.callbacks.onUserLeft?.(room, participant)

    // Schedule cleanup if empty and not project room
    if (room.participants.size === 0 && room.config.autoCleanupMinutes! > 0) {
      this.scheduleCleanup(roomId, room.config.autoCleanupMinutes! * 60 * 1000)
    }

    logger.info('User left room', {
      roomId,
      userId,
      userName: participant.name,
      remainingParticipants: room.participants.size,
    })

    return {
      success: true,
      participant,
    }
  }

  /**
   * Kick a user from a room
   */
  kick(
    roomId: string,
    userId: string,
    kickedBy: string,
    reason?: string
  ): {
    success: boolean
    error?: string
  } {
    const room = this.rooms.get(roomId)
    if (!room) {
      return { success: false, error: 'Room not found' }
    }

    // Check permission
    if (!this.permissionManager.hasPermission(kickedBy, roomId, 'room:kick')) {
      return { success: false, error: 'No permission to kick users' }
    }

    // Check if can manage user
    if (!this.permissionManager.canManageUser(kickedBy, userId, roomId)) {
      return { success: false, error: 'Cannot kick user with equal or higher role' }
    }

    const participant = room.participants.get(userId)
    if (!participant) {
      return { success: false, error: 'User not in room' }
    }

    // Remove from room
    room.participants.delete(userId)
    room.lastActivity = new Date()

    // Update user rooms tracking
    this.untrackUserRoom(userId, roomId)

    logger.info('User kicked from room', {
      roomId,
      userId,
      kickedBy,
      reason,
    })

    // Callback
    this.callbacks.onUserLeft?.(room, participant)

    return { success: true }
  }

  /**
   * Ban a user from a room
   */
  ban(
    roomId: string,
    userId: string,
    bannedBy: string,
    reason?: string
  ): {
    success: boolean
    error?: string
  } {
    const room = this.rooms.get(roomId)
    if (!room) {
      return { success: false, error: 'Room not found' }
    }

    // Check permission
    if (!this.permissionManager.hasPermission(bannedBy, roomId, 'room:ban')) {
      return { success: false, error: 'No permission to ban users' }
    }

    // Check if can manage user
    if (!this.permissionManager.canManageUser(bannedBy, userId, roomId)) {
      return { success: false, error: 'Cannot ban user with equal or higher role' }
    }

    // Ban user
    this.permissionManager.banUser(userId, roomId, bannedBy, reason)

    // Remove from room if present
    const participant = room.participants.get(userId)
    if (participant) {
      room.participants.delete(userId)
      room.lastActivity = new Date()
      this.untrackUserRoom(userId, roomId)
    }

    logger.info('User banned from room', {
      roomId,
      userId,
      bannedBy,
      reason,
    })

    // Callback
    this.callbacks.onUserBanned?.(roomId, userId, bannedBy)

    return { success: true }
  }

  /**
   * Unban a user from a room
   */
  unban(
    roomId: string,
    userId: string,
    unbannedBy: string
  ): {
    success: boolean
    error?: string
  } {
    const room = this.rooms.get(roomId)
    if (!room) {
      return { success: false, error: 'Room not found' }
    }

    // Check permission
    if (!this.permissionManager.hasPermission(unbannedBy, roomId, 'room:ban')) {
      return { success: false, error: 'No permission to unban users' }
    }

    this.permissionManager.unbanUser(userId, roomId)

    logger.info('User unbanned from room', {
      roomId,
      userId,
      unbannedBy,
    })

    return { success: true }
  }

  /**
   * Change user role in a room
   */
  changeRole(
    roomId: string,
    userId: string,
    newRole: UserRole,
    changedBy: string
  ): {
    success: boolean
    error?: string
    oldRole?: UserRole
  } {
    const room = this.rooms.get(roomId)
    if (!room) {
      return { success: false, error: 'Room not found' }
    }

    // Check permission
    if (!this.permissionManager.hasPermission(changedBy, roomId, 'room:manage')) {
      return { success: false, error: 'No permission to change roles' }
    }

    // Check if can manage user
    if (!this.permissionManager.canManageUser(changedBy, userId, roomId)) {
      return { success: false, error: 'Cannot change role of user with equal or higher role' }
    }

    const participant = room.participants.get(userId)
    if (!participant) {
      return { success: false, error: 'User not in room' }
    }

    const oldRole = participant.role

    // Update role
    participant.role = newRole
    this.permissionManager.setUserRole(userId, roomId, newRole, changedBy)

    logger.info('User role changed', {
      roomId,
      userId,
      oldRole,
      newRole,
      changedBy,
    })

    // Callback
    this.callbacks.onUserRoleChanged?.(room, participant, oldRole)

    return { success: true, oldRole }
  }

  /**
   * Invite a user to a private room
   */
  invite(
    roomId: string,
    userId: string,
    invitedBy: string
  ): {
    success: boolean
    error?: string
  } {
    const room = this.rooms.get(roomId)
    if (!room) {
      return { success: false, error: 'Room not found' }
    }

    // Check permission
    if (!this.permissionManager.hasPermission(invitedBy, roomId, 'room:invite')) {
      return { success: false, error: 'No permission to invite users' }
    }

    room.invites.add(userId)

    logger.info('User invited to room', {
      roomId,
      userId,
      invitedBy,
    })

    return { success: true }
  }

  /**
   * Get room participants
   */
  getParticipants(roomId: string): RoomParticipant[] {
    const room = this.rooms.get(roomId)
    return room ? Array.from(room.participants.values()) : []
  }

  /**
   * Get participant in room
   */
  getParticipant(roomId: string, userId: string): RoomParticipant | undefined {
    const room = this.rooms.get(roomId)
    return room?.participants.get(userId)
  }

  /**
   * Get rooms for a user
   */
  getUserRooms(userId: string): Room[] {
    const roomIds = this.userRooms.get(userId)
    if (!roomIds) return []

    return Array.from(roomIds)
      .map(roomId => this.rooms.get(roomId))
      .filter((room): room is Room => room !== undefined)
  }

  /**
   * Update room data
   */
  updateData(roomId: string, data: Partial<RoomData>, _updatedBy?: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false

    room.data = { ...room.data, ...data }
    room.updatedAt = new Date()
    room.lastActivity = new Date()

    return true
  }

  /**
   * Update participant cursor
   */
  updateCursor(
    roomId: string,
    userId: string,
    cursor: {
      position: number
      selection?: { start: number; end: number }
    }
  ): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false

    const participant = room.participants.get(userId)
    if (!participant) return false

    participant.cursor = cursor
    participant.lastActivity = new Date()

    return true
  }

  /**
   * Update participant typing status
   */
  updateTyping(roomId: string, userId: string, isTyping: boolean): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false

    const participant = room.participants.get(userId)
    if (!participant) return false

    participant.isTyping = isTyping
    participant.lastActivity = new Date()

    return true
  }

  /**
   * Update participant online status
   */
  updateOnlineStatus(roomId: string, userId: string, isOnline: boolean): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false

    const participant = room.participants.get(userId)
    if (!participant) return false

    participant.isOnline = isOnline
    participant.lastActivity = new Date()

    return true
  }

  /**
   * Destroy a room
   */
  destroy(roomId: string, destroyedBy?: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false

    // Check permission if destroyedBy specified
    if (destroyedBy && room.ownerId !== destroyedBy) {
      if (!this.permissionManager.hasPermission(destroyedBy, roomId, 'room:manage')) {
        return false
      }
    }

    // Clear message store for room
    if (room.config.messageHistoryEnabled) {
      this.messageStore.clearRoom(roomId)
    }

    // Clear permissions
    this.permissionManager.clearRoomPermissions(roomId)

    // Remove from user rooms tracking
    for (const participant of room.participants.values()) {
      this.untrackUserRoom(participant.id, roomId)
    }

    // Cancel any pending cleanup
    this.cancelCleanup(roomId)

    // Remove room
    this.rooms.delete(roomId)

    logger.info('Room destroyed', { roomId, destroyedBy })

    // Callback
    this.callbacks.onRoomDestroyed?.(room)

    return true
  }

  /**
   * Get all rooms
   */
  getAllRooms(): Room[] {
    return Array.from(this.rooms.values())
  }

  /**
   * Get room statistics
   */
  getStats(): {
    totalRooms: number
    roomsByType: Record<RoomType, number>
    totalParticipants: number
    activeRooms: number
  } {
    const roomsByType: Record<RoomType, number> = {
      task: 0,
      project: 0,
      chat: 0,
      document: 0,
      voice: 0,
      video: 0,
    }

    let totalParticipants = 0
    let activeRooms = 0

    for (const room of this.rooms.values()) {
      roomsByType[room.type]++
      totalParticipants += room.participants.size
      if (room.participants.size > 0) {
        activeRooms++
      }
    }

    return {
      totalRooms: this.rooms.size,
      roomsByType,
      totalParticipants,
      activeRooms,
    }
  }

  // Private helper methods

  private trackUserRoom(userId: string, roomId: string): void {
    if (!this.userRooms.has(userId)) {
      this.userRooms.set(userId, new Set())
    }
    this.userRooms.get(userId)!.add(roomId)
  }

  private untrackUserRoom(userId: string, roomId: string): void {
    const rooms = this.userRooms.get(userId)
    if (rooms) {
      rooms.delete(roomId)
      if (rooms.size === 0) {
        this.userRooms.delete(userId)
      }
    }
  }

  private scheduleCleanup(roomId: string, delay: number): void {
    this.cancelCleanup(roomId)

    const timer = setTimeout(() => {
      const room = this.rooms.get(roomId)
      if (room && room.participants.size === 0) {
        this.destroy(roomId)
        logger.info('Room auto-destroyed (idle)', { roomId })
      }
    }, delay)

    this.cleanupTimers.set(roomId, timer)
  }

  private cancelCleanup(roomId: string): void {
    const timer = this.cleanupTimers.get(roomId)
    if (timer) {
      clearTimeout(timer)
      this.cleanupTimers.delete(roomId)
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let roomManagerInstance: RoomManager | null = null

export function getRoomManager(callbacks?: RoomEventCallbacks): RoomManager {
  if (!roomManagerInstance) {
    roomManagerInstance = new RoomManager(undefined, undefined, callbacks)
  }
  return roomManagerInstance
}

export function resetRoomManager(): void {
  roomManagerInstance = null
}
