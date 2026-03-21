/**
 * WebSocket Broadcast API
 *
 * Allows broadcasting messages to all connected WebSocket clients.
 * Used for system announcements and global notifications.
 */

import { NextRequest, NextResponse } from 'next/server';
import { broadcastSystemAnnouncement } from '@/lib/websocket/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate request body
    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Broadcast to all clients
    await broadcastSystemAnnouncement(body.message);

    return NextResponse.json({
      success: true,
      message: 'Announcement broadcasted successfully',
    });
  } catch (error) {
    console.error('Error broadcasting announcement:', error);
    return NextResponse.json(
      { error: 'Failed to broadcast announcement' },
      { status: 500 }
    );
  }
}
