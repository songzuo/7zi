/**
 * Task Update Feed Component
 *
 * Displays real-time task updates in a feed format.
 */

'use client';

import React, { useEffect } from 'react';
import { useTaskRealtime } from '@/lib/realtime/useTaskRealtime';
import type {
  TaskStatusChangedPayload,
  TaskAssignedPayload,
  TaskCommentPayload,
  TaskDeletedPayload,
  TaskUpdatedPayload,
  MemberOnlinePayload,
  MemberOfflinePayload,
  SystemAnnouncementPayload,
} from '@/lib/realtime/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Task update item
 */
export interface TaskUpdateItem {
  type: 'status_changed' | 'assigned' | 'comment' | 'member_online' | 'member_offline' | 'system' | 'deleted' | 'updated';
  data: TaskStatusChangedPayload | TaskAssignedPayload | TaskCommentPayload | MemberOnlinePayload | MemberOfflinePayload | SystemAnnouncementPayload | null;
  timestamp: string;
  id?: string;
}

export interface TaskUpdateFeedProps {
  userId?: string;
  projectId?: string;
  taskId?: string;
  maxUpdates?: number;
}

// ============================================================================
// Component Implementation
// ============================================================================

export function TaskUpdateFeed({
  userId,
  projectId,
  taskId,
  maxUpdates = 20,
}: TaskUpdateFeedProps) {
  const {
    isConnected,
    connectionState,
    recentUpdates,
    updatesCount,
    clearUpdates,
    subscribeToTask,
    subscribeToProject,
    subscribeToUser,
  } = useTaskRealtime({ maxUpdates });

  useEffect(() => {
    const cleanups: Array<() => void> = [];

    if (taskId) {
      cleanups.push(subscribeToTask(taskId));
    }

    if (projectId) {
      cleanups.push(subscribeToProject(projectId));
    }

    if (userId) {
      cleanups.push(subscribeToUser(userId));
    }

    return () => {
      cleanups.forEach(cleanup => cleanup());
    };
  }, [taskId, projectId, userId, subscribeToTask, subscribeToProject, subscribeToUser]);

  const formatUpdateMessage = (update: TaskUpdateItem) => {
    const { type, data } = update;

    switch (type) {
      case 'status_changed':
        const statusData = data as unknown as TaskStatusChangedPayload;
        return `Status changed from "${statusData.oldStatus}" to "${statusData.newStatus}"`;

      case 'assigned':
        const assignedData = data as unknown as TaskAssignedPayload;
        return `Assigned to ${assignedData.assignedTo.name} by ${assignedData.assignedBy.name}`;

      case 'comment':
        const commentData = data as unknown as TaskCommentPayload;
        return `New comment from ${commentData.author.name}: "${commentData.content.substring(0, 50)}..."`;

      case 'deleted':
        const deletedData = data as unknown as TaskDeletedPayload;
        return `Task "${deletedData.taskTitle}" was deleted`;

      case 'updated':
        const updatedData = data as unknown as TaskUpdatedPayload;
        return `Task "${updatedData.taskTitle}" was updated`;

      default:
        return 'Unknown update';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Task Updates
          </h3>
          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>
              {connectionState} ({updatesCount} updates)
            </span>
          </div>
        </div>

        <button
          onClick={clearUpdates}
          disabled={updatesCount === 0}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 disabled:opacity-50"
        >
          Clear
        </button>
      </div>

      {/* Updates List */}
      <div className="space-y-2">
        {recentUpdates.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 dark:text-zinc-400">
            No recent updates
          </div>
        ) : (
          recentUpdates.slice(0, maxUpdates).map((update, index) => (
            <div
              key={`${update.taskId}-${index}-${update.timestamp}`}
              className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700"
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    update.type === 'status_changed' ? 'bg-blue-500' :
                    update.type === 'assigned' ? 'bg-green-500' :
                    update.type === 'comment' ? 'bg-purple-500' :
                    update.type === 'deleted' ? 'bg-red-500' :
                    'bg-zinc-500'
                  }`} />
                  <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {update.taskId}
                  </span>
                </div>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {new Date(update.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {formatUpdateMessage(update)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TaskUpdateFeed;
