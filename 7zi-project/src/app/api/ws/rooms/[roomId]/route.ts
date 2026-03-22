/**
 * WebSocket Room Information API
 *
 * Returns detailed information about a specific room including:
 * - Room metadata
 * - List of users in the room
 * - Activity timestamps
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRoomInfo } from '@/lib/websocket/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const roomInfo = await getRoomInfo(params.roomId);

    if (!roomInfo) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(roomInfo);
  } catch (error) {
    console.error('Error fetching room info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room information' },
      { status: 500 }
    );
  }
}
