/**
 * Real-time Task Updates Hook
 *
 * Subscribes to real-time updates for specific tasks and projects.
 * Handles task status changes, comments, assignments, and more.
 */

'use client';

import { useCallback, useState } from 'react';
import { useEnhancedWebSocket } from '@/lib/realtime/useEnhancedWebSocket';
import type {
  TaskStatusChangedPayload,
  TaskAssignedPayload,
  TaskCommentPayload,
} from '@/lib/realtime/types';
import { logger } from '../logger';

// ============================================================================
// Types
// ============================================================================

export interface TaskRealtimeUpdate {
  type: 'status_changed' | 'assigned' | 'comment' | 'deleted' | 'updated';
  taskId: string;
  timestamp: string;
  data: TaskStatusChangedPayload | TaskAssignedPayload | TaskCommentPayload;
}

export interface UseTaskRealtimeReturn {
  isConnected: boolean;
  connectionState: string;
  recentUpdates: TaskRealtimeUpdate[];
  updatesCount: number;

  // Actions
  clearUpdates: () => void;
  subscribeToTask: (taskId: string) => () => void;
  subscribeToProject: (projectId: string) => () => void;
  subscribeToUser: (userId: string) => () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useTaskRealtime(
  config?: {
    autoConnect?: boolean;
    maxUpdates?: number;
  }
): UseTaskRealtimeReturn {
  const [recentUpdates, setRecentUpdates] = useState<TaskRealtimeUpdate[]>([]);
  const maxUpdates = config?.maxUpdates || 50;

  const {
    isConnected,
    connectionState,
    on,
    subscribe,
    unsubscribe,
  } = useEnhancedWebSocket({
    url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3000',
    autoConnect: config?.autoConnect !== false,
    reconnect: true,
  });

  // Add update to the list
  const addUpdate = useCallback((update: TaskRealtimeUpdate) => {
    setRecentUpdates(prev => {
      const updated = [update, ...prev].slice(0, maxUpdates);
      return updated;
    });

    logger.info('Task real-time update received', {
      type: update.type,
      taskId: update.taskId,
    });
  }, [maxUpdates]);

  // Clear all updates
  const clearUpdates = useCallback(() => {
    setRecentUpdates([]);
  }, []);

  // Subscribe to task updates
  const subscribeToTask = useCallback((taskId: string) => {
    const channel = `task:${taskId}`;
    subscribe([channel]);

    // Listen for task-specific events
    const cleanupStatus = on('task:status_changed', (data) => {
      // @ts-expect-error - Type assertion for payload
      const payload = data as TaskStatusChangedPayload;
      if (payload.taskId === taskId) {
        addUpdate({
          type: 'status_changed',
          taskId,
          timestamp: new Date().toISOString(),
          data: payload,
        });
      }
    });

    const cleanupAssigned = on('task:assigned', (data) => {
      // @ts-expect-error - Type assertion for payload
      const payload = data as TaskAssignedPayload;
      if (payload.taskId === taskId) {
        addUpdate({
          type: 'assigned',
          taskId,
          timestamp: new Date().toISOString(),
          data: payload,
        });
      }
    });

    const cleanupComment = on('task:comment', (data) => {
      // @ts-expect-error - Type assertion for payload
      const payload = data as TaskCommentPayload;
      if (payload.taskId === taskId) {
        addUpdate({
          type: 'comment',
          taskId,
          timestamp: new Date().toISOString(),
          data: payload,
        });
      }
    });

    // Return cleanup function
    return () => {
      cleanupStatus();
      cleanupAssigned();
      cleanupComment();
      unsubscribe([channel]);
    };
  }, [on, subscribe, unsubscribe, addUpdate]);

  // Subscribe to project updates (all tasks in project)
  const subscribeToProject = useCallback((projectId: string) => {
    const channel = `project:${projectId}`;
    subscribe([channel]);

    // Listen for project-wide task events
    const cleanupTaskCreated = on('task:created', (data) => {
      const payload = data as unknown as { taskId: string; projectId: string };
      if (payload.projectId === projectId) {
        addUpdate({
          type: 'updated',
          taskId: payload.taskId,
          timestamp: new Date().toISOString(),
          data: data as unknown as TaskStatusChangedPayload | TaskAssignedPayload | TaskCommentPayload,
        });
      }
    });

    const cleanupTaskUpdated = on('task:updated', (data) => {
      const payload = data as unknown as { taskId: string; projectId: string };
      if (payload.projectId === projectId) {
        addUpdate({
          type: 'updated',
          taskId: payload.taskId,
          timestamp: new Date().toISOString(),
          data: data as unknown as TaskStatusChangedPayload | TaskAssignedPayload | TaskCommentPayload,
        });
      }
    });

    const cleanupTaskDeleted = on('task:deleted', (data) => {
      const payload = data as unknown as { taskId: string; projectId: string };
      if (payload.projectId === projectId) {
        addUpdate({
          type: 'deleted',
          taskId: payload.taskId,
          timestamp: new Date().toISOString(),
          data: data as unknown as TaskStatusChangedPayload | TaskAssignedPayload | TaskCommentPayload,
        });
      }
    });

    // Return cleanup function
    return () => {
      cleanupTaskCreated();
      cleanupTaskUpdated();
      cleanupTaskDeleted();
      unsubscribe([channel]);
    };
  }, [on, subscribe, unsubscribe, addUpdate]);

  // Subscribe to user updates (all tasks assigned to user)
  const subscribeToUser = useCallback((userId: string) => {
    const channel = `user:${userId}`;
    subscribe([channel]);

    // Listen for user-specific task events
    const cleanupAssigned = on('task:assigned', (data) => {
      const payload = data as unknown as TaskAssignedPayload;
      if (payload.assignedTo.id === userId) {
        addUpdate({
          type: 'assigned',
          taskId: payload.taskId,
          timestamp: new Date().toISOString(),
          data: payload,
        });
      }
    });

    const cleanupStatus = on('task:status_changed', (data) => {
      const payload = data as unknown as TaskStatusChangedPayload;
      // User might be assigned to this task or be watching it
      addUpdate({
        type: 'status_changed',
        taskId: payload.taskId,
        timestamp: new Date().toISOString(),
        data: payload,
      });
    });

    // Return cleanup function
    return () => {
      cleanupAssigned();
      cleanupStatus();
      unsubscribe([channel]);
    };
  }, [on, subscribe, unsubscribe, addUpdate]);

  return {
    isConnected,
    connectionState,
    recentUpdates,
    updatesCount: recentUpdates.length,

    // Actions
    clearUpdates,
    subscribeToTask,
    subscribeToProject,
    subscribeToUser,
  };
}

export default useTaskRealtime;
