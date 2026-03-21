/**
 * Task Status Update Demo API
 *
 * Simulates task status updates and broadcasts them via WebSocket.
 * This endpoint demonstrates the broadcastTaskStatusUpdate function.
 */

import { NextRequest, NextResponse } from 'next/server';
import { broadcastTaskStatusUpdate, broadcastTaskStatusToUser } from '@/lib/websocket/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskId, status, state, userId, projectId, metadata } = body;

    // Validate required fields
    if (!taskId || !status || !state) {
      return NextResponse.json(
        { error: 'taskId, status, and state are required' },
        { status: 400 }
      );
    }

    // Validate state
    const validStates = ['submitted', 'running', 'completed', 'failed', 'cancelled'];
    if (!validStates.includes(state)) {
      return NextResponse.json(
        { error: `Invalid state. Must be one of: ${validStates.join(', ')}` },
        { status: 400 }
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

    return NextResponse.json({
      success: true,
      message: 'Task status update broadcasted',
      update,
    });
  } catch (error) {
    console.error('Error broadcasting task status update:', error);
    return NextResponse.json(
      { error: 'Failed to broadcast task status update' },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
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
