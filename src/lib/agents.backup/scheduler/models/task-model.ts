/**
 * Task Model
 * Defines the structure and lifecycle of tasks in the scheduling system
 */

import { TaskType } from './agent-capability';

// Re-export TaskType for use by other modules
export type { TaskType };

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 
  | 'pending' 
  | 'assigned' 
  | 'in_progress' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export interface Task {
  /** Unique identifier for the task */
  id: string;
  
  /** Task type determining suitable agents */
  type: TaskType;
  
  /** Task priority for scheduling */
  priority: TaskPriority;
  
  /** Optional deadline timestamp */
  deadline?: number;
  
  /** Required capabilities/technologies */
  requiredCapabilities: string[];
  
  /** Estimated duration in minutes */
  estimatedDuration: number;
  
  /** IDs of tasks this task depends on */
  dependencies: string[];
  
  /** Current status of the task */
  status: TaskStatus;
  
  /** ID of assigned agent (if any) */
  assignedAgent?: string;
  
  /** Task creation timestamp */
  createdAt: number;
  
  /** Task start timestamp (when in_progress) */
  startedAt?: number;
  
  /** Task completion timestamp */
  completedAt?: number;
  
  /** Task title/description */
  title: string;
  
  /** Detailed description */
  description?: string;
  
  /** Task metadata */
  metadata?: Record<string, any>;
  
  /** Error message if failed */
  error?: string;
  
  /** ID of the user who created the task */
  createdBy?: string;
}

/**
 * Priority weight for scheduling (higher = more urgent)
 */
export const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4
};

/**
 * Task queue for managing tasks by priority
 */
export class TaskQueue {
  private tasks: Map<string, Task> = new Map();
  private pendingTasks: Task[] = [];

  /**
   * Add a task to the queue
   */
  addTask(task: Task): void {
    this.tasks.set(task.id, task);
    if (task.status === 'pending') {
      this.pendingTasks.push(task);
      this.sortPendingTasks();
    }
  }

  /**
   * Get a task by ID
   */
  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  /**
   * Update task status
   */
  updateTaskStatus(id: string, status: TaskStatus, agentId?: string): void {
    const task = this.tasks.get(id);
    if (!task) return;

    task.status = status;
    
    if (agentId) {
      task.assignedAgent = agentId;
    }

    if (status === 'in_progress' && !task.startedAt) {
      task.startedAt = Date.now();
    } else if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      task.completedAt = Date.now();
      this.removeFromPending(id);
    } else if (status === 'assigned') {
      task.assignedAgent = agentId;
      this.removeFromPending(id);
    }
  }

  /**
   * Get pending tasks sorted by priority
   */
  getPendingTasks(): Task[] {
    return [...this.pendingTasks];
  }

  /**
   * Get tasks assigned to a specific agent
   */
  getAgentTasks(agentId: string): Task[] {
    return Array.from(this.tasks.values()).filter(
      task => task.assignedAgent === agentId && task.status !== 'completed' && task.status !== 'failed'
    );
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskStatus): Task[] {
    return Array.from(this.tasks.values()).filter(task => task.status === status);
  }

  /**
   * Check if task dependencies are satisfied
   */
  areDependenciesSatisfied(task: Task): boolean {
    return task.dependencies.every(depId => {
      const dep = this.tasks.get(depId);
      return dep?.status === 'completed';
    });
  }

  /**
   * Get tasks that are ready to be scheduled
   */
  getReadyTasks(): Task[] {
    return this.pendingTasks.filter(task => 
      this.areDependenciesSatisfied(task) && task.status === 'pending'
    );
  }

  /**
   * Get tasks with overdue deadlines
   */
  getOverdueTasks(): Task[] {
    const now = Date.now();
    return Array.from(this.tasks.values()).filter(
      task => task.deadline && 
               task.deadline < now && 
               task.status !== 'completed' && 
               task.status !== 'cancelled'
    );
  }

  /**
   * Get urgent tasks (high priority or deadline within 1 hour)
   */
  getUrgentTasks(): Task[] {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    return Array.from(this.tasks.values()).filter(
      task => (task.priority === 'urgent' || task.priority === 'high') ||
              (task.deadline && task.deadline - now < oneHour)
    );
  }

  /**
   * Remove task from pending queue
   */
  private removeFromPending(id: string): void {
    this.pendingTasks = this.pendingTasks.filter(task => task.id !== id);
    this.sortPendingTasks();
  }

  /**
   * Sort pending tasks by priority and deadline
   */
  private sortPendingTasks(): void {
    this.pendingTasks.sort((a, b) => {
      // First by priority
      const priorityDiff = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by deadline (earlier first)
      if (a.deadline && b.deadline) {
        return a.deadline - b.deadline;
      } else if (a.deadline) {
        return -1;
      } else if (b.deadline) {
        return 1;
      }

      // Finally by creation time
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * Get all tasks
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get task statistics
   */
  getStats() {
    const tasks = Array.from(this.tasks.values());
    
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      assigned: tasks.filter(t => t.status === 'assigned').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      overdue: this.getOverdueTasks().length
    };
  }

  /**
   * Clear all tasks
   */
  clear(): void {
    this.tasks.clear();
    this.pendingTasks = [];
  }
}

/**
 * Create a new task with default values
 */
export function createTask(params: Partial<Task> & Pick<Task, 'id' | 'type' | 'title'>): Task {
  const now = Date.now();
  
  return {
    id: params.id,
    type: params.type,
    title: params.title,
    priority: params.priority || 'medium',
    requiredCapabilities: params.requiredCapabilities || [],
    estimatedDuration: params.estimatedDuration || 30,
    dependencies: params.dependencies || [],
    status: 'pending',
    createdAt: now,
    deadline: params.deadline,
    description: params.description,
    metadata: params.metadata,
    createdBy: params.createdBy
  };
}
