'use client';

import { useState } from 'react';
import { useTasksStore } from '@/lib/store/tasks-store';
import { useMembers } from '@/stores/dashboardStore';
import TaskCard from './components/TaskCard';
import TaskForm from './components/TaskForm';
import AssignmentSuggester from './components/AssignmentSuggester';
import { Task } from '@/lib/types/task-types';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function TasksPage() {
  const tasks = useTasksStore((state) => state.tasks);
  const addTask = useTasksStore((state) => state.addTask);
  const updateTask = useTasksStore((state) => state.updateTask);
  
  const members = useMembers();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading] = useState(false);

  const handleCreateTask = (data: { title: string; description: string; type: Task['type']; priority: Task['priority']; assignee?: string }) => {
    try {
      addTask({
        ...data,
        status: data.assignee ? 'assigned' : 'pending',
        createdBy: 'user',
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    try {
      updateTask(taskId, updates);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleAssignTask = (taskId: string, assigneeId: string) => {
    const member = members.find(m => m.id === assigneeId);
    if (member) {
      handleUpdateTask(taskId, { 
        assignee: assigneeId,
        status: 'assigned'
      });
    }
  };

  const handleUnassignTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.assignee) {
      handleUpdateTask(taskId, { 
        assignee: undefined,
        status: 'pending'
      });
    }
  };

  const getFilteredTasks = () => {
    return tasks.filter(task => !selectedTask || task.id === selectedTask.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI 任务管理</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          创建新任务
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">创建新任务</h2>
          <TaskForm 
            onSubmit={handleCreateTask}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {selectedTask && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">智能分配建议</h2>
          <AssignmentSuggester 
            task={selectedTask}
            onAssigneeChange={(assigneeId) => {
              if (assigneeId) {
                handleAssignTask(selectedTask.id, assigneeId);
              } else {
                handleUnassignTask(selectedTask.id);
              }
            }}
          />
        </div>
      )}

      <div className="space-y-6">
        {getFilteredTasks().map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={(updates) => handleUpdateTask(task.id, updates)}
            onAssign={handleAssignTask}
            onUnassign={handleUnassignTask}
            onSelect={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
            isSelected={selectedTask?.id === task.id}
          />
        ))}
      </div>

      {tasks.length === 0 && !showCreateForm && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">暂无任务。创建您的第一个任务开始吧！</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            创建第一个任务
          </button>
        </div>
      )}
    </div>
  );
}