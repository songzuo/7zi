'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    label: '首页',
    icon: '🏠'
  },
  {
    href: '/dashboard',
    label: '实时看板',
    icon: '📊'
  },
  {
    href: '/subagents',
    label: '子代理',
    icon: '🤖'
  },
  {
    href: '/tasks',
    label: '任务',
    icon: '📋'
  },
  {
    href: '/memory',
    label: '记忆',
    icon: '🧠'
  }
];

export const Navigation: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <span className="font-bold text-gray-900 hidden sm:inline">AI 团队</span>
          </Link>

          {/* 导航链接 */}
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  flex items-center gap-2
                  ${
                    pathname === item.href
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <span>{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* 右侧操作区 */}
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              🔔
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              ⚙️
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
