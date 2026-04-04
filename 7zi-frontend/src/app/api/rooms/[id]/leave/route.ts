/**
 * Room Leave API Route
 *
 * POST /api/rooms/[id]/leave - 离开房间
 */

import { NextRequest, NextResponse } from 'next/server'
import { roomStore } from '@/lib/api/rooms/store'
import { withErrorHandling, createSuccessResponse, createNotFoundError, createBadRequestError } from '@/lib/api/error-handler'
import { logger } from '@/lib/logger'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/rooms/[id]/leave - 离开房间
 */
// @ts-expect-error - TypeScript generic limitation with withErrorHandling
export const POST = withErrorHandling(async (request: NextRequest, ...args: unknown[]) => {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id } = await params
  const room = roomStore.getRoomById(id)

  if (!room) {
    return createNotFoundError('Room not found')
  }

  // 获取当前用户
  const userId = request.headers.get('x-user-id') || 'dev-user'

  // 检查用户是否在房间中
  const member = room.members.find(m => m.id === userId)
  if (!member) {
    return createBadRequestError('You are not in this room')
  }

  // 不能让房主离开房间（只能删除或转让）
  if (member.role === 'owner') {
    return createBadRequestError(
      'Owner cannot leave room. Delete the room or transfer ownership first.'
    )
  }

  const updatedRoom = roomStore.leaveRoom(id, userId)

  if (!updatedRoom) {
    logger.error('Failed to leave room', new Error('Room update failed'), { roomId: id, userId })
    throw new Error('Failed to leave room')
  }

  return createSuccessResponse({ message: 'Left room successfully' })
})
