/**
 * Cursor Sync Unit Tests
 *
 * @version 1.12.3
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CollaborationCursorSync } from '../cursor-sync'
import type { CursorPosition, CollabUser } from '@/features/collab/types'

describe('CollaborationCursorSync', () => {
  let cursorSync: CollaborationCursorSync
  const mockUser: CollabUser = {
    id: 'user-1',
    name: 'Test User',
    color: '#FF5733',
    isOnline: true,
    lastActivity: Date.now(),
  }

  beforeEach(() => {
    cursorSync = new CollaborationCursorSync(mockUser, {
      throttleMs: 50,
      debug: true,
    })
  })

  afterEach(() => {
    cursorSync.destroy()
  })

  describe('Constructor', () => {
    it('should initialize with default options', () => {
      const sync = new CollaborationCursorSync(mockUser)
      expect(sync).toBeDefined()
      sync.destroy()
    })

    it('should initialize with custom options', () => {
      expect(cursorSync).toBeDefined()
    })
  })

  describe('startTracking', () => {
    it('should start tracking with send callback', () => {
      const sendFn = vi.fn().mockReturnValue(true)
      cursorSync.startTracking(sendFn)

      const state = cursorSync.getState()
      expect(state.isTracking).toBe(true)
    })
  })

  describe('stopTracking', () => {
    it('should stop tracking', () => {
      const sendFn = vi.fn().mockReturnValue(true)
      cursorSync.startTracking(sendFn)
      cursorSync.stopTracking()

      const state = cursorSync.getState()
      expect(state.isTracking).toBe(false)
    })
  })

  describe('updateLocalCursor', () => {
    it('should update local cursor position', () => {
      const sendFn = vi.fn().mockReturnValue(true)
      cursorSync.startTracking(sendFn)

      const position: CursorPosition = { x: 100, y: 200 }
      cursorSync.updateLocalCursor(position)

      const state = cursorSync.getState()
      expect(state.localCursor).toEqual(position)
    })

    it('should not update cursor when not tracking', () => {
      const position: CursorPosition = { x: 100, y: 200 }
      cursorSync.updateLocalCursor(position)

      const state = cursorSync.getState()
      expect(state.localCursor).toBeNull()
    })

    it('should throttle rapid updates', async () => {
      const sendFn = vi.fn().mockReturnValue(true)
      cursorSync.startTracking(sendFn)

      cursorSync.updateLocalCursor({ x: 100, y: 200 })
      cursorSync.updateLocalCursor({ x: 101, y: 201 })
      cursorSync.updateLocalCursor({ x: 102, y: 202 })

      // Wait for throttle
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Only one call should be made due to throttling
      expect(sendFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('Remote cursor management', () => {
    it('should handle remote cursor update', () => {
      const position: CursorPosition = { x: 150, y: 250 }
      const user: Partial<CollabUser> = { name: 'Remote User', color: '#00FF00' }

      cursorSync.handleRemoteCursor('remote-user-1', position, user)

      const cursor = cursorSync.getRemoteCursor('remote-user-1')
      expect(cursor).toBeDefined()
      expect(cursor?.cursor).toEqual(position)
      expect(cursor?.user.name).toBe('Remote User')
    })

    it('should ignore own cursor updates', () => {
      const position: CursorPosition = { x: 150, y: 250 }
      cursorSync.handleRemoteCursor(mockUser.id, position)

      const cursor = cursorSync.getRemoteCursor(mockUser.id)
      expect(cursor).toBeUndefined()
    })

    it('should remove remote cursor', () => {
      const position: CursorPosition = { x: 150, y: 250 }
      cursorSync.handleRemoteCursor('remote-user-1', position)

      cursorSync.removeRemoteCursor('remote-user-1')

      const cursor = cursorSync.getRemoteCursor('remote-user-1')
      expect(cursor).toBeUndefined()
    })

    it('should get all remote cursors', () => {
      cursorSync.handleRemoteCursor('remote-1', { x: 10, y: 10 })
      cursorSync.handleRemoteCursor('remote-2', { x: 20, y: 20 })
      cursorSync.handleRemoteCursor('remote-3', { x: 30, y: 30 })

      const cursors = cursorSync.getRemoteCursors()
      expect(cursors.size).toBe(3)
    })
  })

  describe('Events', () => {
    it('should emit cursor:added event', () => {
      const handler = vi.fn()
      cursorSync.on('cursor:added', handler)

      cursorSync.handleRemoteCursor('remote-1', { x: 10, y: 10 })

      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should emit cursor:updated event for existing cursor', () => {
      const handler = vi.fn()
      cursorSync.handleRemoteCursor('remote-1', { x: 10, y: 10 })
      cursorSync.on('cursor:updated', handler)

      cursorSync.handleRemoteCursor('remote-1', { x: 20, y: 20 })

      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should emit cursor:removed event', () => {
      const handler = vi.fn()
      cursorSync.handleRemoteCursor('remote-1', { x: 10, y: 10 })
      cursorSync.on('cursor:removed', handler)

      cursorSync.removeRemoteCursor('remote-1')

      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('cleanup', () => {
    it('should clear all remote cursors', () => {
      cursorSync.handleRemoteCursor('user-1', { x: 10, y: 10 })
      cursorSync.handleRemoteCursor('user-2', { x: 20, y: 20 })

      cursorSync.clearRemoteCursors()

      const cursors = cursorSync.getRemoteCursors()
      expect(cursors.size).toBe(0)
    })

    it('should clean up on destroy', () => {
      const sendFn = vi.fn()
      cursorSync.startTracking(sendFn)
      cursorSync.handleRemoteCursor('user-1', { x: 10, y: 10 })

      cursorSync.destroy()

      expect(cursorSync.getRemoteCursors().size).toBe(0)
      expect(cursorSync.getState().isTracking).toBe(false)
    })
  })
})
