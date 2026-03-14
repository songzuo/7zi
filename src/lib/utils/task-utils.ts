import { Task, TaskType, TaskPriority, TaskStatus } from '@/lib/types/task-types';
import { AI_MEMBER_ROLES } from '@/lib/types/task-types';

/**
 * Get AI member role based on task type
 */
export const getRoleForTaskType = (taskType: TaskType): AI_MEMBER_ROLES => {
  switch (taskType) {
    case 'development':
      return AI_MEMBER_ROLES.EXECUTOR;
    case 'design':
      return AI_MEMBER_ROLES.DESIGNER;
    case 'research':
      return AI_MEMBER_ROLES.CONSULTANT;
    case 'marketing':
      return AI_MEMBER_ROLES.PROMOTER;
    default:
      return AI_MEMBER_ROLES.GENERAL;
  }
};

/**
 * Get priority level number for sorting
 */
export const getPriorityLevel = (priority: TaskPriority): number => {
  switch (priority) {
    case 'urgent':
      return 4;
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
};

/**
 * Get status order for sorting
 */
export const getStatusOrder = (status: TaskStatus): number => {
  switch (status) {
    case 'pending':
      return 1;
    case 'assigned':
      return 2;
    case 'in_progress':
      return 3;
    case 'completed':
      return 4;
    default:
      return 0;
  }
};

/**
 * Sort tasks by priority and status
 */
export const sortTasks = (tasks: Task[]): Task[] => {
  return [...tasks].sort((a, b) => {
    // First sort by status (pending first)
    const statusOrder = getStatusOrder(a.status) - getStatusOrder(b.status);
    if (statusOrder !== 0) {
      return statusOrder;
    }
    
    // Then sort by priority (urgent first)
    const priorityOrder = getPriorityLevel(b.priority) - getPriorityLevel(a.priority);
    if (priorityOrder !== 0) {
      return priorityOrder;
    }
    
    // Finally sort by creation date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

/**
 * Filter tasks by type
 */
export const filterTasksByType = (tasks: Task[], type: TaskType | 'all'): Task[] => {
  if (type === 'all') {
    return tasks;
  }
  return tasks.filter(task => task.type === type);
};

/**
 * Filter tasks by status
 */
export const filterTasksByStatus = (tasks: Task[], status: TaskStatus | 'all'): Task[] => {
  if (status === 'all') {
    return tasks;
  }
  return tasks.filter(task => task.status === status);
};

/**
 * Get task statistics
 */
export const getTaskStats = (tasks: Task[]) => {
  const total = tasks.length;
  const pending = tasks.filter(t => t.status === 'pending').length;
  const assigned = tasks.filter(t => t.status === 'assigned').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  
  return {
    total,
    pending,
    assigned,
    inProgress,
    completed,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
  };
};

/**
 * Validate task form data
 */
export const validateTaskData = (data: Partial<Task> | null | undefined): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data || !data.title || data.title.trim().length === 0) {
    errors.push('Title is required');
  }
  
  if (!data || !data.description || data.description.trim().length === 0) {
    errors.push('Description is required');
  }
  
  if (!data || !data.type) {
    errors.push('Task type is required');
  }
  
  if (!data || !data.priority) {
    errors.push('Priority is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};