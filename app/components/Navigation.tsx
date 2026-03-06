'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import { ThemeToggle } from './ThemeToggle';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    label: '首页',
    icon: '🏠',
  },
  {
    href: '/dashboard',
    label: '实时看板',
    icon: '📊',
  },
  {
    href: '/subagents',
    label: '子代理',
    icon: '🤖',
  },
  {
    href: '/tasks',
    label: '任务',
    icon: '📋',
  },
  {
    href: '/profile',
    label: '个人资料',
    icon: '👤',
  },
  {
    href: '/settings',
    label: '设置',
    icon: '⚙️',
  },
];

// 汉堡菜单图标组件
const HamburgerIcon = ({ isOpen }: { isOpen: boolean }) => (
  <div className="w-6 h-6 relative flex items-center justify-center">
    <span
      className={`absolute h-0.5 w-5 bg-current transform transition-all duration-300 ease-in-out ${
        isOpen ? 'rotate-45' : '-translate-y-1.5'
      }`}
    />
    <span
      className={`absolute h-0.5 w-5 bg-current transition-all duration-300 ease-in-out ${
        isOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100'
      }`}
    />
    <span
      className={`absolute h-0.5 w-5 bg-current transform transition-all duration-300 ease-in-out ${
        isOpen ? '-rotate-45' : 'translate-y-1.5'
      }`}
    />
  </div>
);

export const Navigation: React.FC = () => {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLAnchorElement>(null);

  // 获取基础路径（不含 query string），用于高亮当前页面
  const basePath = pathname?.split('?')[0] || pathname;

  // 切换移动菜单
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  // 关闭移动菜单
  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  // 路由变化时关闭菜单
  useEffect(() => {
    closeMobileMenu();
  }, [pathname, closeMobileMenu]);

  // 打开菜单时聚焦第一个元素，锁定焦点在抽屉内
  useEffect(() => {
    if (isMobileMenuOpen && firstFocusableRef.current) {
      // 延迟聚焦，等待动画完成
      const timer = setTimeout(() => {
        firstFocusableRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isMobileMenuOpen]);

  // 禁止背景滚动
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // ESC 关闭菜单
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        closeMobileMenu();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen, closeMobileMenu]);

  // 焦点陷阱 - Tab 循环
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !drawerRef.current) return;

    const focusableElements = drawerRef.current.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement?.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement?.focus();
    }
  };

  // 桌面端键盘导航处理
  const handleDesktopKeyDown = (e: React.KeyboardEvent, index: number) => {
    const items = NAV_ITEMS.length;

    switch (e.key) {
      case 'ArrowRight': {
        e.preventDefault();
        const nextIndex = (index + 1) % items;
        const nextLink = document.querySelector(
          `[data-nav-index="${nextIndex}"]`
        ) as HTMLAnchorElement;
        nextLink?.focus();
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        const prevIndex = (index - 1 + items) % items;
        const prevLink = document.querySelector(
          `[data-nav-index="${prevIndex}"]`
        ) as HTMLAnchorElement;
        prevLink?.focus();
        break;
      }
      case 'Home': {
        e.preventDefault();
        const firstLink = document.querySelector('[data-nav-index="0"]') as HTMLAnchorElement;
        firstLink?.focus();
        break;
      }
      case 'End': {
        e.preventDefault();
        const lastLink = document.querySelector(
          `[data-nav-index="${items - 1}"]`
        ) as HTMLAnchorElement;
        lastLink?.focus();
        break;
      }
    }
  };

  return (
    <nav
      className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors"
      role="navigation"
      aria-label="主导航"
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded-lg"
            aria-label="AI 团队首页"
            onClick={closeMobileMenu}
          >
            <span className="text-xl sm:text-2xl" aria-hidden="true">
              🤖
            </span>
            <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">AI 团队</span>
          </Link>

          {/* 桌面端导航链接 - md 及以上显示 */}
          <div className="hidden md:flex items-center gap-1" role="menubar" aria-label="页面导航">
            {NAV_ITEMS.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                data-nav-index={index}
                role="menuitem"
                tabIndex={0}
                aria-current={basePath === item.href ? 'page' : undefined}
                aria-label={`${item.label}${basePath === item.href ? '（当前页面）' : ''}`}
                className={`
                  px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  flex items-center gap-2
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
                  ${
                    basePath === item.href
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }
                `}
                onKeyDown={(e) => handleDesktopKeyDown(e, index)}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* 右侧操作区 */}
          <div className="flex items-center gap-1 sm:gap-2" role="group" aria-label="用户操作">
            {/* 主题切换按钮 */}
            <ThemeToggle size="md" />
            
            {/* 桌面端通知按钮 - sm 及以上显示 */}
            <button
              className="hidden sm:flex p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="通知"
              type="button"
            >
              <span aria-hidden="true">🔔</span>
            </button>
            
            {/* 桌面端设置链接 - md 及以上显示 */}
            <Link
              href="/settings"
              className={`hidden md:flex p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                basePath === '/settings'
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              aria-label="设置"
              aria-current={basePath === '/settings' ? 'page' : undefined}
            >
              <span aria-hidden="true">⚙️</span>
            </Link>

            {/* 移动端汉堡菜单按钮 - md 以下显示 */}
            <button
              className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={isMobileMenuOpen ? '关闭菜单' : '打开菜单'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-drawer"
              onClick={toggleMobileMenu}
              type="button"
            >
              <HamburgerIcon isOpen={isMobileMenuOpen} />
            </button>
          </div>
        </div>
      </div>

      {/* 移动端抽屉式导航 */}
      {/* 遮罩层 */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${
          isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />

      {/* 抽屉面板 */}
      <div
        ref={drawerRef}
        id="mobile-drawer"
        className={`fixed top-0 right-0 h-full w-72 max-w-[80vw] bg-white dark:bg-gray-900 z-50 md:hidden transform transition-transform duration-300 ease-in-out shadow-2xl ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="移动端导航菜单"
        onKeyDown={handleKeyDown}
      >
        {/* 抽屉头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <span className="font-bold text-gray-900 dark:text-white text-lg">菜单</span>
          <button
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="关闭菜单"
            onClick={closeMobileMenu}
            type="button"
          >
            <span className="text-xl" aria-hidden="true">✕</span>
          </button>
        </div>

        {/* 抽屉内容 */}
        <div className="flex flex-col h-[calc(100%-60px)] overflow-y-auto">
          <nav className="p-4 space-y-1" role="menu" aria-label="页面导航">
            {NAV_ITEMS.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                ref={index === 0 ? firstFocusableRef : null}
                role="menuitem"
                tabIndex={0}
                aria-current={basePath === item.href ? 'page' : undefined}
                onClick={closeMobileMenu}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
                  ${
                    basePath === item.href
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
              >
                <span className="text-xl" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* 底部操作区 */}
          <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-700 space-y-1">
            <button
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="通知"
              type="button"
            >
              <span className="text-xl" aria-hidden="true">🔔</span>
              <span>通知</span>
            </button>
            
            {/* 主题切换 - 移动端显示 */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-gray-700 dark:text-gray-300">
              <span className="text-xl" aria-hidden="true">🎨</span>
              <span>主题</span>
              <div className="ml-auto">
                <ThemeToggle size="sm" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
