/**
 * @fileoverview 通知徽章组件
 * @description 显示未读数量的徽章
 */

'use client';

import React from 'react';
import type { NotificationBadgeProps } from './types';

/** 通知徽章组件 */
export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  maxCount = 99,
}) => {
  if (count <= 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count;

  return (
    <span
      className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full"
      aria-label={`${count} 条未读通知`}
    >
      {displayCount}
    </span>
  );
};

export default NotificationBadge;
