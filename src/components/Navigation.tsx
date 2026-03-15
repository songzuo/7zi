'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SettingsButton } from './SettingsButton';
import { LanguageSwitcherCompact } from './LanguageSwitcher';
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
  const prevPathnameRef = React.useRef(pathname);

  // 路由变化时关闭菜单
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      // Use requestAnimationFrame to avoid synchronous setState in effect
      requestAnimationFrame(() => {
        setIsMobileMenuOpen(false);
      });
    }
  }, [pathname]);

  // 防止背景滚动
  useEffect(() => {
    if (isMobileMenuOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [isMobileMenuOpen]);

  // ESC 键关闭菜单
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  const toggleMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const getNavLinkClasses = (itemHref: string) => {
    const isActive = pathname === itemHref;
    return `
      px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
      flex items-center gap-2 relative overflow-hidden
      ${
        isActive
          ? 'bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] shadow-sm ring-1 ring-[var(--primary)]'
          : 'text-[var(--nav-text)] hover:bg-[var(--secondary)] hover:text-[var(--nav-text-hover)]'
      }
      hover:scale-105 active:scale-95
    `;
  };

  const getMobileNavLinkClasses = (itemHref: string) => {
    const isActive = pathname === itemHref;
    return `
      flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200
      min-h-[56px] w-full text-left relative overflow-hidden
      ${
        isActive
          ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400'
          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700'
      }
      hover:translate-x-1 active:scale-[0.98]
    `;
  };

  return (
    <nav aria-label="主导航" className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 touch-active rounded-lg p-1">
            <span className="text-2xl">🤖</span>
            <span className="font-bold text-gray-900 dark:text-white hidden sm:inline">AI 团队</span>
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
            <ThemeToggle />
            <LanguageSwitcherCompact className="hidden sm:flex" />
            <SettingsButton compact className="hidden sm:flex" />
            
            {/* 移动端汉堡菜单按钮 - 优化触摸目标 */}
            <button
              onClick={toggleMenu}
              className="md:hidden p-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center touch-active"
              aria-label={isMobileMenuOpen ? '关闭菜单' : '打开菜单'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <div className="w-6 h-6 flex flex-col justify-center items-center gap-1.5">
                <span
                  className={`w-5 h-0.5 bg-current rounded-full transition-all duration-300 ease-out ${
                    isMobileMenuOpen ? 'rotate-45 translate-y-2' : ''
                  }`}
                />
                <span
                  className={`w-5 h-0.5 bg-current rounded-full transition-all duration-300 ease-out ${
                    isMobileMenuOpen ? 'opacity-0 scale-0' : ''
                  }`}
                />
                <span
                  className={`w-5 h-0.5 bg-current rounded-full transition-all duration-300 ease-out ${
                    isMobileMenuOpen ? '-rotate-45 -translate-y-2' : ''
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 移动端菜单 - 全屏滑入式 */}
      <div
        id="mobile-menu"
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ease-out ${
          isMobileMenuOpen
            ? 'opacity-100 visible'
            : 'opacity-0 invisible pointer-events-none'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="导航菜单"
      >
        {/* 背景遮罩 */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          onClick={closeMenu}
          aria-hidden="true"
        />

        {/* 菜单面板 */}
        <div
          className={`absolute top-0 right-0 h-full w-[min(280px,85vw)] bg-white dark:bg-zinc-900 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{
            paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
            paddingTop: 'max(0px, env(safe-area-inset-top))',
          }}
        >
          {/* 头部 */}
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-700 flex-shrink-0">
            <Link
              href="/"
              className="text-2xl font-bold text-zinc-900 dark:text-white touch-active inline-block py-2 rounded-lg"
              onClick={closeMenu}
            >
              🤖 <span className="text-cyan-500">AI 团队</span>
            </Link>
          </div>

          {/* 导航项 - 可滚动区域 */}
          <nav aria-label="移动导航" className="flex-1 overflow-y-auto p-4 overscroll-contain">
            <ul className="space-y-1" role="menu">
              {NAV_ITEMS.map((item, index) => (
                <li key={item.href} role="menuitem">
                  <Link
                    href={item.href}
                    className={getMobileNavLinkClasses(item.href)}
                    onClick={closeMenu}
                    tabIndex={isMobileMenuOpen ? 0 : -1}
                    style={{
                      animationDelay: isMobileMenuOpen ? `${index * 30}ms` : '0ms',
                    }}
                  >
                    <span className="text-2xl" aria-hidden="true">{item.icon}</span>
                    <span className="font-medium text-base">{item.label}</span>
                    {pathname === item.href && (
                      <span className="ml-auto w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0" aria-label="当前页面" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 底部设置区 */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 flex-shrink-0 space-y-3">
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">主题</span>
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">语言</span>
              <LanguageSwitcherCompact />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
