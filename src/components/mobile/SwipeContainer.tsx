/**
 * 滑动容器组件
 *
 * 功能:
 * - 水平滑动支持
 * - 触摸反馈
 * - 滑动锁定
 * - 阻尼滚动
 */

'use client'

import React, { useRef, useEffect, useCallback, useState, ReactNode } from 'react'

interface SwipeContainerProps {
  children: ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  className?: string
  enableSwipe?: boolean
  swipeThreshold?: number
}

export const SwipeContainer: React.FC<SwipeContainerProps> = React.memo(({
  children,
  onSwipeLeft,
  onSwipeRight,
  className = '',
  enableSwipe = true,
  swipeThreshold = 50,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const isHorizontalSwipe = useRef(false)

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enableSwipe) return

      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
      isHorizontalSwipe.current = false
    },
    [enableSwipe]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enableSwipe) return

      const deltaX = Math.abs(e.touches[0].clientX - touchStartX.current)
      const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current)

      // 判断是否为水平滑动
      if (deltaX > deltaY && deltaX > 10) {
        isHorizontalSwipe.current = true
      }
    },
    [enableSwipe]
  )

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!enableSwipe || !isHorizontalSwipe.current) return

      const deltaX = e.changedTouches[0].clientX - touchStartX.current

      // 触发滑动事件
      if (Math.abs(deltaX) > swipeThreshold) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight()
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft()
        }
      }
    },
    [enableSwipe, swipeThreshold, onSwipeLeft, onSwipeRight]
  )

  // 阻止默认滚动行为（仅在水平滑动时）
  const handleTouchMoveCapture = useCallback(
    (e: React.TouchEvent) => {
      if (!enableSwipe || !isHorizontalSwipe.current) return

      const deltaX = Math.abs(e.touches[0].clientX - touchStartX.current)
      const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current)

      // 如果是明显的水平滑动，阻止垂直滚动
      if (deltaX > deltaY && deltaX > 10) {
        e.preventDefault()
      }
    },
    [enableSwipe]
  )

  return (
    <div
      ref={containerRef}
      className={`touch-pan-y ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchMoveCapture={handleTouchMoveCapture}
      onTouchEnd={handleTouchEnd}
      style={{
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {children}
    </div>
  )
})

/**
 * 水平滚动容器
 *
 * 功能:
 * - 隐藏滚动条
 * - 触摸友好的水平滚动
 * - 鼠标滚轮支持
 */
interface HorizontalScrollProps {
  children: ReactNode
  className?: string
  showScrollbar?: boolean
}

export const HorizontalScroll: React.FC<HorizontalScrollProps> = React.memo(({
  children,
  className = '',
  showScrollbar = false,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // 鼠标滚轮转水平滚动
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!scrollContainerRef.current) return

    const delta = e.deltaY
    scrollContainerRef.current.scrollLeft += delta
  }, [])

  return (
    <div
      ref={scrollContainerRef}
      className={`overflow-x-auto ${showScrollbar ? '' : 'hide-scrollbar'} ${className} `}
      onWheel={handleWheel}
      style={{
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
      }}
    >
      {children}
    </div>
  )
})

/**
 * 下拉刷新容器
 *
 * 功能:
 * - 下拉刷新
 * - 加载状态
 * - 刷新回调
 */
interface PullToRefreshProps {
  children: ReactNode
  onRefresh: () => Promise<void>
  isRefreshing?: boolean
  refreshThreshold?: number
}

export const PullToRefresh: React.FC<PullToRefreshProps> = React.memo(({
  children,
  onRefresh,
  isRefreshing = false,
  refreshThreshold = 80,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const touchStartY = useRef(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY
      setIsPulling(true)
    }
  }, [])

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling || isRefreshing) return

      const currentY = e.touches[0].clientY
      const deltaY = currentY - touchStartY.current

      // 计算拉取距离（带阻尼效果）
      const distance = deltaY > 0 ? deltaY * 0.5 : 0
      setPullDistance(Math.min(distance, refreshThreshold * 1.5))
    },
    [isPulling, isRefreshing, refreshThreshold]
  )

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return

    setIsPulling(false)

    // 如果拉取距离超过阈值，触发刷新
    if (pullDistance >= refreshThreshold) {
      await onRefresh()
    }

    setPullDistance(0)
  }, [isPulling, pullDistance, refreshThreshold, onRefresh])

  // 检测刷新完成
  useEffect(() => {
    if (!isRefreshing && pullDistance > 0) {
      setPullDistance(0)
    }
  }, [isRefreshing, pullDistance])

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 刷新指示器 */}
      <div
        className="absolute right-0 left-0 flex items-center justify-center transition-transform duration-300 ease-out"
        style={{
          transform: `translateY(${-50 + pullDistance * 0.5}px)`,
          height: refreshThreshold,
        }}
      >
        {isRefreshing ? (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        ) : (
          <svg
            className={`h-6 w-6 text-cyan-500 transition-transform duration-300 ${
              pullDistance >= refreshThreshold ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        )}
      </div>

      {/* 内容区域 */}
      <div
        className="transition-transform duration-300 ease-out"
        style={{
          transform: `translateY(${Math.min(pullDistance, refreshThreshold)}px)`,
        }}
      >
        {children}
      </div>
    </div>
  )
})
