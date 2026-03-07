/**
 * 团队协作看板组件
 * 支持拖拽、任务管理、实时更新
 */

'use client';

import React, { useState, useCallback, useMemo, memo, DragEvent } from 'react';
import { useKanbanStore, useTasksByColumn } from '../hooks/useKanbanStore';
import type { KanbanTask, KanbanStatus } from '../lib/types/kanban';
import { DEFAULT_KANBAN_CONFIG, PRIORITY_CONFIG } from '../lib/types/kanban';
import { KanbanTaskCard } from './KanbanTaskCard';
import { KanbanColumn } from './KanbanColumn';
import { TaskModal } from './TaskModal';

/**
 * 看板组件属性
 */
export interface TeamKanbanProps {
  className?: string;
}

/**
 * 团队协作看板
 */
export const TeamKanban: React.FC<TeamKanbanProps> = ({ className = '' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanStatus | null>(null);

  // Store
  const tasksByColumn = useTasksByColumn();
  const { draggingTaskId, setDragging, moveTask, deleteTask, addTask } = useKanbanStore();

  // 处理新建任务
  const handleCreateTask = useCallback(() => {
    setEditingTask(null);
    setIsModalOpen(true);
  }, []);

  // 处理编辑任务
  const handleEditTask = useCallback((task: KanbanTask) => {
    setEditingTask(task);
    setIsModalOpen(true);
  }, []);

  // 处理删除任务
  const handleDeleteTask = useCallback((task: KanbanTask) => {
    if (confirm(`确定要删除任务 "${task.title}" 吗？`)) {
      deleteTask(task.id);
    }
  }, [deleteTask]);

  // 处理复制任务
  const handleDuplicateTask = useCallback((task: KanbanTask) => {
    const newTask = {
      ...task,
      title: `${task.title} (副本)`,
      id: undefined, // 让 store 生成新 ID
      createdAt: undefined,
      updatedAt: undefined,
    };
    delete newTask.id;
    delete newTask.createdAt;
    delete newTask.updatedAt;
    addTask(newTask);
  }, [addTask]);

  // 关闭模态框
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingTask(null);
  }, []);

  // 拖拽开始
  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>, task: KanbanTask) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    setDragging(task.id, task.status);
  }, [setDragging]);

  // 拖拽结束
  const handleDragEnd = useCallback(() => {
    setDragging(null, null);
    setDragOverColumn(null);
  }, [setDragging]);

  // 拖拽进入列
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>, columnId: KanbanStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  }, []);

  // 拖拽离开列
  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  // 放置任务
  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>, columnId: KanbanStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    
    if (taskId) {
      moveTask(taskId, columnId);
    }
    
    setDragging(null, null);
    setDragOverColumn(null);
  }, [moveTask, setDragging]);

  // 统计信息
  const stats = useMemo(() => {
    const allTasks = Object.values(tasksByColumn).flat();
    return {
      total: allTasks.length,
      done: tasksByColumn.done.length,
      inProgress: tasksByColumn.in_progress.length,
    };
  }, [tasksByColumn]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 看板头部 */}
      <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>📋</span>
            团队协作看板
          </h1>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded">
              {stats.total} 任务
            </span>
            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded">
              {stats.inProgress} 进行中
            </span>
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded">
              {stats.done} 完成
            </span>
          </div>
        </div>
        <button
          onClick={handleCreateTask}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <span>➕</span>
          新建任务
        </button>
      </header>

      {/* 看板主体 */}
      <div className="flex-1 overflow-x-auto p-4 bg-gray-100 dark:bg-gray-900">
        <div className="flex gap-4 h-full min-w-max">
          {DEFAULT_KANBAN_CONFIG.columns.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              color={column.color}
              tasks={tasksByColumn[column.id]}
              limit={column.limit}
              isDragOver={dragOverColumn === column.id}
              isDragging={draggingTaskId !== null}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onEditTask={handleEditTask}
              onCreateTask={handleCreateTask}
            />
          ))}
        </div>
      </div>

      {/* 任务模态框 */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        task={editingTask}
      />
    </div>
  );
};

export default TeamKanban;