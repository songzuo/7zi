'use client'

/**
 * 移动端触摸优化组件
 * 增强触摸反馈、防止双击缩放、优化滚动体验
 *
 * @version 1.13.0
 * @date 2026-04-05
 */

import { useRef, useEffect, useState, ReactNode, CSSProperties } from 'react'
import clsx from 'clsx'

// ============================================
// Touchable 组件
// 增强的可触摸元素，提供视觉反馈
// ============================================

export interface TouchableProps {
  /** 子元素 */
  children: ReactNode
  /** 点击事件 */
  onPress?: () => void
  /** 长按事件 */
  onLongPress?: () => void
  /** 是否禁用 */
  disabled?: boolean
  /** 是否激活状态 */
  active?: boolean
  /** 自定义类名 */
  className?: string
  /** 触摸反馈类型 */
  feedbackType?: 'opacity' | 'scale' | 'ripple' | 'none'
  /** 长按延迟时间 (ms) */
  longPressDelay?: number
  /** 是否防止双击缩放 */
  noDoubleTapZoom?: boolean
  /** 样式 */
  style?: CSSProperties
}

export function Touchable({
  children,
  onPress,
  onLongPress,
  disabled = false,
  active = false,
  className,
  feedbackType = 'scale',
  longPressDelay = 500,
  noDoubleTapZoom = true,
  style,
}: TouchableProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const isPressedRef = useRef(false)

  // 处理触摸开始
  const handleTouchStart = () => {
    if (disabled) return
    isPressedRef.current = true

    // 长按检测
    if (onLongPress) {
      timeoutRef.current = setTimeout(() => {
        if (isPressedRef.current) {
          onLongPress()
          isPressedRef.current = false
        }
      }, longPressDelay)
    }

    // 应用触摸反馈
    if (elementRef.current) {
      elementRef.current.classList.add('touchable-active')
    }
  }

  // 处理触摸结束
  const handleTouchEnd = () => {
    if (disabled) return

    // 清除长按定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // 触发点击事件
    if (isPressedRef.current && onPress) {
      onPress()
    }

    isPressedRef.current = false

    // 移除触摸反馈
    if (elementRef.current) {
      elementRef.current.classList.remove('touchable-active')
    }
  }

  // 处理触摸取消
  const handleTouchCancel = () => {
    if (disabled) return

    // 清除长按定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    isPressedRef.current = false

    // 移除触摸反馈
    if (elementRef.current) {
      elementRef.current.classList.remove('touchable-active')
    }
  }

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const feedbackClasses = {
    opacity: 'active:opacity-70',
    scale: 'active:scale-[0.97]',
    ripple: 'ripple-effect',
    none: '',
  }

  return (
    <div
      ref={elementRef}
      className={clsx(
        'touchable',
        // 触控区域最小尺寸
        'min-w-[44px] min-h-[44px]',
        // 防止双击缩放
        noDoubleTapZoom && 'touch-manipulation',
        // 触摸反馈
        feedbackClasses[feedbackType],
        // 过渡动画
        'transition-transform duration-100 ease-out',
        // 禁用状态
        disabled && 'opacity-50 cursor-not-allowed',
        // 激活状态
        active && 'bg-blue-50 dark:bg-blue-900/20',
        className
      )}
      style={style}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onClick={onPress && !disabled ? onPress : undefined}
    >
      {children}
    </div>
  )
}

// ============================================
// Swipeable 组件
// 支持滑动手势的容器
// ============================================

export interface SwipeableProps {
  children: ReactNode
  /** 向左滑动 */
  onSwipeLeft?: () => void
  /** 向右滑动 */
  onSwipeRight?: () => void
  /** 向上滑动 */
  onSwipeUp?: () => void
  /** 向下滑动 */
  onSwipeDown?: () => void
  /** 最小滑动距离 */
  minSwipeDistance?: number
  /** 自定义类名 */
  className?: string
  /** 样式 */
  style?: CSSProperties
}

export function Swipeable({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  minSwipeDistance = 50,
  className,
  style,
}: SwipeableProps) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y

    // 检测水平滑动
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > minSwipeDistance) {
        onSwipeRight?.()
      } else if (deltaX < -minSwipeDistance) {
        onSwipeLeft?.()
      }
    }
    // 检测垂直滑动
    else {
      if (deltaY > minSwipeDistance) {
        onSwipeDown?.()
      } else if (deltaY < -minSwipeDistance) {
        onSwipeUp?.()
      }
    }

    touchStartRef.current = null
  }

  return (
    <div
      className={clsx('swipeable', className)}
      style={style}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  )
}

// ============================================
// PullToRefresh 组件
// 下拉刷新组件
// ============================================

export interface PullToRefreshProps {
  children: ReactNode
  /** 刷新回调 */
  onRefresh: () => Promise<void>
  /** 是否正在刷新 */
  refreshing?: boolean
  /** 最小拉动距离 */
  threshold?: number
  /** 自定义类名 */
  className?: string
}

export function PullToRefresh({
  children,
  onRefresh,
  refreshing = false,
  threshold = 80,
  className,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef(0)
  const currentYRef = useRef(0)
  const isDraggingRef = useRef(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(refreshing)

  // 监听外部 refreshing 状态
  useEffect(() => {
    setIsRefreshing(refreshing)
  }, [refreshing])

  const handleTouchStart = (e: React.TouchEvent) => {
    const container = containerRef.current
    if (!container || container.scrollTop > 0 || isRefreshing) return

    startYRef.current = e.touches[0].clientY
    isDraggingRef.current = false
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isRefreshing) return

    const container = containerRef.current
    if (!container || container.scrollTop > 0) return

    const currentY = e.touches[0].clientY
    const deltaY = currentY - startYRef.current

    // 只响应向下拉动
    if (deltaY > 0) {
      isDraggingRef.current = true
      // 使用阻尼效果
      const dampedDelta = Math.min(deltaY * 0.5, threshold * 1.5)
      currentYRef.current = dampedDelta
      setPullDistance(dampedDelta)
      e.preventDefault()
    }
  }

  const handleTouchEnd = async () => {
    if (!isDraggingRef.current) return

    isDraggingRef.current = false

    // 如果拉动距离超过阈值，触发刷新
    if (currentYRef.current >= threshold) {
      setIsRefreshing(true)
      setPullDistance(threshold)

      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }

    // 重置拉动距离
    setPullDistance(0)
  }

  return (
    <div
      ref={containerRef}
      className={clsx('pull-to-refresh relative overflow-hidden', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 刷新指示器 */}
      <div
        className={clsx(
          'absolute left-0 right-0 top-0 z-10',
          'flex items-center justify-center',
          'bg-blue-50 dark:bg-blue-900/20',
          'transition-transform duration-200 ease-out',
          isRefreshing ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{
          transform: `translateY(${isRefreshing ? 0 : pullDistance - threshold}px)`,
          height: `${Math.max(0, pullDistance)}px`,
        }}
      >
        <div className="flex items-center gap-2">
          {isRefreshing ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          ) : (
            <svg
              className={clsx(
                'h-5 w-5 text-blue-600 transition-transform',
                pullDistance >= threshold && 'rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          )}
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {isRefreshing ? '刷新中...' : pullDistance >= threshold ? '释放刷新' : '下拉刷新'}
          </span>
        </div>
      </div>

      {/* 内容区域 */}
      <div
        className={clsx(
          'transition-transform duration-200',
          isRefreshing && 'translate-y-16'
        )}
      >
        {children}
      </div>
    </div>
  )
}

// ============================================
// ScrollLock 组件
// 锁定/解锁滚动（用于模态框等）
// ============================================

export interface ScrollLockProps {
  /** 是否锁定 */
  locked: boolean
  /** 子元素 */
  children: ReactNode
}

export function ScrollLock({ locked, children }: ScrollLockProps) {
  useEffect(() => {
    const body = document.body

    if (locked) {
      // 保存当前滚动位置
      const scrollY = window.scrollY
      body.style.overflow = 'hidden'
      body.style.position = 'fixed'
      body.style.top = `-${scrollY}px`
      body.style.width = '100%'

      return () => {
        // 恢复滚动位置
        body.style.overflow = ''
        body.style.position = ''
        body.style.top = ''
        body.style.width = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [locked])

  return <>{children}</>
}

// ============================================
// CSS 样式注入
// ============================================

export function MobileTouchStyles() {
  return (
    <style jsx global>{`
      .touchable {
        user-select: none;
        -webkit-user-select: none;
        -webkit-tap-highlight-color: transparent;
      }

      .touchable-active {
        opacity: 0.7;
      }

      .ripple-effect {
        position: relative;
        overflow: hidden;
      }

      .ripple-effect::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.1);
        transform: translate(-50%, -50%);
        transition: width 0.3s, height 0.3s;
      }

      .ripple-effect:active::after {
        width: 200px;
        height: 200px;
      }

      .touch-manipulation {
        touch-action: manipulation;
      }

      /* 移动端滚动优化 */
      @media (pointer: coarse) {
        * {
          -webkit-overflow-scrolling: touch;
        }

        html,
        body {
          overscroll-behavior-y: contain;
        }
      }
    `}</style>
  )
}

export default Touchable
