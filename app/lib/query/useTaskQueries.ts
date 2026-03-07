/**
 * 任务相关 Query Hooks
 * 
 * 使用 TanStack Query 实现数据缓存和状态管理
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchTasks,
  fetchTask,
  createTaskApi,
  updateTaskApi,
  deleteTaskApi,
  batchUpdateStatusApi,
  fetchTaskStats,
} from '@/lib/tasks/api';
import { fetchTags, createTagApi, deleteTagApi } from '@/lib/tasks/api';
import { taskKeys, tagKeys, getTaskFilterKey } from './keys';
import type { Task, TaskTag, TaskFilter, TaskStatus } from '@/lib/tasks/types';

/**
 * 任务列表查询 Hook
 * 
 * 缓存策略：
 * - staleTime: 2 分钟（数据新鲜期）
 * - 自动后台刷新
 */
export function useTasksQuery(filter?: TaskFilter) {
  const filterKey = getTaskFilterKey(filter);
  
  return useQuery({
    queryKey: taskKeys.list(filterKey),
    queryFn: () => fetchTasks(filter),
    staleTime: 2 * 60 * 1000, // 2 分钟
    select: (tasks) => tasks.map(transformTaskDates),
  });
}

/**
 * 单个任务查询 Hook
 */
export function useTaskQuery(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => fetchTask(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    select: (task) => task ? transformTaskDates(task) : null,
  });
}

/**
 * 任务统计查询 Hook
 */
export function useTaskStatsQuery() {
  return useQuery({
    queryKey: taskKeys.stats(),
    queryFn: fetchTaskStats,
    staleTime: 5 * 60 * 1000, // 统计数据 5 分钟内有效
  });
}

/**
 * 标签查询 Hook
 */
export function useTagsQuery(customOnly = false) {
  return useQuery({
    queryKey: tagKeys.list(customOnly),
    queryFn: () => fetchTags(customOnly),
    staleTime: 10 * 60 * 1000, // 标签变化不频繁，10 分钟缓存
  });
}

/**
 * 创建任务 Mutation Hook
 * 
 * 乐观更新 + 失效策略
 */
export function useCreateTaskMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createTaskApi,
    onSuccess: (newTask) => {
      // 失效所有任务列表查询（触发重新获取）
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      // 失效统计
      queryClient.invalidateQueries({ queryKey: taskKeys.stats() });
      // 预填充新任务到缓存
      queryClient.setQueryData(taskKeys.detail(newTask.id), newTask);
    },
  });
}

/**
 * 更新任务 Mutation Hook
 */
export function useUpdateTaskMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      updateTaskApi(id, updates),
    onSuccess: (updatedTask) => {
      // 更新单个任务缓存
      queryClient.setQueryData(
        taskKeys.detail(updatedTask.id),
        transformTaskDates(updatedTask)
      );
      // 失效列表（因为排序/过滤可能改变）
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      // 失效统计（状态可能改变）
      queryClient.invalidateQueries({ queryKey: taskKeys.stats() });
    },
  });
}

/**
 * 删除任务 Mutation Hook
 */
export function useDeleteTaskMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteTaskApi,
    onSuccess: (_, deletedId) => {
      // 移除单个任务缓存
      queryClient.removeQueries({ queryKey: taskKeys.detail(deletedId) });
      // 失效列表
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      // 失效统计
      queryClient.invalidateQueries({ queryKey: taskKeys.stats() });
    },
  });
}

/**
 * 批量更新状态 Mutation Hook
 */
export function useBatchUpdateStatusMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: TaskStatus }) =>
      batchUpdateStatusApi(ids, status),
    onSuccess: () => {
      // 失效所有任务相关查询
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

/**
 * 创建标签 Mutation Hook
 */
export function useCreateTagMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createTagApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
    },
  });
}

/**
 * 删除标签 Mutation Hook
 */
export function useDeleteTagMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteTagApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
      // 也失效任务（标签可能从任务中移除）
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/**
 * 辅助函数：转换日期字符串为 Date 对象
 */
function transformTaskDates(task: Task): Task {
  return {
    ...task,
    dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt),
    completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
  };
}
