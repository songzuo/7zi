/**
 * Room API Routes
 *
 * POST /api/rooms - 创建房间
 * GET /api/rooms - 获取房间列表
 * 
 * @openapi
 *   /api/rooms:
 *     post:
 *       summary: Create a new room
 *       description: Creates a new room with the given parameters
 *       tags:
 *         - rooms
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   description: Room name
 *                 description:
 *                   type: string
 *                   description: Room description (optional)
 *                 password:
 *                   type: string
 *                   description: Room password (optional)
 *                 isPrivate:
 *                   type: boolean
 *                   description: Whether room is private (optional)
 *       responses:
 *         201:
 *           description: Room created successfully
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/CreateRoomResponse'
 *         400:
 *           description: Invalid request
 *         401:
 *           description: Unauthorized
 *     get:
 *       summary: List all rooms
 *       description: Returns a list of all rooms with optional filtering
 *       tags:
 *         - rooms
 *       parameters:
 *         - name: search
 *           in: query
 *           schema:
 *             type: string
 *           description: Search query
 *         - name: page
 *           in: query
 *           schema:
 *             type: integer
 *           description: Page number
 *         - name: limit
 *           in: query
 *           schema:
 *             type: integer
 *           description: Items per page
 *       responses:
 *         200:
 *           description: Rooms retrieved successfully
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/GetRoomsResponse'
 */

import { NextRequest } from 'next/server'
import { roomStore } from '@/lib/api/rooms/store'
import {
  createSuccessResponse,
  createErrorResponse,
  createUnauthorizedError,
  createBadRequestError
} from '@/lib/api/error-handler'
import type {
  CreateRoomRequest,
  CreateRoomResponse,
  GetRoomsRequest,
  GetRoomsResponse,
  RoomPublicInfo
} from './types'
import { withCSRF } from '@/lib/middleware/csrf'
import { createHotDataCache, CachePresets } from '@/lib/cache'

// Cache for rooms list (short TTL due to frequent updates)
const roomsCache = createHotDataCache<unknown>(CachePresets.SHORT)

/**
 * Get current user information (from request headers)
 * In production, this should be from session/JWT
 */
function getCurrentUser(request: NextRequest): { id: string; name: string } | null {
  const userId = request.headers.get('x-user-id')
  const userName = request.headers.get('x-user-name')

  if (!userId || !userName) {
    // Use default user (development mode)
    return {
      id: 'dev-user',
      name: 'Developer',
    }
  }

  return { id: userId, name: userName }
}

/**
 * POST /api/rooms - Create room
 * Requires CSRF protection
 */
export const POST = withCSRF(async (request: NextRequest) => {
  try {
    const user = getCurrentUser(request)
    if (!user) {
      return createUnauthorizedError('Authentication required')
    }

    const body: CreateRoomRequest = await request.json()

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return createBadRequestError('Room name is required')
    }

    // Create room
    const room = roomStore.createRoom({
      ownerId: user.id,
      ownerName: user.name,
      name: body.name.trim(),
      description: body.description?.trim(),
      password: body.password,
      isPrivate: body.isPrivate,
    })

    // Invalidate rooms list cache since a new room was added
    roomsCache.deleteByEndpoint('rooms-list')

    const response: CreateRoomResponse = {
      id: room.id,
      name: room.name,
      inviteCode: room.inviteCode,
      createdAt: room.createdAt,
    }

    return createSuccessResponse(response, 201)
  } catch (error) {
    console.error('Failed to create room:', error)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
})

/**
 * GET /api/rooms - Get rooms list
 */
export async function GET(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    const { searchParams } = new URL(request.url)
    
    const queryParams: GetRoomsRequest = {
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20,
      sortBy: (searchParams.get('sortBy') as any) || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
    }

    // Generate cache key based on query params
    const cacheKey = {
      endpoint: 'rooms-list',
      params: queryParams as Record<string, unknown>,
      version: '1',
    }

    // Check cache (only for non-search queries to keep cache manageable)
    if (!queryParams.search) {
      const cachedResult = roomsCache.get(cacheKey)
      if (cachedResult) {
        return createSuccessResponse(cachedResult)
      }
    }

    const rooms = roomStore.getAllRooms()

    // Filter sensitive information (password, etc.)
    const publicRooms: RoomPublicInfo[] = rooms.map(room => ({
      id: room.id,
      name: room.name,
      description: room.description,
      ownerId: room.ownerId,
      ownerName: room.ownerName,
      inviteCode: room.inviteCode,
      memberCount: room.memberCount,
      onlineCount: room.onlineCount,
      createdAt: room.createdAt,
      hasPassword: !!room.password,
      isOwner: user?.id === room.ownerId,
    }))

    // Apply search filter if provided
    let filteredRooms = publicRooms
    if (queryParams.search) {
      const searchLower = queryParams.search.toLowerCase()
      filteredRooms = publicRooms.filter(room =>
        room.name.toLowerCase().includes(searchLower) ||
        (room.description && room.description.toLowerCase().includes(searchLower))
      )
    }

    // Apply sorting
    filteredRooms.sort((a, b) => {
      const aVal = a[queryParams.sortBy as keyof RoomPublicInfo]
      const bVal = b[queryParams.sortBy as keyof RoomPublicInfo]
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return queryParams.sortOrder === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return queryParams.sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      }
      
      return 0
    })

    // Apply pagination
    const startIndex = (queryParams.page! - 1) * queryParams.limit!
    const endIndex = startIndex + queryParams.limit!
    const paginatedRooms = filteredRooms.slice(startIndex, endIndex)

    const response: GetRoomsResponse = {
      rooms: paginatedRooms,
    }

    // Cache the response (only non-search queries)
    if (!queryParams.search) {
      roomsCache.set(cacheKey, response)
    }

    return createSuccessResponse(response)
  } catch (error) {
    console.error('Failed to get rooms:', error)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}