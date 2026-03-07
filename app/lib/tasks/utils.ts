import { Task, TaskFilter, TaskPriority, TaskStatus } from './types';

/**
 * 过滤任务列表
 */
export function filterTasks(tasks: Task[], filter: TaskFilter): Task[] {
  return tasks.filter((task) => {
    // 优先级过滤
    if (filter.priority && task.priority !== filter.priority) {
      return false;
    }

    // 状态过滤
    if (filter.status && task.status !== filter.status) {
      return false;
    }

    // 标签过滤
    if (filter.tags && filter.tags.length > 0) {
      const taskTagIds = task.tags.map((t) => t.id);
      const hasAllTags = filter.tags.every((tagId) => taskTagIds.includes(tagId));
      if (!hasAllTags) {
        return false;
      }
    }

    // 负责人过滤
    if (filter.assignee && task.assignee !== filter.assignee) {
      return false;
    }

    // 搜索过滤
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(searchLower);
      const matchDesc = task.description?.toLowerCase().includes(searchLower) || false;
      if (!matchTitle && !matchDesc) {
        return false;
      }
    }

    return true;
  });
}

/**
 * 排序任务列表
 */
export function sortTasks(tasks: Task[], sortBy: 'priority' | 'dueDate' | 'createdAt'): Task[] {
  const priorityOrder: Record<TaskPriority, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  return [...tasks].sort((a, b) => {
    if (sortBy === 'priority') {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }

    if (sortBy === 'dueDate') {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }

    if (sortBy === 'createdAt') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }

    return 0;
  });
}

/**
 * 检查任务是否过期
 */
export function isTaskOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') {
    return false;
  }
  return new Date(task.dueDate) < new Date();
}

/**
 * 检查任务是否即将到期（24小时内）
 */
export function isTaskDueSoon(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') {
    return false;
  }
  const dueDate = new Date(task.dueDate);
  const now = new Date();
  const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilDue > 0 && hoursUntilDue <= 24;
}

/**
 * 获取任务统计信息
 */
export function getTaskStats(tasks: Task[]) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const todo = tasks.filter((t) => t.status === 'todo').length;
  const review = tasks.filter((t) => t.status === 'review').length;
  const overdue = tasks.filter(isTaskOverdue).length;
  const dueSoon = tasks.filter(isTaskDueSoon).length;

  const byPriority = {
    high: tasks.filter((t) => t.priority === 'high').length,
    medium: tasks.filter((t) => t.priority === 'medium').length,
    low: tasks.filter((t) => t.priority === 'low').length,
  };

  return {
    total,
    done,
    inProgress,
    todo,
    review,
    overdue,
    dueSoon,
    completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
    byPriority,
  };
}

/**
 * 格式化截止日期
 */
export function formatDueDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();

  // 重置时间为当天的开始，以便进行日期比较
  const dueDateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 计算天数差异（基于日历日期），使用 Math.floor 避免舍入问题
  const diffTime = dueDateOnly.getTime() - nowDateOnly.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `已过期 ${Math.abs(diffDays)} 天`;
  } else if (diffDays === 0) {
    return '今天截止';
  } else if (diffDays === 1) {
    return '明天截止';
  } else if (diffDays <= 7) {
    return `${diffDays} 天后截止`;
  } else {
    return d.toLocaleDateString('zh-CN');
  }
}

/**
 * 验证任务数据
 */
export function validateTask(task: Partial<Task>): string[] {
  const errors: string[] = [];

  if (!task.title || task.title.trim().length === 0) {
    errors.push('任务标题不能为空');
  }

  if (task.title && task.title.length > 200) {
    errors.push('任务标题不能超过 200 个字符');
  }

  if (task.description && task.description.length > 2000) {
    errors.push('任务描述不能超过 2000 个字符');
  }

  if (task.dueDate && new Date(task.dueDate) < new Date()) {
    errors.push('截止日期不能早于当前时间');
  }

  return errors;
}
