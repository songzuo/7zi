import { Task } from '@/lib/types/task-types';
import { AIMember } from '@/stores/dashboardStore';

/**
 * 将任务系统中的任务转换为仪表板项目格式
 */
export interface DashboardProject {
  id: string;
  name: string;
  progress: number;
  status: 'active' | 'completed' | 'paused';
  tasks: {
    total: number;
    completed: number;
  };
  team: string[];
  deadline: string;
}

/**
 * 将任务系统中的活动转换为仪表板活动日志格式
 */
export interface DashboardActivity {
  id: string;
  type: 'commit' | 'deploy' | 'issue' | 'meeting' | 'task_created' | 'task_assigned' | 'task_completed';
  message: string;
  user: string;
  time: string;
  emoji: string;
}


/**
 * 获取任务进度百分比
 */
const getTaskProgress = (task: Task): number => {
  // 简单的进度计算：基于状态
  switch (task.status) {
    case 'completed':
      return 100;
    case 'in_progress':
      return 75;
    case 'assigned':
      return 50;
    case 'pending':
      return 25;
    default:
      return 0;
  }
};

/**
 * 将单个任务转换为仪表板项目
 */
export const taskToDashboardProject = (task: Task, members: AIMember[]): DashboardProject => {
  const assigneeName = task.assignee 
    ? members.find(m => m.id === task.assignee)?.name || '未分配'
    : '未分配';
  
  const team = task.assignee ? [assigneeName] : ['未分配'];
  
  // 计算截止日期（如果有的话）
  const deadline = task.createdAt 
    ? new Date(task.createdAt).toLocaleDateString('zh-CN')
    : '无截止日期';
  
  return {
    id: task.id,
    name: task.title,
    progress: getTaskProgress(task),
    status: task.status === 'completed' 
      ? 'completed' 
      : task.status === 'pending' 
        ? 'paused' 
        : 'active',
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
 */
export const taskToDashboardActivity = (task: Task, members: AIMember[], action: 'created' | 'assigned' | 'completed'): DashboardActivity => {
  const memberName = task.assignee 
    ? members.find(m => m.id === task.assignee)?.name || '未知成员'
    : '系统';
  
  let message = '';
  let type: DashboardActivity['type'] = 'task_created';
  let emoji = '📋';
  
  switch (action) {
    case 'created':
      message = `创建新任务: "${task.title}"`;
      type = 'task_created';
      emoji = '🆕';
      break;
    case 'assigned':
      message = `分配任务给 ${memberName}: "${task.title}"`;
      type = 'task_assigned';
      emoji = '🔄';
      break;
    case 'completed':
      message = `完成任务: "${task.title}"`;
      type = 'task_completed';
      emoji = '✅';
      break;
  }
  
  const time = task.updatedAt 
    ? new Date(task.updatedAt).toLocaleString('zh-CN')
    : new Date().toLocaleString('zh-CN');
  
  return {
    id: `${task.id}-${action}`,
    type,
    message,
    user: memberName,
    time,
    emoji,
  };
};

/**
 * 获取所有任务的仪表板项目列表
 */
export const getDashboardProjectsFromTasks = (tasks: Task[], members: AIMember[]): DashboardProject[] => {
  return tasks.map(task => taskToDashboardProject(task, members));
};

/**
 * 获取所有任务的仪表板活动日志列表
 */
export const getDashboardActivitiesFromTasks = (tasks: Task[], members: AIMember[]): DashboardActivity[] => {
  const activities: DashboardActivity[] = [];
  
  tasks.forEach(task => {
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
  });
  
  // 按时间排序（最新的在前）
  return activities.sort((a, b) => {
    // 这里简化处理，实际应该从任务的 createdAt/updatedAt 获取准确时间
    return new Date(b.time).getTime() - new Date(a.time).getTime();
  }).slice(0, 20); // 只返回最近的20条
};

/**
 * 计算总体进度
 */
export const calculateOverallProgress = (tasks: Task[]): number => {
  if (tasks.length === 0) return 0;
  
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  return Math.round((completedTasks / tasks.length) * 100);
};