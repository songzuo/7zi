/**
 * Socket.IO Setup API Route
 *
 * Initializes the Socket.IO server for real-time notifications.
 * This route should be called once during server startup.
 */

import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/notification';
import { createServer } from 'http';

/**
 * GET /api/notifications/socket
 *
 * Returns Socket.IO server status and configuration
 */
export async function GET() {
  const io = notificationService.getIO();

  return NextResponse.json({
    success: true,
    data: {
      initialized: !!io,
      message: io
        ? 'Socket.IO server is running'
        : 'Socket.IO server not initialized yet',
    },
  });
}

/**
 * POST /api/notifications/socket
 *
 * Initialize Socket.IO server (typically called on server startup)
 */
export async function POST(request: NextRequest) {
  try {
    const io = notificationService.getIO();

    if (io) {
      return NextResponse.json({
        success: true,
        data: {
          message: 'Socket.IO server already initialized',
        },
      });
    }

    // Create a simple HTTP server for Socket.IO
    const httpServer = createServer();
    notificationService.initialize(httpServer);

    // Start the server on a different port
    const SOCKET_PORT = process.env.NOTIFICATION_SOCKET_PORT || 3001;
    httpServer.listen(SOCKET_PORT, () => {
      console.log(`[Socket.IO] Server listening on port ${SOCKET_PORT}`);
    });

    // Set up periodic cleanup
    setInterval(() => {
      notificationService.cleanupExpired();
    }, 5 * 60 * 1000); // Every 5 minutes

    return NextResponse.json({
      success: true,
      data: {
        message: 'Socket.IO server initialized',
        port: SOCKET_PORT,
      },
    });
  } catch (error) {
    console.error('[POST /api/notifications/socket] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialize Socket.IO server',
      },
      { status: 500 }
    );
  }
}
