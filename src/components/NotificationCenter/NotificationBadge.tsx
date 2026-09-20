/**
 * @fileoverview 通知徽章组件
 * @description 显示未读数量的徽章
 */

'use client'

import type { NotificationBadgeProps } from './types'
import type { FC } from 'react'

/** 通知徽章组件 */
export const NotificationBadge: FC<NotificationBadgeProps> = ({ count, maxCount = 99 }) => {
  if (count <= 0) return null

  const displayCount = count > maxCount ? `${maxCount}+` : count

  return (
    <span
      className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white"
      aria-label={`${count} 条未读通知`}
    >
      {displayCount}
    </span>
  )
}

export default NotificationBadge
