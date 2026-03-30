/**
 * Room Detail API Route
 *
 * GET /api/rooms/[id] - 获取房间详情
 * DELETE /api/rooms/[id] - 删除房间（仅创建者）
 */

import { NextRequest, NextResponse } from 'next/server';
import { roomStore } from '@/lib/api/rooms/store';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/rooms/[id] - 获取房间详情
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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
    };

    // 过滤成员敏感信息
    const participants = room.members.map((member) => ({
      id: member.id,
      name: member.name,
      avatar: member.avatar,
      role: member.role,
      isOnline: member.isOnline,
      joinedAt: member.joinedAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        room: publicRoom,
        participants,
      },
    });
  } catch (error) {
    console.error('Failed to get room:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get room' },
      { status: 500 }
    );
  }
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
        { success: false, error: 'Only the room owner can delete the room' },
        { status: 403 }
      );
    }

    const deleted = roomStore.deleteRoom(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete room' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Room deleted successfully' },
    });
  } catch (error) {
    console.error('Failed to delete room:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete room' },
      { status: 500 }
    );
  }
}
