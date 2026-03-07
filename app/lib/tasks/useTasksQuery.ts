/**
 * 任务管理 Hook - React Query 版本
 * 
 * 使用 TanStack Query 实现数据缓存和状态管理
 * 替代原来的手动状态管理 + localStorage 缓存
 */

import { useState, useCallback, useMemo } from 'react';
import { Task, TaskFilter, TaskPriority, TaskStatus, TaskTag, DEFAULT_TAGS } from './types';
import { filterTasks, sortTasks, getTaskStats } from './utils';
import {
  useTasksQuery,
  useTaskStatsQuery,
  useTagsQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useBatchUpdateStatusMutation,
  useCreateTagMutation,
  useDeleteTagMutation,
} from '@/lib/query';

/**
 * 任务管理 Hook - 使用 React Query 缓存
 */
export function useTasks() {
  // 过滤和排序状态（本地状态，不需要缓存）
  const [filter, setFilter] = useState<TaskFilter>({});
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate' | 'createdAt'>('priority');

  // React Query 查询
  const tasksQuery = useTasksQuery();
  const statsQuery = useTaskStatsQuery();
  const tagsQuery = useTagsQuery(true); // 只获取自定义标签

  // React Query 变更
  const createTaskMutation = useCreateTaskMutation();
  const updateTaskMutation = useUpdateTaskMutation();
  const deleteTaskMutation = useDeleteTaskMutation();
  const batchUpdateMutation = useBatchUpdateStatusMutation();
  const createTagMutation = useCreateTagMutation();
  const deleteTagMutation = useDeleteTagMutation();

  // 从查询结果获取数据
  const tasks = tasksQuery.data ?? [];
  const customTags = tagsQuery.data ?? [];
  const stats = statsQuery.data ?? getTaskStats([]);

  // 所有可用标签
  const allTags = useMemo(() => [...DEFAULT_TAGS, ...customTags], [customTags]);

  // 过滤和排序后的任务
  const filteredTasks = useMemo(() => {
    const filtered = filterTasks(tasks, filter);
    return sortTasks(filtered, sortBy);
  }, [tasks, filter, sortBy]);

  // 添加任务
  const addTask = useCallback(
    async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newTask = await createTaskMutation.mutateAsync(taskData);
      return {
        ...newTask,
        dueDate: newTask.dueDate ? new Date(newTask.dueDate) : undefined,
        createdAt: new Date(newTask.createdAt),
        updatedAt: new Date(newTask.updatedAt),
        completedAt: newTask.completedAt ? new Date(newTask.completedAt) : undefined,
      };
    },
    [createTaskMutation]
  );

  // 更新任务
  const updateTask = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      const updatedTask = await updateTaskMutation.mutateAsync({
        id: taskId,
        updates,
      });
      return {
        ...updatedTask,
        dueDate: updatedTask.dueDate ? new Date(updatedTask.dueDate) : undefined,
        createdAt: new Date(updatedTask.createdAt),
        updatedAt: new Date(updatedTask.updatedAt),
        completedAt: updatedTask.completedAt ? new Date(updatedTask.completedAt) : undefined,
      };
    },
    [updateTaskMutation]
  );

  // 删除任务
  const deleteTask = useCallback(
    async (taskId: string) => {
      await deleteTaskMutation.mutateAsync(taskId);
    },
    [deleteTaskMutation]
  );

  // 批量更新任务状态
  const batchUpdateStatus = useCallback(
    async (taskIds: string[], status: TaskStatus) => {
      await batchUpdateMutation.mutateAsync({ ids: taskIds, status });
    },
    [batchUpdateMutation]
  );

  // 添加自定义标签
  const addCustomTag = useCallback(
    async (tag: Omit<TaskTag, 'id'>) => {
      return createTagMutation.mutateAsync(tag);
    },
    [createTagMutation]
  );

  // 删除自定义标签
  const deleteCustomTag = useCallback(
    async (tagId: string) => {
      await deleteTagMutation.mutateAsync(tagId);
    },
    [deleteTagMutation]
  );

  // 更新过滤器
  const updateFilter = useCallback((newFilter: Partial<TaskFilter>) => {
    setFilter((prev) => ({ ...prev, ...newFilter }));
  }, []);

  // 重置过滤器
  const resetFilter = useCallback(() => {
    setFilter({});
  }, []);

  // 根据ID获取任务
  const getTaskById = useCallback(
    (taskId: string) => {
      return tasks.find((task) => task.id === taskId);
    },
    [tasks]
  );

  // 根据标签获取任务
  const getTasksByTag = useCallback(
    (tagId: string) => {
      return tasks.filter((task) => task.tags.some((tag) => tag.id === tagId));
    },
    [tasks]
  );

  // 根据负责人获取任务
  const getTasksByAssignee = useCallback(
    (assigneeId: string) => {
      return tasks.filter((task) => task.assignee === assigneeId);
    },
    [tasks]
  );

  // 清除错误
  const clearError = useCallback(() => {
    // React Query 的错误会自动清除
  }, []);

  // 手动刷新
  const refetch = useCallback(() => {
    tasksQuery.refetch();
    tagsQuery.refetch();
    statsQuery.refetch();
  }, [tasksQuery, tagsQuery, statsQuery]);

  return {
    // 状态
    tasks: filteredTasks,
    allTasks: tasks,
    customTags,
    allTags,
    filter,
    sortBy,
    isLoading: tasksQuery.isLoading || tagsQuery.isLoading,
    isFetching: tasksQuery.isFetching || tagsQuery.isFetching,
    error: tasksQuery.error?.message || tagsQuery.error?.message || null,
    stats,

    // 操作
    addTask,
    updateTask,
    deleteTask,
    batchUpdateStatus,
    addCustomTag,
    deleteCustomTag,
    updateFilter,
    resetFilter,
    setSortBy,
    clearError,
    refetch,

    // 变更状态（用于 UI 反馈）
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,

    // 查询
    getTaskById,
    getTasksByTag,
    getTasksByAssignee,
  };
}