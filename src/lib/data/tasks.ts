/**
 * @fileoverview 任务数据持久化存储
 * @module lib/data/tasks
 * 
 * @description
 * 提供任务的持久化存储功能。数据存储在 data/tasks.json 文件中，
 * 确保服务器重启后数据不丢失。
 */

import type { Task } from '@/lib/types/task-types';
import { ArrayStore } from '@/lib/store/persistent-store';

// 初始示例数据
const initialTasks: Task[] = [
  {
    id: 'task-001',
    title: '分析市场趋势',
    description: '研究当前 AI 代理市场的趋势和竞争对手',
    type: 'research',
    priority: 'high',
    status: 'completed',
    assignee: 'agent-world-expert',
    projectId: 'proj-001',
    createdBy: 'user',
    createdAt: '2026-03-05T10:00:00Z',
    updatedAt: '2026-03-06T15:30:00Z',
    comments: [],
    history: [
      { timestamp: '2026-03-05T10:00:00Z', status: 'pending', changedBy: 'user' },
      { timestamp: '2026-03-05T10:15:00Z', status: 'assigned', changedBy: 'system', assignee: 'agent-world-expert' },
      { timestamp: '2026-03-05T10:20:00Z', status: 'in_progress', changedBy: 'agent-world-expert' },
      { timestamp: '2026-03-06T15:30:00Z', status: 'completed', changedBy: 'agent-world-expert' }
    ]
  },
  {
    id: 'task-002',
    title: '竞品调研报告',
    description: '分析主要竞争对手的产品功能和市场策略',
    type: 'research',
    priority: 'medium',
    status: 'in_progress',
    assignee: 'consultant',
    projectId: 'proj-001',
    createdBy: 'user',
    createdAt: '2026-03-06T09:00:00Z',
    updatedAt: '2026-03-06T09:00:00Z',
    comments: [],
    history: [
      { timestamp: '2026-03-06T09:00:00Z', status: 'pending', changedBy: 'user' },
      { timestamp: '2026-03-06T09:05:00Z', status: 'assigned', changedBy: 'system', assignee: 'consultant' },
      { timestamp: '2026-03-06T09:10:00Z', status: 'in_progress', changedBy: 'consultant' }
    ]
  },
  {
    id: 'task-003',
    title: '系统架构评审',
    description: '评审当前系统的架构设计并提出改进建议',
    type: 'development',
    priority: 'high',
    status: 'in_progress',
    assignee: 'architect',
    projectId: 'proj-002',
    createdBy: 'user',
    createdAt: '2026-03-06T11:00:00Z',
    updatedAt: '2026-03-06T11:00:00Z',
    comments: [],
    history: [
      { timestamp: '2026-03-06T11:00:00Z', status: 'pending', changedBy: 'user' },
      { timestamp: '2026-03-06T11:05:00Z', status: 'assigned', changedBy: 'system', assignee: 'architect' },
      { timestamp: '2026-03-06T11:10:00Z', status: 'in_progress', changedBy: 'architect' }
    ]
  }
];

// 创建持久化存储实例
const taskStore = new ArrayStore<Task>('tasks', initialTasks);

/**
 * 获取所有任务
 */
export const getTasks = (): Task[] => {
  return taskStore.getAll();
};

/**
 * 根据 ID 获取任务
 */
export const getTaskById = (id: string): Task | undefined => {
  return taskStore.find(task => task.id === id);
};

/**
 * 根据项目 ID 获取任务
 */
export const getTasksByProjectId = (projectId: string): Task[] => {
  return taskStore.filter(task => task.projectId === projectId);
};

/**
 * 创建任务
 */
export const createTask = (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'history'>): Task => {
  const newTask: Task = {
    ...task,
    id: `task-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    comments: [],
    history: [{
      timestamp: new Date().toISOString(),
      status: 'pending',
      changedBy: task.createdBy
    }]
  };
  
  taskStore.add(newTask);
  return newTask;
};

/**
 * 更新任务
 */
export const updateTask = (id: string, updates: Partial<Task>): Task | null => {
  let updatedTask: Task | null = null;
  
  const found = taskStore.update(
    task => task.id === id,
    task => {
      updatedTask = { ...task, ...updates, updatedAt: new Date().toISOString() };
      return updatedTask;
    }
  );
  
  return found ? updatedTask : null;
};

/**
 * 删除任务
 */
export const deleteTask = (id: string): Task | null => {
  const task = taskStore.find(t => t.id === id);
  if (!task) return null;
  
  taskStore.delete(t => t.id === id);
  return task;
};

/**
 * 添加任务评论
 */
export const addTaskComment = (taskId: string, author: string, content: string): Task | null => {
  const task = taskStore.find(t => t.id === taskId);
  if (!task) return null;
  
  const newComment = {
    id: `comment-${Date.now()}`,
    author,
    content,
    timestamp: new Date().toISOString()
  };
  
  return updateTask(taskId, {
    comments: [...task.comments, newComment]
  });
};

/**
 * 添加状态变更历史
 */
export const addTaskHistory = (taskId: string, status: Task['status'], changedBy: string, assignee?: string): Task | null => {
  const task = taskStore.find(t => t.id === taskId);
  if (!task) return null;
  
  const newHistory = {
    timestamp: new Date().toISOString(),
    status,
    changedBy,
    assignee
  };
  
  return updateTask(taskId, {
    status,
    history: [...task.history, newHistory]
  });
};

// 导出存储实例（供直接访问，如需要）
export { taskStore };