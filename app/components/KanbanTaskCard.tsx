/**
 * 看板任务卡片组件
 * 支持拖拽、优先级显示、标签展示
 */

'use client';

import React, { DragEvent, memo, useMemo } from 'react';
import type { KanbanTask } from '../lib/types/kanban';
import { PRIORITY_CONFIG } from '../lib/types/kanban';

/**
 * 任务卡片属性
 */
export interface KanbanTaskCardProps {
  task: KanbanTask;
  onDragStart: (e: DragEvent<HTMLDivElement>, task: KanbanTask) => void;
  onDragEnd: () => void;
  onClick: () => void;
}

/**
 * 任务卡片组件
 */
export const KanbanTaskCard = memo(function KanbanTaskCard({
  task,
  onDragStart,
  onDragEnd,
  onClick,
}: KanbanTaskCardProps) {
  const priorityConfig = PRIORITY_CONFIG[task.priority];

  // 格式化截止日期
  const dueDateDisplay = useMemo(() => {
    if (!task.dueDate) return null;
    const date = new Date(task.dueDate);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: `已过期 ${Math.abs(diffDays)} 天`, color: 'text-red-500' };
    } else if (diffDays === 0) {
      return { text: '今天到期', color: 'text-orange-500' };
    } else if (diffDays === 1) {
      return { text: '明天到期', color: 'text-yellow-500' };
    } else if (diffDays <= 7) {
      return { text: `${diffDays} 天后`, color: 'text-blue-500' };
    }
    return { text: date.toLocaleDateString(), color: 'text-gray-500' };
  }, [task.dueDate]);

  // 拖拽开始处理
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    onDragStart(e, task);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className="group bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-500"
    >
      {/* 头部：优先级和菜单 */}
      <div className="flex items-center justify-between mb-2">
        <span 
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full"
          style={{ 
            backgroundColor: `${priorityConfig.color}20`, 
            color: priorityConfig.color 
          }}
        >
          <span>{priorityConfig.icon}</span>
          {priorityConfig.label}
        </span>
        
        {/* 更多操作按钮 */}
        <button 
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded transition-all"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: 显示菜单
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      {/* 标题 */}
      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">
        {task.title}
      </h4>

      {/* 描述预览 */}
      {task.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* 标签 */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.slice(0, 3).map((label, index) => (
            <span 
              key={index}
              className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded"
            >
              {label}
            </span>
          ))}
          {task.labels.length > 3 && (
            <span className="px-2 py-0.5 text-xs text-gray-400">
              +{task.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* 底部：负责人、截止日期 */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-600">
        {/* 负责人 */}
        <div className="flex items-center gap-2">
          {task.assignee ? (
            <>
              {task.assignee.avatar ? (
                <img 
                  src={task.assignee.avatar} 
                  alt={task.assignee.name}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                  {task.assignee.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
                {task.assignee.name}
              </span>
            </>
          ) : (
            <span className="text-xs text-gray-400">未分配</span>
          )}
        </div>

        {/* 截止日期 */}
        {dueDateDisplay && (
          <span className={`text-xs ${dueDateDisplay.color}`}>
            📅 {dueDateDisplay.text}
          </span>
        )}
      </div>

      {/* 预估工时 */}
      {(task.estimatedHours || task.actualHours) && (
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
          {task.estimatedHours && (
            <span title="预估工时">
              ⏱️ {task.estimatedHours}h
            </span>
          )}
          {task.actualHours && (
            <span title="实际工时">
              ✅ {task.actualHours}h
            </span>
          )}
        </div>
      )}
    </div>
  );
});