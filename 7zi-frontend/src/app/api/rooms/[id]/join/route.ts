/**
 * Room Join API Route
 *
 * POST /api/rooms/[id]/join - 加入房间
 */

import { NextRequest, NextResponse } from 'next/server';
import { roomStore } from '@/lib/api/rooms/store';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/rooms/[id]/join - 加入房间
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
    const userName = request.headers.get('x-user-name') || 'Developer';

    // 解析请求体
    const body = await request.json().catch(() => ({}));

    // 验证邀请码（如果提供）
    if (body.inviteCode && body.inviteCode !== room.inviteCode) {
      return NextResponse.json(
        { success: false, error: 'Invalid invite code' },
        { status: 400 }
      );
    }

    // 验证密码（如果房间有密码）
    if (room.password && !body.password && room.password !== body.password) {
      // 检查是否是房间成员
      const isMember = room.members.some((m) => m.id === userId);
      if (!isMember) {
        return NextResponse.json(
          { success: false, error: 'Password required' },
          { status: 401 }
        );
      }
    }

    try {
      const updatedRoom = roomStore.joinRoom(
        id,
        { id: userId, name: userName },
        body.password
      );

      if (!updatedRoom) {
        return NextResponse.json(
          { success: false, error: 'Failed to join room' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          room: {
            id: updatedRoom.id,
            name: updatedRoom.name,
            inviteCode: updatedRoom.inviteCode,
          },
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Incorrect password') {
        return NextResponse.json(
          { success: false, error: 'Incorrect password' },
          { status: 401 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Failed to join room:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to join room' },
      { status: 500 }
    );
  }
}
