/**
 * 团队协作看板类型定义
 */

/**
 * 看板任务优先级
 */
export type KanbanPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * 看板任务状态/列
 */
export type KanbanStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';

/**
 * 看板任务
 */
export interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  status: KanbanStatus;
  priority: KanbanPriority;
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
  labels?: string[];
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
}

/**
 * 看板列
 */
export interface KanbanColumn {
  id: KanbanStatus;
  title: string;
  tasks: KanbanTask[];
  color: string;
  limit?: number; // WIP 限制
}

/**
 * 看板配置
 */
export interface KanbanConfig {
  columns: {
    id: KanbanStatus;
    title: string;
    color: string;
    limit?: number;
  }[];
  defaultColumn: KanbanStatus;
}

/**
 * 看板状态（Zustand Store）
 */
export interface KanbanState {
  tasks: Record<string, KanbanTask>;
  columnOrder: KanbanStatus[];
  draggingTaskId: string | null;
  dragSourceColumn: KanbanStatus | null;
  
  // Actions
  addTask: (task: Omit<KanbanTask, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTask: (id: string, updates: Partial<KanbanTask>) => void;
  deleteTask: (id: string) => void;
  moveTask: (taskId: string, toStatus: KanbanStatus) => void;
  setDragging: (taskId: string | null, sourceColumn: KanbanStatus | null) => void;
}

/**
 * 拖拽事件数据
 */
export interface DragData {
  taskId: string;
  sourceColumn: KanbanStatus;
}

/**
 * 默认看板配置
 */
export const DEFAULT_KANBAN_CONFIG: KanbanConfig = {
  columns: [
    { id: 'backlog', title: '积压', color: '#6B7280' },
    { id: 'todo', title: '待办', color: '#3B82F6' },
    { id: 'in_progress', title: '进行中', color: '#F59E0B' },
    { id: 'review', title: '审核', color: '#8B5CF6' },
    { id: 'done', title: '完成', color: '#10B981' },
  ],
  defaultColumn: 'todo',
};

/**
 * 优先级配置
 */
export const PRIORITY_CONFIG: Record<KanbanPriority, { color: string; label: string; icon: string }> = {
  low: { color: '#6B7280', label: '低', icon: '🔵' },
  medium: { color: '#3B82F6', label: '中', icon: '🟡' },
  high: { color: '#F59E0B', label: '高', icon: '🟠' },
  urgent: { color: '#EF4444', label: '紧急', icon: '🔴' },
};
