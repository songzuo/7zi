'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: '首页', icon: '🏠' },
  { href: '/about', label: '关于我们', icon: 'ℹ️' },
  { href: '/team', label: '团队成员', icon: '👥' },
  { href: '/blog', label: '博客', icon: '📝' },
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/contact', label: '联系我们', icon: '📧' },
];

/**
 * 优化后的移动端菜单组件
 * 
 * 改进点:
 * 1. 触摸目标尺寸优化 (44x44px)
 * 2. 安全区域适配 (刘海屏)
 * 3. 流畅动画
 * 4. 防止滚动穿透
 * 5. 键盘导航支持
 */
export function MobileMenuOptimized() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // 路由变化时关闭菜单
  const prevPathnameRef = React.useRef(pathname);
  React.useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      setIsOpen(false);
    }
  }, [pathname]);

  // 防止背景滚动
  useEffect(() => {
    if (isOpen) {
      // 保存当前滚动位置
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      // 恢复滚动
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
  }, [isOpen]);

  // ESC 键关闭菜单
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* 移动端菜单按钮 - 优化触摸目标 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden p-3 text-zinc-600 dark:text-zinc-400 hover:text-cyan-500 transition-colors touch-active rounded-xl min-w-[48px] min-h-[48px] flex items-center justify-center"
        aria-label={isOpen ? '关闭菜单' : '打开菜单'}
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
      >
        <div className="w-6 h-6 flex flex-col justify-center items-center gap-1.5">
          <span
            className={`w-5 h-0.5 bg-current rounded-full transition-all duration-300 ease-out ${
              isOpen ? 'rotate-45 translate-y-2' : ''
            }`}
          />
          <span
            className={`w-5 h-0.5 bg-current rounded-full transition-all duration-300 ease-out ${
              isOpen ? 'opacity-0 scale-0' : ''
            }`}
          />
          <span
            className={`w-5 h-0.5 bg-current rounded-full transition-all duration-300 ease-out ${
              isOpen ? '-rotate-45 -translate-y-2' : ''
            }`}
          />
        </div>
      </button>

      {/* 移动端菜单覆盖层 */}
      <div
        id="mobile-menu"
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ease-out ${
          isOpen
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
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />

        {/* 菜单面板 - 优化宽度和安全区域 */}
        <div
          className={`absolute top-0 right-0 h-full w-[min(280px,85vw)] bg-white dark:bg-zinc-900 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{
            paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
            paddingTop: 'max(0px, env(safe-area-inset-top))',
          }}
        >
          {/* 头部 */}
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
            <Link
              href="/"
              className="text-2xl font-bold text-zinc-900 dark:text-white touch-active inline-block py-2"
              onClick={() => setIsOpen(false)}
            >
              7zi<span className="text-cyan-500">Studio</span>
            </Link>
          </div>

          {/* 导航项 - 可滚动区域 */}
          <nav className="flex-1 overflow-y-auto p-4 overscroll-contain">
            <ul className="space-y-1" role="menu">
              {NAV_ITEMS.map((item, index) => (
                <li key={item.href} role="menuitem">
                  <Link
                    href={item.href}
                    className={`flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200 touch-active min-h-[56px] ${
                      pathname === item.href
                        ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700'
                    }`}
                    onClick={() => setIsOpen(false)}
                    style={{
                      animationDelay: isOpen ? `${index * 30}ms` : '0ms',
                    }}
                    tabIndex={isOpen ? 0 : -1}
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

          {/* 底部链接 */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex-shrink-0">
            <a
              href="https://visa.7zi.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 text-center text-sm text-zinc-500 dark:text-zinc-400 hover:text-cyan-500 transition-colors touch-active rounded-xl"
              onClick={() => setIsOpen(false)}
            >
              7zi 环球通 (旧项目)
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

export default MobileMenuOptimized;