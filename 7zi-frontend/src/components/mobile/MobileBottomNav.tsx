'use client'

/**
 * 移动端底部导航栏
 * PWA 应用样式，类似原生 App 底部导航
 *
 * @version 1.13.0
 * @date 2026-04-05
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

// ============================================
// 导航项类型
// ============================================

export interface NavItem {
  id: string
  label: string
  icon: string // 可以是 emoji 或 SVG 组件
  href: string
  badge?: number | string
  disabled?: boolean
}

// ============================================
// MobileBottomNav 组件
// ============================================

export interface MobileBottomNavProps {
  /** 导航项列表 */
  items: NavItem[]
  /** 当前激活项 ID（可选，自动从 path 推断） */
  activeId?: string
  /** 自定义类名 */
  className?: string
  /** 是否显示（响应式） */
  showOnDesktop?: boolean
}

export function MobileBottomNav({
  items,
  activeId: controlledActiveId,
  className,
  showOnDesktop = false,
}: MobileBottomNavProps) {
  const pathname = usePathname()
  const [activeId, setActiveId] = useState<string>(controlledActiveId || items[0]?.id)

  // 自动推断激活项
  useEffect(() => {
    if (controlledActiveId) {
      setActiveId(controlledActiveId)
    } else {
      const active = items.find(item => pathname === item.href || pathname.startsWith(item.href))
      if (active) {
        setActiveId(active.id)
      }
    }
  }, [pathname, items, controlledActiveId])

  return (
    <nav
      className={clsx(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-white/95 dark:bg-gray-900/95',
        'border-t border-gray-200 dark:border-gray-800',
        'backdrop-blur-md',
        showOnDesktop ? 'block' : 'md:hidden',
        // Safe Area 适配
        'pb-[env(safe-area-inset-bottom)]',
        className
      )}
      aria-label="Main navigation"
    >
      <div className="flex h-16 items-center justify-around px-2">
        {items.map(item => (
          <NavItem
            key={item.id}
            item={item}
            isActive={activeId === item.id}
            onClick={() => setActiveId(item.id)}
          />
        ))}
      </div>
    </nav>
  )
}

// ============================================
// NavItem 子组件
// ============================================

interface NavItemProps {
  item: NavItem
  isActive: boolean
  onClick: () => void
}

function NavItem({ item, isActive, onClick }: NavItemProps) {
  return (
    <Link
      href={item.disabled ? '#' : item.href}
      onClick={onClick}
      className={clsx(
        'relative flex flex-col items-center justify-center',
        'w-full h-full min-w-[44px] min-h-[44px]', // 最小触控区域
        'transition-colors duration-200',
        'rounded-lg',
        'mx-1',
        item.disabled
          ? 'cursor-not-allowed opacity-50'
          : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800',
        isActive
          ? 'text-blue-600 dark:text-blue-400'
          : 'text-gray-500 dark:text-gray-400'
      )}
      aria-disabled={item.disabled}
      aria-current={isActive ? 'page' : undefined}
    >
      {/* 图标 */}
      <span
        className={clsx(
          'text-2xl mb-0.5 transition-transform duration-200',
          isActive ? 'scale-110' : 'scale-100'
        )}
      >
        {item.icon}
      </span>

      {/* 标签 */}
      <span
        className={clsx(
          'text-[10px] font-medium transition-all duration-200',
          isActive ? 'font-semibold' : 'font-normal'
        )}
      >
        {item.label}
      </span>

      {/* 激活指示器 */}
      {isActive && (
        <div
          className={clsx(
            'absolute -top-0.5 left-1/2 -translate-x-1/2',
            'w-1 h-1 rounded-full',
            'bg-blue-600 dark:bg-blue-400'
          )}
        />
      )}

      {/* 徽章 */}
      {item.badge && (
        <span
          className={clsx(
            'absolute -top-1 right-2',
            'min-w-[18px] h-[18px]',
            'flex items-center justify-center',
            'text-[10px] font-bold',
            'rounded-full',
            'bg-red-500 text-white'
          )}
        >
          {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
        </span>
      )}
    </Link>
  )
}

// ============================================
// MobileHeader 组件
// ============================================

export interface MobileHeaderProps {
  /** 标题 */
  title: string
  /** 返回按钮链接 */
  backHref?: string
  /** 右侧操作按钮 */
  actions?: React.ReactNode
  /** 自定义类名 */
  className?: string
  /** 是否显示菜单按钮 */
  showMenuButton?: boolean
  /** 菜单按钮点击处理 */
  onMenuClick?: () => void
}

export function MobileHeader({
  title,
  backHref,
  actions,
  className,
  showMenuButton = false,
  onMenuClick,
}: MobileHeaderProps) {
  return (
    <header
      className={clsx(
        'sticky top-0 z-40',
        'bg-white/95 dark:bg-gray-900/95',
        'border-b border-gray-200 dark:border-gray-800',
        'backdrop-blur-md',
        // Safe Area 适配
        'pt-[env(safe-area-inset-top)]',
        className
      )}
    >
      <div className="flex h-14 items-center justify-between px-4">
        {/* 左侧：返回按钮或菜单按钮 */}
        <div className="flex items-center gap-2">
          {backHref ? (
            <Link
              href={backHref}
              className={clsx(
                'flex items-center justify-center',
                'w-9 h-9 min-w-[36px] min-h-[36px]',
                'rounded-full',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'transition-colors'
              )}
              aria-label="Back"
            >
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
          ) : showMenuButton ? (
            <button
              onClick={onMenuClick}
              className={clsx(
                'flex items-center justify-center',
                'w-9 h-9 min-w-[36px] min-h-[36px]',
                'rounded-full',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'transition-colors'
              )}
              aria-label="Menu"
            >
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          ) : null}
        </div>

        {/* 中间：标题 */}
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate px-4">
          {title}
        </h1>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-2">
          {actions || <div className="w-9 h-9" />} {/* 占位符保持居中 */}
        </div>
      </div>
    </header>
  )
}

// ============================================
// MobileSafeArea 组件
// ============================================

export interface MobileSafeAreaProps {
  children: React.ReactNode
  /** 是否添加顶部间距 */
  top?: boolean
  /** 是否添加底部间距 */
  bottom?: boolean
  /** 自定义类名 */
  className?: string
}

export function MobileSafeArea({ children, top, bottom, className }: MobileSafeAreaProps) {
  return (
    <div
      className={clsx(
        top && 'pt-[env(safe-area-inset-top)]',
        bottom && 'pb-[env(safe-area-inset-bottom)]',
        className
      )}
    >
      {children}
    </div>
  )
}

export default MobileBottomNav
