/**
 * WebSocket API Route
 *
 * Next.js API route that upgrades HTTP connections to WebSocket.
 * This route is used by the Socket.IO client to establish real-time connections.
 */

import { NextRequest } from 'next/server';
import { createServer, getStats } from '@/lib/websocket/server';
import { error, success } from '@/lib/api/response';

// ============================================================================
// GET Handler - WebSocket Upgrade
// ============================================================================

export async function GET(req: NextRequest) {
  // Check if this is a WebSocket upgrade request
  const upgradeHeader = req.headers.get('upgrade');
  if (upgradeHeader !== 'websocket') {
    return error(
      'INVALID_REQUEST',
      'This endpoint is for WebSocket connections only',
      { status: 400 }
    );
  }

  // Create/initialize the WebSocket server
  return createServer(req);
}

// ============================================================================
// GET Stats Handler - Server Statistics
// ============================================================================

export async function GET_STATS() {
  const stats = await getStats();
  return success(stats);
}
