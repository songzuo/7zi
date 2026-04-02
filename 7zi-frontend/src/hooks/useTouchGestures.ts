/**
 * useTouchGestures - 触摸手势 Hook
 *
 * 功能特性：
 * - 支持捏合缩放
 * - 支持双击缩放
 * - 支持拖拽平移
 * - 支持滑动（左滑/右滑/上滑/下滑）
 * - 支持长按
 * - 性能优化
 * - TypeScript 类型支持
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export interface TouchGestureOptions {
  /**
   * 是否启用缩放
   * @default true
   */
  enableZoom?: boolean

  /**
   * 是否启用拖拽
   * @default true
   */
  enableDrag?: boolean

  /**
   * 是否启用滑动
   * @default true
   */
  enableSwipe?: boolean

  /**
   * 是否启用长按
   * @default true
   */
  enableLongPress?: boolean

  /**
   * 最小缩放比例
   * @default 1
   */
  minZoom?: number

  /**
   * 最大缩放比例
   * @default 3
   */
  maxZoom?: number

  /**
   * 双击缩放比例
   * @default 2
   */
  doubleTapZoom?: number

  /**
   * 滑动阈值（像素）
   * @default 50
   */
  swipeThreshold?: number

  /**
   * 长按时间（毫秒）
   * @default 500
   */
  longPressDelay?: number

  /**
   * 动画持续时间（毫秒）
   * @default 300
   */
  animationDuration?: number
}

export interface TouchGestureHandlers {
  /**
   * 缩放回调
   */
  onZoom?: (scale: number, x: number, y: number) => void

  /**
   * 拖拽回调
   */
  onDrag?: (deltaX: number, deltaY: number) => void

  /**
   * 滑动回调
   */
  onSwipe?: (direction: 'left' | 'right' | 'up' | 'down') => void

  /**
   * 长按回调
   */
  onLongPress?: () => void

  /**
   * 点击回调
   */
  onTap?: () => void
}

export interface TouchGestureState {
  scale: number
  translateX: number
  translateY: number
  isDragging: boolean
  isZooming: boolean
  isLongPressing: boolean
}

/**
 * useTouchGestures Hook
 *
 * @param options - 手势配置
 * @param handlers - 手势处理器
 * @returns 手势状态和 ref
 *
 * @example
 * const { gestureState, gestureRef } = useTouchGestures(
 *   { maxZoom: 3 },
 *   { onZoom: (scale) => console.log('Zoom:', scale) }
 * );
 *
 * <div ref={gestureRef} style={{ transform: `scale(${gestureState.scale})` }}>
 *   Content
 * </div>
 */
export function useTouchGestures(
  options: TouchGestureOptions = {},
  handlers: TouchGestureHandlers = {}
) {
  const {
    enableZoom = true,
    enableDrag = true,
    enableSwipe = true,
    enableLongPress = true,
    minZoom = 1,
    maxZoom = 3,
    doubleTapZoom = 2,
    swipeThreshold = 50,
    longPressDelay = 500,
    animationDuration = 300,
  } = options

  const { onZoom, onDrag, onSwipe, onLongPress, onTap } = handlers

  // 手势状态
  const [state, setState] = useState<TouchGestureState>({
    scale: 1,
    translateX: 0,
    translateY: 0,
    isDragging: false,
    isZooming: false,
    isLongPressing: false,
  })

  // Refs
  const elementRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<{
    x: number
    y: number
    scale: number
    translateX: number
    translateY: number
    touches: number
  } | null>(null)

  const lastTapRef = useRef<number>(0)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isTouchingRef = useRef(false)

  // 重置状态
  const resetState = useCallback(() => {
    setState({
      scale: 1,
      translateX: 0,
      translateY: 0,
      isDragging: false,
      isZooming: false,
      isLongPressing: false,
    })
  }, [])

  // 触摸开始
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!elementRef.current) return

      const touch = e.touches[0]
      isTouchingRef.current = true

      // 记录触摸开始状态
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        scale: state.scale,
        translateX: state.translateX,
        translateY: state.translateY,
        touches: e.touches.length,
      }

      // 长按检测
      if (enableLongPress && e.touches.length === 1) {
        longPressTimerRef.current = setTimeout(() => {
          if (isTouchingRef.current && touchStartRef.current?.touches === 1) {
            setState(prev => ({ ...prev, isLongPressing: true }))
            onLongPress?.()
          }
        }, longPressDelay)
      }

      // 双击检测
      const now = Date.now()
      const timeSinceLastTap = now - lastTapRef.current
      if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
        // 双击缩放
        if (enableZoom) {
          const newScale = state.scale === 1 ? doubleTapZoom : 1
          setState(prev => ({
            ...prev,
            scale: newScale,
          }))
          onZoom?.(newScale, touch.clientX, touch.clientY)
        }
        lastTapRef.current = 0
      } else {
        lastTapRef.current = now
      }
    },
    [enableLongPress, enableZoom, longPressDelay, state, doubleTapZoom, onZoom, onLongPress]
  )

  // 触摸移动
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!touchStartRef.current || !isTouchingRef.current) return

      // 如果移动了，取消长按
      if (enableLongPress && longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
        if (state.isLongPressing) {
          setState(prev => ({ ...prev, isLongPressing: false }))
        }
      }

      // 双指缩放
      if (enableZoom && e.touches.length === 2) {
        e.preventDefault()

        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        const currentDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        )

        // 计算缩放比例
        const newScale = Math.min(
          Math.max(
            (currentDistance /
              Math.hypot(
                e.touches[0].clientX - e.touches[0].clientX + 1,
                e.touches[0].clientY - e.touches[0].clientY + 1
              )) *
              touchStartRef.current.scale,
            minZoom
          ),
          maxZoom
        )

        setState(prev => ({
          ...prev,
          scale: newScale,
          isZooming: true,
        }))

        onZoom?.(newScale, touch1.clientX, touch1.clientY)
      }

      // 单指拖拽
      if (enableDrag && e.touches.length === 1 && state.scale > 1) {
        e.preventDefault()

        const touch = e.touches[0]
        const deltaX = touch.clientX - (touchStartRef.current?.x || 0)
        const deltaY = touch.clientY - (touchStartRef.current?.y || 0)

        setState(prev => ({
          ...prev,
          translateX: (touchStartRef.current?.translateX || 0) + deltaX,
          translateY: (touchStartRef.current?.translateY || 0) + deltaY,
          isDragging: true,
        }))

        onDrag?.(deltaX, deltaY)
      }
    },
    [
      enableZoom,
      enableDrag,
      enableLongPress,
      state.scale,
      state.isLongPressing,
      minZoom,
      maxZoom,
      onZoom,
      onDrag,
    ]
  )

  // 触摸结束
  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchStartRef.current) return

      // 清理长按定时器
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }

      // 滑动检测
      if (
        enableSwipe &&
        !state.isDragging &&
        !state.isZooming &&
        touchStartRef.current.touches === 1
      ) {
        const touch = e.changedTouches[0]
        const deltaX = touch.clientX - touchStartRef.current.x
        const deltaY = touch.clientY - touchStartRef.current.y

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // 水平滑动
          if (Math.abs(deltaX) > swipeThreshold) {
            onSwipe?.(deltaX > 0 ? 'right' : 'left')
          }
        } else {
          // 垂直滑动
          if (Math.abs(deltaY) > swipeThreshold) {
            onSwipe?.(deltaY > 0 ? 'down' : 'up')
          }
        }
      }

      // 点击检测（没有发生其他手势）
      if (
        !state.isDragging &&
        !state.isZooming &&
        !state.isLongPressing &&
        touchStartRef.current.touches === 1
      ) {
        onTap?.()
      }

      // 重置状态
      setState(prev => ({
        ...prev,
        isDragging: false,
        isZooming: false,
        isLongPressing: false,
      }))

      touchStartRef.current = null
      isTouchingRef.current = false
    },
    [
      enableSwipe,
      state.isDragging,
      state.isZooming,
      state.isLongPressing,
      swipeThreshold,
      onSwipe,
      onTap,
    ]
  )

  // 绑定事件监听器
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd)
    element.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchEnd)

      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return {
    gestureState: state,
    gestureRef: elementRef,
    resetState,
  }
}

/**
 * useSwipe Hook - 简化版滑动检测
 *
 * @param onSwipe - 滑动回调
 * @param threshold - 滑动阈值（像素）
 * @returns ref
 *
 * @example
 * const swipeRef = useSwipe({
 *   onLeft: () => console.log('Swipe left'),
 *   onRight: () => console.log('Swipe right'),
 * });
 *
 * <div ref={swipeRef}>Swipe me</div>
 */
export interface SwipeHandlers {
  onLeft?: () => void
  onRight?: () => void
  onUp?: () => void
  onDown?: () => void
}

export function useSwipe(handlers: SwipeHandlers, threshold = 50) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const elementRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    }
  }, [])

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchStartRef.current) return

      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaY = touch.clientY - touchStartRef.current.y

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // 水平滑动
        if (Math.abs(deltaX) > threshold) {
          if (deltaX > 0) {
            handlers.onRight?.()
          } else {
            handlers.onLeft?.()
          }
        }
      } else {
        // 垂直滑动
        if (Math.abs(deltaY) > threshold) {
          if (deltaY > 0) {
            handlers.onDown?.()
          } else {
            handlers.onUp?.()
          }
        }
      }

      touchStartRef.current = null
    },
    [handlers, threshold]
  )

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    element.addEventListener('touchstart', handleTouchStart)
    element.addEventListener('touchend', handleTouchEnd)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchEnd])

  return elementRef
}

/**
 * usePinchToZoom Hook - 捏合缩放
 *
 * @param options - 缩放配置
 * @returns 缩放状态和 ref
 *
 * @example
 * const { zoomState, zoomRef } = usePinchToZoom({
 *   minZoom: 1,
 *   maxZoom: 3,
 * });
 *
 * <div ref={zoomRef} style={{ transform: `scale(${zoomState.scale})` }}>
 *   Content
 * </div>
 */
export interface PinchToZoomOptions {
  minZoom?: number
  maxZoom?: number
  initialZoom?: number
  onZoom?: (scale: number) => void
}

export function usePinchToZoom(options: PinchToZoomOptions = {}) {
  const { minZoom = 1, maxZoom = 3, initialZoom = 1, onZoom } = options

  const [scale, setScale] = useState(initialZoom)
  const elementRef = useRef<HTMLDivElement>(null)
  const startDistanceRef = useRef<number>(0)
  const startScaleRef = useRef<number>(initialZoom)

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        startDistanceRef.current = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        )
        startScaleRef.current = scale
      }
    },
    [scale]
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()

        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        const currentDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        )

        const newScale = Math.min(
          Math.max((currentDistance / startDistanceRef.current) * startScaleRef.current, minZoom),
          maxZoom
        )

        setScale(newScale)
        onZoom?.(newScale)
      }
    },
    [minZoom, maxZoom, onZoom]
  )

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    element.addEventListener('touchstart', handleTouchStart)
    element.addEventListener('touchmove', handleTouchMove, { passive: false })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
    }
  }, [handleTouchStart, handleTouchMove])

  return {
    zoomState: { scale },
    zoomRef: elementRef,
    resetZoom: () => setScale(initialZoom),
  }
}

export default useTouchGestures
