/**
 * 团队协作看板状态管理
 * 使用 Zustand 进行状态管理
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { KanbanTask, KanbanStatus, KanbanState } from '../lib/types/kanban';

/**
 * 生成唯一 ID
 */
const generateId = () => `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/**
 * 看板状态 Store
 */
export const useKanbanStore = create<KanbanState>()(
  persist(
    (set) => ({
      tasks: {},
      columnOrder: ['backlog', 'todo', 'in_progress', 'review', 'done'],
      draggingTaskId: null,
      dragSourceColumn: null,

      /**
       * 添加新任务
       */
      addTask: (taskData) => {
        const now = new Date().toISOString();
        const newTask: KanbanTask = {
          ...taskData,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          tasks: {
            ...state.tasks,
            [newTask.id]: newTask,
          },
        }));
      },

      /**
       * 更新任务
       */
      updateTask: (id, updates) => {
        set((state) => {
          const task = state.tasks[id];
          if (!task) return state;

          return {
            tasks: {
              ...state.tasks,
              [id]: {
                ...task,
                ...updates,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      /**
       * 删除任务
       */
      deleteTask: (id) => {
        set((state) => {
          const { [id]: _, ...remainingTasks } = state.tasks;
          return { tasks: remainingTasks };
        });
      },

      /**
       * 移动任务到新列
       */
      moveTask: (taskId, toStatus) => {
        set((state) => {
          const task = state.tasks[taskId];
          if (!task) return state;

          return {
            tasks: {
              ...state.tasks,
              [taskId]: {
                ...task,
                status: toStatus,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      /**
       * 设置拖拽状态
       */
      setDragging: (taskId, sourceColumn) => {
        set({
          draggingTaskId: taskId,
          dragSourceColumn: sourceColumn,
        });
      },
    }),
    {
      name: 'kanban-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tasks: state.tasks,
        columnOrder: state.columnOrder,
      }),
    }
  )
);

/**
 * 获取指定列的任务
 */
export const useColumnTasks = (status: KanbanStatus): KanbanTask[] => {
  return useKanbanStore((state) =>
    Object.values(state.tasks).filter((task) => task.status === status)
  );
};

/**
 * 获取所有列的任务映射
 */
export const useTasksByColumn = (): Record<KanbanStatus, KanbanTask[]> => {
  return useKanbanStore((state) => {
    const grouped: Record<KanbanStatus, KanbanTask[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };

    Object.values(state.tasks).forEach((task) => {
      grouped[task.status].push(task);
    });

    return grouped;
  });
};

/**
 * 获取看板统计
 */
export const useKanbanStats = () => {
  return useKanbanStore((state) => {
    const tasks = Object.values(state.tasks);
    return {
      total: tasks.length,
      backlog: tasks.filter((t) => t.status === 'backlog').length,
      todo: tasks.filter((t) => t.status === 'todo').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      review: tasks.filter((t) => t.status === 'review').length,
      done: tasks.filter((t) => t.status === 'done').length,
      highPriority: tasks.filter((t) => t.priority === 'high' || t.priority === 'urgent').length,
    };
  });
};
