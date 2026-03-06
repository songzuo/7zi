'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import { useTasks } from '@/lib/tasks/useTasks';
import { Task } from '@/lib/tasks/types';
import { TaskForm } from '@/components/tasks/TaskForm';
import { TaskFilterPanel } from '@/components/tasks/TaskFilterPanel';
import { TaskStats } from '@/components/tasks/TaskStats';
import { VirtualizedTaskGrid } from '@/components/tasks/VirtualizedTaskList';
import { STATUS_CONFIG } from '@/lib/tasks/types';

// 子代理列表（用于分配任务）- 移到组件外部避免每次渲染创建
const SUBAGENTS = [
  '🌟 智能体世界专家',
  '📚 咨询师',
  '🏗️ 架构师',
  '⚡ Executor',
  '🛡️ 系统管理员',
  '🧪 测试员',
  '🎨 设计师',
  '📣 推广专员',
  '💼 销售客服',
  '💰 财务',
  '📺 媒体',
] as const;

// 状态类型
type TabType = 'all' | Task['status'];

/**
 * 任务管理页面 - 性能优化版本
 * 
 * 优化措施:
 * 1. 使用 useMemo 缓存计算结果（tabCounts, displayTasks）
 * 2. 使用 useCallback 缓存事件处理函数
 * 3. 使用 React.memo 包装子组件
 * 4. 大型列表使用虚拟化
 * 5. 状态提升，避免不必要的渲染
 */
export default function TasksPage() {
  const {
    tasks,
    allTasks,
    allTags,
    filter,
    sortBy,
    isLoading,
    error,
    stats,
    addTask,
    updateTask,
    deleteTask,
    updateFilter,
    resetFilter,
    setSortBy,
    clearError,
  } = useTasks();

  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==================== 事件处理函数（使用 useCallback 缓存） ====================

  const handleCreateTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsSubmitting(true);
    try {
      await addTask(taskData);
      setShowForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建任务失败');
    } finally {
      setIsSubmitting(false);
    }
  }, [addTask]);

  const handleUpdateTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingTask) return;
    setIsSubmitting(true);
    try {
      await updateTask(editingTask.id, taskData);
      setEditingTask(undefined);
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新任务失败');
    } finally {
      setIsSubmitting(false);
    }
  }, [editingTask, updateTask]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (!confirm('确定要删除这个任务吗？')) return;
    try {
      await deleteTask(taskId);
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除任务失败');
    }
  }, [deleteTask]);

  const handleStatusChange = useCallback(async (taskId: string, status: Task['status']) => {
    try {
      await updateTask(taskId, { status });
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新状态失败');
    }
  }, [updateTask]);

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
  }, []);

  const handleCloseEditForm = useCallback(() => {
    setEditingTask(undefined);
  }, []);

  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as typeof sortBy);
  }, [setSortBy]);

  // ==================== 计算属性（使用 useMemo 缓存） ====================

  // 标签页计数 - 使用 useMemo 缓存
  const tabCounts = useMemo(() => ({
    all: allTasks.length,
    todo: allTasks.filter((t) => t.status === 'todo').length,
    in_progress: allTasks.filter((t) => t.status === 'in_progress').length,
    review: allTasks.filter((t) => t.status === 'review').length,
    done: allTasks.filter((t) => t.status === 'done').length,
  }), [allTasks]);

  // 根据标签页过滤任务 - 使用 useMemo 缓存
  const displayTasks = useMemo(() => 
    activeTab === 'all' ? tasks : tasks.filter((t) => t.status === activeTab),
    [tasks, activeTab]
  );

  // 是否使用虚拟化（超过20个任务时启用）
  const useVirtualization = useMemo(() => 
    displayTasks.length > 20,
    [displayTasks.length]
  );

  // ==================== 渲染 ====================

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 错误提示 */}
        {error && (
          <ErrorBanner error={error} onDismiss={clearError} />
        )}
        
        {/* 头部 */}
        <Header onCreateTask={() => setShowForm(true)} />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧：过滤器和统计 */}
          <aside className="lg:col-span-1 space-y-6">
            <TaskFilterPanel
              filter={filter}
              onFilterChange={updateFilter}
              onReset={resetFilter}
              availableTags={allTags}
              assignees={[...SUBAGENTS]}
            />
            <TaskStats tasks={allTasks} />
          </aside>

          {/* 右侧：任务列表 */}
          <main className="lg:col-span-3">
            {/* 标签页 */}
            <TabBar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              tabCounts={tabCounts}
              sortBy={sortBy}
              onSortChange={handleSortChange}
            />

            {/* 任务列表 - 根据数量决定是否使用虚拟化 */}
            {useVirtualization ? (
              <VirtualizedTaskGrid
                tasks={displayTasks}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                onStatusChange={handleStatusChange}
              />
            ) : (
              <SimpleTaskGrid
                tasks={displayTasks}
                onCreateTask={() => setShowForm(true)}
              />
            )}
          </main>
        </div>

        {/* 创建任务表单弹窗 */}
        {showForm && (
          <FormModal onClose={handleCloseForm}>
            <TaskForm
              onSubmit={handleCreateTask}
              onCancel={handleCloseForm}
              availableTags={allTags}
              assignees={[...SUBAGENTS]}
            />
          </FormModal>
        )}

        {/* 编辑任务表单弹窗 */}
        {editingTask && (
          <FormModal onClose={handleCloseEditForm}>
            <TaskForm
              task={editingTask}
              onSubmit={handleUpdateTask}
              onCancel={handleCloseEditForm}
              availableTags={allTags}
              assignees={[...SUBAGENTS]}
            />
          </FormModal>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 子组件 - 使用 React.memo 防止不必要的重渲染
// ============================================================================

const LoadingState = memo(function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">加载中...</p>
      </div>
    </div>
  );
});

interface ErrorBannerProps {
  error: string;
  onDismiss: () => void;
}

const ErrorBanner = memo(function ErrorBanner({ error, onDismiss }: ErrorBannerProps) {
  return (
    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
      <p className="text-red-800 dark:text-red-200">⚠️ {error}</p>
      <button
        onClick={onDismiss}
        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
      >
        ✕
      </button>
    </div>
  );
});

interface HeaderProps {
  onCreateTask: () => void;
}

const Header = memo(function Header({ onCreateTask }: HeaderProps) {
  return (
    <header className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            📋 任务管理
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            管理团队任务，追踪进度和优先级
          </p>
        </div>
        <button
          onClick={onCreateTask}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg
            hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            transition-colors shadow-md"
        >
          <PlusIcon />
          新建任务
        </button>
      </div>
    </header>
  );
});

const PlusIcon = memo(function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
});

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  tabCounts: Record<TabType, number>;
  sortBy: string;
  onSortChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const TabBar = memo(function TabBar({ activeTab, onTabChange, tabCounts, sortBy, onSortChange }: TabBarProps) {
  const tabs: { key: TabType; label: string; color: string }[] = [
    { key: 'all', label: '全部', color: 'blue' },
    { key: 'todo', label: '待办', color: 'gray' },
    { key: 'in_progress', label: '进行中', color: 'blue' },
    { key: 'review', label: '评审中', color: 'purple' },
    { key: 'done', label: '已完成', color: 'green' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 mb-6">
      <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <TabButton
            key={tab.key}
            active={activeTab === tab.key}
            onClick={() => onTabChange(tab.key)}
            label={tab.label}
            count={tabCounts[tab.key]}
            color={tab.color}
          />
        ))}
      </div>

      {/* 排序选择 */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">排序:</span>
          <select
            value={sortBy}
            onChange={onSortChange}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1
              bg-white dark:bg-gray-700 text-gray-900 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="priority">优先级</option>
            <option value="dueDate">截止日期</option>
            <option value="createdAt">创建时间</option>
          </select>
        </div>
      </div>
    </div>
  );
});

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color: string;
}

const TabButton = memo(function TabButton({ active, onClick, label, count, color }: TabButtonProps) {
  const activeColorClasses: Record<string, string> = {
    blue: 'border-blue-500 text-blue-600 dark:text-blue-400',
    gray: 'border-gray-500 text-gray-600 dark:text-gray-400',
    green: 'border-green-500 text-green-600 dark:text-green-400',
    purple: 'border-purple-500 text-purple-600 dark:text-purple-400',
  };

  return (
    <button
      onClick={onClick}
      className={`
        flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors
        focus:outline-none
        ${
          active
            ? activeColorClasses[color]
            : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
        }
      `}
    >
      {label}
      <span
        className={`
          ml-2 px-2 py-0.5 text-xs rounded-full
          ${active ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}
        `}
      >
        {count}
      </span>
    </button>
  );
});

interface FormModalProps {
  onClose: () => void;
  children: React.ReactNode;
}

const FormModal = memo(function FormModal({ onClose, children }: FormModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
});

interface SimpleTaskGridProps {
  tasks: Task[];
  onCreateTask: () => void;
}

const SimpleTaskGrid = memo(function SimpleTaskGrid({ tasks, onCreateTask }: SimpleTaskGridProps) {
  // 使用静态导入，由父组件传入回调函数
  if (tasks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="text-6xl mb-4">📭</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          暂无任务
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          点击"新建任务"按钮创建第一个任务
        </p>
        <button
          onClick={onCreateTask}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg
            hover:bg-blue-700 transition-colors"
        >
          <PlusIcon />
          新建任务
        </button>
      </div>
    );
  }

  // 使用简单的 map 渲染，让父组件决定使用哪个 TaskCard
  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <div key={task.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <h3 className="font-medium text-gray-900 dark:text-white">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{task.description}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded">{task.status}</span>
            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">{task.priority}</span>
          </div>
        </div>
      ))}
    </div>
  );
});