/**
 * useCollaboration Hook Tests
 * 
 * Tests for real-time collaboration hook interface
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCollaboration, useCollaborationCursor, useCollaborationLocks } from '@/hooks/useCollaboration'

// Mock all collab modules with proper constructor functions
vi.mock('@/lib/collab/cursor-sync', () => {
  class MockCursorSync {
    startTracking = vi.fn(() => vi.fn())
    updateLocalCursor = vi.fn()
    handleRemoteCursor = vi.fn()
    removeRemoteCursor = vi.fn()
    on = vi.fn(() => vi.fn())
    destroy = vi.fn()
  }
  return { CollaborationCursorSync: MockCursorSync }
})

vi.mock('@/lib/collab/state-manager', () => {
  class MockStateManager {
    on = vi.fn(() => vi.fn())
    setConnectionState = vi.fn()
    acquireLock = vi.fn(() => true)
    releaseLock = vi.fn()
    getOnlineUsers = vi.fn(() => [])
    getLockedNodes = vi.fn(() => new Map())
    queueChange = vi.fn(() => 'change-1')
    applyChange = vi.fn()
    getSessionState = vi.fn(() => ({ status: 'active' }))
    destroy = vi.fn()
  }
  return { CollaborationStateManager: MockStateManager }
})

vi.mock('@/lib/collab/conflict-resolver', () => {
  class MockConflictResolver {
    resolveManually = vi.fn(() => ({ success: true }))
    destroy = vi.fn()
  }
  return { ConflictResolver: MockConflictResolver }
})

vi.mock('@/lib/collab/CollabClient', () => {
  class MockCollabClient {
    on = vi.fn(() => vi.fn())
    connect = vi.fn()
    disconnect = vi.fn()
    sendCursorMove = vi.fn(() => true)
    acquireLock = vi.fn(() => Promise.resolve())
    releaseLock = vi.fn(() => Promise.resolve())
    updateNode = vi.fn()
    deleteNode = vi.fn()
    destroy = vi.fn()
  }
  return { CollabClient: MockCollabClient }
})

vi.mock('@/features/collab/types', () => ({
  CursorPosition: {},
  CursorState: {},
  CollabUser: {},
}))

const mockUser = { id: 'user-1', name: 'Test User', color: '#ff0000' }

describe('useCollaboration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should return collaboration interface', () => {
      const { result } = renderHook(() =>
        useCollaboration('workflow-1', mockUser, { autoConnect: false })
      )

      expect(result.current).toMatchObject({
        cursors: expect.any(Map),
        localCursor: null,
        onlineUsers: expect.any(Array),
        lockedNodes: expect.any(Map),
        isConnected: false,
        updateCursor: expect.any(Function),
        lockNode: expect.any(Function),
        unlockNode: expect.any(Function),
        applyChange: expect.any(Function),
        resolveConflict: expect.any(Function),
        connect: expect.any(Function),
        disconnect: expect.any(Function),
      })
    })

    it('should return sessionState', () => {
      const { result } = renderHook(() =>
        useCollaboration('workflow-1', mockUser, { autoConnect: false })
      )

      expect(result.current.sessionState).toBeDefined()
    })
  })

  describe('useCollaborationCursor', () => {
    it('should return simplified cursor interface', () => {
      const { result } = renderHook(() =>
        useCollaborationCursor('workflow-1', mockUser, { autoConnect: false })
      )

      expect(result.current).toMatchObject({
        cursors: expect.any(Map),
        localCursor: null,
        updateCursor: expect.any(Function),
        isConnected: false,
      })
    })
  })

  describe('useCollaborationLocks', () => {
    it('should return simplified locks interface', () => {
      const { result } = renderHook(() =>
        useCollaborationLocks('workflow-1', mockUser, { autoConnect: false })
      )

      expect(result.current).toMatchObject({
        lockedNodes: expect.any(Map),
        lockNode: expect.any(Function),
        unlockNode: expect.any(Function),
        isConnected: false,
      })
    })
  })
})