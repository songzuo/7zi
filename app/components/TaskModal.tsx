/**
 * 任务模态框组件
 * 用于创建和编辑任务
 */

'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { useKanbanStore } from '../hooks/useKanbanStore';
import type { KanbanTask, KanbanStatus, KanbanPriority } from '../lib/types/kanban';
import { DEFAULT_KANBAN_CONFIG, PRIORITY_CONFIG } from '../lib/types/kanban';

/**
 * 模态框属性
 */
export interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: KanbanTask | null;
}

/**
 * 表单状态
 */
interface TaskForm {
  title: string;
  description: string;
  status: KanbanStatus;
  priority: KanbanPriority;
  assigneeName: string;
  labels: string;
  dueDate: string;
  estimatedHours: string;
}

const initialForm: TaskForm = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  assigneeName: '',
  labels: '',
  dueDate: '',
  estimatedHours: '',
};

/**
 * 任务模态框组件
 */
export const TaskModal = memo(function TaskModal({
  isOpen,
  onClose,
  task,
}: TaskModalProps) {
  const [form, setForm] = useState<TaskForm>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof TaskForm, string>>>({});

  const { addTask, updateTask, deleteTask } = useKanbanStore();

  // 初始化表单
  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        assigneeName: task.assignee?.name || '',
        labels: task.labels?.join(', ') || '',
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        estimatedHours: task.estimatedHours?.toString() || '',
      });
    } else {
      setForm(initialForm);
    }
    setErrors({});
  }, [task, isOpen]);

  // 更新表单字段
  const updateField = useCallback(<K extends keyof TaskForm>(field: K, value: TaskForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof TaskForm, string>> = {};

    if (!form.title.trim()) {
      newErrors.title = '请输入任务标题';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表单
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const taskData = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      status: form.status,
      priority: form.priority,
      assignee: form.assigneeName.trim() 
        ? { id: `user-${Date.now()}`, name: form.assigneeName.trim() }
        : undefined,
      labels: form.labels.trim()
        ? form.labels.split(',').map((l) => l.trim()).filter(Boolean)
        : undefined,
      dueDate: form.dueDate || undefined,
      estimatedHours: form.estimatedHours ? parseFloat(form.estimatedHours) : undefined,
      createdBy: 'current-user',
    };

    if (task) {
      updateTask(task.id, taskData);
    } else {
      addTask(taskData);
    }

    onClose();
  }, [form, task, addTask, updateTask, onClose]);

  // 删除任务
  const handleDelete = useCallback(() => {
    if (task && confirm('确定要删除这个任务吗？')) {
      deleteTask(task.id);
      onClose();
    }
  }, [task, deleteTask, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* 模态框内容 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl transform transition-all">
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {task ? '编辑任务' : '新建任务'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            {/* 标题 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                任务标题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="输入任务标题..."
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-500">{errors.title}</p>
              )}
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                描述
              </label>
              <textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="输入任务描述..."
              />
            </div>

            {/* 状态和优先级 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  状态
                </label>
                <select
                  value={form.status}
                  onChange={(e) => updateField('status', e.target.value as KanbanStatus)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {DEFAULT_KANBAN_CONFIG.columns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  优先级
                </label>
                <select
                  value={form.priority}
                  onChange={(e) => updateField('priority', e.target.value as KanbanPriority)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.icon} {config.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 负责人 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                负责人
              </label>
              <input
                type="text"
                value={form.assigneeName}
                onChange={(e) => updateField('assigneeName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="输入负责人姓名..."
              />
            </div>

            {/* 标签 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                标签
              </label>
              <input
                type="text"
                value={form.labels}
                onChange={(e) => updateField('labels', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="输入标签，用逗号分隔..."
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                例如：前端, Bug, 优化
              </p>
            </div>

            {/* 截止日期和预估工时 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  截止日期
                </label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => updateField('dueDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  预估工时 (小时)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.estimatedHours}
                  onChange={(e) => updateField('estimatedHours', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                {task && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    删除任务
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                  {task ? '保存修改' : '创建任务'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
});