'use client';

import React, { useState } from 'react';
import { useTasks } from '@/lib/tasks/useTasksQuery';
import { Task } from '@/lib/tasks/types';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskForm } from '@/components/tasks/TaskForm';
import { TaskFilterPanel } from '@/components/tasks/TaskFilterPanel';
import { TaskStats } from '@/components/tasks/TaskStats';
import { STATUS_CONFIG } from '@/lib/tasks/types';

// 子代理列表（用于分配任务）
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
];

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
  const [activeTab, setActiveTab] = useState<'all' | Task['status']>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 创建任务
  const handleCreateTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsSubmitting(true);
    try {
      await addTask(taskData);
      setShowForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建任务失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 更新任务
  const handleUpdateTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
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
  };

  // 删除任务
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('确定要删除这个任务吗？')) return;
    try {
      await deleteTask(taskId);
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除任务失败');
    }
  };

  // 更改任务状态
  const handleStatusChange = async (taskId: string, status: Task['status']) => {
    try {
      await updateTask(taskId, { status });
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新状态失败');
    }
  };

  // 标签页计数
  const tabCounts = {
    all: allTasks.length,
    todo: allTasks.filter((t) => t.status === 'todo').length,
    in_progress: allTasks.filter((t) => t.status === 'in_progress').length,
    review: allTasks.filter((t) => t.status === 'review').length,
    done: allTasks.filter((t) => t.status === 'done').length,
  };

  // 根据标签页过滤
  const displayTasks =
    activeTab === 'all' ? tasks : tasks.filter((t) => t.status === activeTab);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 错误提示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
            <p className="text-red-800 dark:text-red-200">⚠️ {error}</p>
            <button
              onClick={clearError}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              ✕
            </button>
          </div>
        )}
        
        {/* 头部 */}
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
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg
                hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                transition-colors shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新建任务
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧：过滤器和统计 */}
          <aside className="lg:col-span-1 space-y-6">
            <TaskFilterPanel
              filter={filter}
              onFilterChange={updateFilter}
              onReset={resetFilter}
              availableTags={allTags}
              assignees={SUBAGENTS}
            />
            <TaskStats tasks={allTasks} />
          </aside>

          {/* 右侧：任务列表 */}
          <main className="lg:col-span-3">
            {/* 标签页 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 mb-6">
              <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700">
                <TabButton
                  active={activeTab === 'all'}
                  onClick={() => setActiveTab('all')}
                  label="全部"
                  count={tabCounts.all}
                />
                <TabButton
                  active={activeTab === 'todo'}
                  onClick={() => setActiveTab('todo')}
                  label="待办"
                  count={tabCounts.todo}
                  color="gray"
                />
                <TabButton
                  active={activeTab === 'in_progress'}
                  onClick={() => setActiveTab('in_progress')}
                  label="进行中"
                  count={tabCounts.in_progress}
                  color="blue"
                />
                <TabButton
                  active={activeTab === 'review'}
                  onClick={() => setActiveTab('review')}
                  label="评审中"
                  count={tabCounts.review}
                  color="purple"
                />
                <TabButton
                  active={activeTab === 'done'}
                  onClick={() => setActiveTab('done')}
                  label="已完成"
                  count={tabCounts.done}
                  color="green"
                />
              </div>

              {/* 排序选择 */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">排序:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
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

            {/* 任务列表 */}
            {displayTasks.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-8 text-center">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  暂无任务
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  点击"新建任务"按钮创建第一个任务
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg
                    hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  新建任务
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={(t) => setEditingTask(t)}
                    onDelete={handleDeleteTask}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </main>
        </div>

        {/* 创建任务表单弹窗 */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <TaskForm
                onSubmit={handleCreateTask}
                onCancel={() => setShowForm(false)}
                availableTags={allTags}
                assignees={SUBAGENTS}
              />
            </div>
          </div>
        )}

        {/* 编辑任务表单弹窗 */}
        {editingTask && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <TaskForm
                task={editingTask}
                onSubmit={handleUpdateTask}
                onCancel={() => setEditingTask(undefined)}
                availableTags={allTags}
                assignees={SUBAGENTS}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 标签页按钮子组件
 */
function TabButton({
  active,
  onClick,
  label,
  count,
  color = 'blue',
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color?: string;
}) {
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
}