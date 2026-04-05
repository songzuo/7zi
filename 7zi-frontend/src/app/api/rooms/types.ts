/**
 * Rooms API Types
 *
 * Request and response types for rooms endpoints
 */

import type { Room, RoomParticipant } from '@/lib/api/rooms/types'
import type { PaginatedResponse } from '@/types/api'

// ============================================
// Request Types
// ============================================

/**
 * POST /api/rooms - Create room request
 */
export interface CreateRoomRequest {
  name: string
  description?: string
  password?: string
  isPrivate?: boolean
}

/**
 * GET /api/rooms - Get rooms list request
 */
export interface GetRoomsRequest {
  search?: string
  page?: number
  limit?: number
  sortBy?: 'name' | 'createdAt' | 'memberCount'
  sortOrder?: 'asc' | 'desc'
}

/**
 * POST /api/rooms/[id]/join - Join room request
 */
export interface JoinRoomRequest {
  password?: string
}

/**
 * POST /api/rooms/[id]/leave - Leave room request
 */
export interface LeaveRoomRequest {
  userId: string
}

// ============================================
// Response Types
// ============================================

/**
 * POST /api/rooms - Create room response
 */
export interface CreateRoomResponse {
  id: string
  name: string
  inviteCode: string
  createdAt: number
}

/**
 * GET /api/rooms - Get rooms list response
 */
export interface GetRoomsResponse {
  rooms: RoomPublicInfo[]
}

/**
 * Room public information (filtered)
 */
export interface RoomPublicInfo {
  id: string
  name: string
  description?: string
  ownerId: string
  ownerName: string
  inviteCode: string
  memberCount: number
  onlineCount: number
  createdAt: number
  hasPassword: boolean
  isOwner: boolean
}

/**
 * POST /api/rooms/[id]/join - Join room response
 */
export interface JoinRoomResponse {
  room: RoomPublicInfo
  participant: RoomParticipant
}

/**
 * POST /api/rooms/[id]/leave - Leave room response
 */
export interface LeaveRoomResponse {
  success: boolean
  message: string
}

/**
 * GET /api/rooms/[id] - Get room details response
 */
export interface GetRoomResponse {
  room: RoomPublicInfo
  participants: RoomParticipant[]
}

// ============================================
// OpenAPI-style Annotations
// ============================================

/**
 * OpenAPI endpoint metadata for rooms API
 */
export const ROOMS_API_META = {
  '/api/rooms': {
    post: {
      summary: 'Create a new room',
      description: 'Creates a new room with the given parameters',
      requestBody: {
        contentType: 'application/json',
        schema: 'CreateRoomRequest',
        required: true,
      },
      responses: {
        201: {
          description: 'Room created successfully',
          code: 201,
        },
        400: {
          description: 'Invalid request',
          code: 400,
        },
        401: {
          description: 'Unauthorized',
          code: 401,
        },
      },
    },
    get: {
      summary: 'List all rooms',
      description: 'Returns a list of all rooms with optional filtering',
      responses: {
        200: {
          description: 'Rooms retrieved successfully',
          code: 200,
        },
      },
    },
  },
  '/api/rooms/{id}': {
    get: {
      summary: 'Get room details',
      description: 'Returns detailed information about a specific room',
      responses: {
        200: {
          description: 'Room details retrieved successfully',
          code: 200,
        },
        404: {
          description: 'Room not found',
          code: 404,
        },
      },
    },
  },
  '/api/rooms/{id}/join': {
    post: {
      summary: 'Join a room',
      description: 'Joins the current user to a room',
      requestBody: {
        contentType: 'application/json',
        schema: 'JoinRoomRequest',
        required: false,
      },
      responses: {
        200: {
          description: 'Joined room successfully',
          code: 200,
        },
        401: {
          description: 'Unauthorized',
          code: 401,
        },
        403: {
          description: 'Forbidden (wrong password)',
          code: 403,
        },
        404: {
          description: 'Room not found',
          code: 404,
        },
      },
    },
  },
  '/api/rooms/{id}/leave': {
    post: {
      summary: 'Leave a room',
      description: 'Removes the current user from a room',
      responses: {
        200: {
          description: 'Left room successfully',
          code: 200,
        },
        401: {
          description: 'Unauthorized',
          code: 401,
        },
        404: {
          description: 'Room not found',
          code: 404,
        },
      },
    },
  },
} as const
