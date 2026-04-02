/**
 * Room Leave API Route
 *
 * POST /api/rooms/[id]/leave - 离开房间
 */

import { NextRequest, NextResponse } from 'next/server'
import { roomStore } from '@/lib/api/rooms/store'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/rooms/[id]/leave - 离开房间
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const room = roomStore.getRoomById(id)

    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
    }

    // 获取当前用户
    const userId = request.headers.get('x-user-id') || 'dev-user'

    // 检查用户是否在房间中
    const member = room.members.find(m => m.id === userId)
    if (!member) {
      return NextResponse.json(
        { success: false, error: 'You are not in this room' },
        { status: 400 }
      )
    }

    // 不能让房主离开房间（只能删除或转让）
    if (member.role === 'owner') {
      return NextResponse.json(
        {
          success: false,
          error: 'Owner cannot leave room. Delete the room or transfer ownership first.',
        },
        { status: 400 }
      )
    }

    const updatedRoom = roomStore.leaveRoom(id, userId)

    if (!updatedRoom) {
      return NextResponse.json({ success: false, error: 'Failed to leave room' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Left room successfully' },
    })
  } catch (error) {
    console.error('Failed to leave room:', error)
    return NextResponse.json({ success: false, error: 'Failed to leave room' }, { status: 500 })
  }
}
