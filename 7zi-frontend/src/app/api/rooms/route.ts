/**
 * Room API Routes
 *
 * POST /api/rooms - 创建房间
 * GET /api/rooms - 获取房间列表
 */

import { NextRequest, NextResponse } from 'next/server'
import { roomStore } from '@/lib/api/rooms/store'
import { createSuccessResponse, createErrorResponse } from '@/lib/api/error-handler'

/**
 * 获取当前用户信息（从请求头）
 * 在实际应用中应该从 session/JWT 获取
 */
function getCurrentUser(request: NextRequest): { id: string; name: string } | null {
  const userId = request.headers.get('x-user-id')
  const userName = request.headers.get('x-user-name')

  if (!userId || !userName) {
    // 使用默认用户（开发模式）
    return {
      id: 'dev-user',
      name: 'Developer',
    }
  }

  return { id: userId, name: userName }
}

/**
 * POST /api/rooms - 创建房间
 */
export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // 验证必填字段
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ success: false, error: 'Room name is required' }, { status: 400 })
    }

    // 创建房间
    const room = roomStore.createRoom({
      ownerId: user.id,
      ownerName: user.name,
      name: body.name.trim(),
      description: body.description?.trim(),
      password: body.password,
      isPrivate: body.isPrivate,
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          id: room.id,
          name: room.name,
          inviteCode: room.inviteCode,
          createdAt: room.createdAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create room:', error)
    return NextResponse.json({ success: false, error: 'Failed to create room' }, { status: 500 })
  }
}

/**
 * GET /api/rooms - 获取房间列表
 */
export async function GET(request: NextRequest) {
  try {
    const user = getCurrentUser(request)

    const rooms = roomStore.getAllRooms()

    // 过滤敏感信息（密码等）
    const publicRooms = rooms.map(room => ({
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

    return NextResponse.json({
      success: true,
      data: { rooms: publicRooms },
    })
  } catch (error) {
    console.error('Failed to get rooms:', error)
    return NextResponse.json({ success: false, error: 'Failed to get rooms' }, { status: 500 })
  }
}
