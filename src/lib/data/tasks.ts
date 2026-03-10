import type { Task } from '@/lib/types/task-types';

// In-memory storage for tasks (in production, this would be a database)
export const tasks: Task[] = [
  {
    id: 'task-001',
    title: '分析市场趋势',
    description: '研究当前 AI 代理市场的趋势和竞争对手',
    type: 'research',
    priority: 'high',
    status: 'completed',
    assignee: 'agent-world-expert',
    projectId: 'proj-001', // 关联到项目
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
    projectId: 'proj-001', // 关联到项目
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
    projectId: 'proj-002', // 关联到另一个项目
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

export const getTasks = (): Task[] => {
  return [...tasks];
};

export const getTaskById = (id: string): Task | undefined => {
  return tasks.find(task => task.id === id);
};

export const getTasksByProjectId = (projectId: string): Task[] => {
  return tasks.filter(task => task.projectId === projectId);
};

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
  
  tasks.push(newTask);
  return newTask;
};

export const updateTask = (id: string, updates: Partial<Task>): Task | null => {
  const index = tasks.findIndex(task => task.id === id);
  if (index === -1) return null;
  
  const updatedTask = { ...tasks[index], ...updates, updatedAt: new Date().toISOString() };
  tasks[index] = updatedTask;
  return updatedTask;
};

export const deleteTask = (id: string): Task | null => {
  const index = tasks.findIndex(task => task.id === id);
  if (index === -1) return null;
  
  const deletedTask = tasks.splice(index, 1)[0];
  return deletedTask;
};