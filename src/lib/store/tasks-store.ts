/**
 * @fileoverview Zustand-based state management for tasks.
 * @module lib/store/tasks-store
 * 
 * @description
 * This module provides a persistent task store using Zustand with the
 * persist middleware. It handles all task-related state including:
 * - Task CRUD operations
 * - Task assignment and status updates
 * - Comment management
 * - Integration with dashboard store for member status updates
 * 
 * @see {@link https://github.com/pmndrs/zustand | Zustand Documentation}
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useDashboardStore } from '@/stores/dashboardStore';
import { generateTaskId, generateCommentId } from '@/lib/id';

// Import task types
import type { Task, TaskComment } from '@/lib/types/task-types';

/**
 * Task creation payload.
 * Excludes auto-generated fields from the Task interface.
 * 
 * @description
 * Used when creating a new task. The following fields are auto-generated:
 * - id: Unique identifier created on task creation
 * - createdAt: Timestamp set on creation
 * - updatedAt: Timestamp updated on every modification
 * - comments: Empty array on creation
 * - history: Initial status history entry
 */
export type TaskCreatePayload = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'history'>;

/**
 * Task update payload.
 * Partial Task type allowing updates to any task field.
 * 
 * @description
 * Used when updating an existing task. All fields are optional,
 * only provided fields will be updated.
 */
export type TaskUpdatePayload = Partial<Task>;

/**
 * Comment creation payload.
 * Excludes auto-generated fields from the TaskComment interface.
 * 
 * @description
 * Used when adding a comment to a task. The following fields are auto-generated:
 * - id: Unique identifier for the comment
 * - timestamp: Creation time
 */
export type CommentCreatePayload = Omit<TaskComment, 'id' | 'timestamp'>;

/**
 * Tasks store state interface.
 * 
 * @description
 * Defines the complete state shape and action methods for the tasks store.
 * The store persists task data to localStorage under the 'tasks-storage' key.
 * 
 * @example
 * ```tsx
 * function TaskList() {
 *   const { tasks, addTask, completeTask } = useTasksStore();
 *   
 *   const handleCreate = () => {
 *     addTask({
 *       title: 'New Task',
 *       description: 'Task description',
 *       type: 'development',
 *       priority: 'high',
 *       status: 'pending',
 *       createdBy: 'user'
 *     });
 *   };
 *   
 *   return (
 *     <div>
 *       <button onClick={handleCreate}>Add Task</button>
 *       {tasks.map(task => (
 *         <div key={task.id}>{task.title}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export interface TasksState {
  /** Array of all tasks in the store */
  tasks: Task[];
  
  /**
   * Add a new task to the store.
   * 
   * @description
   * Creates a new task with auto-generated fields:
   * - id: Unique identifier (timestamp + random string)
   * - createdAt: Current timestamp
   * - updatedAt: Current timestamp
   * - comments: Empty array
   * - history: Initial status entry
   * 
   * @param task - Task data excluding auto-generated fields
   * 
   * @example
   * ```tsx
   * addTask({
   *   title: 'Implement feature X',
   *   description: 'Description of feature X',
   *   type: 'development',
   *   priority: 'high',
   *   status: 'pending',
   *   createdBy: 'user',
   *   projectId: 'project-123' // optional
   * });
   * ```
   */
  addTask: (task: TaskCreatePayload) => void;
  
  /**
   * Update an existing task.
   * 
   * @description
   * Partially updates a task. The updatedAt timestamp is automatically
   * set to the current time.
   * 
   * @param id - The task ID to update
   * @param updates - Partial task data to merge
   * 
   * @example
   * ```tsx
   * updateTask('task-123', {
   *   priority: 'urgent',
   *   description: 'Updated description'
   * });
   * ```
   */
  updateTask: (id: string, updates: TaskUpdatePayload) => void;
  
  /**
   * Delete a task from the store.
   * 
   * @description
   * Permanently removes a task from the store.
   * Warning: This action cannot be undone.
   * 
   * @param id - The task ID to delete
   * 
   * @example
   * ```tsx
   * deleteTask('task-123');
   * ```
   */
  deleteTask: (id: string) => void;
  
  /**
   * Assign a task to an AI team member.
   * 
   * @description
   * Assigns the task and updates its status to 'assigned'.
   * Also updates the dashboard store to reflect the member's
   * new status as 'working' and sets their current task.
   * 
   * @param taskId - The task ID to assign
   * @param assigneeId - The AI member ID to assign to
   * 
   * @example
   * ```tsx
   * assignTask('task-123', 'ai-executor-1');
   * // Task status becomes 'assigned'
   * // AI member status becomes 'working'
   * ```
   */
  assignTask: (taskId: string, assigneeId: string) => void;
  
  /**
   * Mark a task as completed.
   * 
   * @description
   * Updates the task status to 'completed' and records the status
   * change in history. If the task has an assignee, updates their
   * status in the dashboard store back to 'idle' and clears their
   * current task.
   * 
   * @param id - The task ID to complete
   * 
   * @example
   * ```tsx
   * completeTask('task-123');
   * // Task status becomes 'completed'
   * // Assignee (if any) status becomes 'idle'
   * ```
   */
  completeTask: (id: string) => void;
  
  /**
   * Add a comment to a task.
   * 
   * @description
   * Appends a new comment to the task's comments array with
   * auto-generated id and timestamp.
   * 
   * @param taskId - The task ID to comment on
   * @param comment - Comment data excluding auto-generated fields
   * 
   * @example
   * ```tsx
   * addComment('task-123', {
   *   author: 'user',
   *   content: 'This is a comment'
   * });
   * ```
   */
  addComment: (taskId: string, comment: CommentCreatePayload) => void;
}

/**
 * Zustand store for task management.
 * 
 * @description
 * The main tasks store hook. Uses Zustand with persist middleware
 * for state persistence across page refreshes.
 * 
 * Persistence:
 * - Storage key: 'tasks-storage'
 * - Persisted data: Only the tasks array
 * 
 * Integration:
 * - Connected to dashboard store for member status updates
 * - Updates member status on task assignment/completion
 * 
 * @example
 * ```tsx
 * import { useTasksStore } from '@/lib/store/tasks-store';
 * 
 * function TaskManager() {
 *   const { tasks, addTask, updateTask, deleteTask, assignTask, completeTask } = useTasksStore();
 *   
 *   // Use store methods...
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Selecting specific state for performance
 * const taskCount = useTasksStore(state => state.tasks.length);
 * const addTask = useTasksStore(state => state.addTask);
 * ```
 */
export const useTasksStore = create<TasksState>()(
  persist(
    (set, get) => ({
      tasks: [],
      
      addTask: (taskData: TaskCreatePayload) => {
        const newTask: Task = {
          id: generateTaskId(),
          ...taskData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          comments: [],
          history: [{
            status: 'pending',
            timestamp: new Date().toISOString(),
            changedBy: taskData.createdBy
          }]
        };
        
        set((state) => ({
          tasks: [...state.tasks, newTask]
        }));
      },
      
      updateTask: (id: string, updates: TaskUpdatePayload) => {
        set((state) => ({
          tasks: state.tasks.map(task => 
            task.id === id 
              ? { ...task, ...updates, updatedAt: new Date().toISOString() }
              : task
          )
        }));
      },
      
      deleteTask: (id: string) => {
        set((state) => ({
          tasks: state.tasks.filter(task => task.id !== id)
        }));
      },
      
      assignTask: (taskId: string, assigneeId: string) => {
        set((state) => ({
          tasks: state.tasks.map(task => {
            if (task.id === taskId) {
              const updatedTask = {
                ...task,
                assignee: assigneeId,
                status: 'assigned' as const,
                updatedAt: new Date().toISOString(),
                history: [
                  ...task.history,
                  {
                    status: 'assigned' as const,
                    timestamp: new Date().toISOString(),
                    changedBy: 'system'
                  }
                ]
              };
              
              // Update AI member status in dashboard store
              useDashboardStore.getState().updateMemberStatus(assigneeId, 'working');
              useDashboardStore.getState().updateMemberTask(assigneeId, `#${taskId} ${task.title}`);
              
              return updatedTask;
            }
            return task;
          })
        }));
      },
      
      completeTask: (id: string) => {
        const currentTask = get().tasks.find(task => task.id === id);
        if (!currentTask) return;
        
        set((state) => ({
          tasks: state.tasks.map(task => {
            if (task.id === id) {
              const updatedTask = {
                ...task,
                status: 'completed' as const,
                updatedAt: new Date().toISOString(),
                history: [
                  ...task.history,
                  {
                    status: 'completed' as const,
                    timestamp: new Date().toISOString(),
                    changedBy: task.assignee || 'system'
                  }
                ]
              };
              
              // Update AI member in dashboard store
              if (task.assignee) {
                const dashboardStore = useDashboardStore.getState();
                const member = dashboardStore.members.find(m => m.id === task.assignee);
                if (member) {
                  dashboardStore.updateMemberStatus(task.assignee, 'idle');
                  dashboardStore.updateMemberTask(task.assignee, undefined);
                  // Note: completedTasks is managed in the dashboard store itself
                }
              }
              
              return updatedTask;
            }
            return task;
          })
        }));
      },
      
      addComment: (taskId: string, commentData: CommentCreatePayload) => {
        set((state) => ({
          tasks: state.tasks.map(task => {
            if (task.id === taskId) {
              const newComment: TaskComment = {
                id: generateCommentId(),
                ...commentData,
                timestamp: new Date().toISOString()
              };
              
              return {
                ...task,
                comments: [...task.comments, newComment],
                updatedAt: new Date().toISOString()
              };
            }
            return task;
          })
        }));
      }
    }),
    {
      name: 'tasks-storage',
      partialize: (state) => ({ tasks: state.tasks })
    }
  )
);