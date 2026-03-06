'use client';

import React, { useState } from 'react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getNavLinkClasses = (itemHref: string) => {
    const isActive = pathname === itemHref;
    return `
      px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
      flex items-center gap-2
      ${
        isActive
          ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }
    `;
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <span className="font-bold text-gray-900 hidden sm:inline">AI 团队</span>
          </Link>

          {/* 导航链接 - Desktop */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={getNavLinkClasses(item.href)}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* 右侧操作区 + 汉堡菜单 */}
          <div className="flex items-center gap-2">
            <button className="hidden sm:block p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              🔔
            </button>
            <button className="hidden sm:block p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              ⚙️
            </button>
            
            {/* 移动端汉堡菜单按钮 */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <span className="text-xl">✕</span>
              ) : (
                <span className="text-xl">☰</span>
              )}
            </button>
          </div>
        </div>

        {/* 移动端菜单 */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 animate-slide-down">
            <div className="flex flex-col gap-2">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={getNavLinkClasses(item.href)}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
              <div className="border-t border-gray-100 my-2 pt-2 flex gap-2">
                <button className="flex-1 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  🔔 通知
                </button>
                <button className="flex-1 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  ⚙️ 设置
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
