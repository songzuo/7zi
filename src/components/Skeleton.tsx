/**
 * @fileoverview 骨架屏组件
 * @description 用于数据加载时的占位符，提升感知性能
 */

'use client'

import React, { memo } from 'react'

// ============================================================================
// 基础骨架元素
// ============================================================================

interface SkeletonBaseProps {
  className?: string
  animate?: boolean
}

const SkeletonBase: React.FC<SkeletonBaseProps> = memo(({ className = '', animate = true }) => {
  return (
    <div
      className={`rounded bg-zinc-200 dark:bg-zinc-700 ${animate ? 'animate-pulse' : ''} ${className} `}
      aria-hidden="true"
    />
  )
})

SkeletonBase.displayName = 'SkeletonBase'

export { SkeletonBase }

// ============================================================================
// 文本骨架
// ============================================================================

interface SkeletonTextProps {
  lines?: number
  className?: string
  lastLineWidth?: string
}

export const SkeletonText: React.FC<SkeletonTextProps> = memo(
  ({ lines = 1, className = '', lastLineWidth = '60%' }) => {
    if (lines === 1) {
      return <SkeletonBase className={`h-4 w-full ${className}`} />
    }

    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBase key={i} className={`h-4 ${i === lines - 1 ? lastLineWidth : 'w-full'}`} />
        ))}
      </div>
    )
  }
)

SkeletonText.displayName = 'SkeletonText'

// ============================================================================
// 头像骨架
// ============================================================================

interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = memo(
  ({ size = 'md', className = '' }) => {
    const sizeClasses = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
      xl: 'w-16 h-16',
    }

    return <SkeletonBase className={`${sizeClasses[size]} rounded-full ${className}`} />
  }
)

SkeletonAvatar.displayName = 'SkeletonAvatar'

// ============================================================================
// 卡片骨架
// ============================================================================

interface SkeletonCardProps {
  showAvatar?: boolean
  lines?: number
  className?: string
}

export const SkeletonCard: React.FC<SkeletonCardProps> = memo(
  ({ showAvatar = true, lines = 3, className = '' }) => {
    return (
      <div
        className={`rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800 ${className} `}
      >
        {showAvatar && (
          <div className="mb-4 flex items-center gap-3">
            <SkeletonAvatar size="md" />
            <div className="flex-1 space-y-2">
              <SkeletonBase className="h-4 w-1/3" />
              <SkeletonBase className="h-3 w-1/2" />
            </div>
          </div>
        )}
        <SkeletonText lines={lines} lastLineWidth="40%" />
      </div>
    )
  }
)

SkeletonCard.displayName = 'SkeletonCard'

// ============================================================================
// 列表骨架
// ============================================================================

interface SkeletonListProps {
  items?: number
  showAvatar?: boolean
  className?: string
}

export const SkeletonList: React.FC<SkeletonListProps> = memo(
  ({ items = 3, showAvatar = true, className = '' }) => {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: items }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
          >
            {showAvatar && <SkeletonAvatar size="sm" />}
            <div className="flex-1 space-y-2">
              <SkeletonBase className="h-4 w-3/4" />
              <SkeletonBase className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }
)

SkeletonList.displayName = 'SkeletonList'

// ============================================================================
// 表格骨架
// ============================================================================

interface SkeletonTableProps {
  rows?: number
  columns?: number
  className?: string
}

export const SkeletonTable: React.FC<SkeletonTableProps> = memo(
  ({ rows = 5, columns = 4, className = '' }) => {
    return (
      <div
        className={`overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700 ${className}`}
      >
        {/* 表头 */}
        <div className="flex gap-4 border-b border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
          {Array.from({ length: columns }).map((_, i) => (
            <SkeletonBase key={i} className="h-4 flex-1" />
          ))}
        </div>
        {/* 表格内容 */}
        <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex gap-4 p-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <SkeletonBase
                  key={colIndex}
                  className={`h-4 flex-1 ${colIndex === 0 ? 'w-1/4' : ''}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }
)

SkeletonTable.displayName = 'SkeletonTable'

// ============================================================================
// 统计卡片骨架
// ============================================================================

interface SkeletonStatCardProps {
  className?: string
}

export const SkeletonStatCard: React.FC<SkeletonStatCardProps> = memo(({ className = '' }) => {
  return (
    <div className={`rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-800 ${className} `}>
      <SkeletonBase className="mb-3 h-4 w-1/2" />
      <SkeletonBase className="mb-2 h-8 w-3/4" />
      <SkeletonBase className="h-3 w-1/3" />
    </div>
  )
})

SkeletonStatCard.displayName = 'SkeletonStatCard'

// ============================================================================
// 导航骨架
// ============================================================================

interface SkeletonNavProps {
  items?: number
  className?: string
}

export const SkeletonNav: React.FC<SkeletonNavProps> = memo(({ items = 5, className = '' }) => {
  return (
    <nav className={`flex items-center gap-2 ${className}`}>
      {/* Logo */}
      <SkeletonBase className="h-6 w-24 rounded" />
      {/* 导航项 */}
      <div className="ml-auto flex items-center gap-1">
        {Array.from({ length: items }).map((_, i) => (
          <SkeletonBase key={i} className="h-8 w-16 rounded-lg" />
        ))}
      </div>
    </nav>
  )
})

SkeletonNav.displayName = 'SkeletonNav'

// ============================================================================
// 页面骨架（全页面加载）
// ============================================================================

interface SkeletonPageProps {
  showNav?: boolean
  showFooter?: boolean
  className?: string
}

export const SkeletonPage: React.FC<SkeletonPageProps> = memo(
  ({ showNav = true, showFooter = true, className = '' }) => {
    return (
      <div className={`min-h-screen bg-zinc-50 dark:bg-zinc-900 ${className}`}>
        {showNav && (
          <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
            <SkeletonNav items={4} />
          </header>
        )}

        <main className="mx-auto max-w-7xl px-4 py-8">
          {/* Hero 区域 */}
          <div className="mb-12 text-center">
            <SkeletonBase className="mx-auto mb-4 h-12 w-3/4 rounded" />
            <SkeletonBase className="mx-auto mb-6 h-6 w-1/2 rounded" />
            <div className="flex justify-center gap-4">
              <SkeletonBase className="h-12 w-32 rounded-full" />
              <SkeletonBase className="h-12 w-32 rounded-full" />
            </div>
          </div>

          {/* 内容区域 */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <SkeletonCard showAvatar lines={4} />
            <SkeletonCard showAvatar lines={4} />
            <SkeletonCard showAvatar lines={4} />
          </div>
        </main>

        {showFooter && (
          <footer className="mt-auto bg-zinc-900 p-8">
            <div className="mx-auto max-w-7xl">
              <SkeletonText lines={2} className="max-w-md" />
            </div>
          </footer>
        )}
      </div>
    )
  }
)

SkeletonPage.displayName = 'SkeletonPage'

// ============================================================================
// 统一导出
// ============================================================================

const SkeletonComponents = {
  Text: SkeletonText,
  Avatar: SkeletonAvatar,
  Card: SkeletonCard,
  List: SkeletonList,
  Table: SkeletonTable,
  StatCard: SkeletonStatCard,
  Nav: SkeletonNav,
  Page: SkeletonPage,
}

export default SkeletonComponents
