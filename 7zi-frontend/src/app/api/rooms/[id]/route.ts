/**
 * Room Detail API Route
 *
 * GET /api/rooms/[id] - 获取房间详情
 * DELETE /api/rooms/[id] - 删除房间（仅创建者）
 */

import { NextRequest, NextResponse } from 'next/server'
import { roomStore } from '@/lib/api/rooms/store'
import { createSuccessResponse, createNotFoundError, createForbiddenError, createErrorResponse } from '@/lib/api/error-handler'
import { createHotDataCache, CachePresets } from '@/lib/cache'

// Cache for room details (short TTL due to frequent updates)
const roomDetailCache = createHotDataCache<unknown>(CachePresets.SHORT)

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/rooms/[id] - 获取房间详情
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Check cache first
    const cacheKey = {
      endpoint: 'room-detail',
      params: { roomId: id },
      version: '1',
    }
    const cachedResult = roomDetailCache.get(cacheKey)
    if (cachedResult) {
      return createSuccessResponse(cachedResult)
    }

    const room = roomStore.getRoomById(id)

    if (!room) {
      return createNotFoundError('Room not found')
    }

    // 获取当前用户
    const userId = request.headers.get('x-user-id') || 'dev-user'

    // 过滤敏感信息
    const publicRoom = {
      id: room.id,
      name: room.name,
      description: room.description,
      ownerId: room.ownerId,
      ownerName: room.ownerName,
      inviteCode: room.inviteCode,
      memberCount: room.memberCount,
      onlineCount: room.onlineCount,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      hasPassword: !!room.password,
      isOwner: userId === room.ownerId,
    }

    // 过滤成员敏感信息
    const participants = room.members.map(member => ({
      id: member.id,
      name: member.name,
      avatar: member.avatar,
      role: member.role,
      isOnline: member.isOnline,
      joinedAt: member.joinedAt,
    }))

    const response = { room: publicRoom, participants }

    // Cache the response
    roomDetailCache.set(cacheKey, response)

    return createSuccessResponse(response)
  } catch (error) {
    console.error('Failed to get room:', error)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * DELETE /api/rooms/[id] - 删除房间
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const room = roomStore.getRoomById(id)

    if (!room) {
      return createNotFoundError('Room not found')
    }

    // 获取当前用户
    const userId = request.headers.get('x-user-id') || 'dev-user'

    // 检查是否是房主
    if (room.ownerId !== userId) {
      return createForbiddenError('Only the room owner can delete the room')
    }

    const deleted = roomStore.deleteRoom(id)

    if (!deleted) {
      return createErrorResponse(new Error('Failed to delete room'), 500)
    }

    // Invalidate caches
    roomDetailCache.delete({ endpoint: 'room-detail', params: { roomId: id } })
    roomDetailCache.delete({ endpoint: 'rooms-list', params: {} })

    return createSuccessResponse({ message: 'Room deleted successfully' })
  } catch (error) {
    console.error('Failed to delete room:', error)
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}
