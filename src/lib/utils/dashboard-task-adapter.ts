/**
 * @fileoverview 任务与仪表板数据适配器
 * @module lib/utils/dashboard-task-adapter
 * 
 * @description
 * 提供任务数据与仪表板展示格式之间的转换功能。
 * 将任务系统的数据结构转换为仪表板组件所需的格式。
 * 
 * @example
 * ```typescript
 * import { 
 *   getDashboardProjectsFromTasks,
 *   getDashboardActivitiesFromTasks,
 *   calculateOverallProgress 
 * } from '@/lib/utils/dashboard-task-adapter';
 * 
 * // 转换任务为项目列表
 * const projects = getDashboardProjectsFromTasks(tasks, members);
 * 
 * // 转换任务为活动日志
 * const activities = getDashboardActivitiesFromTasks(tasks, members);
 * 
 * // 计算总进度
 * const progress = calculateOverallProgress(tasks);
 * ```
 */

import { Task } from '@/lib/types/task-types';

// ============================================
// 类型定义
// ============================================

/**
 * 仪表板项目展示格式
 * 
 * @description
 * 用于仪表板项目卡片展示的数据结构。
 * 由任务数据转换而来。
 */
export interface DashboardProject {
  /** 项目 ID（对应任务 ID） */
  id: string;
  /** 项目名称（对应任务标题） */
  name: string;
  /** 完成进度 (0-100) */
  progress: number;
  /** 项目状态 */
  status: 'active' | 'completed' | 'paused';
  /** 任务统计 */
  tasks: {
    /** 总任务数 */
    total: number;
    /** 已完成任务数 */
    completed: number;
  };
  /** 团队成员名称列表 */
  team: string[];
  /** 截止日期 */
  deadline: string;
}

/**
 * 仪表板活动日志格式
 * 
 * @description
 * 用于仪表板活动流展示的数据结构。
 */
export interface DashboardActivity {
  /** 活动 ID */
  id: string;
  /** 活动类型 */
  type: 'commit' | 'deploy' | 'issue' | 'meeting' | 'task_created' | 'task_assigned' | 'task_completed';
  /** 活动消息 */
  message: string;
  /** 操作用户 */
  user: string;
  /** 活动时间（格式化字符串） */
  time: string;
  /** 活动图标 */
  emoji: string;
}

/**
 * AI 成员接口（简化版，用于适配器）
 * 
 * @description
 * 仪表板存储中定义的 AI 成员类型。
 */
export interface AIMember {
  /** 成员 ID */
  id: string;
  /** 成员名称 */
  name: string;
  /** 成员角色 */
  role: string;
  /** 成员状态 */
  status: string;
}

// ============================================
// 内部工具函数
// ============================================

/**
 * 状态进度映射
 */
const STATUS_PROGRESS: Record<string, number> = {
  completed: 100,
  in_progress: 75,
  assigned: 50,
  pending: 25,
};

/**
 * 获取任务进度百分比
 * 
 * @description
 * 根据任务状态估算进度百分比。
 * 
 * @param task - 任务对象
 * @returns 进度百分比 (0-100)
 */
const getTaskProgress = (task: Task): number => {
  return STATUS_PROGRESS[task.status] ?? 0;
};

/**
 * 任务状态到仪表板状态映射
 * 
 * @param status - 任务状态
 * @returns 仪表板项目状态
 */
const mapTaskStatus = (status: Task['status']): DashboardProject['status'] => {
  switch (status) {
    case 'completed':
      return 'completed';
    case 'pending':
      return 'paused';
    default:
      return 'active';
  }
};

/**
 * 活动类型配置
 */
type ActivityType = 'commit' | 'deploy' | 'issue' | 'meeting' | 'task_created' | 'task_assigned' | 'task_completed';

const ACTIVITY_CONFIGS: Record<string, {
  type: ActivityType;
  emoji: string;
  getMessage: (...args: string[]) => string;
}> = {
  created: {
    type: 'task_created' as const,
    emoji: '🆕',
    getMessage: (title: string) => `创建新任务: "${title}"`,
  },
  assigned: {
    type: 'task_assigned' as const,
    emoji: '🔄',
    getMessage: (title: string, memberName: string) => `分配任务给 ${memberName}: "${title}"`,
  },
  completed: {
    type: 'task_completed' as const,
    emoji: '✅',
    getMessage: (title: string) => `完成任务: "${title}"`,
  },
};

// ============================================
// 转换函数
// ============================================

/**
 * 将单个任务转换为仪表板项目格式
 * 
 * @description
 * 将任务系统的 Task 对象转换为仪表板组件所需的 DashboardProject 格式。
 * 
 * @param task - 任务对象
 * @param members - AI 成员列表
 * @returns 仪表板项目对象
 * 
 * @example
 * ```typescript
 * const project = taskToDashboardProject(task, members);
 * // { id: 'task_xxx', name: '任务标题', progress: 75, ... }
 * ```
 */
export const taskToDashboardProject = (
  task: Task, 
  members: AIMember[]
): DashboardProject => {
  // 查找分配者名称
  const assigneeName = task.assignee 
    ? members.find(m => m.id === task.assignee)?.name ?? '未分配'
    : '未分配';
  
  // 团队成员列表
  const team = task.assignee ? [assigneeName] : ['未分配'];
  
  // 截止日期（使用创建日期作为后备）
  const deadline = task.createdAt 
    ? new Date(task.createdAt).toLocaleDateString('zh-CN')
    : '无截止日期';
  
  return {
    id: task.id,
    name: task.title,
    progress: getTaskProgress(task),
    status: mapTaskStatus(task.status),
    tasks: {
      total: 1,
      completed: task.status === 'completed' ? 1 : 0,
    },
    team,
    deadline,
  };
};

/**
 * 将任务转换为仪表板活动日志
 * 
 * @description
 * 根据操作类型生成对应的活动日志记录。
 * 
 * @param task - 任务对象
 * @param members - AI 成员列表
 * @param action - 操作类型
 * @returns 仪表板活动对象
 * 
 * @example
 * ```typescript
 * const activity = taskToDashboardActivity(task, members, 'created');
 * // { id: 'task_xxx-created', type: 'task_created', message: '...', ... }
 * ```
 */
export const taskToDashboardActivity = (
  task: Task, 
  members: AIMember[], 
  action: 'created' | 'assigned' | 'completed'
): DashboardActivity => {
  const memberName = task.assignee 
    ? members.find(m => m.id === task.assignee)?.name ?? '未知成员'
    : '系统';
  
  const config = ACTIVITY_CONFIGS[action];
  
  // 生成消息
  let message: string;
  switch (action) {
    case 'created':
      message = config.getMessage(task.title);
      break;
    case 'assigned':
      message = config.getMessage(task.title, memberName);
      break;
    case 'completed':
      message = config.getMessage(task.title);
      break;
  }
  
  // 格式化时间
  const time = task.updatedAt 
    ? new Date(task.updatedAt).toLocaleString('zh-CN')
    : new Date().toLocaleString('zh-CN');
  
  return {
    id: `${task.id}-${action}`,
    type: config.type,
    message,
    user: memberName,
    time,
    emoji: config.emoji,
  };
};

// ============================================
// 批量转换函数
// ============================================

/**
 * 将任务列表转换为仪表板项目列表
 * 
 * @description
 * 批量转换任务为仪表板项目格式。
 * 
 * @param tasks - 任务列表
 * @param members - AI 成员列表
 * @returns 仪表板项目列表
 * 
 * @example
 * ```typescript
 * const projects = getDashboardProjectsFromTasks(tasks, members);
 * ```
 */
export const getDashboardProjectsFromTasks = (
  tasks: Task[], 
  members: AIMember[]
): DashboardProject[] => {
  if (!tasks || tasks.length === 0) return [];
  return tasks.map(task => taskToDashboardProject(task, members));
};

/**
 * 将任务列表转换为仪表板活动日志列表
 * 
 * @description
 * 批量生成活动日志，包括：
 * - 所有任务的创建活动
 * - 已分配任务的分配活动
 * - 已完成任务的完成活动
 * 
 * 结果按时间倒序排列，最多返回 20 条。
 * 
 * @param tasks - 任务列表
 * @param members - AI 成员列表
 * @returns 活动日志列表（最多 20 条）
 * 
 * @example
 * ```typescript
 * const activities = getDashboardActivitiesFromTasks(tasks, members);
 * ```
 */
export const getDashboardActivitiesFromTasks = (
  tasks: Task[], 
  members: AIMember[]
): DashboardActivity[] => {
  if (!tasks || tasks.length === 0) return [];
  
  const activities: DashboardActivity[] = [];
  
  for (const task of tasks) {
    // 添加创建活动
    activities.push(taskToDashboardActivity(task, members, 'created'));
    
    // 如果有分配，添加分配活动
    if (task.assignee) {
      activities.push(taskToDashboardActivity(task, members, 'assigned'));
    }
    
    // 如果已完成，添加完成活动
    if (task.status === 'completed') {
      activities.push(taskToDashboardActivity(task, members, 'completed'));
    }
  }
  
  // 按时间倒序排列，最多返回 20 条
  return activities
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 20);
};

// ============================================
// 计算函数
// ============================================

/**
 * 计算总体完成进度
 * 
 * @description
 * 计算任务列表的整体完成百分比。
 * 基于已完成任务数占总任务数的比例。
 * 
 * @param tasks - 任务列表
 * @returns 完成百分比 (0-100)
 * 
 * @example
 * ```typescript
 * const progress = calculateOverallProgress(tasks);
 * console.log(`项目进度: ${progress}%`);
 * ```
 */
export const calculateOverallProgress = (tasks: Task[]): number => {
  if (!tasks || tasks.length === 0) return 0;
  
  const completedCount = tasks.filter(task => task.status === 'completed').length;
  return Math.round((completedCount / tasks.length) * 100);
};

/**
 * 计算任务平均进度
 * 
 * @description
 * 计算基于任务状态进度的平均值。
 * 比简单的完成率更能反映实际工作进度。
 * 
 * @param tasks - 任务列表
 * @returns 平均进度百分比 (0-100)
 * 
 * @example
 * ```typescript
 * const avgProgress = calculateAverageProgress(tasks);
 * // 考虑 in_progress (75%), assigned (50%) 等中间状态
 * ```
 */
export const calculateAverageProgress = (tasks: Task[]): number => {
  if (!tasks || tasks.length === 0) return 0;
  
  const totalProgress = tasks.reduce((sum, task) => sum + getTaskProgress(task), 0);
  return Math.round(totalProgress / tasks.length);
};

// ============================================
// 导出默认对象
// ============================================

export default {
  // 类型
  DashboardProject: {} as DashboardProject,
  DashboardActivity: {} as DashboardActivity,
  AIMember: {} as AIMember,
  
  // 单个转换
  taskToDashboardProject,
  taskToDashboardActivity,
  
  // 批量转换
  getDashboardProjectsFromTasks,
  getDashboardActivitiesFromTasks,
  
  // 计算
  calculateOverallProgress,
  calculateAverageProgress,
};