'use client';

import { useState } from 'react';
import AssignmentSuggester from './AssignmentSuggester';
import { useTasksStore } from '@/lib/store/tasks-store';
import { useMembers } from '@/stores/dashboardStore';
import type { Task } from '@/lib/types/task-types';
import type { TaskType, TaskPriority } from '@/lib/types/task-types';

interface TaskFormData {
  title: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
}

interface TaskFormProps {
  onSubmit?: (data: TaskFormData & { assignee?: string }) => void;
  onCancel?: () => void;
  initialData?: TaskFormData;
  showAssignment?: boolean;
  taskId?: string;
}

export default function TaskForm({ 
  onSubmit, 
  initialData, 
  showAssignment = true,
  taskId 
}: TaskFormProps) {
  const [formData, setFormData] = useState<TaskFormData>(
    initialData || {
      title: '',
      description: '',
      type: 'development',
      priority: 'medium',
    }
  );
  
  const [assignee, setAssignee] = useState<string | null>(null);
  const addTask = useTasksStore((state) => state.addTask);
  const updateTask = useTasksStore((state) => state.updateTask);
  const members = useMembers();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAssigneeChange = (assigneeId: string | null) => {
    setAssignee(assigneeId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (onSubmit) {
      // Use custom submit handler if provided
      onSubmit({ ...formData, assignee: assignee || undefined });
    } else if (taskId) {
      // Update existing task
      updateTask(taskId, { 
        ...formData, 
        assignee: assignee || undefined,
        status: assignee ? 'assigned' : 'pending'
      });
    } else {
      // Create new task using store
      addTask({
        ...formData,
        assignee: assignee || undefined,
        status: assignee ? 'assigned' : 'pending',
        createdBy: 'user'
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          任务标题 *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          任务描述
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            任务类型
          </label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
          >
            <option value="development">开发</option>
            <option value="design">设计</option>
            <option value="research">研究</option>
            <option value="marketing">营销</option>
            <option value="other">其他</option>
          </select>
        </div>

        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            优先级
          </label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
          >
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
            <option value="urgent">紧急</option>
          </select>
        </div>
      </div>

      {showAssignment && members.length > 0 && (
        <AssignmentSuggester
          task={formData as Partial<Task>}
          onAssigneeChange={handleAssigneeChange}
        />
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {taskId ? '更新任务' : '创建任务'}
        </button>
      </div>
    </form>
  );
}