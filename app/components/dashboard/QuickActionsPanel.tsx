'use client';

/**
 * 快捷操作面板组件
 */

import React, { memo } from 'react';
import Link from 'next/link';

interface QuickAction {
  icon: string;
  label: string;
  href: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: '➕',
    label: '新建任务',
    href: '/tasks/new',
    color: 'bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50',
  },
  {
    icon: '📋',
    label: '我的任务',
    href: '/tasks',
    color: 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50',
  },
  {
    icon: '📊',
    label: '团队看板',
    href: '/dashboard',
    color: 'bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50',
  },
  {
    icon: '⚙️',
    label: '个人设置',
    href: '/settings',
    color: 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600',
  },
];

const QuickActionsPanel = memo(function QuickActionsPanel() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 transition-colors">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        ⚡ 快捷操作
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`flex flex-col items-center justify-center p-4 rounded-xl transition-colors ${action.color}`}
          >
            <span className="text-2xl mb-1">{action.icon}</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
});

export default QuickActionsPanel;
