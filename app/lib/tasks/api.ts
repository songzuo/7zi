/**
 * 任务 API 客户端服务
 * 负责与后端 API 通信
 */

import { Task, TaskTag, TaskFilter, TaskPriority, TaskStatus } from '@/lib/tasks/types';

const API_BASE = '/api';

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  task?: T;
  tasks?: T[];
  tag?: TaskTag;
  tags?: TaskTag[];
  stats?: TaskStats;
  updated?: number;
}

interface TaskStats {
  total: number;
  done: number;
  inProgress: number;
  todo: number;
  review: number;
  completionRate: number;
  byPriority: Record<TaskPriority, number>;
}

/**
 * 获取所有任务
 */
export async function fetchTasks(filter?: TaskFilter): Promise<Task[]> {
  const params = new URLSearchParams();
  
  if (filter?.priority) params.set('priority', filter.priority);
  if (filter?.status) params.set('status', filter.status);
  if (filter?.assignee) params.set('assignee', filter.assignee);
  if (filter?.search) params.set('search', filter.search);
  if (filter?.tags && filter.tags.length > 0) params.set('tags', filter.tags.join(','));
  
  const url = `${API_BASE}/tasks${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch tasks: ${response.statusText}`);
  }
  
  const data: ApiResponse<Task> = await response.json();
  return data.tasks || [];
}

// Alias for fetchTasks (server-side compatibility)
export const getTasks = fetchTasks;

/**
 * 获取单个任务
 */
export async function fetchTask(id: string): Promise<Task | null> {
  const response = await fetch(`${API_BASE}/tasks/${id}`);
  
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch task: ${response.statusText}`);
  }
  
  const data: ApiResponse<Task> = await response.json();
  return data.task || null;
}

/**
 * 创建任务
 */
export async function createTaskApi(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
  const response = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskData),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create task');
  }
  
  const data: ApiResponse<Task> = await response.json();
  return data.task!;
}

/**
 * 更新任务
 */
export async function updateTaskApi(id: string, updates: Partial<Task>): Promise<Task> {
  const response = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update task');
  }
  
  const data: ApiResponse<Task> = await response.json();
  return data.task!;
}

/**
 * 删除任务
 */
export async function deleteTaskApi(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete task');
  }
}

/**
 * 批量更新任务状态
 */
export async function batchUpdateStatusApi(ids: string[], status: TaskStatus): Promise<number> {
  const response = await fetch(`${API_BASE}/tasks/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, status }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to batch update tasks');
  }
  
  const data: ApiResponse<Task> = await response.json();
  return data.updated || 0;
}

/**
 * 获取任务统计
 */
export async function fetchTaskStats(): Promise<TaskStats> {
  const response = await fetch(`${API_BASE}/tasks/stats`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch task stats: ${response.statusText}`);
  }
  
  const data: ApiResponse<Task> = await response.json();
  return data.stats!;
}

/**
 * 获取所有标签
 */
export async function fetchTags(customOnly = false): Promise<TaskTag[]> {
  const url = `${API_BASE}/tags${customOnly ? '?custom=true' : ''}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch tags: ${response.statusText}`);
  }
  
  const data: ApiResponse<TaskTag> = await response.json();
  return data.tags || [];
}

/**
 * 创建自定义标签
 */
export async function createTagApi(tagData: Omit<TaskTag, 'id'>): Promise<TaskTag> {
  const response = await fetch(`${API_BASE}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tagData),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create tag');
  }
  
  const data: ApiResponse<TaskTag> = await response.json();
  return data.tag!;
}

/**
 * 删除自定义标签
 */
export async function deleteTagApi(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/tags/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete tag');
  }
}