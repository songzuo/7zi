/**
 * A2A Task Store - In-memory implementation for task lifecycle management
 */

import { Task, Message, Artifact, TaskState, TaskStatus } from './types';

export interface TaskWithPriority extends Task {
  priority: 'low' | 'normal' | 'high' | 'critical';
  createdAt: string;
  scheduledAt?: string;
  completedAt?: string;
  retryCount?: number;
}

export interface TaskStore {
  createTask(contextId?: string, initialMessage?: Message): Task;
  getTask(taskId: string): Task | undefined;
  updateTaskStatus(taskId: string, status: TaskStatus): Task | undefined;
  addArtifact(taskId: string, artifact: Artifact): Task | undefined;
  addMessage(taskId: string, message: Message): Task | undefined;
  listTasks(options: {
    contextId?: string;
    status?: TaskState;
    pageSize?: number;
    pageToken?: string;
    includeArtifacts?: boolean;
  }): { tasks: Task[]; nextPageToken: string; pageSize: number; totalSize: number };
  deleteTask(taskId: string): boolean;
  getTasksByContext(contextId: string): Task[];

  // New priority-aware methods
  createTaskWithPriority(
    contextId?: string,
    initialMessage?: Message,
    priority?: TaskWithPriority['priority']
  ): TaskWithPriority;
  updateTaskPriority(taskId: string, priority: TaskWithPriority['priority']): TaskWithPriority | undefined;
  getTasksByPriority(priority: TaskWithPriority['priority']): TaskWithPriority[];
  getHighestPriorityTasks(limit?: number): TaskWithPriority[];
  markTaskCompleted(taskId: string): TaskWithPriority | undefined;
  getAsyncTaskStatus(taskId: string): {
    state: TaskState;
    progress?: number;
    currentStep?: string;
    error?: string;
  } | undefined;
}

/**
 * In-memory implementation of TaskStore
 */
export class InMemoryTaskStore implements TaskStore {
  private tasks: Map<string, Task> = new Map();
  private taskWithPriority: Map<string, TaskWithPriority> = new Map();
  private contextTasks: Map<string, Set<string>> = new Map();
  private asyncTaskStatus: Map<string, {
    state: TaskState;
    progress?: number;
    currentStep?: string;
    error?: string;
  }> = new Map();

  createTask(contextId?: string, initialMessage?: Message): Task {
    return this.createTaskWithPriority(contextId, initialMessage, 'normal');
  }

  createTaskWithPriority(
    contextId?: string,
    initialMessage?: Message,
    priority: TaskWithPriority['priority'] = 'normal'
  ): TaskWithPriority {
    const taskId = uuidv4();
    const now = new Date().toISOString();

    const task: TaskWithPriority = {
      kind: 'task',
      id: taskId,
      contextId: contextId || uuidv4(),
      status: {
        state: 'submitted',
        timestamp: now,
      },
      history: initialMessage ? [initialMessage] : [],
      artifacts: [],
      priority,
      createdAt: now,
      retryCount: 0,
    };

    this.tasks.set(taskId, task);
    this.taskWithPriority.set(taskId, task);

    // Index by context
    if (task.contextId) {
      if (!this.contextTasks.has(task.contextId)) {
        this.contextTasks.set(task.contextId, new Set());
      }
      this.contextTasks.get(task.contextId)!.add(taskId);
    }

    // Initialize async task status
    this.asyncTaskStatus.set(taskId, {
      state: 'submitted',
      progress: 0,
    });

    return task;
  }

  getTask(taskId: string): Task | undefined {
    const task = this.tasks.get(taskId);
    if (!task) return undefined;

    return { ...task };
  }

  updateTaskStatus(taskId: string, status: TaskStatus): Task | undefined {
    const task = this.tasks.get(taskId);
    if (!task) return undefined;

    const updatedTask = {
      ...task,
      status,
    };

    this.tasks.set(taskId, updatedTask);
    return { ...updatedTask };
  }

  addArtifact(taskId: string, artifact: Artifact): Task | undefined {
    const task = this.tasks.get(taskId);
    if (!task) return undefined;

    const updatedTask = {
      ...task,
      artifacts: [...(task.artifacts || []), artifact],
    };

    this.tasks.set(taskId, updatedTask);
    return { ...updatedTask };
  }

  addMessage(taskId: string, message: Message): Task | undefined {
    const task = this.tasks.get(taskId);
    if (!task) return undefined;

    const updatedTask = {
      ...task,
      history: [...(task.history || []), message],
    };

    this.tasks.set(taskId, updatedTask);
    return { ...updatedTask };
  }

  listTasks(options: {
    contextId?: string;
    status?: TaskState;
    pageSize?: number;
    pageToken?: string;
    includeArtifacts?: boolean;
  }): { tasks: Task[]; nextPageToken: string; pageSize: number; totalSize: number } {
    let tasks = Array.from(this.tasks.values());

    // Filter by context
    if (options.contextId) {
      tasks = tasks.filter(t => t.contextId === options.contextId);
    }

    // Filter by status
    if (options.status) {
      tasks = tasks.filter(t => t.status.state === options.status);
    }

    // Sort by status timestamp descending
    tasks.sort((a, b) =>
      new Date(b.status.timestamp).getTime() - new Date(a.status.timestamp).getTime()
    );

    const totalSize = tasks.length;
    const pageSize = options.pageSize || 50;
    const startIndex = options.pageToken
      ? parseInt(Buffer.from(options.pageToken, 'base64').toString(), 10)
      : 0;

    const endIndex = startIndex + pageSize;
    const paginatedTasks = tasks.slice(startIndex, endIndex);

    // Optionally exclude artifacts
    const resultTasks = paginatedTasks.map(task => {
      if (!options.includeArtifacts) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { artifacts: _, ...rest } = task;
        return rest as Task;
      }
      return task;
    });

    const nextPageToken = endIndex < totalSize
      ? Buffer.from(String(endIndex)).toString('base64')
      : '';

    return {
      tasks: resultTasks,
      nextPageToken,
      pageSize,
      totalSize,
    };
  }

  deleteTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    this.tasks.delete(taskId);

    // Remove from context index
    if (task.contextId) {
      this.contextTasks.get(task.contextId)?.delete(taskId);
      if (this.contextTasks.get(task.contextId)?.size === 0) {
        this.contextTasks.delete(task.contextId);
      }
    }

    return true;
  }

  getTasksByContext(contextId: string): Task[] {
    const taskIds = this.contextTasks.get(contextId);
    if (!taskIds) return [];

    return Array.from(taskIds)
      .map(id => this.tasks.get(id))
      .filter((t): t is Task => t !== undefined);
  }

  /**
   * Update task priority
   */
  updateTaskPriority(taskId: string, priority: TaskWithPriority['priority']): TaskWithPriority | undefined {
    const task = this.taskWithPriority.get(taskId);
    if (!task) return undefined;

    task.priority = priority;
    return { ...task };
  }

  /**
   * Get tasks by priority
   */
  getTasksByPriority(priority: TaskWithPriority['priority']): TaskWithPriority[] {
    return Array.from(this.taskWithPriority.values())
      .filter(t => t.priority === priority)
      .map(t => ({ ...t }));
  }

  /**
   * Get highest priority tasks
   */
  getHighestPriorityTasks(limit: number = 10): TaskWithPriority[] {
    const allTasks = Array.from(this.taskWithPriority.values())
      .filter(t => ['submitted', 'working'].includes(t.status.state));

    // Sort by priority (critical first), then by creation time
    const priorityOrder: TaskWithPriority['priority'][] = ['critical', 'high', 'normal', 'low'];
    allTasks.sort((a, b) => {
      const aPriority = priorityOrder.indexOf(a.priority);
      const bPriority = priorityOrder.indexOf(b.priority);
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return allTasks.slice(0, limit).map(t => ({ ...t }));
  }

  /**
   * Mark task as completed
   */
  markTaskCompleted(taskId: string): TaskWithPriority | undefined {
    const task = this.taskWithPriority.get(taskId);
    if (!task) return undefined;

    const now = new Date().toISOString();
    task.completedAt = now;
    task.status = {
      state: 'completed',
      timestamp: now,
    };

    // Update async task status
    const asyncStatus = this.asyncTaskStatus.get(taskId);
    if (asyncStatus) {
      asyncStatus.state = 'completed';
      asyncStatus.progress = 100;
    }

    return { ...task };
  }

  /**
   * Get async task status
   */
  getAsyncTaskStatus(taskId: string): {
    state: TaskState;
    progress?: number;
    currentStep?: string;
    error?: string;
  } | undefined {
    const status = this.asyncTaskStatus.get(taskId);
    return status ? { ...status } : undefined;
  }

  /**
   * Update async task progress
   */
  updateAsyncTaskProgress(
    taskId: string,
    progress: number,
    currentStep?: string
  ): boolean {
    const status = this.asyncTaskStatus.get(taskId);
    if (!status) return false;

    status.progress = progress;
    if (currentStep) {
      status.currentStep = currentStep;
    }

    return true;
  }

  /**
   * Cleanup old completed/failed/canceled tasks
   */
  cleanupOldTasks(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    // Don't clean any tasks if maxAge is negative
    if (maxAgeMs < 0) {
      return 0;
    }

    const now = Date.now();
    let cleaned = 0;

    for (const [taskId, task] of this.tasks) {
      const terminalStates: TaskState[] = ['completed', 'failed', 'canceled', 'rejected'];
      if (terminalStates.includes(task.status.state)) {
        const taskAge = now - new Date(task.status.timestamp).getTime();
        // Use >= for maxAge of 0 (clean all), use > otherwise (strictly older than)
        if (maxAgeMs === 0 ? taskAge >= 0 : taskAge > maxAgeMs) {
          this.deleteTask(taskId);
          cleaned++;
        }
      }
    }

    return cleaned;
  }
}

// Singleton instance
let taskStoreInstance: InMemoryTaskStore | null = null;

export function getTaskStore(): InMemoryTaskStore {
  if (!taskStoreInstance) {
    taskStoreInstance = new InMemoryTaskStore();
  }
  return taskStoreInstance;
}