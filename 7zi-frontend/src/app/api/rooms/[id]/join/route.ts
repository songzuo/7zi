/**
 * Room Join API Route
 *
 * POST /api/rooms/[id]/join - 加入房间
 */

import { NextRequest, NextResponse } from 'next/server'
import { roomStore } from '@/lib/api/rooms/store'
import { withErrorHandling, createSuccessResponse, createNotFoundError, createBadRequestError, createUnauthorizedError } from '@/lib/api/error-handler'
import { logger } from '@/lib/logger'
import { withCSRF } from '@/lib/middleware/csrf'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/rooms/[id]/join - 加入房间
 * Requires CSRF protection
 */
// @ts-expect-error - TypeScript generic limitation with withErrorHandling
export const POST = withErrorHandling(withCSRF(async (request: NextRequest, ...args: unknown[]) => {
  const { params } = args[0] as { params: Promise<{ id: string }> }
  const { id } = await params
  const room = roomStore.getRoomById(id)

  if (!room) {
    return createNotFoundError('Room not found')
  }

  // 获取当前用户
  const userId = request.headers.get('x-user-id') || 'dev-user'
  const userName = request.headers.get('x-user-name') || 'Developer'

  // 解析请求体
  const body = await request.json().catch(() => ({}))

  // 验证邀请码（如果提供）
  if (body.inviteCode && body.inviteCode !== room.inviteCode) {
    return createBadRequestError('Invalid invite code')
  }

  // 验证密码（如果房间有密码）
  if (room.password && !body.password && room.password !== body.password) {
    // 检查是否是房间成员
    const isMember = room.members.some(m => m.id === userId)
    if (!isMember) {
      return createUnauthorizedError('Password required')
    }
  }

  try {
    const updatedRoom = roomStore.joinRoom(id, { id: userId, name: userName }, body.password)

    if (!updatedRoom) {
      logger.error('Failed to join room', new Error('Room update failed'), { roomId: id, userId })
      throw new Error('Failed to join room')
    }

    return createSuccessResponse({
      room: {
        id: updatedRoom.id,
        name: updatedRoom.name,
        inviteCode: updatedRoom.inviteCode,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Incorrect password') {
      return createUnauthorizedError('Incorrect password')
    }
    throw error
  }
}))
