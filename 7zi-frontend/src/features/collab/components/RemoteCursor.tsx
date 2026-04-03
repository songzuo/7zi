/**
 * RemoteCursor Component
 *
 * Renders a remote user's cursor with name label
 * Animates cursor movement smoothly
 */

'use client'

import { memo, useMemo } from 'react'
import type { CursorState } from '../types'

/**
 * RemoteCursor props
 */
export interface RemoteCursorProps {
  /** Cursor state from collaboration */
  cursor: CursorState
  /** Show user name label */
  showName?: boolean
  /** Animation duration in ms */
  animationDuration?: number
  /** Custom class name */
  className?: string
}

/**
 * RemoteCursor Component
 */
export const RemoteCursor = memo(function RemoteCursor({
  cursor,
  showName = true,
  animationDuration = 150,
  className = '',
}: RemoteCursorProps) {
  const { cursor: position, user } = cursor

  // Memoized cursor SVG style
  const cursorStyle = useMemo(() => ({
    position: 'absolute' as const,
    left: position.x,
    top: position.y,
    pointerEvents: 'none' as const,
    zIndex: 9999,
    transition: `left ${animationDuration}ms ease-out, top ${animationDuration}ms ease-out`,
    transform: 'translate(-2px, -2px)',
  }), [position.x, position.y, animationDuration])

  // Memoized label style
  const labelStyle = useMemo(() => ({
    position: 'absolute' as const,
    left: position.x + 16,
    top: position.y,
    backgroundColor: user.color,
    color: '#fff',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
    whiteSpace: 'nowrap' as const,
    pointerEvents: 'none' as const,
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    transition: `left ${animationDuration}ms ease-out, top ${animationDuration}ms ease-out`,
    transform: 'translateY(-100%)',
    marginTop: '-4px',
  }), [position.x, position.y, user.color, animationDuration])

  return (
    <div className={`remote-cursor ${className}`} style={cursorStyle}>
      {/* Cursor pointer SVG */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        style={{ display: 'block' }}
      >
        <path
          d="M0 0L16 12.5L8.5 14.5L5.5 16L3.5 13L0 0Z"
          fill={user.color}
          stroke="#fff"
          strokeWidth="1"
        />
      </svg>

      {/* User name label */}
      {showName && (
        <div style={labelStyle} className="remote-cursor-label">
          {user.name}
        </div>
      )}
    </div>
  )
})

export default RemoteCursor
