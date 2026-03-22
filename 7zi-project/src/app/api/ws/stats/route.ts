/**
 * WebSocket Server Statistics API
 *
 * Returns real-time statistics about the WebSocket server including:
 * - Connected clients count
 * - Active rooms
 * - Total users across all rooms
 */

import { NextResponse } from 'next/server';
import { getStats, getAllRooms } from '@/lib/websocket/server';

export async function GET() {
  try {
    const stats = await getStats();
    const rooms = await getAllRooms();

    return NextResponse.json({
      ...stats,
      rooms: rooms.map(room => ({
        id: room.id,
        name: room.name,
        type: room.type,
        userCount: room.userCount,
      })),
    });
  } catch (error) {
    console.error('Error fetching WebSocket stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch WebSocket statistics' },
      { status: 500 }
    );
  }
}
