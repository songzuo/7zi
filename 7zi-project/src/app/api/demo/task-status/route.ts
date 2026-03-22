/**
 * Task Status Update Demo API
 *
 * Simulates task status updates and broadcasts them via WebSocket.
 * This endpoint demonstrates the broadcastTaskStatusUpdate function.
 */

import { NextRequest } from 'next/server';
import { broadcastTaskStatusUpdate, broadcastTaskStatusToUser } from '@/lib/websocket/server';
import { success, validationError, internalError } from '@/lib/api/response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskId, status, state, userId, projectId, metadata } = body;

    // Validate required fields
    if (!taskId || !status || !state) {
      return validationError('taskId, status, and state are required');
    }

    // Validate state
    const validStates = ['submitted', 'running', 'completed', 'failed', 'cancelled'];
    if (!validStates.includes(state)) {
      return validationError(
        `Invalid state. Must be one of: ${validStates.join(', ')}`
      );
    }

    const update = {
      taskId,
      status,
      state,
      timestamp: new Date().toISOString(),
      userId,
      projectId,
      metadata,
    };

    // Broadcast to all clients
    await broadcastTaskStatusUpdate(update);

    // If userId provided, also send to specific user
    if (userId) {
      await broadcastTaskStatusToUser(userId, update);
    }

    return success({
      message: 'Task status update broadcasted',
      update,
    });
  } catch (err) {
    console.error('Error broadcasting task status update:', err);
    return internalError('Failed to broadcast task status update');
  }
}

// GET endpoint for testing
export async function GET() {
  return success({
    endpoint: 'Task Status Update Demo API',
    usage: {
      method: 'POST',
      body: {
        taskId: 'string (required)',
        status: 'string (required)',
        state: 'string (required) - submitted|running|completed|failed|cancelled',
        userId: 'string (optional)',
        projectId: 'string (optional)',
        metadata: 'object (optional)',
      },
    },
  });
}
