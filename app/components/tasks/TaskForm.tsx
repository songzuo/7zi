'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { Task, TaskPriority, TaskStatus, TaskTag } from '@/lib/tasks/types';
import { PrioritySelector } from './PriorityBadge';
import { TagSelector } from './TagBadge';
import { validateTask } from '@/lib/tasks/utils';
import { DEFAULT_TAGS } from '@/lib/tasks/types';

interface TaskFormProps {
  task?: Task;
  availableTags?: TaskTag[];
  onSubmit: (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel?: () => void;
  assignees?: string[];
  className?: string;
}

// 默认值常量 - 移到组件外部
const DEFAULT_PRIORITY: TaskPriority = 'medium';
const DEFAULT_STATUS: TaskStatus = 'todo';
const MAX_TITLE_LENGTH = 200;
const MAX_DESC_LENGTH = 2000;

/**
 * 任务创建/编辑表单组件 - 性能优化版本
 * 
 * 优化措施:
 * 1. 使用 React.memo 防止不必要的重渲染
 * 2. 使用 useCallback 缓存事件处理函数
 * 3. 常量移到组件外部
 */
export const TaskForm = memo(function TaskForm({
  task,
  availableTags = DEFAULT_TAGS,
  onSubmit,
  onCancel,
  assignees = [],
  className = '',
}: TaskFormProps) {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || DEFAULT_PRIORITY);
  const [status, setStatus] = useState<TaskStatus>(task?.status || DEFAULT_STATUS);
  const [tags, setTags] = useState<TaskTag[]>(task?.tags || []);
  const [assignee, setAssignee] = useState(task?.assignee || '');
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
  );
  const [errors, setErrors] = useState<string[]>([]);

  // 重置表单到任务数据
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setStatus(task.status);
      setTags(task.tags);
      setAssignee(task.assignee || '');
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
    }
  }, [task]);

  // 使用 useCallback 缓存事件处理
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    const taskData = {
      title,
      description: description || undefined,
      priority,
      status,
      tags,
      assignee: assignee || undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    };

    const validationErrors = validateTask(taskData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onSubmit(taskData);
  }, [title, description, priority, status, tags, assignee, dueDate, onSubmit]);

  const handleReset = useCallback(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setStatus(task.status);
      setTags(task.tags);
      setAssignee(task.assignee || '');
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
    } else {
      setTitle('');
      setDescription('');
      setPriority(DEFAULT_PRIORITY);
      setStatus(DEFAULT_STATUS);
      setTags([]);
      setAssignee('');
      setDueDate('');
    }
    setErrors([]);
  }, [task]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  }, []);

  const handleDescChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
  }, []);

  const handlePriorityChange = useCallback((newPriority: TaskPriority) => {
    setPriority(newPriority);
  }, []);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatus(e.target.value as TaskStatus);
  }, []);

  const handleTagsChange = useCallback((newTags: TaskTag[]) => {
    setTags(newTags);
  }, []);

  const handleAssigneeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setAssignee(e.target.value);
  }, []);

  const handleDueDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDueDate(e.target.value);
  }, []);

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 ${className}`}
    >
      <FormHeader isEditing={!!task} />

      {/* 错误提示 */}
      {errors.length > 0 && <ErrorMessage errors={errors} />}

      {/* 任务标题 */}
      <TitleInput
        value={title}
        onChange={handleTitleChange}
        maxLength={MAX_TITLE_LENGTH}
      />

      {/* 任务描述 */}
      <DescriptionInput
        value={description}
        onChange={handleDescChange}
        maxLength={MAX_DESC_LENGTH}
      />

      {/* 优先级选择 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          优先级
        </label>
        <PrioritySelector value={priority} onChange={handlePriorityChange} />
      </div>

      {/* 状态选择 */}
      <StatusSelect value={status} onChange={handleStatusChange} />

      {/* 标签选择 */}
      <div className="mb-4">
        <TagSelector
          selectedTags={tags}
          availableTags={availableTags}
          onChange={handleTagsChange}
          maxTags={5}
        />
      </div>

      {/* 负责人选择 */}
      {assignees.length > 0 && (
        <AssigneeSelect
          assignees={assignees}
          value={assignee}
          onChange={handleAssigneeChange}
        />
      )}

      {/* 截止日期 */}
      <DueDateInput
        value={dueDate}
        onChange={handleDueDateChange}
      />

      {/* 操作按钮 */}
      <FormActions
        onCancel={onCancel}
        onReset={handleReset}
        isEditing={!!task}
      />
    </form>
  );
});

// ============================================================================
// 子组件
// ============================================================================

const FormHeader = memo(function FormHeader({ isEditing }: { isEditing: boolean }) {
  return (
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
      {isEditing ? '编辑任务' : '创建新任务'}
    </h2>
  );
});

const ErrorMessage = memo(function ErrorMessage({ errors }: { errors: string[] }) {
  return (
    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400">
        {errors.map((error, index) => (
          <li key={index}>{error}</li>
        ))}
      </ul>
    </div>
  );
});

interface TitleInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  maxLength: number;
}

const TitleInput = memo(function TitleInput({ value, onChange, maxLength }: TitleInputProps) {
  return (
    <div className="mb-4">
      <label
        htmlFor="task-title"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        任务标题 <span className="text-red-500">*</span>
      </label>
      <input
        id="task-title"
        type="text"
        value={value}
        onChange={onChange}
        placeholder="输入任务标题..."
        maxLength={maxLength}
        required
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          bg-white dark:bg-gray-700 text-gray-900 dark:text-white
          placeholder-gray-400 dark:placeholder-gray-500"
      />
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {value.length}/{maxLength} 字符
      </p>
    </div>
  );
});

interface DescriptionInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  maxLength: number;
}

const DescriptionInput = memo(function DescriptionInput({ value, onChange, maxLength }: DescriptionInputProps) {
  return (
    <div className="mb-4">
      <label
        htmlFor="task-description"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        任务描述
      </label>
      <textarea
        id="task-description"
        value={value}
        onChange={onChange}
        placeholder="详细描述任务内容..."
        rows={4}
        maxLength={maxLength}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          bg-white dark:bg-gray-700 text-gray-900 dark:text-white
          placeholder-gray-400 dark:placeholder-gray-500 resize-none"
      />
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {value.length}/{maxLength} 字符
      </p>
    </div>
  );
});

interface StatusSelectProps {
  value: TaskStatus;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const StatusSelect = memo(function StatusSelect({ value, onChange }: StatusSelectProps) {
  return (
    <div className="mb-4">
      <label
        htmlFor="task-status"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        状态
      </label>
      <select
        id="task-status"
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      >
        <option value="todo">待办</option>
        <option value="in_progress">进行中</option>
        <option value="review">评审中</option>
        <option value="done">已完成</option>
      </select>
    </div>
  );
});

interface AssigneeSelectProps {
  assignees: string[];
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const AssigneeSelect = memo(function AssigneeSelect({ assignees, value, onChange }: AssigneeSelectProps) {
  return (
    <div className="mb-4">
      <label
        htmlFor="task-assignee"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        负责人
      </label>
      <select
        id="task-assignee"
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      >
        <option value="">未分配</option>
        {assignees.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
});

interface DueDateInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const DueDateInput = memo(function DueDateInput({ value, onChange }: DueDateInputProps) {
  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="mb-6">
      <label
        htmlFor="task-due-date"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        截止日期
      </label>
      <input
        id="task-due-date"
        type="date"
        value={value}
        onChange={onChange}
        min={minDate}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      />
    </div>
  );
});

interface FormActionsProps {
  onCancel?: () => void;
  onReset: () => void;
  isEditing: boolean;
}

const FormActions = memo(function FormActions({ onCancel, onReset, isEditing }: FormActionsProps) {
  return (
    <div className="flex gap-3 justify-end">
      {onCancel && (
        <CancelButton onClick={onCancel} />
      )}
      <ResetButton onClick={onReset} />
      <SubmitButton isEditing={isEditing} />
    </div>
  );
});

const CancelButton = memo(function CancelButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
        bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg
        hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2
        focus:ring-blue-500 transition-colors"
    >
      取消
    </button>
  );
});

const ResetButton = memo(function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
        bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg
        hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2
        focus:ring-blue-500 transition-colors"
    >
      重置
    </button>
  );
});

const SubmitButton = memo(function SubmitButton({ isEditing }: { isEditing: boolean }) {
  return (
    <button
      type="submit"
      className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg
        hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
        focus:ring-offset-2 transition-colors"
    >
      {isEditing ? '保存更改' : '创建任务'}
    </button>
  );
});
