'use client'

'use memo'

/**
 * Navigation 骨架屏组件
 * 用于导航栏加载状态
 *
 * @version 1.0.0
 * @date 2026-03-29
 */

import React from 'react'
import { Skeleton } from './Skeleton'
import clsx from 'clsx'

// ============================================
// Navigation 骨架屏组件
// ============================================

export interface NavigationSkeletonProps {
  /** 是否为移动端 */
  isMobile?: boolean
  /** CSS 类名 */
  className?: string
}

export function NavigationSkeleton({ isMobile = false, className }: NavigationSkeletonProps) {
  if (isMobile) {
    return <MobileNavigationSkeleton className={className} />
  }

  return <DesktopNavigationSkeleton className={className} />
}

// ============================================
// 桌面导航骨架屏
// ============================================

function DesktopNavigationSkeleton({ className }: { className?: string }) {
  return (
    <nav
      className={clsx(
        'border-b border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900',
        'sticky top-0 z-50',
        'animate-pulse'
      )}
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo 骨架 */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-800" />
            <div className="hidden h-6 w-24 rounded bg-gray-200 sm:block dark:bg-gray-800" />
          </div>

          {/* 导航链接骨架 */}
          <div className="hidden items-center gap-1 md:flex">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-2 rounded-lg px-4 py-2.5">
                <div className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-800" />
                <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-800" />
              </div>
            ))}
          </div>

          {/* 右侧操作骨架 */}
          <div className="flex items-center gap-2">
            <div className="hidden h-10 w-10 rounded-lg bg-gray-200 sm:block dark:bg-gray-800" />
            <div className="hidden h-10 w-10 rounded-lg bg-gray-200 sm:block dark:bg-gray-800" />
            <div className="hidden h-10 w-10 rounded-lg bg-gray-200 sm:block dark:bg-gray-800" />
            <div className="h-12 w-12 rounded-xl bg-gray-200 md:hidden dark:bg-gray-800" />
          </div>
        </div>
      </div>
    </nav>
  )
}

// ============================================
// 移动端导航骨架屏
// ============================================

function MobileNavigationSkeleton({ className }: { className?: string }) {
  return (
    <nav
      className={clsx(
        'border-b border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900',
        'sticky top-0 z-50',
        'animate-pulse'
      )}
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo 骨架 */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-800" />
            <div className="h-6 w-24 rounded bg-gray-200 dark:bg-gray-800" />
          </div>

          {/* 菜单按钮骨架 */}
          <div className="h-12 w-12 rounded-xl bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>

      {/* 侧边菜单骨架 */}
      <div className="fixed inset-0 z-50">
        {/* 遮罩 */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* 菜单面板 */}
        <div className="absolute top-0 right-0 h-full w-[85vw] max-w-[300px] bg-white shadow-2xl dark:bg-zinc-900">
          {/* 头部 */}
          <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
            <div className="h-8 w-32 rounded bg-gray-200 dark:bg-gray-800" />
          </div>

          {/* 导航项 */}
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 rounded-xl p-4">
                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-800" />
                <div className="h-5 w-24 rounded bg-gray-200 dark:bg-gray-800" />
              </div>
            ))}
          </div>

          {/* 底部设置 */}
          <div className="absolute right-0 bottom-0 left-0 space-y-2 border-t border-zinc-200 p-4 dark:border-zinc-700">
            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
              <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-8 w-8 rounded bg-gray-200 dark:bg-gray-800" />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
              <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-8 w-8 rounded bg-gray-200 dark:bg-gray-800" />
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

// ============================================
// 带加载状态的导航包装器
// ============================================

export interface NavigationWithSkeletonProps {
  /** 是否加载中 */
  loading: boolean
  /** 子元素 (实际导航) */
  children: React.ReactNode
  /** 延迟显示加载状态 (ms) */
  delay?: number
  /** CSS 类名 */
  className?: string
}

export function NavigationWithSkeleton({
  loading,
  children,
  delay = 200,
  className,
}: NavigationWithSkeletonProps) {
  const [showSkeleton, setShowSkeleton] = React.useState(false)

  React.useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setShowSkeleton(true)
      }, delay)
      return () => clearTimeout(timer)
    } else {
      setShowSkeleton(false)
    }
  }, [loading, delay])

  if (showSkeleton) {
    return <NavigationSkeleton className={className} />
  }

  return <>{children}</>
}

export default NavigationSkeleton
