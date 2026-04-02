/**
 * Notification Filter Component
 * Filter notifications by type and priority
 */

'use client'

import { NotificationType, NotificationPriority } from '@/types/notifications'
import type { FC, ChangeEvent } from 'react'

// ============================================================================
// Types
// ============================================================================

interface NotificationFilterProps {
  filter: { type?: NotificationType; priority?: NotificationPriority }
  onChange: (filter: { type?: NotificationType; priority?: NotificationPriority }) => void
}

// ============================================================================
// Constants
// ============================================================================

const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  [NotificationType.TASK_ASSIGNED]: '任务分配',
  [NotificationType.TASK_UPDATED]: '任务更新',
  [NotificationType.TASK_COMPLETED]: '任务完成',
  [NotificationType.TASK_OVERDUE]: '任务逾期',
  [NotificationType.MEETING_REMINDER]: '会议提醒',
  [NotificationType.MEETING_STARTED]: '会议开始',
  [NotificationType.MEETING_CANCELED]: '会议取消',
  [NotificationType.SYSTEM_ANNOUNCEMENT]: '系统公告',
  [NotificationType.USER_MENTION]: '@提及',
  [NotificationType.PROJECT_UPDATE]: '项目更新',
  [NotificationType.REPORT_READY]: '报告就绪',
}

const PRIORITY_LABELS: Record<NotificationPriority, string> = {
  [NotificationPriority.URGENT]: '紧急',
  [NotificationPriority.HIGH]: '重要',
  [NotificationPriority.NORMAL]: '普通',
  [NotificationPriority.LOW]: '低',
}

// ============================================================================
// Component
// ============================================================================

export const NotificationFilter: FC<NotificationFilterProps> = ({ filter, onChange }) => {
  const handleTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    onChange({
      ...filter,
      type: value === 'all' ? undefined : (value as NotificationType),
    })
  }

  const handlePriorityChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    onChange({
      ...filter,
      priority: value === 'all' ? undefined : (value as NotificationPriority),
    })
  }

  const handleClear = () => {
    onChange({})
  }

  const hasActiveFilters = filter.type !== undefined || filter.priority !== undefined

  return (
    <div className="flex items-center gap-2">
      {/* Type Filter */}
      <select
        value={filter.type || 'all'}
        onChange={handleTypeChange}
        className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-700"
      >
        <option value="all">所有类型</option>
        {Object.values(NotificationType).map(type => (
          <option key={type} value={type}>
            {NOTIFICATION_TYPE_LABELS[type]}
          </option>
        ))}
      </select>

      {/* Priority Filter */}
      <select
        value={filter.priority || 'all'}
        onChange={handlePriorityChange}
        className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-700"
      >
        <option value="all">所有优先级</option>
        {Object.values(NotificationPriority).map(priority => (
          <option key={priority} value={priority}>
            {PRIORITY_LABELS[priority]}
          </option>
        ))}
      </select>

      {/* Clear Filter */}
      {hasActiveFilters && (
        <button
          onClick={handleClear}
          className="px-2 py-1 text-xs text-zinc-600 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          清除筛选
        </button>
      )}
    </div>
  )
}

export default NotificationFilter
