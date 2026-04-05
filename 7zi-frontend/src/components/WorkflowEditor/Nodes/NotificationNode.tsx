/**
 * NotificationNode - 发送通知节点
 *
 * v1.12.2 - 发送通知节点组件
 * 支持邮件、短信、Webhook、推送通知
 */

'use client'

import React, { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Bell } from 'lucide-react'
import type { WorkflowNodeData } from '../types'

function NotificationNode({ data, selected }: NodeProps<WorkflowNodeData>) {
  const notificationType = data.config.notificationType || 'email'

  const getNotificationIcon = () => {
    return Bell
  }

  const getNotificationTypeLabel = () => {
    switch (notificationType) {
      case 'email':
        return '邮件'
      case 'sms':
        return '短信'
      case 'webhook':
        return 'Webhook'
      case 'push':
        return '推送'
      default:
        return '通知'
    }
  }

  const getPriorityColor = () => {
    const priority = data.config.notificationPriority || 'normal'
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
      case 'high':
        return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30'
      case 'low':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
      case 'normal':
      default:
        return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30'
    }
  }

  const NotificationIcon = getNotificationIcon()

  return (
    <div
      className={`relative rounded-lg border-2 bg-white px-4 py-3 shadow-sm transition-all dark:bg-gray-800 ${
        selected
          ? 'border-indigo-500 shadow-md dark:border-indigo-400'
          : 'border-violet-200 dark:border-violet-800'
      }`}
    >
      {/* 输入连接点 */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-violet-500 !border-violet-300"
      />

      {/* 输出连接点 */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-violet-500 !border-violet-300"
      />

      {/* 节点头部 */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-violet-100 p-1.5 dark:bg-violet-900/30">
            <NotificationIcon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {data.label || '发送通知'}
          </span>
        </div>

        {/* 优先级标识 */}
        {data.config.notificationPriority && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getPriorityColor()}`}>
            {data.config.notificationPriority}
          </span>
        )}
      </div>

      {/* 节点信息 */}
      <div className="space-y-1">
        {/* 通知类型 */}
        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          <span>类型:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {getNotificationTypeLabel()}
          </span>
        </div>

        {/* 标题 */}
        {data.config.notificationTitle && (
          <div className="truncate text-xs text-gray-600 dark:text-gray-400">
            <span className="text-gray-500 dark:text-gray-500">标题:</span>{' '}
            <span className="font-medium text-gray-900 dark:text-white">
              {data.config.notificationTitle}
            </span>
          </div>
        )}

        {/* 收件人数量 */}
        {data.config.notificationRecipients && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <span>收件人:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {data.config.notificationRecipients.length} 个
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(NotificationNode)
