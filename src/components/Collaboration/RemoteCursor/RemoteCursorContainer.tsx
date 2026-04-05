'use client'

import { useRef, useEffect, useCallback } from 'react'
import { useRemoteCursors } from './useRemoteCursors'
import { RemoteCursorComponent as RemoteCursor } from './RemoteCursor'
import { WebSocketManager } from '@/lib/websocket-manager'

/**
 * RemoteCursorContainer 组件属性
 */
interface RemoteCursorContainerFunctionProps {
  /**
   * WebSocketManager 实例
   */
  wsManager: WebSocketManager
  /**
   * 内容区域引用
   * 用于计算鼠标位置相对坐标
   */
  contentRef: React.RefObject<HTMLElement>
  /**
   * 是否启用本地光标跟踪（默认：true）
   */
  trackLocalCursor?: boolean
  /**
   * 自定义样式类名
   */
  className?: string
}

/**
 * 性能配置
 */
const CURSOR_CONFIG = {
  RENDER_DISTANCE: 500, // 距离视口 500px 内才渲染
  MAX_VISIBLE_CURSORS: 20, // 最多同时显示 20 个光标
} as const

/**
 * RemoteCursorContainer 组件
 *
 * 容器组件，负责：
 * - 管理所有远程光标的渲染
 * - 跟踪本地鼠标位置并同步到服务器
 * - 优化光标渲染（只渲染可见区域内的光标）
 * - 处理鼠标进入/离开事件
 *
 * @example
 * ```tsx
 * <div ref={contentRef} className="relative">
 *   <RemoteCursorContainer wsManager={wsManager} contentRef={contentRef} />
 *   {/* 编辑器内容 *\/}
 * </div>
 * ```
 */
export function RemoteCursorContainerComponent({
  wsManager,
  contentRef,
  trackLocalCursor = true,
  className = '',
}: RemoteCursorContainerFunctionProps) {
  const { cursors, updateLocalCursor, leaveCursor } = useRemoteCursors(wsManager)
  const isTrackingRef = useRef(false)
  const isVisibleRef = useRef(true)

  /**
   * 处理鼠标移动事件
   * 计算相对于内容区域的坐标并发送到服务器
   */
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!trackLocalCursor || !contentRef.current || !isVisibleRef.current) {
        return
      }

      const rect = contentRef.current.getBoundingClientRect()

      // 计算相对坐标
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top

      // 检查是否在可视区域内
      if (
        x < -CURSOR_CONFIG.RENDER_DISTANCE ||
        x > rect.width + CURSOR_CONFIG.RENDER_DISTANCE ||
        y < -CURSOR_CONFIG.RENDER_DISTANCE ||
        y > rect.height + CURSOR_CONFIG.RENDER_DISTANCE
      ) {
        // 离开渲染区域，发送离开事件
        leaveCursor()
        isTrackingRef.current = false
        return
      }

      // 更新本地光标位置（节流）
      updateLocalCursor(x, y)
      isTrackingRef.current = true
    },
    [trackLocalCursor, contentRef, updateLocalCursor, leaveCursor]
  )

  /**
   * 处理鼠标离开事件
   * 发送光标离开事件到服务器
   */
  const handleMouseLeave = useCallback(() => {
    if (isTrackingRef.current) {
      leaveCursor()
      isTrackingRef.current = false
    }
  }, [leaveCursor])

  /**
   * 处理选中变化事件
   * 发送选区信息到服务器
   */
  const handleSelectionChange = useCallback(() => {
    if (!trackLocalCursor || !contentRef.current || !isVisibleRef.current) {
      return
    }

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      return
    }

    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const contentRect = contentRef.current.getBoundingClientRect()

    // 计算相对于内容区域的坐标
    const start = {
      x: rect.left - contentRect.left,
      y: rect.top - contentRect.top,
    }
    const end = {
      x: rect.right - contentRect.left,
      y: rect.bottom - contentRect.top,
    }

    // 更新本地光标和选区
    updateLocalCursor(start.x, start.y, { start, end })
  }, [trackLocalCursor, contentRef, updateLocalCursor])

  /**
   * 使用 Intersection Observer 监听可见性
   * 只有在可见时才跟踪鼠标
   */
  useEffect(() => {
    if (!contentRef.current) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting

        // 如果不可见，发送离开事件
        if (!entry.isIntersecting && isTrackingRef.current) {
          leaveCursor()
          isTrackingRef.current = false
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(contentRef.current)

    return () => {
      observer.disconnect()
    }
  }, [contentRef, leaveCursor])

  /**
   * 注册和注销事件监听器
   */
  useEffect(() => {
    if (!trackLocalCursor) {
      return
    }

    // 添加事件监听器
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('selectionchange', handleSelectionChange)

    // 组件卸载时发送离开事件
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('selectionchange', handleSelectionChange)

      if (isTrackingRef.current) {
        leaveCursor()
      }
    }
  }, [trackLocalCursor, handleMouseMove, handleMouseLeave, handleSelectionChange, leaveCursor])

  /**
   * 过滤可见光标
   * 只渲染距离视口一定范围内的光标，优化性能
   */
  const visibleCursors = cursors.slice(0, CURSOR_CONFIG.MAX_VISIBLE_CURSORS)

  return (
    <div
      className={`relative w-full h-full pointer-events-none ${className}`.trim()}
      role="presentation"
      aria-label="远程用户光标"
    >
      {visibleCursors.map(cursor => (
        <RemoteCursor key={cursor.userId} cursor={cursor} />
      ))}
    </div>
  )
}