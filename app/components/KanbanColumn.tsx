/**
 * 看板列组件
 * 支持拖放、任务列表展示
 */

'use client';

import React, { DragEvent, memo } from 'react';
import type { KanbanTask, KanbanStatus } from '../lib/types/kanban';
import { KanbanTaskCard } from './KanbanTaskCard';

/**
 * 看板列属性
 */
export interface KanbanColumnProps {
  id: KanbanStatus;
  title: string;
  color: string;
  tasks: KanbanTask[];
  limit?: number;
  isDragOver: boolean;
  isDragging: boolean;
  onDragStart: (e: DragEvent<HTMLDivElement>, task: KanbanTask) => void;
  onDragEnd: () => void;
  onDragOver: (e: DragEvent<HTMLDivElement>, columnId: KanbanStatus) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent<HTMLDivElement>, columnId: KanbanStatus) => void;
  onEditTask: (task: KanbanTask) => void;
  onCreateTask: () => void;
}

/**
 * 看板列组件
 */
export const KanbanColumn = memo(function KanbanColumn({
  id,
  title,
  color,
  tasks,
  limit,
  isDragOver,
  isDragging,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onEditTask,
  onCreateTask,
}: KanbanColumnProps) {
  const isOverLimit = limit !== undefined && tasks.length > limit;

  return (
    <div
      className={`flex flex-col w-80 min-h-0 bg-gray-50 dark:bg-gray-800 rounded-xl transition-all duration-200 ${
        isDragOver 
          ? 'ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-900/20' 
          : ''
      } ${isDragging ? 'bg-gray-100 dark:bg-gray-700/50' : ''}`}
      onDragOver={(e) => onDragOver(e, id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, id)}
    >
      {/* 列头部 */}
      <div 
        className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700"
        style={{ borderTopColor: color, borderTopWidth: 4 }}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <span 
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              isOverLimit 
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {tasks.length}
            {limit && `/${limit}`}
          </span>
        </div>
        <button
          onClick={onCreateTask}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="添加任务"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* 任务列表 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px]">
        {tasks.length === 0 ? (
          <div className={`flex items-center justify-center h-32 text-gray-400 dark:text-gray-500 text-sm ${
            isDragOver ? 'border-2 border-dashed border-blue-400 rounded-lg' : ''
          }`}>
            {isDragOver ? '释放以放置任务' : '暂无任务'}
          </div>
        ) : (
          tasks.map((task) => (
            <KanbanTaskCard
              key={task.id}
              task={task}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onClick={() => onEditTask(task)}
            />
          ))
        )}
      </div>

      {/* 快速添加任务 */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onCreateTask}
          className="w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加任务
        </button>
      </div>
    </div>
  );
});