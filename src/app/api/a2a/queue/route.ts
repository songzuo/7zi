/**
 * A2A Message Queue API Route
 * GET    /api/a2a/queue - Get queue status and statistics
 * POST   /api/a2a/queue - Enqueue a new message
 * DELETE /api/a2a/queue - Clear the queue
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMessageQueue } from '@/lib/agents/a2a/message-queue';
import { QueueMessage } from '@/lib/agents/a2a/types';
import type { TaskPriority } from '@/lib/agents/a2a/types';
import { logger } from '@/lib/logger';

/**
 * GET /api/a2a/queue
 * Get queue status and statistics
 */
export async function GET() {
  try {
    const queue = getMessageQueue();
    const stats = queue.getStats();

    // Peek at next message
    const nextMessage = queue.peek();

    return NextResponse.json({
      status: 'ok',
      stats: {
        total: stats.total,
        byPriority: stats.byPriority,
        byAgent: stats.byAgent,
      },
      nextMessage,
      config: queue.getConfig(),
    });
  } catch (error) {
    console.error('Queue GET error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get queue status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/a2a/queue
 * Enqueue a new message
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Basic validation
    if (!body.taskId || !body.agentId) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'Missing required fields: taskId, agentId',
        },
        { status: 400 }
      );
    }

    const message: QueueMessage = {
      id: body.id,
      taskId: body.taskId,
      agentId: body.agentId,
      priority: body.priority || 'normal',
      payload: body.payload || {},
      createdAt: body.createdAt || new Date().toISOString(),
      attempts: body.attempts || 0,
      maxAttempts: body.maxAttempts || 3,
      nextRetryAt: body.nextRetryAt,
    };

    const queue = getMessageQueue();
    queue.enqueue(message);

    return NextResponse.json(
      {
        message: 'Message enqueued successfully',
        queueSize: queue.size(),
        queuedMessage: message,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Queue POST error:', error);
    return NextResponse.json(
      {
        error: 'Failed to enqueue message',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/a2a/queue
 * Clear all messages from the queue
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const priority = searchParams.get('priority');

    const queue = getMessageQueue();

    if (agentId) {
      // Remove all messages for a specific agent
      const messages = queue.getMessagesByAgent(agentId);
      let removed = 0;
      for (const message of messages) {
        if (queue.remove(message.id)) {
          removed++;
        }
      }
      return NextResponse.json({
        message: `Removed ${removed} messages for agent ${agentId}`,
        removed,
        queueSize: queue.size(),
      });
    } else if (priority) {
      // Remove all messages with a specific priority
      const messages = queue.getMessagesByPriority(priority as TaskPriority);
      let removed = 0;
      for (const message of messages) {
        if (queue.remove(message.id)) {
          removed++;
        }
      }
      return NextResponse.json({
        message: `Removed ${removed} messages with priority ${priority}`,
        removed,
        queueSize: queue.size(),
      });
    } else {
      // Clear the entire queue
      queue.clear();
      return NextResponse.json({
        message: 'Queue cleared successfully',
        queueSize: queue.size(),
      });
    }
  } catch (error) {
    logger.error('Queue DELETE error', error);
    return NextResponse.json(
      {
        error: 'Failed to clear queue',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
