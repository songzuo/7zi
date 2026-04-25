// @ts-nocheck
/**
 * Task Status Broadcast Utilities
 *
 * Helper functions for broadcasting task status updates to rooms or users
 */

import { broadcastToRoom, broadcastToAll } from './broadcast'
import { logger } from '@/lib/logger'

export interface TaskStatusUpdate {
  taskId: string
  status: string
  state: 'submitted' | 'running' | 'completed' | 'failed' | 'cancelled'
  timestamp: string
  userId?: string
  projectId?: string
  metadata?: Record<string, unknown>
}

/**
 * Broadcast task status update to all connected clients
 */
export async function broadcastTaskStatusUpdate(update: TaskStatusUpdate): Promise<void> {
  const message = {
    id: crypto.randomUUID(),
    type: 'task_status',
    taskId: update.taskId,
    status: update.status,
    state: update.state,
    userId: update.userId,
    projectId: update.projectId,
    metadata: update.metadata,
    timestamp: update.timestamp || new Date().toISOString(),
  }

  broadcastToAll('task:status_update', message)

  if (update.projectId) {
    const roomId = `project:${update.projectId}`
    broadcastToRoom(roomId, 'task:status_update', message)
  }

  logger.info('Task status update broadcasted', {
    taskId: update.taskId,
    status: update.status,
    state: update.state,
  })
}

/**
 * Broadcast task status update to specific user
 */
export async function broadcastTaskStatusToUser(
  userId: string,
  update: TaskStatusUpdate
): Promise<void> {
  const { broadcastToUser } = await import('./broadcast')

  const message = {
    id: crypto.randomUUID(),
    type: 'task_status',
    taskId: update.taskId,
    status: update.status,
    state: update.state,
    userId: update.userId,
    projectId: update.projectId,
    metadata: update.metadata,
    timestamp: update.timestamp || new Date().toISOString(),
  }

  broadcastToUser(userId, 'task:status_update', message)

  logger.info('Task status update sent to user', {
    userId,
    taskId: update.taskId,
    status: update.status,
  })
}
