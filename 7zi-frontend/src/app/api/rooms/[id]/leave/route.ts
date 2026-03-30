/**
 * Room Leave API Route
 *
 * POST /api/rooms/[id]/leave - 离开房间
 */

import { NextRequest, NextResponse } from 'next/server';
import { roomStore } from '@/lib/api/rooms/store';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/rooms/[id]/leave - 离开房间
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const room = roomStore.getRoomById(id);

    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }

    // 获取当前用户
    const userId = request.headers.get('x-user-id') || 'dev-user';

    // 检查用户是否在房间中
    const member = room.members.find((m) => m.id === userId);
    if (!member) {
      return NextResponse.json(
        { success: false, error: 'You are not in this room' },
        { status: 400 }
      );
    }

    // 检查是否是房主（房主不能离开房间，只能删除或转让）
    if (room.ownerId === userId) {
      return NextResponse.json(
        { success: false, error: 'Room owner cannot leave. Transfer ownership or delete the room instead.' },
        { status: 400 }
      );
    }

    const updatedRoom = roomStore.leaveRoom(id, userId);

    return NextResponse.json({
      success: true,
      data: {
        room: updatedRoom ? {
          id: updatedRoom.id,
          name: updatedRoom.name,
        } : null,
      },
    });
  } catch (error) {
    console.error('Failed to leave room:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to leave room' },
      { status: 500 }
    );
  }
}
