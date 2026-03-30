/**
 * Room Delete API Route
 *
 * DELETE /api/rooms/[id] - 删除房间（仅创建者）
 */

import { NextRequest, NextResponse } from 'next/server';
import { roomStore } from '@/lib/api/rooms/store';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/rooms/[id] - 删除房间
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // 检查是否是房主
    if (room.ownerId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Only room owner can delete the room' },
        { status: 403 }
      );
    }

    // 删除房间
    const deleted = roomStore.deleteRoom(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete room' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Room deleted successfully',
        roomId: id,
      },
    });
  } catch (error) {
    console.error('Failed to delete room:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete room' },
      { status: 500 }
    );
  }
}
