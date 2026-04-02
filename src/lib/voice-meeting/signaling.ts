/**
 * Voice Meeting Signaling Handler
 *
 * Extends the existing Socket.IO server to support WebRTC signaling
 * for voice meetings
 */

import type { Server as SocketIOServer } from 'socket.io'
import { logger } from '@/lib/logger'
import type { Socket } from 'socket.io'
import type { AuthenticatedSocket } from '@/lib/websocket/types'

// ============================================================================
// Types
// ============================================================================

export interface MeetingParticipant {
  id: string
  name: string
  email?: string
  avatar?: string
  joinedAt: Date
  audioEnabled: boolean
  videoEnabled: boolean
  screenSharing: boolean
  isHost: boolean
}

export interface MeetingRoom {
  id: string
  name: string
  hostId: string
  locked: boolean
  createdAt: Date
  lastActivity: Date
  participants: Map<string, MeetingParticipant>
}

export interface JoinRoomPayload {
  roomId: string
  token: string
  userId: string
  userName: string
  capabilities: {
    audio: boolean
    video: boolean
    screenShare: boolean
  }
}

export interface OfferPayload {
  sdp: RTCSessionDescriptionInit
  senderId: string
  receiverId: string
}

export interface AnswerPayload {
  sdp: RTCSessionDescriptionInit
  senderId: string
  receiverId: string
}

export interface IceCandidatePayload {
  candidate: RTCIceCandidateInit
  senderId: string
  receiverId: string
}

// ============================================================================
// Global State
// ============================================================================

const meetingRooms = new Map<string, MeetingRoom>()
const socketToRoom = new Map<string, string>()

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get or create a meeting room
 */
function getOrCreateRoom(roomId: string, hostId: string, hostName: string): MeetingRoom {
  let room = meetingRooms.get(roomId)

  if (!room) {
    room = {
      id: roomId,
      name: `Meeting ${roomId.slice(0, 8)}`,
      hostId,
      locked: false,
      createdAt: new Date(),
      lastActivity: new Date(),
      participants: new Map(),
    }
    meetingRooms.set(roomId, room)
    logger.info(`[Meeting] Created new room: ${roomId}`)
  }

  return room
}

/**
 * Clean up empty rooms
 */
function cleanupEmptyRoom(roomId: string): void {
  const room = meetingRooms.get(roomId)
  if (!room) return

  if (room.participants.size === 0) {
    meetingRooms.delete(roomId)
    logger.info(`[Meeting] Cleaned up empty room: ${roomId}`)
  }
}

/**
 * Get room by socket ID
 */
function getRoomBySocket(socketId: string): MeetingRoom | undefined {
  const roomId = socketToRoom.get(socketId)
  return roomId ? meetingRooms.get(roomId) : undefined
}

/**
 * Broadcast to all participants in a room
 */
function broadcastToRoom(
  io: SocketIOServer,
  roomId: string,
  event: string,
  data: unknown,
  excludeSocketId?: string
): void {
  io.to(roomId)
    .except(excludeSocketId || '')
    .emit(event, data)
}

/**
 * Send to specific participant
 */
function sendToParticipant(
  io: SocketIOServer,
  roomId: string,
  participantId: string,
  event: string,
  data: unknown
): void {
  const room = meetingRooms.get(roomId)
  if (!room) return

  // Find socket for participant
  const ioRoom = io.sockets.adapter.rooms.get(roomId)
  if (!ioRoom) return

  ioRoom.forEach(socketId => {
    const socket = io.sockets.sockets.get(socketId)
    if (socket && (socket as AuthenticatedSocket).data.user?.id === participantId) {
      socket.emit(event, data)
    }
  })
}

// ============================================================================
// Signaling Handlers
// ============================================================================

/**
 * Handle join room request
 */
export function handleJoinRoom(
  socket: AuthenticatedSocket,
  io: SocketIOServer,
  payload: JoinRoomPayload
): void {
  const { roomId, userId, userName, capabilities } = payload

  // Get or create room
  const room = getOrCreateRoom(roomId, userId, userName)

  // Check if room is locked
  if (room.locked && room.hostId !== userId) {
    socket.emit('room-error', { message: 'Room is locked' })
    return
  }

  // Check max participants (configurable)
  const MAX_PARTICIPANTS = parseInt(process.env.MAX_PARTICIPANTS_PER_ROOM || '8', 10)
  if (room.participants.size >= MAX_PARTICIPANTS) {
    socket.emit('room-error', { message: 'Room is full' })
    return
  }

  // Create participant
  const participant: MeetingParticipant = {
    id: userId,
    name: userName,
    email: socket.data.user.email,
    avatar: socket.data.user.avatar,
    joinedAt: new Date(),
    audioEnabled: capabilities.audio,
    videoEnabled: capabilities.video,
    screenSharing: capabilities.screenShare,
    isHost: room.hostId === userId,
  }

  // Add participant to room
  room.participants.set(userId, participant)
  socketToRoom.set(socket.id, roomId)

  // Join socket.io room
  socket.join(roomId)

  // Update last activity
  room.lastActivity = new Date()

  // Send room joined confirmation to joining user
  socket.emit('room-joined', {
    roomId,
    participants: Array.from(room.participants.values()),
  })

  // Notify other participants
  broadcastToRoom(io, roomId, 'participant-joined', participant, socket.id)

  logger.info(`[Meeting] User ${userName} (${userId}) joined room ${roomId}`)
}

/**
 * Handle leave room request
 */
export function handleLeaveRoom(
  socket: AuthenticatedSocket,
  io: SocketIOServer,
  payload: { roomId: string }
): void {
  const { roomId } = payload
  const room = meetingRooms.get(roomId)
  if (!room) return

  const userId = socket.data.user?.id
  if (!userId) return

  // Remove participant from room
  const participant = room.participants.get(userId)
  room.participants.delete(userId)

  // Clean up socket mapping
  socketToRoom.delete(socket.id)

  // Leave socket.io room
  socket.leave(roomId)

  // Notify other participants
  broadcastToRoom(io, roomId, 'participant-left', { participantId: userId })

  // Transfer host role if host left
  if (participant?.isHost && room.participants.size > 0) {
    const remainingParticipants = Array.from(room.participants.values())
    const newHost = remainingParticipants[0]
    newHost.isHost = true
    room.hostId = newHost.id

    broadcastToRoom(io, roomId, 'host-changed', { newHostId: newHost.id })
    logger.info(`[Meeting] Host role transferred to ${newHost.name} (${newHost.id})`)
  }

  // Clean up empty room
  cleanupEmptyRoom(roomId)

  logger.info(`[Meeting] User ${userId} left room ${roomId}`)
}

/**
 * Handle WebRTC offer
 */
export function handleOffer(
  socket: AuthenticatedSocket,
  io: SocketIOServer,
  payload: OfferPayload
): void {
  const { sdp, senderId, receiverId } = payload
  const roomId = socketToRoom.get(socket.id)

  if (!roomId) {
    logger.warn(`[Meeting] Received offer from socket not in a room`)
    return
  }

  // Validate receiver is in room
  const room = meetingRooms.get(roomId)
  if (!room || !room.participants.has(receiverId)) {
    logger.warn(`[Meeting] Receiver ${receiverId} not in room ${roomId}`)
    return
  }

  // Forward offer to receiver
  sendToParticipant(io, roomId, receiverId, 'offer', { sdp, senderId })

  logger.debug(`[Meeting] Forwarded offer from ${senderId} to ${receiverId}`)
}

/**
 * Handle WebRTC answer
 */
export function handleAnswer(
  socket: AuthenticatedSocket,
  io: SocketIOServer,
  payload: AnswerPayload
): void {
  const { sdp, senderId, receiverId } = payload
  const roomId = socketToRoom.get(socket.id)

  if (!roomId) {
    logger.warn(`[Meeting] Received answer from socket not in a room`)
    return
  }

  // Validate receiver is in room
  const room = meetingRooms.get(roomId)
  if (!room || !room.participants.has(receiverId)) {
    logger.warn(`[Meeting] Receiver ${receiverId} not in room ${roomId}`)
    return
  }

  // Forward answer to receiver
  sendToParticipant(io, roomId, receiverId, 'answer', { sdp, senderId })

  logger.debug(`[Meeting] Forwarded answer from ${senderId} to ${receiverId}`)
}

/**
 * Handle ICE candidate
 */
export function handleIceCandidate(
  socket: AuthenticatedSocket,
  io: SocketIOServer,
  payload: IceCandidatePayload
): void {
  const { candidate, senderId, receiverId } = payload
  const roomId = socketToRoom.get(socket.id)

  if (!roomId) {
    logger.warn(`[Meeting] Received ICE candidate from socket not in a room`)
    return
  }

  // Validate receiver is in room
  const room = meetingRooms.get(roomId)
  if (!room || !room.participants.has(receiverId)) {
    logger.warn(`[Meeting] Receiver ${receiverId} not in room ${roomId}`)
    return
  }

  // Forward ICE candidate to receiver
  sendToParticipant(io, roomId, receiverId, 'ice-candidate', { candidate, senderId })

  logger.debug(`[Meeting] Forwarded ICE candidate from ${senderId} to ${receiverId}`)
}

/**
 * Handle mute state change
 */
export function handleMuteStateChanged(
  socket: AuthenticatedSocket,
  io: SocketIOServer,
  payload: { muted: boolean }
): void {
  const { muted } = payload
  const roomId = socketToRoom.get(socket.id)

  if (!roomId) return

  const userId = socket.data.user?.id
  if (!userId) return

  // Update participant state
  const room = meetingRooms.get(roomId)
  if (!room) return

  const participant = room.participants.get(userId)
  if (participant) {
    participant.audioEnabled = !muted
  }

  // Notify other participants
  broadcastToRoom(io, roomId, 'participant-muted', { participantId: userId, muted }, socket.id)

  logger.info(`[Meeting] User ${userId} ${muted ? 'muted' : 'unmuted'}`)
}

/**
 * Handle participant mute (host action)
 */
export function handleMuteParticipant(
  socket: AuthenticatedSocket,
  io: SocketIOServer,
  payload: { targetParticipantId: string; mute: boolean }
): void {
  const { targetParticipantId, mute } = payload
  const roomId = socketToRoom.get(socket.id)

  if (!roomId) return

  const userId = socket.data.user?.id
  if (!userId) return

  // Check if requester is host
  const room = meetingRooms.get(roomId)
  if (!room || room.hostId !== userId) {
    socket.emit('error', { message: 'Only the host can mute participants' })
    return
  }

  // Update target participant state
  const targetParticipant = room.participants.get(targetParticipantId)
  if (!targetParticipant) {
    socket.emit('error', { message: 'Participant not found' })
    return
  }

  targetParticipant.audioEnabled = !mute

  // Notify all participants
  io.to(roomId).emit('participant-muted', { participantId: targetParticipantId, muted: mute })

  logger.info(
    `[Meeting] Host ${userId} ${mute ? 'muted' : 'unmuted'} participant ${targetParticipantId}`
  )
}

/**
 * Handle remove participant (host action)
 */
export function handleRemoveParticipant(
  socket: AuthenticatedSocket,
  io: SocketIOServer,
  payload: { targetParticipantId: string }
): void {
  const { targetParticipantId } = payload
  const roomId = socketToRoom.get(socket.id)

  if (!roomId) return

  const userId = socket.data.user?.id
  if (!userId) return

  // Check if requester is host
  const room = meetingRooms.get(roomId)
  if (!room || room.hostId !== userId) {
    socket.emit('error', { message: 'Only the host can remove participants' })
    return
  }

  // Cannot remove host
  if (targetParticipantId === userId) {
    socket.emit('error', { message: 'Cannot remove host' })
    return
  }

  // Remove participant
  room.participants.delete(targetParticipantId)

  // Notify target participant to leave
  sendToParticipant(io, roomId, targetParticipantId, 'removed-from-room', {
    reason: 'removed_by_host',
  })

  // Notify other participants
  broadcastToRoom(io, roomId, 'participant-left', { participantId: targetParticipantId })

  // Clean up socket mapping for removed participant
  const ioRoom = io.sockets.adapter.rooms.get(roomId)
  if (ioRoom) {
    ioRoom.forEach(socketId => {
      const participantSocket = io.sockets.sockets.get(socketId) as AuthenticatedSocket
      if (participantSocket?.data.user?.id === targetParticipantId) {
        socketToRoom.delete(socketId)
        participantSocket.leave(roomId)
      }
    })
  }

  logger.info(`[Meeting] Host ${userId} removed participant ${targetParticipantId}`)
}

/**
 * Handle lock room (host action)
 */
export function handleLockRoom(
  socket: AuthenticatedSocket,
  io: SocketIOServer,
  payload: { locked: boolean }
): void {
  const { locked } = payload
  const roomId = socketToRoom.get(socket.id)

  if (!roomId) return

  const userId = socket.data.user?.id
  if (!userId) return

  // Check if requester is host
  const room = meetingRooms.get(roomId)
  if (!room || room.hostId !== userId) {
    socket.emit('error', { message: 'Only the host can lock the room' })
    return
  }

  // Update room state
  room.locked = locked

  // Notify all participants
  io.to(roomId).emit('room-locked', { locked })

  logger.info(`[Meeting] Host ${userId} ${locked ? 'locked' : 'unlocked'} room ${roomId}`)
}

// ============================================================================
// Room Management Functions
// ============================================================================

/**
 * Get room info
 */
export function getMeetingRoom(roomId: string): MeetingRoom | undefined {
  return meetingRooms.get(roomId)
}

/**
 * Get all meeting rooms
 */
export function getAllMeetingRooms(): MeetingRoom[] {
  return Array.from(meetingRooms.values())
}

/**
 * Clean up inactive rooms
 */
export function cleanupInactiveRooms(maxIdleTimeMs: number = 4 * 60 * 60 * 1000): number {
  const now = Date.now()
  const roomsToClean: string[] = []

  meetingRooms.forEach((room, roomId) => {
    const idleTime = now - room.lastActivity.getTime()
    if (idleTime > maxIdleTimeMs) {
      roomsToClean.push(roomId)
    }
  })

  roomsToClean.forEach(roomId => {
    meetingRooms.delete(roomId)
    logger.info(`[Meeting] Cleaned up inactive room: ${roomId}`)
  })

  return roomsToClean.length
}

// ============================================================================
// Setup Function
// ============================================================================

/**
 * Setup voice meeting handlers on Socket.IO server
 */
export function setupVoiceMeetingHandlers(io: SocketIOServer): void {
  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`[Meeting] Voice meeting handlers ready for socket ${socket.id}`)

    // Voice meeting events
    socket.on('join-room', (payload: JoinRoomPayload) => {
      handleJoinRoom(socket, io, payload)
    })

    socket.on('leave-room', (payload: { roomId: string }) => {
      handleLeaveRoom(socket, io, payload)
    })

    // WebRTC signaling events
    socket.on('offer', (payload: OfferPayload) => {
      handleOffer(socket, io, payload)
    })

    socket.on('answer', (payload: AnswerPayload) => {
      handleAnswer(socket, io, payload)
    })

    socket.on('ice-candidate', (payload: IceCandidatePayload) => {
      handleIceCandidate(socket, io, payload)
    })

    // Participant state events
    socket.on('mute-state-changed', (payload: { muted: boolean }) => {
      handleMuteStateChanged(socket, io, payload)
    })

    // Host control events
    socket.on('mute-participant', (payload: { targetParticipantId: string; mute: boolean }) => {
      handleMuteParticipant(socket, io, payload)
    })

    socket.on('remove-participant', (payload: { targetParticipantId: string }) => {
      handleRemoveParticipant(socket, io, payload)
    })

    socket.on('lock-room', (payload: { locked: boolean }) => {
      handleLockRoom(socket, io, payload)
    })

    // Cleanup on disconnect
    socket.on('disconnect', () => {
      const roomId = socketToRoom.get(socket.id)
      if (roomId) {
        handleLeaveRoom(socket, io, { roomId })
      }
    })
  })

  // Schedule cleanup of inactive rooms every hour
  setInterval(
    () => {
      const cleaned = cleanupInactiveRooms()
      logger.info(`[Meeting] Cleanup check complete. Active rooms: ${meetingRooms.size}`)
    },
    60 * 60 * 1000
  )

  logger.info('[Meeting] Voice meeting handlers registered')
}
