/**
 * A2A Queue API Route
 * 
 * Handles task scheduling, status updates, and queue management.
 */

import { NextRequest, NextResponse } from 'next/server';
import { agentScheduler } from '@/lib/agents/scheduler/scheduler';
import type { ScheduleTaskRequest, UpdateTaskRequest } from '@/lib/agents/scheduler/types';
import {
  createSuccessResponse,
  createErrorResponse,
} from '@/lib/api/error-handler';
import { authenticateJWT } from '@/lib/auth/api-auth';

// GET /api/a2a/queue - List tasks and queue stats
export async function GET(request: NextRequest) {
  const auth = await authenticateJWT(request);
  if (!auth.authenticated) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('id');
  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const agentId = searchParams.get('agentId');

  try {
    // Return single task if ID specified
    if (taskId) {
      const task = agentScheduler.getTask(taskId);
      if (!task) {
        return NextResponse.json(
          { success: false, error: 'Task not found' },
          { status: 404 }
        );
      }
      return createSuccessResponse({ task });
    }

    // Filter tasks
    let tasks = agentScheduler.getAllTasks();

    if (status) {
      tasks = tasks.filter((t) => t.status === status);
    }

    if (type) {
      tasks = tasks.filter((t) => t.type === type);
    }

    if (agentId) {
      tasks = tasks.filter((t) => t.agentId === agentId);
    }

    // Return stats
    const stats = agentScheduler.getQueueStats();

    return createSuccessResponse({
      tasks,
      stats,
      count: tasks.length,
    });
  } catch (error) {
    console.error('Queue GET error:', error);
    return createErrorResponse(new Error('Failed to fetch tasks'));
  }
}

// POST /api/a2a/queue - Schedule a new task
export async function POST(request: NextRequest) {
  const auth = await authenticateJWT(request);
  if (!auth.authenticated) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body: ScheduleTaskRequest = await request.json();

    if (!body.type) {
      return NextResponse.json(
        {
          success: false,
          error: { type: 'VALIDATION', message: 'Task type is required' },
        },
        { status: 400 }
      );
    }

    if (!body.input || typeof body.input !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: { type: 'VALIDATION', message: 'Input must be an object' },
        },
        { status: 400 }
      );
    }

    const response = agentScheduler.scheduleTask(body);

    if (!response.success) {
      return NextResponse.json(response, { status: 400 });
    }

    const task = agentScheduler.getTask(response.taskId!);
    return createSuccessResponse({ task, taskId: response.taskId }, 201);
  } catch (error) {
    console.error('Queue POST error:', error);
    return createErrorResponse(new Error('Failed to schedule task'));
  }
}

// PUT /api/a2a/queue - Update task status or output
export async function PUT(request: NextRequest) {
  const auth = await authenticateJWT(request);
  if (!auth.authenticated) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body: UpdateTaskRequest = await request.json();

    if (!body.taskId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'VALIDATION',
            message: 'Task ID is required',
          },
        },
        { status: 400 }
      );
    }

    const updated = agentScheduler.updateTask(body);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = agentScheduler.getTask(body.taskId);
    return createSuccessResponse({ task });
  } catch (error) {
    console.error('Queue PUT error:', error);
    return createErrorResponse(new Error('Failed to update task'));
  }
}

// DELETE /api/a2a/queue - Cancel a task
export async function DELETE(request: NextRequest) {
  const auth = await authenticateJWT(request);
  if (!auth.authenticated) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('id');

  if (!taskId) {
    return NextResponse.json(
      {
        success: false,
        error: { type: 'VALIDATION', message: 'Task ID is required' },
      },
      { status: 400 }
    );
  }

  try {
    const cancelled = agentScheduler.cancelTask(taskId);
    if (!cancelled) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    return createSuccessResponse({ message: 'Task cancelled successfully' });
  } catch (error) {
    console.error('Queue DELETE error:', error);
    return createErrorResponse(new Error('Failed to cancel task'));
  }
}
