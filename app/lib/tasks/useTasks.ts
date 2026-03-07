import { useState, useCallback, useMemo, useEffect } from 'react';
import { Task, TaskFilter, TaskPriority, TaskStatus, TaskTag, DEFAULT_TAGS } from './types';
import { filterTasks, sortTasks, getTaskStats } from './utils';
import {
  fetchTasks,
  createTaskApi,
  updateTaskApi,
  deleteTaskApi,
  batchUpdateStatusApi,
  fetchTags,
  createTagApi,
  deleteTagApi,
} from './api';

// 本地存储键（用于缓存）
const TASKS_CACHE_KEY = '7zi_tasks_cache';
const TAGS_CACHE_KEY = '7zi_tags_cache';

/**
 * 任务管理 Hook - 使用 API 持久化
 */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [customTags, setCustomTags] = useState<TaskTag[]>([]);
  const [filter, setFilter] = useState<TaskFilter>({});
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate' | 'createdAt'>('priority');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 所有可用标签
  const allTags = useMemo(() => [...DEFAULT_TAGS, ...customTags], [customTags]);

  // 从 API 加载数据
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 并行加载任务和标签
        const [tasksData, tagsData] = await Promise.all([
          fetchTasks(),
          fetchTags(true), // 只获取自定义标签
        ]);

        if (!mounted) return;

        // 转换日期字符串为 Date 对象
        const tasksWithDates = tasksData.map((t: Task) => ({
          ...t,
          dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
          completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
        }));

        setTasks(tasksWithDates);
        setCustomTags(tagsData);

        // 更新本地缓存
        try {
          localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(tasksWithDates));
          localStorage.setItem(TAGS_CACHE_KEY, JSON.stringify(tagsData));
        } catch {
          // 忽略缓存错误
        }
      } catch (err) {
        if (!mounted) return;

        const errorMessage = err instanceof Error ? err.message : '加载数据失败';
        setError(errorMessage);

        // 尝试从本地缓存恢复
        try {
          const cachedTasks = localStorage.getItem(TASKS_CACHE_KEY);
          const cachedTags = localStorage.getItem(TAGS_CACHE_KEY);

          if (cachedTasks) {
            const parsed = JSON.parse(cachedTasks);
            const tasksWithDates = parsed.map((t: Task) => ({
              ...t,
              dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
              createdAt: new Date(t.createdAt),
              updatedAt: new Date(t.updatedAt),
              completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
            }));
            setTasks(tasksWithDates);
          }

          if (cachedTags) {
            setCustomTags(JSON.parse(cachedTags));
          }
        } catch {
          // 忽略缓存错误
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  // 过滤和排序后的任务
  const filteredTasks = useMemo(() => {
    const filtered = filterTasks(tasks, filter);
    return sortTasks(filtered, sortBy);
  }, [tasks, filter, sortBy]);

  // 统计信息
  const stats = useMemo(() => getTaskStats(tasks), [tasks]);

  // 添加任务
  const addTask = useCallback(
    async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const newTask = await createTaskApi(taskData);
        const taskWithDates = {
          ...newTask,
          dueDate: newTask.dueDate ? new Date(newTask.dueDate) : undefined,
          createdAt: new Date(newTask.createdAt),
          updatedAt: new Date(newTask.updatedAt),
          completedAt: newTask.completedAt ? new Date(newTask.completedAt) : undefined,
        };
        setTasks((prev) => [...prev, taskWithDates]);
        return taskWithDates;
      } catch (err) {
        setError(err instanceof Error ? err.message : '创建任务失败');
        throw err;
      }
    },
    []
  );

  // 更新任务
  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      const updatedTask = await updateTaskApi(taskId, updates);
      const taskWithDates = {
        ...updatedTask,
        dueDate: updatedTask.dueDate ? new Date(updatedTask.dueDate) : undefined,
        createdAt: new Date(updatedTask.createdAt),
        updatedAt: new Date(updatedTask.updatedAt),
        completedAt: updatedTask.completedAt ? new Date(updatedTask.completedAt) : undefined,
      };
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? taskWithDates : task))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新任务失败');
      throw err;
    }
  }, []);

  // 删除任务
  const deleteTask = useCallback(async (taskId: string) => {
    try {
      await deleteTaskApi(taskId);
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除任务失败');
      throw err;
    }
  }, []);

  // 批量更新任务状态
  const batchUpdateStatus = useCallback(async (taskIds: string[], status: TaskStatus) => {
    try {
      await batchUpdateStatusApi(taskIds, status);
      setTasks((prev) =>
        prev.map((task) =>
          taskIds.includes(task.id)
            ? {
                ...task,
                status,
                updatedAt: new Date(),
                completedAt: status === 'done' ? new Date() : task.completedAt,
              }
            : task
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量更新失败');
      throw err;
    }
  }, []);

  // 添加自定义标签
  const addCustomTag = useCallback(async (tag: Omit<TaskTag, 'id'>) => {
    try {
      const newTag = await createTagApi(tag);
      setCustomTags((prev) => [...prev, newTag]);
      return newTag;
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建标签失败');
      throw err;
    }
  }, []);

  // 删除自定义标签
  const deleteCustomTag = useCallback(async (tagId: string) => {
    try {
      await deleteTagApi(tagId);
      setCustomTags((prev) => prev.filter((tag) => tag.id !== tagId));
      // 同时从所有任务中移除该标签
      setTasks((prev) =>
        prev.map((task) => ({
          ...task,
          tags: task.tags.filter((tag) => tag.id !== tagId),
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除标签失败');
      throw err;
    }
  }, []);

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
    setError(null);
  }, []);

  return {
    // 状态
    tasks: filteredTasks,
    allTasks: tasks,
    customTags,
    allTags,
    filter,
    sortBy,
    isLoading,
    error,
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

    // 查询
    getTaskById,
    getTasksByTag,
    getTasksByAssignee,
  };
}