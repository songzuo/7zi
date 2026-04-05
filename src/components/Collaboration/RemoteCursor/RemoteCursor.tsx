'use client'

import { useMemo } from 'react'
import { RemoteCursor as RemoteCursorType } from './useRemoteCursors'

/**
 * RemoteCursor 组件属性
 */
interface RemoteCursorProps {
  cursor: RemoteCursorType
  /**
   * 是否显示动画（默认：true）
   */
  animate?: boolean
  /**
   * 自定义样式类名
   */
  className?: string
}

/**
 * 光标 SVG 图标
 * 使用指针形状，白色描边提高对比度
 */
const CURSOR_SVG = (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-6 h-6 drop-shadow-md"
    aria-hidden="true"
  >
    <path
      d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.88a.5.5 0 0 0-.85.33Z"
      fill="currentColor"
      stroke="white"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
)

/**
 * RemoteCursor 组件
 *
 * 渲染单个远程用户光标，包括：
 * - 光标图标（SVG）
 * - 用户名标签（带背景色）
 * - 选区高亮（可选）
 *
 * 性能优化：
 * - 使用 CSS transition 实现平滑移动
 * - pointer-events-none 避免阻塞本地交互
 * - 使用 useMemo 优化重复渲染
 */
export function RemoteCursorComponentComponent({ cursor, animate = true, className = '' }: RemoteCursorProps) {
  /**
   * 动态样式
   * 根据用户颜色和位置动态生成
   */
  const cursorStyle = useMemo(
    () => ({
      left: cursor.position.x,
      top: cursor.position.y,
      color: cursor.userColor,
    }),
    [cursor.position.x, cursor.position.y, cursor.userColor]
  )

  const labelStyle = useMemo(
    () => ({
      backgroundColor: cursor.userColor,
    }),
    [cursor.userColor]
  )

  const selectionStyle = useMemo(() => {
    if (!cursor.selection) {
      return {}
    }

    return {
      left: Math.min(cursor.selection.start.x, cursor.selection.end.x),
      top: Math.min(cursor.selection.start.y, cursor.selection.end.y),
      width: Math.abs(cursor.selection.end.x - cursor.selection.start.x),
      height: Math.abs(cursor.selection.end.y - cursor.selection.start.y),
      backgroundColor: cursor.userColor,
      opacity: '0.2' as const,
    }
  }, [cursor.selection, cursor.userColor])

  /**
   * 过渡样式
   * 仅在启用动画时添加 transition
   */
  const transitionClass = animate ? 'transition-all duration-100 ease-out' : ''

  return (
    <>
      {/* 光标 */}
      <div
        className={`cursor-container absolute pointer-events-none z-50 ${transitionClass} ${className}`.trim()}
        style={cursorStyle}
        role="img"
        aria-label={`${cursor.userName} 的光标`}
      >
        {/* 光标图标 */}
        <div className="cursor-icon" aria-hidden="true">
          {CURSOR_SVG}
        </div>

        {/* 用户名标签 */}
        <div
          className="cursor-label absolute -top-7 left-0 px-2 py-1 text-xs font-medium text-white rounded-md shadow-lg whitespace-nowrap pointer-events-none"
          style={labelStyle}
          aria-hidden="true"
        >
          {cursor.userName}
        </div>
      </div>

      {/* 选区高亮 */}
      {cursor.selection && (
        <div
          className={`selection-highlight absolute pointer-events-none z-40 ${transitionClass}`}
          style={selectionStyle}
          role="presentation"
          aria-label={`${cursor.userName} 的选区`}
        />
      )}
    </>
  )
}