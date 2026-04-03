/**
 * CursorOverlay Component
 *
 * Renders all remote cursors as an overlay
 * Positioned absolutely over the content area
 */

'use client'

import { memo, useMemo } from 'react'
import type { CursorState } from '../types'
import { RemoteCursor } from './RemoteCursor'

/**
 * CursorOverlay props
 */
export interface CursorOverlayProps {
  /** Remote cursors map (userId -> CursorState) */
  cursors: Map<string, CursorState>
  /** Show user names */
  showNames?: boolean
  /** Animation duration in ms */
  animationDuration?: number
  /** CSS class for container */
  className?: string
}

/**
 * CursorOverlay Component
 *
 * Renders a layer with all remote cursors
 */
export const CursorOverlay = memo(function CursorOverlay({
  cursors,
  showNames = true,
  animationDuration = 150,
  className = '',
}: CursorOverlayProps) {
  // Memoize cursor elements array
  const cursorElements = useMemo(() => {
    const elements: Array<{ userId: string; cursor: CursorState }> = []

    cursors.forEach((cursor, userId) => {
      // Skip cursors without valid position
      if (cursor.cursor.x === undefined || cursor.cursor.y === undefined) {
        return
      }

      elements.push({ userId, cursor })
    })

    return elements
  }, [cursors])

  if (cursorElements.length === 0) {
    return null
  }

  return (
    <div
      className={`cursor-overlay ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 9998,
      }}
    >
      {cursorElements.map(({ userId, cursor }) => (
        <RemoteCursor
          key={userId}
          cursor={cursor}
          showName={showNames}
          animationDuration={animationDuration}
        />
      ))}
    </div>
  )
})

export default CursorOverlay
