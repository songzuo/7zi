/**
 * SortableTaskList - 可拖拽排序的任务列表组件
 * 
 * 功能：
 * - 拖拽排序任务
 * - 本地存储持久化
 * - 键盘支持 (Tab + 空格)
 * - 无障碍支持
 * - 重置排序按钮
 * 
 * @example
 * <SortableTaskList
 *   tasks={tasks}
 *   onTaskClick={(task) => console.log(task)}
 *   renderTask={(task) => <TaskCard task={task} />}
 * />
 */

'use client';

import React, { memo, useCallback, useState, useId } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTaskDragSort, SortableTask } from '../../hooks/useTaskDragSort';

// ============================================================================
// 类型定义
// ============================================================================

interface SortableTaskListProps<T extends SortableTask> {
  tasks: T[];
  onTaskClick?: (task: T) => void;
  renderTask: (task: T, isDragging: boolean) => React.ReactNode;
  className?: string;
  listAriaLabel?: string;
  resetButtonLabel?: string;
  onOrderChange?: (tasks: T[]) => void;
}

interface SortableItemProps {
  id: string | number;
  children: React.ReactNode;
  disabled?: boolean;
}

// ============================================================================
// SortableItem 组件
// ============================================================================

const SortableItem = memo(function SortableItem({ 
  id, 
  children, 
  disabled = false 
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        touch-none select-none
        ${isDragging ? 'shadow-lg ring-2 ring-blue-500 rounded-lg' : ''}
      `}
      role="listitem"
      aria-roledescription="sortable"
      aria-describedby={`sortable-instructions-${id}`}
    >
      {/* 无障碍说明 */}
      <span id={`sortable-instructions-${id}`} className="sr-only">
        按空格键抓取，使用方向键移动，按空格键放下，按 Escape 取消
      </span>
      {children}
    </div>
  );
});

// ============================================================================
// 主组件
// ============================================================================

export function SortableTaskList<T extends SortableTask>({
  tasks: initialTasks,
  onTaskClick,
  renderTask,
  className = '',
  listAriaLabel = '可排序的任务列表',
  resetButtonLabel = '重置排序',
  onOrderChange,
}: SortableTaskListProps<T>) {
  const {
    tasks,
    activeId,
    setActiveId,
    handleDragEnd,
    resetSort,
    isSorted,
  } = useTaskDragSort(initialTasks);

  const listId = useId();
  const [showResetButton, setShowResetButton] = useState(false);

  // 配置拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 需要移动8px才触发拖拽
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 拖拽开始
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
  }, [setActiveId]);

  // 拖拽结束
  const onDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      handleDragEnd(active.id, over.id);
      onOrderChange?.(tasks);
    }
    
    setActiveId(null);
  }, [handleDragEnd, setActiveId, tasks, onOrderChange]);

  // 获取当前拖拽的任务
  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  // 鼠标悬停显示重置按钮
  const handleMouseEnter = useCallback(() => {
    if (isSorted) setShowResetButton(true);
  }, [isSorted]);

  const handleMouseLeave = useCallback(() => {
    setShowResetButton(false);
  }, []);

  return (
    <div 
      className={`relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 重置排序按钮 */}
      {isSorted && showResetButton && (
        <button
          onClick={resetSort}
          className="absolute top-2 right-2 z-10 px-3 py-1.5 text-xs font-medium
            bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
            rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700
            text-gray-600 dark:text-gray-400 transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={resetButtonLabel}
        >
          ↻ {resetButtonLabel}
        </button>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            role="list"
            aria-label={listAriaLabel}
            className="space-y-2"
            id={listId}
          >
            {tasks.map((task) => (
              <SortableItem key={task.id} id={task.id}>
                <div
                  onClick={() => onTaskClick?.(task)}
                  className={`
                    cursor-pointer transition-all
                    ${activeId === task.id ? 'opacity-50' : ''}
                  `}
                >
                  {renderTask(task, activeId === task.id)}
                </div>
              </SortableItem>
            ))}
          </div>
        </SortableContext>

        {/* 拖拽覆盖层 */}
        <DragOverlay>
          {activeTask ? (
            <div className="shadow-2xl ring-2 ring-blue-500 rounded-lg bg-white dark:bg-gray-800">
              {renderTask(activeTask, true)}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* 排序状态指示 */}
      {isSorted && (
        <div 
          className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"
          role="status"
          aria-live="polite"
        >
          <span aria-hidden="true">✓</span>
          <span>已自定义排序</span>
        </div>
      )}
    </div>
  );
}

export default SortableTaskList;
